/**
 * DateQuestion — Seletor de data (Dia / Mês / Ano)
 * Interface: { question, value, onChange }
 * value = { day: string, month: string, year: string }
 */
export function DateQuestion({ question, value, onChange }) {
  const val = value || { day: '', month: '', year: '' };

  const update = (part, partValue) => {
    const next = { ...val, [part]: partValue };
    onChange(next);
  };

  const selectStyle = {
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
    fontSize: '1rem',
  };

  return (
    <div className="flex gap-3">
      {/* Dia */}
      <div className="flex-1">
        <select
          autoFocus
          value={val.day}
          onChange={e => update('day', e.target.value)}
          className="w-full py-4 px-3 border-2 outline-none rounded-xl appearance-none cursor-pointer transition-colors"
          style={selectStyle}
        >
          <option value="">Dia</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
            <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
          ))}
        </select>
      </div>

      {/* Mês */}
      <div className="flex-1">
        <select
          value={val.month}
          onChange={e => update('month', e.target.value)}
          className="w-full py-4 px-3 border-2 outline-none rounded-xl appearance-none cursor-pointer transition-colors"
          style={selectStyle}
        >
          <option value="">Mês</option>
          {[
            { v: '01', l: 'Janeiro' }, { v: '02', l: 'Fevereiro' },
            { v: '03', l: 'Março' },   { v: '04', l: 'Abril' },
            { v: '05', l: 'Maio' },    { v: '06', l: 'Junho' },
            { v: '07', l: 'Julho' },   { v: '08', l: 'Agosto' },
            { v: '09', l: 'Setembro' },{ v: '10', l: 'Outubro' },
            { v: '11', l: 'Novembro' },{ v: '12', l: 'Dezembro' },
          ].map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
      </div>

      {/* Ano */}
      <div className="flex-1">
        <select
          value={val.year}
          onChange={e => update('year', e.target.value)}
          className="w-full py-4 px-3 border-2 outline-none rounded-xl appearance-none cursor-pointer transition-colors"
          style={selectStyle}
        >
          <option value="">Ano</option>
          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
