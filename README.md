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

Os valores do Compose são somente para desenvolvimento local. Nunca use essa credencial em produção. As variáveis `SEED_ADMIN_*` são necessárias apenas para criar o primeiro administrador usando `npm run db:seed`. A emissão de certificados exige `CERTIFICATE_INSTITUTION_NAME` e `CERTIFICATE_TEXT`; `CERTIFICATE_LOGO_PATH` é opcional. Esses dados ficam na configuração do servidor para não incluir identificação institucional fictícia nos PDFs. O texto aceita `{{participante}}`, `{{evento}}` e `{{cargaHoraria}}`.

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

Banner e artes do certificado aceitam PNG/JPEG até 5 MB. O aplicativo confere a assinatura binária, MIME informado e extensão; rejeita SVG e PDFs enviados como arte. Os arquivos são gravados fora de `public` em `PRIVATE_STORAGE_DIR` (padrão: diretório privado temporário do sistema) com permissão restrita. PDFs emitidos também ficam nesse storage privado; o download exige sessão do dono do certificado. Em produção, configure um volume privado persistente e protegido; a interface `StorageService` permite trocar a implementação por storage compatível com objeto sem publicar arquivos.

## Vitrine pública e inscrições

`/eventos` pesquisa no MySQL por título, descrição, nicho e cidade, aplica filtros validados com Zod e pagina eventos publicados. `/eventos/[id]` mostra dados públicos, disciplinas e mapa quando há coordenadas. O banner é servido por uma rota dedicada, que só lê a coluna `banner` de um evento publicado; artes de certificado e o armazenamento privado continuam protegidos.

Um participante com sessão válida pode se inscrever; o papel, a atividade da conta, o status/período do evento e a capacidade são verificados no servidor. Uma atualização condicional no MySQL decrementa uma vaga somente quando o evento continua publicado, não terminou e ainda tem capacidade. A criação da inscrição ocorre na mesma transação. A restrição única protege contra requisições duplicadas concorrentes e o rollback repõe a vaga.

O token aleatório usado como segredo futuro é criado com `randomBytes`, transformado em SHA-256 e somente o hash é salvo em `token_ingresso_hash`; o token puro não é retornado. A inscrição cancelada permanece no histórico e não pode ser reativada, devido à restrição única por participante/evento. Cancelar é idempotente: só a transição de ATIVA para CANCELADA devolve vaga, e a atualização do evento impede exceder `vagasTotais`. `/participante` lista somente as inscrições do usuário autenticado e permite cancelar as próprias.

## Ingresso e check-in por sessão

O participante autenticado pode abrir `/participante/inscricoes/[id]/ingresso`; somente o dono de uma inscrição ativa pode emitir seu QR do ingresso. O token puro é entregue apenas para gerar a imagem no navegador e o banco conserva seu hash. Emitir novamente invalida o QR anterior. `/participante/check-in` solicita a câmera somente após ação explícita e lê o QR temporário da sessão; exige inscrição ativa, evento publicado e horário dentro da sessão. O check-in grava a presença de forma atômica e a restrição única participante/sessão impede duplicidade concorrente. O participante também vê seu próprio histórico de até 50 presenças.

Na tela de check-in de uma sessão do evento, o organizador dono (ou ADMIN) pode gerar/rotacionar o QR, que expira em dois minutos. O QR puro não é persistido; somente o hash é salvo em `sessoes.token_qr_hash`, e a rotação invalida o token anterior. A página mostra a contagem e a lista de inscritos ativos com presença por sessão. O navegador requer permissão de câmera e contexto seguro (HTTPS; `localhost` é tratado como seguro pelos navegadores modernos).

## Frequência e certificados

