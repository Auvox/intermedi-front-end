import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/logoIntermedi.png";
import phoneMockup from "../assets/intermedi-phones.png";
import { authRequest } from "../services/auth";
import PersonaIcon from "../components/PersonaIcon";
import "../styles/auth.css";
import { apiRequest } from "../services/api";
import { entrarComoAdmin } from "../services/desempenho";
import { guardarTokenSessao } from "../services/presenca";

type Role = "gerente" | "funcionario" | "admin";
const profiles = [
  {
    id: "gerente" as Role,
    name: "Gerente",
    description: "Acompanhe relatórios e gestão da equipe.",
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
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = profiles.find((profile) => profile.id === role);
  useEffect(() => {
    document.title = "Acesse sua conta | Intermedi";
    return () => {
      document.title = "Intermedi";
    };
  }, []);
  useEffect(() => {
    if (role) heading.current?.focus();
  }, [role]);
  function resetRequest() {
    setMessage("");
    setVisible(false);
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
      // CPF, matrícula e senha provisória chegam no e-mail de boas-vindas
      const cpf = String(formData.get("cpf") || "").trim();
      const matricula = String(formData.get("matricula") || "").trim();
      const senha = String(formData.get("senha") || "");

      if (!cpf) {
        setMessage("Informe o CPF do funcionário.");
        return;
      }
      if (!matricula) {
        setMessage("Informe a matrícula do funcionário.");
        return;
      }
      if (!senha) {
        setMessage("Informe a senha do funcionário.");
        return;
      }

      try {
        const { usuario, token } = await apiRequest("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpf, matricula, senha }),
        });
        if (usuario?.papel !== "funcionario") {
          setMessage("Esta conta não é de funcionário. Escolha o seu perfil em Trocar perfil.");
          return;
        }

        // token do back: conta o tempo logado (o gerente e o admin veem)
        guardarTokenSessao(token);
        sessionStorage.setItem(
          "intermediEmployeeSession",
          JSON.stringify({
            id: usuario.id,
            name: usuario.nome || "Funcionário",
            cpf: usuario.cpf,
            matricula: usuario.matricula,
            email: usuario.email || "",
            role: "funcionario",
            unitName: usuario.nomeFarmacia || "Unidade não vinculada",
            farmaciasId: usuario.idFarmacia == null ? "" : String(usuario.idFarmacia),
          }),
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

    if (role !== "gerente") {
      setMessage("Este fluxo de login é exclusivo para o perfil de gerente.");
      return;
    }

    // CPF, matrícula e senha provisória chegam no e-mail de boas-vindas
    const cpf = String(formData.get("cpf") || "").trim();
    const matricula = String(formData.get("matricula") || "").trim();
    const senha = String(formData.get("senha") || "");

    if (!cpf) {
      setMessage("Informe o CPF do gerente.");
      return;
    }
    if (!matricula) {
      setMessage("Informe a matrícula do gerente.");
      return;
    }
    if (!senha) {
      setMessage("Informe a senha do gerente.");
      return;
    }

    setMessage("");
    try {
      const { token } = await authRequest("login", { cpf, matricula, senha, role: "gerente" });
      guardarTokenSessao(token);
      navigate("/gerente", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir o acesso. Tente novamente.");
    }
  }
  return (
    <main className={`auth-page auth-theme-${role ?? "welcome"}`}>
      <section className="auth-main" aria-label="Acesso ao Intermedi">
        <header className="auth-header">
          <Link to="/" aria-label="Intermedi — página inicial">
            <img src={logo} alt="Intermedi" />
          </Link>
        </header>
        {!selected && (
          <nav className="auth-return" aria-label="Voltar à página inicial">
            <Link className="auth-home" to="/">
              <Icon name="back" />
              Voltar ao site
            </Link>
          </nav>
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
                Para continuar, selecione o perfil que corresponde
                <br />
                ao seu acesso na plataforma.
              </p>
              <div className="auth-profiles">
                {[profiles[2], profiles[0], profiles[1]].map((profile) => (
                  <button
                    key={profile.id}
                    className={`auth-profile profile-${profile.id}`}
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
              >
                <label>
                  CPF
                  <input
                    name="cpf"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Digite seu CPF"
                    maxLength={14}
                  />
                </label>
                <label>
                  Matrícula
                  <input
                    name="matricula"
                    type="text"
                    autoComplete="off"
                    placeholder="Digite sua matrícula"
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
        <div className="auth-story-copy">
          <h2>
            Mais conexões.
            <br />
            Mais saúde.
            <br />
            <em>Todos os dias.</em>
          </h2>
          <p>
            A tecnologia aproxima. O cuidado transforma.
            <br />
            Sua farmácia e sua equipe, juntas em um só lugar.
          </p>
        </div>
        <div className="auth-art-stage">
          <img
            className="auth-phone-mockup"
            src={phoneMockup}
            alt="Dois celulares com a marca Intermedi e a mensagem: Sua saúde, na palma da sua mão."
            width="1312"
            height="1199"
          />
        </div>
      </aside>
    </main>
  );
}
