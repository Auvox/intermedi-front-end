# Design System — INTERMEDI

Vale para o site inteiro: landing (`/`), login/cadastro e as três plataformas
(`/gerente`, `/funcionario`, `/admin`).

Linguagem (referência: sites da Apple e do ChatGPT): tipografia grande e justa,
muito espaço em branco, superfícies brancas sobre cinza-claro, seções pretas
pontuais, botões em pílula e cor só nos detalhes.

## Onde está

| Arquivo | O que tem |
| --- | --- |
| `src/styles/tokens.css` | **Fonte única** de cores, tipografia, espaçamento, raios, sombras, movimento e camadas. Importado por `src/index.css`. |
| `src/styles/personaTheme.css` | Cor de destaque de cada plataforma (troca as variáveis `--color-primary*`). |
| `src/styles/manager.css` | Casca das plataformas: layout, barra superior translúcida, cabeçalho de página, botões, campos, painéis, tabelas, badges, abas, modais, estados vazios. |
| `src/styles/managerSidebar.css` | Menu lateral (vira barra rolável no celular). |
| `src/styles/directory.css` | Indicadores (`DirectoryStats`) e grade de pessoas (`CartaoPessoa`). |
| `src/styles/LandingPage.css` + seções | Site público. |
| `src/styles/auth.css` | Login e cadastro. |

Regra: **não escreva cor, tamanho de fonte ou raio solto** em CSS novo. Use `var(--…)`.

## Cor de cada plataforma

| Plataforma | `--color-primary` | Onde aparece |
| --- | --- | --- |
| Gerente | verde `#16804a` | botão principal, item ativo do menu, ícones dos indicadores, links, foco, abas |
| Funcionário | azul `#0071e3` | idem |
| Admin | preto `#1d1d1f` | idem |

O resto da tela é neutro (branco, cinza `#f5f5f7`, texto `#1d1d1f`). Status com
significado (ok, atenção, erro, em andamento) usam as cores de estado, que são
iguais nas três plataformas.

## Tipografia

- Fonte: a do sistema da Apple (SF Pro) em Mac/iPhone; **Inter** nos demais
  aparelhos (carregada em `index.html`). SF Pro e OpenAI Sans não podem ser
  embutidas em sites por licença; a Inter é a equivalente aberta.
- Títulos com letras próximas (`--tracking-tight` / `--tracking-display`).

| Token | Uso |
| --- | --- |
| `--text-display` 56px+ | Títulos do site (o hero usa até 96px) |
| `--text-h1` 34px | Título da página nas plataformas (um por tela) |
| `--text-h2` 24px | Título de modal |
| `--text-h3` 19px | Título de painel |
| `--text-body-lg` 17px | Descrição da página, texto do site |
| `--text-body` 14px | Texto padrão, botões, tabelas |
| `--text-caption` 12px | Legendas. **Menor tamanho permitido.** |

## Forma

- Espaço em múltiplos de 4px (`--space-1` … `--space-24`).
- Raios: campos 12px, painéis/cartões 18px, modais 28px, botões `--radius-full` (pílula).
- Sem bordas nos painéis: o branco sobre o cinza já separa. Sombra só no que flutua.

## Padrões de tela

- **Cabeçalho de página:** `h1` + uma frase + no máximo uma ação principal.
- **Indicadores:** `DirectoryStats` com `[rótulo, valor, ícone, contexto]`. Todo número vem da API e tem contexto.
- **Avisos (`mgr-insight`):** só quando existe algo a fazer.
- **Tabelas:** `mgr-table-wrap` + `table`, com carregando, vazio e erro (`ErroComRetry`). No celular, prefira empilhar (ver `.remedio-tabela`).
- **Badges:** só quando informam algo (não marque o estado normal de todos os itens).
- **Acessibilidade:** foco visível, link "Pular para o conteúdo", alvo mínimo de 32px, `prefers-reduced-motion` respeitado.
