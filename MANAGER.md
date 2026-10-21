# Área do gerente

Requer Node.js 24 ou superior (SQLite nativo). Execute `npm install` e depois somente `npm run dev`. O Vite atende o site e a autenticação no mesmo processo e na mesma porta. Abra a URL exibida no terminal (normalmente `http://localhost:5173`) e acesse `/cadastro?perfil=gerente`. Informe nome, nome da nova unidade, e-mail e senha. O cadastro inicia a sessão e abre `/gerente`. Em acessos seguintes use `/login?perfil=gerente`.

Se a porta 5173 estiver ocupada, o Vite escolhe a próxima livre e a autenticação acompanha essa porta automaticamente. Não é necessário iniciar `dev:auth` durante o desenvolvimento. Ctrl+C encerra o site e a autenticação juntos. As contas salvas são preservadas ao reiniciar; os testes não apagam nem usam o banco de contas reais.

## Rotas

- `/gerente`: totais da unidade, estoque e chamados abertos da equipe.
- `/gerente/funcionarios`: busca, cadastro e ficha com chamados e retiradas filtrados por período; pacientes são contados sem duplicação.
- `/gerente/pacientes`: histórico de retiradas, medicamento, quantidade, data e funcionário; busca e filtro de período.
- `/gerente/remedios`: estoque da rede, filtros por unidade/disponibilidade e cadastro na unidade atual.
- `/gerente/chamados`: criação, detalhes, atendimento, resolução e reabertura de chamados da unidade; consulta de notificações de outras farmácias.
- `/gerente/operacao`: Operação 3D (digital twin da unidade), descrita abaixo.

## Operação 3D

Visão espacial da farmácia do gerente: estoque em gôndolas, equipe, balcões, chamados na gerência e entregas da rede na doca. É só uma camada de visualização: lê os mesmos endpoints das outras telas e as ações levam às telas que já existem (o botão Validar abre o relatório do chamado na seção "Decisão do gerente").

- Página: `src/pages/ManagerOperacao.jsx` (carregada sob demanda pelo router). Indicadores, painel lateral, fluxo e planta 2D ficam em `src/components/operacao/`.
- Cena 3D: `src/components/operacao3d/` (three, @react-three/fiber, @react-three/drei). Também é carregada sob demanda: telas menores que 768 px, navegadores sem WebGL e quem escolhe "2D" nunca baixam o three.js.
- Dados: `src/hooks/useOperacao.js` reaproveita o que o layout do gerente já consulta (chamados pendentes e pedidos da rede) e busca estoque (`GET /gerente/:id/estoque`, 30 s), resumo da unidade (`GET /gerente/:id/resumo`, 60 s), chamados (`GET /gerente/:id/chamados`) e o catálogo (`GET /remedios`, para as categorias).
- Regras de exibição: `src/services/operacao.js` (funções puras, sem React).

O que não existe no banco e é calculado ou simulado na tela:

| Na tela | Como é obtido | Integração real futura |
| --- | --- | --- |
| Corredor e vão do remédio | Corredor = categoria principal (a primeira em ordem alfabética); vão = ordem do nome | Coluna de localização no `estoque` |
| "No turno agora" | Faixa de horário de cada turno (manhã 7–13, tarde 13–19, noite 19–7, integral 8–18) | Registro de ponto/presença |
| Status ao vivo do funcionário | **Ilustrativo** (marcado na tela): sorteio estável por pessoa a cada 20 min | Endpoint de presença; trocar `statusFuncionario` em `services/operacao.js` |
| Alerta de validade | Validade até 90 dias (`VALIDADE_ALERTA_DIAS`) | — |
| Indicador geral (0–100) | Fórmula explicada ao clicar no indicador: 40% estoque, 20% validade, 25% chamados, 15% equipe | — |

Histórico de estoque e desativação de funcionário não existem na API e não aparecem na tela.

### Preparo dos pedidos da rede

Quando o gerente da farmácia fornecedora aceita um pedido (Pedidos da rede → Aceitar pedido), o remédio sai do estoque e o pedido fica **aguardando preparo**.
- **Funcionários da fornecedora:** todos recebem no topo das telas "Prepare 150× Paracetamol para a Farmácia X" com o botão **Começar** (`components/PreparosFarmacia.jsx`, consulta a cada 4 s).
- **Quem aperta primeiro assume o preparo** (status `preparando`). Os demais passam a ver "Fulano aceitou o pedido #N". Se dois apertarem ao mesmo tempo, a API aceita só um: o `UPDATE` só vale enquanto o pedido ainda está `aprovada`, e os outros recebem 409 com o nome de quem assumiu.
- **Preparo:** caixas de 50 unidades, uma ida e volta por caixa, 5 s cada (150 un. = 3 caixas = 15 s). Na Operação 3D da fornecedora, essa pessoa leva as caixas do palete da doca até o caminhão; o vão do remédio fica destacado no estoque.
- **Saída e chegada:** terminado o preparo, o caminhão sai sozinho (`enviada`) e chega depois do tempo de entrega. Na cena da farmácia que pediu, ele chega de frente.
- **Notificações (gerente e funcionário de quem pediu):** pedido confirmado → em preparo (com o nome de quem prepara) → saiu → em trânsito → chegou → entregue.

