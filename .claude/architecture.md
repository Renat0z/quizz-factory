# Semantic Architecture Tree — Quiz Factory

## Domínios de negócio

| Domínio | Descrição |
|---|---|
| **quiz-player** | Experiência pública: responder um quiz end-to-end |
| **quiz-listing** | Home pública: lista quizzes publicados |
| **admin-builder** | Admin: criar/editar quiz e perguntas |
| **admin-analytics** | Admin: métricas, funil, distribuições |
| **admin-auth** | Admin: login, proteção de rotas, JWT |

---

## Árvore semântica por domínio

### [quiz-player] — URL /:slug

```
QuizPage                          src/presentation/pages/QuizPage.jsx
 ├── useQuiz(slug)                 src/presentation/hooks/useQuiz.js
 │    └── GetQuizBySlug            src/core/usecases/GetQuizBySlug.js
 │         └── QuizApiRepository   src/infrastructure/api/QuizApiRepository.js
 │              └── GET /api/quizzes/:slug
 │
 └── QuizPlayer                    src/presentation/components/QuizPlayer.jsx
      ├── useQuizSession(quiz)      src/presentation/hooks/useQuizSession.js
      │    ├── Question.isAnswerValid()    src/core/entities/Question.js
      │    ├── Question.serializeAnswer()  src/core/entities/Question.js
      │    └── SessionApiRepository       src/infrastructure/api/SessionApiRepository.js
      │         ├── POST /api/sessions           (createOrResume)
      │         ├── PUT  /api/sessions/:id/answers (saveAnswer)
      │         ├── POST /api/sessions/:id/events  (saveEvent — fire-and-forget)
      │         └── POST /api/sessions/:id/complete (completeSession)
      │
      ├── ThemeProvider             src/presentation/components/ThemeProvider.jsx
      │    └── Quiz.resolveTheme()  src/core/entities/Quiz.js
      ├── ProgressBar               src/presentation/components/ProgressBar.jsx
      ├── NavButtons                src/presentation/components/NavButtons.jsx
      └── QuestionFactory           src/presentation/components/question-types/QuestionFactory.jsx
           ├── WelcomeQuestion      src/presentation/components/question-types/WelcomeQuestion.jsx
           ├── TextQuestion         src/presentation/components/question-types/TextQuestion.jsx
           │    └── RecordButton    src/presentation/components/RecordButton.jsx
           ├── LongTextQuestion     src/presentation/components/question-types/LongTextQuestion.jsx
           │    └── RecordButton    src/presentation/components/RecordButton.jsx
           ├── ChoiceQuestion       src/presentation/components/question-types/ChoiceQuestion.jsx
           ├── MultiChoiceQuestion  src/presentation/components/question-types/MultiChoiceQuestion.jsx
           ├── DateQuestion         src/presentation/components/question-types/DateQuestion.jsx
           └── RatingQuestion       src/presentation/components/question-types/RatingQuestion.jsx
```

### [quiz-listing] — URL /

```
HomePage                           src/presentation/pages/HomePage.jsx
 └── makeListQuizzes(repo)          src/core/usecases/ListQuizzes.js
      └── QuizApiRepository         src/infrastructure/api/QuizApiRepository.js
           └── GET /api/quizzes
```

### [admin-auth] — URL /admin/*

```
AdminApp                           src/presentation/pages/admin/AdminApp.jsx
 ├── isTokenValid(token)            (inline — JWT expiry check)
 ├── localStorage: qf_admin_token
 ├── LoginPage                      src/presentation/pages/admin/LoginPage.jsx
 │    └── POST /api/admin/auth/login
 └── AdminLayout                    src/presentation/pages/admin/AdminLayout.jsx
```

### [admin-builder] — URL /admin/quizzes/:id/edit

```
QuizBuilderPage                    src/presentation/pages/admin/QuizBuilderPage.jsx
 ├── SortableQuestion               (componente local inline — candidato a extração)
 ├── [fetch inline]                 (sem hook/repo — anti-pattern identificado)
 │    ├── GET/POST/PUT /api/admin/quizzes[/:id]
 │    ├── GET/POST/PUT/DELETE /api/admin/questions[/:id]
 │    └── POST /api/admin/questions/reorder
 ├── Quiz.slugify()                 src/core/entities/Quiz.js
 ├── Question.calcOrderKey()        src/core/entities/Question.js
 ├── getAvailableTypes()            src/presentation/components/question-types/QuestionFactory.jsx
 └── QuizPlayer (isPreview=true)    src/presentation/components/QuizPlayer.jsx
```

### [admin-analytics] — URL /admin/quizzes/:id/analytics

```
AnalyticsPage                      src/presentation/pages/admin/AnalyticsPage.jsx
 ├── KpiCard                        (componente local inline)
 ├── [fetch inline]
 │    └── GET /api/admin/quizzes/:id/analytics?days=N
 └── recharts: LineChart, BarChart, Cell

ResponsesPage                      src/presentation/pages/admin/ResponsesPage.jsx
 ├── StatusBadge                    (componente local inline)
 └── [fetch inline]
      ├── GET /api/admin/quizzes/:id/sessions
      └── GET /api/admin/quizzes/:id/questions
```

---

## Mapa de dependências

