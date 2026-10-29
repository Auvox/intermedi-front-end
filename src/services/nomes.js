// "gandalf o mago" -> "Gandalf": como a pessoa logada aparece nos painéis
export function primeiroNome(nome, padrao = "") {
  const primeiro = String(nome ?? "").trim().split(/\s+/)[0];
  if (!primeiro) return padrao;
  const minusculo = primeiro.toLocaleLowerCase("pt-BR");
  return minusculo.charAt(0).toLocaleUpperCase("pt-BR") + minusculo.slice(1);
}
