import ManagerIcon from "./ManagerIcon";
import PersonaAvatar from "./PersonaAvatar";

export function DirectoryStats({ items }) {
  return <div className="directory-stats">{items.map(([label, value, icon = "people"]) =>
    <article className="directory-stat" key={label}>
      <span className="directory-stat-icon"><ManagerIcon name={icon} size={21} /></span>
      <div><p>{label}</p><strong>{value ?? "—"}</strong></div>
    </article>)}</div>;
}

export function PersonCell({ name = "Não informado", detail, role = "paciente", photo }) {
  return <div className="directory-person">
    <PersonaAvatar role={role} photo={photo} />
    <span><strong>{name}</strong>{detail && <small>{detail}</small>}</span>
  </div>;
}

export function TeamTable({ employees, onSelect }) {
  return <div className="mgr-table-wrap"><table>
    <thead><tr><th scope="col">Nome</th><th scope="col">Cargo</th><th scope="col">Turno</th><th scope="col">Matrícula</th>{onSelect && <th scope="col">Ações</th>}</tr></thead>
    <tbody>{employees.map(employee => <tr key={employee.id}>
      <td><PersonCell name={employee.name} detail={employee.email} role="funcionario" photo={employee.photo} /></td>
      <td>{employee.role || "—"}</td><td>{employee.shift || "—"}</td><td>{employee.matricula || "—"}</td>
      {onSelect && <td><button type="button" className="directory-row-action" aria-label={`Consultar ${employee.name}`} onClick={() => onSelect(employee)}>Consultar</button></td>}
    </tr>)}</tbody>
  </table></div>;
}
