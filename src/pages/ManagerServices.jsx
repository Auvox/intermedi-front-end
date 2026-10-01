import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DirectoryStats } from "../components/Directory";
import { ErroComRetry } from "../components/Chamados";
import { usePerfil } from "../components/perfil/perfilContext";
import { propsLinha } from "../services/perfil";
import useApiList from "../hooks/useApiList";
import { listarServicos, normalizeText } from "../services/api";
import { formatarDataChamado } from "../services/chamados";
import TicketServico from "../components/TicketServico";

const mostrar = (valor) => (valor === null || valor === undefined || valor === "" ? "Não informado" : valor);

// Serviços registrados pelos funcionários, com filtro por funcionário e busca.
// Por enquanto mostra todos os serviços da rede (sem filtro por farmácia).
export default function ManagerServices() {
  const { items: servicos, loading, error, reload } = useApiList(listarServicos);
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState("");
  const { abrirPerfil } = usePerfil();
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
            <div className="mgr-table-wrap cp-lista">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Comprovante</th>
                    <th scope="col">Paciente</th>
                    <th scope="col">Atendido por</th>
                    <th scope="col">Farmácia</th>
                    <th scope="col" className="cp-lista-num">Itens</th>
                    <th scope="col" className="cp-lista-num">Data e hora</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((s) => (
                    <tr key={s.idServico} {...propsLinha((el) => abrirPerfil("servico", s.idServico, el), `Abrir serviço nº ${s.idServico}`)}>
                      <td>
                        <TicketServico servico={s} onAbrir={(el) => abrirPerfil("servico", s.idServico, el)} />
                      </td>
                      <td>
                        <button type="button" className="perfil-link" onClick={(e) => abrirPerfil("paciente", s.idPaciente, e.currentTarget)}>
                          {mostrar(s.nomePaciente)}
                        </button>
                      </td>
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
                      <td className="cp-lista-num">
                            <strong className="cp-mono">{Number(s.quantidadeTotal || 0).toLocaleString("pt-BR")} un.</strong>
                            <small>{s.totalMedicamentos} {Number(s.totalMedicamentos) === 1 ? "remédio" : "remédios"}</small>
                          </td>
                      <td className="cp-lista-num cp-mono cp-lista-data">{formatarDataChamado(s.dataServico)}</td>
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

    </>
  );
}
