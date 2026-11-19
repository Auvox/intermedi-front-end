import { useEffect, useSyncExternalStore } from "react";
import { assinarCarregamento, carregandoAgora, inicioSuspensao } from "../services/carregamento";
import "../styles/carregamento.css";

// O ícone da Intermedi (o "i" em forma de pílula) parado no centro, com um
// anel de processamento girando em volta.
export function PilulaCarregando({ tamanho = 96 }) {
  return (
    <span className="carregando-icone" style={{ width: tamanho, height: tamanho }} role="img" aria-label="Carregando">
      <svg className="carregando-anel" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="carregando-anel-trilho" cx="50" cy="50" r="45" />
        <circle className="carregando-anel-giro" cx="50" cy="50" r="45" pathLength="100" />
      </svg>
      <svg className="carregando-pilula" viewBox="0 0 40 64" aria-hidden="true">
        <defs>
          <clipPath id="carregando-metade">
            <rect x="0" y="38" width="40" height="30" />
          </clipPath>
        </defs>
        <circle cx="20" cy="8" r="6" fill="#087f45" />
        <rect x="8" y="19" width="24" height="42" rx="12" fill="none" stroke="#087f45" strokeWidth="4" />
        <rect x="8" y="19" width="24" height="42" rx="12" fill="#087f45" clipPath="url(#carregando-metade)" />
      </svg>
    </span>
  );
}

// Camada global: a tela continua aparecendo, só que borrada, e o ícone no centro
export default function TelaCarregando() {
  const ativo = useSyncExternalStore(assinarCarregamento, carregandoAgora, () => false);
  return (
    <div className={`carregando-tela${ativo ? " is-ativo" : ""}`} aria-hidden={!ativo}>
      <span className="sr-only" role="status" aria-live="polite">{ativo ? "Carregando" : ""}</span>
      {ativo && <PilulaCarregando />}
    </div>
  );
}

// Fallback do Suspense: avisa a camada global enquanto a tela é baixada
export function CarregandoTela() {
  useEffect(() => inicioSuspensao(), []);
  return null;
}
