import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import ManagerSidebar from '../components/ManagerSidebar';
import ManagerIcon from '../components/ManagerIcon';
import { initialData, unit } from './managerData';
import '../styles/manager.css';
import '../styles/managerRefresh.css';
import '../styles/employee.css';

// Visual preview only. Replace these fixtures with intermedi-back-end data
// when integrating authentication and server-side permissions.
const { patients, employees } = initialData;
const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const initials = (name) => name.split(' ').slice(0, 2).map((part) => part[0]).join('');

export default function Employee() {
  useEffect(() => {
    document.title = 'Área do funcionário | Intermedi';
    return () => { document.title = 'Intermedi'; };
  }, []);

  return (
    <div className="mgr-shell emp-shell">
      <ManagerSidebar employee unitName={unit} />
      <div className="mgr-workspace">
        <div className="mgr-topbar">
          <span><span className="mgr-topbar-unit-prefix">Área do funcionário</span> <span className="mgr-topbar-divider">/</span> <strong>{unit}</strong></span>
          <div className="mgr-account emp-account">
            <span className="mgr-account-avatar" aria-hidden="true">FL</span>
            <span className="mgr-account-person">
              <strong>Funcionário Local</strong>
              <small>Funcionário da unidade</small>
            </span>
            <Link className="mgr-text-button" to="/login?perfil=funcionario">Sair</Link>
          </div>
        </div>
        <main className="mgr-main">
          <Outlet />
        </main>
        <footer className="mgr-footer">Intermedi <span>Conectando farmácias. Aproximando o cuidado.</span></footer>
      </div>
    </div>
  );
}

function PageHeader({ title, description, count, label, icon }) {
  return <header className="mgr-page-head mgr-page-head-featured">
    <div><p className="mgr-eyebrow">ESPAÇO DO FUNCIONÁRIO</p><h1>{title}</h1><p>{description}</p></div>
    <div className="emp-summary"><ManagerIcon name={icon} size={25} /><strong>{count}</strong><span>{label}</span></div>
  </header>;
}

export function EmployeePatients() {
  const [search, setSearch] = useState('');
  const filtered = patients.filter((patient) => normalize(`${patient.name} ${patient.id}`).includes(normalize(search.trim())));
  return <>
    <PageHeader title="O cuidado começa com pessoas." description="Encontre os pacientes da sua unidade em um só lugar." count={patients.length} label="pacientes na unidade" icon="heart" />
    <section className="mgr-panel" aria-labelledby="emp-patients-title">
      <div className="mgr-toolbar"><h2 id="emp-patients-title">Pacientes <span className="mgr-badge">{patients.length}</span></h2><input type="search" aria-label="Buscar paciente por nome ou código" placeholder="Buscar nome ou código…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <div className="mgr-table-wrap"><table>
        <thead><tr><th scope="col">Paciente</th><th scope="col">Código</th><th scope="col">Unidade</th></tr></thead>
        <tbody>{filtered.map((patient) => <tr key={patient.id}><td><div className="emp-person"><span className="mgr-avatar" aria-hidden="true">{initials(patient.name)}</span><strong>{patient.name}</strong></div></td><td>{patient.id.toUpperCase()}</td><td>{unit}</td></tr>)}</tbody>
      </table></div>
      {!filtered.length && <p className="mgr-empty">Nenhum paciente encontrado. Tente outro nome ou código.</p>}
      <p className="mgr-table-note" role="status">{filtered.length} de {patients.length} pacientes · Somente consulta</p>
    </section>
  </>;
}

export function EmployeeTeam() {
  const [search, setSearch] = useState('');
  const filtered = employees.filter((employee) => normalize(`${employee.name} ${employee.role}`).includes(normalize(search.trim())));
  return <>
    <PageHeader title="Sua equipe, mais perto." description="Conheça os profissionais que compartilham o cuidado com você." count={employees.length} label="profissionais na unidade" icon="people" />
    <section className="mgr-panel" aria-labelledby="emp-team-title">
      <div className="mgr-toolbar"><h2 id="emp-team-title">Funcionários <span className="mgr-badge">{employees.length}</span></h2><input type="search" aria-label="Buscar funcionário por nome ou cargo" placeholder="Buscar nome ou cargo…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <div className="mgr-employee-grid">{filtered.map((employee) => <article className="mgr-employee-card emp-team-card" key={employee.id}>
        <span className="mgr-avatar" aria-hidden="true">{initials(employee.name)}</span><strong>{employee.name}</strong><span>{employee.role}</span><small>Turno: {employee.shift}</small><span className="emp-email">{employee.email}</span>
      </article>)}</div>
      {!filtered.length && <p className="mgr-empty">Nenhum funcionário encontrado. Tente outro nome ou cargo.</p>}
      <p className="mgr-table-note" role="status">{filtered.length} de {employees.length} funcionários · Somente consulta</p>
    </section>
  </>;
}
