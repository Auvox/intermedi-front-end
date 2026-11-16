import ManagerIcon from "./ManagerIcon";

// Lista única do sino: chamados da equipe, pedidos de outras farmácias e cada
// etapa das entregas, misturados do mais novo para o mais antigo. O que ainda
// não foi clicado fica em destaque (guardado neste navegador).
// itens: [{ chave, icone, titulo, detalhe?, meta, quando (ms), urgente?, abrir() }]

export default function PainelNotificacoes({ id, itens, carregando, erros = [], rodape, vistas, onMarcar }) {
  const ordenados = [...itens].sort((a, b) => (b.quando ?? 0) - (a.quando ?? 0));
  const novas = ordenados.filter((i) => !vistas.has(i.chave));
  return (
    <div className="notif-painel" id={id} role="region" aria-label="Notificações">
      <div className="notif-topo">
        <p className="notif-titulo">Notificações</p>
        {novas.length > 0 && (
          <>
            <span className="notif-contagem">{novas.length} {novas.length === 1 ? "nova" : "novas"}</span>
            <button type="button" className="notif-ler-todas" onClick={() => onMarcar(novas.map((i) => i.chave))}>
              Marcar todas como lidas
            </button>
          </>
        )}
      </div>
      {erros.map(({ texto, tentar }) => (
        <p key={texto} className="notif-erro" role="alert">
          {texto} <button type="button" onClick={tentar}>Tentar de novo</button>
        </p>
      ))}
      {carregando && !ordenados.length ? (
        <p className="notif-vazio" role="status">Carregando…</p>
      ) : ordenados.length ? (
        <ul className="notif-lista">
          {ordenados.map((item) => {
            const nova = !vistas.has(item.chave);
            return (
              <li key={item.chave} className={nova ? "is-nova" : undefined}>
                <button
                  type="button"
                  onClick={() => {
                    onMarcar([item.chave]);
                    item.abrir();
                  }}
                >
                  <span className="notif-icone" aria-hidden="true">
                    <ManagerIcon name={item.icone} size={18} />
                  </span>
                  <span className="notif-texto">
                    <strong>{nova && <span className="sr-only">Nova: </span>}{item.titulo}</strong>
                    {item.detalhe && <span className="notif-detalhe">{item.detalhe}</span>}
                    <small className={item.urgente ? "notif-urgente" : undefined}>{item.meta}</small>
                  </span>
                  {nova && <i className="notif-ponto" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="notif-vazio">Tudo em dia: nenhuma notificação.</p>
      )}
      {rodape && <div className="notif-rodape">{rodape}</div>}
    </div>
  );
}
