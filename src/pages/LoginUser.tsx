import { apiFetch } from "../services/api";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/logoIntermedi.png";
import phoneMockup from "../assets/intermedi-phones.png";
import { authRequest } from "../services/auth";
import PersonaIcon from "../components/PersonaIcon";
import "../styles/auth.css";

type Role = "gerente" | "funcionario" | "admin";
type Mode = "login" | "cadastro";
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
export default function LoginUser({
  initialMode = "login",
}: {
  initialMode?: Mode;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<Role | null>(
    profiles.find((profile) => profile.id === params.get("perfil"))?.id ?? null,
  );

  const [requestedMode, setMode] = useState<Mode>(initialMode);
  const mode: Mode =
    role === "funcionario" || role === "admin"
      ? "login"
      : requestedMode;
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
  }, [role, mode]);
  function resetRequest() {
    setMessage("");
    setVisible(false);
  }
  function changeMode(next: Mode) {
    resetRequest();
    setMode(next);
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
      const cpf = String(formData.get("cpf") || "")
        .trim()
        .replace(/[^\d]/g, "");
      const matricula = String(formData.get("matricula") || "")
        .trim()
        .toLowerCase();

      if (!cpf) {
        setMessage("Informe o CPF do funcionário.");
        return;
      }
      if (!matricula) {
        setMessage("Informe a matrícula do funcionário.");
        return;
      }

      try {
        const listResponse = await apiFetch("/funcionario", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const listPayload = await listResponse.json().catch(() => ({}));
        if (!listResponse.ok) {
          throw new Error(
            listPayload.message ||
              listPayload.error ||
              "Não foi possível consultar os funcionários.",
          );
        }

        const rawList = Array.isArray(listPayload)
          ? listPayload
          : Array.isArray(listPayload?.funcionario)
            ? listPayload.funcionario
            : Array.isArray(listPayload?.funcionarios)
              ? listPayload.funcionarios
              : [];

        const found = rawList.find((item: any) => {
          const storedCpf = String(item.cpfFuncionario ?? item.cpf ?? "")
            .trim()
            .replace(/[^\d]/g, "");
          const storedMatricula = String(
            item.matriculaFuncionario ?? item.matricula ?? "",
          )
            .trim()
            .toLowerCase();
          return storedCpf === cpf && storedMatricula === matricula;
        });

        if (!found) {
          setMessage("CPF ou matrícula incorretos.");
          return;
        }

        const funcionarioId = found.idFuncionario ?? found.id;
        if (!funcionarioId) {
          setMessage("Funcionário sem identificação válida.");
          return;
        }

        const detailResponse = await apiFetch(
          `/funcionario/${encodeURIComponent(funcionarioId)}`,
          { method: "GET", headers: { Accept: "application/json" } },
        );
        const detailPayload = await detailResponse.json().catch(() => ({}));
        if (!detailResponse.ok) {
          throw new Error(
            detailPayload.message ||
              detailPayload.error ||
              "Não foi possível consultar o perfil do funcionário.",
          );
        }

        const detail = Array.isArray(detailPayload)
          ? detailPayload[0]
          : (detailPayload?.resultado ??
            detailPayload?.funcionario ??
            detailPayload?.funcionarios ??
            detailPayload);

        const farmaciaId = String(
          detail.fkIdFarmacia ??
            detail.idFarmacia ??
            found.fkIdFarmacia ??
            found.idFarmacia ??
            "",
        ).trim();

        let unitName = "Unidade não vinculada";
        if (farmaciaId) {
          const farmaciaResponse = await apiFetch(
            "/farmacia",
            {
              method: "GET",
              headers: { Accept: "application/json" },
            },
          );
          const farmaciaPayload = await farmaciaResponse
            .json()
            .catch(() => ({}));
          if (farmaciaResponse.ok) {
            const farmacias = Array.isArray(farmaciaPayload)
              ? farmaciaPayload
              : Array.isArray(farmaciaPayload?.farmacia)
                ? farmaciaPayload.farmacia
                : Array.isArray(farmaciaPayload?.farmacias)
                  ? farmaciaPayload.farmacias
                  : [];
            const unidade = farmacias.find((item: any) => {
              return String(item.idFarmacia ?? item.id) === String(farmaciaId);
            });
            if (unidade) {
              unitName = String(
                unidade.nomeFarmacia ??
                  unidade.nome ??
                  unidade.farmacia ??
                  "Unidade não vinculada",
              ).trim();
            }
          }
        }

        const sessionUser = {
          id: detail.idFuncionario ?? found.idFuncionario ?? funcionarioId,
          name:
            detail.nomeFuncionario ??
            found.nomeFuncionario ??
            found.name ??
            "Funcionário",
          cpf: detail.cpfFuncionario ?? found.cpfFuncionario ?? cpf,
          matricula:
            detail.matriculaFuncionario ??
            found.matriculaFuncionario ??
            matricula,
          email: detail.emailFuncionario ?? found.emailFuncionario ?? "",
          role: "funcionario",
          unitName,
          farmaciasId: farmaciaId,
        };

        sessionStorage.setItem(
          "intermediEmployeeSession",
          JSON.stringify(sessionUser),
        );

        setMessage("");
        navigate("/funcionario", { replace: true });
        return;
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível validar o funcionário. Tente novamente.",
        );
      }
      return;
    }

    if (role !== "gerente") {
      setMessage("Este fluxo de login é exclusivo para o perfil de gerente.");
      return;
    }

    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const senha = String(formData.get("senha") || "");

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!email) {
      setMessage("Informe o e-mail do gerente.");
      return;
    }
    if (!emailIsValid) {
      setMessage("Informe um e-mail válido do gerente.");
      return;
    }
    if (!senha) {
      setMessage("Informe a senha do gerente.");
      return;
    }

    const nome = String(formData.get("nome") || "").trim();
    const unidade = String(formData.get("unidade") || "").trim();
    const confirmarSenha = String(formData.get("confirmarSenha") || "");
    if (mode === "cadastro") {
      if (nome.length < 3 || unidade.length < 3) {
        setMessage("Informe seu nome e o nome da nova unidade (mínimo de 3 caracteres).");
        return;
      }
      if (senha !== confirmarSenha) {
        setMessage("As senhas não coincidem.");
        return;
      }
    }
    setMessage("");
    try {
      await authRequest(mode === "cadastro" ? "register" : "login", {
        email, senha, role: "gerente",
        ...(mode === "cadastro" ? { nome, unidade, confirmarSenha } : {}),
      });
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
          {!selected && (
            <Link className="auth-home" to="/">
              Voltar ao site
            </Link>
          )}
        </header>
        <div
          key={`${role ?? "welcome"}-${mode}`}
          className={`auth-content${
            selected && mode === "cadastro" ? " auth-register" : ""
          }`}
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
                      if (profile.id !== "gerente")
                        setMode("login");
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
              {role === "gerente" && (
                <div className="auth-mode" aria-label="Tipo de acesso">
                  <button type="button" aria-pressed={mode === "login"} disabled={submitting} onClick={() => changeMode("login")}>Entrar</button>
                  <button type="button" aria-pressed={mode === "cadastro"} disabled={submitting} onClick={() => changeMode("cadastro")}>Criar conta</button>
                </div>
              )}
              <form
                key={`${role}-${mode}`}
                className="auth-form"
                onSubmit={submit}
                aria-busy={submitting}
              >
                {mode === "cadastro" && (
                  <label>
                    Nome completo
                    <input
                      name="nome"
                      autoComplete="name"
                      placeholder="Como podemos chamar você?"
                      minLength={3}
                      maxLength={120}
                    />
                  </label>
                )}
                {mode === "cadastro" && role === "gerente" && (
                  <label>
                    Nome da sua nova unidade
                    <input
                      name="unidade"
                      autoComplete="organization"
                      placeholder="Ex.: Farmácia São Lucas"
                      minLength={3}
                      maxLength={150}
                    />
                    <small>
                      O cadastro cria uma unidade própria. Não concede acesso a
                      uma farmácia já cadastrada.
                    </small>
                  </label>
                )}
                {role === "funcionario" ? (
                  <>
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
                  </>
                ) : (
                  <>
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
                    <label>
                      Senha
                      <span className="auth-password">
                        <input
                          name="senha"
                          type={visible ? "text" : "password"}
                          autoComplete={
                            mode === "login"
                              ? "current-password"
                              : "new-password"
                          }
                          placeholder={
                            mode === "login"
                              ? "Digite sua senha"
                              : "Crie sua senha"
                          }
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
                  </>
                )}
                {mode === "cadastro" && (
                  <label>
                    Confirmar senha
                    <input
                      name="confirmarSenha"
                      type={visible ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Digite sua senha novamente"
                    />
                  </label>
                )}
                {mode === "login" && (
                  <button
                    type="button"
                    className="auth-forgot"
                    onClick={() =>
                      setMessage(
                        "Para recuperar seu acesso, entre em contato com o responsável pela sua farmácia. A recuperação online ainda não está disponível.",
                      )
                    }
                  >
                    Esqueci minha senha
                  </button>
                )}
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
                  <span role="status" aria-live="polite">{submitting ? (mode === "login" ? "Entrando…" : "Criando conta…") : mode === "login"
                    ? "Entrar"
                    : "Criar minha conta"}</span>
                </button>
              </form>
              <div className="auth-divider"><span>ou</span></div>
              <button className="auth-back" disabled={submitting} onClick={() => { resetRequest(); setRole(null); }}>
                Trocar perfil
              </button>
              <p className="auth-form-foot">
                <Icon name="lock" /> Seu espaço para cuidar e conectar.
              </p>
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
