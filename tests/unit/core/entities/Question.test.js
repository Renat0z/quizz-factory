import { describe, it, expect } from 'vitest';
import {
  isAnswerValid,
  serializeAnswer,
  calcOrderKey,
} from '../../../../src/core/entities/Question';
import { mockOptions } from '../../../fixtures/quiz';

// =============================================================================
// isAnswerValid
// =============================================================================
describe('isAnswerValid', () => {
  describe('campo opcional', () => {
    it('sempre válido independente do valor', () => {
      const q = { type: 'text', required: false };
      expect(isAnswerValid(q, '')).toBe(true);
      expect(isAnswerValid(q, null)).toBe(true);
      expect(isAnswerValid(q, undefined)).toBe(true);
    });
  });

  describe('tipo welcome', () => {
    it('sempre válido (não coleta resposta)', () => {
      const q = { type: 'welcome', required: true };
      expect(isAnswerValid(q, '')).toBe(true);
      expect(isAnswerValid(q, null)).toBe(true);
    });
  });

  describe('tipo text', () => {
    it('inválido se vazio', () => {
      const q = { type: 'text', required: true };
      expect(isAnswerValid(q, '')).toBe(false);
      expect(isAnswerValid(q, null)).toBe(false);
    });
    it('válido se preenchido', () => {
      const q = { type: 'text', required: true };
      expect(isAnswerValid(q, 'João Silva')).toBe(true);
    });
  });

  describe('tipo multichoice', () => {
    it('inválido se array vazio', () => {
      const q = { type: 'multichoice', required: true };
      expect(isAnswerValid(q, [])).toBe(false);
      expect(isAnswerValid(q, null)).toBe(false);
    });
    it('válido se ao menos uma opção selecionada', () => {
      const q = { type: 'multichoice', required: true };
      expect(isAnswerValid(q, ['a'])).toBe(true);
      expect(isAnswerValid(q, ['a', 'b'])).toBe(true);
    });
    it('inválido se não for array', () => {
      const q = { type: 'multichoice', required: true };
      expect(isAnswerValid(q, 'a')).toBe(false);
    });
  });

  describe('tipo date', () => {
    it('inválido se algum campo faltando', () => {
      const q = { type: 'date', required: true };
      expect(isAnswerValid(q, { day: '01', month: '', year: '2000' })).toBe(false);
      expect(isAnswerValid(q, { day: '', month: '01', year: '2000' })).toBe(false);
      expect(isAnswerValid(q, {})).toBe(false);
      expect(isAnswerValid(q, null)).toBe(false);
    });
    it('válido se todos os campos preenchidos', () => {
      const q = { type: 'date', required: true };
      expect(isAnswerValid(q, { day: '01', month: '01', year: '2000' })).toBe(true);
    });
  });

  describe('tipo choice e rating', () => {
    it('válido se tiver valor', () => {
      expect(isAnswerValid({ type: 'choice', required: true }, 'a')).toBe(true);
      expect(isAnswerValid({ type: 'rating', required: true }, 4)).toBe(true);
    });
    it('inválido se vazio', () => {
      expect(isAnswerValid({ type: 'choice', required: true }, '')).toBe(false);
      expect(isAnswerValid({ type: 'rating', required: true }, null)).toBe(false);
    });
  });
});

// =============================================================================
// serializeAnswer
// =============================================================================
describe('serializeAnswer', () => {
  it('retorna nulls para valor null/undefined', () => {
    expect(serializeAnswer('text', null)).toEqual({ value: null, valueNumeric: null, valueVector: null });
    expect(serializeAnswer('text', undefined)).toEqual({ value: null, valueNumeric: null, valueVector: null });
  });

  it('serializa texto simples como string', () => {
    const result = serializeAnswer('text', 'João');
    expect(result.value).toBe('João');
    expect(result.valueNumeric).toBeNull();
    expect(result.valueVector).toBeNull();
  });

  it('serializa longtext como string', () => {
    const result = serializeAnswer('longtext', 'Um texto longo aqui');
    expect(result.value).toBe('Um texto longo aqui');
  });

  it('serializa rating como número', () => {
    const result = serializeAnswer('rating', 4);
    expect(result.value).toBe('4');
    expect(result.valueNumeric).toBe(4);
    expect(result.valueVector).toBeNull();
  });

  it('serializa rating de string para número', () => {
    const result = serializeAnswer('rating', '3');
    expect(result.valueNumeric).toBe(3);
  });

  it('serializa date como JSON', () => {
    const date = { day: '15', month: '06', year: '1990' };
    const result = serializeAnswer('date', date);
    expect(JSON.parse(result.value)).toEqual(date);
    expect(result.valueNumeric).toBeNull();
  });

  it('serializa multichoice com vetor binário', () => {
    const result = serializeAnswer('multichoice', ['a', 'c'], mockOptions);
    expect(JSON.parse(result.value)).toEqual(['a', 'c']);
    expect(result.valueVector).toEqual([1, 0, 1]); // a=1, b=0, c=1
  });

  it('serializa multichoice com array vazio', () => {
    const result = serializeAnswer('multichoice', [], mockOptions);
    expect(JSON.parse(result.value)).toEqual([]);
    expect(result.valueVector).toEqual([0, 0, 0]);
  });

  it('serializa multichoice sem options → vector null', () => {
    const result = serializeAnswer('multichoice', ['a'], null);
    expect(result.valueVector).toBeNull();
  });
});

// =============================================================================
// calcOrderKey
// =============================================================================
describe('calcOrderKey', () => {
  it('retorna 1.0 quando lista vazia (ambos null)', () => {
    expect(calcOrderKey(null, null)).toBe(1.0);
  });

  it('insere no início (before null)', () => {
    expect(calcOrderKey(null, 2.0)).toBe(1.0);
  });

  it('insere no fim (after null)', () => {
    expect(calcOrderKey(3.0, null)).toBe(4.0);
  });

  it('insere entre dois valores', () => {
    expect(calcOrderKey(2.0, 4.0)).toBe(3.0);
  });

  it('insere entre valores próximos (fracionamento)', () => {
    const key = calcOrderKey(1.0, 1.5);
    expect(key).toBeGreaterThan(1.0);
    expect(key).toBeLessThan(1.5);
    expect(key).toBe(1.25);
  });
});
