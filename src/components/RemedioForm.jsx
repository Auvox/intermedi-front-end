import { useId, useState } from "react";
import useFotoPreview from "../hooks/useFotoPreview";
import { ChamadoModal } from "./Chamados";
import { FotoRemedio } from "./Remedios";
import { cadastrarRemedio, editarRemedio, enviarFotoRemedio } from "../services/api";
import {
  FORMAS_FARMACEUTICAS,
  TARJAS,
  TIPOS,
  VIAS_ADMINISTRACAO,
  digitosAnvisa,
  mascaraAnvisa,
  validarFoto,
} from "../services/remedios";

const CAMPOS_TEXTO = [
  "nomeRemedio", "principioAtivoRemedio", "dosagemRemedio", "fabricanteRemedio", "registroAnvisaRemedio",
  "tipoRemedio", "tarjaRemedio", "formaFarmaceuticaRemedio", "viaAdministracaoRemedio", "apresentacaoRemedio",
  "descRemedio", "indicacoesRemedio", "contraindicacoesRemedio", "armazenamentoRemedio",
];
const OBRIGATORIOS = {
  nomeRemedio: "Informe o nome.",
  principioAtivoRemedio: "Informe o princípio ativo.",
  dosagemRemedio: "Informe a dosagem.",
  fabricanteRemedio: "Informe o fabricante.",
  registroAnvisaRemedio: "Informe o registro ANVISA.",
  tipoRemedio: "Selecione o tipo.",
  formaFarmaceuticaRemedio: "Informe a forma farmacêutica.",
  apresentacaoRemedio: "Informe a apresentação.",
};

function estadoInicial(remedio) {
  const base = Object.fromEntries(CAMPOS_TEXTO.map((campo) => [campo, remedio?.[campo] ?? ""]));
  return {
    ...base,
    tarjaRemedio: remedio?.tarjaRemedio || "sem_tarja",
    registroAnvisaRemedio: mascaraAnvisa(remedio?.registroAnvisaRemedio),
    idsCategoria: (remedio?.idsCategoria ?? []).map(Number),
  };
}

