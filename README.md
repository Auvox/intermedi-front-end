# Intermedi — frontend

Aplicação React 19 + Vite, com áreas de administrador, gerente e funcionário. Requer Node.js 24 ou superior por usar SQLite nativo na autenticação.

## Executar

1. Instale as dependências com `npm ci`.
2. Copie `.env.example` para `.env.local` e configure `VITE_API_BASE_URL` com o endereço da API de dados.
3. Execute `npm run dev` e abra o endereço mostrado pelo Vite.

A autenticação do gerente é atendida pelo próprio Vite em `/api/auth`. A API de dados é um serviço separado e não está incluída neste repositório. O padrão é `http://localhost:3000`; o backend precisa permitir a origem do frontend quando estiver em outro domínio/porta. Requisições de dados têm limite de 15 segundos.

O servidor de autenticação usa `API_BASE_URL` do ambiente do processo Node para sincronizar gerentes da API externa. No PowerShell, defina `$env:API_BASE_URL='http://localhost:3000'` antes de iniciar o Vite ou `npm run dev:auth`. Arquivos `.env.local` do Vite não configuram automaticamente essa variável do processo Node.

## Verificar

- `npm run lint`: ESLint nos arquivos JS/JSX; não verifica tipos TypeScript.
- `npm run test:auth`: testes de autenticação, persistência e integração com o Vite, usando bancos temporários e uma API simulada em porta livre.
- `npm run build`: gera o frontend em `dist`.

## Estado da integração

As telas existentes consultam e alteram gerentes, farmácias, funcionários e pacientes pelos endpoints já usados no projeto. O frontend usa uma configuração central em `src/services/api.js`. As listas administrativas desses cadastros começam vazias, sem exemplos apresentados como registros reais. Funcionários são filtrados pela unidade; o frontend não substitui autorização no backend.

O dashboard do gerente, estoque, histórico de retiradas e chamados ainda usam dados demonstrativos de `managerData.js`. Os formulários de medicamentos e chamados e as transições de status não persistem na API. A conclusão depende do contrato do backend: rotas, métodos, campos, relacionamentos e autenticação. A API de dados real não foi validada nesta revisão.

A autenticação de funcionário ainda usa a consulta de CPF/matrícula no frontend, e a área administrativa ainda não possui autenticação de servidor. Não são fluxos prontos para produção.

## Implantação

O build estático não inclui a autenticação. Consulte `MANAGER.md` para configurar o serviço Node, proxy de mesma origem, HTTPS, `AUTH_ORIGINS` e armazenamento persistente do SQLite.
