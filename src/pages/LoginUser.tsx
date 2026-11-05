import { useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent, ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/logoIntermedi.png";
import notebookMockup from "../assets/mockupLogin.png";
import adminPortrait from "../assets/adminFoto.png";
import managerPortrait from "../assets/gerenteFoto.png";
import employeePortrait from "../assets/funcFoto.png";
import { entrarComoGerente } from "../services/sessaoGerente";
import PersonaIcon from "../components/PersonaIcon";
import "../styles/auth.css";
import { apiRequest } from "../services/api";
import { entrarComoAdmin } from "../services/desempenho";
import { guardarTokenSessao } from "../services/presenca";

type Role = "gerente" | "funcionario" | "admin";
// Matrícula da equipe: G000123 gerente, 000123 funcionário, A000123 admin
const MATRICULA_GERENTE = /^G\d{6}$/i;
const MATRICULA_FUNCIONARIO = /^\d{6}$/;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Duração da folha virando ao voltar para o site (igual ao CSS)
const LEAVE_MS = 420;
const profiles = [
  {
    id: "gerente" as Role,
    name: "Gerente",
    description: "Gerencie sua unidade local.",
  },
  {
    id: "funcionario" as Role,
    name: "Funcionário",
    description: "Atendimento e rotina da unidade.",
  },
  {
    id: "admin" as Role,
    name: "Admin",
    description: "Gerencie usuários e a plataforma.",
  },
];
function Icon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    back: <path d="m10 6-6 6 6 6M4 12h16" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    hidden: (
      <path d="m3 3 18 18M9 5.5c7-2 13 6.5 13 6.5s-1 2-3 4M6 6c-2.5 2-4 6-4 6s3.5 7 10 7c1.5 0 3-.4 4-1" />
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
  };
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export default function LoginUser() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<Role | null>(
    profiles.find((profile) => profile.id === params.get("perfil"))?.id ?? null,
  );
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  // Voltar ao site: a página encolhe ao apertar a aba e se fecha da esquerda para a direita
  const [pressing, setPressing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const dragStartX = useRef<number | null>(null);
  const selected = profiles.find((profile) => profile.id === role);
  useEffect(() => {
    document.title = "Acesse sua conta | Intermedi";
    return () => {
      document.title = "Intermedi";
    };
  }, []);
  useEffect(() => {
    // Os retratos são grandes: carrega já na escolha para não aparecerem atrasados
    [adminPortrait, managerPortrait, employeePortrait].forEach((src) => {
      const image = new Image();
      image.src = src;
      image.decode().catch(() => {});
    });
  }, []);
  useEffect(() => {
    if (role) heading.current?.focus();
  }, [role]);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => navigate("/", { state: { voltarDoLogin: true } }), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, navigate]);
  function resetRequest() {
    setMessage("");
    setVisible(false);
  }
  function goHome() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate("/", { state: { voltarDoLogin: true } });
      return;
    }
    setLeaving(true);
  }
  function handleHomePointerDown(event: PointerEvent<HTMLButtonElement>) {
    dragStartX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPressing(true);
  }
  function handleHomePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (dragStartX.current === null) return;
    const distance = event.clientX - dragStartX.current;
    dragStartX.current = null;
    if (distance > 42) goHome();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      await processSubmit(event);
    } finally {
      setSubmitting(false);
    }
  }

  async function processSubmit(event: FormEvent<HTMLFormElement>) {

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (role === "funcionario") {
      // Funcionário entra com CPF + matrícula + senha (POST /auth/login);
      // a matrícula e a senha provisória chegam no e-mail de acesso
      const cpf = String(formData.get("cpf") || "").replace(/\D/g, "");
      const matricula = String(formData.get("matricula") || "").trim();
      const senha = String(formData.get("senha") || "");

      if (!cpf) {
        setMessage("Informe o CPF do funcionário.");
        return;
      }
      if (cpf.length !== 11) {
        setMessage("O CPF precisa ter 11 números.");
        return;
      }
      if (!matricula) {
        setMessage("Informe a matrícula do funcionário.");
        return;
      }
      if (!MATRICULA_FUNCIONARIO.test(matricula)) {
        setMessage("A matrícula do funcionário tem 6 números (ex.: 000123).");
        return;
      }
      if (!senha) {
        setMessage("Informe a senha do funcionário.");
        return;
      }

      try {
        const { token, usuario } = await apiRequest("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpf, matricula, senha }),
        });
        if (usuario?.papel !== "funcionario") {
          setMessage("Esta conta não é de funcionário. Escolha o perfil certo para entrar.");
          return;
        }

        // token do back: conta o tempo logado (o gerente e o admin veem)
        guardarTokenSessao(token);

        // mesmo formato que a área do funcionário já lê (employeeSession.js)
        const sessionUser = {
          id: usuario.id,
          name: usuario.nome,
          cpf: usuario.cpf,
          matricula: usuario.matricula,
          email: usuario.email ?? "",
          role: "funcionario",
          unitName: usuario.nomeFarmacia ?? "Unidade não vinculada",
          farmaciasId: usuario.idFarmacia == null ? "" : String(usuario.idFarmacia),
          token,
        };

        sessionStorage.setItem(
          "intermediEmployeeSession",
          JSON.stringify(sessionUser),
        );

        setMessage("");
        navigate("/funcionario", { replace: true });
      } catch (error: any) {
        setMessage(
          error?.status === 401
            ? "CPF, matrícula ou senha incorretos."
            : error instanceof Error
              ? error.message
              : "Não foi possível entrar. Tente novamente.",
        );
      }
      return;
    }

    if (role === "admin") {
      const cpf = String(formData.get("cpf") || "").trim();
      const matricula = String(formData.get("matricula") || "").trim();
      const senha = String(formData.get("senha") || "");

      if (!cpf) {
        setMessage("Informe o CPF do admin.");
        return;
      }
      if (!matricula) {
        setMessage("Informe a matrícula do admin.");
        return;
      }
      if (!senha) {
        setMessage("Informe a senha do admin.");
        return;
      }

      try {
        // o mesmo token serve para a aba Desempenho, que não pede login de novo
        await entrarComoAdmin({ cpf, matricula, senha });
        navigate("/admin", { replace: true });
      } catch (error: any) {
        setMessage(
          error?.status === 401
            ? "CPF, matrícula ou senha incorretos."
            : error instanceof Error
              ? error.message
              : "Não foi possível entrar. Tente novamente.",
        );
      }
      return;
    }

    // Admin entra com CPF + matrícula + senha (POST /auth/login)
    if (role === "admin") {
      const cpf = String(formData.get("cpf") || "").trim();
      const matricula = String(formData.get("matricula") || "").trim();
      const senha = String(formData.get("senha") || "");
      if (!cpf) {
        setMessage("Informe o CPF do admin.");
        return;
      }
      if (!matricula) {
        setMessage("Informe a matrícula do admin.");
        return;
      }
      if (!senha) {
        setMessage("Informe a senha do admin.");
        return;
      }
      try {
        await entrarComoAdmin({ cpf, matricula, senha });
        navigate("/admin", { replace: true });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível entrar como admin. Tente novamente.");
      }
      return;
    }

    if (role !== "gerente") {
      setMessage("Este fluxo de login é exclusivo para o perfil de gerente.");
      return;
    }

    // Gerente entra com e-mail + matrícula + senha, conferidos no back-end
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const matricula = String(formData.get("matricula") || "")
      .trim()
      .toUpperCase();
    const senha = String(formData.get("senha") || "");

    if (!email) {
      setMessage("Informe o e-mail do gerente.");
      return;
    }
    if (!EMAIL_VALIDO.test(email)) {
      setMessage("Informe um e-mail válido do gerente.");
      return;
    }
    if (!matricula) {
      setMessage("Informe a matrícula do gerente.");
      return;
    }
    if (!MATRICULA_GERENTE.test(matricula)) {
      setMessage("A matrícula do gerente tem a letra G e 6 números (ex.: G000123).");
      return;
    }
    if (!senha) {
      setMessage("Informe a senha do gerente.");
      return;
    }

    try {
      await entrarComoGerente({ email, matricula, senha });
      navigate("/gerente", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir o acesso. Tente novamente.");
    }
  }
  return (
    <main className={`auth-page auth-theme-${role ?? "welcome"}${pressing ? " is-pressing" : ""}${leaving ? " is-leaving" : ""}`}>
      <section className="auth-main" aria-label="Acesso ao Intermedi">
        <header className="auth-header">
          <Link to="/" aria-label="Intermedi — página inicial">
            <img src={logo} alt="Intermedi" />
          </Link>
        </header>
        {!selected && (
          <button
            className="auth-home-tab"
            type="button"
            aria-label="Voltar à página inicial; arraste para a direita"
            title="Voltar à página inicial — clique ou puxe para a direita"
            onClick={goHome}
            onPointerDown={handleHomePointerDown}
            onPointerUp={handleHomePointerUp}
            onPointerCancel={() => { dragStartX.current = null; setPressing(false); }}
          >
            <Icon name="chevron" />
          </button>
        )}
        <div
          key={role ?? "welcome"}
          className="auth-content"
        >
          {!selected ? (
            <>
              <h1>
                Bem-vindo(a)!
                <br />
                <em>Escolha seu perfil.</em>
              </h1>
              <p className="auth-intro">
                Para continuar, selecione o perfil que corresponde{" "}
                <br />
                ao seu acesso na plataforma.
              </p>
              <div className="auth-profiles">
                {[profiles[2], profiles[0], profiles[1]].map((profile) => (
                  <button
                    key={profile.id}
                    className={`auth-profile profile-${profile.id}`}
                    aria-label={`Entrar como ${profile.name}`}
                    onClick={() => {
                      setRole(profile.id);
                      setMessage("");
                    }}
                  >
                    <span className="auth-profile-icon">
                      <PersonaIcon role={profile.id} />
                    </span>
                    <span className="auth-profile-text">
                      <strong>{profile.name}</strong>
                      <span>{profile.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="auth-home auth-home-form"
                aria-label="Voltar à escolha de perfil"
                disabled={submitting}
                onClick={() => { resetRequest(); setRole(null); }}
              >
                <Icon name="back" />
                Voltar
              </button>
              <div className="auth-persona-heading">
                <span className={`auth-selected profile-${role}`}><PersonaIcon role={selected.id} /></span>
                <div>
              <h1 ref={heading} tabIndex={-1} className="auth-form-title">
                {selected.name}
              </h1>
              <p className="auth-intro">
                {selected.description}
              </p>
                </div>
              </div>
              <form
                key={role}
                className="auth-form"
                onSubmit={submit}
                aria-busy={submitting}
                noValidate
              >
                {role === "gerente" ? (
                  <label>
                    E-mail
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@farmacia.com.br"
                      maxLength={254}
                    />
                  </label>
                ) : (
                  <label>
                    CPF
                    <input
                      name="cpf"
                      type="text"
                      autoComplete="off"
                      placeholder="Digite seu CPF"
                      maxLength={14}
                    />
                  </label>
                )}
                <label>
                  Matrícula
                  <input
                    name="matricula"
                    type="text"
                    autoComplete="off"
                    placeholder={role === "gerente" ? "Ex.: G000123" : "Digite sua matrícula"}
                    maxLength={20}
                  />
                </label>
                <label>
                  Senha
                  <span className="auth-password">
                    <input
                      name="senha"
                      type={visible ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(!visible)}
                      aria-label={
                        visible ? "Ocultar senha" : "Mostrar senha"
                      }
                      aria-pressed={visible}
                    >
                      <Icon name={visible ? "hidden" : "eye"} />
                    </button>
                  </span>
                </label>
                {role === "admin" && (
                  <p className="auth-admin-note">
                    <Icon name="shield" /> Acesso exclusivo para administradores
                    autorizados.
                  </p>
                )}
                {message && (
                  <p className="auth-message" role="alert">
                    {message}
                  </p>
                )}
                <button className={`auth-submit${submitting ? " is-loading" : ""}`} type="submit" disabled={submitting}>
                  {submitting && <span className="auth-spinner" aria-hidden="true" />}
                  <span role="status" aria-live="polite">{submitting ? "Entrando…" : "Entrar"}</span>
                </button>
              </form>
              <div className="auth-divider"><span>ou</span></div>
              <button className="auth-back" disabled={submitting} onClick={() => { resetRequest(); setRole(null); }}>
                Trocar perfil
              </button>
            </>
          )}
        </div>
        <footer className="auth-footer">
          <span>
            Conectando farmácias. <b>Aproximando o cuidado.</b>
          </span>
          <span>© {new Date().getFullYear()} Intermedi</span>
        </footer>
      </section>
      <aside className="auth-story" aria-label="Conectando farmácias e pessoas">
        <div className="auth-story-themes" aria-hidden="true">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`auth-story-theme auth-story-theme-${profile.id}${role === profile.id ? " is-active" : ""}`}
            />
          ))}
        </div>
        {selected ? (
          <>
            <div className="auth-story-copy">
              <svg className="auth-quote" viewBox="0 0 54 40" aria-hidden="true">
                <path d="M1 27C1 13.5 9 4.5 21 1l2.2 4.6C16.3 8.6 13 12.6 12.6 16.1A11.5 11.5 0 1 1 1 27Zm28 0C29 13.5 37 4.5 49 1l2.2 4.6c-6.9 3-10.2 7-10.6 10.5A11.5 11.5 0 1 1 29 27Z" />
              </svg>
              <h2>{role === "admin" ? <>Cuidando<br />da gestão,<br />garantindo<br />o acesso à<br /><em>saúde.</em></> : role === "gerente" ? <>Uma unidade<br />mais conectada,<br />com cuidado<br /><em>em cada detalhe.</em></> : <>Atendimento<br />mais simples,<br />cuidado mais<br /><em>próximo.</em></>}</h2>
            </div>
            <div className={`auth-person-art auth-person-art-${role}`}>
              <img
                src={role === "admin" ? adminPortrait : role === "gerente" ? managerPortrait : employeePortrait}
                alt={role === "admin" ? "Administrador da plataforma" : role === "gerente" ? "Farmacêutico gerente" : "Profissional de farmácia"}
              />
            </div>
          </>
        ) : (
          <div className="auth-mockup">
            <img
              src={notebookMockup}
              alt="O painel do Intermedi aberto num notebook."
              width="544"
              height="596"
            />
            <p className="auth-bubble auth-bubble-left">Peça medicamentos a outra farmácia</p>
            <p className="auth-bubble auth-bubble-right">Acompanhe cada chamado</p>
          </div>
        )}
      </aside>
    </main>
  );
}
