import { ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';

/**
 * NavButtons — rodapé de navegação do QuizPlayer
 */
export function NavButtons({ isFirstStep, isLastStep, canAdvance, isSubmitting, onBack, onNext, step }) {
  const isWelcome = step === 0;

  return (
    <div
      className="px-6 md:px-10 py-5 border-t flex items-center justify-between"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={isFirstStep}
        className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all min-h-[44px]"
        style={{
          color: isFirstStep ? 'var(--color-border)' : 'var(--color-muted)',
          cursor: isFirstStep ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronLeft size={18} />
        Voltar
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={(!canAdvance && !isWelcome) || isSubmitting}
        className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all min-h-[44px]"
        style={{
          backgroundColor: (canAdvance || isWelcome) && !isSubmitting ? 'var(--color-primary)' : 'var(--color-border)',
          color: (canAdvance || isWelcome) && !isSubmitting ? '#fff' : 'var(--color-muted)',
          cursor: (canAdvance || isWelcome) && !isSubmitting ? 'pointer' : 'not-allowed',
          transform: (canAdvance || isWelcome) && !isSubmitting ? undefined : undefined,
        }}
      >
        {isSubmitting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isLastStep ? (
          <><Send size={18} /> Enviar</>
        ) : isWelcome ? (
          'Começar →'
        ) : (
          <>Próximo <ChevronRight size={18} /></>
        )}
      </button>
    </div>
  );
}
