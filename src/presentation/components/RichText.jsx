/**
 * RichText — renderiza texto com marcação simples.
 *
 * Sintaxe suportada:
 *   **texto**              → negrito
 *   [yellow]texto[/yellow] → amarelo (#F6C90E)
 *   [primary]texto[/primary] → cor primária do tema (CSS var)
 *   [green]texto[/green]  → verde
 *   [red]texto[/red]      → vermelho/laranja
 *   [muted]texto[/muted]  → cinza muted
 *   [white]texto[/white]  → branco
 *   [blue]texto[/blue]    → azul claro
 *   Emojis passam direto — apenas escreva no texto.
 *   Linhas em branco viram espaçamento.
 *
 * Combinação suportada: [yellow]**negrito amarelo**[/yellow]
 */

const COLOR_MAP = {
  yellow:  '#F6C90E',
  primary: 'var(--color-primary)',
  brand:   'var(--color-primary)',
  green:   '#00B894',
  red:     '#E17055',
  orange:  '#FDCB6E',
  muted:   'var(--color-muted)',
  white:   '#ffffff',
  blue:    '#74B9FF',
  purple:  '#A29BFE',
  pink:    '#FD79A8',
};

// Tokeniza uma linha em nós (suporta aninhamento [color]**bold**[/color])
function parseInline(text, depth = 0) {
  if (!text || depth > 3) return [{ type: 'text', value: text || '' }];

  const nodes = [];
  // Captura: **bold** ou [color]conteudo[/color]
  const re = /\*\*(.+?)\*\*|\[(\w+)\]([\s\S]*?)\[\/\2\]/g;
  let lastIdx = 0;
  let m;

  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      nodes.push({ type: 'text', value: text.slice(lastIdx, m.index) });
    }

    if (m[1] !== undefined) {
      // **bold**
      nodes.push({ type: 'bold', children: [{ type: 'text', value: m[1] }] });
    } else {
      // [color]...[/color] — recursivo para suportar bold dentro
      nodes.push({ type: 'color', color: m[2], children: parseInline(m[3], depth + 1) });
    }

    lastIdx = re.lastIndex;
  }

  if (lastIdx < text.length) {
    nodes.push({ type: 'text', value: text.slice(lastIdx) });
  }

  return nodes.length ? nodes : [{ type: 'text', value: text }];
}

function renderNodes(nodes) {
  return nodes.map((node, i) => {
    if (node.type === 'text') return node.value;
    if (node.type === 'bold') {
      return <strong key={i} className="font-bold" style={{ color: 'inherit' }}>{renderNodes(node.children)}</strong>;
    }
    if (node.type === 'color') {
      const color = COLOR_MAP[node.color] || node.color;
      return <span key={i} style={{ color }}>{renderNodes(node.children)}</span>;
    }
    return null;
  });
}

/**
 * @param {string} content  — texto com marcação
 * @param {string} className — classe extra no wrapper
 */
export function RichText({ content, className = '' }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, i) => {
        if (!line.trim()) {
          return <div key={i} className="h-2" />;
        }
        return (
          <p key={i} className="leading-relaxed">
            {renderNodes(parseInline(line))}
          </p>
        );
      })}
    </div>
  );
}
