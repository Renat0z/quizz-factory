-- =============================================================================
-- Quiz Factory — Schema PostgreSQL
-- =============================================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- QUIZZES
-- =============================================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT        UNIQUE NOT NULL,
  name         TEXT        NOT NULL,
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft', 'published', 'archived')),
  version      INTEGER     NOT NULL DEFAULT 1,
  config       JSONB       NOT NULL DEFAULT '{}',
  -- config shape: {
  --   theme: { primary, bg, surface, border, text, muted },
  --   logo: string (URL ou base64),
  --   successTitle: string,
  --   successMessage: string,
  --   successRedirectUrl: string,
  --   showProgressCount: boolean,
  --   allowRetake: boolean,
  --   retentionDays: number
  -- }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ
);

-- =============================================================================
-- QUIZ VERSIONS (snapshot ao publicar — preserva histórico de perguntas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS quiz_versions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      UUID        NOT NULL REFERENCES quizzes(id),
  version      INTEGER     NOT NULL,
  questions    JSONB       NOT NULL,  -- array completo de perguntas no momento
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quiz_id, version)
);

-- =============================================================================
-- QUESTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS questions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      UUID        NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  order_key    REAL        NOT NULL DEFAULT 1.0,  -- fractional indexing
  type         TEXT        NOT NULL
               CHECK (type IN ('welcome','text','longtext','choice','multichoice','date','rating')),
  title        TEXT        NOT NULL,
  description  TEXT,
  placeholder  TEXT,
  options      JSONB,      -- [{label, value}] para choice/multichoice
  required     BOOLEAN     NOT NULL DEFAULT TRUE,
  config       JSONB       NOT NULL DEFAULT '{}',
  -- config shape por tipo:
  --   rating:  { min: 1, max: 5, labels: { min: 'Péssimo', max: 'Excelente' } }
  --   date:    { format: 'DD/MM/YYYY' }
  --   welcome: { buttonLabel: 'Começar' }
  branch_rules JSONB       NOT NULL DEFAULT '[]',
  -- branch_rules: [{ if_value: 'Sim', goto_question_id: 'uuid' }]
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SESSIONS (uma por respondente por quiz)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID        PRIMARY KEY,  -- gerado no frontend
  quiz_id         UUID        NOT NULL REFERENCES quizzes(id),
  quiz_version    INTEGER     NOT NULL DEFAULT 1,
  status          TEXT        NOT NULL DEFAULT 'started'
                              CHECK (status IN ('started', 'completed', 'abandoned')),
  current_step    INTEGER     NOT NULL DEFAULT 0,
  fingerprint     TEXT,       -- hash(ip + user_agent) para dedup
  user_agent      TEXT,
  ip_hash         TEXT,       -- SHA-256 do IP (LGPD — nunca IP puro)
  consent_given   BOOLEAN     NOT NULL DEFAULT FALSE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  abandoned_at    TIMESTAMPTZ
);

-- =============================================================================
-- ANSWERS (uma por pergunta por sessão — upsert-safe)
-- =============================================================================
CREATE TABLE IF NOT EXISTS answers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id     UUID        NOT NULL REFERENCES questions(id),
  question_type   TEXT        NOT NULL,  -- desnormalizado para queries diretas
  value           TEXT,                  -- valor serializado (JSON para arrays)
  value_numeric   REAL,                  -- para rating, age, scores
  value_vector    REAL[],               -- para multichoice: [0,1,1,0] (por ordem de options)
  time_spent_ms   INTEGER,               -- tempo ativo nesta pergunta (excl. idle)
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)       -- garante upsert idempotente
);

-- =============================================================================
-- EVENTS (stream de analytics — append-only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL   PRIMARY KEY,
  session_id  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  -- tipos: session_started | step_viewed | step_answered | step_back
  --        tab_hidden | tab_visible | session_completed | session_abandoned
  question_id UUID,       -- nullable (session_started não tem)
  step_index  INTEGER,
  payload     JSONB       NOT NULL DEFAULT '{}',
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ADMIN USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT        UNIQUE NOT NULL,
  password_hash TEXT       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login   TIMESTAMPTZ
);

-- =============================================================================
-- ÍNDICES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_quizzes_slug        ON quizzes(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_status      ON quizzes(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_questions_quiz      ON questions(quiz_id, order_key);
CREATE INDEX IF NOT EXISTS idx_sessions_quiz       ON sessions(quiz_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_started    ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_answers_session     ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question    ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_events_session      ON events(session_id, type);
CREATE INDEX IF NOT EXISTS idx_events_ts           ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_question     ON events(question_id) WHERE question_id IS NOT NULL;

-- =============================================================================
-- TRIGGER: atualiza updated_at automaticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================================
-- VIEW MATERIALIZADA — Funil por quiz
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS quiz_funnel AS
SELECT
  q.quiz_id,
  q.id                          AS question_id,
  q.order_key,
  q.title,
  q.type,
  COUNT(DISTINCT ev.session_id) AS sessions_viewed,
  COUNT(DISTINCT a.session_id)  AS sessions_answered,
  AVG(a.time_spent_ms)          AS avg_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.time_spent_ms) AS median_time_ms
FROM questions q
LEFT JOIN events ev ON ev.question_id = q.id AND ev.type = 'step_viewed'
LEFT JOIN answers a ON a.question_id = q.id
GROUP BY q.quiz_id, q.id, q.order_key, q.title, q.type
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_funnel_question ON quiz_funnel(question_id);
