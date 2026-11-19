import { useState } from "react";
import { Link } from "react-router-dom";
import ManagerIcon from "./ManagerIcon";
import PersonaAvatar from "./PersonaAvatar";
import NumeroAnimado from "./NumeroAnimado";
import { SkeletonValor } from "./Skeleton";
import { propsLinha, turno } from "../services/perfil";
import { paraIdentificador } from "../services/rastreioCliques";

// items: [rótulo, valor, ícone, contexto?, carregando?, link?] — o contexto explica
// de onde vem o número; com link, o card inteiro leva à tela daquele número
export function DirectoryStats({ items }) {
  return <div className="directory-stats">{items.map(([label, value, icon = "people", hint, loading = false, to]) => {
    const conteudo = <>
      <span className="directory-stat-icon"><ManagerIcon name={icon} size={18} /></span>
      <div>
        <p>{label}</p>
        <strong>{loading ? <SkeletonValor /> : <NumeroAnimado valor={value ?? "—"} />}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </>;
    return to
      ? <Link className="directory-stat is-link" key={label} to={to} aria-busy={loading || undefined} data-track={`card:${paraIdentificador(label)}`}>{conteudo}</Link>
      : <article className="directory-stat" key={label} aria-busy={loading || undefined}>{conteudo}</article>;
  })}</div>;
}

export function PersonCell({ name = "Não informado", detail, role = "paciente", photo }) {
  return <div className="directory-person">
    <PersonaAvatar role={role} photo={photo} name={name} />
    <span><strong>{name}</strong>{detail && <small>{detail}</small>}</span>
  </div>;
}

const ROTULO_PAPEL = { paciente: "Paciente", funcionario: "Funcionário", gerente: "Gerente" };

// Cartão de pessoa no formato do perfil dela: faixa colorida, avatar sobre a
// faixa, nome, papel e dados de contato. O cartão inteiro abre o perfil.
// linhas: [[ícone, texto]] · selo: status no canto · acoes: botões extras no rodapé
// desativado: cartão em cinza com o selo "Desativado" (o cadastro continua no banco).
// Clicar num desativado avisa que ele está desativado (ou chama onAbrirDesativado).
export function CartaoPessoa({ role, nome, foto, papel, linhas = [], selo, acoes, onAbrir, desativado = false, onAbrirDesativado }) {
  const [aviso, setAviso] = useState(false);
  const abrir = !desativado ? onAbrir : onAbrirDesativado ?? (() => setAviso(true));
  return (
    <article
      {...propsLinha((el) => abrir(el), desativado ? `${nome} (desativado)` : `Abrir perfil de ${nome}`)}
      className={`perfil-linha cartao-pessoa cartao-pessoa-${role}${desativado ? " is-desativado" : ""}`}
    >
      <div className="cartao-pessoa-faixa" aria-hidden="true" />
      {(selo || desativado) && <span className="cartao-pessoa-selo">{desativado ? <span className="selo-desativado">Desativado</span> : selo}</span>}
      <div className="cartao-pessoa-corpo">
        <PersonaAvatar className="cartao-pessoa-avatar" role={role} photo={foto} name={nome} />
        <p className="cartao-pessoa-papel">{papel || ROTULO_PAPEL[role]}</p>
        <h3>{nome}</h3>
        {linhas.filter((l) => l && l[1]).length > 0 && (
          <ul className="cartao-pessoa-linhas">
            {linhas.filter((l) => l && l[1]).map(([icone, texto]) => (
              <li key={`${icone}-${texto}`}><ManagerIcon name={icone} size={14} /><span>{texto}</span></li>
            ))}
          </ul>
        )}
      </div>
      <footer className="cartao-pessoa-rodape">
        <button type="button" className="cartao-pessoa-ver" onClick={(e) => abrir(e.currentTarget.closest("article"))}>
          {desativado ? "Ver situação" : "Ver perfil"} <span aria-hidden="true">→</span>
        </button>
        {acoes}
      </footer>
      {aviso && (
        <p className="cartao-pessoa-aviso" role="alert" data-sem-perfil onClick={(e) => { e.stopPropagation(); setAviso(false); }}>
          Este cadastro está desativado e não tem acesso à plataforma. <u>Ok</u>
        </p>
      )}
    </article>
  );
}

// Grade de cartões (substitui as tabelas de pessoas)
export function GradePessoas({ children, rotulo }) {
  return <ul className="grade-pessoas" aria-label={rotulo}>{children}</ul>;
}

// Funcionários em cartões.
// onAbrir(funcionario, elemento): o cartão e "Ver perfil" abrem o perfil.
// onExcluir(funcionario): desativa (botão extra no rodapé).
// onReativar(funcionario): aparece no lugar de "Desativar" quando já está desativado.
export function TeamTable({ employees, onAbrir, onExcluir, onReativar }) {
  return (
    <GradePessoas rotulo="Funcionários">
      {employees.map((employee) => {
        const desativado = employee.ativo === false;
        return (
          <li key={employee.id}>
            <CartaoPessoa
              role="funcionario"
              nome={employee.name}
              foto={employee.photo}
              desativado={desativado}
              papel={[employee.role, turno(employee.shift)].filter((v) => v && v !== "—").join(" · ")}
              linhas={[
                ["id", employee.matricula && `Matrícula ${employee.matricula}`],
                ["mail", employee.email],
                ["phone", employee.phone],
              ]}
              onAbrir={(el) => onAbrir?.(employee, el)}
              onAbrirDesativado={(el) => onAbrir?.(employee, el)}
              acoes={desativado ? onReativar && (
                <button type="button" className="cartao-pessoa-acao" aria-label={`Reativar ${employee.name}`} onClick={() => onReativar(employee)}>
                  Reativar
                </button>
              ) : onExcluir && (
                <button
                  type="button"
                  className="cartao-pessoa-acao perigo"
                  aria-label={`Desativar ${employee.name}`}
                  onClick={() => onExcluir(employee)}
                >
                  Desativar
                </button>
              )}
            />
          </li>
        );
      })}
    </GradePessoas>
  );
}
