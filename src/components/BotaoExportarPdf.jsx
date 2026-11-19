import { useState } from "react";

// Botão "Exportar PDF" do admin: gera o relatório e baixa o arquivo.
// O conteúdo vem de exportar() (services/exportarRelatorios.js).
export default function BotaoExportarPdf({ exportar, rotulo = "Exportar PDF", track }) {
  const [estado, setEstado] = useState({ gerando: false, mensagem: "" });

  async function clicar() {
    if (estado.gerando) return;
    setEstado({ gerando: true, mensagem: "" });
    try {
      const { protocolo } = await exportar();
      setEstado({ gerando: false, mensagem: `PDF gerado · protocolo ${protocolo}` });
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
      setEstado({ gerando: false, mensagem: error?.message ? `Não foi possível gerar o PDF: ${error.message}` : "Não foi possível gerar o PDF." });
    }
  }

  return (
    <div className="exportar-pdf">
      <button type="button" className="adm-hero2-export exportar-pdf-botao" onClick={clicar} disabled={estado.gerando} aria-busy={estado.gerando} data-track={track}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5M12 11v6m0 0-2.5-2.5M12 17l2.5-2.5" />
        </svg>
        {estado.gerando ? "Gerando PDF…" : rotulo}
      </button>
      <span className="exportar-pdf-status" role="status" aria-live="polite">{estado.mensagem}</span>
    </div>
  );
}
