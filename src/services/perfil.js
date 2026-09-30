import { formatarDataChamado, tempoDesde } from "./chamados";

// Helpers dos perfis detalhados (funcionário, gerente, farmácia, remédio, paciente)
// e dos detalhes (chamado, serviço, pedido) abertos no painel lateral.

export const TIPOS_PERFIL = ["funcionario", "gerente", "farmacia", "remedio", "paciente", "chamado", "servico", "pedido"];
// Tipos com resumo por período (os demais são detalhes sem período)
export const TIPOS_COM_PERIODO = ["funcionario", "gerente", "farmacia", "remedio", "paciente"];

export const PERIODOS = [
  ["7d", "7 dias"],
  ["30d", "30 dias"],
  ["90d", "90 dias"],
  ["12m", "12 meses"],
  ["tudo", "Tudo"],
];

// ?perfil=farmacia:1,funcionario:3 → [{ tipo, id }, ...] (pilha do breadcrumb)
export function lerPilha(valor) {
  return String(valor || "")
    .split(",")
    .map((parte) => {
      const [tipo, id] = parte.split(":");
      return TIPOS_PERFIL.includes(tipo) && id ? { tipo, id } : null;
    })
    .filter(Boolean);
}
export const escreverPilha = (pilha) => pilha.map(({ tipo, id }) => `${tipo}:${id}`).join(",");

// Período: { periodo: "30d" } ou { de, ate }, lembrado por tipo de perfil
const chavePeriodo = (tipo) => `intermedi.perfil.periodo.${tipo}`;
export function lerPeriodoSalvo(tipo) {
  try {
    const salvo = JSON.parse(localStorage.getItem(chavePeriodo(tipo)) || "null");
    if (salvo?.de || PERIODOS.some(([v]) => v === salvo?.periodo)) return salvo;
  } catch { /* sem localStorage: usa o padrão */ }
  return { periodo: "30d" };
}
export function salvarPeriodo(tipo, periodo) {
  try { localStorage.setItem(chavePeriodo(tipo), JSON.stringify(periodo)); } catch { /* só não lembra */ }
}

// "2026-09-30" → "30/09/2026" (sem converter fuso: é só data)
export function dataCurta(valor) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// Eixo X do gráfico: "dd/mm" por dia, "mmm/aa" por mês
export function rotuloEixo(periodo, agrupamento) {
  if (agrupamento === "mes") {
    const [ano, mes] = String(periodo).split("-");
    return `${MESES[Number(mes) - 1] ?? mes}/${String(ano).slice(2)}`;
  }
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(periodo || "");
  return m ? `${m[2]}/${m[1]}` : String(periodo);
}
// Rótulo completo para tooltip/tabela: "30/09/2026" ou "setembro de 2026"
export function rotuloCompleto(periodo, agrupamento) {
  if (agrupamento === "mes") {
    const [ano, mes] = String(periodo).split("-").map(Number);
    return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  return dataCurta(periodo);
}

// 30 → "30 min"; 130 → "2 h 10 min"; null → "—"
export function formatarMinutos(min) {
  if (min === null || min === undefined) return "—";
  const total = Math.round(Number(min));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const resto = total % 60;
  if (h < 24) return resto ? `${h} h ${resto} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "dia" : "dias"}${h % 24 ? ` ${h % 24} h` : ""}`;
}

// "555.555.555-55" → "***.***.555-55"
export function mascararCpf(cpf) {
  const d = String(cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return cpf || "—";
  return `***.***.${d.slice(6, 9)}-${d.slice(9)}`;
}

export const numero = (valor) => Number(valor ?? 0).toLocaleString("pt-BR");

// Linha inteira clicável (<tr>/<article>): Enter/Espaço abrem; cliques em
// botões/links/campos dentro da linha continuam com a ação própria deles.
const INTERATIVO = "button, a, input, select, textarea, label, [role='menu'], [role='menuitem'], [data-sem-perfil]";
export function propsLinha(abrir, rotulo) {
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": rotulo,
    className: "perfil-linha",
    onClick: (event) => {
      const alvo = event.target.closest?.(INTERATIVO);
      if (alvo && alvo !== event.currentTarget) return;
      abrir(event.currentTarget);
    },
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        abrir(event.currentTarget);
      }
    },
  };
}

export const TURNOS = { manha: "Manhã", tarde: "Tarde", noite: "Noite", integral: "Integral" };
export const turno = (valor) => TURNOS[valor] || valor || "—";

// "27/09/2026 08:50 (há 3 dias)"
export const quando = (data) => (data ? `${formatarDataChamado(data)} (${tempoDesde(data)})` : "—");

// Endereço em uma linha a partir dos campos com sufixo (Funcionario, Gerente, Farmacia, Paciente)
export function endereco(dados, sufixo) {
  if (!dados) return "";
  const rua = dados[`endereco${sufixo}`] ?? dados[`rua${sufixo}`];
  const uf = dados[`uf${sufixo}`] ?? dados[`estado${sufixo}`];
  const linha1 = [rua, dados[`numero${sufixo}`]].filter(Boolean).join(", ");
  const partes = [linha1, dados[`complemento${sufixo}`], dados[`bairro${sufixo}`],
    [dados[`cidade${sufixo}`], uf].filter(Boolean).join("/"), dados[`cep${sufixo}`] && `CEP ${dados[`cep${sufixo}`]}`];
  return partes.filter(Boolean).join(" · ");
}
