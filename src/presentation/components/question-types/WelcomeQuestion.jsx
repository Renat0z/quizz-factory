import { RichText } from '../RichText';

/**
 * WelcomeQuestion — Tela de boas-vindas (não coleta resposta)
 * Interface: { question, value, onChange }
 *
 * Campos suportados:
 *   question.title       → título principal (renderizado pelo QuizPlayer)
 *   question.description → subtítulo (rich text, exibido acima do logo)
 *   question.placeholder → corpo do card (rich text, suporta **bold** e [color])
 *   question.config.logo → URL ou base64 do ícone circular
 */
export function WelcomeQuestion({ question }) {
  const subtitle = question.description;   // ex: "[yellow]Abril/Maio — Lagoinha[/yellow]"
  const body     = question.placeholder;   // corpo rico (ex: "**Família, graça e paz!** 👐\n\nTexto...")

  return (
    <div className="flex flex-col items-center text-center py-2 gap-5">
      {/* Subtítulo colorido (acima do logo) */}
      {subtitle && (
        <div className="text-base font-semibold" style={{ color: 'var(--color-muted)' }}>
          <RichText content={subtitle} />
        </div>
      )}

      {/* Logo / ícone circular */}
      {question.config?.logo && (
        <img
          src={question.config.logo}
          alt="Logo"
          className="w-20 h-20 rounded-full object-cover shadow-lg"
        />
      )}

      {/* Card com corpo rich text */}
      {body && (
        <div
          className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md w-full text-left"
          style={{ color: 'var(--color-muted)' }}
        >
          <RichText content={body} />
        </div>
      )}

      {/* Fallback se não tiver nada */}
      {!subtitle && !body && (
        <div
          className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md w-full"
          style={{ color: 'var(--color-muted)' }}
        >
          <p className="text-base leading-relaxed text-center">
            Clique em Começar para iniciar.
          </p>
        </div>
      )}
    </div>
  );
}
