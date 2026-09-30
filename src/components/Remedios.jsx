import { useState } from "react";
import ManagerIcon from "./ManagerIcon";
import { ChamadoModal } from "./Chamados";
import { fotoUrl } from "../services/api";
import { formatarValidade, nomeComDosagem, situacao, tarja } from "../services/remedios";
import "../styles/remedios.css";

// Foto do remédio; sem foto (ou se a imagem falhar) mostra o ícone de pílula
export function FotoRemedio({ foto, nome, tamanho = "sm" }) {
  const [falhou, setFalhou] = useState(null);
  const src = fotoUrl(foto);
  return (
    <span className={`remedio-foto remedio-foto-${tamanho}`}>
      {src && falhou !== src ? (
        <img src={src} alt={nome || "Remédio"} onError={() => setFalhou(src)} />
      ) : (
        <span className="remedio-foto-vazia" role="img" aria-label={`${nome || "Remédio"} sem foto`}>
          <ManagerIcon name="pill" size={tamanho === "lg" ? 44 : 20} />
        </span>
      )}
    </span>
  );
}

export function TarjaBadge({ valor }) {
  const { label, tone } = tarja(valor);
  return <span className={`remedio-tarja remedio-tarja-${tone}`}>{label}</span>;
}

// Situação do estoque + selo "Lote vencido"
export function SituacaoBadges({ item }) {
  const { label, tone } = situacao(item.situacao);
  return (
    <span className="remedio-selos">
      <span className={`mgr-badge chamado-badge ${tone}`}>{label}</span>
      {item.vencido && <span className="mgr-badge chamado-badge red">Lote vencido</span>}
    </span>
  );
}

// Barra quantidade × estoque mínimo (cheia em 2× o mínimo)
export function BarraEstoque({ quantidade, minimo }) {
  const qtd = Number(quantidade) || 0;
  const min = Number(minimo) || 0;
  const pct = min > 0 ? Math.min(100, Math.round((qtd / (min * 2)) * 100)) : qtd > 0 ? 100 : 0;
  const tone = qtd === 0 ? "zerado" : qtd <= min ? "critico" : "ok";
  return (
    <div className="remedio-barra-wrap">
      <strong>{qtd.toLocaleString("pt-BR")} un.</strong>
      <span
        className={`remedio-barra remedio-barra-${tone}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={Math.max(min * 2, qtd, 1)}
        aria-valuenow={qtd}
        aria-label={`${qtd} unidades, mínimo ${min}`}
      >
        <i style={{ width: `${pct}%` }} />
        {min > 0 && <b className="remedio-barra-min" style={{ left: "50%" }} aria-hidden="true" />}
      </span>
      <small>mínimo {min.toLocaleString("pt-BR")}</small>
    </div>
  );
}

// Cards Total · Críticos · Zerados · Vencidos; clicar aplica o filtro de situação
export function ResumoEstoque({ resumo, filtro, onFiltrar }) {
  const cards = [
    ["", "Total", resumo?.totalItens, "box"],
    ["critico", "Críticos", resumo?.criticos, "alert"],
    ["zerado", "Zerados", resumo?.zerados, "pill"],
    ["vencido", "Vencidos", resumo?.vencidos, "clock"],
  ];
  return (
    <div className="remedio-resumo" role="group" aria-label="Resumo do estoque">
      {cards.map(([valor, label, total, icone]) => (
        <button
          key={label}
          type="button"
          className={`remedio-resumo-card remedio-resumo-${valor || "total"}`}
          aria-pressed={filtro === valor}
          onClick={() => onFiltrar(filtro === valor ? "" : valor)}
        >
          <span className="directory-stat-icon"><ManagerIcon name={icone} size={20} /></span>
          <span>
            <small>{label}</small>
            <strong>{total ?? "—"}</strong>
          </span>
        </button>
      ))}
    </div>
  );
}

// Tabela do estoque; `acoes(item)` desenha os botões de cada linha
export function EstoqueTabela({ itens, acoes }) {
  return (
    <div className="mgr-table-wrap">
      <table className="remedio-tabela">
        <thead>
          <tr>
            <th scope="col">Remédio</th>
            <th scope="col">Quantidade</th>
            <th scope="col">Situação</th>
            <th scope="col">Lote</th>
            <th scope="col">Validade</th>
            {acoes && <th scope="col">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.idEstoque ?? item.idRemedio} className={item.vencido || item.situacao !== "ok" ? "remedio-linha-alerta" : undefined}>
              <td>
                <div className="remedio-celula">
                  <FotoRemedio foto={item.fotoRemedio} nome={item.nomeRemedio} />
                  <div>
                    <strong>{nomeComDosagem(item)}</strong>
                    <small>{[item.apresentacaoRemedio, item.fabricanteRemedio].filter(Boolean).join(" · ")}</small>
                    <TarjaBadge valor={item.tarjaRemedio} />
                  </div>
                </div>
              </td>
              <td><BarraEstoque quantidade={item.quantidade} minimo={item.estoqueMinimo} /></td>
              <td><SituacaoBadges item={item} /></td>
              <td>{item.lote || "—"}</td>
              <td>{formatarValidade(item.validade)}</td>
              {acoes && <td><div className="remedio-acoes">{acoes(item)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Confirmação antes de ações destrutivas
export function ConfirmarModal({ titulo, children, rotulo = "Confirmar", enviando, erro, onConfirmar, onCancelar }) {
  return (
    <ChamadoModal title={titulo} onClose={onCancelar}>
      <div className="remedio-confirmar">
        {children}
        {erro && <p className="remedio-aviso remedio-aviso-erro" role="alert">{erro}</p>}
        <div className="mgr-modal-actions">
          <button type="button" className="mgr-secondary" disabled={enviando} onClick={onCancelar}>Cancelar</button>
          <button type="button" className="mgr-delete-button chamado-recusar" disabled={enviando} onClick={onConfirmar} autoFocus>
            {enviando ? "Enviando..." : rotulo}
          </button>
        </div>
      </div>
    </ChamadoModal>
  );
}
