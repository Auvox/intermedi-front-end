# Landing page premium (experimental)

Branch `feature/landing-page-premium`. Substitui só o conteúdo de `/`; `src/pages/LandingPage.jsx`
reexporta `LandingPremium.jsx` e continua importando `styles/LandingPage.css`, porque as regras
globais dele (`:root`, reset, `html`, `body`) também valem para as telas internas. Nada de
dashboards, chamados, autenticação, rotas internas, API ou CSS compartilhado foi alterado.

## Estrutura

| Arquivo | O que tem |
| --- | --- |
| `LandingPremium.jsx` | Página: capítulos, contexto de movimento, rolagem suave (Lenis), menu de acessibilidade reaproveitado |
| `content.js` | Textos e dados: etapas reais do chamado, faltas reais do estoque de demonstração, recursos, telas |
| `hooks.js` | `useScrollProgress` (um único laço de rolagem, escreve `--p` 0–1), `useReveal`, `useMotion` |
| `ui/Plataforma.jsx` + `ui/plataforma.css` | Telas da plataforma recriadas em HTML só para visualização (casca, painel, relatório, formulário, Operação 3D, Desempenho e os cartões de cada etapa) |
| `components/PremiumNav.jsx` | Barra que veste a cor do capítulo atual; menu de celular |
| `sections/*` | Hero, Problema, Solucao, ComoFunciona, Recursos, Demonstracao, ChamadaFinal, Rodape |
| `estilos.css` | Estilo da landing, sob `.lpx`, usando os tokens de `styles/tokens.css` |
| `assets/media/operacao-3d.mp4` | Gravação real da Operação 3D, na resolução nativa da cena |
| `assets/photos/farmacia-prateleiras.jpg` | "Hospital Pharmacy", Mattes, domínio público, Wikimedia Commons |

## Seções

1. **Hero**: um arquivo de pastas. As de trás são os capítulos (erguem e entreabrem ao apontar,
   mostrando o resumo). A da frente é o chamado CH-2026-000001: ao rolar, a capa tomba e a ficha
   sobe para fora da pasta.
2. **O problema**: mural (frase, palavra, foto com parallax) e duas frases curtas.
3. **A solução**: simulação com faltas reais do estoque de demonstração (Paracetamol na Pedro João
   Neto, Dipirona na Vida, Amoxicilina na Saúde Leste, Losartana na Bem Estar). O pedido vai até
   quem tem, a caixa volta, as barras de estoque mudam e as quatro etapas acendem.
4. **Como funciona**: as cinco etapas de `etapasDoProcesso`, cada uma com o cartão da tela daquela
   etapa recriado em HTML.
5. **Recursos**: blocos com a cor e a silhueta da plataforma de cada recurso; legenda com os três papéis.
6. **Plataforma**: as telas recriadas crescem com a rolagem até ocupar a janela; cada uma tem uma
   legenda dizendo o que é. As abas levam à tela.
7. **Chamada final** e **rodapé em blocos**, com acesso por perfil (`/login?perfil=…`).

## Desempenho e acessibilidade

- Uma dependência nova: `lenis` 1.3.27 (rolagem suave, ligada só na landing e só com movimento).
- Animações com `transform` e `opacity`; o vídeo só baixa quando a aba Operação 3D é escolhida.
- `prefers-reduced-motion` e "Parar animações" do menu desligam a Lenis, as cenas fixas e as
  entradas; a simulação aparece concluída; todo o conteúdo fica visível sem script.
- Link "Pular para o conteúdo", foco visível, sanfona com `aria-expanded` e setas, abas com
  `aria-pressed`, resultado da simulação com `aria-live`. As telas recriadas são `aria-hidden`
  (o texto da landing descreve cada uma).
