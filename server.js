import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { createHash } from 'crypto';
import Groq, { toFile } from 'groq-sdk';

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// postgres.js retorna JSONB como objeto JS, mas em alguns casos (e no api/index.js)
// pode chegar como string — este helper garante sempre o tipo correto
function parseJsonField(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'quizz_factory_secret_2026';

// DB connection pool
const sql = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

app.use(cors({ origin: ['http://localhost:5174', 'http://localhost:5173'] }));
app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const hashIp = (ip) => createHash('sha256').update(ip + JWT_SECRET).digest('hex').slice(0, 16);

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autorizado' });
  try {
    req.admin = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// ---------------------------------------------------------------------------
// PUBLIC — Quizzes
// ---------------------------------------------------------------------------
app.get('/api/quizzes', async (req, res) => {
  try {
    const quizzes = await sql`
      SELECT id, slug, name, description, config, published_at, created_at,
        (SELECT COUNT(*) FROM sessions s WHERE s.quiz_id = q.id AND s.status = 'completed') AS response_count
      FROM quizzes q
      WHERE status = 'published' AND deleted_at IS NULL
      ORDER BY published_at DESC
    `;
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quizzes/:slug', async (req, res) => {
  try {
    const [quiz] = await sql`
      SELECT id, slug, name, description, config, version
      FROM quizzes
      WHERE slug = ${req.params.slug} AND status = 'published' AND deleted_at IS NULL
    `;
    if (!quiz) return res.status(404).json({ error: 'Quiz não encontrado' });

    const questions = await sql`
      SELECT id, type, title, description, placeholder, options, required, config, branch_rules, order_key
      FROM questions
      WHERE quiz_id = ${quiz.id}
      ORDER BY order_key ASC
    `;

    // Normaliza campos JSONB que podem chegar como string dependendo do driver
    const normalizedQuestions = questions.map(q => ({
      ...q,
      options:      parseJsonField(q.options),
      config:       parseJsonField(q.config),
      branch_rules: parseJsonField(q.branch_rules) ?? [],
    }));

    res.json({ ...quiz, questions: normalizedQuestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUBLIC — Sessions
// ---------------------------------------------------------------------------
app.post('/api/sessions', async (req, res) => {
  try {
    const { sessionId, quizId, quizVersion, consent } = req.body;
    if (!sessionId || !quizId) return res.status(400).json({ error: 'sessionId e quizId são obrigatórios' });

    const ipHash = hashIp(req.ip || req.headers['x-forwarded-for'] || 'unknown');
    const fingerprint = hashIp((req.headers['user-agent'] || '') + ipHash);

    const [session] = await sql`
      INSERT INTO sessions (id, quiz_id, quiz_version, fingerprint, user_agent, ip_hash, consent_given)
      VALUES (${sessionId}, ${quizId}, ${quizVersion || 1}, ${fingerprint}, ${req.headers['user-agent'] || null}, ${ipHash}, ${!!consent})
      ON CONFLICT (id) DO UPDATE SET last_active_at = NOW()
      RETURNING id, status, current_step
    `;

    // Busca answers já salvas para retomar
    const savedAnswers = await sql`
      SELECT question_id, value, time_spent_ms FROM answers WHERE session_id = ${sessionId}
    `;

    res.json({ ...session, savedAnswers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sessions/:id/answers', async (req, res) => {
  try {
    const { questionId, questionType, value, valueNumeric, valueVector, timeSpentMs, stepIndex } = req.body;

    await sql`
      INSERT INTO answers (session_id, question_id, question_type, value, value_numeric, value_vector, time_spent_ms)
      VALUES (${req.params.id}, ${questionId}, ${questionType}, ${value}, ${valueNumeric ?? null}, ${valueVector ?? null}, ${timeSpentMs ?? null})
      ON CONFLICT (session_id, question_id) DO UPDATE SET
        value = EXCLUDED.value,
        value_numeric = EXCLUDED.value_numeric,
        value_vector = EXCLUDED.value_vector,
        time_spent_ms = EXCLUDED.time_spent_ms,
        answered_at = NOW()
    `;

    await sql`
      UPDATE sessions SET last_active_at = NOW(), current_step = ${stepIndex || 0}
      WHERE id = ${req.params.id}
    `;

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/:id/events', async (req, res) => {
  try {
    const { type, questionId, stepIndex, payload } = req.body;
    await sql`
      INSERT INTO events (session_id, type, question_id, step_index, payload)
      VALUES (${req.params.id}, ${type}, ${questionId ?? null}, ${stepIndex ?? null}, ${JSON.stringify(payload || {})})
    `;
    // Atualiza current_step para retomada de sessão (step_viewed registra onde o usuário está)
    if (stepIndex != null) {
      await sql`UPDATE sessions SET current_step = ${stepIndex}, last_active_at = NOW() WHERE id = ${req.params.id}`;
    } else {
      await sql`UPDATE sessions SET last_active_at = NOW() WHERE id = ${req.params.id}`;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/:id/complete', async (req, res) => {
  try {
    await sql`
      UPDATE sessions SET status = 'completed', completed_at = NOW(), last_active_at = NOW()
      WHERE id = ${req.params.id}
    `;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ADMIN — Auth
// ---------------------------------------------------------------------------
app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [user] = await sql`SELECT * FROM admin_users WHERE username = ${username}`;
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

    await sql`UPDATE admin_users SET last_login = NOW() WHERE id = ${user.id}`;
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ADMIN — Quizzes CRUD
// ---------------------------------------------------------------------------
app.get('/api/admin/quizzes', authMiddleware, async (req, res) => {
  try {
    const quizzes = await sql`
      SELECT q.*,
        COUNT(DISTINCT s.id)                                         AS total_sessions,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed')  AS completed_sessions,
        COUNT(DISTINCT qu.id)                                        AS question_count
      FROM quizzes q
      LEFT JOIN sessions s ON s.quiz_id = q.id
      LEFT JOIN questions qu ON qu.quiz_id = q.id
      WHERE q.deleted_at IS NULL
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `;
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/quizzes', authMiddleware, async (req, res) => {
  try {
    const { name, description, slug, config } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name e slug são obrigatórios' });

    const [quiz] = await sql`
      INSERT INTO quizzes (name, description, slug, config)
      VALUES (${name}, ${description || null}, ${slug}, ${JSON.stringify(config || {})})
      RETURNING *
    `;
    res.status(201).json(quiz);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug já existe' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/quizzes/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, slug, config } = req.body;
    const [quiz] = await sql`
      UPDATE quizzes SET
        name        = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        slug        = COALESCE(${slug ?? null}, slug),
        config      = COALESCE(${config ? JSON.stringify(config) : null}::jsonb, config)
      WHERE id = ${req.params.id} AND deleted_at IS NULL
      RETURNING *
    `;
    if (!quiz) return res.status(404).json({ error: 'Quiz não encontrado' });
    res.json(quiz);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug já existe' });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/quizzes/:id', authMiddleware, async (req, res) => {
  try {
    await sql`UPDATE quizzes SET deleted_at = NOW() WHERE id = ${req.params.id}`;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/quizzes/:id/publish', authMiddleware, async (req, res) => {
  try {
    const { publish } = req.body; // true = publicar, false = despublicar

    // Snapshot das perguntas ao publicar
    if (publish) {
      const questions = await sql`SELECT * FROM questions WHERE quiz_id = ${req.params.id} ORDER BY order_key`;
      const [quiz] = await sql`SELECT version FROM quizzes WHERE id = ${req.params.id}`;
      await sql`
        INSERT INTO quiz_versions (quiz_id, version, questions)
        VALUES (${req.params.id}, ${quiz.version}, ${JSON.stringify(questions)})
        ON CONFLICT (quiz_id, version) DO UPDATE SET questions = EXCLUDED.questions
      `;
    }

    const [quiz] = await sql`
      UPDATE quizzes SET
        status       = ${publish ? 'published' : 'draft'},
        published_at = ${publish ? sql`NOW()` : sql`published_at`},
        version      = CASE WHEN ${publish} THEN version + 1 ELSE version END
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ADMIN — Questions CRUD
// ---------------------------------------------------------------------------
app.get('/api/admin/quizzes/:id/questions', authMiddleware, async (req, res) => {
  try {
    const questions = await sql`
      SELECT * FROM questions WHERE quiz_id = ${req.params.id} ORDER BY order_key ASC
    `;
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/quizzes/:id/questions', authMiddleware, async (req, res) => {
  try {
    const { type, title, description, placeholder, options, required, config, orderKey } = req.body;

    // Se não informado, colocar no final
    let key = orderKey;
    if (!key) {
      const [last] = await sql`
        SELECT COALESCE(MAX(order_key), 0) AS max_key FROM questions WHERE quiz_id = ${req.params.id}
      `;
      key = (last.max_key || 0) + 1.0;
    }

    const [question] = await sql`
      INSERT INTO questions (quiz_id, type, title, description, placeholder, options, required, config, order_key)
      VALUES (
        ${req.params.id}, ${type}, ${title},
        ${description || null}, ${placeholder || null},
        ${options ? JSON.stringify(options) : null},
        ${required !== false}, ${JSON.stringify(config || {})}, ${key}
      )
      RETURNING *
    `;
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/questions/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, placeholder, options, required, config, orderKey } = req.body;
    const [question] = await sql`
      UPDATE questions SET
        title       = COALESCE(${title ?? null}, title),
        description = ${description ?? null},
        placeholder = ${placeholder ?? null},
        options     = ${options ? JSON.stringify(options) : null}::jsonb,
        required    = COALESCE(${required ?? null}, required),
        config      = COALESCE(${config ? JSON.stringify(config) : null}::jsonb, config),
        order_key   = COALESCE(${orderKey ?? null}, order_key)
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    if (!question) return res.status(404).json({ error: 'Pergunta não encontrada' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/questions/:id', authMiddleware, async (req, res) => {
  try {
    await sql`DELETE FROM questions WHERE id = ${req.params.id}`;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reordenação por fractional indexing
app.post('/api/admin/questions/reorder', authMiddleware, async (req, res) => {
  try {
    const { updates } = req.body; // [{ id, orderKey }]
    await sql.begin(async (tx) => {
      for (const { id, orderKey } of updates) {
        await tx`UPDATE questions SET order_key = ${orderKey} WHERE id = ${id}`;
      }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ADMIN — Sessions / Responses
// ---------------------------------------------------------------------------
app.get('/api/admin/quizzes/:id/sessions', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const sessions = await sql`
      SELECT s.*,
        json_agg(json_build_object(
          'question_id', a.question_id,
          'question_type', a.question_type,
          'value', a.value,
          'time_spent_ms', a.time_spent_ms
        ) ORDER BY a.answered_at) AS answers
      FROM sessions s
      LEFT JOIN answers a ON a.session_id = s.id
      WHERE s.quiz_id = ${req.params.id}
        ${status ? sql`AND s.status = ${status}` : sql``}
      GROUP BY s.id
      ORDER BY s.started_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM sessions
      WHERE quiz_id = ${req.params.id}
      ${status ? sql`AND status = ${status}` : sql``}
    `;

    res.json({ sessions, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ADMIN — Analytics
// ---------------------------------------------------------------------------
app.get('/api/admin/quizzes/:id/analytics', authMiddleware, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();

    // KPIs globais
    const [kpis] = await sql`
      SELECT
        COUNT(*)                                                          AS total_sessions,
        COUNT(*) FILTER (WHERE status = 'completed')                     AS completed,
        COUNT(*) FILTER (WHERE status = 'abandoned')                     AS abandoned,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 1
        )                                                                 AS completion_rate,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
        ) FILTER (WHERE status = 'completed'))                            AS avg_completion_ms
      FROM sessions
      WHERE quiz_id = ${quizId} AND started_at >= ${since}
    `;

    // Sessões por dia
    const dailySessions = await sql`
      SELECT
        DATE(started_at AT TIME ZONE 'America/Maceio') AS date,
        COUNT(*)                                        AS started,
        COUNT(*) FILTER (WHERE status = 'completed')   AS completed
      FROM sessions
      WHERE quiz_id = ${quizId} AND started_at >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    // Funil por pergunta (usando view materializada + fallback direto)
    const funnel = await sql`
      SELECT
        q.id, q.title, q.type, q.order_key,
        COUNT(DISTINCT ev_view.session_id)  AS sessions_viewed,
        COUNT(DISTINCT a.session_id)        AS sessions_answered,
        ROUND(AVG(a.time_spent_ms))         AS avg_time_ms,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.time_spent_ms)) AS median_time_ms
      FROM questions q
      LEFT JOIN events ev_view ON ev_view.question_id = q.id
        AND ev_view.type = 'step_viewed'
        AND ev_view.session_id IN (SELECT id FROM sessions WHERE quiz_id = ${quizId} AND started_at >= ${since})
      LEFT JOIN answers a ON a.question_id = q.id
        AND a.session_id IN (SELECT id FROM sessions WHERE quiz_id = ${quizId} AND started_at >= ${since})
      WHERE q.quiz_id = ${quizId}
      GROUP BY q.id, q.title, q.type, q.order_key
      ORDER BY q.order_key ASC
    `;

    // Distribuição de respostas por pergunta de escolha
    const distributions = await sql`
      SELECT
        a.question_id,
        a.value,
        COUNT(*) AS count
      FROM answers a
      JOIN sessions s ON s.id = a.session_id
      WHERE s.quiz_id = ${quizId}
        AND s.started_at >= ${since}
        AND a.question_type IN ('choice', 'multichoice', 'rating')
      GROUP BY a.question_id, a.value
      ORDER BY a.question_id, count DESC
    `;

    res.json({ kpis, dailySessions, funnel, distributions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ADMIN — CSV Export
// ---------------------------------------------------------------------------
app.get('/api/admin/quizzes/:id/export', authMiddleware, async (req, res) => {
  try {
    const quizId = req.params.id;

    const [quiz] = await sql`SELECT name, slug FROM quizzes WHERE id = ${quizId}`;
    const questions = await sql`SELECT id, title FROM questions WHERE quiz_id = ${quizId} ORDER BY order_key`;

    const sessions = await sql`
      SELECT s.id, s.started_at, s.completed_at, s.status,
        json_object_agg(a.question_id, a.value) AS answers_map
      FROM sessions s
      LEFT JOIN answers a ON a.session_id = s.id
      WHERE s.quiz_id = ${quizId} AND s.status = 'completed'
      GROUP BY s.id
      ORDER BY s.completed_at DESC
    `;

    // Montar CSV com BOM UTF-8
    const headers = ['session_id', 'data_inicio', 'data_envio', ...questions.map(q => q.title)];
    const rows = sessions.map(s => [
      s.id,
      s.started_at?.toISOString() || '',
      s.completed_at?.toISOString() || '',
      ...questions.map(q => {
        const val = s.answers_map?.[q.id] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }),
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = `${quiz.slug}-respostas-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Transcription (Groq Whisper)
// ---------------------------------------------------------------------------
app.post('/api/transcribe', async (req, res) => {
  try {
    if (!req.body || !req.body.audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const { audio, filename, mimeType } = req.body;
    const buffer = Buffer.from(audio, 'base64');
    const file = await toFile(buffer, filename || 'audio.webm', { type: mimeType || 'audio/webm' });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: 'pt',
      response_format: 'json',
    });

    res.json({ transcription: transcription.text });
  } catch (error) {
    res.status(500).json({ error: 'Transcription failed: ' + error.message });
  }
});

// ---------------------------------------------------------------------------
// Static (produção / Docker) — serve o build do Vite e SPA fallback
// Em dev o Vite roda separado; em produção tudo sai do Express.
// ---------------------------------------------------------------------------
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, 'dist');

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — rotas do React Router
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n🚀 Quiz Factory API rodando em http://localhost:${PORT}`);
  console.log(`   GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ configurada' : '❌ AUSENTE'}`);
  console.log(`   POST /api/transcribe: ✅ registrada\n`);
});
