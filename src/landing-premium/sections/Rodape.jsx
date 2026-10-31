import { Link } from "react-router-dom";
import logoBranco from "../../assets/logoFooter.png";
import { capitulos, creditoFoto, parceiros } from "../content";

// Rodapé em blocos: frase e créditos, capítulos, acesso por perfil,
// parceiros, a marca grande e um bloco verde que leva ao login.
export default function Rodape() {
  return (
    <footer className="lpx-rodape lpx-fundo-paper">
      <div className="lpx-rodape-grade">
        <div className="lpx-tile lpx-tile-frase" data-reveal>
          <p className="lpx-tile-destaque">Interligando medicamentos. Aproximando quem precisa de quem cuida.</p>
          <p className="lpx-tile-miudo">
            © {new Date().getFullYear()} Intermedi. Todos os direitos reservados.<br />{creditoFoto}
          </p>
        </div>
        <nav className="lpx-tile" aria-label="Capítulos" data-reveal style={{ "--d": 1 }}>
          <h2 className="lpx-tile-titulo">Explore</h2>
          <ul>
            {capitulos.map((c) => <li key={c.id}><a href={`#${c.id}`}>{c.nome}</a></li>)}
          </ul>
        </nav>
        <nav className="lpx-tile" aria-label="Acesso por perfil" data-reveal style={{ "--d": 2 }}>
          <h2 className="lpx-tile-titulo">Entrar como</h2>
          <ul>
            <li><Link to="/login?perfil=gerente">Gerente</Link></li>
            <li><Link to="/login?perfil=funcionario">Funcionário</Link></li>
            <li><Link to="/login?perfil=admin">Administrador</Link></li>
          </ul>
        </nav>
        <div className="lpx-tile" data-reveal style={{ "--d": 3 }}>
          <h2 className="lpx-tile-titulo">Parceiros de confiança</h2>
          <ul>
            {parceiros.map((p) => (
              <li key={p.nome}><a href={p.url} target="_blank" rel="noopener noreferrer">{p.nome}<span className="lpx-sr"> (abre em nova aba)</span></a></li>
            ))}
          </ul>
        </div>
        <a href="#inicio" className="lpx-tile lpx-tile-marca" aria-label="Intermedi, voltar ao início">
          <img src={logoBranco} alt="" width="666" height="375" loading="lazy" decoding="async" />
        </a>
        <Link to="/login" className="lpx-tile lpx-tile-acesso">
          <span>Acessar a plataforma</span>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 38 38 10M16 10h22v22" /></svg>
        </Link>
      </div>
    </footer>
  );
}
