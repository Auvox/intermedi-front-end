import { useEffect, useId, useState } from "react";
import { API_URL } from "../services/api";

const normalizar = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Um campo só: digita o nome (ou CNES/cidade), a lista filtra e a pessoa clica na farmácia.
export default function FarmaciaSelect({ value, onChange }) {
  const [farmacias, setFarmacias] = useState([]);
  const [busca, setBusca] = useState(value?.nomeFarmacia ?? "");
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const idLista = useId();

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

  const selecionada = farmacias.find((farmacia) => farmacia.idFarmacia === value?.idFarmacia);
  const termo = normalizar(busca.trim());
  // com uma farmácia escolhida, o texto é o nome dela: mostra a lista inteira de novo
  const opcoes = selecionada ? farmacias : farmacias.filter((farmacia) =>
    normalizar(`${farmacia.nomeFarmacia} ${farmacia.cnesFarmacia} ${farmacia.cidadeFarmacia || ""}`).includes(termo),
  );
  const listaVisivel = aberta && !carregando && !erro && opcoes.length > 0;

  function escolher(farmacia) {
    onChange(farmacia);
    setBusca(farmacia.nomeFarmacia);
    setAberta(false);
  }

  function digitar(texto) {
    setBusca(texto);
    setAtiva(0);
    setAberta(true);
    if (value) onChange(null);
  }

  function teclar(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!aberta) return setAberta(true);
      if (!opcoes.length) return;
      const passo = event.key === "ArrowDown" ? 1 : -1;
      setAtiva((atual) => (atual + passo + opcoes.length) % opcoes.length);
    } else if (event.key === "Enter" && listaVisivel) {
      event.preventDefault();
      escolher(opcoes[Math.min(ativa, opcoes.length - 1)]);
    } else if (event.key === "Escape" && aberta) {
      // fecha só a lista, não o modal
      event.preventDefault();
      event.stopPropagation();
      setAberta(false);
    }
  }

  return (
    <div className="farmacia-busca">
      <label>
        Farmácia do gerente
        <input
          type="text"
          role="combobox"
          aria-expanded={listaVisivel}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={listaVisivel ? `${idLista}-${ativa}` : undefined}
          autoComplete="off"
          value={busca}
          onChange={(event) => digitar(event.target.value)}
          onFocus={() => setAberta(true)}
          onClick={() => setAberta(true)}
          onBlur={() => setAberta(false)}
          onKeyDown={teclar}
          placeholder={carregando ? "Carregando farmácias…" : "Pesquise pelo nome, CNES ou cidade"}
          disabled={carregando || !!erro}
        />
      </label>
      {listaVisivel && (
        <ul className="farmacia-busca-lista" id={idLista} role="listbox" aria-label="Farmácias">
          {opcoes.map((farmacia, indice) => (
            <li
              key={farmacia.idFarmacia}
              id={`${idLista}-${indice}`}
              role="option"
              aria-selected={farmacia === selecionada}
              className={indice === ativa ? "is-ativa" : undefined}
              // mousedown, não click: o blur do campo fecharia a lista antes do clique
              onMouseDown={(event) => {
                event.preventDefault();
                escolher(farmacia);
              }}
              onMouseEnter={() => setAtiva(indice)}
            >
              <strong>{farmacia.nomeFarmacia}</strong>
              <span>
                CNES {farmacia.cnesFarmacia}
                {farmacia.cidadeFarmacia ? ` · ${farmacia.cidadeFarmacia}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {erro && <p role="alert">{erro} <button type="button" onClick={() => setTentativa((atual) => atual + 1)}>Tentar novamente</button></p>}
      {!carregando && !erro && !farmacias.length && <p role="status">Cadastre uma farmácia antes de cadastrar o gerente.</p>}
      {!carregando && !erro && !!farmacias.length && !opcoes.length && <p role="status">Nenhuma farmácia encontrada para esta busca.</p>}
      {!aberta && !selecionada && busca.trim() && !!opcoes.length && (
        <p role="status">Escolha uma farmácia da lista.</p>
      )}
    </div>
  );
}
