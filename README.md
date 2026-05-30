
# Fluxara — Controle Financeiro Pessoal

Aplicação **Fullstack Flask** (MVC) para **gestão financeira pessoal**, com:

- **Contas bancárias** com saldo real e projeção de saldo
- **Cartões de crédito** com controle de fatura por mês
- **Lançamentos** (receitas, despesas, parcelamentos, recorrências)
- **Transferências** entre contas
- **Projeção de saldo** — visualização do saldo futuro por linha do tempo
- **Categorias e subcategorias** personalizadas
- **Planejamento** mensal por categorias
- **Backup automático** do banco com agendamento, criptografia AES-256 e logs
- **PWA** (offline + manifest + service worker)
- **Autenticação local + OAuth** (Google / GitHub) com botões circulares, show/hide senha
- **Cadastro com aprovação automática** — novos usuários ficam ativos imediatamente
- **Exclusão de conta** pelo próprio usuário com confirmação
- **Notificações push** via VAPID

> 🇧🇷 Este README é a referência principal.
> 🇺🇸 For the English version, see `README.EN.md`.

---

## ☁️ Infraestrutura (Railway)

Este projeto roda em **Railway + PostgreSQL** e possui **dois ambientes** separados por branch:

### ✅ Produção
- **Service:** `fluxara-app-prod`
- **Branch:** `main`
- **DB:** `banco_prod`
- **Domínio:** `fluxara.app`

### ✅ Desenvolvimento
- **Service:** `fluxara-app-develop`
- **Branch:** `develop`
- **DB:** `banco_test`

### Deploy seguro (fluxo recomendado)
1. Trabalhar e validar na branch `develop`
2. Abrir Pull Request para `main` via GitHub
3. Produção nunca quebra durante uso

---

## 🧱 Arquitetura (MVC + Services/Repositories)

| Camada | Responsabilidade |
|---|---|
| Models | Estrutura e mapeamento de dados |
| Repositories | Acesso ao banco (SQL isolado via psycopg) |
| Services | Regras de negócio, cálculos, validações |
| Controllers / Routes | Orquestração de requisição/resposta |
| Templates | Apresentação (Jinja2, sem lógica) |
| Static | CSS e JS separados do HTML |

---

## 🗂 Estrutura do Projeto

```
├─ app/
│   ├─ __init__.py              # create_app()
│   ├─ config.py                # Configurações / env
│   ├─ extensions.py            # DB (psycopg)
│   │
│   ├─ auth/
│   │   ├─ models.py
│   │   ├─ repository.py
│   │   ├─ routes.py
│   │   └─ service.py
│   │
│   ├─ repositories/
│   │   ├─ backup_repository.py
│   │   ├─ cartoes_repository.py
│   │   ├─ config_repository.py
│   │   ├─ contas_repository.py
│   │   ├─ lancamentos_repository.py
│   │   ├─ push_repository.py
│   │   └─ transferencias_repository.py
│   │
│   ├─ routes/
│   │   ├─ admin.py             # Rotas administrativas
│   │   ├─ api.py               # API REST (JSON)
│   │   └─ pages.py             # Rotas HTML
│   │
│   ├─ services/
│   │   ├─ backup_service.py
│   │   ├─ cartoes_service.py
│   │   ├─ config_service.py
│   │   ├─ contas_service.py
│   │   ├─ email_service.py
│   │   ├─ lancamentos_service.py
│   │   ├─ push_service.py
│   │   └─ transferencias_service.py
│   │
│   ├─ templates/
│   │   ├─ admin/
│   │   │   └─ backups.html
│   │   ├─ auth/
│   │   ├─ layouts/
│   │   │   └─ app.html
│   │   ├─ legal/
│   │   ├─ configuracoes.html
│   │   ├─ contas.html
│   │   ├─ dashboard.html
│   │   ├─ extrato_cartao.html
│   │   ├─ extrato_conta.html
│   │   ├─ nova_transferencia.html
│   │   ├─ novo_lancamento.html
│   │   ├─ planejamento.html
│   │   └─ resumo.html
│   │
│   └─ static/
│       ├─ css/
│       ├─ js/
│       ├─ images/
│       ├─ manifest.webmanifest
│       └─ sw.js
│
├─ migrations/
├─ tests/
├─ .gitignore
├─ LICENSE
├─ Procfile
├─ requirements.txt
├─ run.py
└─ runtime.txt
```

---

## ⚙️ Tecnologias

- **Python 3.12**
- **Flask 3**
- **Jinja2**
- **PostgreSQL** (psycopg)
- **Bootstrap 5**
- **JavaScript Vanilla**
- **APScheduler** (backup agendado)
- **cryptography** (AES-256 para backup)
- **PWA** (Service Worker + Manifest)
- **SendGrid** (email)
- **Cloudinary** (imagens)
- **pywebpush** (notificações push VAPID)

---

## 🔐 Variáveis de Ambiente

Configure no Railway (não use `.env` em produção):

