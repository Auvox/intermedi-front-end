import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

// A farmácia em uso na área do gerente/funcionário foi desativada pelo admin?
// Confere ao abrir e a cada 60 s: quem já estava dentro também vê o aviso.
export default function useFarmaciaAtiva(idFarmacia) {
  const [situacao, setSituacao] = useState({ desativada: false, nome: "" });

  useEffect(() => {
    if (!idFarmacia) return undefined;
    let ativo = true;
    const conferir = () =>
      apiRequest(`/farmacia/${encodeURIComponent(idFarmacia)}`)
        .then(({ resultado }) => {
          if (ativo && resultado) setSituacao({ desativada: resultado.ativo === 0, nome: resultado.nomeFarmacia ?? "" });
        })
        .catch(() => {});
    conferir();
    const timer = setInterval(conferir, 60_000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [idFarmacia]);

  return situacao;
}
