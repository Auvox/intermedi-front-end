import { useState } from "react";
import PersonaIcon from "./PersonaIcon";

export default function PersonaAvatar({ role, photo, className = "directory-avatar" }) {
  const [failedPhoto, setFailedPhoto] = useState(null);
  const source = typeof photo === "string" ? photo.trim() : "";
  return <span className={`${className} persona-avatar`} data-persona={role} aria-hidden="true">
    {source && source !== failedPhoto
      ? <img src={source} alt="" onError={() => setFailedPhoto(source)} />
      : <PersonaIcon role={role} size={24} />}
  </span>;
}
