import { Check } from 'lucide-react';

/**
 * MultiChoiceQuestion — Múltipla escolha (checkbox)
 * Interface: { question, value, onChange }
 * value é um array de strings (values selecionados)
 */
export function MultiChoiceQuestion({ question, value, onChange }) {
  const raw = question.options;
  const options = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
  const selected = Array.isArray(value) ? value : [];

  const toggle = (optValue) => {
    if (selected.includes(optValue)) {
      onChange(selected.filter(v => v !== optValue));
    } else {
      onChange([...selected, optValue]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {options.map((opt, idx) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => toggle(opt.value)}
            className="w-full text-left p-5 rounded-xl border-2 transition-all flex items-center gap-4"
            style={{
              borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: isSelected ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'var(--color-surface)',
              color: isSelected ? 'var(--color-text)' : 'var(--color-muted)',
            }}
          >
            <div
              className="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all"
              style={{
                borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
              }}
            >
              {isSelected && <Check size={14} style={{ color: '#fff' }} strokeWidth={3} />}
            </div>
            <span className="text-base font-medium">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
