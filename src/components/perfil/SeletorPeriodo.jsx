import { useId, useState } from "react";
import { PERIODOS, dataCurta } from "../../services/perfil";

// Chips 7 dias · 30 dias · 90 dias · 12 meses · Tudo + Personalizado (de/até).
// valor: { periodo: "30d" } ou { de, ate }; info: o `periodo` devolvido pela API.
export default function SeletorPeriodo({ valor, info, onChange }) {
  const uid = useId();
  const personalizado = Boolean(valor?.de);
  const [aberto, setAberto] = useState(personalizado);
  const [de, setDe] = useState(valor?.de ?? "");
  const [ate, setAte] = useState(valor?.ate ?? "");
  const [erro, setErro] = useState("");

  function aplicar(event) {
    event.preventDefault();
    if (!de) return setErro("Informe a data inicial.");
    if (ate && de > ate) return setErro("A data inicial deve ser anterior à final.");
    setErro("");
    onChange({ de, ...(ate && { ate }) });
  }

  return (
    <div className="perfil-periodo">
      <div className="perfil-chips" role="group" aria-label="Período">
        {PERIODOS.map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            aria-pressed={!personalizado && valor?.periodo === chave}
            onClick={() => { setAberto(false); onChange({ periodo: chave }); }}
          >
            {rotulo}
          </button>
        ))}
        <button type="button" aria-pressed={personalizado || aberto} aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          Personalizado
        </button>
      </div>
      {aberto && (
        <form className="perfil-periodo-datas" onSubmit={aplicar} noValidate>
          <label htmlFor={`${uid}-de`}>
            De
            <input id={`${uid}-de`} type="date" value={de} onChange={(e) => setDe(e.target.value)}
              aria-invalid={Boolean(erro)} aria-describedby={erro ? `${uid}-erro` : undefined} />
          </label>
          <label htmlFor={`${uid}-ate`}>
            Até
            <input id={`${uid}-ate`} type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </label>
          <button type="submit" className="mgr-secondary">Aplicar</button>
          {erro && <small className="chamado-field-error" id={`${uid}-erro`}>{erro}</small>}
        </form>
      )}
      {info && (
        <p className="perfil-periodo-info" aria-live="polite">
          <strong>{info.rotulo}</strong> · {dataCurta(info.de)} – {dataCurta(info.ate)}
        </p>
      )}
    </div>
  );
}
