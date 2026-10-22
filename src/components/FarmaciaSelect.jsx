import { useEffect, useId, useRef, useState } from "react";
import { API_URL } from "../services/api";

const normalizar = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const rotulo = (farmacia) => farmacia?.nomeFarmacia ?? "";

// Um campo só: digitar filtra as farmácias (nome, CNES ou cidade) e a lista
// logo abaixo escolhe a farmácia do gerente (combobox acessível).
export default function FarmaciaSelect({ value, onChange }) {
  const [farmacias, setFarmacias] = useState([]);
  const [busca, setBusca] = useState(rotulo(value));
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const lista = useRef(null);
  const id = useId();

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
  // com uma farmácia escolhida e o texto igual ao nome dela, a lista mostra todas
  const termo = selecionada && busca === rotulo(selecionada) ? "" : normalizar(busca.trim());
  const opcoes = farmacias.filter((farmacia) =>
    normalizar(`${farmacia.nomeFarmacia} ${farmacia.cnesFarmacia} ${farmacia.cidadeFarmacia || ""}`).includes(termo),
  );

  useEffect(() => {
    lista.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [ativa, aberta]);

  function escolher(farmacia) {
    onChange(farmacia);
    setBusca(rotulo(farmacia));
    setAberta(false);
  }

  function digitar(texto) {
    setBusca(texto);
    setAtiva(0);
    setAberta(true);
    if (selecionada && texto !== rotulo(selecionada)) onChange(null);
  }

  function teclar(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!aberta) return setAberta(true);
      const passo = event.key === "ArrowDown" ? 1 : -1;
      setAtiva((atual) => Math.min(Math.max(atual + passo, 0), Math.max(opcoes.length - 1, 0)));
    } else if (event.key === "Enter" && aberta && opcoes[ativa]) {
      event.preventDefault();
      escolher(opcoes[ativa]);
    } else if (event.key === "Escape" && aberta) {
      event.preventDefault();
      setAberta(false);
    }
  }

  const mostrarLista = aberta && !carregando && !erro && opcoes.length > 0;

  return (
    <div className="farmacia-combo">
      <label htmlFor={`${id}-campo`}>Farmácia do gerente</label>
      <div className="farmacia-combo-field">
        <input
          id={`${id}-campo`}
          type="text"
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={mostrarLista && opcoes[ativa] ? `${id}-${opcoes[ativa].idFarmacia}` : undefined}
          autoComplete="off"
          value={busca}
          onChange={(event) => digitar(event.target.value)}
          onFocus={() => setAberta(true)}
          onClick={() => setAberta(true)}
          onBlur={() => setAberta(false)}
          onKeyDown={teclar}
          placeholder={carregando ? "Carregando farmácias…" : "Busque por nome, CNES ou cidade"}
          disabled={carregando || !!erro}
        />
        {mostrarLista && (
          <ul className="farmacia-combo-list" id={`${id}-lista`} role="listbox" ref={lista}>
            {opcoes.map((farmacia, indice) => (
              <li
                key={farmacia.idFarmacia}
                id={`${id}-${farmacia.idFarmacia}`}
                role="option"
                aria-selected={indice === ativa}
                className={farmacia === selecionada ? "is-chosen" : undefined}
                // mousedown antes do blur do campo, senão a lista fecha antes do clique
                onMouseDown={(event) => { event.preventDefault(); escolher(farmacia); }}
                onMouseEnter={() => setAtiva(indice)}
              >
                <strong>{farmacia.nomeFarmacia}</strong>
                <span>CNES {farmacia.cnesFarmacia}{farmacia.cidadeFarmacia ? ` · ${farmacia.cidadeFarmacia}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {erro && <p role="alert">{erro} <button type="button" onClick={() => setTentativa((atual) => atual + 1)}>Tentar novamente</button></p>}
      {!carregando && !erro && !farmacias.length && <p role="status">Cadastre uma farmácia antes de cadastrar o gerente.</p>}
      {!carregando && !erro && !!farmacias.length && !opcoes.length && <p role="status">Nenhuma farmácia encontrada para esta busca.</p>}
    </div>
  );
}
