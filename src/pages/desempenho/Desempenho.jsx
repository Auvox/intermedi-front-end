import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import ManagerIcon from "../../components/ManagerIcon";
import LoginAdmin from "../../components/desempenho/LoginAdmin";
import useApiList from "../../hooks/useApiList";
import { useTokenAdmin } from "../../hooks/useAlertas";
import useFiltrosDesempenho from "../../hooks/useFiltrosDesempenho";
import { listarFarmacias } from "../../services/api";
import { sairDoDesempenho } from "../../services/desempenho";
import "../../styles/desempenho.css";

const SUB_ABAS = [
  ["", "Visão geral"],
  ["/mapa-de-calor", "Mapa de calor"],
  ["/rotas", "Rotas e telas"],
  ["/saude", "Saúde do sistema"],
];

// Aba "Desempenho" do admin: filtros globais (na URL), as 4 sub-abas e o
// aviso fixo enquanto houver alerta crítico ativo.
export default function Desempenho() {
  const { alertas } = useOutletContext();
  const token = useTokenAdmin();
  const filtros = useFiltrosDesempenho();
  const { items: farmacias } = useApiList(listarFarmacias);
  const criticos = alertas?.criticos ?? [];

  return (
    <div className="adm-dsp">
      <header className="mgr-page-head">
        <div>
          <h1>Desempenho</h1>
          <p>Como o sistema está sendo usado e se tudo está funcionando.</p>
        </div>
        {token && (
          <button type="button" className="mgr-secondary" onClick={sairDoDesempenho} data-track="desempenho-sair">
            Sair do desempenho
          </button>
        )}
      </header>

      {!token ? (
        <LoginAdmin />
      ) : (
        <>
          {criticos.length > 0 && (
            <div className="adm-dsp-banner" role="alert">
              <span aria-hidden="true"><ManagerIcon name="alert" size={20} /></span>
              <div>
                <strong>
                  {criticos.length === 1 ? criticos[0].titulo : `${criticos.length} problemas críticos precisam de atenção`}
                </strong>
                <p>{criticos.length === 1 ? criticos[0].oQue : criticos.map((a) => a.titulo).join(" · ")}</p>
              </div>
              <NavLink to={filtros.linkPara("/saude")} data-track="banner-ver-alertas">Ver o que fazer</NavLink>
            </div>
          )}

          <div className="adm-dsp-filtros" role="group" aria-label="Filtros (valem para todas as sub-abas)">
            <label>
              <span>Período</span>
              <select value={filtros.periodo} onChange={(e) => filtros.definir({ periodo: e.target.value })} data-track="filtro-periodo">
                <option value="hoje">Hoje</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>
            {filtros.periodo === "personalizado" && (
              <>
                <label>
                  <span>De</span>
                  <input type="date" value={filtros.inicio} max={filtros.fim || filtros.hoje} onChange={(e) => filtros.definir({ inicio: e.target.value })} />
                </label>
                <label>
                  <span>Até</span>
                  <input type="date" value={filtros.fim} min={filtros.inicio} max={filtros.hoje} onChange={(e) => filtros.definir({ fim: e.target.value })} />
                </label>
              </>
            )}
            <label>
              <span>Plataforma</span>
              <select value={filtros.plataforma} onChange={(e) => filtros.definir({ plataforma: e.target.value === "todas" ? null : e.target.value })} data-track="filtro-plataforma">
                <option value="todas">Todas</option>
                <option value="app">App do paciente</option>
                <option value="web">Web (funcionário e gerente)</option>
              </select>
            </label>
            <label>
              <span>Farmácia</span>
              <select value={filtros.farmacia} onChange={(e) => filtros.definir({ farmacia: e.target.value === "todas" ? null : e.target.value })} data-track="filtro-farmacia">
                <option value="todas">Todas as farmácias</option>
                {farmacias.map((f) => (
                  <option key={f.idFarmacia} value={f.idFarmacia}>{f.nomeFarmacia}</option>
                ))}
              </select>
            </label>
          </div>

          <nav className="adm-dsp-abas" aria-label="Sub-abas do desempenho">
            {SUB_ABAS.map(([caminho, rotulo]) => (
              <NavLink key={caminho} end={!caminho} to={`/admin/desempenho${caminho}${filtros.queryFiltros}`} data-track={`aba-desempenho${caminho.replace("/", ":") || ":visao-geral"}`}>
                {rotulo}
              </NavLink>
            ))}
          </nav>

          {!filtros.pronto ? (
            <p className="mgr-empty">Escolha as duas datas do período personalizado.</p>
          ) : (
            <Outlet context={{ filtros, alertas, farmacias }} />
          )}
        </>
      )}
    </div>
  );
}
