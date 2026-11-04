import PersonaIcon from "../../components/PersonaIcon";
import { Icone } from "../ui/Plataforma";

// A ligação entre as duas farmácias: o trilho, o gerente da unidade no meio
// do caminho, o chamado (vai da solicitante para a fornecedora) e a caixa
// (volta da fornecedora para a solicitante). Na horizontal no computador e
// na vertical no celular; a timeline move tudo por transform.
export default function TransferConnection({ quantidade }) {
  return (
    <div className="rms-conexao" aria-hidden="true">
      <span className="rms-rotulo rms-rotulo-pedido" data-story="rotulo-pedido">Pedido <b>→</b></span>
      <span className="rms-trilho" data-story="trilho">
        <i className="rms-trilho-base" />
        <i className="rms-trilho-pedido" data-story="linha-pedido" />
        <i className="rms-trilho-envio" data-story="linha-envio" />
        <span className="rms-gerente" data-story="gerente">
          <PersonaIcon role="gerente" size={18} />
          <span>Gerente</span>
          <b data-story="gerente-ok">✓</b>
        </span>
        <span className="rms-viajante rms-chamado" data-story="chamado">
          <Icone nome="ticket" tamanho={16} />
          <span className="rms-chamado-texto">
            <span data-story="chamado-a">Chamado</span>
            <span data-story="chamado-b">Aprovado</span>
          </span>
        </span>
        <span className="rms-viajante rms-caixa" data-story="caixa">
          <Icone nome="box" tamanho={16} />
          {quantidade} un.
        </span>
      </span>
      <span className="rms-rotulo rms-rotulo-envio" data-story="rotulo-envio"><b>←</b> Envio</span>
    </div>
  );
}
