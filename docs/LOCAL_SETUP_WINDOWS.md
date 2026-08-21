# Ambiente local no Windows

Este guia prepara o LibrasLive Edu para desenvolvimento local com PostgreSQL e Redis no Docker, backend FastAPI na porta `8000` e frontend Next.js na porta `3000` ou `3010`.

## Pré-requisitos

- Windows 10 ou 11 com PowerShell.
- Git.
- Python 3.11 ou 3.12.
- Node.js 20 e npm.
- Docker Desktop com o engine em execução.

Na raiz do repositório, confirme o Docker:

```powershell
docker ps
```

Se o comando responder normalmente, inicie somente as dependências locais:

```powershell
docker compose up -d postgres redis
docker ps
```

## Backend na porta 8000

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
alembic upgrade head
python scripts/seed_database.py
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Valide em outro terminal:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/ready
```

`/health` confirma que o processo está vivo. `/ready` retorna sucesso apenas quando as dependências configuradas, como PostgreSQL e Redis, estão disponíveis.

## Frontend nas portas 3000 ou 3010

```powershell
cd frontend
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Se a porta `3000` estiver ocupada:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3010
```

Para desenvolvimento, a API aceita `localhost` e `127.0.0.1` nas portas `3000` e `3010`. Use no arquivo local não versionado:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true
```

`NEXT_PUBLIC_API_URL` deve conter apenas a origem do backend. Não acrescente `/api`; o cliente normaliza esse valor para evitar `/api/api`.

## Contas de demonstração

Depois do seed, use a senha `LibrasLive#2026` apenas no ambiente local:

| Perfil | E-mail |
| --- | --- |
| Admin | `admin@libraslive.local` |
| Curador | `curador.demo@libraslive.local` |
| Professor | `professor.demo@libraslive.local` |
| Aluno | `aluno.demo@libraslive.local` |

Nunca reutilize essas credenciais em produção. O backend recusa inicialização em produção quando `DEMO_MODE=true`, a chave é fraca, o banco é local ou o CORS contém localhost.

## Testes locais

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

Frontend:

```powershell
cd frontend
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes Playwright precisam do backend, PostgreSQL e Redis ativos, das migrations aplicadas e do seed carregado.

## Erros comuns

### Docker responde 500 Internal Server Error

Abra o Docker Desktop e aguarde o engine ficar pronto. Rode `docker info` e `docker ps`. Se o erro persistir, reinicie o Docker Desktop e confirme que o contexto ativo é o padrão (`docker context ls`).

### Porta 3000 ocupada

Inicie o frontend na `3010`. O CORS local já contempla essa porta. Evite encerrar processos que não pertencem a este projeto sem antes identificá-los.

### Requisições chegam em `/api/api`

Configure `NEXT_PUBLIC_API_URL=http://localhost:8000`, sem `/api`. Reinicie o servidor Next.js depois de alterar variáveis públicas.

### PostgreSQL não está rodando

Confira `docker ps`, depois execute `docker compose up -d postgres`. Aguarde o health check ficar saudável e rode novamente `alembic upgrade head`.

### Login mantém o perfil anterior

Use **Sair** antes de trocar de perfil. O frontend limpa access token, refresh token e usuário da sessão; uma falha no refresh também encerra a sessão. Se estiver testando chunks antigos em desenvolvimento, pare o Next.js, remova `.next` e inicie novamente.
