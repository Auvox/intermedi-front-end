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

// onAbrir(funcionario, elemento): a linha inteira e "Consultar" abrem o perfil.
// onExcluir(funcionario): botão extra na coluna de ações.
export function TeamTable({ employees, onAbrir, onExcluir }) {
  const acoes = Boolean(onAbrir || onExcluir);
  return <div className="mgr-table-wrap"><table>
    <thead><tr><th scope="col">Nome</th><th scope="col">Cargo</th><th scope="col">Turno</th><th scope="col">Matrícula</th>{acoes && <th scope="col">Ações</th>}</tr></thead>
    <tbody>{employees.map(employee => <tr
      key={employee.id}
      {...(onAbrir ? propsLinha((el) => onAbrir(employee, el), `Abrir perfil de ${employee.name}`) : {})}
    >
      <td><PersonCell name={employee.name} detail={employee.email} role="funcionario" photo={employee.photo} /></td>
      <td>{employee.role || "—"}</td><td>{turno(employee.shift)}</td><td>{employee.matricula || "—"}</td>
      {acoes && <td><div className="remedio-acoes">
        {onAbrir && <button type="button" className="directory-row-action" aria-label={`Consultar ${employee.name}`} onClick={(e) => onAbrir(employee, e.currentTarget.closest("tr"))}>Consultar</button>}
        {onExcluir && <button type="button" className="directory-row-action remedio-acao-perigo" aria-label={`Excluir ${employee.name}`} onClick={() => onExcluir(employee)}>Excluir</button>}
      </div></td>}
    </tr>)}</tbody>
  </table></div>;
}
