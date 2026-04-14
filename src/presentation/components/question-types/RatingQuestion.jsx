/**
 * RatingQuestion — Escala numérica (1–5 ou 1–10)
 * Interface: { question, value, onChange }
 */
export function RatingQuestion({ question, value, onChange }) {
  const { min = 1, max = 5, labels = {} } = question.config || {};
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const numValue = value !== undefined && value !== null && value !== '' ? Number(value) : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-between">
        {steps.map(n => {
          const selected = numValue === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="flex-1 aspect-square rounded-xl border-2 font-bold text-lg transition-all flex items-center justify-center min-w-[44px] min-h-[44px]"
              style={{
                borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-surface)',
                color: selected ? '#fff' : 'var(--color-muted)',
                transform: selected ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(labels.min || labels.max) && (
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>{labels.min || min}</span>
          <span>{labels.max || max}</span>
        </div>
      )}
    </div>
  );
}