```env
# App
ENVIRONMENT=development
SECRET_KEY=change-me
BASE_URL=http://127.0.0.1:5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fluxara

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# SMTP / SendGrid
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SENDGRID_API_KEY=
SENDGRID_FROM=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Push (VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_CLAIMS_SUB=mailto:admin@fluxara.app

# Backup (opcional — ativa criptografia AES-256)
BACKUP_ENCRYPTION_KEY=
```

---

## ▶️ Rodando Localmente

```bash
# 1. Clonar
git clone https://github.com/eduardoliboriox/fluxara-app-prod.git
cd fluxara-app-prod

# 2. Ambiente virtual
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. Dependências
pip install -r requirements.txt

# 4. Executar
python run.py
```

Acesse: `http://127.0.0.1:5000`

---

## 🗃 Banco de Dados (Railway — via psql no Windows)

```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" "%DATABASE_URL%"
```

---

## 🔁 Principais Funcionalidades

### Resumo
- Saldo total das contas com ícones coloridos por tipo (receitas, despesas, saldo, projeção)
- Visão geral mensal (receitas, despesas, saldo)
- Débitos vencidos — card dedicado mostrando apenas despesas não pagas com atraso em dias
- Projeção de saldo — linha do tempo dos próximos 90 dias
- Cartões de crédito com logo da conta vinculada + bandeira
- Visibilidade de cards configurável por usuário

### Extrato por Conta
- Histórico mensal com filtro de mês
- Filtros de status e tags como selects (interface limpa, sem pills)
- Edição e exclusão de lançamentos
- Suporte a receitas, despesas e transferências
- Parcelas futuras sempre criadas como pendentes (efetivado apenas na parcela inicial)

### Extrato por Cartão
- Histórico por fatura (mês/ano)
- Edição e exclusão de despesas do cartão

### Apostas
- Integração com ESPN (notícias esportivas)
- Integração com API-Football (dados de partidas e odds)
- Cards de odds por partida

### Categorias
- Categorias e subcategorias personalizadas por usuário
- Cor de fundo personalizável por categoria (paleta de cores + seletor livre)
- Banco de ícones expandido (+100 ícones Bootstrap Icons organizados por tema)

### Configurações
- Tema claro/escuro por usuário
- Gerenciamento de cartões de crédito
- Gastos Developer — tipos de custo personalizados por grupo (infra, domínio, CDN, email, etc.)
- Avatar do header mobile como link direto para Meu Perfil
- Menu inferior mobile: Assinaturas substituiu Perfil

### Backup
- Interface admin em `/admin/backups`
- Execução via `pg_dump` com compressão `.sql.gz`
- Criptografia AES-256 opcional
- Checksum SHA-256 por backup
- Agendamento automático (diário/semanal/mensal)
- Download de backups pelo histórico

### Auth / Perfil
- Login desktop com split-card (painel azul + formulário)
- Show/hide senha no login (desktop e mobile)
- OAuth Google e GitHub com botões circulares lado a lado
- Cadastro com aprovação automática (sem necessidade de admin aprovar)
- Exclusão de conta pelo usuário com modal de confirmação
- Política de privacidade e cookies com design e conteúdo atualizados

---

## 🔒 Segurança

- Queries parametrizadas em todo o repositório (sem SQL injection)
- Senhas com hash seguro (werkzeug)
- Política de senha rigorosa (10+ chars, maiúscula, número, especial)
- Rotação de senha obrigatória a cada 180 dias
- Upload de avatar com validação de extensão e limite de 5 MB
- Backup com criptografia AES-256 e checksum SHA-256
- Error handlers (404/500) sem exposição de stack traces
- Token de reset de senha marcado como usado antes do update
- SECRET_KEY obrigatória — aplicação não inicia sem ela

---

## 🧩 Endpoints Principais

### Pages (HTML)
- `GET /` → resumo
- `GET /contas`
- `GET /planejamento`
- `GET /configuracoes`
- `GET /conta/<id>/extrato`
- `GET /cartao/<id>/extrato`
- `GET /novo-lancamento`
- `GET /nova-transferencia`
- `GET /admin/backups`

### API (JSON)
- `GET /api/contas`
- `GET /api/cartoes`
- `GET /api/resumo/visao-geral`
- `GET /api/resumo/projecao-saldo`
- `GET /api/resumo/debitos-vencidos`
- `GET /api/contas/<id>/lancamentos`
- `GET /api/cartoes/<id>/lancamentos`
- `POST /api/lancamentos`
- `PUT /api/lancamentos/<id>`
- `DELETE /api/lancamentos/<id>`
- `POST /api/transferencias`
- `DELETE /api/transferencias/<id>`

---

## 📱 PWA

- `app/static/manifest.webmanifest`
- `app/static/sw.js`
- Suporte offline, instalação em dispositivos móveis

---

## 👨‍💻 Autor

**Eduardo Libório**
📧 `eduardosoleno@protonmail.com`

---

## 📄 Licença

Projeto de uso privado/pessoal.
