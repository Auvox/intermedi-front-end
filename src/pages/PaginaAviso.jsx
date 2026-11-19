import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logoIntermedi.webp";
import IlustracaoAviso from "../components/aviso/IlustracaoAviso";
import "../styles/aviso.css";

// Páginas de aviso da Intermedi, todas com o mesmo layout:
//   nao-encontrada       → 404: endereço que não existe ou não está disponível
//   fora-do-ar           → o servidor não respondeu (sistema caiu)
//   erro                 → a tela quebrou no navegador
//   farmacia-desativada  → a farmácia foi desativada pelo admin
//   conta-desativada     → o gerente/funcionário foi desativado
const TEXTOS = {
  "nao-encontrada": {
    codigo: "404",
    balao: "Ops…",
    titulo: "Não encontramos esta página",
    texto: "O endereço pode ter mudado ou a página não está mais disponível. Confira o link ou volte para o início.",
  },
  "fora-do-ar": {
    codigo: "503",
    balao: "Ops…",
    titulo: "O sistema está fora do ar",
    texto: "Não conseguimos falar com o servidor da Intermedi agora. Nenhum dado foi perdido. Tente de novo em alguns instantes.",
  },
  erro: {
    codigo: "500",
    balao: "Ops…",
    titulo: "Algo deu errado nesta tela",
    texto: "Tivemos um problema ao mostrar esta página. Recarregue para tentar de novo; se continuar, avise a equipe de suporte.",
  },
  "farmacia-desativada": {
    fachada: true,
    balao: "Fechada",
    titulo: "Esta farmácia está desativada",
    texto: "O acesso da unidade foi suspenso pela administração da rede Intermedi. Gerentes e funcionários não conseguem entrar enquanto ela estiver desativada. Fale com o administrador para reativar.",
  },
  "conta-desativada": {
    codigo: "423",
    balao: "Pausa",
    titulo: "Seu acesso está desativado",
    texto: "Sua conta foi desativada e não pode entrar na plataforma no momento. Procure o gerente da sua unidade ou a administração da rede.",
  },
};

export default function PaginaAviso({ tipo = "nao-encontrada", nomeFarmacia, onTentarDeNovo }) {
  const navigate = useNavigate();
  const t = TEXTOS[tipo] ?? TEXTOS["nao-encontrada"];
  const desativada = tipo === "farmacia-desativada" || tipo === "conta-desativada";

  useEffect(() => {
    const anterior = document.title;
    document.title = `${t.titulo} | Intermedi`;
    return () => {
      document.title = anterior;
    };
  }, [t.titulo]);

  return (
    <main className={`aviso-pagina aviso-${tipo}`}>
      <header className="aviso-topo">
        <Link to="/" aria-label="Intermedi — página inicial"><img src={logo} alt="Intermedi" /></Link>
      </header>
      <section className="aviso-conteudo" aria-labelledby="aviso-titulo">
        <IlustracaoAviso codigo={t.codigo} fachada={t.fachada} balao={t.balao} />
        <div className="aviso-texto">
          {t.codigo && <p className="aviso-codigo">Erro {t.codigo}</p>}
          {nomeFarmacia && desativada && <p className="aviso-codigo">{nomeFarmacia}</p>}
          <h1 id="aviso-titulo">{t.titulo}</h1>
          <p>{t.texto}</p>
          <div className="aviso-acoes">
            {(tipo === "fora-do-ar" || tipo === "erro") && (
              <button type="button" className="aviso-primario" onClick={onTentarDeNovo ?? (() => window.location.reload())}>
                Tentar de novo
              </button>
            )}
            {desativada ? (
              <Link className="aviso-primario" to="/login">Voltar ao login</Link>
            ) : (
              <Link className={tipo === "nao-encontrada" ? "aviso-primario" : "aviso-secundario"} to="/">Ir para o início</Link>
            )}
            {tipo === "nao-encontrada" && (
              <button type="button" className="aviso-secundario" onClick={() => navigate(-1)}>Voltar</button>
            )}
          </div>
        </div>
      </section>
      <footer className="aviso-rodape">
        © {new Date().getFullYear()} Intermedi · Conectando farmácias. Aproximando o cuidado.
      </footer>
    </main>
  );
}
