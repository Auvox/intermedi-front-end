// Skeletons das áreas internas. Cada um repete as medidas do conteúdo real
// (tabela, linhas de chamado, cartões de pessoa) para a troca não deslocar o
// layout. O texto de "carregando" continua disponível para leitores de tela.

function Rotulo({ children }) {
  return <span className="skel-sr">{children}</span>;
}

function Barra({ w = "100%", h, circle = false, soft = false, style }) {
  const tamanho = circle ? { width: w, height: w } : { width: w, height: h };
  return (
    <span
      aria-hidden="true"
      className={`skel-bar${circle ? " is-circle" : ""}${soft ? " is-soft" : ""}`}
      style={{ ...tamanho, ...style }}
    />
  );
}

// Tabela com cabeçalho e linhas no formato das tabelas do painel
// (primeira coluna com foto/avatar + duas linhas de texto).
export function SkeletonTabela({ rotulo = "Carregando…", linhas = 5, colunas = 5, foto = true }) {
  const larguras = ["70%", "55%", "45%", "60%", "40%", "50%"];
  return (
    <div className="mgr-table-wrap skel" role="status">
      <Rotulo>{rotulo}</Rotulo>
      <table className="skel-tabela" aria-hidden="true">
        <thead>
          <tr>
            {Array.from({ length: colunas }, (_, c) => (
              <th key={c}><Barra w={c === 0 ? 90 : 60} h={9} soft /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: linhas }, (_, l) => (
            <tr key={l}>
              <td>
                <div className="skel-celula">
                  {foto && <Barra w={44} h={44} style={{ borderRadius: 10, flexShrink: 0 }} />}
                  <div>
                    <Barra w={larguras[l % larguras.length]} h={12} />
                    <Barra w="40%" h={9} soft />
                  </div>
                </div>
              </td>
              {Array.from({ length: colunas - 1 }, (_, c) => (
                <td key={c}><Barra w={larguras[(l + c + 1) % larguras.length]} h={11} soft={c > 0} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Linhas de chamado/pedido: avatar, título, detalhe e ação à direita
export function SkeletonLinhas({ rotulo = "Carregando…", linhas = 3 }) {
  const larguras = ["68%", "52%", "60%", "45%"];
  return (
    <div className="skel" role="status">
      <Rotulo>{rotulo}</Rotulo>
      {Array.from({ length: linhas }, (_, i) => (
        <div className="skel-linha" key={i} aria-hidden="true">
          <Barra w={38} circle />
          <div>
            <Barra w={larguras[i % larguras.length]} h={12} />
            <Barra w="35%" h={9} soft />
          </div>
          <Barra w={64} h={22} soft style={{ borderRadius: 6 }} />
          <Barra w={92} h={12} />
        </div>
      ))}
    </div>
  );
}

// Grade de cartões de pessoa (mesma grade de .grade-pessoas)
export function SkeletonCartoes({ rotulo = "Carregando…", quantidade = 6 }) {
  return (
    <div className="skel" role="status">
      <Rotulo>{rotulo}</Rotulo>
      <ul className="grade-pessoas" aria-hidden="true">
        {Array.from({ length: quantidade }, (_, i) => (
          <li key={i}>
            <div className="skel-cartao">
              <div className="skel-cartao-faixa" />
              <div className="skel-cartao-corpo">
                <Barra w={68} circle />
                <Barra w="30%" h={9} soft />
                <Barra w={["70%", "58%", "64%"][i % 3]} h={15} />
                <Barra w="80%" h={10} soft />
                <Barra w="55%" h={10} soft />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Valor de métrica ainda sem resposta (ocupa a altura do número)
export function SkeletonValor() {
  return <span aria-hidden="true" className="skel-bar skel-valor" />;
}
