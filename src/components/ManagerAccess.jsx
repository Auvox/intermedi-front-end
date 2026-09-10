import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { authRequest } from "../services/auth";
import { normalizeGerentes } from "../services/gerenteMapper";

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [profileError, setProfileError] = useState("");

  async function loadProfile() {
    setLoadingProfile(true);
    setProfileError("");
    try {
      const listResponse = await fetch("http://localhost:3000/gerente", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const listPayload = await listResponse.json().catch(() => ({}));

      if (!listResponse.ok) {
        throw new Error(
          listPayload.message ||
            listPayload.error ||
            "Erro ao buscar perfil do gerente",
        );
      }

      const rawList = Array.isArray(listPayload)
        ? listPayload
        : Array.isArray(listPayload?.gerente)
          ? listPayload.gerente
          : Array.isArray(listPayload?.gerentes)
            ? listPayload.gerentes
            : [];

      const raw =
        rawList.find(
          (item) =>
            String(item.emailGerente ?? item.email ?? "")
              .trim()
              .toLowerCase() ===
            String(user.email || "")
              .trim()
              .toLowerCase(),
        ) ||
        rawList[0] ||
        {};

      const gerenteId = raw.idGerente ?? raw.id;
      if (!gerenteId) {
        throw new Error("Gerente não encontrado pelo e-mail autenticado.");
      }

      const detailResponse = await fetch(
        `http://localhost:3000/gerente/${encodeURIComponent(gerenteId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      const detailPayload = await detailResponse.json().catch(() => ({}));

      if (!detailResponse.ok) {
        throw new Error(
          detailPayload.message ||
            detailPayload.error ||
            detailPayload.error?.message ||
            "Erro ao buscar o perfil do gerente por id.",
        );
      }

      const detail =
        detailPayload?.resultado ??
        detailPayload?.gerente ??
        detailPayload?.gerentes ??
        detailPayload;

      const profileData = {
        id: detail.idGerente ?? detail.id ?? gerenteId,
        name: detail.nomeGerente ?? detail.name ?? raw.nomeGerente ?? user.name,
        email:
          detail.emailGerente ?? detail.email ?? raw.emailGerente ?? user.email,
        cpf: detail.cpfGerente ?? detail.cpf ?? "",
        crf: detail.crfGerente ?? detail.crf ?? "",
        senha: detail.senhaGerente ?? detail.senha ?? "",
        cep: detail.cepGerente ?? detail.cep ?? "",
        endereco: detail.enderecoGerente ?? detail.endereco ?? "",
        numero: detail.numeroGerente ?? detail.numero ?? "",
        complemento: detail.complementoGerente ?? detail.complemento ?? "",
        bairro: detail.bairroGerente ?? detail.bairro ?? "",
        cidade: detail.cidadeGerente ?? detail.cidade ?? "",
      };

      setProfile(profileData);
      setDraft(profileData);
    } catch (error) {
      const fallback = {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: "",
        crf: "",
        senha: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
      };
      setProfile(fallback);
      setDraft(fallback);
      setProfileError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o perfil do gerente.",
      );
    } finally {
      setLoadingProfile(false);
    }
  }

  async function openProfile() {
    await loadProfile();
    setProfileOpen(true);
  }

  async function saveProfile(event) {
    event?.preventDefault?.();
    if (!draft || !profile) return;

    const payload = {
      nomeGerente: draft.name,
      emailGerente: draft.email,
      cpfGerente: draft.cpf,
      crfGerente: draft.crf,
      senhaGerente: draft.senha,
      cepGerente: draft.cep,
      enderecoGerente: draft.endereco,
      numeroGerente: draft.numero,
      complementoGerente: draft.complemento || null,
      bairroGerente: draft.bairro,
      cidadeGerente: draft.cidade,
    };

    try {
      const response = await fetch(
        `http://localhost:3000/gerente/${encodeURIComponent(profile.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          result.message ||
          result.error?.message ||
          result.error?.errstr ||
          "Não foi possível salvar o perfil do gerente.";
        throw new Error(message);
      }

      setProfile({ ...draft, id: profile.id });
      setDraft({ ...draft, id: profile.id });
      setEditingField(null);
      setProfileOpen(false);
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o perfil do gerente.",
      );
    }
  }

  function cancelProfileEdit() {
    setDraft(profile);
    setEditingField(null);
    setProfileError("");
  }

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
    <>
      <div className="mgr-account">
        <button
          className="mgr-account-button"
          onClick={openProfile}
          aria-label="Abrir perfil do gerente"
        >
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
        </button>
        <button className="mgr-text-button" disabled={pending} onClick={logout}>
          {pending ? "Saindo…" : "Sair"}
        </button>
        {error && <span role="alert">{error}</span>}
      </div>

      {profileOpen && (
        <dialog
          open
          className="mgr-modal mgr-profile-modal"
          aria-label="Perfil do gerente"
        >
          <div className="mgr-modal-head">
            <h2>Perfil do gerente</h2>
            <button
              type="button"
              aria-label="Fechar perfil"
              onClick={() => setProfileOpen(false)}
            >
              ×
            </button>
          </div>
          {loadingProfile && <p className="mgr-empty">Carregando perfil…</p>}
          {profileError && (
            <p className="mgr-empty" role="alert">
              {profileError}
            </p>
          )}
          {profile && draft && (
            <form className="mgr-form mgr-profile-form" onSubmit={saveProfile}>
              <div className="mgr-profile-fields">
                {[
                  ["name", "Nome completo"],
                  ["email", "E-mail"],
                  ["cpf", "CPF"],
                  ["crf", "CRF"],
                  ["cep", "CEP"],
                  ["endereco", "Endereço"],
                  ["numero", "Número"],
                  ["complemento", "Complemento"],
                  ["bairro", "Bairro"],
                  ["cidade", "Cidade"],
                ].map(([key, label]) => (
                  <div className="mgr-profile-row" key={key}>
                    <span className="mgr-profile-label">{label}</span>
                    <div className="mgr-profile-value">
                      {editingField === key ? (
                        <input
                          className="mgr-profile-input"
                          value={draft[key] ?? ""}
                          onChange={({ target }) =>
                            setDraft({ ...draft, [key]: target.value })
                          }
                        />
                      ) : (
                        <span className="mgr-profile-readonly">
                          {draft[key] || "Não informado"}
                        </span>
                      )}
                      <button
                        type="button"
                        className="mgr-profile-edit"
                        aria-label={`Editar ${label}`}
                        onClick={() => setEditingField(key)}
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mgr-modal-actions">
                <button
                  className="mgr-secondary"
                  type="button"
                  onClick={() => {
                    cancelProfileEdit();
                    setProfileOpen(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="mgr-primary"
                  type="button"
                  onClick={saveProfile}
                >
                  Salvar
                </button>
              </div>
            </form>
          )}
        </dialog>
      )}
    </>
  );
}
