// Sem dependência do three.js: a página (fora da cena) também usa estas cores.
// Cores da cena. O verde é o da marca (#168b4b, o mesmo dos botões do painel);
// o resto é neutro para os status (que sempre aparecem também em texto).
export const COR = {
  fundo: "#eef3f0",
  rua: "#dfe5e1",
  faixaRua: "#f7f9f8",
  piso: "#f8faf9",
  parede: "#ffffff",
  rodape: "#d5dfd8",
  zona: {
    estoque: "#eef2ef",
    doca: "#e7ebe9",
    atendimento: "#e7f4eb",
    gerencia: "#eef4f0",
    equipe: "#f1f3f2",
  },
  marca: "#168b4b",
  marcaEscura: "#1d6b43",
  marcaClara: "#cfe9d8",
  metal: "#c7d1cb",
  metalEscuro: "#93a69a",
  prateleira: "#e3e9e5",
  madeira: "#e9e2d6",
  vidro: "#cfe6da",
  tela: "#25362c",
  jaleco: "#ffffff",
  calca: "#2b4a39",
  cabeca: "#e4e9e6",
  paciente: "#9fb4c6",
  pneu: "#2e3833",
  selecao: "#168b4b",
  destaque: "#e0a12f",
};

// Caixas no estoque, por situação (a mesma ordem de gravidade da tela)
export const COR_SITUACAO = {
  ok: "#4aa874",
  vencendo: "#e2b443",
  critico: "#e48a3c",
  zerado: "#d64545",
  vencido: "#c94848",
};

export const COR_STATUS = {
  atendimento: "#3d7be0",
  reposicao: "#3d7be0",
  disponivel: "#2fa865",
  pausa: "#e2b443",
  fora: "#a9b4ad",
  carregando: "#3d7be0",
};

export const COR_PRIORIDADE = { baixa: "#a9b4ad", media: "#e2b443", alta: "#e48a3c", urgente: "#d64545" };
