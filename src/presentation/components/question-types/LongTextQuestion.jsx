/**
 * LongTextQuestion — Área de texto livre
 * Interface: { question, value, onChange }
 */
import { RecordButton } from '../RecordButton';

export function LongTextQuestion({ question, value, onChange }) {
  return (
    <div className="relative">
      <textarea
        autoFocus
        placeholder={question.placeholder || 'Escreva aqui...'}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={4}
        className="w-full text-lg py-3 px-4 pr-14 border-2 outline-none transition-colors rounded-xl resize-none placeholder:opacity-40"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          fontSize: '1rem',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
        onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
      />
      <div className="absolute bottom-3 right-3">
        <RecordButton
          onTranscription={(text) => onChange((value || '') + (value ? ' ' : '') + text)}
        />
      </div>
    </div>
  );
}
