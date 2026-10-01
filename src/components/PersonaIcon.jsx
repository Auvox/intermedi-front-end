/** Persona silhouettes based on the supplied role references. */
export default function PersonaIcon({ role, size = 32, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 72" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">
      <circle cx="20" cy="11" r="10" />
      {role === "admin" ? (
        <>
          <path d="M10 29 18 44l1-12h2l1 12 8-15a17 17 0 0 1 2 8v22a12 12 0 0 1-24 0V37a17 17 0 0 1 2-8Z" />
          <path d="m20 25 3 2-1 4h-4l-1-4Z" />
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
