import React from "react";

const types = {
  nome: {
    regex: /^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ\s]+$/,
    message: "Preencha um nome válido",
  },
  cpf: {
    regex:  /^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 
    message: "Preencha um email válido"
  },
  email: {
    regex:  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 
    message: "Preencha um email válido"
  }, 
  senha: {
    regex:  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[$*&@#])[0-9a-zA-Z$*&@#]{8,}$/, 
    message: "Preencha uma senha válido"
  }, 
  telefone: {
    regex:  /^(\d{2})?\d{4,5}\d{4}$/, 
    message: "Preencha um telefone válido"
  }, 
  logradouro: {
    regex:  /^([\w\W]+?)\s*(\d+.*)$/, 
    message: "Preencha um logradouro válido"
  }, 
  numero: {
    regex:  /^\d+[A-Za-z]?(?:-[A-Za-z0-9]+)?$/, 
    message: "Preencha um número válido"
  }, 
  bairro: {
    regex:   /^[A-Za-zÀ-ÿ\s'-]+$/, 
    message: "Preencha um bairro válido"
  }, 
  cidade: {
    regex:   /^[A-Za-zÀ-ÿ\s'-]+$/, 
    message: "Preencha uma cidade válido"
  }, 
  estado: {
    regex:   /^[A-Za-zÀ-ÿ\s'-]+$/, 
    message: "Preencha um estado válido"
  }, 
  uf: {
    regex:   /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i, 
    message: "Preencha um UF válido"
  }, 
  cep: {
    regex:  /^\d{5}-?\d{3}$/, 
    cep: "Preencha um cep válido"
  }, 

//   complemento
  
  
};

export function useForm(type: string) {
  const [value, setValue] = React.useState("");
  const [erro, setErro] = React.useState(null);

  function validate(value: string) {
    if (type === false) return true;
    if (value.length === 0) {
      setErro("Preenha um valor");
      return false;
    } else if (types[type] && !types[type].regex.test(value)) {
      setErro(types[type].message);
      return false;
    } else {
      setErro(null);
      return true;
    }
  }

  function onChange({target}) {
    if(erro) validate(target.value); 
    setValue(target.value); 
  }

  return {
    value, 
    setValue, 
    onChange, 
    erro,
    onBlur: () =>validate(value), 
    validate:() => validate(value)
  }
}
