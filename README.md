# Eventos SEPLAG

Plataforma institucional para gestão de cursos, workshops, congressos e outros eventos. O projeto inclui fundação técnica, sessões de conta, autorização por perfil, aprovação de organizador, gestão de eventos, vitrine pública, inscrição com controle transacional de vagas e check-in por QR Code de curta duração.

## Organização do código

- `backend/`: Prisma e migrations, seed, autenticação, serviços, validações, storage privado e testes unitários.
- `frontend/`: páginas e componentes reutilizáveis da interface, além dos testes E2E do Playwright.
- `app/`: árvore de rotas do Next.js e arquivos de entrada finos (páginas, Route Handlers e layout). Permanece na raiz porque é o ponto de entrada convencional do App Router; páginas delegam a renderização para `frontend/` e as operações para `backend/`.
- `middleware.ts` e arquivos de configuração na raiz: integração e ferramentas do Next.js, TypeScript, Tailwind, ESLint, Vitest e Playwright.

Os aliases `@backend/*` e `@frontend/*` apontam para essas áreas. A configuração do Next permite importar o backend que está fora do diretório `app/`.

## Stack e pré-requisitos

Next.js App Router, TypeScript, Tailwind CSS, MySQL, Prisma, Zod, Argon2, Vitest e Playwright. Requer Node.js 20+, npm e Docker Compose ou servidor MySQL acessível.

## Configuração local

```powershell
npm install
Copy-Item .env.example .env
```

Defina `DATABASE_URL` no `.env`. Com o MySQL local do Compose:

```text
mysql://eventos:eventos_local@localhost:3306/eventos
```

Os valores do Compose são somente para desenvolvimento local. Nunca use essa credencial em produção. As variáveis `SEED_ADMIN_*` são necessárias apenas para criar o primeiro administrador usando `npm run db:seed`.

## Banco e migrations

```powershell
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed # somente se as variáveis SEED_ADMIN_* estiverem preenchidas
```

O Compose executa MySQL 8.4 com volume persistente e horário UTC. As migrations e o schema ficam em `backend/prisma/`; o histórico ativo agora parte de uma migration MySQL de baseline. `npm run db:migrate` requer MySQL acessível. Em produção, aplique migrations versionadas com `npm run db:deploy`.

O histórico de migrations anterior foi preservado em `backend/prisma/migrations-legacy-archive/` e não é executado pelo Prisma. A mudança de provedor não converte nem copia dados de um banco anterior; para preservar dados existentes, faça exportação/conversão/importação controlada antes de mudar o ambiente usado pela aplicação. A migration MySQL ativa é para uma base nova.

## Cadastro e autenticação

Abra `/cadastro` para criar uma conta ou `/login` para entrar. Todo cadastro cria um `PARTICIPANTE`; marcar a opção de organizador cria uma solicitação pendente, sem alterar o perfil. Um ADMIN pode aprovar ou rejeitar em `/admin/solicitacoes-organizador` e ativar/desativar contas em `/admin/usuarios`.

As áreas `/participante`, `/organizador` e `/admin` exigem a sessão atual e o perfil apropriado. O middleware só faz uma checagem inicial de presença do cookie. Cada página, Server Action e rota de arquivo valida a sessão e o perfil no servidor. Organizadores veem e alteram somente seus próprios eventos; ADMIN pode administrar todos.

## Gestão de eventos

Em `/organizador/eventos`, um organizador cria, consulta e edita seus eventos. Eventos novos começam como `RASCUNHO`; as transições permitidas são `RASCUNHO` para `PUBLICADO` ou `CANCELADO`, e `PUBLICADO` para `CANCELADO` ou `ENCERRADO`. Eventos cancelados ou encerrados ficam preservados para consulta. Só rascunhos sem disciplinas, sessões ou outros registros relacionados podem ser excluídos.

Disciplinas e sessões podem ser criadas, editadas e removidas dentro da página do evento. Sessões precisam ficar dentro do período do evento; sessões com presenças não podem ser editadas/removidas.

Banner e artes do certificado aceitam PNG/JPEG até 5 MB. O aplicativo confere a assinatura binária, MIME informado e extensão; rejeita SVG e PDFs. Os arquivos são gravados fora de `public` em `PRIVATE_STORAGE_DIR` (padrão: diretório privado temporário do sistema) com permissão restrita. As rotas de leitura autenticam e verificam a propriedade do evento antes de devolver bytes com `Cache-Control: private, no-store`. Em produção, configure um volume privado persistente e protegido; a interface `StorageService` permite trocar a implementação por storage compatível com objeto sem publicar arquivos.

## Vitrine pública e inscrições

`/eventos` pesquisa no MySQL por título, descrição, nicho e cidade, aplica filtros validados com Zod e pagina eventos publicados. `/eventos/[id]` mostra dados públicos, disciplinas e mapa quando há coordenadas. O banner é servido por uma rota dedicada, que só lê a coluna `banner` de um evento publicado; artes de certificado e o armazenamento privado continuam protegidos.

