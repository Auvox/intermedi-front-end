import { useEffect, useId, useRef, useState } from "react";

const normalizar = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Um campo só que busca e escolhe: digitar filtra os itens e a lista logo
// abaixo escolhe um (combobox acessível). Usado na farmácia do gerente e no
// paciente do serviço.
//   itens        lista completa
//   valorId      id do item escolhido (ou vazio)
//   onChange     recebe o item escolhido, ou null quando o texto muda
//   getId        id de cada item
//   rotulo       texto que fica no campo depois de escolher
//   detalhe      linha menor embaixo do nome, na lista (opcional)
//   textoBusca   em que texto a busca procura (padrão: rotulo + detalhe)
export default function BuscaSelect({
  label,
  itens,
  valorId,
  onChange,
  getId,
  rotulo,
  detalhe,
  textoBusca,
  placeholder,
  disabled = false,
  inputRef,
  invalido = false,
  describedBy,
  semResultado = "Nenhum resultado para esta busca.",
  children,
}) {
  const selecionado = itens.find((item) => String(getId(item)) === String(valorId ?? ""));
  const [busca, setBusca] = useState(selecionado ? rotulo(selecionado) : "");
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(0);
  const lista = useRef(null);
  const id = useId();

  // com um item escolhido e o texto igual ao nome dele, a lista mostra todos
  const termo = selecionado && busca === rotulo(selecionado) ? "" : normalizar(busca.trim());
  const opcoes = itens.filter((item) =>
    normalizar(textoBusca ? textoBusca(item) : `${rotulo(item)} ${detalhe?.(item) ?? ""}`).includes(termo),
  );

  useEffect(() => {
    lista.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [ativa, aberta]);

  function escolher(item) {
    onChange(item);
    setBusca(rotulo(item));
    setAberta(false);
  }

  function digitar(texto) {
    setBusca(texto);
    setAtiva(0);
    setAberta(true);
    if (selecionado && texto !== rotulo(selecionado)) onChange(null);
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

  const mostrarLista = aberta && !disabled && opcoes.length > 0;
  const nadaEncontrado = aberta && !disabled && itens.length > 0 && !opcoes.length;
  const idOpcao = (item) => `${id}-op-${getId(item)}`;

  return (
    <div className="busca-select">
      <label htmlFor={`${id}-campo`}>{label}</label>
      <div className="busca-select-field">
        <input
          id={`${id}-campo`}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={mostrarLista && opcoes[ativa] ? idOpcao(opcoes[ativa]) : undefined}
          aria-invalid={invalido || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          value={busca}
          onChange={(event) => digitar(event.target.value)}
          onFocus={() => setAberta(true)}
          onClick={() => setAberta(true)}
          onBlur={() => setAberta(false)}
          onKeyDown={teclar}
          placeholder={placeholder}
          disabled={disabled}
        />
        {mostrarLista && (
          <ul className="busca-select-list" id={`${id}-lista`} role="listbox" ref={lista}>
            {opcoes.map((item, indice) => (
              <li
                key={getId(item)}
                id={idOpcao(item)}
                role="option"
                aria-selected={indice === ativa}
                className={item === selecionado ? "is-chosen" : undefined}
                // mousedown antes do blur do campo, senão a lista fecha antes do clique
                onMouseDown={(event) => { event.preventDefault(); escolher(item); }}
                onMouseEnter={() => setAtiva(indice)}
              >
                <strong>{rotulo(item)}</strong>
                {detalhe && <span>{detalhe(item)}</span>}
              </li>
            ))}
          </ul>
        )}
        {nadaEncontrado && <p className="busca-select-list busca-select-empty" role="status">{semResultado}</p>}
      </div>
      {children}
    </div>
  );
}
