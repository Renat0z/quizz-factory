import { TextQuestion } from './TextQuestion';
import { LongTextQuestion } from './LongTextQuestion';
import { ChoiceQuestion } from './ChoiceQuestion';
import { MultiChoiceQuestion } from './MultiChoiceQuestion';
import { DateQuestion } from './DateQuestion';
import { RatingQuestion } from './RatingQuestion';
import { WelcomeQuestion } from './WelcomeQuestion';

/**
 * Registro central de tipos de pergunta.
 * Para adicionar um novo tipo: registrar aqui + criar o componente.
 * NUNCA modificar QuizPlayer para adicionar tipos (OCP).
 */
const registry = {
  welcome:     WelcomeQuestion,
  text:        TextQuestion,
  longtext:    LongTextQuestion,
  choice:      ChoiceQuestion,
  multichoice: MultiChoiceQuestion,
  date:        DateQuestion,
  rating:      RatingQuestion,
};

/**
 * Registra um novo tipo de pergunta em runtime.
 * @param {string} type
 * @param {React.ComponentType} Component - deve aceitar { question, value, onChange }
 */
export function registerQuestionType(type, Component) {
  registry[type] = Component;
}

/**
 * Retorna os tipos de pergunta disponíveis (para o builder).
 */
export function getAvailableTypes() {
  return [
    { type: 'welcome',     label: 'Boas-vindas',      icon: '👋', description: 'Tela inicial com logo e texto' },
    { type: 'text',        label: 'Texto curto',       icon: 'T',  description: 'Campo de uma linha' },
    { type: 'longtext',    label: 'Texto longo',       icon: '¶',  description: 'Área de texto livre' },
    { type: 'choice',      label: 'Escolha única',     icon: '◉',  description: 'Radio — uma opção' },
    { type: 'multichoice', label: 'Múltipla escolha',  icon: '☑',  description: 'Checkbox — várias opções' },
    { type: 'date',        label: 'Data',              icon: '📅',  description: 'Dia / Mês / Ano' },
    { type: 'rating',      label: 'Avaliação',         icon: '★',  description: 'Escala numérica' },
  ];
}

/**
 * Componente principal — renderiza o tipo correto de pergunta.
 * Interface uniforme: { question, value, onChange } (LSP)
 */
export function QuestionFactory({ question, value, onChange }) {
  const Component = registry[question.type];

  if (!Component) {
    return (
      <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/10 text-red-400 text-sm">
        Tipo de pergunta desconhecido: <code>{question.type}</code>
      </div>
    );
  }

  return <Component question={question} value={value} onChange={onChange} />;
}
