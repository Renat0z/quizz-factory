import { describe, it, expect } from 'vitest';
import { slugify, resolveTheme, DEFAULT_THEME } from '../../../../src/core/entities/Quiz';

// =============================================================================
// slugify
// =============================================================================
describe('slugify', () => {
  it('converte para minúsculas', () => {
    expect(slugify('MEU QUIZ')).toBe('meu-quiz');
  });

  it('remove acentos', () => {
    expect(slugify('Avaliação de Satisfação')).toBe('avaliacao-de-satisfacao');
  });

  it('substitui espaços por hífens', () => {
    expect(slugify('meu quiz favorito')).toBe('meu-quiz-favorito');
  });

  it('colapsa múltiplos espaços/hífens', () => {
    expect(slugify('meu   quiz')).toBe('meu-quiz');
    expect(slugify('meu--quiz')).toBe('meu-quiz');
  });

  it('remove caracteres especiais', () => {
    expect(slugify('quiz! #2 (versão final)')).toBe('quiz-2-versao-final');
  });

  it('limita a 60 caracteres', () => {
    const longo = 'a'.repeat(80);
    expect(slugify(longo).length).toBeLessThanOrEqual(60);
  });

  it('trata string vazia', () => {
    expect(slugify('')).toBe('');
  });

  it('preserva hífens legítimos', () => {
    expect(slugify('quiz-de-rh')).toBe('quiz-de-rh');
  });
});

// =============================================================================
// resolveTheme
// =============================================================================
describe('resolveTheme', () => {
  it('retorna valores padrão quando nada passado', () => {
    const theme = resolveTheme(undefined);
    expect(theme).toEqual(DEFAULT_THEME);
  });

  it('retorna valores padrão para objeto vazio', () => {
    const theme = resolveTheme({});
    expect(theme).toEqual(DEFAULT_THEME);
  });

  it('sobrescreve apenas o campo fornecido', () => {
    const theme = resolveTheme({ primary: '#FF0000' });
    expect(theme.primary).toBe('#FF0000');
    expect(theme.bg).toBe(DEFAULT_THEME.bg);
    expect(theme.text).toBe(DEFAULT_THEME.text);
  });

  it('sobrescreve múltiplos campos', () => {
    const theme = resolveTheme({ primary: '#FF0000', bg: '#000000', text: '#EEEEEE' });
    expect(theme.primary).toBe('#FF0000');
    expect(theme.bg).toBe('#000000');
    expect(theme.text).toBe('#EEEEEE');
    expect(theme.surface).toBe(DEFAULT_THEME.surface);
  });

  it('não modifica o DEFAULT_THEME', () => {
    const before = { ...DEFAULT_THEME };
    resolveTheme({ primary: '#changed' });
    expect(DEFAULT_THEME.primary).toBe(before.primary);
  });
});
