// Relatórios em PDF da Intermedi (Desempenho e Visão geral do admin).
// Mesmo visual nos dois: logo, faixas verdes, protocolo, código de
// verificação, aviso de confidencialidade/LGPD e direitos reservados.
// É uma simulação de documento oficial: os textos legais são ilustrativos.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "../assets/logoIntermedi.webp";

const VERDE = [8, 127, 69];
const VERDE_ESCURO = [6, 77, 45];
const VERDE_CLARO = [233, 245, 238];
const TINTA = [22, 42, 32];
const CINZA = [96, 112, 102];
const MARGEM = 16;

// jsPDF não lê WebP: desenha o logo num canvas e devolve PNG
async function carregarLogo() {
  try {
    // onload (e não img.decode(), que pode não resolver em aba em segundo
    // plano) e no máximo 3 s: sem o logo, o PDF sai com o nome em texto
    const img = await new Promise((resolve, reject) => {
      const imagem = new Image();
      const limite = setTimeout(() => reject(new Error("logo demorou")), 3000);
      imagem.onload = () => { clearTimeout(limite); resolve(imagem); };
      imagem.onerror = () => { clearTimeout(limite); reject(new Error("logo não carregou")); };
      imagem.src = logoUrl;
    });
    // 480 px de largura bastam para 9 mm de altura no papel (e o PDF fica leve)
    const escala = Math.min(1, 480 / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dados: canvas.toDataURL("image/png"), proporcao: img.naturalWidth / img.naturalHeight };
  } catch {
    return null;
  }
}

export function gerarProtocolo(sigla) {
  const agora = new Date();
  const data = agora.toISOString().slice(0, 10).replace(/-/g, "");
  const aleatorio = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `INT-${sigla}-${data}-${aleatorio}`;
}

// SHA-256 do conteúdo: o "código de verificação" impresso no documento
async function codigoVerificacao(conteudo) {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(conteudo));
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    return hex.slice(0, 32).match(/.{4}/g).join("-");
  } catch {
    return "INDISPONÍVEL";
  }
}

const dataHora = (d = new Date()) =>
  d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/**
 * Monta e baixa o PDF.
 * @param {object} cfg
 *   titulo, subtitulo, sigla (ex.: "DSP"), arquivo (nome do .pdf),
 *   emissor (nome de quem gerou), filtros: [[rótulo, valor]],
 *   destaques: [[rótulo, valor, detalhe?]] (cartões do topo),
 *   secoes: [{ titulo, texto?, tabela?: { cabecalho: [], linhas: [[]] }, vazio? }]
 */
