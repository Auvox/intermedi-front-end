# Landing page premium (experimental)

Branch `feature/landing-page-premium`. Substitui só o conteúdo de `/`; `src/pages/LandingPage.jsx`
apenas reexporta `LandingPremium.jsx`. Nada de dashboards, chamados, autenticação, rotas internas,
API ou CSS compartilhado foi alterado. Os componentes da landing anterior (`components/layout/*`)
continuam no repositório.

## Estrutura

| Arquivo | O que tem |
| --- | --- |
| `LandingPremium.jsx` | Página: capítulos, contexto de movimento, menu de acessibilidade reaproveitado |
| `content.js` | Todos os textos e dados (etapas reais do chamado, recursos, telas, parceiros) |
| `hooks.js` | `useScrollProgress` (um único laço de rolagem, escreve `--p` 0–1), `useReveal`, `useMotion` |
| `components/PremiumNav.jsx` | Barra que veste a cor do capítulo atual; menu de celular |
| `sections/*` | Hero, Problema, Solucao, ComoFunciona, Recursos, Demonstracao, ChamadaFinal, Rodape |
| `landing-premium.css` | Todo o estilo, sob `.lpx`, usando os tokens de `styles/tokens.css` |
| `assets/screens/*` | Capturas reais da plataforma (base de demonstração do back-end) |
| `assets/media/operacao-3d.mp4` | Gravação real da Operação 3D (montada a partir de quadros) |
| `assets/photos/farmacia-prateleiras.jpg` | "Hospital Pharmacy", Mattes, domínio público, Wikimedia Commons |

## Seções e efeitos

1. **Hero**: título que sobe linha a linha e uma pilha de pastas em 3D (CSS 3D) que se endireita
   ao rolar e inclina com o mouse; cada pasta leva a um capítulo, na cor dele. A da frente traz a
   ficha real do chamado CH-2026-000001.
2. **O problema**: mural (frase, palavra, foto com parallax) e texto que acende palavra por palavra.
3. **A solução**: rede de farmácias num plano 3D; ligações desenhadas pela rolagem e simulação
   interativa (escolher o remédio mostra quem pede e quem envia).
4. **Como funciona**: as cinco etapas de `etapasDoProcesso` numa sanfona (clique ou setas do teclado),
   com o status que aparece na plataforma e a tela real de cada etapa.
5. **Recursos**: mural de blocos com a cor da plataforma de cada recurso, entrando em diagonal.
6. **Plataforma**: a tela cresce com a rolagem até ocupar a janela e passa pelas telas reais;
   as abas trocam a tela (a da Operação 3D é vídeo).
7. **Chamada final** e **rodapé em blocos**, com acesso por perfil (`/login?perfil=…`).

## Desempenho e acessibilidade

- Nenhuma dependência nova: rolagem com um `requestAnimationFrame` compartilhado e
  `IntersectionObserver`; animações só com `transform` e `opacity`.
- Imagens com `loading="lazy"`; o vídeo só recebe `src` quando a aba dele é escolhida.
- `prefers-reduced-motion` e "Parar animações" do menu desligam a cena fixa, as entradas e os
  movimentos presos à rolagem; todo o conteúdo fica visível sem script.
- Link "Pular para o conteúdo", foco visível, sanfona com `aria-expanded` e setas, abas com
  `aria-pressed`, simulação com `aria-live`.
