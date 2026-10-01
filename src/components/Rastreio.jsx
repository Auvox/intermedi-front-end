import { useId, useState } from "react";
import ManagerIcon from "./ManagerIcon";
import { FotoRemedio } from "./Remedios";
import { useEnderecosFarmacias, useRelogio } from "../hooks/useRastreio";
import {
  diaEHora,
  haQuanto,
  horarioEtapa,
  localDaPonta,
  montarRastreio,
  textoChegada,
} from "../services/rastreio";
import "../styles/rastreio.css";

const ROTULO_ESTADO = {
  aguardando: "Envio pendente",
  a_caminho: "A caminho",
  entregue: "Entregue",
  recusado: "Pedido recusado",
  cancelado: "Pedido cancelado",
};

const ICONE_MARCO = {
  solicitado: "clipboard",
  aceito: "check",
  saiu: "truck",
  transito: "truck",
  chegando: "map",
  entregue: "box",
  recusado: "alert",
  cancelado: "alert",
};

// Situação atual do pedido, recalculada a cada segundo enquanto o caminhão anda
function useRastreio(pedido) {
  const enderecos = useEnderecosFarmacias();
  const andando = pedido.status === "enviada";
  const agora = useRelogio(andando);
  return { rastreio: montarRastreio(pedido, enderecos, agora), agora };
}

// Título grande do cartão ("Chega em 1:42", "Entregue hoje às 22:55"…)
function tituloDoRastreio(r, perspectiva, agora) {
  const paraOnde = perspectiva === "fornecedor" ? ` à ${r.destino.nome}` : "";
  if (r.estado === "a_caminho") {
    const chegada = textoChegada(r.fim, agora);
    if (chegada.segundos === 0) return `Chegando${paraOnde}…`;
    return chegada.curto ? `Chega${paraOnde} em ${chegada.texto}` : `Chega${paraOnde} ${chegada.texto}`;
  }
  if (r.estado === "entregue") return `Entregue${paraOnde} ${diaEHora(r.fim, agora)}`;
  if (r.estado === "aguardando") {
    return perspectiva === "fornecedor" ? "Aguardando sua confirmação" : `Aguardando a ${r.origem.nome} confirmar`;
  }
  return r.atual.descricao;
}

// "chega em cerca de 2 min" para leitores de tela (sem anunciar cada segundo)
function chegadaFalada(r, agora) {
  const segundos = Math.max(0, Math.ceil((r.fim - agora) / 1000));
  if (segundos === 0) return "chegando";
  return segundos < 3600 ? `chega em cerca de ${Math.max(1, Math.round(segundos / 60))} min` : `chega ${textoChegada(r.fim, agora).texto}`;
}

// Caminhãozinho de entrega (de lado, indo para a direita)
export function Caminhao({ className = "" }) {
  return (
    <svg className={`rastreio-caminhao-svg ${className}`} viewBox="0 0 64 36" aria-hidden="true" focusable="false">
      <g className="rastreio-vento">
        <path d="M2 12h7M0 18h9M3 24h6" />
      </g>
      <g className="rastreio-carro">
        <rect x="11" y="5" width="32" height="21" rx="3.5" className="rastreio-bau" />
        <path d="M24.5 11.5h5v4h4v5h-4v4h-5v-4h-4v-5h4z" className="rastreio-cruz" transform="translate(0 -2.5) scale(1 .92)" />
        <path d="M43 11h8.2a3 3 0 0 1 2.4 1.2l4.6 6.1a3 3 0 0 1 .6 1.8V26H43z" className="rastreio-cabine" />
        <path d="M46 14h4.6l3.4 4.6H46z" className="rastreio-janela" />
        <rect x="9" y="25" width="51" height="3" rx="1.5" className="rastreio-chassi" />
      </g>
      <g className="rastreio-roda" style={{ transformOrigin: "21px 29px" }}>
        <circle cx="21" cy="29" r="5" /><circle cx="21" cy="29" r="1.8" className="rastreio-calota" /><path d="M21 24.6v2.2" className="rastreio-raio" />
      </g>
      <g className="rastreio-roda" style={{ transformOrigin: "50px 29px" }}>
        <circle cx="50" cy="29" r="5" /><circle cx="50" cy="29" r="1.8" className="rastreio-calota" /><path d="M50 24.6v2.2" className="rastreio-raio" />
      </g>
    </svg>
  );
}

