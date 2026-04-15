import { useRef } from 'react';

/**
 * RichTextEditor — textarea com toolbar de formatação rich text.
 * Insere marcação na posição do cursor ou ao redor do texto selecionado.
 */

const TOOLBAR_COLORS = [
  { tag: 'yellow',  hex: '#F6C90E', label: 'Amarelo' },
  { tag: 'primary', hex: 'var(--color-primary)', label: 'Cor do tema' },
  { tag: 'green',   hex: '#00B894', label: 'Verde' },
  { tag: 'red',     hex: '#E17055', label: 'Vermelho' },
  { tag: 'blue',    hex: '#74B9FF', label: 'Azul' },
  { tag: 'muted',   hex: '#888888', label: 'Cinza' },
];

export function RichTextEditor({ value = '', onChange, placeholder, rows = 5 }) {
  const taRef = useRef(null);

  const wrapSelection = (prefix, suffix) => {
    const ta = taRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || 'texto';
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newVal = before + prefix + selected + suffix + after;

    onChange(newVal);

    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      ta.focus();
      const newStart = start + prefix.length;
      const newEnd = newStart + selected.length;
      ta.setSelectionRange(newStart, newEnd);
    });
  };

  const handleBold = (e) => {
    e.preventDefault();
    wrapSelection('**', '**');
  };

  const handleColor = (e, tag) => {
    e.preventDefault();
    wrapSelection(`[${tag}]`, `[/${tag}]`);
  };

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden focus-within:border-brand transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 bg-zinc-800/80 border-b border-zinc-700/60">
        {/* Bold */}
        <button
          type="button"
          onMouseDown={handleBold}
          title="Negrito (**texto**)"
          className="w-7 h-7 rounded flex items-center justify-center text-sm font-black text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
        >
          B
        </button>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        {/* Color circles */}
        {TOOLBAR_COLORS.map(({ tag, hex, label }) => (
          <button
            key={tag}
            type="button"
            onMouseDown={(e) => handleColor(e, tag)}
            title={`${label} ([${tag}]texto[/${tag}])`}
            className="w-5 h-5 rounded-full border-2 border-zinc-600 hover:border-white hover:scale-110 transition-all shrink-0"
            style={{ backgroundColor: hex }}
          />
        ))}

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        {/* Hint */}
        <span className="text-xs text-zinc-600 select-none">
          Emojis funcionam direto ✓
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        className="w-full px-3 py-2.5 bg-zinc-800 text-white text-sm outline-none resize-none font-mono leading-relaxed"
      />

      {/* Syntax hint */}
      <div className="px-3 py-1.5 bg-zinc-800/60 border-t border-zinc-700/60 text-xs text-zinc-600 font-mono">
        **negrito** · [yellow]amarelo[/yellow] · [primary]cor do tema[/primary]
      </div>
    </div>
  );
}
