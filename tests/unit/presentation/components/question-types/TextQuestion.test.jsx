import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextQuestion } from '../../../../../src/presentation/components/question-types/TextQuestion';
import { mockQuestions } from '../../../../fixtures/quiz';

const q = mockQuestions.text;

describe('TextQuestion', () => {
  it('renderiza o input com placeholder', () => {
    render(<TextQuestion question={q} value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(q.placeholder)).toBeInTheDocument();
  });

  it('exibe valor atual', () => {
    render(<TextQuestion question={q} value="João Silva" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument();
  });

  it('chama onChange ao digitar', async () => {
    const onChange = vi.fn();
    render(<TextQuestion question={q} value="" onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), 'A');

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('usa placeholder padrão se não definido', () => {
    const qSemPlaceholder = { ...q, placeholder: undefined };
    render(<TextQuestion question={qSemPlaceholder} value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Digite sua resposta...')).toBeInTheDocument();
  });
});
