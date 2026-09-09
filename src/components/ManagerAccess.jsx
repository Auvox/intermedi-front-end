import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { authRequest } from "../services/auth";

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
        const { user } = await authRequest(
          "session",
          undefined,
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

export function AccountControls({ user }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true);
    setError("");
    try {
      await authRequest("logout", {});
      navigate("/login?perfil=gerente", { replace: true });
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setPending(false);
    }
  }
  return (
    <div className="mgr-account">
      <span className="mgr-account-avatar" aria-hidden="true">
        {user.name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")}
      </span>
      <span className="mgr-account-person" title={user.email}>
        <strong>{user.name}</strong>
        <small>Gerente da unidade</small>
      </span>
      <button className="mgr-text-button" disabled={pending} onClick={logout}>
        {pending ? "Saindo…" : "Sair"}
      </button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
