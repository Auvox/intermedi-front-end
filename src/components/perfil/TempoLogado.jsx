import { useEffect, useState } from "react";
import CardNumero from "./CardNumero";
import ListaCompacta from "./ListaCompacta";
import { Grade, Kpis, Secao } from "./Blocos";
import { listarTempoLogado } from "../../services/presenca";

// Tempo logado de um funcionário (o gerente vê) ou gerente (o admin vê):
// quando entrou e saiu em cada dia, quanto tempo ficou e se está online agora.

const ATUALIZAR = 60 * 1000;

// 8h05, 18h00
const hora = (iso) => {
  const d = new Date(iso);
  return `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;
};

// 9h 30min, 45 min, menos de 1 min
function duracao(ms) {
  const minutos = Math.floor(ms / 60000);
  if (minutos < 1) return "menos de 1 min";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

const chaveDoDia = (iso) => new Date(iso).toLocaleDateString("sv-SE"); // 2026-10-21

function nomeDoDia(chave) {
  const hoje = chaveDoDia(new Date().toISOString());
  const ontem = chaveDoDia(new Date(Date.now() - 86400000).toISOString());
  if (chave === hoje) return "Hoje";
  if (chave === ontem) return "Ontem";
  const texto = new Date(`${chave}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// sessões -> um item por dia, com a primeira entrada, a última saída e o total
function porDia(sessoes) {
  const dias = new Map();
  for (const s of sessoes) {
    const chave = chaveDoDia(s.entrada);
    if (!dias.has(chave)) dias.set(chave, []);
    dias.get(chave).push(s);
  }
  return [...dias].map(([chave, lista]) => {
    const ordem = [...lista].sort((a, b) => a.entrada.localeCompare(b.entrada));
    const online = ordem.some((s) => s.online);
    const ultimaSaida = ordem.map((s) => s.saida).filter(Boolean).sort().at(-1);
    return {
      chave,
      online,
      entrada: ordem[0].entrada,
      saida: online ? null : ultimaSaida,
      totalMs: ordem.reduce((soma, s) => soma + s.duracaoMs, 0),
      trechos: ordem,
    };
  });
}

export default function TempoLogado({ tipo, id, nome }) {
  const [dias, setDias] = useState(7);
  const [estado, setEstado] = useState({ carregando: true });
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    listarTempoLogado(tipo, id, { dias, signal: controller.signal })
      .then((dados) => setEstado({ dados }))
      .catch((erro) => {
        if (erro.name !== "AbortError") setEstado({ erro: erro.message });
      });
    // o "online agora" muda sozinho: confere de novo a cada minuto
    const timer = setTimeout(() => setRodada((r) => r + 1), ATUALIZAR);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [tipo, id, dias, rodada]);

  const { dados, erro, carregando } = estado;
  const listaDias = dados ? porDia(dados.sessoes) : [];
  const hoje = listaDias.find((d) => d.chave === chaveDoDia(new Date().toISOString()));
  const ultima = dados?.sessoes[0];
  const sessaoOnline = dados?.sessoes.find((s) => s.online);
  const diasComAcesso = listaDias.length;

  const status = !dados ? null : dados.online ? (
    <span className="tempo-status is-online"><i /> Online agora · entrou às {hora(sessaoOnline.entrada)}</span>
  ) : ultima ? (
    <span className="tempo-status"><i /> Saiu {nomeDoDia(chaveDoDia(ultima.saida ?? ultima.entrada)).toLowerCase()} às {hora(ultima.saida ?? ultima.entrada)}</span>
  ) : (
    <span className="tempo-status"><i /> Sem acessos neste período</span>
  );

  return (
    <>
      <div className="tempo-topo">
        {status}
        <div className="tempo-periodo" role="group" aria-label="Período">
          {[7, 30].map((n) => (
            <button key={n} type="button" aria-pressed={dias === n} onClick={() => setDias(n)}>
              {n} dias
            </button>
          ))}
        </div>
      </div>
      <Kpis>
        <CardNumero titulo="Hoje" icone="clock"
          valor={!dados ? "—" : hoje ? duracao(hoje.totalMs) : "Não entrou"}
          detalhe={hoje && `${hora(hoje.entrada)} até ${hoje.online ? "agora" : hora(hoje.saida)}`} />
        <CardNumero titulo={`Últimos ${dias} dias`} icone="calendar" valor={dados ? duracao(dados.totalMs) : "—"}
          detalhe={dados && `${diasComAcesso} ${diasComAcesso === 1 ? "dia" : "dias"} com acesso`} />
        <CardNumero titulo="Média por dia" icone="check"
          valor={diasComAcesso ? duracao(dados.totalMs / diasComAcesso) : "—"} detalhe="nos dias com acesso" />
      </Kpis>
      <Grade>
        <Secao titulo="Dia a dia" descricao={`Quando ${nome || "a pessoa"} entrou e saiu da plataforma.`} largo>
          {erro ? (
            <p className="perfil-vazio" role="alert">{erro}</p>
          ) : carregando ? (
            <p className="perfil-vazio" role="status">Carregando…</p>
          ) : (
            <ListaCompacta
              rotulo="Tempo logado por dia"
              vazio={`Nenhum acesso nos últimos ${dias} dias.`}
              itens={listaDias.map((dia) => ({
                chave: dia.chave,
                inicio: <span className={`tempo-dia-ponto${dia.online ? " is-online" : ""}`} aria-hidden="true" />,
                titulo: nomeDoDia(dia.chave),
                subtitulo: [
                  `Logado de ${hora(dia.entrada)} até ${dia.online ? "agora" : hora(dia.saida)}`,
                  // trechos de menos de 1 min (entrou e saiu) não ajudam a ler o dia
                  dia.trechos.filter((t) => t.online || t.duracaoMs >= 60000).length > 1 &&
                    dia.trechos.filter((t) => t.online || t.duracaoMs >= 60000).map((t) => `${hora(t.entrada)}–${t.online ? "agora" : hora(t.saida)}`).join(" · "),
                ].filter(Boolean).join(" · "),
                lateral: duracao(dia.totalMs),
              }))}
            />
          )}
        </Secao>
      </Grade>
    </>
  );
}
