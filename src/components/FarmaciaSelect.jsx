import { useEffect, useState } from "react";
import { API_URL } from "../services/api";
import BuscaSelect from "./BuscaSelect";

// Farmácia do gerente: um campo que filtra por nome, CNES ou cidade
export default function FarmaciaSelect({ value, onChange }) {
  const [farmacias, setFarmacias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const response = await fetch(`${API_URL}/farmacia`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível carregar as farmácias.");
        const lista = Array.isArray(result) ? result : result.farmacia;
        if (!Array.isArray(lista)) throw new Error("Resposta inválida ao carregar as farmácias.");
        if (!controller.signal.aborted) setFarmacias(lista);
      } catch (error) {
        if (!controller.signal.aborted) setErro(error.message);
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }
    carregar();
    return () => controller.abort();
  }, [tentativa]);

  return (
    <BuscaSelect
      label="Farmácia do gerente"
      itens={farmacias}
      valorId={value?.idFarmacia}
      onChange={onChange}
      getId={(farmacia) => farmacia.idFarmacia}
      rotulo={(farmacia) => farmacia.nomeFarmacia}
      detalhe={(farmacia) => `CNES ${farmacia.cnesFarmacia}${farmacia.cidadeFarmacia ? ` · ${farmacia.cidadeFarmacia}` : ""}`}
      placeholder={carregando ? "Carregando farmácias…" : "Busque por nome, CNES ou cidade"}
      disabled={carregando || !!erro}
      semResultado="Nenhuma farmácia encontrada para esta busca."
    >
      {erro && <p role="alert">{erro} <button type="button" onClick={() => setTentativa((atual) => atual + 1)}>Tentar novamente</button></p>}
      {!carregando && !erro && !farmacias.length && <p role="status">Cadastre uma farmácia antes de cadastrar o gerente.</p>}
    </BuscaSelect>
  );
}