// Cadastro e edição de medicamento do catálogo (admin).
// Cadastro: POST /remedios e, se houver foto, PUT /remedios/:id/foto.
// Edição: PUT /remedios/:id só com os campos alterados.
export default function RemedioForm({ remedio, categorias, onClose, onSalvo }) {
  const uid = useId();
  const editando = Boolean(remedio);
  const [inicial] = useState(() => estadoInicial(remedio));
  const [form, setForm] = useState(inicial);
  const [erros, setErros] = useState({});
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [foto, setFoto] = useState(null);
  const [preview, definirPreview] = useFotoPreview();
  // Remédio já gravado, mas a foto falhou: permite tentar só a foto de novo
  const [pendenteFoto, setPendenteFoto] = useState(null);


  const id = (campo) => `${uid}-${campo}`;
  const erroProps = (campo) => ({
    id: id(campo),
    "aria-invalid": Boolean(erros[campo]),
    "aria-describedby": erros[campo] ? `${id(campo)}-erro` : undefined,
  });
  const erro = (campo) =>
    erros[campo] ? <small className="chamado-field-error" id={`${id(campo)}-erro`}>{erros[campo]}</small> : null;

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }
  function alternarCategoria(idCategoria) {
    setForm((atual) => ({
      ...atual,
      idsCategoria: atual.idsCategoria.includes(idCategoria)
        ? atual.idsCategoria.filter((i) => i !== idCategoria)
        : [...atual.idsCategoria, idCategoria],
    }));
  }
  function escolherFoto(arquivo) {
    const erro = validarFoto(arquivo);
    setErros((atual) => ({ ...atual, foto: erro || undefined }));
    setFoto(erro ? null : arquivo);
    definirPreview(erro ? null : arquivo);
  }

  function validar() {
    const encontrados = {};
    Object.entries(OBRIGATORIOS).forEach(([campo, mensagem]) => {
      if (!String(form[campo] ?? "").trim()) encontrados[campo] = mensagem;
    });
    const digitos = digitosAnvisa(form.registroAnvisaRemedio);
    if (digitos && digitos.length !== 13) {
      encontrados.registroAnvisaRemedio = "O registro ANVISA deve ter 13 dígitos (9.9999.9999.999-9).";
    }
    const erroFoto = validarFoto(foto);
    if (erroFoto) encontrados.foto = erroFoto;
    return encontrados;
  }

  // Só os campos que mudaram (na edição) ou todos os preenchidos (no cadastro)
  function montarBody() {
    const body = {};
    CAMPOS_TEXTO.forEach((campo) => {
      const valor = String(form[campo] ?? "").trim();
      if (editando ? valor !== String(inicial[campo] ?? "").trim() : valor) body[campo] = valor;
    });
    const categorias = [...form.idsCategoria].sort((a, b) => a - b);
    const categoriasIniciais = [...inicial.idsCategoria].sort((a, b) => a - b);
    if (editando ? categorias.join() !== categoriasIniciais.join() : categorias.length) body.idsCategoria = categorias;
    return body;
  }

  function tratarErro(error) {
    const mensagem = error.message || "Não foi possível salvar.";
    if (/anvisa/i.test(mensagem)) setErros((atual) => ({ ...atual, registroAnvisaRemedio: mensagem }));
    else setErroEnvio(mensagem);
  }

  async function enviarFoto(salvo, mensagem) {
    try {
      const { resultado } = await enviarFotoRemedio(salvo.idRemedio, foto);
      onSalvo(resultado, mensagem);
    } catch (error) {
      setPendenteFoto({ remedio: salvo, mensagem });
      setErroEnvio(
        `${editando ? "Alterações salvas" : "Medicamento cadastrado"}, mas a foto não foi enviada: ${error.message}`,
      );
    }
  }

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    setErroEnvio("");
    const encontrados = validar();
    setErros(encontrados);
    if (Object.keys(encontrados).length) {
      document.getElementById(id(Object.keys(encontrados)[0]))?.focus();
      return;
    }
    setEnviando(true);
    try {
      if (pendenteFoto) {
        await enviarFoto(pendenteFoto.remedio, pendenteFoto.mensagem);
        return;
      }
      const body = montarBody();
      let salvo = remedio;
      let mensagem = "Nada foi alterado.";
      if (!editando) {
        salvo = (await cadastrarRemedio(body)).recebido;
        mensagem = `${salvo.nomeRemedio} cadastrado no catálogo.`;
      } else if (Object.keys(body).length) {
        salvo = (await editarRemedio(remedio.idRemedio, body)).resultado;
        mensagem = `${salvo.nomeRemedio} atualizado.`;
      }
      if (foto) await enviarFoto(salvo, mensagem);
      else onSalvo(salvo, mensagem);
    } catch (error) {
      tratarErro(error);
    } finally {
      setEnviando(false);
    }
  }

  const texto = (campo, label, props = {}) => (
    <label htmlFor={id(campo)}>
      {label}{OBRIGATORIOS[campo] && <span aria-hidden="true"> *</span>}
      <input
        {...erroProps(campo)}
        value={form[campo]}
        onChange={(e) => alterar(campo, e.target.value)}
        required={Boolean(OBRIGATORIOS[campo])}
        {...props}
      />
      {erro(campo)}
    </label>
  );
  const area = (campo, label) => (
    <label htmlFor={id(campo)}>
      {label}
      <textarea id={id(campo)} rows="2" maxLength={2000} value={form[campo]} onChange={(e) => alterar(campo, e.target.value)} />
    </label>
  );

  return (
    <ChamadoModal
      title={editando ? `Editar ${remedio.nomeRemedio}` : "Cadastrar medicamento"}
      onClose={onClose}
      className="remedio-form-modal"
    >
      <form className="mgr-form remedio-form" onSubmit={enviar} noValidate aria-busy={enviando}>
        <fieldset disabled={enviando || Boolean(pendenteFoto)} className="emp-service-fields">
          <p className="remedio-obrigatorio-nota">Campos com * são obrigatórios.</p>
          <div className="mgr-form-row">
            {texto("nomeRemedio", "Nome", { maxLength: 120, autoFocus: true })}
            {texto("principioAtivoRemedio", "Princípio ativo", { maxLength: 160 })}
          </div>
          <div className="mgr-form-row">
            {texto("dosagemRemedio", "Dosagem", { maxLength: 60, placeholder: "Ex.: 500mg" })}
            {texto("fabricanteRemedio", "Fabricante", { maxLength: 120 })}
          </div>
          <div className="mgr-form-row">
            <label htmlFor={id("registroAnvisaRemedio")}>
              Registro ANVISA<span aria-hidden="true"> *</span>
              <input
                {...erroProps("registroAnvisaRemedio")}
                inputMode="numeric"
                placeholder="9.9999.9999.999-9"
                value={form.registroAnvisaRemedio}
                onChange={(e) => alterar("registroAnvisaRemedio", mascaraAnvisa(e.target.value))}
                required
              />
              {erro("registroAnvisaRemedio")}
            </label>
            <label htmlFor={id("tipoRemedio")}>
              Tipo<span aria-hidden="true"> *</span>
              <select {...erroProps("tipoRemedio")} value={form.tipoRemedio} onChange={(e) => alterar("tipoRemedio", e.target.value)} required>
                <option value="">Selecione</option>
                {Object.entries(TIPOS).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
              </select>
              {erro("tipoRemedio")}
            </label>
          </div>
          <div className="mgr-form-row">
            <label htmlFor={id("tarjaRemedio")}>
              Tarja
              <select id={id("tarjaRemedio")} value={form.tarjaRemedio} onChange={(e) => alterar("tarjaRemedio", e.target.value)}>
                {Object.entries(TARJAS).map(([valor, { label }]) => <option key={valor} value={valor}>{label}</option>)}
              </select>
            </label>
            {texto("formaFarmaceuticaRemedio", "Forma farmacêutica", { list: `${uid}-formas`, maxLength: 80 })}
            <datalist id={`${uid}-formas`}>
              {FORMAS_FARMACEUTICAS.map((f) => <option key={f} value={f} />)}
            </datalist>
          </div>
          <div className="mgr-form-row">
            {texto("viaAdministracaoRemedio", "Via de administração", { list: `${uid}-vias`, maxLength: 40 })}
            <datalist id={`${uid}-vias`}>
              {VIAS_ADMINISTRACAO.map((v) => <option key={v} value={v} />)}
            </datalist>
            {texto("apresentacaoRemedio", "Apresentação", { maxLength: 160, placeholder: "Ex.: Caixa com 20 comprimidos" })}
          </div>
          {area("descRemedio", "Descrição")}
          <div className="mgr-form-row">
            {area("indicacoesRemedio", "Indicações")}
            {area("contraindicacoesRemedio", "Contraindicações")}
          </div>
          {area("armazenamentoRemedio", "Armazenamento")}
          <fieldset className="remedio-categorias">
            <legend>Categorias</legend>
            {categorias.length ? (
              categorias.map((c) => (
                <label key={c.idCategoria} className="remedio-check">
                  <input
                    type="checkbox"
                    checked={form.idsCategoria.includes(Number(c.idCategoria))}
                    onChange={() => alternarCategoria(Number(c.idCategoria))}
                  />
                  {c.nomeCategoria}
                </label>
              ))
            ) : (
              <p className="remedio-obrigatorio-nota">Nenhuma categoria cadastrada.</p>
            )}
          </fieldset>
        </fieldset>
        <fieldset className="remedio-foto-campo" disabled={enviando}>
          {preview ? (
            <span className="remedio-foto remedio-foto-md"><img src={preview} alt="Pré-visualização da foto" /></span>
          ) : (
            <FotoRemedio foto={remedio?.fotoRemedio} nome={form.nomeRemedio || "Novo remédio"} tamanho="md" />
          )}
          <label htmlFor={id("foto")}>
            {editando && remedio?.fotoRemedio ? "Trocar foto (opcional)" : "Foto (opcional)"}
            <input
              {...erroProps("foto")}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => escolherFoto(e.target.files?.[0] ?? null)}
            />
            <small className="remedio-obrigatorio-nota">JPEG, PNG ou WebP, até 5 MB.</small>
            {erro("foto")}
          </label>
        </fieldset>
        {erroEnvio && <p className="remedio-aviso remedio-aviso-erro" role="alert">{erroEnvio}</p>}
        <div className="mgr-modal-actions">
          {pendenteFoto ? (
            <>
              <button type="button" className="mgr-secondary" onClick={() => onSalvo(pendenteFoto.remedio, pendenteFoto.mensagem)}>
                Concluir sem foto
              </button>
              <button type="submit" className="mgr-primary" disabled={enviando || !foto}>
                {enviando ? "Enviando..." : "Tentar enviar a foto de novo"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="mgr-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="mgr-primary" disabled={enviando}>
                {enviando ? "Enviando..." : editando ? "Salvar alterações" : "Cadastrar medicamento"}
              </button>
            </>
          )}
        </div>
      </form>
    </ChamadoModal>
  );
}
