import { usePerfil } from "./perfilContext";
import { EstadoPerfil } from "./Blocos";
import ManagerIcon from "../ManagerIcon";
import { useFocoTitulo, usePerfilDados } from "../../hooks/useResumo";
import { useEnderecosFarmacias } from "../../hooks/useRastreio";
import { formatarDataChamado } from "../../services/chamados";
import { numeroDoServico } from "../../services/relatorio";
import { mascararCpf, numero, turno } from "../../services/perfil";
import { tarja } from "../../services/remedios";

// Código de barras ilustrativo a partir do número do serviço (não é um código válido)
function CodigoDeBarras({ texto }) {
  const barras = [...texto].flatMap((ch, i) => {
    const n = ch.charCodeAt(0) + i;
    return [1 + (n % 3), 1 + ((n >> 2) % 2), 1 + ((n >> 1) % 3), 1 + (n % 2)];
  });
  let x = 0;
  const rects = barras.map((largura, i) => {
    const r = i % 2 === 0 ? <rect key={i} x={x} y="0" width={largura} height="38" /> : null;
    x += largura;
    return r;
  });
  return (
    <svg className="cp-barras" viewBox={`0 0 ${x} 38`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {rects}
    </svg>
  );
}

// GET /servicos/:id — comprovante de atendimento (funcionário, gerente e admin)
export default function ComprovanteServico({ id }) {
  const estado = usePerfilDados("servico", id, (s) => numeroDoServico(s));
  return (
    <EstadoPerfil estado={estado}>
      {estado.data && <Comprovante s={estado.data} />}
    </EstadoPerfil>
  );
}

function Comprovante({ s }) {
  const { abrirPerfil } = usePerfil();
  const titulo = useFocoTitulo();
  const enderecos = useEnderecosFarmacias();
  const local = enderecos[String(s.idFarmacia)] ?? {};
  const numeroServico = numeroDoServico(s);
  const remedios = s.remedios ?? [];
  const receita = remedios.filter((r) => r.tarjaRemedio && r.tarjaRemedio !== "sem_tarja");
  const link = (tipo, idAlvo, texto) => (idAlvo
    ? <button type="button" className="cp-link" onClick={(e) => abrirPerfil(tipo, idAlvo, e.currentTarget)}>{texto}</button>
    : texto || "—");

  return (
    <div className="cp-area">
      <div className="cp-acoes">
        <span className="cp-ok"><ManagerIcon name="check" size={18} />Atendimento concluído</span>
        <button type="button" className="cp-imprimir" onClick={() => window.print()}>
          <ManagerIcon name="print" size={16} />
          Imprimir comprovante
        </button>
      </div>

      <article className="cp-papel" aria-labelledby="cp-titulo">
        <header className="cp-emissor">
          <p className="cp-marca">inter<b>medi</b></p>
          <h1 id="cp-titulo" ref={titulo} className="perfil-foco-inicial" tabIndex={-1}>Comprovante de atendimento</h1>
          <p className="cp-farmacia">{link("farmacia", s.idFarmacia, s.nomeFarmacia)}</p>
          <p className="cp-linha-fina">
            {[s.cnesFarmacia && `CNES ${s.cnesFarmacia}`, [local.bairro, [local.cidade, local.uf].filter(Boolean).join("/")].filter(Boolean).join(" · "), s.telFarmacia && `Tel. ${s.telFarmacia}`].filter(Boolean).join(" · ")}
          </p>
        </header>

        <hr className="cp-tracejado" />

        <dl className="cp-numero">
          <div><dt>Nº do serviço</dt><dd className="cp-mono">{numeroServico}</dd></div>
          <div><dt>Data e hora</dt><dd className="cp-mono">{formatarDataChamado(s.dataServico)}</dd></div>
        </dl>

        <hr className="cp-tracejado" />

        <dl className="cp-partes">
          <div>
            <dt>Paciente</dt>
            <dd>{link("paciente", s.idPaciente, s.nomePaciente)}<small>CPF {mascararCpf(s.cpfPaciente) || "—"}</small></dd>
          </div>
          <div>
            <dt>Atendido por</dt>
            <dd>
              {link("funcionario", s.idFuncionario, s.nomeFuncionario)}
              <small>{[s.cargoFuncionario, turno(s.turnoFuncionario), s.matriculaFuncionario && `Mat. ${s.matriculaFuncionario}`].filter(Boolean).join(" · ")}</small>
            </dd>
          </div>
        </dl>

        <hr className="cp-tracejado" />

        <table className="cp-itens">
          <caption className="sr-only">Remédios entregues</caption>
          <thead>
            <tr><th scope="col" className="cp-qtd">Item</th><th scope="col">Descrição</th><th scope="col" className="cp-un">Qtd.</th></tr>
          </thead>
          <tbody>
            {remedios.map((r, i) => (
              <tr key={r.idRemedio}>
                <td className="cp-qtd cp-mono">{String(i + 1).padStart(2, "0")}</td>
                <td>
                  {link("remedio", r.idRemedio, <strong>{[r.nomeRemedio, r.dosagemRemedio].filter(Boolean).join(" ")}</strong>)}
                  <small>{[r.fabricanteRemedio, tarja(r.tarjaRemedio).label].filter(Boolean).join(" · ")}</small>
                </td>
                <td className="cp-un cp-mono">{numero(r.quantidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="cp-tracejado" />

        <dl className="cp-totais">
          <div><dt>Remédios diferentes</dt><dd className="cp-mono">{numero(s.totalMedicamentos ?? remedios.length)}</dd></div>
          <div className="cp-total"><dt>Total de unidades entregues</dt><dd className="cp-mono">{numero(s.quantidadeTotal)}</dd></div>
        </dl>

        {(s.observacao || receita.length > 0) && (
          <>
            <hr className="cp-tracejado" />
            <div className="cp-obs">
              {s.observacao && <p><b>Observação:</b> {s.observacao}</p>}
              {receita.length > 0 && (
                <p><b>Receita:</b> {receita.map((r) => r.nomeRemedio).join(", ")} {receita.length === 1 ? "exige" : "exigem"} receita médica.</p>
              )}
            </div>
          </>
        )}

        <hr className="cp-tracejado" />

        <footer className="cp-rodape">
          <p>Remédios entregues ao paciente e baixados do estoque da farmácia.</p>
          <CodigoDeBarras texto={numeroServico} />
          <p className="cp-mono cp-codigo">{numeroServico}</p>
          <p className="cp-assinatura">Intermedi · Conectando farmácias. Aproximando o cuidado.</p>
        </footer>
      </article>
    </div>
  );
}
