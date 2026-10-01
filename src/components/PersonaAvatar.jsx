import { useState } from "react";
import PersonaIcon from "./PersonaIcon";

// "Lucas Pereira" → "LP"
const iniciais = (nome = "") =>
  nome.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).filter((_, i, a) => i === 0 || i === a.length - 1)
    .join("").toUpperCase();

// Foto da pessoa; sem foto, as iniciais (quando `name` é informado) ou o ícone da persona
export default function PersonaAvatar({ role, photo, name, className = "directory-avatar" }) {
  const [failedPhoto, setFailedPhoto] = useState(null);
  const source = typeof photo === "string" ? photo.trim() : "";
  const texto = name ? iniciais(name) : "";
  return <span className={`${className} persona-avatar`} data-persona={role} aria-hidden="true">
    {source && source !== failedPhoto
      ? <img src={source} alt="" onError={() => setFailedPhoto(source)} />
      : texto ? <span className="persona-iniciais">{texto}</span> : <PersonaIcon role={role} size={24} />}
  </span>;
}
