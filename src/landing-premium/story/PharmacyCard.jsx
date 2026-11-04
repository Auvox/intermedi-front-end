import { Icone } from "../ui/Plataforma";

// Cartão de uma farmácia na narrativa. Os números e as barras começam no
// estado final (o que aparece sem animação); a timeline da rolagem recoloca
// os valores iniciais e os anima. Os data-story são os alvos da timeline.
// `versao` muda com o caso e com o modo (animado/estático): o número é
// recriado com o valor final, já que a timeline escreve nele direto.
export default function PharmacyCard({ papel, farmacia, remedio, escala, status, aviso, resolvido, versao, children }) {
  const p = papel === "solicitante" ? "sol" : "forn";
  return (
    <article className={`rms-card rms-card-${p}${status ? ` is-${status[0]}` : ""}`} data-story={`card-${p}`}>
      <p className="rms-card-papel">{papel === "solicitante" ? "Solicitante" : "Fornecedora"}</p>
      <h3 className="rms-card-nome"><Icone nome="pharmacy" tamanho={20} /><span>{farmacia.nome}</span></h3>
      <p className="rms-card-bairro">{farmacia.bairro} · São Paulo</p>
      <p className="rms-card-qtd">
        <strong key={versao} data-story={`num-${p}`}>{farmacia.final}</strong>
        <span>un. de {remedio}</span>
      </p>
      <span className="rms-barra" aria-hidden="true">
        <i data-story={`barra-${p}`} style={{ transform: `scaleX(${farmacia.final / escala})` }} />
        <b style={{ left: `${(farmacia.minimo / escala) * 100}%` }} />
      </span>
      <p className="rms-card-rodape">
        <span>mínimo {farmacia.minimo}</span>
        {status && (
          <span key={status[1]} className={`rms-status is-${status[0]}`}>
            <i aria-hidden="true">{status[0] === "ok" ? "✓" : status[0] === "critico" ? "!" : "•"}</i>
            {status[1]}
          </span>
        )}
      </p>
      {aviso && (
        <div className="rms-avisos">
          <p className="rms-aviso is-critico" data-story={`aviso-${p}`}>{aviso.critico}</p>
          <p className="rms-aviso is-ok" data-story={`aviso-ok-${p}`}>{aviso.ok}</p>
        </div>
      )}
      {children}
      <span className="rms-card-selo" data-story={`ok-${p}`} aria-hidden="true">✓ {resolvido}</span>
    </article>
  );
}
