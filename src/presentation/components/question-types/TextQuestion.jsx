/**
 * TextQuestion — Campo de texto curto (1 linha)
 * Interface: { question, value, onChange }
 */
export function TextQuestion({ question, value, onChange }) {
  return (
    <input
      autoFocus
      type="text"
      placeholder={question.placeholder || 'Digite sua resposta...'}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.form?.requestSubmit?.();
      }}
      className="w-full text-xl md:text-2xl py-4 px-2 border-b-2 outline-none transition-colors bg-transparent placeholder:opacity-40"
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
        fontSize: '1.25rem',  // ≥16px → previne zoom no iOS
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
      onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
    />
  );
}
