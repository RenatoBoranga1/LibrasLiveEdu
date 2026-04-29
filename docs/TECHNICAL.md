# Documentação técnica

## Arquitetura

O projeto usa um monorepo com `backend` e `frontend`.

- `backend/app/api`: controladores FastAPI.
- `backend/app/models`: modelos SQLAlchemy.
- `backend/app/services`: regras de negócio e módulos de IA/NLP.
- `backend/app/importers`: importação de dicionários autorizados.
- `backend/app/providers`: adapters externos, incluindo VLibras.
- `backend/app/websocket`: gestão de conexões em tempo real.
- `frontend/src/app`: rotas Next.js.
- `frontend/src/components`: componentes reutilizáveis acessíveis.
- `frontend/src/services`: cliente HTTP/WebSocket.

## Fluxo WebSocket

Professor fala ou aciona o modo demo → backend recebe texto → normaliza → divide em blocos → cria `TranscriptSegment` → extrai palavras-chave → consulta `Sign` → tenta tradução Libras → envia eventos:

- `class.started`
- `transcript.segment.created`
- `translation.created`
- `keywords.detected`
- `sign.card.created`
- `class.paused`
- `class.finished`
- `summary.created`

## Política sobre Libras

O sistema nunca inventa sinais. Quando não há fonte autorizada ou curadoria, o registro fica como `pending`. Dados de demonstração são identificados como seed/local e não devem ser usados como sinais oficiais.

## Banco de dados

A migration inicial cria todas as tabelas solicitadas:

`users`, `class_sessions`, `transcript_segments`, `libras_translations`, `signs`, `sign_categories`, `subjects`, `keywords_detected`, `import_jobs`, `saved_words`, `lesson_summaries`.

## Exportação PDF

`PdfExportService` gera PDF com título, código da aula, observação de acessibilidade, resumo e transcrição. Para produção, adicione professor, disciplina, palavras salvas e templates visuais conforme identidade institucional.
