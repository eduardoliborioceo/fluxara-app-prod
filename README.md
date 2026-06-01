
# Fluxara — Gestão Financeira e Apostas

Aplicação **Fullstack Flask** (MVC) para **controle financeiro pessoal e gestão de apostas esportivas**, com módulos de saúde, ferramentas de análise e painel administrativo.

> 🇧🇷 Este README é a referência principal.

---

## ☁️ Infraestrutura (Railway)

| Ambiente | Branch | Banco | Domínio |
|---|---|---|---|
| Produção | `main` | `banco_prod` | `fluxara.app` |
| Desenvolvimento | `develop` | `banco_test` | — |

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
│   ├─ __init__.py
│   ├─ config.py
│   ├─ extensions.py
│   ├─ health.py
│   │
│   ├─ auth/
│   │   ├─ models.py
│   │   ├─ repository.py
│   │   ├─ profile_repository.py
│   │   ├─ routes.py
│   │   ├─ service.py
│   │   └─ decorators.py
│   │
│   ├─ repositories/
│   │   ├─ apostas_tips_repository.py
│   │   ├─ assinaturas_repository.py
│   │   ├─ backup_repository.py
│   │   ├─ cartoes_repository.py
│   │   ├─ config_repository.py
│   │   ├─ contas_repository.py
│   │   ├─ dev_repository.py
│   │   ├─ lancamentos_repository.py
│   │   ├─ notificacoes_orcamento_repository.py
│   │   ├─ orcamentos_repository.py
│   │   ├─ push_repository.py
│   │   ├─ saude_repository.py
│   │   ├─ surebet_repository.py
│   │   ├─ suporte_repository.py
│   │   ├─ tags_repository.py
│   │   └─ transferencias_repository.py
│   │
│   ├─ routes/
│   │   ├─ admin.py
│   │   ├─ api.py
│   │   ├─ dev.py
│   │   └─ pages.py
│   │
│   ├─ services/
│   │   ├─ apostas_apifootball_service.py
│   │   ├─ apostas_espn_service.py
│   │   ├─ apostas_tips_service.py
│   │   ├─ assistente_service.py
│   │   ├─ assinaturas_service.py
│   │   ├─ backup_service.py
│   │   ├─ cartao_notification_service.py
│   │   ├─ cartoes_service.py
│   │   ├─ config_service.py
│   │   ├─ contas_service.py
│   │   ├─ dev_service.py
│   │   ├─ email_service.py
│   │   ├─ lancamentos_service.py
│   │   ├─ orcamentos_service.py
│   │   ├─ push_service.py
│   │   ├─ saude_notification_service.py
│   │   ├─ saude_service.py
│   │   ├─ surebet_service.py
│   │   ├─ suporte_service.py
│   │   ├─ tags_service.py
│   │   └─ transferencias_service.py
│   │
│   ├─ templates/
│   │   ├─ admin/
│   │   │   ├─ backups.html
│   │   │   └─ suporte.html
│   │   ├─ auth/
│   │   │   ├─ assinaturas.html
│   │   │   ├─ login.html
│   │   │   ├─ myperfil.html
│   │   │   ├─ register.html
│   │   │   ├─ reset_password.html
│   │   │   ├─ forgot_password.html
│   │   │   ├─ users_admin.html
│   │   │   └─ mobile/
│   │   ├─ dev/
│   │   │   ├─ painel.html
│   │   │   └─ novo_projeto.html
│   │   ├─ errors/
│   │   ├─ layouts/
│   │   │   ├─ app.html
│   │   │   └─ auth.html
│   │   ├─ legal/
│   │   ├─ apostas.html
│   │   ├─ configuracoes.html
│   │   ├─ contas.html
│   │   ├─ extrato_cartao.html
│   │   ├─ extrato_conta.html
│   │   ├─ mais.html
│   │   ├─ minha_saude.html
│   │   ├─ nova_transferencia.html
│   │   ├─ novo_lancamento.html
│   │   ├─ planejamento.html
│   │   ├─ resumo.html
│   │   └─ surebet.html
│   │
│   └─ static/
│       ├─ css/
│       ├─ js/
│       ├─ images/
│       ├─ manifest.webmanifest
│       └─ sw.js
│
├─ migrations/
├─ .gitignore
├─ LICENSE
├─ Procfile
├─ requirements.txt
├─ run.py
└─ runtime.txt
```

---

## ⚙️ Tecnologias

- **Python 3.12** / **Flask 3**
- **Jinja2** / **Bootstrap 5**
- **PostgreSQL** via psycopg
- **JavaScript Vanilla**
- **APScheduler** (backup agendado, notificações)
- **cryptography** (AES-256 para backup)
- **PWA** (Service Worker + Manifest)
- **SendGrid** (email)
- **Cloudinary** (upload de imagens)
- **pywebpush** (notificações push VAPID)
- **ESPN API** (dados esportivos — sem chave)
- **API-Football** (dados europeus/globais — chave necessária)

---

## 🔐 Variáveis de Ambiente

Configure no Railway:

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

# Backup (ativa criptografia AES-256)
BACKUP_ENCRYPTION_KEY=

# Apostas
API_FOOTBALL_KEY=

# IA / Assistente
ANTHROPIC_API_KEY=
```