Desempenho: a cena só desenha quando algo muda (`frameloop="demand"`); caixas e estrutura das gôndolas usam instancing; etiquetas ficam numa única camada HTML (`Rotulos.jsx`). Acessibilidade: tudo o que está na cena também está na lista do painel lateral (teclado e leitor de tela), os marcadores são botões e a opção "Reduzir movimento" desliga as transições da câmera.

## Dados e integração

O cadastro de gerente persiste contas e novas unidades no banco `server/data/auth.sqlite`, ignorado pelo Git. Senhas são derivadas com scrypt e salt aleatório; o banco guarda apenas hashes de senhas e de tokens de sessão. Cookies HttpOnly/SameSite=Strict duram oito horas. A API valida a sessão no servidor, e a rota do gerente exige esse perfil. O botão Sair invalida a sessão. Não há conta ou senha padrão.

O cadastro público cria uma unidade nova e isolada, mesmo quando o nome coincide com outro cadastro; não permite vincular-se a unidades existentes nem criar administradores. Convites e vinculação a farmácias existentes ainda precisam de um fluxo de autorização. Funcionários e administradores mantêm o login PHP legado; seu cadastro não está implementado.

O dashboard ainda usa os exemplos da Farmácia Central, explicitamente separados da unidade da conta. As alterações de gestão ficam no `localStorage`, sob `intermedi-manager-demo-v1:<id-do-usuario>`; elas não são sincronizadas com o servidor. Os cadastros de funcionários no painel não criam contas. Notificações são demonstrativas. A integração das APIs de estoque, pacientes, funcionários e chamados, com autorização por unidade em cada operação, permanece pendente.

## Serviço de autenticação

- `POST /api/auth/register`: `nome`, `unidade`, `email`, `senha`, `confirmarSenha`, `role: "gerente"`; retorna usuário e cookie de sessão.
- `POST /api/auth/login`: `email`, `senha`, `role: "gerente"`.
- `GET /api/auth/session`: retorna usuário autenticado ou 401.
- `POST /api/auth/logout`: invalida a sessão e remove o cookie.

No desenvolvimento, `/api/auth` é atendido diretamente pelo Vite, sem proxy e sem usar a porta 3001. Escritas exigem Origin local permitido na porta efetivamente utilizada; login/cadastro têm limite de 20 solicitações por IP a cada 15 minutos, em memória. Reiniciar o processo reinicia esse limite. O limite deve ser aplicado na borda para implantações com múltiplas instâncias ou proxy compartilhado.

Para implantação, iniciar o serviço independente com `npm run dev:auth` (porta 3001 por padrão, configurável com `AUTH_PORT`), usar HTTPS e proxy de mesma origem para `/api/auth`, definir `NODE_ENV=production` e `AUTH_ORIGINS=https://seu-dominio` (múltiplas origens separadas por vírgula). Nesse modo os cookies usam Secure. O build estático e `vite preview` sozinhos não fornecem autenticação. Manter o banco fora da pasta pública, com volume persistente, permissões restritas e backups. Recuperação de senha e verificação de e-mail ainda não estão implementadas.

## Disponibilidade

- Crítico (vermelho): quantidade menor ou igual ao estoque mínimo.
- Quase acabando (amarelo): quantidade acima do mínimo e até duas vezes o mínimo.
- Disponível (verde): quantidade maior que duas vezes o mínimo.

Os status incluem texto, além da cor. O estoque mínimo é definido no cadastro do medicamento.

## Validação

`npm run test:auth`, `npm run build` e `npx eslint src/components/ManagerAccess.jsx src/services/auth.js src/pages/Manager.jsx src/pages/managerData.js src/router/router.jsx`.

Os testes usam banco temporário e cobrem cadastro, duplicação de e-mail, isolamento entre unidades, senha incorreta, persistência após reinício, cookie, rotação/expiração de sessão, logout, origem não autorizada e limite de tentativas. Nenhuma credencial real é usada nos testes.

O teste de integração do Vite ocupa a porta preferida de propósito, verifica cadastro/login/logout na porta alternativa e confirma que ela é liberada ao encerrar o servidor.

Verificações manuais: navegação, abertura de chamado por URL, resolução/reabertura, persistência após recarregar e filtros da ficha de funcionário e do histórico de pacientes.
