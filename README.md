# LibrasLive Edu

PWA educacional inclusiva para apoiar alunos surdos em sala de aula com legenda ao vivo, avatar em Libras, cards visuais, histórico, resumo automático e glossário visual por disciplina.

> Esta ferramenta é um recurso de apoio à acessibilidade e à inclusão educacional. Ela não substitui intérpretes humanos de Libras em situações formais, mas oferece suporte complementar por meio de legenda em tempo real, avatar em Libras e recursos visuais.

## Fluxo Principal

1. O professor acessa `/teacher`.
2. Cria uma aula e inicia a transmissão demo.
3. O sistema gera um código curto no padrão `AULA-4821`.
4. O sistema gera o link `/join/[accessCode]` e um QR Code real.
5. O aluno escaneia o QR Code pelo celular.
6. O aluno acompanha legenda grande, avatar placeholder, cards visuais e histórico.
7. O aluno salva palavras e revisa a aula em `/review/[accessCode]`.
8. O administrador gerencia sinais em `/admin`.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, PWA.
- Backend: Python, FastAPI, WebSocket, SQLAlchemy, Alembic.
- Banco/infra: PostgreSQL, Redis, Docker Compose.
- Dados: seeds com categorias, disciplinas e mais de 150 palavras educacionais.
- Android opcional: cliente nativo em `android/`, mas o foco principal agora é a PWA mobile-first.

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
- Professor: http://localhost:3000/teacher
- Aluno demo: http://localhost:3000/join/AULA-4821
- Admin: http://localhost:3000/admin

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
5. Configure no frontend:

```env
NEXT_PUBLIC_API_URL=http://IP_DO_COMPUTADOR:8000
NEXT_PUBLIC_APP_URL=http://IP_DO_COMPUTADOR:3000
```

6. Abra no computador `http://IP_DO_COMPUTADOR:3000/teacher`.
7. Crie a aula e escaneie o QR Code no celular.

No celular, não use `localhost`, porque `localhost` aponta para o próprio celular.

## PWA

O frontend inclui:

- `public/manifest.json`
- ícones SVG em vários tamanhos
- `public/sw.js`
- cache básico
- `public/offline.html`
- instrução visual para “Adicionar à tela inicial”
- layout standalone e mobile-first

Para instalação como PWA em produção, use HTTPS. Em rede local, o navegador pode limitar instalação e service worker dependendo do dispositivo.

## Dados e Curadoria

O seed local cria categorias, disciplinas e mais de 150 palavras educacionais. Todos os sinais do seed entram com:

- `status = pending`
- `source_name = Seed educacional inicial`
- `license = Aguardando curadoria`
- notas para revisão por especialista em Libras

O sistema não inventa sinais oficiais de Libras e não marca dados demonstrativos como oficiais.

## Importação de Sinais

O `LibrasDictionaryImporter` aceita:

- CSV autorizado
- JSON autorizado
- API autorizada, incluindo ponto de integração para VLibras

Ele valida campos obrigatórios, fonte, licença, duplicidade, preserva sinais aprovados sem confirmação e registra logs em `ImportJob`.

Exemplos:

```bash
python scripts/import_libras_dictionary.py --source data/sample_libras_dictionary.json
python scripts/import_libras_dictionary.py --source data/sample_libras_dictionary.csv
python scripts/import_vlibras_dictionary.py
```

## Modo Demo

O modo demo funciona sem API externa:

- aula simulada
- transcrição simulada
- avatar placeholder
- cards a partir do seed
- resumo fictício
- professor enviando eventos por WebSocket
- aluno recebendo eventos em `/join/[accessCode]`

## Deploy

Frontend na Vercel:

- Root: `frontend`
- Build: `npm run build`
- Output: `.next`
- Variáveis:
  - `NEXT_PUBLIC_API_URL=https://SEU-BACKEND`
  - `NEXT_PUBLIC_APP_URL=https://SEU-FRONTEND`

Backend no Render/Railway:

- Root: `backend`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Variáveis:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `CORS_ORIGINS`
  - `DEMO_MODE`
  - `VLIBRAS_API_URL`
  - `VLIBRAS_API_KEY`

Banco:

- PostgreSQL: Supabase ou Neon.
- Redis: Upstash.

## Testes

```bash
cd backend
pytest
```

Os testes cobrem normalização, divisão de frases, extração de palavras-chave e validações básicas do importador.
