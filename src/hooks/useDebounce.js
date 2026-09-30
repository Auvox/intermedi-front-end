import { useEffect, useState } from "react";

// Devolve `valor` só depois de `atraso` ms sem mudanças (ex.: busca enquanto digita)
export default function useDebounce(valor, atraso = 300) {
  const [atual, setAtual] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setAtual(valor), atraso);
    return () => clearTimeout(timer);
  }, [valor, atraso]);
  return atual;
}