```
# Quiz player (público)
QuizPage          → useQuiz, QuizPlayer
useQuiz           → GetQuizBySlug → QuizApiRepository
QuizPlayer        → useQuizSession, ThemeProvider, ProgressBar, NavButtons, QuestionFactory
useQuizSession    → Question.isAnswerValid, Question.serializeAnswer, SessionApiRepository
QuestionFactory   → [7 question-type components]
TextQuestion      → RecordButton → POST /api/transcribe (Groq Whisper)
LongTextQuestion  → RecordButton → POST /api/transcribe (Groq Whisper)
ThemeProvider     → Quiz.resolveTheme

# Admin
AdminApp          → AdminLayout, LoginPage, DashboardPage, QuizBuilderPage, AnalyticsPage, ResponsesPage
QuizBuilderPage   → QuizPlayer (preview), QuestionFactory.getAvailableTypes, Quiz.slugify, Question.calcOrderKey

# Core — compartilhado
Quiz.resolveTheme    ← ThemeProvider, QuizPlayer
Quiz.slugify         ← QuizBuilderPage
Question.isAnswerValid  ← useQuizSession
Question.serializeAnswer ← useQuizSession
Question.calcOrderKey   ← QuizBuilderPage
QuestionFactory         ← QuizPlayer, QuizBuilderPage
```

---

## Guia: "Onde mudo X?"

| O que mudar | Arquivo(s) |
|---|---|
| UI de um tipo de pergunta | `question-types/XxxQuestion.jsx` |
| Adicionar novo tipo de pergunta | Criar `question-types/XxxQuestion.jsx` + registrar em `QuestionFactory.jsx` (nunca tocar `QuizPlayer`) |
| Lógica de navegação entre steps | `hooks/useQuizSession.js` → `goNext()` / `goBack()` |
| Branching condicional | `hooks/useQuizSession.js` → bloco `branch_rules` em `goNext()` |
| Analytics de tempo / tab hidden | `hooks/useQuizSession.js` → `tabHiddenTimeRef`, `getTimeSpent()` |
| Tela de sucesso | `components/QuizPlayer.jsx` → bloco `isSubmitted` |
| Auto-avanço após choice/rating | `components/QuizPlayer.jsx` → `handleChange()` |
| Validação de resposta | `core/entities/Question.js` → `isAnswerValid()` |
| Serialização para DB | `core/entities/Question.js` → `serializeAnswer()` |
| Design tokens padrão | `core/entities/Quiz.js` → `DEFAULT_THEME` |
| Como CSS vars chegam nos filhos | `components/ThemeProvider.jsx` |
| Chamadas HTTP de sessão | `infrastructure/api/SessionApiRepository.js` |
| Carregar quiz por slug | `infrastructure/api/QuizApiRepository.js` + `core/usecases/GetQuizBySlug.js` |
| Gravar/transcrever áudio | `components/RecordButton.jsx` + `POST /api/transcribe` em `server.js` / `api/index.js` |
| Builder de quiz (lógica) | `pages/admin/QuizBuilderPage.jsx` → `saveQuiz()`, `addQuestion()`, `handleDragEnd()` |
| Builder (editor de campos por tipo) | `pages/admin/QuizBuilderPage.jsx` → `SortableQuestion` (componente inline) |
| Gráficos de analytics | `pages/admin/AnalyticsPage.jsx` |
| Respostas / export CSV | `pages/admin/ResponsesPage.jsx` |
| Login admin | `pages/admin/LoginPage.jsx` |
| Proteção de rotas admin | `pages/admin/AdminApp.jsx` → `isTokenValid()` |
| Sidebar admin | `pages/admin/AdminLayout.jsx` |

---

## Anti-patterns identificados

| Problema | Localização | Impacto |
|---|---|---|
| **God Component** (639 linhas) | `QuizBuilderPage.jsx` | Alta — qualquer mudança no builder edita o mesmo arquivo |
| **Admin sem camada de serviço** | `QuizBuilderPage`, `AnalyticsPage`, `ResponsesPage`, `DashboardPage` | Média — `fetch` inline em 4 páginas; sem `AdminApiRepository` |
| **Componentes locais duplicados** | `KpiCard` (Analytics) ≈ `StatCard` (Dashboard) | Baixa — inconsistência visual vai divergir |
| **Use case não utilizado** | `core/usecases/SubmitSession.js` | Baixa — código morto |

---

## Regras arquiteturais inferidas

- **Naming**: `useXxx` (hooks), `XxxApiRepository` (infra), `makeXxx(repo)` (use cases), `XxxQuestion` (tipos), `XxxPage` (páginas), `XxxProvider` (contexto)
- **OCP para tipos de pergunta**: registry em `QuestionFactory.jsx` — nunca modificar `QuizPlayer.jsx` para adicionar tipo
- **Interface uniforme de question-type**: `{ question, value, onChange }` — todos os 7 tipos obedecem esse contrato
- **Paridade obrigatória**: toda rota em `server.js` deve existir em `api/index.js` (dev ↔ prod)
- **CSS vars, não prop-drilling**: tema injetado via `ThemeProvider` como `var(--color-primary)` etc.
- **Transcrição de áudio**: `RecordButton` → `POST /api/transcribe` → Groq Whisper (`whisper-large-v3`, `language: pt`)
- **Express 5**: não usar `app._router.stack` (router lazy — quebra no listen callback)
