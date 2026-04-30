# LibrasLive Edu

PWA educacional inclusiva para apoiar alunos surdos ou com deficiência auditiva em sala de aula com legenda ao vivo, avatar em Libras, cards visuais, histórico, resumo automático e glossário por disciplina.

> Esta ferramenta é um recurso de apoio à acessibilidade e à inclusão educacional. Ela não substitui intérpretes humanos de Libras em situações formais, mas oferece suporte complementar por meio de legenda em tempo real, avatar em Libras e recursos visuais.

## URLs de Produção

- Frontend: https://libras-live-edu-zkpy.vercel.app
- Backend: https://libraslive-edu-api.onrender.com
- Entrada do aluno: https://libras-live-edu-zkpy.vercel.app/aluno
- Professor: https://libras-live-edu-zkpy.vercel.app/teacher

## Status Real

- Funcional em modo demonstração quando `DEMO_MODE=true` e `NEXT_PUBLIC_DEMO_MODE=true`.
- Backend FastAPI com JWT, perfis, rotas protegidas, WebSocket separado para professor/aluno e tokens temporários de aula.
- Frontend Next.js PWA mobile-first com telas `/aluno`, `/join/[accessCode]`, `/teacher`, `/admin`, `/login`, `/register`, `/privacy`, `/terms`, `/consent` e `/data-rights`.
- Banco PostgreSQL com migrations, seeds robustos, importador CSV/JSON/API autorizada e curadoria de sinais.
- Pronto para integrar Speech-to-Text real e avatar real, sem prometer tradução perfeita.

## Modo Demo x Produção

Use `DEMO_MODE=true` e `NEXT_PUBLIC_DEMO_MODE=true` para apresentação. Esse modo permite aula demo, fallbacks locais e botão de demonstração.

Use `DEMO_MODE=false` e `NEXT_PUBLIC_DEMO_MODE=false` para produção. Nesse modo:

- professor/admin precisam de login;
- endpoints demo ficam bloqueados;
- usuário demo não deve ser usado;
- aluno entra por `/aluno`, código ou QR Code;
- tokens, admin, aulas e transcrições não são cacheados pela PWA.

Se `NEXT_PUBLIC_DEMO_MODE` estiver ausente, o frontend assume produção.

## Contas Seed

Depois de `python scripts/seed_database.py`, o projeto pode criar usuários locais de demonstração quando o modo demo estiver habilitado.

Configure usuários e senhas fortes por ambiente e troque qualquer credencial de demonstração antes de qualquer validação real.

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

No celular, não use `localhost`, porque `localhost` aponta para o próprio celular.

## Fluxo Seguro da Aula

- Professor logado cria aula em `/teacher`.
- Backend gera `access_code` no formato `AULA-8F4K-29QX`.
- Backend gera `join_token` seguro e temporário.
- QR Code aponta para `/join/[accessCode]?token=...`.
- Aluno anônimo pode entrar sem conta quando a aula permitir.
- Aula finalizada bloqueia entrada e expira token.
- WebSocket do aluno apenas recebe eventos.
- WebSocket do professor exige JWT e permite enviar transcrição.

## Dados e Curadoria de Libras

O seed local cria categorias, disciplinas e mais de 150 palavras educacionais. Todos os registros do seed entram como:

- `status = pending`
- `source_name = Seed educacional inicial`
- `license = Aguardando curadoria`
- `curator_notes = Registro inicial para curadoria por especialista em Libras`

O sistema não inventa sinais oficiais de Libras. Sinais pendentes exibem aviso de curadoria.

## Importação de Sinais

O `LibrasDictionaryImporter` aceita CSV, JSON e API autorizada. Ele valida campos obrigatórios, fonte, licença, duplicidade, preserva sinais aprovados sem confirmação e registra relatório em `ImportJob`.

```bash
python scripts/import_libras_dictionary.py --source data/sample_libras_dictionary.json
python scripts/import_libras_dictionary.py --source data/sample_libras_dictionary.csv
python scripts/import_vlibras_dictionary.py
```

Não faça scraping não autorizado e não use imagens, vídeos ou animações sem licença.

## Cadastro Manual pelo Dicionário INES

O painel `/admin/signs/new` permite que admin ou curador registrem manualmente informações consultadas no Dicionário da Língua Brasileira de Sinais - INES ou em outra fonte autorizada.

Regras de segurança e curadoria:

