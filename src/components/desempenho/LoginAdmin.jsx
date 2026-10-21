import { useState } from "react";
import ManagerIcon from "../ManagerIcon";
import { entrarComoAdmin } from "../../services/desempenho";

// Os dados de uso e a saúde do sistema só abrem para o admin (o back confere
// o token). Pede CPF + matrícula + senha uma vez por aba do navegador.
export default function LoginAdmin() {
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(event) {
    event.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      await entrarComoAdmin({ cpf: cpf.trim(), matricula: matricula.trim(), senha });
    } catch (error) {
      setErro(error.status === 401 ? "CPF, matrícula ou senha incorretos." : error.message);
      setEnviando(false);
    }
  }

  return (
    <section className="mgr-panel adm-dsp-login" aria-labelledby="adm-dsp-login-titulo">
      <span className="adm-dsp-login-icone" aria-hidden="true"><ManagerIcon name="lock" size={22} /></span>
      <h2 id="adm-dsp-login-titulo">Entre como admin para ver o desempenho</h2>
      <p>Os dados de uso e a saúde do sistema são só do admin. Use o mesmo acesso do e-mail de boas-vindas.</p>
      <form className="mgr-form" onSubmit={entrar}>
        <div className="mgr-form-row">
          <label>
            CPF
            <input name="cpf" required autoComplete="username" inputMode="numeric" value={cpf} onChange={({ target }) => setCpf(target.value)} />
          </label>
          <label>
            Matrícula
            <input name="matricula" required value={matricula} onChange={({ target }) => setMatricula(target.value)} />
          </label>
        </div>
        <label>
          Senha
          <input name="senha" type="password" required autoComplete="current-password" value={senha} onChange={({ target }) => setSenha(target.value)} />
        </label>
        {erro && <p role="alert">{erro}</p>}
        <button type="submit" className="mgr-primary" disabled={enviando} data-track="desempenho-entrar">
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </section>
  );
}
