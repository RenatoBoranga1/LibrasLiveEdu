# LibrasLive Edu

PWA educacional inclusiva para apoiar alunos surdos ou com deficiencia auditiva em sala de aula com legenda ao vivo, avatar em Libras, cards visuais, historico, resumo automatico e glossario por disciplina.

> Esta ferramenta e um recurso de apoio a acessibilidade e a inclusao educacional. Ela nao substitui interpretes humanos de Libras em situacoes formais, mas oferece suporte complementar por meio de legenda em tempo real, avatar em Libras e recursos visuais.

## Status Real

- Funcional em modo demo, sem depender de APIs externas.
- Backend FastAPI com JWT, perfis, rotas protegidas, WebSocket separado para professor/aluno e tokens temporarios de aula.
- Frontend Next.js PWA mobile-first com telas `/aluno`, `/join/[accessCode]`, `/teacher`, `/admin`, `/login`, `/register`, `/privacy`, `/terms`, `/consent` e `/data-rights`.
- Banco PostgreSQL com migrations, seeds robustos, importador CSV/JSON/API autorizada e curadoria de sinais.
- Pronto para integrar Speech-to-Text real e avatar real, mas sem prometer traducao perfeita.

## Modo Demo x Producao

Use `DEMO_MODE=true` e `NEXT_PUBLIC_DEMO_MODE=true` para apresentacao. Esse modo permite aula demo, fallbacks locais e botao de demonstracao.

Use `DEMO_MODE=false` e `NEXT_PUBLIC_DEMO_MODE=false` para producao. Nesse modo:

- professor/admin precisam de login;
- endpoints demo ficam bloqueados;
- usuario demo nao deve ser usado;
- aluno entra por `/aluno`, codigo ou QR Code;
- tokens, admin e transcricoes nao sao cacheados pela PWA.

Se `ENVIRONMENT=production` e `DEMO_MODE=true`, o backend emite alerta forte no startup.

## Contas Seed

Depois de `python scripts/seed_database.py`:

- Admin: `admin@libraslive.local`
- Professor: `professor.demo@libraslive.local`
- Curador: `curador.demo@libraslive.local`
- Senha: `LibrasLive#2026`

Troque essas credenciais antes de qualquer validacao real.

## Rodar com Docker

```bash
cp .env.example .env
docker compose up --build
```

Em outro terminal:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed_database.py
```

URLs:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- OpenAPI: http://localhost:8000/docs
- Aluno: http://localhost:3000/aluno
- Professor: http://localhost:3000/teacher
- Admin/Curador: http://localhost:3000/admin

## Rodar Localmente

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_database.py
uvicorn main:app --reload --host 0.0.0.0
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --hostname 0.0.0.0
```

Comandos principais:

```bash
docker compose up --build
alembic upgrade head
python scripts/seed_database.py
python scripts/seed_full_dictionary.py
python scripts/import_libras_dictionary.py --source data/sample_libras_dictionary.json
npm install
npm run dev
```

## Testar no Celular

1. Conecte computador e celular no mesmo Wi-Fi.
2. Rode backend com `--host 0.0.0.0`.
3. Rode frontend com `npm run dev -- --hostname 0.0.0.0`.
4. Descubra o IP do computador com `ipconfig`.
5. Configure:

```env
NEXT_PUBLIC_API_URL=http://IP_DO_COMPUTADOR:8000
NEXT_PUBLIC_APP_URL=http://IP_DO_COMPUTADOR:3000
```

6. Abra `http://IP_DO_COMPUTADOR:3000/teacher`.
7. Faca login, crie a aula e escaneie o QR Code pelo celular.

No celular, nao use `localhost`, porque `localhost` aponta para o proprio celular.

## Fluxo Seguro da Aula

- Professor logado cria aula em `/teacher`.
- Backend gera `access_code` no formato `AULA-8F4K-29QX`.
- Backend gera `join_token` seguro e temporario.
- QR Code aponta para `/join/[accessCode]?token=...`.
- Aluno anonimo pode entrar sem conta quando a aula permitir.
- Aula finalizada bloqueia entrada e expira token.
- WebSocket do aluno apenas recebe eventos.
- WebSocket do professor exige JWT e permite enviar transcricao.

