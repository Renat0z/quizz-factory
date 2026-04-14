import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiChoiceQuestion } from '../../../../../src/presentation/components/question-types/MultiChoiceQuestion';
import { mockQuestions } from '../../../../fixtures/quiz';

const q = mockQuestions.multichoice;

describe('MultiChoiceQuestion', () => {
  it('renderiza todas as opções', () => {
    render(<MultiChoiceQuestion question={q} value={[]} onChange={vi.fn()} />);

    expect(screen.getByText('Opção A')).toBeInTheDocument();
    expect(screen.getByText('Opção B')).toBeInTheDocument();
    expect(screen.getByText('Opção C')).toBeInTheDocument();
  });

  it('adiciona opção ao clicar (toggle on)', async () => {
    const onChange = vi.fn();
    render(<MultiChoiceQuestion question={q} value={[]} onChange={onChange} />);

    await userEvent.click(screen.getByText('Opção A'));

    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('remove opção ao clicar novamente (toggle off)', async () => {
    const onChange = vi.fn();
    render(<MultiChoiceQuestion question={q} value={['a', 'b']} onChange={onChange} />);

    await userEvent.click(screen.getByText('Opção A'));

    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('mantém outras seleções ao adicionar nova', async () => {
    const onChange = vi.fn();
    render(<MultiChoiceQuestion question={q} value={['b']} onChange={onChange} />);

    await userEvent.click(screen.getByText('Opção C'));

    expect(onChange).toHaveBeenCalledWith(['b', 'c']);
  });

  it('trata value null como array vazio', () => {
    render(<MultiChoiceQuestion question={q} value={null} onChange={vi.fn()} />);
    // Não deve crashar
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('renderiza com opções como string JSON', () => {
    const qComString = { ...q, options: JSON.stringify(q.options) };
    render(<MultiChoiceQuestion question={qComString} value={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Opção A')).toBeInTheDocument();
  });
});
