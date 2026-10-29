// Endereço pelo CEP (ViaCEP, público e sem chave)

export const digitosCep = (texto) => String(texto).replace(/\D/g, "").slice(0, 8);

// 01310100 -> 01310-100 enquanto a pessoa digita
export const formatarCep = (texto) => digitosCep(texto).replace(/^(\d{5})(\d)/, "$1-$2");

// devolve { endereco, bairro, cidade, uf } ou null se o CEP não existe
export async function buscarCep(cep, { signal } = {}) {
  const response = await fetch(`https://viacep.com.br/ws/${digitosCep(cep)}/json/`, { signal });
  if (!response.ok) throw new Error("Não foi possível consultar o CEP.");
  const dados = await response.json();
  if (dados.erro) return null;
  return {
    endereco: dados.logradouro || "",
    bairro: dados.bairro || "",
    cidade: dados.localidade || "",
    uf: dados.uf || "",
  };
}
