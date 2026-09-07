import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authRequest } from "../services/auth";
import logo from "../assets/logoIntermedi.png";
import phoneMockup from "../assets/intermedi-phones.png";
import "../styles/auth.css";

type Role = "gerente" | "funcionario" | "admin";
type Mode = "login" | "cadastro";
const profiles = [
  { id: "gerente" as Role, name: "Gerente", description: "Sua farmácia sob uma nova perspectiva.", detail: "Estoque, relatórios e gestão da equipe.", icon: "manager" },
  { id: "funcionario" as Role, name: "Funcionário", description: "Mais agilidade em cada atendimento.", detail: "Consulte medicamentos e atualize o estoque.", icon: "employee" },
  { id: "admin" as Role, name: "Admin", description: "Tudo conectado. Tudo sob controle.", detail: "Gerencie usuários e a plataforma.", icon: "administrator" },
];
function Icon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    manager: <><path d="M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3Z" fill="currentColor" fillOpacity=".12" /><circle cx="12" cy="6.5" r="3.5" /><path d="m9 12 3 3 3-3m-3 3-1.5 4L12 21l1.5-2-1.5-4M7.5 18v3m9-3v3" /></>,
    employee: <><circle cx="10" cy="6.5" r="3.5" /><path d="M3 21v-3a6 6 0 0 1 6-6h2a6 6 0 0 1 5 2.5M7 18v3" /><rect x="13" y="14" width="8" height="7" rx="1.5" fill="currentColor" fillOpacity=".15" /><path d="M17 12.5V15m-1.5 2.5h3" /></>,
    administrator: <><path d="m12 2.5 8 3.2v6.1c0 4.6-4.4 7.9-8 9.7-3.6-1.8-8-5.1-8-9.7V5.7Z" fill="currentColor" fillOpacity=".12" /><path d="m12 7 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5Z" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    hidden: <path d="m3 3 18 18M9 5.5c7-2 13 6.5 13 6.5s-1 2-3 4M6 6c-2.5 2-4 6-4 6s3.5 7 10 7c1.5 0 3-.4 4-1" />,
    plus: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  };
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export default function LoginUser({ initialMode = "login" }: { initialMode?: Mode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<Role | null>(params.get("perfil") === "gerente" ? "gerente" : null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const requestId = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = profiles.find(profile => profile.id === role);
  useEffect(() => { document.title = "Acesse sua conta | Intermedi"; return () => { document.title = "Intermedi"; }; }, []);
  useEffect(() => { if (role) heading.current?.focus(); }, [role, mode]);
  useEffect(() => () => { requestId.current += 1; }, []);
  function resetRequest() { requestId.current += 1; setPending(false); setMessage(""); setVisible(false); }
  function changeMode(next: Mode) { resetRequest(); setMode(next); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    if (mode === "cadastro" && data.get("senha") !== data.get("confirmarSenha")) { setMessage("As senhas não coincidem. Confira os dois campos e tente novamente."); return; }
    if (role !== "gerente" && mode === "cadastro") {
      setMessage("O cadastro está disponível apenas para gerentes neste momento.");
      return;
    }
    const currentRequest = ++requestId.current;
    setPending(true);
    setMessage("");
    try {
      if (role !== "gerente") {
        const response = await fetch("http://localhost/repositorioIntermedi/Intermedi/backEnd/api/usuarios/loginUsuario.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.get("email"), senha: data.get("senha") }),
          signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        if (currentRequest !== requestId.current) return;
        const apiMessage = result?.mensagem ?? result?.message;
        setMessage(typeof apiMessage === "string" ? apiMessage : "O servidor ainda não informou o próximo passo do acesso.");
        return;
      }
      const result = await authRequest(mode === "cadastro" ? "register" : "login", {
        email: data.get("email"), senha: data.get("senha"), role,
        ...(mode === "cadastro" ? { nome: data.get("nome"), unidade: data.get("unidade"), confirmarSenha: data.get("confirmarSenha") } : {}),
      });
      if (currentRequest !== requestId.current) return;
      if (result.user?.role === "gerente") navigate("/gerente", { replace: true });
      else setMessage("Esta conta não tem acesso à área do gerente.");
    } catch (error) {
      if (currentRequest === requestId.current) setMessage(error instanceof Error ? error.message : "Não foi possível conectar ao serviço de contas. Tente novamente.");
    } finally {
      if (currentRequest === requestId.current) setPending(false);
    }
  }
  return <main className="auth-page">
    <section className="auth-main" aria-label="Acesso ao Intermedi">
      <header className="auth-header"><Link to="/" aria-label="Intermedi — página inicial"><img src={logo} alt="Intermedi" /></Link><Link className="auth-home" to="/"><Icon name="back" /> Voltar ao site</Link></header>
      <div className={`auth-content${selected && mode === "cadastro" ? " auth-register" : ""}`}>
        <div className="auth-steps" aria-label={role ? "Etapa 2 de 2: sua conta" : "Etapa 1 de 2: seu perfil"}><span className="is-active"><i>{role ? "✓" : "1"}</i> Seu perfil</span><span className="auth-step-line" /><span className={role ? "is-active" : ""}><i>2</i> Sua conta</span></div>
        {!selected ? <>
          <span className="auth-eyebrow">BEM-VINDO AO INTERMEDI</span>
          <h1>Seu próximo acesso.<br /><em>Mais possibilidades.</em></h1>
          <p className="auth-intro">Cada pessoa faz a diferença no cuidado.<br />Escolha seu perfil para {mode === "cadastro" ? "criar sua conta" : "continuar"}.</p>
          <div className="auth-profiles">{profiles.map(profile => <button key={profile.id} className={`auth-profile profile-${profile.id}`} onClick={() => { setRole(profile.id); setMessage(""); if (profile.id === "admin") setMode("login"); }}><span className="auth-profile-icon"><Icon name={profile.icon} /></span><span className="auth-profile-text"><strong>{profile.name}</strong><span>{profile.description}</span><small>{profile.detail}</small></span><Icon name="arrow" className="auth-profile-arrow" /></button>)}</div>
          <p className="auth-switch">{mode === "login" ? "Sua primeira vez por aqui?" : "Já faz parte da nossa rede?"} <button onClick={() => changeMode(mode === "login" ? "cadastro" : "login")}>{mode === "login" ? "Criar uma conta" : "Entrar na conta"} <span aria-hidden="true">↗</span></button></p>
        </> : <>
          <button className="auth-back" onClick={() => { resetRequest(); setRole(null); }}><Icon name="back" /> Trocar perfil</button>
          <span className={`auth-selected profile-${role}`}><Icon name={selected.icon} /> {selected.name}</span>
          <h1 ref={heading} tabIndex={-1} className="auth-form-title">{mode === "login" ? "Bom ter você de volta." : "Vamos nos conectar?"}</h1>
          <p className="auth-intro">{mode === "login" ? "Entre com seus dados para acessar sua conta." : "Preencha seus dados para começar no Intermedi."}</p>
          {role !== "admin" && <div className="auth-mode" aria-label="Tipo de acesso"><button aria-pressed={mode === "login"} onClick={() => changeMode("login")}>Entrar</button><button aria-pressed={mode === "cadastro"} onClick={() => changeMode("cadastro")}>Criar conta</button></div>}
          <form key={`${role}-${mode}`} className="auth-form" onSubmit={submit}>
            {mode === "cadastro" && <label>Nome completo<input name="nome" autoComplete="name" placeholder="Como podemos chamar você?" required minLength={3} maxLength={120} /></label>}
            {mode === "cadastro" && role === "gerente" && <label>Nome da sua nova unidade<input name="unidade" autoComplete="organization" placeholder="Ex.: Farmácia São Lucas" required minLength={3} maxLength={150} /><small>O cadastro cria uma unidade própria. Não concede acesso a uma farmácia já cadastrada.</small></label>}
            <label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@farmacia.com.br" required maxLength={254} /></label>
            <label>Senha<span className="auth-password"><input name="senha" type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Digite sua senha" : "Crie uma senha com 8 ou mais caracteres"} required minLength={mode === "cadastro" ? 8 : 1} maxLength={128} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible}><Icon name={visible ? "hidden" : "eye"} /></button></span></label>
            {mode === "cadastro" && <label>Confirmar senha<input name="confirmarSenha" type={visible ? "text" : "password"} autoComplete="new-password" placeholder="Digite sua senha novamente" required minLength={8} maxLength={128} /></label>}
            {mode === "login" && <button type="button" className="auth-forgot" onClick={() => setMessage("Para recuperar seu acesso, entre em contato com o responsável pela sua farmácia. A recuperação online ainda não está disponível.")}>Esqueci minha senha</button>}
            {role === "admin" && <p className="auth-admin-note"><Icon name="shield" /> Acesso exclusivo para administradores autorizados.</p>}
            {message && <p className="auth-message" role="alert">{message}</p>}
            <button className="auth-submit" type="submit" disabled={pending} aria-busy={pending}>{pending ? (mode === "cadastro" ? "Criando sua conta…" : "Entrando…") : mode === "login" ? "Entrar na minha conta" : "Criar minha conta"}<Icon name="arrow" /></button>
          </form>
          <p className="auth-form-foot"><Icon name="lock" /> Seu espaço para cuidar e conectar.</p>
        </>}
      </div>
      <footer className="auth-footer"><span>Conectando farmácias. <b>Aproximando o cuidado.</b></span><span>© {new Date().getFullYear()} Intermedi</span></footer>
    </section>
    <aside className="auth-story" aria-label="Conectando farmácias e pessoas">
      <div className="auth-story-copy"><h2>Mais conexões.<br />Mais saúde.<br /><em>Todos os dias.</em></h2><p>A tecnologia aproxima. O cuidado transforma.<br />Sua farmácia e sua equipe, juntas em um só lugar.</p></div>
      <div className="auth-art-stage"><img className="auth-phone-mockup" src={phoneMockup} alt="Dois celulares com a marca Intermedi e a mensagem: Sua saúde, na palma da sua mão." width="1312" height="1199" /></div>
      <div className="auth-story-bottom"><span className="auth-story-badge"><Icon name="plus" /></span><p><strong>O cuidado vai mais longe quando nos conectamos.</strong><span>Uma nova forma de fazer parte da saúde.</span></p></div>
    </aside>
  </main>;
}
