// Só o primeiro nome, com a primeira letra maiúscula ("FABRICIO aparecido" -> "Fabricio").
// Usado na saudação da visão geral e no topo das três plataformas.
export function primeiroNome(nomeCompleto, padrao = "") {
  const [primeiro] = String(nomeCompleto ?? "").trim().split(/\s+/);
  if (!primeiro) return padrao;
  const minusculo = primeiro.toLocaleLowerCase("pt-BR");
  return minusculo.charAt(0).toLocaleUpperCase("pt-BR") + minusculo.slice(1);
}
