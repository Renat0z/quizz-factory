import { resolveTheme } from '../../core/entities/Quiz';

/**
 * ThemeProvider — injeta CSS variables do tema no wrapper raiz.
 * Todos os componentes filhos usam var(--color-primary) etc.
 * Zero prop-drilling de tema pela árvore de componentes.
 */
export function ThemeProvider({ theme, children, className = '' }) {
  const resolved = resolveTheme(theme);

  const cssVars = {
    '--color-primary': resolved.primary,
    '--color-bg':      resolved.bg,
    '--color-surface': resolved.surface,
    '--color-border':  resolved.border,
    '--color-text':    resolved.text,
    '--color-muted':   resolved.muted,
  };

  return (
    <div
      className={className}
      style={{
        ...cssVars,
        backgroundColor: resolved.bg,
        color: resolved.text,
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