- não há scraping automático do INES;
- o sistema não baixa imagens ou vídeos automaticamente;
- não copie mídia do INES sem autorização/licença de uso;
- todo sinal cadastrado manualmente entra como `pending`;
- apenas admin ou curador pode aprovar/reprovar sinais;
- a aprovação exige fonte, URL, licença e glosa, mídia autorizada ou descrição adequada;
- apenas sinais `approved` aparecem como oficiais nos cards do aluno;
- sinais `pending` mostram aviso de curadoria e podem exibir fonte/licença, mas não mídia oficial.

Endpoints relacionados:

```bash
POST /api/signs/manual
PATCH /api/signs/{id}/curation
GET /api/signs/lookup?word=professor
```

## Importação Autorizada de Mídias INES

Quando houver autorização formal do INES/governo para baixar e usar as mídias, use o importador autorizado. Ele exige uma referência da autorização, baixa imagens/vídeos de hosts permitidos, salva os arquivos em `MEDIA_STORAGE_DIR` e registra os sinais como `pending`.

Variáveis:

```env
INES_MEDIA_IMPORT_AUTHORIZED=true
INES_MEDIA_AUTHORIZATION_REFERENCE=Oficio-ou-processo-da-autorizacao
INES_MEDIA_BASE_URL=https://dicionario.ines.gov.br/
INES_MEDIA_ALLOWED_HOSTS=dicionario.ines.gov.br
MEDIA_STORAGE_DIR=storage/media
PUBLIC_MEDIA_BASE_URL=/media
```

Comando:

```bash
cd backend
python scripts/import_ines_authorized_media.py --manifest data/ines_authorized_media_manifest.json --authorized --authorization-reference "Oficio/Processo XYZ"
```

Também há endpoint protegido para admin:

```bash
POST /api/admin/import/ines-media
```

Formato esperado do manifesto:

```json
{
  "items": [
    {
      "word": "professor",
      "gloss": "PROFESSOR",
      "image_url": "https://dicionario.ines.gov.br/...",
      "video_url": "https://dicionario.ines.gov.br/...",
      "source_reference_url": "https://dicionario.ines.gov.br/",
      "license": "Uso autorizado conforme documento informado"
    }
  ]
}
```

Mesmo com autorização, o sistema não aprova automaticamente. Admin/curador deve revisar e aprovar antes que a mídia apareça como sinal oficial na tela do aluno.

## Speech-to-Text e Avatar

- Backend: `DemoSpeechToTextProvider`, `GoogleSpeechToTextProvider`, `AzureSpeechProvider` e `WhisperProvider`.
- Frontend: reconhecimento de fala do navegador quando disponível.
- O app envia texto transcrito por padrão e não armazena áudio bruto.
- O `AvatarPanel` renderiza vídeo quando `avatar_video_url` existir e mostra fallback visual quando não houver avatar.

## Resumo Automático da Aula

O aluno vê um painel “Resumo da aula até agora” abaixo da legenda ao vivo. Esse resumo é um apoio pedagógico gerado automaticamente a partir da transcrição, não um documento oficial da escola.

O backend emite `summary.updated` pelo WebSocket quando há trechos suficientes e o intervalo mínimo foi atingido. O professor também pode clicar em “Gerar resumo agora” na tela `/teacher`.

Por padrão, o resumo usa fallback local seguro:

- remove trechos duplicados;
- considera os últimos 10 a 20 segmentos;
- extrai palavras-chave;
- cria bullets curtos;
- nunca trava a aula se uma integração de IA falhar.

Variáveis disponíveis:

```env
AI_SUMMARY_ENABLED=false
AI_PROVIDER=local
AI_MODEL=
AI_API_KEY=
AI_API_URL=https://api.openai.com/v1/chat/completions
SUMMARY_INTERVAL_SECONDS=45
SUMMARY_MIN_SEGMENTS=3
SUMMARY_MAX_SEGMENTS=20
```

Antes de ativar um provedor externo, valide LGPD, finalidade educacional, consentimento e contrato de processamento de dados. Não envie dados sensíveis para serviços externos sem aviso e autorização adequados.

Para um provedor compatível com chat completions, configure `AI_SUMMARY_ENABLED=true`, `AI_PROVIDER=openai` ou `AI_PROVIDER=openai_compatible`, `AI_MODEL`, `AI_API_KEY` e `AI_API_URL`. Se a chamada falhar, o app volta ao resumo local sem interromper a aula.

## Status real do avatar Libras

