import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RatingQuestion } from '../../../../../src/presentation/components/question-types/RatingQuestion';
import { mockQuestions } from '../../../../fixtures/quiz';

const q = mockQuestions.rating; // min:1, max:5

describe('RatingQuestion', () => {
  it('renderiza o número correto de botões (1 a 5)', () => {
    render(<RatingQuestion question={q} value={null} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveTextContent('1');
    expect(buttons[4]).toHaveTextContent('5');
  });

  it('renderiza escala 1 a 10 quando configurado', () => {
    const q10 = { ...q, config: { min: 1, max: 10 } };
    render(<RatingQuestion question={q10} value={null} onChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(10);
  });

  it('chama onChange com o número ao clicar', async () => {
    const onChange = vi.fn();
    render(<RatingQuestion question={q} value={null} onChange={onChange} />);

    await userEvent.click(screen.getByText('4'));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('exibe labels de mínimo e máximo', () => {
    render(<RatingQuestion question={q} value={null} onChange={vi.fn()} />);

    expect(screen.getByText('Péssimo')).toBeInTheDocument();
    expect(screen.getByText('Excelente')).toBeInTheDocument();
  });

  it('não exibe labels se não configurados', () => {
    const qSemLabels = { ...q, config: { min: 1, max: 5 } };
    render(<RatingQuestion question={qSemLabels} value={null} onChange={vi.fn()} />);

    expect(screen.queryByText('Péssimo')).not.toBeInTheDocument();
  });

  it('usa min=1, max=5 como padrão se config ausente', () => {
    const qSemConfig = { ...q, config: {} };
    render(<RatingQuestion question={qSemConfig} value={null} onChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});
