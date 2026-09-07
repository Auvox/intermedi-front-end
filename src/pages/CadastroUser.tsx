import React from "react";
import { useForm } from "../hooks/useForm.js";
import { Input } from "../components/Input.jsx";

function CadastroUser() {
  const nome = useForm("nome");
  const cpf = useForm("cpf");
  const senha = useForm("senha");
  const telefone = useForm("telefone");
  const logradouro = useForm("logradouro");
  const numero = useForm("numero");
  const bairro = useForm("bairro");
  const cidade = useForm("cidade");
  const estado = useForm("estado");
  const uf = useForm("uf");
  const cep = useForm("cep");

  function handleSubmit(e) {
    e.preventDefault();
    if (
      nome.validate() &&
      cpf.validate() &&
      senha.validate() &&
      telefone.validate() &&
      logradouro.validate() &&
      bairro.validate() &&
      cidade.validate() &&
      numero.validate() &&
      estado.validate() &&
      uf.validate() &&
      cep.validate()
    ) {
      console.log("enviou");
    } else {
      console.log("nao enviou");
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <Input
          label="Nome"
          id="nome"
          type="text"
          placeHolder={"Usuario"}
          {...nome}
        />
        <button>Enviar</button>
      </form>
    </div>
  );
}

export default CadastroUser;
