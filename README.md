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

## Identidade visual e mascote LibrasLive Edu

O LibrasLive Edu possui uma mascote original chamada **Liva**. Ela foi redesenhada como ilustração vetorial flat premium, inspirada na referência visual interna do produto, para representar acolhimento, Libras, acessibilidade, educação inclusiva e tecnologia ao vivo sem usar marcas oficiais do INES, Governo, IFPR, VLibras ou imagens de terceiros.

A Liva aparece no header, na tela inicial, em chamadas administrativas e como fallback visual do Avatar quando não há vídeo, GIF ou animação aprovada. Ela não substitui mídia real de Libras e não deve ser apresentada como tradução linguística. Os sinais reais continuam dependendo de `avatar_video_url`, `video_url`, `avatar_gif_url` ou `avatar_animation_url` validados e aprovados por curadoria.

Arquivos principais:

- `frontend/src/components/LibrasLiveMascot.tsx`: componente SVG inline com variantes `hero`, `compact`, `welcome`, `learning`, `communication`, `inclusion`, `live`, `avatar` e `empty`.
- `frontend/src/components/LibrasLiveLogo.tsx`: marca do produto com a mascote e o nome LibrasLive Edu.
- `frontend/public/icons/libraslive-mascot.svg`: asset SVG público da mascote.
- `frontend/public/icons/libraslive-icon.svg`: ícone PWA/favicons com a identidade da Liva.

O ícone do app usa a síntese visual mão + balão de fala + ondas ao vivo. A mascote usa uniforme institucional, paleta azul-petróleo/mint/âmbar e mãos em destaque para reforçar comunicação visual e educação inclusiva.

Se forem necessários PNGs para lojas ou instalação em dispositivos específicos, gere-os a partir dos SVGs e não substitua a fonte vetorial versionada.

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
- o cadastro manual não baixa imagens ou vídeos automaticamente;
- use somente mídia coberta pela autorização registrada para o projeto;
- todo sinal cadastrado manualmente entra como `pending`;
- apenas admin ou curador pode aprovar/reprovar sinais;
- a aprovação exige fonte, URL, licença e glosa, vídeo autorizado ou animação autorizada;
- apenas sinais `approved` aparecem como oficiais nos cards do aluno;
- sinais `pending` mostram aviso de curadoria e podem exibir fonte/licença, mas não mídia oficial.

Endpoints relacionados:

```bash
POST /api/signs/manual
PATCH /api/signs/{id}/curation
GET /api/signs/lookup?word=professor
```

## Importação Autorizada de Mídias INES

O projeto possui suporte para uso autorizado de vídeos do Dicionário da Língua Brasileira de Sinais - INES. Cada sinal deve registrar fonte, URL de referência, licença/autorização e observação de autorização antes de ser aprovado.

