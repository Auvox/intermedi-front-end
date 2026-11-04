/** Persona silhouettes based on the supplied role references. */
export default function PersonaIcon({ role, size = 32, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 72" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">
      <circle cx="20" cy="11" r="10" />
      {role === "admin" ? (
        <>
          <path d="M8 33a12 12 0 0 1 24 0v27a12 12 0 0 1-24 0V33Z" />
          <path d="M12 34a8 8 0 0 1 16 0v13H12V34Z" fill="#fff" />
          <path d="M7 13v10a7 7 0 0 0 7 7h2v-5h-2a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2h1V6h-1A7 7 0 0 0 7 13Zm25-7h-1v5h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2v5h2a7 7 0 0 0 7-7V13a7 7 0 0 0-7-7Z" transform="translate(-1 2) scale(.92)" />
          <path d="M29 18a9 9 0 0 1-18 0" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="20" cy="28" r="2" />
        </>
      ) : (
        <>
          <path fillRule="evenodd" d="M20 24A12 12 0 0 1 32 36v23a12 12 0 0 1-24 0V36a12 12 0 0 1 12-12Zm0 3a9 9 0 0 0-9 9v12h18V36a9 9 0 0 0-9-9Z" />
          {role === "gerente" && <path d="m18 27 1 4h2l1-4Zm1 5-1.5 13 2.5 2 2.5-2L21 32Z" />}
          {role === "paciente" && <path d="M18 32h4v3h3v4h-3v3h-4v-3h-3v-4h3Z" />}
          {role === "funcionario" && <path d="m12 29 8 7 8-7 2 3-8 7-2-2-2 2-8-7Zm11 12h5v2h-5Z" />}
        </>
      )}
    </svg>
  );
}