`/organizador/eventos/[id]/frequencia` mostra o cálculo por participante e permite consolidar quando o evento está `ENCERRADO`, sua data final passou e todas as sessões terminaram. Como o modelo não separa sessões obrigatórias/opcionais, todas as sessões cadastradas contam no denominador. Conta-se somente presença `PRESENTE`; inscrições canceladas ficam fora. O limite é o campo já existente `percentualMinimoPresenca`, validado e comparado sem arredondamento da taxa exibida. A carga horária vem de `Evento.cargaHoraria`, armazenada pelo organizador.

A consolidação transacional salva um snapshot por participante, marca `Evento.presencaFinalizada` e emite no máximo um certificado para cada participante elegível. Repetir a ação retorna os resultados existentes sem recriar PDFs. Os arquivos são gravados fora de `public`; falhas na transação removem os PDFs temporários escritos. Após consolidado, o resultado é histórico. O participante acompanha em `/participante/certificados` e baixa apenas seus PDFs. O QR aponta para `/certificados/validar/[codigo]`, rota pública que retorna somente dados necessários à conferência; o código é um UUID aleatório e o arquivo não é exposto nessa página.

A primeira emissão de certificados exige nome institucional e texto de certificação configurados no servidor. O texto pode usar `{{participante}}`, `{{evento}}` e `{{cargaHoraria}}`; o logo pode ser informado como caminho local PNG/JPEG. Não há nome, marca ou texto institucional oficial fixado no código. A geração usa PDFKit e o QR já existente no projeto.

Na consolidação nova, participantes elegíveis também recebem um aviso de disponibilidade. O PDF permanece somente no storage privado e não é anexado.

## Trabalhos científicos e avaliação

O organizador configura no evento o início e o fim do período de submissão. A opção de aceitar trabalhos só pode ser salva com as duas datas preenchidas e ordenadas. O serviço confere no MySQL que o evento está publicado, a janela está aberta e o participante tem inscrição ativa. O arquivo aceito é somente PDF, com MIME declarado `application/pdf`, extensão `.pdf`, cabeçalho PDF e marcador final `%%EOF`; o limite é 10 MB. Os arquivos ficam no storage privado e downloads passam por uma rota que verifica autor, organizador do evento ou avaliador atribuído.

Cada trabalho pode ser atribuído a um único avaliador ativo pelo organizador responsável ou por ADMIN. A atribuição move o estado para `EM_AVALIACAO`. O avaliador atribuído registra um parecer e decide `APROVADO` ou `REJEITADO` uma única vez; o parecer, o avaliador e a data ficam preservados em `avaliacoes_trabalhos`. A restrição única por trabalho e a transação impedem avaliações duplicadas. Participantes veem somente seus próprios trabalhos e pareceres finais.

## E-mails e recuperação de senha

