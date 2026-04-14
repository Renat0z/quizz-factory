/**
 * @typedef {Object} QuizTheme
 * @property {string} primary
 * @property {string} bg
 * @property {string} surface
 * @property {string} border
 * @property {string} text
 * @property {string} muted
 */

/**
 * @typedef {Object} QuizConfig
 * @property {QuizTheme} [theme]
 * @property {string} [logo]
 * @property {string} [successTitle]
 * @property {string} [successMessage]
 * @property {string} [successRedirectUrl]
 * @property {boolean} [showProgressCount]
 * @property {boolean} [allowRetake]
 * @property {number} [retentionDays]
 */

/**
 * @typedef {Object} Quiz
 * @property {string} id
 * @property {string} slug
 * @property {string} name
 * @property {string} [description]
 * @property {'draft'|'published'|'archived'} status
 * @property {number} version
 * @property {QuizConfig} config
 * @property {import('./Question').Question[]} questions
 * @property {string} created_at
 * @property {string} [published_at]
 */

export const DEFAULT_THEME = {
  primary: '#6C5CE7',
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  border: '#2a2a2a',
  text: '#ffffff',
  muted: '#888888',
};

/**
 * Mescla tema do quiz com valores padrão
 * @param {Partial<QuizTheme>} [theme]
 * @returns {QuizTheme}
 */
export function resolveTheme(theme) {
  return { ...DEFAULT_THEME, ...theme };
}

/**
 * Gera slug a partir de um nome
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}
