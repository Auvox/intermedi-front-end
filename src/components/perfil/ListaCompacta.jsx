// Lista de "últimos" (serviços, chamados, farmácias…) em que cada linha abre algo.
// itens: [{ chave, titulo, subtitulo?, lateral?, inicio?, onAbrir?, rotulo? }]
export default function ListaCompacta({ itens = [], vazio = "Nada neste período.", rotulo }) {
  if (!itens.length) return <p className="perfil-vazio">{vazio}</p>;
  return (
    <ul className="perfil-lista" aria-label={rotulo}>
      {itens.map((item) => {
        const conteudo = (
          <>
            {item.inicio}
            <span className="perfil-lista-texto">
              <strong>{item.titulo}</strong>
              {item.subtitulo && <small>{item.subtitulo}</small>}
            </span>
            {item.lateral && <span className="perfil-lista-lateral">{item.lateral}</span>}
          </>
        );
        return (
          <li key={item.chave}>
            {item.onAbrir ? (
              <button type="button" className="perfil-lista-item" onClick={(e) => item.onAbrir(e.currentTarget)} aria-label={item.rotulo}>
                {conteudo}
              </button>
            ) : (
              <div className="perfil-lista-item">{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
