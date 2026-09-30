import { useCallback, useEffect, useRef, useState } from "react";

// Pré-visualização de um arquivo de imagem escolhido no <input type="file">.
// A URL é criada ao escolher e liberada ao trocar o arquivo ou ao sair da tela.
export default function useFotoPreview() {
  const [preview, setPreview] = useState(null);
  const atual = useRef(null);

  const definir = useCallback((arquivo) => {
    if (atual.current) URL.revokeObjectURL(atual.current);
    atual.current = arquivo ? URL.createObjectURL(arquivo) : null;
    setPreview(atual.current);
  }, []);

  useEffect(() => () => {
    if (atual.current) URL.revokeObjectURL(atual.current);
    atual.current = null;
  }, []);

  return [preview, definir];
}
