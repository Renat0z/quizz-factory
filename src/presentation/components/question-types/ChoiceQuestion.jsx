import { CheckCircle } from 'lucide-react';

/**
 * ChoiceQuestion — Escolha única (radio)
 * Interface: { question, value, onChange }
 * Avança automaticamente ao selecionar (comportamento typeform)
 */
export function ChoiceQuestion({ question, value, onChange }) {
  const raw = question.options;
  const options = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);

  const handleSelect = (optValue) => {
    onChange(optValue);
    // Avança automaticamente após 300ms (handled pelo QuizPlayer via onAutoAdvance)
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      {options.map((opt, idx) => {
        const selected = value === opt.value;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className="w-full text-left p-5 rounded-xl border-2 transition-all flex items-center justify-between group"
            style={{
              borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: selected ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'var(--color-surface)',
              color: selected ? 'var(--color-text)' : 'var(--color-muted)',
            }}
          >
            <span className="text-base font-medium">{opt.label}</span>
            <div
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
              style={{
                borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: selected ? 'var(--color-primary)' : 'transparent',
              }}
            >
              {selected && <CheckCircle size={14} style={{ color: '#fff' }} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