O serviço substituível `EmailService` usa Nodemailer e as variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` e `SMTP_SECURE`. Se o SMTP não estiver configurado ou estiver indisponível, a operação de cadastro, decisão, inscrição, cancelamento, submissão, avaliação ou consolidação já concluída permanece válida; a falha é registrada no servidor sem incluir destinatário, conteúdo, token ou credencial. Configure `APP_URL` com a origem pública correta para links. O nome institucional usa `CERTIFICATE_INSTITUTION_NAME`, já utilizado nos certificados. Sem SMTP, os e-mails não são entregues.

O cadastro envia uma notificação, sem validação obrigatória do endereço. Solicitações de organizador notificam ADMINs ativos; a decisão envia aprovação/rejeição ao solicitante. Inscrição e cancelamento, submissão e resultado de trabalho e emissão de certificado também notificam o participante. O download do certificado continua autenticado e não é anexado ao e-mail.

Em `/recuperar-senha`, o sistema sempre mostra uma resposta genérica. Para contas ativas, cria um token aleatório de 256 bits, conserva somente seu SHA-256 em `tokens_recuperacao_senha`, expira-o em 30 minutos e envia o link por e-mail. A troca usa Argon2, consome o token uma vez, invalida outros tokens e revoga as sessões existentes. É necessário SMTP e `APP_URL` para entregar o link. A migration `20261017000000_password_recovery_tokens` cria a tabela, sem alterar migrations anteriores.

## Métricas por evento

Organizador (somente dono do evento) e ADMIN podem abrir `/organizador/eventos/[id]/metricas`. A autorização e a consulta são feitas no servidor. Inscrições incluem todos os estados; ativas e canceladas são contagens separadas. Ocupação é inscrições ativas divididas pela capacidade total; presença é participantes elegíveis com ao menos uma presença `PRESENTE` dividida pelas inscrições não canceladas elegíveis à frequência; conclusão é participantes concluídos divididos pelo total elegível da frequência. Taxas sem denominador são mostradas como indisponíveis. Trabalhos submetidos (total) soma todos os estados; “aguardando atribuição” conta `SUBMETIDO`, “em avaliação” conta `EM_AVALIACAO`, e aprovados/rejeitados contam os estados finais. Certificados contam registros emitidos. A frequência usa o snapshot após consolidação e o cálculo existente antes dela.

A migration `20261016000000_scientific_work_evaluations` adiciona a janela ao evento e o registro de avaliação. Execute `npm run db:deploy` após `npm run db:generate` em uma máquina com MySQL acessível. Os testes de integração MySQL requerem `TEST_DATABASE_URL` em uma base isolada; `npm test` executa validações unitárias sem banco.

## Decisões de segurança e limites

- Senhas são transformadas em hash Argon2. Cadastros públicos definem `PARTICIPANTE` no servidor.
- A sessão usa token aleatório de 256 bits. O token puro fica somente no cookie `HttpOnly`; MySQL armazena SHA-256, vínculo do usuário e expiração. O cookie é `SameSite=Lax`, `Path=/`, expira em sete dias e recebe `Secure` em produção. Desativar usuário remove as sessões existentes e sessões de usuários inativos são recusadas.
- As operações mutáveis usam Server Actions POST. O endpoint multipart exige origem igual à origem da aplicação e valida o papel/propriedade antes de ler o corpo. O Next.js valida a origem das Server Actions por padrão; junto com `SameSite=Lax`, isso reduz requisições CSRF cross-site. Configure proxy e domínio corretamente; isso não protege contra XSS ou comprometimento da própria origem.
- O CSP usa nonce gerado por requisição pelo middleware e é enviado à renderização do Next.js. `unsafe-eval` só é incluído em desenvolvimento para ferramentas de desenvolvimento. Os demais cabeçalhos incluem `nosniff`, política de referrer, bloqueio de frame e restrição de permissões.
- O rate limit de login e cadastro é em memória, por endereço encaminhado pela infraestrutura, com janelas locais. Em produção com várias instâncias é necessário substituir o armazenamento por Redis ou serviço distribuído e configurar o proxy para sobrescrever `x-real-ip`/`x-forwarded-for`; cabeçalhos encaminhados diretamente pelo cliente não são identidade confiável.
- Recuperação, solicitação de organizador, inscrição/cancelamento e operações administrativas sensíveis reutilizam o mesmo limitador em memória, com chaves por endereço ou usuário. Essa proteção não é compartilhada entre instâncias.
- Leituras de sessão expirada agora apenas recusam a sessão; não apagam registros durante uma requisição GET. A invalidação persistente ocorre em logout, desativação ou troca da senha.
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

Depois de instalar as dependências, aplique as migrations pendentes com `npm run db:deploy` em um MySQL acessível. Para desenvolver uma migration nova use `npm run db:migrate`. Para `npm run test:integration`, aplique as migrations em uma base exclusiva apontada por `TEST_DATABASE_URL`; sem ela, os testes de integração aparecem como ignorados.

## Produção

Use MySQL gerenciado, `DATABASE_URL` fornecida pelo ambiente seguro do deploy, `npm run db:deploy` e armazenamento distribuído para rate limit. Defina `PRIVATE_STORAGE_DIR` para volume durável e privado ou substitua a implementação local por serviço de objetos. Segredos reais não devem estar no repositório. O Compose serve apenas para desenvolvimento local.
