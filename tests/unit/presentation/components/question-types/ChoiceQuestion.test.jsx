import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoiceQuestion } from '../../../../../src/presentation/components/question-types/ChoiceQuestion';
import { mockQuestions } from '../../../../fixtures/quiz';

const q = mockQuestions.choice;

describe('ChoiceQuestion', () => {
  it('renderiza todas as opções', () => {
    render(<ChoiceQuestion question={q} value={null} onChange={vi.fn()} />);

    expect(screen.getByText('Opção A')).toBeInTheDocument();
    expect(screen.getByText('Opção B')).toBeInTheDocument();
    expect(screen.getByText('Opção C')).toBeInTheDocument();
  });

  it('chama onChange com o value da opção ao clicar', async () => {
    const onChange = vi.fn();
    render(<ChoiceQuestion question={q} value={null} onChange={onChange} />);

    await userEvent.click(screen.getByText('Opção A'));

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('renderiza com opções como string JSON (dado do banco)', () => {
    const qComString = { ...q, options: JSON.stringify(q.options) };
    render(<ChoiceQuestion question={qComString} value={null} onChange={vi.fn()} />);

    expect(screen.getByText('Opção A')).toBeInTheDocument();
  });

  it('renderiza sem opções sem crash', () => {
    const qSemOpcoes = { ...q, options: null };
    render(<ChoiceQuestion question={qSemOpcoes} value={null} onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renderiza corretamente sem valor selecionado', () => {
    render(<ChoiceQuestion question={q} value={null} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });
});
