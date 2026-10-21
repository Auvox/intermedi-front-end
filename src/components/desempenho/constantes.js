// Constantes da aba Desempenho. Cores e estilos dos gráficos (Recharts) da aba Desempenho, iguais aos
// tokens do design system (src/styles/tokens.css): azul = volume,
// vermelho = erro/problema, preto = destaque do admin.
export const CORES = {
  volume: "#0066cc",
  erro: "#c4291c",
  atencao: "#9a5b06",
  destaque: "#1d1d1f",
  grade: "#e8e8ed",
  texto: "#6e6e73",
};

export const EIXO = { stroke: CORES.grade, tick: { fill: CORES.texto, fontSize: 12 }, tickLine: false };

export const TOOLTIP = {
  contentStyle: { borderRadius: 12, border: "1px solid #e8e8ed", boxShadow: "0 2px 8px rgb(0 0 0 / 0.05)", fontSize: 13 },
  labelStyle: { color: "#1d1d1f", fontWeight: 600 },
};

// Severidade dos alertas: crítico (vermelho), atenção (amarelo), informativo (azul)
export const SEVERIDADES = {
  critico: { rotulo: "Crítico", icone: "alert" },
  atencao: { rotulo: "Atenção", icone: "clock" },
  info: { rotulo: "Informativo", icone: "info" },
};

// Escala do mapa de calor: azul (poucos cliques) a vermelho (muitos)
export const CORES_CALOR = ["#2563eb", "#06b6d4", "#22c55e", "#eab308", "#dc2626"];
