import { createContext, useContext } from "react";

// abrirPerfil(tipo, id, origem?) abre a página de perfil (ocupa a área ao lado do menu).
// Dentro da página, empilha (breadcrumb + Voltar); fora dele, começa uma pilha nova.
export const PerfilContext = createContext({
  abrirPerfil: () => {},
  plataforma: null,
  idFarmaciaAtual: null,
  dentroDoPainel: false,
});

export const usePerfil = () => useContext(PerfilContext);
