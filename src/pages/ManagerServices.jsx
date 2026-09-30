import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DirectoryStats } from "../components/Directory";
import ManagerIcon from "../components/ManagerIcon";
import { ChamadoModal, ErroComRetry } from "../components/Chamados";
import useApiList from "../hooks/useApiList";
import { listarServicos, normalizeText } from "../services/api";
import { formatarDataChamado } from "../services/chamados";

const mostrar = (valor) => (valor === null || valor === undefined || valor === "" ? "Não informado" : valor);

// Serviços registrados pelos funcionários, com filtro por funcionário e busca.
// Por enquanto mostra todos os serviços da rede (sem filtro por farmácia).
export default function ManagerServices() {
  const { items: servicos, loading, error, reload } = useApiList(listarServicos);
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  // ?funcionario= permite abrir a tela já filtrada
  const funcionario = params.get("funcionario") || "";

  // A API devolve o nome do funcionário (não o id), então o filtro é pelo nome
  const funcionarios = [...new Set(servicos.map((s) => s.nomeFuncionario).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );
  const termo = normalizeText(busca.trim().replace(/^#/, ""));
  // Só número ("12" ou "#12") busca o serviço exato; texto busca nos demais campos
  const porNumero = /^\d+$/.test(termo);
  const filtrados = servicos.filter(
    (s) =>
      (!funcionario || s.nomeFuncionario === funcionario) &&
      (porNumero
        ? String(s.idServico) === termo
        : normalizeText(
            `${s.nomePaciente} ${s.nomeFuncionario} ${s.nomeFarmacia} ${s.observacao ?? ""}`,
          ).includes(termo)),
  );

  function filtrarFuncionario(nome) {
    const next = new URLSearchParams(params);
    if (nome) next.set("funcionario", nome);
    else next.delete("funcionario");
    setParams(next, { replace: true });
  }

  const carregado = !loading && !error;
  return (
    <>
      <header className="mgr-page-head">
        <div>
          <p className="mgr-eyebrow">GESTÃO DA UNIDADE</p>
          <h1>Serviços</h1>
          <p>Consulte os atendimentos registrados pelos funcionários.</p>
        </div>
      </header>

      <DirectoryStats
        items={[
          ["Serviços", carregado ? filtrados.length : null, "clipboard"],
          ["Pacientes atendidos", carregado ? new Set(filtrados.map((s) => s.idPaciente)).size : null, "heart"],
          [
            "Unidades entregues",
            carregado
              ? filtrados.reduce((soma, s) => soma + Number(s.quantidadeTotal || 0), 0).toLocaleString("pt-BR")
              : null,
            "pill",
          ],
        ]}
      />

      <section className="mgr-panel" aria-label="Lista de serviços">
        <div className="mgr-toolbar">
          <input
            type="search"
            aria-label="Buscar serviço"
            placeholder="Buscar nº do serviço, paciente, funcionário ou farmácia…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select
            aria-label="Filtrar por funcionário"
            value={funcionario}
            onChange={(e) => filtrarFuncionario(e.target.value)}
          >
            <option value="">Todos os funcionários</option>
            {funcionarios.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
            {funcionario && !funcionarios.includes(funcionario) && (
              <option value={funcionario}>{funcionario}</option>
            )}
          </select>
          <button type="button" className="mgr-secondary" disabled={loading} onClick={reload}>
            Atualizar
          </button>
        </div>

        {loading ? (
          <p className="mgr-empty" role="status">Carregando serviços…</p>
        ) : error ? (
          <ErroComRetry message={error} onRetry={reload} />
        ) : (
          <>
            <div className="mgr-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Serviço</th>
                    <th scope="col">Paciente</th>
                    <th scope="col">Funcionário</th>
                    <th scope="col">Farmácia</th>
                    <th scope="col">Medicamentos</th>
                    <th scope="col">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((s) => (
                    <tr key={s.idServico}>
                      <td>
                        <button
                          type="button"
                          className="emp-service-link"
                          aria-label={`Consultar serviço nº ${s.idServico}`}
                          onClick={() => setSelecionado(s)}
                        >
                          <span className="emp-service-icon"><ManagerIcon name="clipboard" size={19} /></span>
                          <span><strong>Serviço nº {s.idServico}</strong><small>Ver informações</small></span>
                        </button>
                      </td>
                      <td>{mostrar(s.nomePaciente)}</td>
                      <td>
                        <button
                          type="button"
                          className="mgr-text-button"
                          aria-label={`Filtrar serviços de ${s.nomeFuncionario}`}
                          onClick={() => filtrarFuncionario(s.nomeFuncionario)}
                        >
                          {mostrar(s.nomeFuncionario)}
                        </button>
                      </td>
                      <td>{mostrar(s.nomeFarmacia)}</td>
                      <td>
                        {s.totalMedicamentos} {Number(s.totalMedicamentos) === 1 ? "item" : "itens"}
                        <small>
                          {Number(s.quantidadeTotal || 0).toLocaleString("pt-BR")}{" "}
                          {Number(s.quantidadeTotal) === 1 ? "unidade" : "unidades"}
                        </small>
                      </td>
                      <td>{formatarDataChamado(s.dataServico)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtrados.length && (
              <p className="mgr-empty">
                {servicos.length
                  ? "Nenhum serviço encontrado para estes filtros."
                  : "Nenhum serviço registrado ainda."}
              </p>
            )}
            <p className="mgr-table-note" role="status">
              {filtrados.length} de {servicos.length} serviços
              {funcionario && (
                <>
                  {" "}· filtrando por {funcionario}{" "}
                  <button type="button" className="mgr-text-button" onClick={() => filtrarFuncionario("")}>
                    Limpar filtro
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </section>

      {selecionado && (
        <ChamadoModal title={`Serviço nº ${selecionado.idServico}`} onClose={() => setSelecionado(null)}>
          <dl className="chamado-dados">
            <div><dt>Data e hora</dt><dd>{formatarDataChamado(selecionado.dataServico)}</dd></div>
            <div><dt>Paciente</dt><dd>{mostrar(selecionado.nomePaciente)}</dd></div>
            <div><dt>Funcionário</dt><dd>{mostrar(selecionado.nomeFuncionario)}</dd></div>
            <div><dt>Farmácia</dt><dd>{mostrar(selecionado.nomeFarmacia)}</dd></div>
            <div><dt>Medicamentos</dt><dd>{selecionado.totalMedicamentos}</dd></div>
            <div><dt>Unidades</dt><dd>{Number(selecionado.quantidadeTotal || 0).toLocaleString("pt-BR")}</dd></div>
          </dl>
          <h3>Observação</h3>
          <p className="mgr-description">{mostrar(selecionado.observacao)}</p>
        </ChamadoModal>
      )}
    </>
  );
}
