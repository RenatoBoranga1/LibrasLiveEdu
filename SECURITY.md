# Security

LibrasLive Edu trata dados educacionais e de acessibilidade. Use HTTPS, segredo forte e contas com menor privilégio possível antes de qualquer uso real.

## Autenticacao

- JWT HS256 com `SECRET_KEY` configurável.
- Access token curto e refresh token separado.
- Tokens são guardados no `sessionStorage` do navegador, não no `localStorage`.
- Logout limpa tokens e solicita limpeza de cache da PWA.

## Perfis

- `admin`: estatisticas, importacao e gestao administrativa.
- `curator`: revisao, aprovacao e rejeicao de sinais.
- `professor`: aulas proprias.
- `student`: recursos pessoais autenticados.
- `guardian`: consentimento e direitos de dados.

Rotas administrativas, importacao e aprovacao de sinais exigem token e role adequada.

## WebSocket

- Aluno usa `/ws/classes/{access_code}/student?token=...` e apenas recebe eventos.
- Professor usa `/ws/classes/{access_code}/teacher?token=...` e precisa de JWT.
- Conexoes invalidas ou aulas finalizadas sao fechadas.
- Payloads de transcricao sao validados e limitados.

## Deploy Seguro

- `ENVIRONMENT=production`
- `DEMO_MODE=false`
- `SECRET_KEY` longa, aleatoria e fora do repositorio
- HTTPS obrigatorio
- CORS restrito ao domínio oficial
- Banco e Redis com credenciais fortes
- Logs sem áudio bruto e sem tokens

## Conteudo Sensivel

- Não armazenar áudio bruto sem consentimento específico.
- Não enviar dados sensíveis para serviços externos sem aviso, base legal e contrato adequado.
- Não cachear transcrições, tokens, admin ou endpoints privados no service worker.

## Vulnerabilidades

Reporte falhas ao responsavel tecnico do projeto/escola com:

- descricao do impacto;
- passos para reproduzir;
- rota ou arquivo afetado;
- evidencia sem expor dados de alunos.
