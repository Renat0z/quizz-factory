/**
 * @typedef {'welcome'|'text'|'longtext'|'choice'|'multichoice'|'date'|'rating'} QuestionType
 */

/**
 * @typedef {Object} QuestionOption
 * @property {string} label
 * @property {string} value
 */

/**
 * @typedef {Object} BranchRule
 * @property {string} if_value
 * @property {string} goto_question_id
 */

/**
 * @typedef {Object} Question
 * @property {string} id
 * @property {string} quiz_id
 * @property {QuestionType} type
 * @property {string} title
 * @property {string} [description]
 * @property {string} [placeholder]
 * @property {QuestionOption[]} [options]
 * @property {boolean} required
 * @property {number} order_key
 * @property {Object} config
 * @property {BranchRule[]} branch_rules
 */

/**
 * Verifica se uma pergunta tem resposta válida
 * @param {Question} question
 * @param {*} value
 * @returns {boolean}
 */
export function isAnswerValid(question, value) {
  if (!question.required) return true;
  if (question.type === 'welcome') return true;
  if (value === null || value === undefined || value === '') return false;
  if (question.type === 'multichoice') return Array.isArray(value) && value.length > 0;
  if (question.type === 'date') {
    return !!(value?.day && value?.month && value?.year);
  }
  return true;
}

/**
 * Serializa o valor de uma answer para string (para salvar no banco)
 * @param {QuestionType} type
 * @param {*} value
 * @returns {{ value: string, valueNumeric: number|null, valueVector: number[]|null }}
 */
export function serializeAnswer(type, value, options) {
  if (value === null || value === undefined) {
    return { value: null, valueNumeric: null, valueVector: null };
  }

  switch (type) {
    case 'multichoice': {
      const arr = Array.isArray(value) ? value : [];
      const opts = Array.isArray(options) ? options
        : (typeof options === 'string' ? JSON.parse(options) : null);
      const vector = opts?.map(opt => arr.includes(opt.value) ? 1 : 0) ?? null;
      return { value: JSON.stringify(arr), valueNumeric: null, valueVector: vector };
    }
    case 'rating':
      return { value: String(value), valueNumeric: Number(value), valueVector: null };
    case 'date':
      return { value: JSON.stringify(value), valueNumeric: null, valueVector: null };
    default:
      return { value: String(value), valueNumeric: null, valueVector: null };
  }
}

/**
 * Calcula novo order_key para fractional indexing
 * @param {number|null} before - order_key do item acima
 * @param {number|null} after - order_key do item abaixo
 * @returns {number}
 */
export function calcOrderKey(before, after) {
  if (before === null && after === null) return 1.0;
  if (before === null) return after / 2;
  if (after === null) return before + 1.0;
  return (before + after) / 2;
}