Um participante com sessão válida pode se inscrever; o papel, a atividade da conta, o status/período do evento e a capacidade são verificados no servidor. Uma atualização condicional no MySQL decrementa uma vaga somente quando o evento continua publicado, não terminou e ainda tem capacidade. A criação da inscrição ocorre na mesma transação. A restrição única protege contra requisições duplicadas concorrentes e o rollback repõe a vaga.

O token aleatório usado como segredo futuro é criado com `randomBytes`, transformado em SHA-256 e somente o hash é salvo em `token_ingresso_hash`; o token puro não é retornado. A inscrição cancelada permanece no histórico e não pode ser reativada, devido à restrição única por participante/evento. Cancelar é idempotente: só a transição de ATIVA para CANCELADA devolve vaga, e a atualização do evento impede exceder `vagasTotais`. `/participante` lista somente as inscrições do usuário autenticado e permite cancelar as próprias.

## Ingresso e check-in por sessão

O participante autenticado pode abrir `/participante/inscricoes/[id]/ingresso`; somente o dono de uma inscrição ativa pode emitir seu QR do ingresso. O token puro é entregue apenas para gerar a imagem no navegador e o banco conserva seu hash. Emitir novamente invalida o QR anterior. `/participante/check-in` solicita a câmera somente após ação explícita e lê o QR temporário da sessão; exige inscrição ativa, evento publicado e horário dentro da sessão. O check-in grava a presença de forma atômica e a restrição única participante/sessão impede duplicidade concorrente. O participante também vê seu próprio histórico de até 50 presenças.

Na tela de check-in de uma sessão do evento, o organizador dono (ou ADMIN) pode gerar/rotacionar o QR, que expira em dois minutos. O QR puro não é persistido; somente o hash é salvo em `sessoes.token_qr_hash`, e a rotação invalida o token anterior. A página mostra a contagem e a lista de inscritos ativos com presença por sessão. O navegador requer permissão de câmera e contexto seguro (HTTPS; `localhost` é tratado como seguro pelos navegadores modernos).

## Decisões de segurança e limites

- Senhas são transformadas em hash Argon2. Cadastros públicos definem `PARTICIPANTE` no servidor.
- A sessão usa token aleatório de 256 bits. O token puro fica somente no cookie `HttpOnly`; MySQL armazena SHA-256, vínculo do usuário e expiração. O cookie é `SameSite=Lax`, `Path=/`, expira em sete dias e recebe `Secure` em produção. Desativar usuário remove as sessões existentes e sessões de usuários inativos são recusadas.
- As operações mutáveis usam Server Actions POST. O endpoint multipart exige origem igual à origem da aplicação e valida o papel/propriedade antes de ler o corpo. O Next.js valida a origem das Server Actions por padrão; junto com `SameSite=Lax`, isso reduz requisições CSRF cross-site. Configure proxy e domínio corretamente; isso não protege contra XSS ou comprometimento da própria origem.
- O CSP usa nonce gerado por requisição pelo middleware e é enviado à renderização do Next.js. `unsafe-eval` só é incluído em desenvolvimento para ferramentas de desenvolvimento. Os demais cabeçalhos incluem `nosniff`, política de referrer, bloqueio de frame e restrição de permissões.
- O rate limit de login e cadastro é em memória, por endereço encaminhado pela infraestrutura, com janelas locais. Em produção com várias instâncias é necessário substituir o armazenamento por Redis ou serviço distribuído e configurar o proxy para sobrescrever `x-real-ip`/`x-forwarded-for`; cabeçalhos encaminhados diretamente pelo cliente não são identidade confiável.
- A aprovação usa atualização condicional do status pendente dentro de transação. Só a requisição que altera uma linha pode promover o participante; falhas na atualização do usuário revertem a transação.
- Um ADMIN não pode desativar a própria conta nem o último ADMIN ativo. A checagem serializável protege alterações concorrentes; conflitos pedem nova tentativa.
- Mudanças de status são condicionais ao status atual, evitando aplicar uma transição concorrente inválida. Exclusão de evento não usa cascade; a aplicação preserva registros relacionados e traduz violações de FK em erro de domínio.

## Verificações

```powershell
npm run typecheck
npm run lint
npm test
npm run test:integration
npx prisma validate
npm run test:e2e
```

Typecheck, lint e testes unitários não necessitam de conexão ao MySQL. `npm run test:integration` requer `TEST_DATABASE_URL` apontando para um banco MySQL exclusivo e descartável; o teste remove seus registros ao final de cada cenário, mas deve usar banco isolado. Migrations, seed e testes de integração precisam de MySQL acessível. Os testes unitários também validam query params e geração/verificação de tokens sem banco.

## Produção

Use MySQL gerenciado, `DATABASE_URL` fornecida pelo ambiente seguro do deploy, `npm run db:deploy` e armazenamento distribuído para rate limit. Defina `PRIVATE_STORAGE_DIR` para volume durável e privado ou substitua a implementação local por serviço de objetos. Segredos reais não devem estar no repositório. O Compose serve apenas para desenvolvimento local.
