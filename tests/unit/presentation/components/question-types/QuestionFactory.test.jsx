import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  QuestionFactory,
  registerQuestionType,
  getAvailableTypes,
} from '../../../../../src/presentation/components/question-types/QuestionFactory';
import { mockQuestions } from '../../../../fixtures/quiz';

describe('QuestionFactory', () => {
  it('renderiza TextQuestion para tipo text', () => {
    render(
      <QuestionFactory question={mockQuestions.text} value="" onChange={vi.fn()} />
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renderiza ChoiceQuestion para tipo choice', () => {
    render(
      <QuestionFactory question={mockQuestions.choice} value={null} onChange={vi.fn()} />
    );
    expect(screen.getByText('Opção A')).toBeInTheDocument();
  });

  it('renderiza MultiChoiceQuestion para tipo multichoice', () => {
    render(
      <QuestionFactory question={mockQuestions.multichoice} value={[]} onChange={vi.fn()} />
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('renderiza RatingQuestion para tipo rating', () => {
    render(
      <QuestionFactory question={mockQuestions.rating} value={null} onChange={vi.fn()} />
    );
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('renderiza mensagem de erro para tipo desconhecido', () => {
    const qUnknown = { ...mockQuestions.text, type: 'tipo-inexistente' };
    render(
      <QuestionFactory question={qUnknown} value="" onChange={vi.fn()} />
    );
    expect(screen.getByText(/tipo de pergunta desconhecido/i)).toBeInTheDocument();
    expect(screen.getByText('tipo-inexistente')).toBeInTheDocument();
  });

  it('registra e renderiza tipo customizado via registerQuestionType', () => {
    const CustomQuestion = ({ question }) => <div data-testid="custom">{question.title}</div>;
    registerQuestionType('custom', CustomQuestion);

    const qCustom = { ...mockQuestions.text, type: 'custom', title: 'Pergunta Custom' };
    render(<QuestionFactory question={qCustom} value="" onChange={vi.fn()} />);

    expect(screen.getByTestId('custom')).toHaveTextContent('Pergunta Custom');
  });

  it('getAvailableTypes retorna todos os tipos base', () => {
    const types = getAvailableTypes();
    const typeNames = types.map(t => t.type);

    expect(typeNames).toContain('welcome');
    expect(typeNames).toContain('text');
    expect(typeNames).toContain('longtext');
    expect(typeNames).toContain('choice');
    expect(typeNames).toContain('multichoice');
    expect(typeNames).toContain('date');
    expect(typeNames).toContain('rating');
  });

  it('cada tipo tem label, icon e description', () => {
    getAvailableTypes().forEach(t => {
      expect(t.label).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.description).toBeTruthy();
    });
  });
});
