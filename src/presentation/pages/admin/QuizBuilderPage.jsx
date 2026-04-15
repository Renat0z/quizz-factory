import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, Trash2, ChevronDown, ChevronUp,
  Save, Globe, EyeOff, Eye, Loader2, ArrowLeft, Settings
} from 'lucide-react';
import { slugify } from '../../../core/entities/Quiz';
import { getAvailableTypes } from '../../components/question-types/QuestionFactory';
import { calcOrderKey } from '../../../core/entities/Question';
import { QuizPlayer } from '../../components/QuizPlayer';
import { RichTextEditor } from '../../components/RichTextEditor';

// ---------------------------------------------------------------------------
// SortableQuestion — item arrastável na lista
// ---------------------------------------------------------------------------
function SortableQuestion({ question, isExpanded, onToggle, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const options = Array.isArray(question.options) ? question.options : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
    >
      {/* Header da pergunta */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          {...attributes}
          {...listeners}
          className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing p-1 shrink-0"
          aria-label="Arrastar"
        >
          <GripVertical size={16} />
        </button>

        <span className="text-xs font-mono text-zinc-500 shrink-0 w-5">{question._idx + 1}</span>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono shrink-0">
              {question.type}
            </span>
            <p className="text-sm font-semibold text-white truncate">
              {question.title || 'Sem título'}
            </p>
            {question.required && (
              <span className="text-red-400 text-xs shrink-0">*</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggle} className="p-1 text-zinc-500 hover:text-white transition-colors">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={onDelete} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Formulário de edição */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 pt-4 space-y-3">
          <div>
            <label className="text-xs text-zinc-400 font-semibold mb-1 block">Título *</label>
            <input
              value={question.title}
              onChange={e => onUpdate({ title: e.target.value })}
              placeholder="Título da pergunta"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold mb-1 block">
              {question.type === 'welcome' ? 'Subtítulo (rich text — aparece acima do logo)' : 'Descrição (rich text)'}
            </label>
            <RichTextEditor
              value={question.description || ''}
              onChange={val => onUpdate({ description: val })}
              placeholder={
                question.type === 'welcome'
                  ? '[yellow]Abril/Maio — Lagoinha Arapiraca[/yellow]'
                  : 'Texto explicativo (opcional) — suporta **negrito** e [yellow]cores[/yellow]'
              }
              rows={question.type === 'welcome' ? 2 : 3}
            />
          </div>

          {question.type === 'welcome' && (
            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1 block">
                Corpo do card (rich text — aparece no card branco)
              </label>
              <RichTextEditor
                value={question.placeholder || ''}
                onChange={val => onUpdate({ placeholder: val })}
                placeholder={'**Família, graça e paz! 👐**\n\nTexto normal aqui.\n\n[yellow]Leva menos de 2 minutos 🙏[/yellow]\n\n**Contamos com você!**'}
                rows={7}
              />
            </div>
          )}

          {['text', 'longtext'].includes(question.type) && (
            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1 block">Placeholder</label>
              <input
                value={question.placeholder || ''}
                onChange={e => onUpdate({ placeholder: e.target.value })}
                placeholder="Texto de exemplo no campo"
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand transition-colors"
              />
            </div>
          )}

          {['choice', 'multichoice'].includes(question.type) && (
            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1 block">
                Opções (uma por linha — label|valor)
              </label>
              <textarea
                value={options.map(o => o.label === o.value ? o.label : `${o.label}|${o.value}`).join('\n')}
                onChange={e => {
                  const parsed = e.target.value.split('\n').map(line => {
                    const [label, value] = line.split('|');
                    return { label: label.trim(), value: (value || label).trim() };
                  }).filter(o => o.label);
                  onUpdate({ options: parsed });
                }}
                rows={Math.max(3, options.length + 1)}
                placeholder={'Opção 1\nOpção 2\nOpção 3'}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand transition-colors resize-none font-mono"
              />
            </div>
          )}

          {question.type === 'rating' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-zinc-400 font-semibold mb-1 block">Mínimo</label>
                <input
                  type="number"
                  value={question.config?.min ?? 1}
                  onChange={e => onUpdate({ config: { ...question.config, min: parseInt(e.target.value) } })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-400 font-semibold mb-1 block">Máximo</label>
                <input
                  type="number"
                  value={question.config?.max ?? 5}
                  onChange={e => onUpdate({ config: { ...question.config, max: parseInt(e.target.value) } })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id={`req-${question.id}`}
              checked={question.required}
              onChange={e => onUpdate({ required: e.target.checked })}
              className="accent-brand"
            />
            <label htmlFor={`req-${question.id}`} className="text-sm text-zinc-300 cursor-pointer">
              Resposta obrigatória
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuizBuilderPage — página principal
// ---------------------------------------------------------------------------
export default function QuizBuilderPage({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [quiz, setQuiz] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'draft',
    config: {
      theme: { primary: '#6C5CE7' },
      successTitle: 'Tudo certo!',
      successMessage: 'Suas respostas foram registradas.',
      showProgressCount: true,
      allowRetake: false,
    },
  });
  const [questions, setQuestions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState('questions'); // 'questions' | 'settings'

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Carregar quiz existente
  useEffect(() => {
    if (isNew) return;
    Promise.all([
      fetch(`/api/admin/quizzes`, { headers }).then(r => r.json()),
      fetch(`/api/admin/quizzes/${id}/questions`, { headers }).then(r => r.json()),
    ]).then(([quizzes, qs]) => {
      const found = quizzes.find(q => q.id === id);
      if (found) setQuiz(found);
      setQuestions(Array.isArray(qs) ? qs : []);
    });
  }, [id]);

  // Auto-slug no modo novo
  useEffect(() => {
    if (isNew && quiz.name) {
      setQuiz(q => ({ ...q, slug: slugify(q.name) }));
    }
  }, [quiz.name, isNew]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ---------------------------------------------------------------------------
  // Salvar quiz
  // ---------------------------------------------------------------------------
  const saveQuiz = useCallback(async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      let savedId = id;
      // Garante slug mesmo se o useEffect ainda não rodou (ex: clique rápido)
      const effectiveSlug = quiz.slug || slugify(quiz.name);

      if (isNew) {
        const res = await fetch('/api/admin/quizzes', {
          method: 'POST', headers,
          body: JSON.stringify({ name: quiz.name, slug: effectiveSlug, description: quiz.description, config: quiz.config }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const created = await res.json();
        savedId = created.id;
      } else {
        await fetch(`/api/admin/quizzes/${id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ name: quiz.name, slug: quiz.slug, description: quiz.description, config: quiz.config }),
        });
      }

      // Salvar perguntas: upsert sequencial
      for (const q of questions) {
        if (q._new) {
          await fetch(`/api/admin/quizzes/${savedId}/questions`, {
            method: 'POST', headers,
            body: JSON.stringify(q),
          });
        } else {
          await fetch(`/api/admin/questions/${q.id}`, {
            method: 'PUT', headers,
            body: JSON.stringify(q),
          });
        }
      }

      setSaveMsg('Salvo!');
      setTimeout(() => setSaveMsg(''), 2000);
      if (isNew) navigate(`/admin/quizzes/${savedId}/edit`, { replace: true });
    } catch (err) {
      setSaveMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [quiz, questions, id, isNew, headers, navigate]);

  // ---------------------------------------------------------------------------
  // Adicionar pergunta
  // ---------------------------------------------------------------------------
  const addQuestion = (type) => {
    const maxKey = questions.reduce((m, q) => Math.max(m, q.order_key || 0), 0);
    const newQ = {
      id: `_new_${Date.now()}`,
      _new: true,
      type,
      title: '',
      description: '',
      placeholder: '',
      options: type === 'choice' || type === 'multichoice'
        ? [{ label: 'Opção 1', value: 'opcao_1' }, { label: 'Opção 2', value: 'opcao_2' }]
        : null,
      required: type !== 'welcome',
      order_key: maxKey + 1.0,
      config: type === 'rating' ? { min: 1, max: 5 } : {},
      branch_rules: [],
    };
    setQuestions(prev => [...prev, newQ]);
    setExpandedId(newQ.id);
  };

  // ---------------------------------------------------------------------------
  // Atualizar pergunta local
  // ---------------------------------------------------------------------------
  const updateQuestion = (qId, patch) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, ...patch } : q));
  };

  // ---------------------------------------------------------------------------
  // Deletar pergunta
  // ---------------------------------------------------------------------------
  const deleteQuestion = async (qId) => {
    const q = questions.find(x => x.id === qId);
    if (!q._new) {
      await fetch(`/api/admin/questions/${qId}`, { method: 'DELETE', headers });
    }
    setQuestions(prev => prev.filter(x => x.id !== qId));
  };

  // ---------------------------------------------------------------------------
  // Drag & drop
  // ---------------------------------------------------------------------------
  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIdx = questions.findIndex(q => q.id === active.id);
    const newIdx = questions.findIndex(q => q.id === over.id);
    const reordered = arrayMove(questions, oldIdx, newIdx);

    // Recalcular order_keys com fractional indexing
    const updated = reordered.map((q, i) => ({
      ...q,
      order_key: calcOrderKey(
        reordered[i - 1]?.order_key ?? null,
        reordered[i + 1]?.order_key ?? null
      ),
    }));

    setQuestions(updated);

    // Persistir no backend (apenas perguntas já salvas)
    const toUpdate = updated.filter(q => !q._new).map(q => ({ id: q.id, orderKey: q.order_key }));
    if (toUpdate.length > 0) {
      await fetch('/api/admin/questions/reorder', {
        method: 'POST', headers, body: JSON.stringify({ updates: toUpdate }),
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Preview quiz
  // ---------------------------------------------------------------------------
  const previewQuiz = {
    ...quiz,
    id: id || '_preview',
    questions: questions.map((q, i) => ({ ...q, _idx: i })),
  };

  const togglePublish = async () => {
    const publish = quiz.status !== 'published';
    const res = await fetch(`/api/admin/quizzes/${id}/publish`, {
      method: 'POST', headers, body: JSON.stringify({ publish }),
    });
    const updated = await res.json();
    setQuiz(updated);
  };

  const types = getAvailableTypes();
  const questionsWithIdx = questions.map((q, i) => ({ ...q, _idx: i }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4 bg-zinc-900">
        <Link to="/admin/quizzes" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <input
          value={quiz.name}
          onChange={e => setQuiz(q => ({ ...q, name: e.target.value }))}
          placeholder="Nome do quiz"
          className="flex-1 bg-transparent text-xl font-bold text-white outline-none placeholder:text-zinc-600"
        />
        <div className="flex items-center gap-2 shrink-0">
          {saveMsg && (
            <span className={`text-xs font-semibold ${saveMsg.startsWith('Erro') ? 'text-red-400' : 'text-green-400'}`}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={() => setShowPreview(s => !s)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPreview ? 'Fechar' : 'Preview'}
          </button>
          {!isNew && (
            <button
              onClick={togglePublish}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                quiz.status === 'published'
                  ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Globe size={15} />
              {quiz.status === 'published' ? 'Publicado' : 'Publicar'}
            </button>
          )}
          <button
            onClick={saveQuiz}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Coluna esquerda — Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full max-w-3xl'} flex flex-col border-r border-zinc-800 overflow-y-auto`}>
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 px-6">
            {[
              { id: 'questions', label: 'Perguntas' },
              { id: 'settings', label: 'Configurações', icon: Settings },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-zinc-500 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4 flex-1">
            {tab === 'questions' && (
              <>
                {/* Lista de perguntas com DnD */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={({ active }) => setActiveId(active.id)}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={questionsWithIdx.map(q => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {questionsWithIdx.map(q => (
                        <SortableQuestion
                          key={q.id}
                          question={q}
                          isExpanded={expandedId === q.id}
                          onToggle={() => setExpandedId(id => id === q.id ? null : q.id)}
                          onUpdate={patch => updateQuestion(q.id, patch)}
                          onDelete={() => deleteQuestion(q.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {questions.length === 0 && (
                  <div className="text-center py-10 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
                    <p className="text-sm mb-2">Nenhuma pergunta ainda</p>
                    <p className="text-xs">Adicione uma abaixo</p>
                  </div>
                )}

                {/* Adicionar pergunta */}
                <div className="pt-2">
                  <p className="text-xs text-zinc-500 font-semibold mb-2 uppercase tracking-wider">Adicionar pergunta</p>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {types.map(t => (
                      <button
                        key={t.type}
                        onClick={() => addQuestion(t.type)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand/50 hover:bg-zinc-800 transition-all text-center"
                      >
                        <span className="text-xl">{t.icon}</span>
                        <span className="text-xs text-zinc-400 font-medium leading-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === 'settings' && (
              <div className="space-y-6">
                {/* Info básica */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Informações</h3>
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold mb-1 block">Slug (URL)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-sm">/</span>
                      <input
                        value={quiz.slug}
                        onChange={e => setQuiz(q => ({ ...q, slug: slugify(e.target.value) }))}
                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold mb-1 block">Descrição</label>
                    <textarea
                      value={quiz.description || ''}
                      onChange={e => setQuiz(q => ({ ...q, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand resize-none"
                    />
                  </div>
                </div>

                {/* Tela de sucesso */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Tela de sucesso</h3>
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold mb-1 block">Título</label>
                    <input
                      value={quiz.config?.successTitle || ''}
                      onChange={e => setQuiz(q => ({ ...q, config: { ...q.config, successTitle: e.target.value } }))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold mb-1 block">
                      Mensagem <span className="text-zinc-500">(use {'{nome}'} para personalizar)</span>
                    </label>
                    <textarea
                      value={quiz.config?.successMessage || ''}
                      onChange={e => setQuiz(q => ({ ...q, config: { ...q.config, successMessage: e.target.value } }))}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold mb-1 block">URL de redirecionamento</label>
                    <input
                      value={quiz.config?.successRedirectUrl || ''}
                      onChange={e => setQuiz(q => ({ ...q, config: { ...q.config, successRedirectUrl: e.target.value } }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm outline-none focus:border-brand font-mono"
                    />
                  </div>
                </div>

                {/* Tema */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Design</h3>
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold mb-2 block">Cor primária</label>
                    <div className="flex gap-2 flex-wrap">
                      {['#6C5CE7','#E17055','#00B894','#0984E3','#FDCB6E','#E84393','#2D3436','#00CEC9'].map(c => (
                        <button
                          key={c}
                          onClick={() => setQuiz(q => ({ ...q, config: { ...q.config, theme: { ...q.config?.theme, primary: c } } }))}
                          className="w-8 h-8 rounded-lg border-2 transition-all"
                          style={{
                            backgroundColor: c,
                            borderColor: quiz.config?.theme?.primary === c ? '#fff' : 'transparent',
                            transform: quiz.config?.theme?.primary === c ? 'scale(1.2)' : 'scale(1)',
                          }}
                        />
                      ))}
                      <input
                        type="color"
                        value={quiz.config?.theme?.primary || '#6C5CE7'}
                        onChange={e => setQuiz(q => ({ ...q, config: { ...q.config, theme: { ...q.config?.theme, primary: e.target.value } } }))}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-700"
                        title="Cor personalizada"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quiz.config?.showProgressCount !== false}
                        onChange={e => setQuiz(q => ({ ...q, config: { ...q.config, showProgressCount: e.target.checked } }))}
                        className="accent-brand"
                      />
                      <span className="text-sm text-zinc-300">Mostrar contagem de etapas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!quiz.config?.allowRetake}
                        onChange={e => setQuiz(q => ({ ...q, config: { ...q.config, allowRetake: e.target.checked } }))}
                        className="accent-brand"
                      />
                      <span className="text-sm text-zinc-300">Permitir reenvio</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita — Preview */}
        {showPreview && (
          <div className="w-1/2 overflow-hidden">
            <div className="h-full bg-zinc-900 flex flex-col">
              <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-zinc-500 font-semibold">PREVIEW AO VIVO</span>
              </div>
              <div className="flex-1 overflow-auto">
                <QuizPlayer quiz={previewQuiz} isPreview />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
