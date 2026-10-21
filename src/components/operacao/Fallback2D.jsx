import { SITUACAO_VISUAL } from "../../services/operacao";

// Planta 2D da unidade: a mesma informação da cena, em blocos. Usada em telas
// pequenas, quando o navegador não tem WebGL ou quando a pessoa prefere o 2D.
export default function Fallback2D({ operacao, selecionado, motivo, onSelecionar }) {
  const { corredores, funcionarios, balcoes, chamadosPendentes, entregas, gerente } = operacao;
  const porKey = new Map(funcionarios.map((f) => [f.key, f]));
  const fora = funcionarios.filter((f) => !f.noTurno);
  const noEstoque = funcionarios.filter((f) => f.noTurno && ["estoque", "apoio"].includes(f.posto.tipo));
  const botao = (key, conteudo, extra = "") => (
    <button key={key} type="button" className={`op2d-objeto${selecionado === key ? " ativo" : ""}${extra}`} aria-pressed={selecionado === key} onClick={() => onSelecionar(key)}>
      {conteudo}
    </button>
  );
  const pessoa = (f) => botao(f.key, <><i className={`op2d-ponto op-tom-${f.status.tone}`} aria-hidden="true" />{f.nome} <small>{f.status.label}</small></>);

  return (
    <div className="op2d">
      {motivo && <p className="op2d-motivo" role="status">{motivo}</p>}
      <div className="op2d-planta">
        <section className="op2d-zona op2d-estoque" aria-labelledby="op2d-estoque">
          <h3 id="op2d-estoque">Estoque</h3>
          {corredores.length ? corredores.map((c) => (
            <div key={c.key} className="op2d-corredor">
              {botao(c.key, <b>{String(c.numero).padStart(2, "0")} · {c.categoria}</b>, " op2d-corredor-titulo")}
              <div className="op2d-itens">
                {c.itens.map((i) => botao(i.key, (
                  <>
                    <i className={`op2d-ponto op-tom-${SITUACAO_VISUAL[i.situacao].tone}`} aria-hidden="true" />
                    {i.nomeCompleto}
                    <small>{i.quantidade} un. · {SITUACAO_VISUAL[i.situacao].label}</small>
                  </>
                )))}
              </div>
            </div>
          )) : <p className="op-vazio">Estoque vazio.</p>}
          {noEstoque.length > 0 && <div className="op2d-pessoas">{noEstoque.map(pessoa)}</div>}
        </section>

        <section className="op2d-zona op2d-doca" aria-labelledby="op2d-doca">
          <h3 id="op2d-doca">Doca de recebimento</h3>
          {entregas.length ? entregas.map((e) => botao(e.key, (
            <>
              {e.quantidade}× {e.nomeRemedio}
              <small>{e.sentido === "entrada" ? "de" : "para"} {e.outraFarmacia}{e.aguardandoVoce ? " · aguardando você" : ""}</small>
            </>
          ))) : <p className="op-vazio">Nenhuma entrega em andamento.</p>}
        </section>

        <section className="op2d-zona op2d-atendimento" aria-labelledby="op2d-atendimento">
          <h3 id="op2d-atendimento">Atendimento</h3>
          {balcoes.map((b) => {
            const f = porKey.get(b.funcionario);
            return (
              <div key={b.key} className="op2d-balcao">
                {botao(b.key, <b>{b.nome}</b>)}
                {f ? pessoa(f) : <small className="op-muted">Sem funcionário no turno</small>}
              </div>
            );
          })}
        </section>

        <section className="op2d-zona op2d-gerencia" aria-labelledby="op2d-gerencia">
          <h3 id="op2d-gerencia">Gerência</h3>
          {gerente && botao(gerente.key, <>{gerente.nome} <small>Gerente</small></>)}
          {chamadosPendentes.length ? chamadosPendentes.map((c) => botao(c.key, (
            <>
              <i className={`op2d-ponto op-tom-${c.prioridade === "alta" || c.prioridade === "urgente" ? "red" : "yellow"}`} aria-hidden="true" />
              {c.titulo}
              <small>{c.protocolo} · {c.nomeFuncionario}</small>
            </>
          ))) : <p className="op-vazio">Nenhum chamado pendente.</p>}
        </section>

        <section className="op2d-zona op2d-equipe" aria-labelledby="op2d-equipe">
          <h3 id="op2d-equipe">Equipe fora do turno</h3>
          {fora.length ? fora.map(pessoa) : <p className="op-vazio">Toda a equipe está no turno.</p>}
        </section>
      </div>
    </div>
  );
}
