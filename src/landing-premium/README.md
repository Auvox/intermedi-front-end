# Landing page premium (experimental)

Branch `feature/landing-page-premium`. Substitui só o conteúdo de `/`; `src/pages/LandingPage.jsx`
reexporta `LandingPremium.jsx` e continua importando `styles/LandingPage.css`, porque as regras
globais dele (`:root`, reset, `html`, `body`) também valem para as telas internas. Nada de
dashboards, chamados, autenticação, rotas internas, API ou CSS compartilhado foi alterado.

## Estrutura

| Arquivo | O que tem |
| --- | --- |
| `LandingPremium.jsx` | Página: capítulos, contexto de movimento, rolagem suave (Lenis), menu de acessibilidade reaproveitado |
| `content.js` | Textos e dados: capítulos, etapas reais do chamado, recursos, telas |
| `jornada/*` | "Uma rede, não uma ilha.": mundo 2D em SVG (`Mundo.jsx`, `geometria.js`), câmera virtual presa à rolagem (`useCameraVirtual.js`, GSAP ScrollTrigger) e textos das cenas (`JornadaEntrega.jsx`) |
| `hooks.js` | `useScrollProgress` (um único laço de rolagem, escreve `--p` 0–1), `useReveal`, `useMotion` |
| `ui/Plataforma.jsx` + `ui/plataforma.css` | Telas da plataforma recriadas em HTML só para visualização (casca, painel, relatório, formulário, Operação 3D, Desempenho e os cartões de cada etapa) |
| `components/PremiumNav.jsx` | Barra que veste a cor do capítulo atual; menu de celular |
| `sections/*` | Hero, Problema, ComoFunciona, Recursos, Demonstracao, ChamadaFinal, Rodape |
| `estilos.css` | Estilo da landing, sob `.lpx`, usando os tokens de `styles/tokens.css` |
| `assets/media/operacao-3d.mp4` | Gravação real da Operação 3D, na resolução nativa da cena |
| `assets/photos/farmacia-prateleiras.jpg` | "Hospital Pharmacy", Mattes, domínio público, Wikimedia Commons |

## Seções

1. **Hero**: um arquivo de pastas. As de trás são os capítulos (erguem e entreabrem ao apontar,
   mostrando o resumo). A da frente é o chamado CH-2026-000001: ao rolar, a capa tomba e a ficha
   sobe para fora da pasta.
2. **O problema**: mural (frase, palavra, foto com parallax) e duas frases curtas.
3. **A solução**: a jornada de uma entrega em tela cheia, numa cidade vertical (2000 × 5200
   unidades) cujo chão é o próprio fundo da seção (névoa verde-clara). O palco fica preso
   (sticky, 100svh) e uma câmera virtual (o `viewBox` do SVG: tela = mundo − câmera) desce junto
   com o caminhão pela estrada Bézier: enquadramento fixo na fornecedora com as caixas entrando na
   caçamba (0–15%), arrancada (15–30%), acompanhamento (30–74%), desaceleração até o
   enquadramento da solicitante (74–93%) e entrega com selo de concluído (90–100%). A posição da
   câmera sai da posição real do caminhão no mundo, com limites para ele nunca sair da tela nem
   passar por baixo do texto. Os cinco textos ficam sobre o cenário (à esquerda no computador,
   numa faixa no topo no celular) e um convite "Role para acompanhar a jornada" some ao começar a
   rolar. Tudo deriva do progresso da rolagem (scrub, sem timers), nos dois sentidos.
4. **Como funciona**: as cinco etapas de `etapasDoProcesso`, cada uma com o cartão da tela daquela
   etapa recriado em HTML.
5. **Recursos**: blocos com a cor e a silhueta da plataforma de cada recurso; legenda com os três papéis.
6. **Plataforma**: as telas recriadas crescem com a rolagem até ocupar a janela; cada uma tem uma
   legenda dizendo o que é. As abas levam à tela.
7. **Chamada final** e **rodapé em blocos**, com acesso por perfil (`/login?perfil=…`).

## Desempenho e acessibilidade

- Dependências novas: `lenis` 1.3.27 (rolagem suave, só na landing e só com movimento) e `gsap`
  3.15.0 (ScrollTrigger da jornada, sincronizado com a Lenis).
- Animações com `transform` e `opacity`; o vídeo só baixa quando a aba Operação 3D é escolhida.
- `prefers-reduced-motion` e "Parar animações" do menu desligam a Lenis, as cenas fixas e as
  entradas; a jornada mostra o mapa inteiro com a entrega feita ao lado das cinco cenas em sequência;
  todo o conteúdo fica visível sem script.
- Link "Pular para o conteúdo", foco visível, sanfona com `aria-expanded` e setas, abas com
  `aria-pressed`, cena atual da jornada com `aria-live`. As telas recriadas são `aria-hidden`
  (o texto da landing descreve cada uma).
