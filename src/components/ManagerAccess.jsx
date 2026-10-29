import { primeiroNome } from "../services/nomes";
import PersonaAvatar from "./PersonaAvatar";
import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { buscarSessaoGerente, sairGerente } from "../services/sessaoGerente";

import { fotoPessoa, listarGerentes } from "../services/api";
import { usePerfil } from "./perfil/perfilContext";
import { useAoAlterarDados } from "../hooks/useResumo";
import { sairDaConta } from "../services/presenca";

export default function ManagerAccess() {
  const [state, setState] = useState({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let checking = false;
    async function check() {
      if (checking) return;
      checking = true;
      try {
        const user = await buscarSessaoGerente(
          AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        );
        if (!controller.signal.aborted) setState({ user });
      } catch (error) {
        if (!controller.signal.aborted)
          setState(
            error.status === 401
              ? { anonymous: true }
              : {
                  error:
                    "Não foi possível verificar sua sessão. Confira a conexão e tente novamente.",
                },
          );
      } finally {
        checking = false;
      }
    }
    check();
    const refresh = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(check, 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [attempt]);
  if (state.loading)
    return (
      <main className="auth-access-state" role="status">
        Verificando sua sessão…
      </main>
    );
  if (state.anonymous) return <Navigate to="/login?perfil=gerente" replace />;
  if (state.error)
    return (
      <main className="auth-access-state">
        <p role="alert">{state.error}</p>
        <button
          onClick={() => {
            setState({ loading: true });
            setAttempt((value) => value + 1);
          }}
        >
          Tentar novamente
        </button>
        <Link to="/login">Voltar ao acesso</Link>
      </main>
    );

  // Validação de perfil do gerente temporariamente desligada para testes.
  // if (state.user?.role !== 'gerente') return <main className="auth-access-state">Esta área é exclusiva para gerentes. <Link to="/login">Voltar ao acesso</Link></main>;

  return <Outlet key={state.user.id} context={{ user: state.user }} />;
}

// Conta no topo: abre o perfil completo do gerente (com a foto, que ele mesmo
// pode trocar) e mostra a foto atual. Precisa estar dentro do PerfilProvider.
export function AccountControls({ user, idGerente }) {
  const navigate = useNavigate();
  const { abrirPerfil } = usePerfil();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [foto, setFoto] = useState(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!idGerente) return undefined;
    const controller = new AbortController();
    listarGerentes({ signal: controller.signal })
      .then((lista) => {
        const eu = lista.find((g) => String(g.idGerente) === String(idGerente));
        setFoto(fotoPessoa(eu?.fotoGerente));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [idGerente, versao]);

  // trocou a foto no perfil: atualiza o avatar do topo
  useAoAlterarDados((evento) => {
    if (evento?.tipo === "gerente" && String(evento.id) === String(idGerente)) setVersao((v) => v + 1);
  });

  async function logout() {
    setPending(true);
    setError("");
    try {
      await sairDaConta();
      await sairGerente();
      navigate("/login?perfil=gerente", { replace: true });
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setPending(false);
    }
  }

  return (
    <div className="mgr-account">
      <button
        type="button"
        className="mgr-account-button"
        disabled={!idGerente}
        onClick={(event) => abrirPerfil("gerente", idGerente, event.currentTarget)}
        aria-label="Abrir meu perfil"
      >
        <PersonaAvatar className="mgr-account-avatar" role="gerente" photo={foto} />
        <span className="mgr-account-person" title={user.email}>
          <strong>{primeiroNome(user.name, "Gerente")}</strong>
          <small>Gerente da unidade</small>
        </span>
      </button>
      <button type="button" className="account-action account-exit" disabled={pending} onClick={logout}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" /></svg>
        {pending ? "Saindo…" : "Sair"}
      </button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
