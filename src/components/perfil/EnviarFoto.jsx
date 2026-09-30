import { useId, useState } from "react";
import { ChamadoModal } from "../Chamados";
import useFotoPreview from "../../hooks/useFotoPreview";
import {
  enviarFotoFarmacia,
  enviarFotoFuncionario,
  enviarFotoGerente,
  fotoPessoa,
  removerFotoFarmacia,
  removerFotoFuncionario,
  removerFotoGerente,
} from "../../services/api";
import { validarFoto } from "../../services/remedios";

const ACOES = {
  funcionario: [enviarFotoFuncionario, removerFotoFuncionario],
  gerente: [enviarFotoGerente, removerFotoGerente],
  farmacia: [enviarFotoFarmacia, removerFotoFarmacia],
};

// "Trocar foto" / "Remover foto" com pré-visualização antes de enviar.
// onAlterada(novaFoto | null) é chamado depois que o servidor confirma.
export default function EnviarFoto({ tipo, id, nome, fotoAtual, onAlterada }) {
  const uid = useId();
  const [aberto, setAberto] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [preview, definirPreview] = useFotoPreview();
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [enviar, remover] = ACOES[tipo];

  function fechar() {
    setAberto(false);
    setArquivo(null);
    definirPreview(null);
    setErro("");
    setConfirmarRemocao(false);
  }
  function escolher(file) {
    const mensagem = validarFoto(file);
    setErro(mensagem);
    setArquivo(mensagem ? null : file);
    definirPreview(mensagem ? null : file);
  }
  async function executar(acao) {
    setEnviando(true);
    setErro("");
    try {
      const resposta = await acao();
      onAlterada(resposta.foto ?? null);
      fechar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const atual = fotoPessoa(fotoAtual);
  return (
    <>
      <button type="button" className="perfil-foto-botao" onClick={() => setAberto(true)}>
        {atual ? "Trocar foto" : "Adicionar foto"}
      </button>
      {aberto && (
        <ChamadoModal title={`Foto de ${nome}`} onClose={fechar}>
          <div className="remedio-foto-campo">
            <span className="perfil-foto-preview">
              {preview || atual ? (
                <img src={preview || atual} alt={preview ? "Pré-visualização da nova foto" : `Foto atual de ${nome}`} />
              ) : (
                <span aria-hidden="true">{String(nome || "?").slice(0, 1).toUpperCase()}</span>
              )}
            </span>
            <label htmlFor={`${uid}-foto`}>
              Nova foto
              <input
                id={`${uid}-foto`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={enviando}
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? `${uid}-erro` : `${uid}-dica`}
                onChange={(e) => escolher(e.target.files?.[0] ?? null)}
              />
              <small className="remedio-obrigatorio-nota" id={`${uid}-dica`}>JPEG, PNG ou WebP, até 5 MB.</small>
              {erro && <small className="chamado-field-error" id={`${uid}-erro`} role="alert">{erro}</small>}
            </label>
          </div>
          {confirmarRemocao && <p className="remedio-aviso">Remover a foto de {nome}? Voltam as iniciais.</p>}
          <div className="mgr-modal-actions">
            {atual && !confirmarRemocao && (
              <button type="button" className="mgr-delete-button chamado-recusar" disabled={enviando} onClick={() => setConfirmarRemocao(true)}>
                Remover foto
              </button>
            )}
            {confirmarRemocao ? (
              <>
                <button type="button" className="mgr-secondary" disabled={enviando} onClick={() => setConfirmarRemocao(false)}>Voltar</button>
                <button type="button" className="mgr-delete-button chamado-recusar" disabled={enviando} onClick={() => executar(() => remover(id))}>
                  {enviando ? "Enviando..." : "Confirmar remoção"}
                </button>
              </>
            ) : (
              <button type="button" className="mgr-primary" disabled={enviando || !arquivo} onClick={() => executar(() => enviar(id, arquivo))}>
                {enviando ? "Enviando..." : "Enviar foto"}
              </button>
            )}
          </div>
        </ChamadoModal>
      )}
    </>
  );
}
