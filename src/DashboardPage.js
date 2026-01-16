import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './DashboardPage.css';

const DASH_PERIOD_KEY = 'rss-dashboard-period';

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

function formatDateTime(value) {
  if (!value) return 'Sem dados';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}

function Sparkline({ data }) {
  if (!data.length) {
    return <div className="dash-empty">Sem dados</div>;
  }
  const max = Math.max(...data.map(point => point.count || 0), 1);
  const points = data.map((point, idx) => {
    const x = (idx / (data.length - 1 || 1)) * 100;
    const y = 100 - Math.round((point.count / max) * 100);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" className="h-12 w-full" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function StackedBar({ parts }) {
  const total = parts.reduce((acc, item) => acc + (item.value || 0), 0);
  return (
    <div className="dash-stack">
      {parts.map(item => {
        const width = total ? Math.max(2, Math.round((item.value / total) * 100)) : 0;
        return (
          <span
            key={item.key}
            className={`dash-stack-segment ${item.tone}`}
            style={{ width: `${width}%` }}
            title={`${item.label}: ${item.value}`}
          />
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [sheetsMessage, setSheetsMessage] = useState('');
  const [period, setPeriod] = useState('24h');
  const [trends, setTrends] = useState([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [myTasks, setMyTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [tasksStreamStatus, setTasksStreamStatus] = useState('offline');
  const hasMetricsRef = useRef(false);
  useEffect(() => {
    const cached = localStorage.getItem('rss-dashboard-cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setMetrics(parsed);
        setLoading(false);
        hasMetricsRef.current = true;
      } catch (e) {
        // ignore
      }
    }
    const storedPeriod = localStorage.getItem(DASH_PERIOD_KEY);
    if (storedPeriod === '24h' || storedPeriod === '7d' || storedPeriod === '30d') {
      setPeriod(storedPeriod);
    }
  }, []);

  const loadMetrics = useCallback(async (forceLoading = false) => {
    setError('');
    if (forceLoading || !hasMetricsRef.current) {
      setLoading(true);
      setUpdating(false);
    } else {
      setUpdating(true);
    }
    try {
      const res = await apiFetch(`${API_BASE}/dashboard/metrics?period=${encodeURIComponent(period)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dashboard.');
      setMetrics(data);
      hasMetricsRef.current = true;
      localStorage.setItem('rss-dashboard-cache', JSON.stringify(data));
    } catch (err) {
      setError(err.message || 'Falha ao carregar dashboard.');
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, [period]);

  const loadMyTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/tasks/my`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar tarefas.');
      setMyTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setMyTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/notifications/my`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar notificacoes.');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    loadMetrics(true);
    const interval = setInterval(loadMetrics, 120000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  useEffect(() => {
    loadMyTasks();
    const interval = setInterval(loadMyTasks, 120000);
    return () => clearInterval(interval);
  }, [loadMyTasks]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 120000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/stream/tasks`, { withCredentials: true });
    const handleTaskEvent = () => {
      setTasksStreamStatus('online');
      loadMyTasks();
      loadNotifications();
    };
    source.addEventListener('task', handleTaskEvent);
    source.onopen = () => setTasksStreamStatus('online');
    source.onerror = () => {
      setTasksStreamStatus('offline');
    };
    return () => {
      source.close();
      setTasksStreamStatus('offline');
    };
  }, [loadMyTasks, loadNotifications]);

  useEffect(() => {
    setTrendsLoading(true);
    apiFetch(`${API_BASE}/trends`)
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data.items) ? data.items : [];
        setTrends(items.slice(0, 3));
      })
      .catch(() => {
        setTrends([]);
      })
      .finally(() => {
        setTrendsLoading(false);
      });
  }, []);

  const newsMax = useMemo(() => {
    if (!metrics?.charts?.newsPerDay?.length) return 0;
    return Math.max(...metrics.charts.newsPerDay.map(entry => entry.count || 0));
  }, [metrics]);

  const queueParts = useMemo(() => {
    const stats = metrics?.influencers || {};
    return [
      { key: 'recommended', label: 'Recomendadas', value: stats.queueRecommended || 0, tone: 'is-recommended' },
      { key: 'pending', label: 'Pendentes', value: stats.queuePending || 0, tone: 'is-pending' },
      { key: 'approved', label: 'Aprovadas', value: stats.queueApproved || 0, tone: 'is-approved' },
      { key: 'discarded', label: 'Descartadas', value: stats.queueDiscarded || 0, tone: 'is-discarded' }
    ];
  }, [metrics]);

  const periodLabel = period === '30d' ? 'Últimos 30 dias' : period === '7d' ? 'Últimos 7 dias' : 'Último dia';
  const aiPerDay = useMemo(() => (metrics?.charts?.aiPerDay || []), [metrics]);
  const aiMax = useMemo(() => {
    if (!aiPerDay.length) return 0;
    return Math.max(...aiPerDay.map(entry => entry.total || 0), 1);
  }, [aiPerDay]);

  const feedErrors = metrics?.charts?.feedErrors || [];
  const lastAggregatedAt = metrics?.meta?.lastAggregatedAt;

  const handlePeriod = (value) => {
    setPeriod(value);
    try {
      localStorage.setItem(DASH_PERIOD_KEY, value);
    } catch (e) {
      // ignore
    }
  };

  const handleSelectPage = (key) => {
    if (typeof window !== 'undefined' && key) {
      window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: key }));
    }
  };

  const handleExportMetrics = async () => {
    setSheetsMessage('');
    setSheetsExporting(true);
    try {
      const res = await apiFetch(API_BASE + '/google/sheets/export/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao exportar métricas.');
      }
      setSheetsMessage('Métricas exportadas.');
    } catch (err) {
      setSheetsMessage(err.message || 'Falha ao exportar métricas.');
    } finally {
      setSheetsExporting(false);
      setTimeout(() => setSheetsMessage(''), 3500);
    }
  };

  const handleUpdateTaskStatus = async (taskId, teamId, status) => {
    if (!taskId || !teamId) return;
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar tarefa.');
      setMyTasks((prev) => prev.map((task) => (
        task.id === taskId ? { ...task, ...data } : task
      )));
    } catch (err) {
      // ignore
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (!notifications.length) return;
    const ids = notifications.map((item) => item.id);
    try {
      await apiFetch(`${API_BASE}/notifications/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      setNotifications([]);
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="dash-google">
      <div className="dash-header">
        <div className="dash-header-title">
          <h2>Dashboard</h2>
          <p>Visão geral dos dados mais importantes do sistema.</p>
        </div>
        <div className="dash-header-actions">
          {metrics?.meta?.pending && <span className="dash-pill is-warn">Coleta inicial...</span>}
          {metrics?.meta?.stale && !metrics?.meta?.pending && <span className="dash-pill">Dados em cache</span>}
          {updating && <span className="dash-pill">Atualizando...</span>}
          {sheetsMessage && <span className="dash-pill">{sheetsMessage}</span>}
          <div className="dash-period-toggle">
            <button
              type="button"
              className={`dash-period-btn ${period === '24h' ? 'is-active' : ''}`}
              onClick={() => handlePeriod('24h')}
            >
              24h
            </button>
            <button
              type="button"
              className={`dash-period-btn ${period === '7d' ? 'is-active' : ''}`}
              onClick={() => handlePeriod('7d')}
            >
              7d
            </button>
            <button
              type="button"
              className={`dash-period-btn ${period === '30d' ? 'is-active' : ''}`}
              onClick={() => handlePeriod('30d')}
            >
              30d
            </button>
          </div>
          <button className="dash-refresh" onClick={() => loadMetrics(true)} disabled={loading || updating}>
            Atualizar agora
          </button>
          <button className="dash-refresh" onClick={handleExportMetrics} disabled={sheetsExporting}>
            {sheetsExporting ? 'Exportando...' : 'Exportar métricas'}
          </button>
          <span className="dash-pill">Última atualização: {formatDateTime(metrics?.activity?.lastItemDate)}</span>
          {metrics?.meta?.cacheAgeMs != null && (
            <span className="dash-pill">Cache: {Math.round((metrics.meta.cacheAgeMs || 0) / 60000)} min</span>
          )}
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="dash-card">
          <div className="dash-metric-label">
            Novas tarefas atribuídas
            <span className={`dash-live-pill ${tasksStreamStatus === 'online' ? 'is-on' : 'is-off'}`}>
              {tasksStreamStatus === 'online' ? 'Ao vivo' : 'Desconectado'}
            </span>
          </div>
          <div className="dash-task-list">
            {notifications.slice(0, 4).map((item) => (
              <div key={item.id} className="dash-task-item">
                <div className="dash-task-title">{item.title}</div>
                <div className="dash-task-meta">
                  <span>{item.meta?.teamName || 'Time'}</span>
                  <span>{item.message}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="dash-refresh" onClick={handleMarkNotificationsRead}>
            Marcar como lidas
          </button>
        </div>
      )}

      {!tasksLoading && myTasks.length > 0 && (
        <div className="dash-card">
          <div className="dash-metric-label">
            Minhas tarefas do time
            <span className={`dash-live-pill ${tasksStreamStatus === 'online' ? 'is-on' : 'is-off'}`}>
              {tasksStreamStatus === 'online' ? 'Ao vivo' : 'Desconectado'}
            </span>
          </div>
          <div className="dash-task-list">
            {myTasks
              .slice(0, 6)
              .sort((a, b) => {
                const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                if (dueA !== dueB) return dueA - dueB;
                return String(a.priority || '').localeCompare(String(b.priority || ''));
              })
              .map((task) => (
              <div key={task.id} className="dash-task-item">
                <div className="dash-task-title">{task.title}</div>
                <div className="dash-task-meta">
                  <span>{task.teamName || 'Time'}</span>
                  <span>{task.priority}</span>
                  {task.dueDate && <span>Prazo: {task.dueDate}</span>}
                </div>
                <select
                  className="dash-task-select"
                  value={task.status}
                  onChange={(event) => handleUpdateTaskStatus(task.id, task.teamId, event.target.value)}
                >
                  <option value="pendente">Pendente</option>
                  <option value="em andamento">Em andamento</option>
                  <option value="concluida">Concluida</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="dash-card">Carregando métricas...</div>}
      {error && <div className="dash-card">{error}</div>}

      {metrics && !loading && !error && (
        <>
          <div className="dash-grid cols-4">
            <div className="dash-card">
            <div className="dash-metric-label">Notícias no período</div>
              <div className="dash-metric-value">{formatNumber(metrics.activity.newsLastRange)}</div>
              <div className="dash-metric-helper">
                Total no período: {formatNumber(metrics.charts.newsPerDay.reduce((acc, cur) => acc + cur.count, 0))}
              </div>
              <button className="dash-link" onClick={() => handleSelectPage('home')}>
                Ver timeline
              </button>
            </div>
            <div className="dash-card">
              <div className="dash-metric-label">Feeds</div>
              <div className="dash-metric-value">{formatNumber(metrics.totals.feedsTotal)}</div>
              <div className="dash-metric-helper">Linha do tempo: {formatNumber(metrics.totals.feedsOnTimeline)}</div>
              <button className="dash-link" onClick={() => handleSelectPage('repo')}>
                Ver repositório
              </button>
            </div>
            <div className="dash-card">
            <div className="dash-metric-label">Alertas</div>
              <div className="dash-metric-value">{formatNumber(metrics.totals.watchAlertsLastRange)}</div>
              <div className="dash-metric-helper">Temas ativos: {formatNumber(metrics.totals.watchTopicsCount)}</div>
              <button className="dash-link" onClick={() => handleSelectPage('watch')}>
                Ver acompanhamentos
              </button>
            </div>
            <div className="dash-card">
              <div className="dash-metric-label">Salvos</div>
              <div className="dash-metric-value">{formatNumber(metrics.totals.savedCount)}</div>
              <div className="dash-metric-helper">
                Eventos no período: {formatNumber(metrics.totals.eventsLastRange)}
              </div>
              <button className="dash-link" onClick={() => handleSelectPage('saved')}>
                Ver salvos
              </button>
            </div>
          </div>

          <div className="dash-grid cols-4">
            <div className="dash-card">
              <div className="dash-metric-label">Influencers</div>
              <div className="dash-metric-value">{formatNumber(metrics.influencers?.total || 0)}</div>
              <div className="dash-metric-helper">Usando IA: {formatNumber(metrics.influencers?.withAi || 0)}</div>
              <button className="dash-link" onClick={() => handleSelectPage('influencers')}>
                Ver perfis
              </button>
            </div>
            <div className="dash-card">
              <div className="dash-metric-label">Fila de revisão</div>
              <div className="dash-metric-value">{formatNumber(metrics.influencers?.queueTotal || 0)}</div>
              <StackedBar parts={queueParts} />
              <div className="dash-chip-row">
                <span className="dash-chip is-recommended">Recomendadas</span>
                <span className="dash-chip is-pending">Pendentes</span>
                <span className="dash-chip is-approved">Aprovadas</span>
                <span className="dash-chip is-discarded">Descartadas</span>
              </div>
            </div>
            <div className="dash-card">
              <div className="dash-metric-label">Publicações</div>
              <div className="dash-metric-value">{formatNumber(metrics.influencers?.published || 0)}</div>
              <div className="dash-metric-helper">Itens publicados na fila.</div>
            </div>
            <div className="dash-card">
              <div className="dash-metric-label">IA no periodo</div>
              <div className="dash-metric-value">{formatNumber(metrics.ai?.rewrites || 0)}</div>
              <div className="dash-metric-helper">Reescritas geradas</div>
              <div className="dash-list" style={{ marginTop: '8px' }}>
                <div className="dash-list-item">
                  <strong>Hashtags</strong>
                  <span>{formatNumber(metrics.ai?.hashtags || 0)}</span>
                </div>
                <div className="dash-list-item">
                  <strong>Publicações IA</strong>
                  <span>{formatNumber(metrics.ai?.influencerPublishes || 0)}</span>
                </div>
                <div className="dash-list-item">
                  <strong>Erros IA</strong>
                  <span>{formatNumber(metrics.ai?.errors || 0)}</span>
                </div>
              </div>
              <div className="dash-ai-channels">
                <span>Twitter {formatNumber(metrics.ai?.channels?.twitter || 0)}</span>
                <span>Telegram {formatNumber(metrics.ai?.channels?.telegram || 0)}</span>
                <span>WhatsApp {formatNumber(metrics.ai?.channels?.whatsapp || 0)}</span>
              </div>
              <div className="dash-mini-bars">
                {aiPerDay.map(entry => {
                  const height = aiMax ? Math.round((entry.total / aiMax) * 50) : 0;
                  return (
                    <span key={entry.date} className="dash-mini-bar">
                      <span className="dash-mini-fill" style={{ height: `${Math.max(height, 6)}px` }} />
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="dash-split">
            <div className="dash-card">
              <div className="dash-section-title">Notícias por dia</div>
              <div className="dash-subtle">{periodLabel}</div>
              <div className="dash-bar">
                {metrics.charts.newsPerDay.map(entry => {
                  const height = newsMax ? Math.round((entry.count / newsMax) * 140) : 0;
                  return (
                    <div key={entry.date} className="dash-bar-item">
                      <div className="dash-bar-track">
                        <div className="dash-bar-fill" style={{ height: `${Math.max(height, 14)}px` }} />
                      </div>
                      <span className="dash-subtle">{entry.date.slice(5)}</span>
                      <strong className="dash-subtle">{entry.count}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="dash-card">
              <div className="dash-section-title">Saúde e automação</div>
              <div className="dash-health-item">
                <span>Saúde das fontes</span>
                <strong>{Math.round(metrics.health.feedHealthPercent || 0)}%</strong>
              </div>
              <div className="dash-health-track">
                <div className="dash-health-fill" style={{ width: `${metrics.health.feedHealthPercent || 0}%` }} />
              </div>
              <div className="dash-subtle">
                {metrics.health.feedsWithError} feed(s) com falha no período
              </div>
              <div className="dash-health-item" style={{ marginTop: '12px' }}>
                <span>Automações ativas</span>
                <strong>{Math.round(metrics.automation.percent || 0)}%</strong>
              </div>
              <div className="dash-health-track">
                <div className="dash-health-fill" style={{ width: `${metrics.automation.percent || 0}%` }} />
              </div>
              <div className="dash-legend">
                <span>X: {metrics.automation.twitter ? 'on' : 'off'}</span>
                <span>Telegram: {metrics.automation.telegram ? 'on' : 'off'}</span>
                <span>WhatsApp: {metrics.automation.whatsapp ? 'on' : 'off'}</span>
              </div>
              <div className="dash-grid cols-2" style={{ marginTop: '12px' }}>
                <div className="dash-card" style={{ padding: '10px' }}>
                  <div className="dash-metric-label">Erros no período</div>
                  <div className="dash-metric-value" style={{ color: '#dc2626' }}>
                    {formatNumber(metrics.totals.errorsLastRange)}
                  </div>
                  <div className="dash-metric-helper">Falhas na leitura de feeds.</div>
                </div>
                <div className="dash-card" style={{ padding: '10px' }}>
                  <div className="dash-metric-label">Avisos no período</div>
                  <div className="dash-metric-value" style={{ color: '#d97706' }}>
                    {formatNumber(metrics.totals.warningLastRange)}
                  </div>
                  <div className="dash-metric-helper">Alertas e warnings gerais.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-grid cols-3">
            <div className="dash-card">
              <div className="dash-metric-label">Notícias nas últimas 6h</div>
              <div className="dash-metric-value">{formatNumber(metrics.activity.newsLast6h)}</div>
              <div className="dash-metric-helper">
                Média de idade: {formatNumber(metrics.activity.avgAgeMinutes)} min
              </div>
            </div>
            <div className="dash-card">
              <div className="dash-metric-label">Última atualização</div>
              <div className="dash-metric-value">{formatDateTime(metrics.activity.lastItemDate)}</div>
              <div className="dash-metric-helper">Hora de Brasília</div>
            </div>
            <div className="dash-card">
              <div className="dash-metric-label">Feeds com erro</div>
              <div className="dash-metric-value">{formatNumber(metrics.health.feedsWithError)}</div>
              <div className="dash-metric-helper">No periodo</div>
            </div>
          </div>

          <div className="dash-grid cols-2">
            <div className="dash-card">
              <div className="dash-section-title">Fontes mais ativas</div>
              <div className="dash-subtle">Top 6</div>
              <div className="dash-list" style={{ marginTop: '10px' }}>
                {metrics.charts.topFeeds.map(feed => (
                  <div key={feed.name} className="dash-list-item">
                    <strong>{feed.name}</strong>
                    <span>{feed.count} noticias</span>
                  </div>
                ))}
                {metrics.charts.topFeeds.length === 0 && (
                  <div className="dash-empty">Sem dados para exibir.</div>
                )}
              </div>
            </div>
            <div className="dash-card">
              <div className="dash-section-title">Top temas (tags)</div>
              <div className="dash-subtle">Tags automaticas</div>
              <div className="dash-list" style={{ marginTop: '10px' }}>
                {metrics.charts.topTags.map(tag => (
                  <div key={tag.name} className="dash-list-item">
                    <strong>{tag.name}</strong>
                    <span>{tag.count} noticias</span>
                  </div>
                ))}
                {metrics.charts.topTags.length === 0 && (
                  <div className="dash-empty">Sem tags para exibir.</div>
                )}
              </div>
            </div>
          </div>

          <div className="dash-grid cols-2">
            <div className="dash-card">
              <div className="dash-section-title">Falhas por fonte</div>
              <div className="dash-subtle">No período selecionado</div>
              <div className="dash-list" style={{ marginTop: '10px' }}>
                {feedErrors.length === 0 && <div className="dash-empty">Nenhuma falha registrada.</div>}
                {feedErrors.map(feed => (
                  <div key={feed.name} className="dash-list-item">
                    <div>
                      <strong>{feed.name}</strong>
                      <span>{feed.count} falha(s)</span>
                    </div>
                    {feed.url && (
                      <button
                        type="button"
                        className="dash-link"
                        onClick={() => window.open(feed.url, '_blank', 'noopener,noreferrer')}
                      >
                        Abrir feed
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="dash-card">
              <div className="dash-section-title">Pipeline</div>
              <div className="dash-subtle">Status da coleta e cache</div>
              <div className="dash-list" style={{ marginTop: '10px' }}>
                <div className="dash-list-item">
                  <strong>Idade do cache</strong>
                  <span>{Math.round((metrics.meta.cacheAgeMs || 0) / 60000)} min</span>
                </div>
                <div className="dash-list-item">
                  <strong>Última agregação</strong>
                  <span>{formatDateTime(lastAggregatedAt)}</span>
                </div>
                <div className="dash-list-item">
                  <strong>Coleta</strong>
                  <span>{metrics.meta.pending ? 'em andamento' : 'ok'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-grid cols-2">
            <div className="dash-card">
              <div className="dash-section-title">Notícias por hora</div>
              <div className="dash-subtle">Últimas 24h</div>
              <div style={{ marginTop: '12px', color: '#0f172a' }}>
                <Sparkline data={metrics.charts.newsPerHour} />
              </div>
              <div className="dash-legend" style={{ marginTop: '8px' }}>
                <span>{metrics.charts.newsPerHour[0]?.label || '00:00'}</span>
                <span>Agora</span>
              </div>
            </div>
            <div className="dash-card">
              <div className="dash-section-title">Tendências</div>
              <div className="dash-subtle">Top 3</div>
              <div className="dash-list" style={{ marginTop: '10px' }}>
                {trendsLoading && <div className="dash-empty">Carregando tendências...</div>}
                {!trendsLoading && trends.length === 0 && (
                  <div className="dash-empty">Sem tendências disponíveis.</div>
                )}
                {trends.map(item => (
                  <div key={item.title} className="dash-list-item">
                    <strong>{item.title}</strong>
                    <span>{item.traffic || 'sem tráfego'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}




