/**
 * LongTextQuestion — Área de texto livre
 * Interface: { question, value, onChange }
 */
export function LongTextQuestion({ question, value, onChange }) {
  return (
    <textarea
      autoFocus
      placeholder={question.placeholder || 'Escreva aqui...'}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      rows={4}
      className="w-full text-lg py-3 px-4 border-2 outline-none transition-colors rounded-xl resize-none placeholder:opacity-40"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text)',
        fontSize: '1rem',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
      onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
    />
  );
}
