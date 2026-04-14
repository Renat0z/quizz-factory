import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell
} from 'recharts';
import {
  ArrowLeft, Users, TrendingUp, Clock, Download, Loader2,
  AlertCircle, CheckCircle2
} from 'lucide-react';

function KpiCard({ icon: Icon, label, value, sublabel, color = '#6C5CE7' }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color }} />
        <p className="text-xs text-zinc-400 font-semibold">{label}</p>
      </div>
      <p className="text-3xl font-black text-white">{value ?? '—'}</p>
      {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
    </div>
  );
}

function formatMs(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const CHART_COLORS = ['#6C5CE7', '#00B894', '#0984E3', '#FDCB6E', '#E17055', '#E84393'];

export default function AnalyticsPage({ token }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const headers = { Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/quizzes`, { headers }).then(r => r.json()),
      fetch(`/api/admin/quizzes/${id}/analytics?days=${days}`, { headers }).then(r => r.json()),
    ]).then(([quizzes, analytics]) => {
      setQuiz(quizzes.find(q => q.id === id));
      setData(analytics);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [id, days]);

  const handleExport = () => {
    window.open(`/api/admin/quizzes/${id}/export?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 size={32} className="animate-spin text-zinc-600" />
      </div>
    );
  }

  const { kpis, dailySessions, funnel, distributions } = data || {};

  // Preparar dados do funil
  const funnelData = funnel?.map((f, i) => ({
    name: f.title.length > 25 ? f.title.slice(0, 25) + '…' : f.title,
    visualizaram: parseInt(f.sessions_viewed) || 0,
    responderam: parseInt(f.sessions_answered) || 0,
    tempo: Math.round(f.avg_time_ms / 1000) || 0,
    abandonaram: Math.max(0, (parseInt(f.sessions_viewed) || 0) - (parseInt(f.sessions_answered) || 0)),
  })) || [];

  // Calcular taxa de abandono por step
  const maxViewed = Math.max(...funnelData.map(f => f.visualizaram), 1);

  // Distribuições por pergunta
  const questionsWithDist = funnel?.map(f => {
    const dist = distributions?.filter(d => d.question_id === f.id) || [];
    return { ...f, dist };
  }) || [];

  return (
    <div className="p-8 text-white space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/quizzes" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black">{quiz?.name || 'Analytics'}</h1>
            <p className="text-zinc-400 text-sm mt-0.5 font-mono">/{quiz?.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtro de período */}
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm outline-none focus:border-brand"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último ano</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard icon={Users} label="Sessões iniciadas" value={kpis?.total_sessions || 0} color="#6C5CE7" />
        <KpiCard icon={CheckCircle2} label="Concluídas" value={kpis?.completed || 0} color="#00B894" />
        <KpiCard icon={AlertCircle} label="Abandonadas" value={kpis?.abandoned || 0} color="#E17055" />
        <KpiCard
          icon={TrendingUp}
          label="Taxa de conclusão"
          value={kpis?.completion_rate ? `${kpis.completion_rate}%` : '—'}
          color="#FDCB6E"
        />
        <KpiCard
          icon={Clock}
          label="Tempo médio"
          value={formatMs(kpis?.avg_completion_ms)}
          sublabel="para completar"
          color="#0984E3"
        />
      </div>

      {/* Sessões por dia */}
      {dailySessions?.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-5">Sessões por dia</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailySessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff' }}
              />
              <Legend wrapperStyle={{ color: '#888', fontSize: 12 }} />
              <Line type="monotone" dataKey="started" name="Iniciadas" stroke="#6C5CE7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" name="Concluídas" stroke="#00B894" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Funil de abandono */}
      {funnelData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-1">Funil de abandono por etapa</h2>
          <p className="text-xs text-zinc-500 mb-5">
            Diferença entre "visualizaram" e "responderam" = abandono nessa etapa
          </p>
          <ResponsiveContainer width="100%" height={Math.max(300, funnelData.length * 50)}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={160} tick={{ fill: '#ccc', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff' }}
              />
              <Legend wrapperStyle={{ color: '#888', fontSize: 12 }} />
              <Bar dataKey="visualizaram" name="Visualizaram" fill="#6C5CE7" radius={[0, 4, 4, 0]} />
              <Bar dataKey="responderam" name="Responderam" fill="#00B894" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tempo por pergunta */}
      {funnelData.some(f => f.tempo > 0) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-1">Tempo médio por pergunta</h2>
          <p className="text-xs text-zinc-500 mb-5">Em segundos (excluindo tempo com aba em background)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis unit="s" tick={{ fill: '#888', fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [`${v}s`, 'Tempo médio']}
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff' }}
              />
              <Bar dataKey="tempo" name="Tempo (s)" radius={[4, 4, 0, 0]}>
                {funnelData.map((f, i) => {
                  const maxTime = Math.max(...funnelData.map(x => x.tempo), 1);
                  const ratio = f.tempo / maxTime;
                  const color = ratio > 0.7 ? '#E17055' : ratio > 0.4 ? '#FDCB6E' : '#00B894';
                  return <Cell key={i} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-zinc-600 mt-3">
            🟢 Rápido · 🟡 Moderado · 🔴 Atenção (mais de 70% do tempo máximo)
          </p>
        </div>
      )}

      {/* Distribuição de respostas */}
      {questionsWithDist.filter(q => q.dist.length > 0).map(q => (
        <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-1">{q.title}</h2>
          <p className="text-xs text-zinc-500 mb-5 font-mono">{q.type}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={q.dist.map((d, i) => ({ name: d.value, count: parseInt(d.count), fill: CHART_COLORS[i % CHART_COLORS.length] }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="name" tick={{ fill: '#ccc', fontSize: 12 }} />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff' }}
              />
              <Bar dataKey="count" name="Respostas" radius={[4, 4, 0, 0]}>
                {q.dist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}

      {(!funnelData.length && !dailySessions?.length) && (
        <div className="text-center py-16 text-zinc-600">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold mb-1">Sem dados ainda</p>
          <p className="text-sm">Publique o quiz e aguarde as primeiras respostas</p>
        </div>
      )}
    </div>
  );
}