Use o importador autorizado apenas com manifesto revisado e referência da autorização. Pelo painel admin, ele registra URLs autorizadas no banco. Pelo script/backend, quando `download_media=true`, ele pode baixar imagens/vídeos de hosts permitidos, salvar os arquivos em `MEDIA_STORAGE_DIR`, registrar os sinais como `pending` e nunca aprovar automaticamente.

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
      "license": "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu",
      "license_notes": "Vídeo autorizado para uso educacional no aplicativo LibrasLive Edu."
    }
  ]
}
```

Mesmo com autorização, o sistema não aprova automaticamente. Admin/curador deve revisar e aprovar antes que a mídia apareça como sinal oficial na tela do aluno.

Fluxo com vídeo aprovado:

1. Professor envia fala/transcrição.
2. Backend extrai palavras-chave.
3. O banco busca sinais por palavra normalizada.
4. Se houver sinal `approved` com `video_url`/`avatar_video_url`, o WebSocket envia `sign.card.created` e `translation.created` com a mídia autorizada.
5. O `AvatarPanel` e os cards visuais exibem o vídeo com fonte, licença/autorização e link de referência.

O app continua sendo um recurso de apoio à acessibilidade e não substitui intérprete humano de Libras.

### Como cadastrar vídeos autorizados do INES

1. Acesse o Dicionário INES e localize a palavra ou expressão, por exemplo `bom dia`.
2. Copie a URL de referência da página específica do sinal.
3. No painel `/admin`, clique em `Adicionar vídeo` na palavra desejada ou acesse `/admin/signs/new` para criar uma expressão nova.
4. Informe glosa, fonte, URL da fonte, URL específica do sinal, licença/autorização, observações de licença e a URL real do vídeo autorizado.
5. Salve como `pending`. O sistema registra auditoria e não aprova automaticamente.
6. Revise o sinal com admin/curador e aprove apenas após validação por especialista em Libras.
7. Teste em aula: quando o professor enviar a palavra/expressão, o aluno verá vídeo no Avatar Libras somente se o sinal estiver `approved` e tiver `video_url` ou `avatar_video_url`.

Também existe a tela `/admin/import/ines-media` para importar lote JSON/CSV de URLs autorizadas. Use o exemplo `backend/data/ines_media_import_example.json` como modelo e substitua os placeholders por URLs reais autorizadas antes de importar.

Importante:

- Aprovar sem vídeo/GIF não faz o avatar exibir mídia.
- Para o avatar exibir mídia, o sinal precisa estar `approved` e ter `video_url`, `avatar_video_url`, `avatar_gif_url` ou `animation_payload_url`.
- Sinais aprovados sem mídia podem aparecer como glosa/card, mas o Avatar Libras mantém fallback visual.
- Não use URLs falsas, placeholders, vídeos/GIFs sem autorização registrada ou mídia sem fonte/licença.

## Importação administrativa de vídeos autorizados do INES

A rotina administrativa de importação fica em `/admin/import/ines-media` e só roda quando um usuário `admin` aciona manualmente. Ela não roda durante `npm run build`, `next build`, deploy da Vercel, start do Render, inicialização da API, migrations ou seed padrão.

Proteções principais:

- `INES_IMPORT_ENABLED=false` mantém o endpoint de execução bloqueado por padrão.
- `INES_IMPORT_MAX_ITEMS` limita o total por execução; o formulário pode reduzir o limite, mas não ultrapassá-lo.
- O padrão é vincular URL remota autorizada: `INES_IMPORT_STORE_REMOTE_URL=true` e `INES_IMPORT_DOWNLOAD_MEDIA=false`.
- Vídeos não são salvos no Git. Se download for habilitado no futuro, use storage externo apropriado.
- Cada sinal importado registra fonte, URL de referência, licença, observações e auditoria `ines_media_import`.
- A aprovação automática só ocorre se `approve_authorized=true`, `authorized=true`, houver vídeo e `INES_IMPORT_APPROVE_AUTHORIZED=true`; caso contrário, o sinal fica `pending`.

Variáveis:

```env
INES_IMPORT_ENABLED=false
INES_BASE_URL=https://dicionario.ines.gov.br/
INES_IMPORT_DELAY_MS=1000
INES_IMPORT_MAX_ITEMS=10
INES_IMPORT_APPROVE_AUTHORIZED=false
INES_IMPORT_DOWNLOAD_MEDIA=false
INES_IMPORT_STORE_REMOTE_URL=true
INES_IMPORT_TIMEOUT_SECONDS=15
INES_IMPORT_USE_BROWSER=false
INES_IMPORT_AUTHORIZATION_TEXT=Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu
```

Endpoints protegidos por admin:

```bash
POST /api/admin/import/ines-media/validate
POST /api/admin/import/ines-media/start
POST /api/admin/import/ines-media/diagnose
POST /api/admin/import/ines-media/auto-selected
POST /api/admin/import/ines-media/auto-pending
GET /api/admin/import/ines-media/{job_id}
```

Modos disponíveis:

- `json_items`: cola uma lista JSON de sinais já estruturados.
- `csv_items`: cola CSV com cabeçalho `word,gloss,source_name,source_url,source_reference_url,video_url,avatar_video_url,gif_url,avatar_gif_url,image_url,license,license_notes,curator_notes,authorized`.
- `selected_words`: tenta localizar mídia no INES para palavras informadas, com timeout e delay.
- `pending_words`: busca sinais `pending` sem vídeo e tenta localizar mídia, respeitando o limite.

Como testar:

1. Ative `INES_IMPORT_ENABLED=true` apenas no ambiente administrativo de teste.
2. Entre como admin e acesse `/admin/import/ines-media`.
3. Use `Validar` para revisar erros sem alterar o banco.
4. Use `Iniciar importação` para criar o job sob demanda.
5. Abra o relatório, revise sinais em `/admin`, aprove com curadoria e teste em aula.

Para o Avatar Libras aparecer com mídia, o sinal precisa estar `approved` e ter `video_url`, `avatar_video_url` ou `avatar_gif_url`. Aprovar sem mídia mantém o fallback visual; a legenda e os cards continuam funcionando.

### Diagnóstico de palavras no INES

A tela `/admin/import/ines-media` inclui a seção **Diagnóstico INES**. Ela chama o endpoint protegido `POST /api/admin/import/ines-media/diagnose` e não altera o banco de dados: não cria sinais, não atualiza mídia, não aprova registros e não baixa vídeos.

O diagnóstico mostra por palavra:

- URL de busca consultada no INES;
- status HTTP e se a página carregou;
- se a palavra apareceu no conteúdo retornado;
- se imagem e vídeo foram detectados no HTML;
- se o host do vídeo é permitido;
- se aquela palavra pode ser importada automaticamente;
- motivo, avisos e erros.

Use em lotes pequenos, como 5, 10 ou 20 palavras. Não use o diagnóstico para scraping massivo. Se a página carregar, mas o vídeo não aparecer no HTML inicial, use a importação manual por JSON/CSV com uma URL autorizada e registrada pela curadoria.

### Automação assistida de vídeos INES

A tela `/admin/import/ines-media` também possui o fluxo **Automação INES**. Ele automatiza a busca e vinculação de vídeos autorizados sem cadastro manual palavra por palavra, mas continua sendo uma rotina administrativa manual e controlada.

Como funciona:

1. O admin informa palavras ou escolhe importar as próximas pendentes sem vídeo.
2. O backend consulta o Dicionário INES com timeout, delay e limite por lote.
3. O importador tenta detectar vídeo no HTML inicial, tags `video/source`, `src`, `href`, `data-src`, `data-video`, `data-url` e URLs de mídia em scripts embutidos.
4. Quando encontra vídeo em host permitido, o sinal recebe `video_url`, fonte, URL consultada, licença, observações e auditoria.
5. O sinal permanece `pending` por padrão.
6. Admin/curador revisa e aprova. Só depois o Avatar Libras exibe o vídeo como sinal oficial.

Endpoints:

```bash
POST /api/admin/import/ines-media/auto-selected
POST /api/admin/import/ines-media/auto-pending
```

Proteções:

- não roda no deploy, build, startup, migrations ou seed;
- não baixa vídeos por padrão e não salva mídia no Git;
- `INES_IMPORT_MAX_ITEMS` usa padrão seguro `10`;
- erros por palavra não derrubam o job inteiro;
- o relatório lista vídeos encontrados, vídeos não encontrados, sinais criados/atualizados, avisos, erros e palavras que precisam de importação manual;
- aprovação automática continua desativada por padrão e depende de `approve_authorized=true`, `INES_IMPORT_APPROVE_AUTHORIZED=true`, vídeo, fonte, licença e autorização registrada.

Para testar em aula: rode a automação em lote pequeno, volte para `/admin`, aprove manualmente um sinal com vídeo/GIF, crie uma aula como professor e envie uma frase com a palavra aprovada. O aluno verá a mídia no Avatar Libras quando a palavra for detectada.

## Preenchimento automático de URLs de mídia

A tela `/admin/media-auto-fill` cria uma rotina administrativa para preencher URLs de mídia sem editar palavra por palavra. Ela busca sinais `pending`, `review` ou `needs_specialist_review` sem `video_url`/`avatar_gif_url`/`avatar_animation_url`, consulta fontes autorizadas em lote pequeno e mantém tudo como `pending` para curadoria.

Essa rotina:

- não roda em `npm run build`, `next build`, deploy da Vercel, start do Render, inicialização da API, migrations ou seed;
- só roda quando um usuário `admin` aciona manualmente a tela ou os endpoints protegidos;
- não baixa vídeos, GIFs ou imagens e não salva mídia no Git;
- não aprova sinais automaticamente;
- respeita `MEDIA_AUTO_FILL_MAX_ITEMS` e aplica delay entre consultas;
- tenta INES primeiro e, se configurado, IFPR GIFs como fallback;
- registra `ImportJob`, relatório por palavra e `SignAuditLog`;
- preenche `source_name`, `source_url`, `source_reference_url`, `license`, `license_notes` e `curator_notes` quando encontra mídia;
- separa mídia animada de apoio visual: JPG/PNG entram apenas em `image_url` e não contam como Avatar Libras.

Variáveis:

```env
MEDIA_AUTO_FILL_ENABLED=false
MEDIA_AUTO_FILL_MAX_ITEMS=10
MEDIA_AUTO_FILL_DELAY_MS=1000
MEDIA_AUTO_FILL_TIMEOUT_SECONDS=15
MEDIA_AUTO_FILL_ALLOW_BROWSER=false
MEDIA_AUTO_FILL_APPROVE_AUTOMATICALLY=false

