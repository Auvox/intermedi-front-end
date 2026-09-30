import { useEffect, useLayoutEffect, useRef } from "react";
import PerfilFuncionario from "./PerfilFuncionario";
import PerfilGerente from "./PerfilGerente";
import PerfilFarmacia from "./PerfilFarmacia";
import PerfilRemedio from "./PerfilRemedio";
import PerfilPaciente from "./PerfilPaciente";
import { DetalheChamado, DetalhePedido, DetalheServico } from "./Detalhes";
import ManagerIcon from "../ManagerIcon";
import "../../styles/perfil.css";

const CONTEUDO = {
  funcionario: PerfilFuncionario,
  gerente: PerfilGerente,
  farmacia: PerfilFarmacia,
  remedio: PerfilRemedio,
  paciente: PerfilPaciente,
  chamado: DetalheChamado,
  servico: DetalheServico,
  pedido: DetalhePedido,
};
const NOMES_TIPO = {
  funcionario: "Funcionário", gerente: "Gerente", farmacia: "Farmácia", remedio: "Remédio",
  paciente: "Paciente", chamado: "Chamado", servico: "Serviço", pedido: "Pedido",
};

// Página de perfil: ocupa toda a área ao lado do menu lateral (topo e conteúdo
// da tela ficam escondidos enquanto ela está aberta). "Voltar" e Esc desempilham;
// no primeiro nível, voltam para a tela de onde o perfil foi aberto.
export default function PerfilPainel({ pilha, titulos, onFechar, onVoltar }) {
  const ref = useRef(null);
  const topo = pilha.at(-1);
  const chave = `${topo.tipo}:${topo.id}`;
  const Conteudo = CONTEUDO[topo.tipo];
  const tituloDe = (item) => titulos[`${item.tipo}:${item.id}`] || `${NOMES_TIPO[item.tipo]} #${item.id}`;
  const voltar = () => (pilha.length > 1 ? onVoltar() : onFechar());

  // Esconde o resto da área de trabalho e guarda a rolagem da lista para devolver ao fechar.
  // Um modal aberto por baixo (ex.: detalhe do chamado) é suspenso — senão deixaria a
  // página inerte — e reaparece quando o perfil fecha.
  useLayoutEffect(() => {
    const pagina = ref.current;
    const area = pagina?.parentElement;
    const rolagem = window.scrollY;
    const modais = [...document.querySelectorAll("dialog[open]")].filter((d) => !pagina.contains(d));
    modais.forEach((d) => d.close());
    area?.classList.add("perfil-aberto");
    return () => {
      area?.classList.remove("perfil-aberto");
      window.scrollTo({ top: rolagem });
      modais.forEach((d) => { if (d.isConnected && !d.open) d.showModal(); });
    };
  }, []);
  // Cada perfil novo começa do topo (o foco vai para o título quando ele carrega)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
  }, [chave]);

  // Esc = Voltar (a não ser que um modal por cima, como o de foto, esteja aberto)
  const voltarRef = useRef(voltar);
  useEffect(() => { voltarRef.current = voltar; });
  useEffect(() => {
    function tecla(event) {
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      voltarRef.current();
    }
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);

  return (
    <section ref={ref} className={`perfil-pagina perfil-tipo-${topo.tipo}`} aria-label={tituloDe(topo)}>
      <div className="perfil-barra">
        <button type="button" className="perfil-voltar" onClick={voltar}>
          <ManagerIcon name="arrowLeft" size={17} />
          Voltar
        </button>
        <nav className="perfil-trilha" aria-label="Caminho">
          <ol>
            {pilha.map((item, i) => (
              <li key={`${item.tipo}:${item.id}`}>
                {i < pilha.length - 1 ? (
                  <button type="button" onClick={() => onVoltar(i)}>{tituloDe(item)}</button>
                ) : (
                  <span aria-current="page">{tituloDe(item)}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <span className="perfil-barra-tipo">{NOMES_TIPO[topo.tipo]}</span>
      </div>
      <div className="perfil-corpo">
        <Conteudo key={chave} tipo={topo.tipo} id={topo.id} />
      </div>
    </section>
  );
}
