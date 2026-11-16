// Barra de "programa ao vivo": o ponto de agora fica na ponta direita; dá para
// voltar no tempo (arrastando, pulando 15 min / 1 h ou de envio em envio),
// tocar a partir dali numa velocidade e voltar ao vivo.

const MINUTO = 60 * 1000;
const VELOCIDADES = [
  [1, "1×"],
  [60, "1 min/s"],
  [600, "10 min/s"],
  [3600, "1 h/s"],
];

const horario = (t) =>
  new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function tempoAtras(diferenca) {
  const minutos = Math.round(diferenca / MINUTO);
  if (minutos < 1) return "agora há pouco";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h${minutos % 60 ? ` ${minutos % 60} min` : ""}`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}${horas % 24 ? ` ${horas % 24} h` : ""}`;
}

function Icone({ nome }) {
  const caminhos = {
    play: <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />,
    pausa: <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none" />,
    anterior: <path d="M18 6 9 12l9 6V6ZM6 6v12" />,
    proximo: <path d="m6 6 9 6-9 6V6Zm12 0v12" />,
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {caminhos[nome]}
    </svg>
  );
}

export default function LinhaDoTempo({
  inicio,
  agora,
  t,
  aoVivo,
  tocando,
  velocidade,
  marcas,
  onT,
  onAoVivo,
  onTocar,
  onVelocidade,
  onPular,
}) {
  const total = Math.max(agora - inicio, 1);
  const posicao = (em) => `${((em - inicio) / total) * 100}%`;

  return (
    <div className={`sim-tempo${aoVivo ? " is-ao-vivo" : ""}`}>
      <div className="sim-tempo-topo">
        <button
          type="button"
          className="sim-ao-vivo"
          onClick={onAoVivo}
          aria-pressed={aoVivo}
          data-track="simulacao-ao-vivo"
        >
          <i aria-hidden="true" />
          {aoVivo ? "Ao vivo" : "Voltar ao vivo"}
        </button>
        <div className="sim-tempo-controles" role="group" aria-label="Voltar no tempo">
          <button type="button" onClick={() => onPular("anterior")} title="Envio anterior" aria-label="Ir para o envio anterior">
            <Icone nome="anterior" />
          </button>
          <button type="button" onClick={() => onT(t - 60 * MINUTO)}>−1 h</button>
          <button type="button" onClick={() => onT(t - 15 * MINUTO)}>−15 min</button>
          <button
            type="button"
            className="sim-tocar"
            onClick={() => onTocar(!tocando)}
            disabled={aoVivo}
            aria-label={tocando ? "Pausar" : "Tocar a partir daqui"}
            title={tocando ? "Pausar" : "Tocar a partir daqui"}
          >
            <Icone nome={tocando ? "pausa" : "play"} />
          </button>
          <button type="button" onClick={() => onPular("proximo")} title="Próximo envio" aria-label="Ir para o próximo envio">
            <Icone nome="proximo" />
          </button>
        </div>
        <label className="sim-velocidade">
          <span>Velocidade</span>
          <select value={velocidade} onChange={(e) => onVelocidade(Number(e.target.value))}>
            {VELOCIDADES.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
        </label>
        <p className="sim-tempo-quando" aria-live="polite">
          {aoVivo ? (
            <><strong>Agora</strong> · {horario(agora)}</>
          ) : (
            <><strong>{tempoAtras(agora - t)}</strong> · {horario(t)}</>
          )}
        </p>
      </div>

      <div className="sim-trilha">
        <div className="sim-trilha-marcas" aria-hidden="true">
          {marcas.map((m) => (
            <i key={`${m.pedido.idPedido}-${m.tipo}`} className={`is-${m.tipo}`} style={{ left: posicao(m.em) }} />
          ))}
        </div>
        <div className="sim-trilha-feito" style={{ width: posicao(t) }} aria-hidden="true" />
        <input
          type="range"
          min={inicio}
          max={agora}
          step={MINUTO}
          value={Math.min(Math.max(t, inicio), agora)}
          onChange={(e) => onT(Number(e.target.value))}
          aria-label="Momento mostrado no mapa"
          aria-valuetext={aoVivo ? "Ao vivo" : horario(t)}
        />
      </div>
      <div className="sim-trilha-legenda" aria-hidden="true">
        <span>{horario(inicio)}</span>
        <span><i className="is-envio" /> envio <i className="is-chegada" /> chegada</span>
        <span>agora</span>
      </div>
    </div>
  );
}
