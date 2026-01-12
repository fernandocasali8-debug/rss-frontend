import React from 'react';

function formatNumber(value) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatDateTime(value) {
  if (!value) return 'Sem dados';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}

function mapStatus(status) {
  switch (status) {
    case 'green':
      return 'Estavel';
    case 'yellow':
      return 'Oscilando';
    case 'red':
      return 'Falha';
    default:
      return 'Sem dados';
  }
}

export default function AdminPage({
  metrics,
  feeds,
  feedStatus,
  events,
  summaryConfig,
  emailConfig,
  automationConfig,
  loading
}) {
  const totals = metrics?.totals || {};
  const health = metrics?.health || {};
  const activity = metrics?.activity || {};
  const influencers = metrics?.influencers || {};
  const meta = metrics?.meta || {};
  const sortedFeeds = Array.isArray(feeds) ? feeds.slice(0, 6) : [];
  const criticalEvents = Array.isArray(events)
    ? events.filter((event) => event.level === 'error' || event.level === 'warning').slice(0, 4)
    : [];
  const statCards = [
    {
      label: 'Feeds totais',
      value: formatNumber(totals.feedsTotal),
      note: `Timeline: ${formatNumber(totals.feedsOnTimeline)}`
    },
    {
      label: 'Noticias no periodo',
      value: formatNumber(activity.newsLastRange),
      note: `Ultimas 6h: ${formatNumber(activity.newsLast6h)}`
    },
    {
      label: 'Feeds com erro',
      value: formatNumber(health.feedsWithError),
      note: `Falhas: ${formatNumber(totals.errorsLastRange)}`
    },
    {
      label: 'Fila IA',
      value: formatNumber(influencers.queueTotal),
      note: `Publicados: ${formatNumber(influencers.published)}`
    }
  ];

  const governance = [
    { title: 'Usuarios e grupos', desc: 'Convites, roles, acessos e times.' },
    { title: 'Permissoes', desc: 'Matriz de acesso por modulo e acao.' },
    { title: 'Auditoria', desc: 'Eventos sensiveis e historico completo.' }
  ];

  const operations = [
    { title: 'Fila de atualizacao', desc: 'Prioridades, retentativas e jobs.' },
    { title: 'Erros de ingestao', desc: 'Feeds instaveis e falhas recorrentes.' },
    { title: 'Integracoes', desc: 'Chaves, webhooks e limites.' }
  ];

  const compliance = [
    { title: 'Politicas', desc: 'Retencao, privacidade e backups.' },
    { title: 'Exportacoes', desc: 'Relatorios, dumps e trilhas.' },
    { title: 'Alertas', desc: 'SLA, incidentes e escalonamento.' }
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Gestao do sistema
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Central do gestor</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Operacoes, governanca e configuracoes criticas para manter o ecossistema
              de feeds estavel e conforme as politicas internas.
            </p>
            <div className="mt-3 text-xs text-slate-400">
              Ultima atualizacao: {formatDateTime(meta.lastAggregatedAt)}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Criar usuario
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Reprocessar fila
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Abrir auditoria
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {card.label}
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</div>
              <div className="mt-1 text-xs text-slate-500">{card.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Governanca</h2>
              <p className="mt-1 text-sm text-slate-500">Controle de acesso e compliance.</p>
              <div className="mt-4 space-y-3">
                {governance.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Operacoes</h2>
              <p className="mt-1 text-sm text-slate-500">Resiliencia e filas criticas.</p>
              <div className="mt-4 space-y-3">
                {operations.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Compliance</h2>
              <p className="mt-1 text-sm text-slate-500">Politicas e trilhas.</p>
              <div className="mt-4 space-y-3">
                {compliance.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Feeds estrategicos</h2>
                <p className="mt-1 text-sm text-slate-500">Monitoramento de fontes criticas.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Ajustar limites
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Exportar lista
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Fonte</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ultima coleta</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFeeds.map((feed) => {
                    const statusInfo = feedStatus?.[feed.url] || {};
                    return (
                      <tr key={feed.id || feed.name} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-semibold text-slate-800">{feed.name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {mapStatus(statusInfo.status)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {statusInfo.message || 'Sem dados'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && sortedFeeds.length === 0 && (
                    <tr className="border-t border-slate-200">
                      <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={4}>
                        Nenhum feed encontrado.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr className="border-t border-slate-200">
                      <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={4}>
                        Carregando feeds...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
            <h3 className="text-lg font-semibold">Alertas criticos</h3>
            <p className="mt-1 text-sm text-white/70">Priorize o que afeta SLA.</p>
            <div className="mt-4 space-y-3">
              {criticalEvents.map((event) => (
                <div key={event.id || event.timestamp} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold">{event.message || 'Evento'}</div>
                  <div className="mt-1 text-xs text-white/70">
                    {event.detail || formatDateTime(event.timestamp)}
                  </div>
                </div>
              ))}
              {!loading && criticalEvents.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  Nenhum alerta critico recente.
                </div>
              )}
              {loading && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  Carregando alertas...
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Configuracoes criticas</h3>
            <p className="mt-1 text-sm text-slate-500">Paramentros globais e chaves.</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-800">Limites de requisicao</div>
                <div className="mt-1 text-xs text-slate-500">
                  Automacao: {automationConfig?.rules?.enabled ? 'ativa' : 'desativada'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-800">Chaves e tokens</div>
                <div className="mt-1 text-xs text-slate-500">
                  Email: {emailConfig?.enabled ? 'ativo' : 'desativado'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-800">Politicas de retencao</div>
                <div className="mt-1 text-xs text-slate-500">
                  Resumo diario: {summaryConfig?.enabled ? 'ativo' : 'desativado'}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