export async function baixarRelatorioPdf(cfg) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const util = largura - MARGEM * 2;
  const logo = await carregarLogo();
  const protocolo = gerarProtocolo(cfg.sigla);
  const emitidoEm = new Date();
  const verificacao = await codigoVerificacao({ protocolo, emitidoEm, secoes: cfg.secoes, destaques: cfg.destaques });

  doc.setProperties({
    title: `${cfg.titulo} — ${protocolo}`,
    subject: cfg.subtitulo,
    author: "Intermedi",
    creator: "Plataforma Intermedi",
    keywords: `intermedi, relatório, ${protocolo}`,
  });

  // ---------- cabeçalho de cada página
  function cabecalho(primeira) {
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, largura, 4, "F");
    if (logo) {
      const h = 9;
      // alias: a mesma imagem é reaproveitada em todas as páginas
      doc.addImage(logo.dados, "PNG", MARGEM, 9, h * logo.proporcao, h, "logo-intermedi", "FAST");
    } else {
      doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...VERDE).text("Intermedi", MARGEM, 16);
    }
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...CINZA);
    doc.text("Rede Intermedi de Farmácias", largura - MARGEM, 11, { align: "right" });
    doc.text(`Protocolo ${protocolo}`, largura - MARGEM, 15, { align: "right" });
    doc.text(`Emitido em ${dataHora(emitidoEm)}`, largura - MARGEM, 19, { align: "right" });
    doc.setDrawColor(...VERDE).setLineWidth(0.6).line(MARGEM, 23, largura - MARGEM, 23);
    if (!primeira) return 30;

    // bloco de título (só na primeira página)
    doc.setFillColor(...VERDE_CLARO);
    doc.roundedRect(MARGEM, 28, util, 26, 2, 2, "F");
    doc.setFillColor(...VERDE);
    doc.rect(MARGEM, 28, 1.6, 26, "F");
    doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...VERDE_ESCURO).text(cfg.titulo, MARGEM + 6, 38);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...TINTA).text(cfg.subtitulo, MARGEM + 6, 44.5);
    doc.setFontSize(8).setTextColor(...CINZA).text(`Gerado por: ${cfg.emissor || "Administrador da plataforma"} · Documento de uso interno e confidencial`, MARGEM + 6, 50);
    return 62;
  }

  // ---------- rodapé (aplicado no fim, com o total de páginas)
  function rodape(pagina, total) {
    const y = altura - 16;
    doc.setDrawColor(...VERDE).setLineWidth(0.4).line(MARGEM, y, largura - MARGEM, y);
    doc.setFont("helvetica", "normal").setFontSize(6.8).setTextColor(...CINZA);
    doc.text(
      `© ${emitidoEm.getFullYear()} Intermedi. Todos os direitos reservados. Reprodução ou divulgação proibidas sem autorização (Lei nº 9.610/1998).`,
      MARGEM, y + 4.5,
    );
    doc.text(
      "Contém dados pessoais tratados conforme a Lei nº 13.709/2018 (LGPD). Documento gerado eletronicamente; dispensa assinatura física.",
      MARGEM, y + 8.5,
    );
    doc.setFont("helvetica", "bold").setTextColor(...VERDE);
    doc.text(`Página ${pagina} de ${total}`, largura - MARGEM, y + 4.5, { align: "right" });
    doc.setFont("courier", "normal").setFontSize(6.5).setTextColor(...CINZA);
    doc.text(verificacao.slice(0, 19), largura - MARGEM, y + 8.5, { align: "right" });
  }

  let y = cabecalho(true);
  const novaPagina = () => {
    doc.addPage();
    return cabecalho(false);
  };
  const garantir = (espaco) => {
    if (y + espaco > altura - 24) y = novaPagina();
  };

  // ---------- filtros aplicados
  if (cfg.filtros?.length) {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...VERDE_ESCURO).text("PARÂMETROS DO RELATÓRIO", MARGEM, y);
    y += 4;
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...TINTA);
    const texto = cfg.filtros.map(([r, v]) => `${r}: ${v}`).join("   ·   ");
    const linhas = doc.splitTextToSize(texto, util);
    doc.text(linhas, MARGEM, y);
    y += linhas.length * 4 + 4;
  }

  // ---------- cartões de destaque (até 4 por linha)
  if (cfg.destaques?.length) {
    const porLinha = 4;
    const gap = 3;
    const w = (util - gap * (porLinha - 1)) / porLinha;
    cfg.destaques.forEach(([rotulo, valor, detalhe], i) => {
      if (i % porLinha === 0) {
        if (i) y += 24;
        garantir(22);
      }
      const x = MARGEM + (i % porLinha) * (w + gap);
      doc.setDrawColor(200, 226, 210).setLineWidth(0.3).setFillColor(255, 255, 255);
      doc.roundedRect(x, y, w, 20, 1.6, 1.6, "FD");
      doc.setFillColor(...VERDE).rect(x, y + 3, 1, 14, "F");
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...CINZA).text(String(rotulo).toUpperCase(), x + 4, y + 6);
      doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...VERDE_ESCURO).text(String(valor ?? "—"), x + 4, y + 13);
      if (detalhe) doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(...CINZA).text(doc.splitTextToSize(String(detalhe), w - 6)[0], x + 4, y + 17.5);
    });
    y += 28;
  }

  // ---------- seções
  cfg.secoes.forEach((secao, indice) => {
    garantir(22);
    doc.setFillColor(...VERDE).rect(MARGEM, y - 3.6, 1.4, 5, "F");
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...VERDE_ESCURO).text(`${indice + 1}. ${secao.titulo}`, MARGEM + 4, y);
    y += 5;
    if (secao.texto) {
      doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...TINTA);
      const linhas = doc.splitTextToSize(secao.texto, util);
      garantir(linhas.length * 4);
      doc.text(linhas, MARGEM, y);
      y += linhas.length * 4 + 2;
    }
    if (secao.tabela?.linhas?.length) {
      autoTable(doc, {
        startY: y,
        head: [secao.tabela.cabecalho],
        body: secao.tabela.linhas.map((l) => l.map((c) => (c === null || c === undefined || c === "" ? "—" : String(c)))),
        margin: { left: MARGEM, right: MARGEM, top: 30, bottom: 24 },
        styles: { font: "helvetica", fontSize: 8, cellPadding: 2, textColor: TINTA, lineColor: [221, 234, 226], lineWidth: 0.2 },
        headStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [246, 251, 248] },
        didDrawPage: (dados) => {
          if (dados.pageNumber > 1 || doc.getCurrentPageInfo().pageNumber > 1) cabecalho(false);
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    } else if (secao.tabela || secao.vazio) {
      doc.setFont("helvetica", "italic").setFontSize(8.5).setTextColor(...CINZA).text(secao.vazio || "Sem registros no período.", MARGEM, y + 1);
      y += 8;
    }
  });

  // ---------- termo / validação
  garantir(58);
  doc.setDrawColor(...VERDE).setLineWidth(0.3).setFillColor(...VERDE_CLARO);
  doc.roundedRect(MARGEM, y, util, 52, 2, 2, "FD");
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...VERDE_ESCURO).text("Termo de autenticidade e confidencialidade", MARGEM + 5, y + 7);
  doc.setFont("helvetica", "normal").setFontSize(7.6).setTextColor(...TINTA);
  const termo = doc.splitTextToSize(
    "Este documento foi emitido eletronicamente pela plataforma Intermedi a partir dos registros do sistema no momento da emissão. " +
      "As informações são de uso interno da rede, destinadas exclusivamente a fins de gestão, auditoria e melhoria do serviço público de saúde, " +
      "e não podem ser compartilhadas com terceiros sem autorização. Dados pessoais aqui contidos são tratados com base no art. 7º, III e no art. 11, II, b " +
      "da Lei Geral de Proteção de Dados (Lei nº 13.709/2018). A integridade pode ser conferida pelo protocolo e pelo código de verificação abaixo.",
    util - 10,
  );
  doc.text(termo, MARGEM + 5, y + 12.5);
  const yv = y + 12.5 + termo.length * 3.4 + 3;
  doc.setFont("helvetica", "bold").setFontSize(7.6).text("Protocolo:", MARGEM + 5, yv);
  doc.setFont("courier", "normal").text(protocolo, MARGEM + 22, yv);
  doc.setFont("helvetica", "bold").text("Código de verificação:", MARGEM + 5, yv + 4.5);
  doc.setFont("courier", "normal").text(verificacao, MARGEM + 37, yv + 4.5);
  doc.setFont("helvetica", "bold").text("Emissão:", MARGEM + 5, yv + 9);
  doc.setFont("helvetica", "normal").text(`${dataHora(emitidoEm)} (horário de Brasília)`, MARGEM + 20, yv + 9);
  // linha de assinatura eletrônica
  const xa = largura - MARGEM - 62;
  doc.setDrawColor(...CINZA).setLineWidth(0.2).line(xa, yv + 5, largura - MARGEM - 5, yv + 5);
  doc.setFont("helvetica", "bold").setFontSize(7.4).setTextColor(...VERDE_ESCURO).text(cfg.emissor || "Administrador da plataforma", xa, yv + 9);
  doc.setFont("helvetica", "normal").setFontSize(6.8).setTextColor(...CINZA).text("Assinado eletronicamente · Admin Intermedi", xa, yv + 12.5);

  // ---------- rodapé com número de páginas
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    rodape(p, total);
  }

  doc.save(cfg.arquivo || `${protocolo}.pdf`);
  return { protocolo, verificacao };
}