// Estrada com os marcos e o caminhão na posição atual. A compacta (listas e
// faixa) é só ilustração: o texto ao lado já diz a etapa e a previsão.
function Estrada({ rastreio: r, agora, compacta = false, rotulo }) {
  const pct = Math.round(r.progresso * 1000) / 10;
  const marcos = r.etapas.filter((e) => e.fracao !== undefined);
  const valorTexto = r.estado === "a_caminho"
    ? `${r.atual.titulo}. ${Math.round(pct)}% do caminho, ${chegadaFalada(r, agora)}.`
    : `${ROTULO_ESTADO[r.estado]}. ${r.atual.titulo}.`;
  return (
    <span
      className={`rastreio-estrada${compacta ? " compacta" : ""} rastreio-estrada-${r.estado}`}
      {...(compacta
        ? { "aria-hidden": true }
        : {
          role: "progressbar",
          "aria-label": rotulo,
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "aria-valuenow": Math.round(pct),
          "aria-valuetext": valorTexto,
        })}
    >
      <span className="rastreio-asfalto" />
      <span className="rastreio-percorrido" style={{ width: `${pct}%` }} />
      {!compacta && marcos.map((m) => (
        <i
          key={m.id}
          className={`rastreio-ponto ${m.situacao}`}
          style={{ left: `${m.fracao * 100}%` }}
          title={m.titulo}
        />
      ))}
      {r.estado !== "recusado" && r.estado !== "cancelado" && (
        <span className={`rastreio-caminhao${r.estado === "a_caminho" ? " andando" : ""}`} style={{ left: `${pct}%` }}>
          <Caminhao />
        </span>
      )}
    </span>
  );
}

// Cartão completo de rastreamento (tela do pedido, do chamado e detalhe do gerente)
// perspectiva: "solicitante" (quem pediu) | "fornecedor" (quem enviou)
export function RastreioEntrega({ pedido, perspectiva = "solicitante", onAbrir, minimalista = false }) {
  const uid = useId();
  const { rastreio: r, agora } = useRastreio(pedido);
  const curtas = r.inicio !== null && r.fim !== null && r.fim - r.inicio < 3600000;
  return (
    <section className={`rastreio rastreio-${r.estado}${minimalista ? " rastreio-min" : ""}`} aria-labelledby={`${uid}-titulo`}>
      <header className="rastreio-topo">
        <div className="rastreio-topo-texto">
          <p className="rastreio-rotulo">
            <span className="rastreio-rotulo-ponto" aria-hidden="true" />
            {ROTULO_ESTADO[r.estado]}
          </p>
          <h3 id={`${uid}-titulo`} className="rastreio-titulo">
            <span aria-hidden={r.estado === "a_caminho"}>{tituloDoRastreio(r, perspectiva, agora)}</span>
            {r.estado === "a_caminho" && <span className="sr-only">{`A caminho, ${chegadaFalada(r, agora)}`}</span>}
          </h3>
          <p className="rastreio-item">
            <strong>{r.item}</strong> · pedido #{pedido.idRedistribuicao}
            {pedido.idChamado ? ` · chamado #${pedido.idChamado}` : ""}
          </p>
        </div>
        {!minimalista && <FotoRemedio foto={pedido.fotoRemedio} nome={pedido.nomeRemedio} tamanho="md" />}
      </header>

      <div className="rastreio-mapa">
        <div className="rastreio-pontas">
          <div className="rastreio-ponta">
            <span className="rastreio-pino origem"><ManagerIcon name="pharmacy" size={16} /></span>
            <span>
              <small>Sai de</small>
              <strong>{r.origem.nome}</strong>
              {localDaPonta(r.origem) && <small>{localDaPonta(r.origem)}</small>}
            </span>
          </div>
          <div className="rastreio-ponta destino">
            <span>
              <small>Chega em</small>
              <strong>{r.destino.nome}</strong>
              {localDaPonta(r.destino) && <small>{localDaPonta(r.destino)}</small>}
            </span>
            <span className="rastreio-pino destino"><ManagerIcon name="map" size={16} /></span>
          </div>
        </div>
        <Estrada rastreio={r} agora={agora} rotulo={`Trajeto de ${r.origem.nome} até ${r.destino.nome}`} />
      </div>

      <ol className="rastreio-etapas" aria-label="Linha do tempo da entrega">
        {r.etapas.map((e) => (
          <li key={e.id} className={`rastreio-etapa ${e.situacao}`} aria-current={e.situacao === "atual" ? "step" : undefined}>
            <span className="rastreio-etapa-marca" aria-hidden="true" />
            <div>
              <strong>{e.titulo}</strong>
              {(e.situacao === "atual" || e.situacao === "erro") && e.descricao && <p>{e.descricao}</p>}
              {e.situacao !== "futuro" && e.quando !== null && (
                <time dateTime={new Date(e.quando).toISOString()}>{horarioEtapa(e.quando, agora, { segundos: curtas })}</time>
              )}
              {e.situacao === "futuro" && e.id === "entregue" && r.fim !== null && (
                <time dateTime={new Date(r.fim).toISOString()}>Previsão: {horarioEtapa(r.fim, agora, { segundos: curtas })}</time>
              )}
            </div>
          </li>
        ))}
      </ol>
      {/* anuncia só a troca de etapa, não a contagem */}
      <p className="sr-only" aria-live="polite">{`${r.atual.titulo}. ${r.atual.descricao}`}</p>

      {onAbrir && (
        <div className="rastreio-acoes">
          <button type="button" className="rastreio-botao" onClick={(e) => onAbrir(e.currentTarget)}>
            Ver detalhes do envio
          </button>
        </div>
      )}
    </section>
  );
}