Eventos WebSocket:

- `class.started`
- `class.paused`
- `class.finished`
- `student.joined`
- `student.left`
- `transcript.segment.created`
- `translation.created`
- `keywords.detected`
- `sign.card.created`
- `summary.created`
- `connection.warning`
- `connection.restored`
- `error`

## Autenticacao e Perfis

Endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

Perfis:

- `admin`: estatisticas, importacao, aprovacao, gestao ampla.
- `curator`: revisao/aprovacao/rejeicao de sinais.
- `professor`: criar, pausar, finalizar, resumir, exportar e anonimizar aulas proprias.
- `student`: revisao e recursos pessoais quando autenticado.
- `guardian`: consentimento e direitos de dados.

## Dados e Curadoria de Libras

O seed local cria categorias, disciplinas e mais de 150 palavras educacionais. Todos os registros do seed entram como:

- `status = pending`
- `source_name = Seed educacional inicial`
- `license = Aguardando curadoria`
- `curator_notes = Registro inicial para curadoria por especialista em Libras`

O sistema nao inventa sinais oficiais de Libras. Sinais pendentes exibem aviso de curadoria.

## Importacao de Sinais

O `LibrasDictionaryImporter` aceita CSV, JSON e API autorizada. Ele valida campos obrigatorios, fonte, licenca, duplicidade, preserva sinais aprovados sem confirmacao e registra relatorio em `ImportJob`.

```bash
python scripts/import_libras_dictionary.py --source data/sample_libras_dictionary.json
python scripts/import_libras_dictionary.py --source data/sample_libras_dictionary.csv
python scripts/import_vlibras_dictionary.py
```

Nao faca scraping nao autorizado e nao use imagens, videos ou animacoes sem licenca.

## Speech-to-Text e Avatar

O backend possui providers placeholder:

- `DemoSpeechToTextProvider`
- `GoogleSpeechToTextProvider`
- `AzureSpeechProvider`
- `WhisperProvider`

O frontend possui provider de reconhecimento de fala do navegador quando disponivel. Por padrao, o app envia texto transcrito e nao armazena audio bruto.

O `AvatarPanel` renderiza video quando `avatar_video_url` existir, prepara `animation_payload_url` para renderer futuro e mostra fallback visual quando nao houver avatar.

## PWA

- Manifest completo.
- Service worker com cache apenas de assets publicos seguros.
- Pagina offline.
- Instrucoes para instalar no Android/Chrome e iPhone/Safari.
- Tokens, admin, aulas, transcricoes e endpoints sensiveis nao sao cacheados.
- Logout solicita limpeza de cache.

## LGPD e Criancas/Adolescentes

Leia tambem `PRIVACY.md`.

- Aluno anonimo nao precisa informar nome ou e-mail.
- Palavras salvas anonimamente ficam no `localStorage` do dispositivo.
- Transcricoes possuem retencao configuravel, com padrao de 30 dias em producao.
- Audio bruto nao e armazenado por padrao.
- Criancas e adolescentes devem usar com autorizacao da escola e/ou responsavel legal.

## Deploy

Frontend na Vercel:

- Root: `frontend`
- Build: `npm run build`
- Variaveis: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEMO_MODE`

Backend no Render/Railway:

- Root: `backend`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Variaveis: `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, `SECRET_KEY`, `DEMO_MODE`, `VLIBRAS_API_URL`, `VLIBRAS_API_KEY`

Banco:

- PostgreSQL: Supabase ou Neon.
- Redis: Upstash.
- HTTPS obrigatorio em producao.

## Testes

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm install
npm run test
npm run typecheck
```

## Checklist Antes de Uso Real

- `DEMO_MODE=false` em producao.
- `SECRET_KEY` forte e secreta.
- CORS limitado ao dominio oficial.
- HTTPS ativo.
- Contas demo removidas ou senhas trocadas.
- Admin/importacao protegidos.
- Politica LGPD validada pela escola.
- Termos e consentimento revisados.
- Base de sinais revisada por especialista em Libras.
- Contraste testado.
- Navegacao por teclado testada.
- Leitor de tela testado.
- Celular Android testado.
- iPhone testado.
- Tablet testado.
- Modo alto contraste testado.
- Fonte grande testada.
