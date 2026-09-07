import "../../styles/keywordRibbon.css";

const keywords = [
  "Farmácias conectadas",
  "Medicamentos",
  "Gestão de estoque",
  "Fornecedores parceiros",
  "Pedidos simplificados",
  "Mais acesso à saúde",
];

export default function KeywordRibbon() {
  return (
    <div className="keyword-ribbon" role="region" aria-label="A Intermedi conecta">
      <div className="keyword-ribbon-window">
        <div className="keyword-ribbon-track">
          {[0, 1].map((copy) => (
            <ul className="keyword-ribbon-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {keywords.map((keyword) => (
                <li key={keyword}>
                  <span>{keyword}</span>
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M7 2h6v5h5v6h-5v5H7v-5H2V7h5Z" />
                  </svg>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
