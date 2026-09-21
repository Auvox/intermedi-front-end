import { useEffect, useState } from "react";

const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function FarmaciaSelect({ value, onChange }) {
  const [farmacias, setFarmacias] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const response = await fetch("http://localhost:3000/farmacia", { signal: controller.signal });
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

  const selecionada = farmacias.find((farmacia) => farmacia.idFarmacia === value?.idFarmacia);
  const opcoes = farmacias.filter((farmacia) =>
    farmacia === selecionada || normalizar(`${farmacia.nomeFarmacia} ${farmacia.cnesFarmacia} ${farmacia.cidadeFarmacia || ""}`)
      .includes(normalizar(busca.trim())),
  );

  return (
    <div>
      <label>
        Buscar farmácia
        <input type="search" value={busca} onChange={(event) => setBusca(event.target.value)}
          placeholder="Nome, CNES ou cidade" disabled={carregando || !!erro} />
      </label>
      <label>
        Farmácia do gerente
        <select name="fkIdFarmacia" required value={selecionada?.idFarmacia ?? ""}
          disabled={carregando || !!erro}
          onChange={(event) => onChange(farmacias.find((farmacia) => String(farmacia.idFarmacia) === event.target.value) || null)}>
          <option value="">{carregando ? "Carregando farmácias…" : "Selecione a farmácia"}</option>
          {opcoes.map((farmacia) => (
            <option key={farmacia.idFarmacia} value={farmacia.idFarmacia}>
              {farmacia.nomeFarmacia} · CNES {farmacia.cnesFarmacia}
            </option>
          ))}
        </select>
      </label>
      {erro && <p role="alert">{erro} <button type="button" onClick={() => setTentativa((atual) => atual + 1)}>Tentar novamente</button></p>}
      {!carregando && !erro && !farmacias.length && <p role="status">Cadastre uma farmácia antes de cadastrar o gerente.</p>}
      {!carregando && !erro && !!farmacias.length && !opcoes.length && <p role="status">Nenhuma farmácia encontrada para esta busca.</p>}
    </div>
  );
}