INES_IMPORT_ENABLED=false
INES_BASE_URL=https://dicionario.ines.gov.br/

IFPR_GIF_IMPORT_ENABLED=false
IFPR_GIF_BASE_URL=https://ifpr.edu.br/umuarama/libras-gifs/
IFPR_GIF_SOURCE_NAME=IFPR Campus Umuarama - Libras GIFs
IFPR_GIF_LICENSE_TEXT=Uso autorizado ou licença identificada para apoio educacional
IFPR_GIF_LICENSE_NOTES=GIF utilizado como apoio visual em Libras, com fonte registrada.
```

Endpoints protegidos:

```bash
POST /api/admin/media-auto-fill/diagnose
POST /api/admin/media-auto-fill/selected
POST /api/admin/media-auto-fill/pending
```

Uso recomendado:

1. Ative `MEDIA_AUTO_FILL_ENABLED=true` apenas no ambiente administrativo.
2. Ative somente as fontes que deseja consultar, como `INES_IMPORT_ENABLED=true` e/ou `IFPR_GIF_IMPORT_ENABLED=true`.
3. Acesse `/admin/media-auto-fill`.
4. Clique em `Diagnosticar palavras` para verificar se as fontes retornam mídia detectável.
5. Use `Preencher palavras selecionadas` ou `Preencher próximas pendentes sem mídia`.
6. Volte para `/admin`, revise fonte/licença e aprove manualmente o sinal.
7. Teste em aula: quando a palavra aprovada aparecer, o Avatar Libras usa `avatar_video_url`/`video_url`, depois `avatar_gif_url`, depois `avatar_animation_url`. `image_url` aparece apenas como apoio visual/card.

Se o relatório indicar `Precisa de importação manual`, use JSON/CSV autorizado. A automação não deve ser usada para scraping massivo nem para burlar carregamento por JavaScript/API.

### Imagem de apoio não é Avatar Libras

O campo `image_url` é usado somente como apoio visual nos cards e na curadoria. JPG, PNG ou WebP não representam o movimento do sinal em Libras e nunca entram na prioridade do Avatar.

No Dicionário INES, URLs em `/public/media/mao/` são imagens estáticas de configuração de mão. Exemplo:

```text
https://dicionario.ines.gov.br/public/media/mao/cg51a.jpg
```

Essas imagens devem ser salvas apenas em `image_url`, com `media_type = "image"` e `can_use_avatar = false`.

Vídeos reais do sinal aparecem no padrão `/public/media/palavras/videos/`. Exemplo da palavra `aprender`:

```text
https://dicionario.ines.gov.br/public/media/palavras/videos/aprenderSm_Prog001.mp4
```

Quando o importador encontrar esse padrão, ele preenche `video_url` e `avatar_video_url`, mantém o sinal como `pending` e registra fonte/licença para revisão. O Avatar Libras só usa mídia com movimento: `avatar_video_url`, `video_url`, `avatar_gif_url` ou `avatar_animation_url`.

Quando o HTML inicial do INES não expõe o vídeo, a rotina administrativa pode fazer um probing controlado de URLs conhecidas do próprio diretório de vídeos, sem baixar mídia e sem rodar no deploy. Para `aprender`, por exemplo, ela testa candidatos como:

```text
https://dicionario.ines.gov.br/public/media/palavras/videos/aprenderSm_Prog001.mp4
```

O relatório mostra `detection_method` para explicar como a mídia foi detectada:

- `html_video`: vídeo apareceu no HTML inicial.
- `probed_video_url`: vídeo foi localizado por probing controlado de URL.
- `gif_lookup`: GIF autorizado localizado por fonte configurada.
- `support_image_only`: apenas imagem estática foi encontrada.
- `none`: nenhuma mídia detectável.

## Validação obrigatória de mídia

Toda URL que pode virar mídia animada do Avatar Libras é validada antes de ser salva em `video_url`, `avatar_video_url`, `avatar_gif_url` ou `avatar_animation_url`. A validação faz `HEAD` e, quando necessário, `GET` com `Range: bytes=0-0`, segue redirects e nunca baixa o arquivo inteiro.

Regras:

- status aceitos: `200` ou `206`;
- vídeo precisa retornar `video/mp4`, `video/webm`, `video/quicktime` ou `application/octet-stream` com extensão `.mp4`, `.webm` ou `.mov`;
- GIF precisa retornar `image/gif` ou `application/octet-stream` com extensão `.gif`;
- HTML, `404`, `500`, JPG, PNG, WebP e `/public/media/mao/` são rejeitados como Avatar;
- `image_url` continua permitido apenas como apoio visual;
- manifesto, autofill, importadores e edição manual validam novamente antes de persistir;
- mesmo validada, a mídia fica `pending` até curadoria.

Endpoint administrativo para diagnosticar uma URL sem alterar o banco:

```bash
POST /api/admin/media/validate-url
```

Payload:

```json
{
  "url": "https://dicionario.ines.gov.br/public/media/palavras/videos/aprenderSm_Prog001.mp4",
  "expected_type": "video"
}
```

A tela `/admin/media-validate` mostra status HTTP, `Content-Type`, `Content-Length`, URL final, motivo e prévia visual quando o vídeo/GIF realmente carrega. URLs quebradas, HTML disfarçado de MP4 e imagens estáticas não são salvas como Avatar Libras.

## Como adicionar novas palavras

A entrada principal para cadastrar vocabulário novo fica em `/admin/add-words`. O painel `/admin` também mostra o botão destacado **Adicionar novas palavras**, com três caminhos simples:

1. **Adicionar pelo padrão INES**: abre `/admin/ines-standard-video`, gera URLs no padrão `{palavraNormalizada}Sm_Prog001.mp4`, valida cada vídeo e salva somente URLs válidas.
2. **Cadastrar manualmente**: use quando já tiver a URL correta do vídeo, GIF ou imagem de apoio. O formulário testa vídeo/GIF antes de salvar e envia para `POST /api/signs/manual`.
3. **Importar lista**: use manifestos autorizados, `/admin/media-auto-fill`, `/admin/media-crawler` ou `/admin/import/ines-media` para trabalhar em lote.

Toda palavra nova fica `pending`. Vídeo/GIF/animação precisa passar pela validação remota antes de ser salvo como mídia de Avatar, imagem estática fica apenas em `image_url` como apoio visual, e a aprovação final continua manual por admin/curador.

## Preenchimento por padrão de vídeo INES

A tela `/admin/ines-standard-video` gera URLs prováveis do Dicionário INES pelo padrão:

```text
https://dicionario.ines.gov.br/public/media/palavras/videos/{palavraNormalizada}Sm_Prog001.mp4
```

Exemplos:

```text
abacate -> abacateSm_Prog001.mp4
abafar -> abafarSm_Prog001.mp4
abaixo -> abaixoSm_Prog001.mp4
ação -> acaoSm_Prog001.mp4
bom dia -> bomdiaSm_Prog001.mp4
```

Essa rotina é administrativa, protegida por `admin` e bloqueada por padrão com:

```env
INES_STANDARD_VIDEO_FILL_ENABLED=false
INES_STANDARD_VIDEO_BASE_URL=https://dicionario.ines.gov.br/public/media/palavras/videos/
INES_STANDARD_VIDEO_SUFFIX=Sm_Prog001.mp4
INES_STANDARD_VIDEO_MAX_ITEMS=20
INES_STANDARD_VIDEO_TIMEOUT_SECONDS=15
```

Antes de salvar, o backend valida cada URL com a rotina de mídia remota. Apenas respostas `200` ou `206` com `Content-Type` de vídeo compatível são gravadas em `video_url`; URLs quebradas, HTML, JSON de erro, JPG, PNG e WebP não são salvos como Avatar. Os sinais continuam `pending`, com fonte, URL de referência, licença e observações registradas para curadoria manual.

Endpoints:

```bash
POST /api/admin/ines-standard-video/diagnose
POST /api/admin/ines-standard-video/fill-selected
POST /api/admin/ines-standard-video/fill-pending
```

O `MediaAutoFill` também usa essa estratégia depois dos manifestos e antes do HTML/probing ao vivo. Se a URL padrão não validar, a ação recomendada é verificar manualmente no INES ou adicionar a URL real ao manifesto autorizado.

## Catálogo automático de mídias Libras

O projeto possui crawlers administrativos e controlados para gerar manifestos JSON a partir de fontes autorizadas, sem baixar vídeos/GIFs e sem alterar o banco automaticamente.

Regras:

- o crawler não roda em build, deploy, startup, seed ou migration;
- os endpoints ficam bloqueados por padrão com `CRAWLER_ENABLED=false`;
- scripts locais são executados manualmente por admin/desenvolvedor;
- o crawler respeita limite de páginas, delay, timeout, domínio permitido e user-agent identificável;
- os manifestos devem ser revisados antes de importar;
- a importação de manifesto mantém sinais como `pending`;
- `image_url` continua sendo apoio visual;
- o Avatar exige `video_url`, `avatar_video_url`, `avatar_gif_url` ou `avatar_animation_url`.

Variáveis:

```env
CRAWLER_ENABLED=false
CRAWLER_MAX_PAGES=500
CRAWLER_DELAY_MS=1000
CRAWLER_TIMEOUT_SECONDS=20
CRAWLER_USER_AGENT=LibrasLiveEdu-authorized-crawler/1.0
CRAWLER_OUTPUT_DIR=backend/data/generated
CRAWLER_RESPECT_ROBOTS=true
CRAWLER_ALLOW_EXTERNAL_DOMAINS=false
```

Scripts locais:

```bash
cd backend
python scripts/crawl_ines_media.py --max-pages 100 --output data/generated/ines_video_manifest.generated.json
python scripts/crawl_libras_gifs.py --max-pages 100 --output data/generated/libras_gif_manifest.generated.json
python scripts/crawl_ines_media.py --only-word aprender --dry-run
python scripts/crawl_ines_media.py --words-from-db --limit 50
```

Endpoints administrativos opcionais:

```bash
POST /api/admin/crawl/ines-media/start
POST /api/admin/crawl/libras-gifs/start
GET /api/admin/crawl/{job_id}
POST /api/admin/import/media-manifest
```

A tela `/admin/media-crawler` permite rodar lotes pequenos, visualizar relatório, revisar manifesto e importar as entradas como pendentes. Depois disso, `/admin/media-auto-fill` passa a consultar os manifestos gerados antes de fazer HTML/probing/IFPR ao vivo, aumentando a chance de preencher URLs sem cadastro palavra por palavra.

O manifesto INES resolve casos em que o nome real do arquivo não segue o padrão `{palavra}Sm_Prog001.mp4`. Por exemplo, se `escolaSm_Prog001.mp4` retornar 404, o preenchimento automático não salva essa URL chutada. Ele primeiro consulta `backend/data/generated/ines_video_manifest.generated.json`; se a entrada `escola` existir ali com uma URL real validada, usa `video_url`/`avatar_video_url` do manifesto e só depois considera HTML/probing ao vivo.

Ordem usada pelo preenchimento automático:

1. Manifesto INES gerado por crawler.
2. Manifesto manual/autorizado em `backend/data/generated`.
3. HTML, scripts, JSON e probing controlado do INES.
4. Manifesto/lookup de GIFs autorizados.
5. Imagem de apoio.
6. Nenhuma mídia.

Arquivos JPG/PNG, inclusive `/public/media/mao/*.jpg`, continuam entrando apenas em `image_url` e nunca contam como Avatar Libras.

## Uso de GIFs como mídia complementar no Avatar Libras

O LibrasLive Edu também aceita GIFs autorizados como mídia complementar para sinais em Libras. O GIF é um fallback leve quando ainda não houver vídeo aprovado, mas não substitui validação por especialista nem a atuação de intérprete humano.

Regras:

- o campo do banco é `avatar_gif_url`;
- GIFs não são baixados no build/deploy/startup e não devem ser salvos no Git;
- todo GIF precisa registrar `source_name`, `source_url`, `source_reference_url`, `license` e `license_notes`;
- novos GIFs entram como `pending` e só aparecem como oficiais depois de curadoria;
- o Avatar usa prioridade `avatar_video_url` > `video_url` > `avatar_gif_url` > `avatar_animation_url` > fallback visual;
- `image_url` é somente apoio visual/card e não deve ser tratada como tradução animada;
- cards visuais mostram `Com vídeo`, `Com GIF`, `Com imagem de apoio` ou `Sem mídia` conforme o sinal aprovado.

Importação por manifesto:

```json
[
  {
    "word": "professor",
    "gloss": "PROFESSOR",
    "avatar_gif_url": "https://...",
    "source_name": "IFPR Campus Umuarama - Libras GIFs",
    "source_url": "https://ifpr.edu.br/umuarama/libras-gifs/",
    "source_reference_url": "https://ifpr.edu.br/umuarama/libras-gifs/",
    "license": "Uso autorizado ou licença identificada para apoio educacional",
    "license_notes": "GIF utilizado como apoio visual em Libras, com fonte registrada.",
    "curator_notes": "Mídia GIF cadastrada para revisão por especialista em Libras.",
    "authorized": true
  }
]
```

Endpoint administrativo:

```bash
POST /api/admin/import/libras-gif-media
```

Esse endpoint é `admin only`, não baixa arquivos, apenas vincula URL remota autorizada, registra auditoria `gif_media_import` e mantém os sinais como `pending` para revisão.

## Speech-to-Text e Avatar

- Backend: `DemoSpeechToTextProvider`, `GoogleSpeechToTextProvider`, `AzureSpeechProvider` e `WhisperProvider`.
- Frontend: reconhecimento de fala do navegador quando disponível.
- O app envia texto transcrito por padrão e não armazena áudio bruto.
- O `AvatarPanel` renderiza vídeo quando `avatar_video_url`/`video_url` existir, usa `avatar_gif_url` como fallback complementar aprovado, aceita `avatar_animation_url` como mídia animada futura e mostra fallback visual quando houver apenas `image_url` ou nenhuma mídia animada.

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
