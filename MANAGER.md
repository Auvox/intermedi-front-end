# Área do gerente

Requer Node.js 24 ou superior (SQLite nativo). Execute `npm install` e depois somente `npm run dev`. O Vite atende o site e a autenticação no mesmo processo e na mesma porta. Abra a URL exibida no terminal (normalmente `http://localhost:5173`) e acesse `/cadastro?perfil=gerente`. Informe nome, nome da nova unidade, e-mail e senha. O cadastro inicia a sessão e abre `/gerente`. Em acessos seguintes use `/login?perfil=gerente`.

Se a porta 5173 estiver ocupada, o Vite escolhe a próxima livre e a autenticação acompanha essa porta automaticamente. Não é necessário iniciar `dev:auth` durante o desenvolvimento. Ctrl+C encerra o site e a autenticação juntos. As contas salvas são preservadas ao reiniciar; os testes não apagam nem usam o banco de contas reais.

## Rotas

- `/gerente`: totais da unidade, estoque e chamados abertos da equipe.
- `/gerente/funcionarios`: busca, cadastro e ficha com chamados e retiradas filtrados por período; pacientes são contados sem duplicação.
- `/gerente/pacientes`: histórico de retiradas, medicamento, quantidade, data e funcionário; busca e filtro de período.
- `/gerente/remedios`: estoque da rede, filtros por unidade/disponibilidade e cadastro na unidade atual.
- `/gerente/chamados`: criação, detalhes, atendimento, resolução e reabertura de chamados da unidade; consulta de notificações de outras farmácias.

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
