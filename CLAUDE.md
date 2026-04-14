# CLAUDE.md — Quiz Factory

## Contexto do projeto
Plataforma de criação e gestão de quizzes/formulários multi-step com analytics profundo.
React 18 + Vite (frontend), Express (dev) e Vercel Serverless (produção). PostgreSQL como banco de dados.

## Arquitetura: Clean Architecture + Factory Method

```
src/core/           → Domínio puro (entidades, use cases) — sem React, sem DB
src/infrastructure/ → Implementações concretas (API HTTP client)
src/presentation/   → React (pages, components, hooks)
api/                → Backend Express/Serverless
db/                 → Schema, migrations, seed
```

## Regras obrigatórias

### SOLID
- **SRP**: cada componente/módulo tem uma única responsabilidade
- **OCP**: adicionar novo tipo de pergunta = novo arquivo em `question-types/` + registro em `QuestionFactory.jsx`, sem modificar código existente
- **LSP**: todos os question-type components têm a mesma interface `{ question, value, onChange, theme }`
- **ISP**: `IQuizRepository` e `ISessionRepository` são interfaces separadas (JSDoc)
- **DIP**: use cases dependem de interfaces, não de implementações concretas

### Factory Method — tipos de pergunta
Ao adicionar novo tipo:
1. Criar `src/presentation/components/question-types/NovoTipoQuestion.jsx`
2. Registrar em `QuestionFactory.jsx` via `registry[type] = Component`
3. **NUNCA** modificar `QuizPlayer.jsx` para adicionar um tipo

Tipos existentes: `welcome | text | longtext | choice | multichoice | date | rating`

### Database (PostgreSQL)
- **NUNCA** criar tabela por quiz — usar coluna `quiz_id`
- **SEMPRE** upsert em answers: `ON CONFLICT (session_id, question_id) DO UPDATE`
- Soft delete: coluna `deleted_at TIMESTAMPTZ`, nunca `DELETE` em quizzes/questions
- Fractional indexing em `questions.order_key` (REAL, não INTEGER sequencial)
- WAL mode não necessário no PostgreSQL (nativo)
- Connection pool: `postgres.js` com `max: 10`
- IP armazenado apenas como hash (LGPD)

### Deploy
- **SEMPRE perguntar ao usuário antes de fazer deploy. Nunca fazer deploy automaticamente.**
- `.env` local com `DATABASE_URL=postgresql://...`
- Vercel usa variáveis de ambiente do dashboard

### Paridade server.js ↔ api/index.js
**CRÍTICO:** Toda rota deve existir em ambos os arquivos.

### Analytics
- `time_spent_ms` calculado no frontend, enviado junto com cada answer
- Eventos `tab_hidden`/`tab_visible` rastreados para excluir tempo idle
- View materializada `quiz_funnel` — refrescar com `REFRESH MATERIALIZED VIEW quiz_funnel`
- `value_numeric` preenchido para tipos rating e date (epoch ms)
- `value_vector` preenchido para multichoice (array de 0/1)

### Sessões
- `sessionId` gerado no frontend (UUID v4), persistido em `localStorage`
- Answers salvas a cada avanço de etapa (não só no submit)
- Evento `step_viewed` salvo ao entrar numa etapa
- Evento `step_answered` salvo ao avançar

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| Roteamento | react-router-dom v7 |
| Backend (local) | Express 5, Node ESM (`"type":"module"`) |
| Backend (prod) | Vercel Serverless (`api/index.js`) |
| Banco de dados | PostgreSQL (`postgres` v3) |
| Auth admin | JWT (jsonwebtoken), 24h, bcryptjs |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Charts | recharts |
| Testes | Jest + Testing Library (a adicionar) |

## Design Tokens padrão (sobrescritíveis por quiz via ThemeProvider)

```js
primary:    '#6C5CE7'  // roxo — padrão quiz factory
bg:         '#0f0f0f'  // fundo escuro
surface:    '#1a1a1a'  // cards, inputs
border:     '#2a2a2a'  // bordas sutis
success:    '#00B894'  // verde confirmação
danger:     '#E17055'  // laranja erro
text:       '#ffffff'  // texto principal
muted:      '#888888'  // texto secundário
```

Todos os componentes usam `var(--color-primary)` etc. — zero props de tema passando pela árvore.

## Variáveis de ambiente (.env local / Vercel)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/quizz_factory
JWT_SECRET=quizz_factory_secret_2026
ADMIN_USER=admin
ADMIN_PASS=admin123
PORT=3001
```

## Comandos úteis
```bash
npm run dev          # Vite (5174) + Express (3001) em paralelo
npm run db:migrate   # Executa db/schema.sql no PostgreSQL
npm run db:seed      # Insere quiz de exemplo
npm run build        # Build Vite para dist/
```

## Estrutura de rotas

### Públicas
- `GET  /`               → HomePage (lista quizzes publicados)
- `GET  /:slug`          → QuizPage (responder quiz)
- `GET  /api/quizzes`    → JSON lista quizzes publicados
- `GET  /api/quizzes/:slug` → JSON quiz + perguntas (JOIN)
- `POST /api/sessions`   → Criar/retomar sessão
- `PUT  /api/sessions/:id/answers` → Upsert answer
- `POST /api/sessions/:id/events`  → Salvar evento de analytics
- `POST /api/sessions/:id/complete` → Marcar como concluído

### Admin (JWT obrigatório)
- `POST /api/admin/auth/login`
- `GET  /api/admin/quizzes`
- `POST /api/admin/quizzes`
- `PUT  /api/admin/quizzes/:id`
- `DELETE /api/admin/quizzes/:id`      → Soft delete
- `POST /api/admin/quizzes/:id/publish`
- `GET  /api/admin/quizzes/:id/questions`
- `POST /api/admin/quizzes/:id/questions`
- `PUT  /api/admin/questions/:id`
- `DELETE /api/admin/questions/:id`
- `POST /api/admin/questions/reorder`
- `GET  /api/admin/quizzes/:id/sessions`
- `GET  /api/admin/quizzes/:id/analytics`
- `GET  /api/admin/quizzes/:id/export`  → CSV download
