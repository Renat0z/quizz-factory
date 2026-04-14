/**
 * WelcomeQuestion — Tela de boas-vindas (não coleta resposta)
 * Interface: { question, value, onChange }
 */
export function WelcomeQuestion({ question }) {
  return (
    <div className="flex flex-col items-center text-center py-4 gap-6">
      {question.config?.logo && (
        <img
          src={question.config.logo}
          alt="Logo"
          className="w-24 h-24 rounded-full object-cover shadow-lg"
        />
      )}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md w-full text-left">
        <p
          className="text-base leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--color-muted)' }}
        >
          {question.description || 'Clique em Começar para iniciar.'}
        </p>
      </div>
    </div>
  );
}