- O sistema já possui painel de avatar na tela do aluno.
- Avatar real depende de provedor externo autorizado ou de vídeos/animações com licença e curadoria.
- Quando não há provedor configurado, o app mostra legenda, glosa técnica quando disponível e cards visuais de palavras-chave.
- O backend retorna `avatar_provider_configured` em `/api/health` e metadados de tradução nos eventos `translation.created`.
- O app não inventa sinais de Libras e nunca deve apresentar seed local como sinal oficial.
- O recurso é apoio à acessibilidade e não substitui intérprete humano.

## Como testar uma aula

1. Acesse `/login`.
2. Entre como professor com uma conta válida do ambiente.
3. Abra `/teacher` e crie uma aula.
4. Copie o link ou escaneie o QR Code.
5. Abra o link do aluno em outra aba ou no celular.
6. Use “Teste rápido da aula” ou envie uma frase manual.
7. Verifique legenda ao vivo, cards visuais, histórico e o painel Avatar Libras/fallback.
8. Abra `/diagnostico` para validar API, WebSocket, SpeechRecognition, PWA e microfone antes da demonstração.

## PWA e Segurança Frontend

- Manifest completo.
- Service worker com cache apenas de assets públicos seguros.
- Página offline amigável.
- Instruções para instalar no Android/Chrome e iPhone/Safari.
- Tokens, admin, aulas, transcrições e endpoints sensíveis não são cacheados.
- Headers de segurança configurados no Next.js.

## LGPD e Crianças/Adolescentes

- Aluno anônimo não precisa informar nome ou e-mail.
- Palavras salvas anonimamente ficam no `localStorage` do dispositivo.
- Transcrições possuem retenção configurável, com padrão de 30 dias em produção.
- Áudio bruto não é armazenado por padrão.
- Crianças e adolescentes devem usar com autorização da escola e/ou responsável legal.

Leia também `PRIVACY.md`, `SECURITY.md` e `ACCESSIBILITY.md`.

## Deploy Vercel + Render + Neon

Frontend na Vercel:

- Root: `frontend`
- Build: `npm run build`
- Variáveis obrigatórias:
  - `NEXT_PUBLIC_API_URL=https://libraslive-edu-api.onrender.com`
  - `NEXT_PUBLIC_APP_URL=https://libras-live-edu-zkpy.vercel.app`
  - `NEXT_PUBLIC_DEMO_MODE=false`

Backend no Render:

- Root: `backend`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Variáveis obrigatórias:
  - `DATABASE_URL`
  - `SECRET_KEY`
  - `CORS_ORIGINS=https://libras-live-edu-zkpy.vercel.app`
  - `DEMO_MODE=false`
  - `PYTHON_VERSION=3.11.8`
  - `AI_SUMMARY_ENABLED=false`
  - `AI_PROVIDER=local`
  - `AI_API_URL=https://api.openai.com/v1/chat/completions`
  - `SUMMARY_INTERVAL_SECONDS=45`
  - `INES_MEDIA_IMPORT_AUTHORIZED=false`
  - `MEDIA_STORAGE_DIR=storage/media`
  - `PUBLIC_MEDIA_BASE_URL=/media`

Banco:

- PostgreSQL: Neon.
- Redis: Upstash, se habilitado.
- HTTPS obrigatório em produção.

Passo a passo:

1. Crie o banco PostgreSQL no Neon e copie a `DATABASE_URL`.
2. Configure o backend no Render apontando para a pasta `backend`.
3. Defina `SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `DEMO_MODE=false` e `PYTHON_VERSION`.
4. Rode `alembic upgrade head` e `python scripts/seed_database.py` no ambiente do backend.
5. Configure o frontend na Vercel apontando para a pasta `frontend`.
6. Defina `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_DEMO_MODE=false`.
7. Teste `/api/health`, `/aluno`, `/login`, `/teacher` e a instalação PWA.

Aviso de segurança: nunca suba `.env`, credenciais, tokens, chaves de API ou senhas demo para o GitHub.

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
npm run build
```

## Checklist Antes de Uso Real

- `DEMO_MODE=false` em produção.
- `NEXT_PUBLIC_DEMO_MODE=false` em produção.
- `SECRET_KEY` forte e secreta.
- CORS limitado ao domínio oficial.
- HTTPS ativo.
- Contas demo removidas ou senhas trocadas.
- Admin/importação protegidos.
- Política LGPD validada pela escola.
- Termos e consentimento revisados.
- Base de sinais revisada por especialista em Libras.
- Contraste testado.
- Navegação por teclado testada.
- Leitor de tela testado.
- Celular Android testado.
- iPhone testado.
- Tablet testado.
- Modo alto contraste testado.
- Fonte grande testada.