---

## ▶️ Rodando Localmente

```bash
git clone https://github.com/eduardoliborioceo/fluxara-app-prod.git
cd fluxara-app-prod
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python run.py
```

Acesse: `http://127.0.0.1:5000`

---

## 🗃 Banco de Dados (Railway)

```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" "%DATABASE_URL%"
```

---

## 🔁 Funcionalidades

### Resumo
- Visão geral mensal: receitas, despesas e saldo com ícones coloridos
- Saldo total das contas e projeção dos próximos 90 dias
- Cartões de crédito com logo da conta vinculada + bandeira (Visa, Mastercard, Elo, Amex)
- Débitos vencidos com atraso em dias
- Despesas por conta e por categoria (gráficos)
- Visibilidade de cards configurável por usuário

### Contas
- Cadastro de contas bancárias por tipo (conta corrente, poupança, investimento, etc.)
- Saldo real atualizado automaticamente a cada lançamento
- Acesso direto ao extrato de cada conta pelo card de contas no Resumo

### Extrato por Conta
- Histórico mensal de lançamentos
- Filtro de status (Todas / Efetivadas / Pendentes) via select
- Filtro por tag via select (com exclusão de tag)
- Filtro por intervalo de datas
- Modo de seleção múltipla para ações em lote
- Edição e exclusão de lançamentos via bottom sheet

### Extrato por Cartão
- Histórico por fatura (mês/ano)
- Edição e exclusão de despesas
- Indicador de fatura aberta/fechada

### Lançamentos
- Receitas, despesas, parcelamentos e recorrências
- Suporte a transferências entre contas
- Parcelas futuras criadas como pendentes
- Tags personalizadas por lançamento

### Planejamento
- Orçamento mensal por categoria
- Assistente de planejamento via IA (Anthropic Claude)
- Notificações quando orçamento é excedido

### Apostas
- Registro e acompanhamento de apostas esportivas
- Integração com ESPN (notícias, tabelas e partidas — 50+ ligas)
- Integração com API-Football (ligas europeias e globais, odds)
- Tips de apostas por partida
- Dashboard de resultados e ROI

### Surebet
- Calculadora de arbitragem (surebet) entre casas de apostas
- Histórico de operações

### Categorias
- Categorias e subcategorias personalizadas por usuário
- Cor de fundo personalizável (paleta + seletor livre)
- Banco de ícones com 100+ Bootstrap Icons organizados por tema

### Minha Saúde
- Registro e acompanhamento de métricas de saúde
- Notificações e histórico

### Configurações
- Tema claro/escuro por usuário
- Gerenciamento de cartões de crédito (bandeira, limite, conta vinculada)
- **Gastos Developer** — tipos de custo agrupados por categoria (infra, domínio, CDN, e-mail, API, etc.)
- Configuração de notificações push

### Backup
- Interface admin em `/admin/backups`
- Execução via `pg_dump` com compressão `.sql.gz`
- Criptografia AES-256 opcional
- Checksum SHA-256 por arquivo
- Agendamento automático (diário, semanal, mensal)
- Download de backups pelo histórico de execuções

### Auth / Perfil
- Login desktop com split-card (painel azul + formulário)
- Show/hide senha (desktop e mobile)
- OAuth Google e GitHub com botões circulares
- Cadastro com aprovação automática
- Exclusão de conta pelo usuário com modal de confirmação
- Política de rotação de senha a cada 180 dias
- Avatar no header mobile como link direto para Meu Perfil
- Menu inferior mobile: Resumo, Planejamento, Assinaturas, Mais

### Admin
- Gerenciamento de usuários (`/admin/users`)
- Suporte e chamados (`/admin/suporte`)
- Backups (`/admin/backups`)

### Dev
- Painel de projetos e custos de desenvolvimento (`/dev/painel`)
- Registro de novos projetos

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
- `GET /apostas`
- `GET /surebet`
- `GET /minha-saude`
- `GET /conta/<id>/extrato`
- `GET /cartao/<id>/extrato`
- `GET /novo-lancamento`
- `GET /nova-transferencia`
- `GET /admin/backups`
- `GET /dev/painel`

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
- `GET /api/apostas/partidas`
- `GET /api/apostas/tabela/<liga>`

---

## 📱 PWA

- Suporte offline via Service Worker
- Instalação em dispositivos móveis (Android/iOS)
- `app/static/manifest.webmanifest`
- `app/static/sw.js`

---

## 👨‍💻 Autor

**Eduardo Libório**
📧 `eduardosolenomorizliborio@gmail.com`

---

## 📄 Licença

Projeto de uso privado/pessoal.