// Versão de uma linha para listas: estrada fina + etapa atual + previsão
export function RastreioMini({ pedido, perspectiva = "solicitante" }) {
  const { rastreio: r, agora } = useRastreio(pedido);
  const chegada = r.estado === "a_caminho" ? textoChegada(r.fim, agora) : null;
  return (
    <span className={`rastreio-mini rastreio-${r.estado}`}>
      <Estrada rastreio={r} agora={agora} compacta />
      <span className="rastreio-mini-texto">
        <strong>{r.atual.titulo}</strong>
        {chegada && (
          <span aria-hidden="true">
            {" · "}
            {chegada.segundos === 0 ? "chegando…" : chegada.curto ? `chega em ${chegada.texto}` : `chega ${chegada.texto}`}
          </span>
        )}
        {r.estado === "aguardando" && ` · ${perspectiva === "fornecedor" ? "aguardando você" : `aguardando ${r.origem.nome}`}`}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------
//  Faixa "em andamento" da tela principal: discreta, mas com movimento
// ---------------------------------------------------------------------

function ItemPedido({ pedido, onAbrir }) {
  const { rastreio: r, agora } = useRastreio(pedido);
  const fornecedor = pedido.perspectiva === "fornecedor";
  const chegada = r.estado === "a_caminho" ? textoChegada(r.fim, agora) : null;
  const detalhe = r.estado === "aguardando"
    ? `Aguardando a ${r.origem.nome} confirmar`
    : chegada
      ? `${fornecedor ? `Enviando para ${r.destino.nome} · ` : ""}${r.atual.titulo} · ${chegada.segundos === 0 ? "chegando…" : chegada.curto ? `chega em ${chegada.texto}` : `chega ${chegada.texto}`}`
      : r.atual.titulo;
  return (
    <button type="button" className="andamento-item" onClick={(e) => onAbrir(pedido, e.currentTarget)}>
      <span className={`andamento-icone ${r.estado}`}><ManagerIcon name={r.estado === "aguardando" ? "clock" : "truck"} size={16} /></span>
      <span className="andamento-texto">
        <strong>{fornecedor ? `Envio: ${r.item}` : r.item}</strong>
        <small>{detalhe}</small>
      </span>
      {r.estado === "a_caminho" && <Estrada rastreio={r} agora={agora} compacta />}
      <span className="andamento-ir" aria-hidden="true">Acompanhar →</span>
    </button>
  );
}

function ItemChamado({ chamado, pedidos, onAbrir }) {
  const enviado = pedidos.filter((p) => p.status === "enviada")
    .sort((a, b) => String(a.dataPrevistaChegada).localeCompare(String(b.dataPrevistaChegada)))[0];
  const aguardando = pedidos.find((p) => p.status === "solicitada");
  const situacao = chamado.status === "pendente"
    ? "Aguardando resposta do gerente"
    : aguardando && !enviado
      ? `Aguardando a ${aguardando.nomeFarmaciaOrigem} confirmar o envio`
      : !enviado
        ? "Procurando farmácia com o remédio"
        : null;
  return (
    <button type="button" className="andamento-item" onClick={(e) => onAbrir(chamado, e.currentTarget)}>
      {enviado ? (
        <ItemChamadoACaminho chamado={chamado} pedido={enviado} />
      ) : (
        <>
          <span className="andamento-icone aguardando"><ManagerIcon name="clock" size={16} /></span>
          <span className="andamento-texto">
            <strong>{chamado.titulo}</strong>
            <small>{situacao}</small>
          </span>
        </>
      )}
      <span className="andamento-ir" aria-hidden="true">Acompanhar →</span>
    </button>
  );
}

function ItemChamadoACaminho({ chamado, pedido }) {
  const { rastreio: r, agora } = useRastreio(pedido);
  const chegada = textoChegada(r.fim, agora);
  return (
    <>
      <span className={`andamento-icone ${r.estado}`}><ManagerIcon name="truck" size={16} /></span>
      <span className="andamento-texto">
        <strong>{chamado.titulo}</strong>
        <small>
          {r.item} · {r.atual.titulo}
          {r.estado === "a_caminho" && ` · ${chegada.segundos === 0 ? "chegando…" : chegada.curto ? `chega em ${chegada.texto}` : `chega ${chegada.texto}`}`}
        </small>
      </span>
      <Estrada rastreio={r} agora={agora} compacta />
    </>
  );
}

// pedidos: [{...pedido, perspectiva}] (gerente) · chamados: chamados em processo (funcionário)
export function FaixaEmAndamento({ pedidos = [], chamados = [], onAbrirPedido, onAbrirChamado }) {
  const total = pedidos.length + chamados.length;
  if (!total) return null;
  return (
    <section className="andamento" aria-label={`${total} ${total === 1 ? "entrega em andamento" : "entregas em andamento"}`}>
      <p className="andamento-selo">
        <span className="andamento-pulso" aria-hidden="true" />
        Em andamento
        <b>{total}</b>
      </p>
      <ul>
        {pedidos.slice(0, 3).map((p) => (
          <li key={`p${p.idRedistribuicao}`}><ItemPedido pedido={p} onAbrir={onAbrirPedido} /></li>
        ))}
        {chamados.slice(0, 3).map(({ chamado, pedidos: dele }) => (
          <li key={`c${chamado.idChamado}`}><ItemChamado chamado={chamado} pedidos={dele} onAbrir={onAbrirChamado} /></li>
        ))}
      </ul>
      {total > 6 && <p className="andamento-mais">e mais {total - 6}…</p>}
    </section>
  );
}

// ---------------------------------------------------------------------
//  Lista de notificações (sino)
// ---------------------------------------------------------------------
export function ListaRastreio({ eventos, isNovo, linkPara, onAbrir, vazio = "Nenhuma atualização de entrega nas últimas 24 h." }) {
  const agora = useRelogio(false);
  if (!eventos.length) return <p className="chamado-bell-empty">{vazio}</p>;
  return (
    <ul className="rastreio-notificacoes">
      {eventos.slice(0, 8).map((e) => (
        <li key={e.chave} className={isNovo(e) ? "chamado-entrega-nova" : undefined}>
          <a href={linkPara(e)} onClick={(ev) => { ev.preventDefault(); onAbrir(e); }}>
            <span className={`rastreio-notificacao-icone ${e.marco}`} aria-hidden="true">
              <ManagerIcon name={ICONE_MARCO[e.marco] ?? "truck"} size={14} />
            </span>
            <span>
              <strong>{e.titulo}</strong> · {e.item}
              <small className="rastreio-notificacao-desc">{e.descricao}</small>
              <small>
                {isNovo(e) && <span className="sr-only">Nova. </span>}
                {haQuanto(e.quando, Math.max(agora, e.quando))}
              </small>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// Linha de tabela com o caminhãozinho: "Ver detalhes" abre o rastreamento completo
// (versão enxuta) numa linha logo abaixo, ocupando a largura da tabela.
// celulas(botao) devolve as <td> da linha; botao é null quando não há pedido.
export function LinhaRastreavel({ pedido, colSpan, celulas }) {
  const [aberto, setAberto] = useState(false);
  const uid = useId();
  const botao = pedido ? (
    <button
      type="button"
      className="rastreio-ver"
      aria-expanded={aberto}
      aria-controls={uid}
      onClick={() => setAberto((v) => !v)}
    >
      {aberto ? "Ocultar detalhes" : "Ver detalhes"}
    </button>
  ) : null;
  return (
    <>
      <tr>{celulas(botao)}</tr>
      {pedido && aberto && (
        <tr className="rastreio-linha-aberta" data-sem-perfil>
          <td colSpan={colSpan} id={uid} data-sem-perfil>
            <RastreioEntrega pedido={pedido} minimalista />
          </td>
        </tr>
      )}
    </>
  );
}
