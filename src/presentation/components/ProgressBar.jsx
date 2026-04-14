/**
 * ProgressBar — barra de progresso no topo da tela
 */
export function ProgressBar({ progress }) {
  return (
    <div
      className="fixed top-0 left-0 w-full h-1 z-50"
      style={{ backgroundColor: 'var(--color-border)' }}
    >
      <div
        className="h-full transition-all duration-500 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: 'var(--color-primary)',
        }}
      />
    </div>
  );
}
