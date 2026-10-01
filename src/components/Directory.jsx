import ManagerIcon from "./ManagerIcon";
import PersonaAvatar from "./PersonaAvatar";
import { propsLinha, turno } from "../services/perfil";

export function DirectoryStats({ items }) {
  return <div className="directory-stats">{items.map(([label, value, icon = "people"]) =>
    <article className="directory-stat" key={label}>
      <span className="directory-stat-icon"><ManagerIcon name={icon} size={21} /></span>
      <div><p>{label}</p><strong>{value ?? "—"}</strong></div>
    </article>)}</div>;
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
export function CartaoPessoa({ role, nome, foto, papel, linhas = [], selo, acoes, onAbrir }) {
  return (
    <article
      {...propsLinha((el) => onAbrir(el), `Abrir perfil de ${nome}`)}
      className={`perfil-linha cartao-pessoa cartao-pessoa-${role}`}
    >
      <div className="cartao-pessoa-faixa" aria-hidden="true" />
      {selo && <span className="cartao-pessoa-selo">{selo}</span>}
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
        <button type="button" className="cartao-pessoa-ver" onClick={(e) => onAbrir(e.currentTarget.closest("article"))}>
          Ver perfil <span aria-hidden="true">→</span>
        </button>
        {acoes}
      </footer>
    </article>
  );
}

// Grade de cartões (substitui as tabelas de pessoas)
export function GradePessoas({ children, rotulo }) {
  return <ul className="grade-pessoas" aria-label={rotulo}>{children}</ul>;
}

// Funcionários em cartões.
// onAbrir(funcionario, elemento): o cartão e "Ver perfil" abrem o perfil.
// onExcluir(funcionario): botão extra no rodapé.
export function TeamTable({ employees, onAbrir, onExcluir }) {
  return (
    <GradePessoas rotulo="Funcionários">
      {employees.map((employee) => (
        <li key={employee.id}>
          <CartaoPessoa
            role="funcionario"
            nome={employee.name}
            foto={employee.photo}
            papel={[employee.role, turno(employee.shift)].filter((v) => v && v !== "—").join(" · ")}
            linhas={[
              ["id", employee.matricula && `Matrícula ${employee.matricula}`],
              ["mail", employee.email],
              ["phone", employee.phone],
            ]}
            onAbrir={(el) => onAbrir?.(employee, el)}
            acoes={onExcluir && (
              <button
                type="button"
                className="cartao-pessoa-acao perigo"
                aria-label={`Excluir ${employee.name}`}
                onClick={() => onExcluir(employee)}
              >
                Excluir
              </button>
            )}
          />
        </li>
      ))}
    </GradePessoas>
  );
}
