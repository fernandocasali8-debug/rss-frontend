import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './PublicWatchSite.css';

const DEFAULT_EMAIL = 'fernandocasali8@gmail.com';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const getItemDate = (item) => item.isoDate || item.pubDate || '';

const uniqueTopics = (topics) => {
  const list = Array.isArray(topics) ? topics : [];
  return list.filter(Boolean);
};

function PublicWatchSite() {
  const [data, setData] = useState({ items: [], topics: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const refreshTimerRef = useRef(null);

  const queryEmail = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || DEFAULT_EMAIL;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchWatch = ({ initial = false } = {}) => {
      if (initial) {
        setLoading(true);
      }
      if (initial) {
        setError('');
      }
      apiFetch(`${API_BASE}/public/watch?email=${encodeURIComponent(queryEmail)}`)
        .then(res => res.json())
        .then(payload => {
          if (!isMounted) return;
          if (!payload || payload.ok === false) {
            if (initial) {
              setError('Não foi possível carregar as notícias.');
              setLoading(false);
            }
            return;
          }
          const nextData = {
            items: Array.isArray(payload.items) ? payload.items : [],
            topics: Array.isArray(payload.topics) ? payload.topics : []
          };
          setData(prev => {
            const hasPrev = Array.isArray(prev.items) && prev.items.length > 0;
            if (!hasPrev || nextData.items.length > 0) {
              return nextData;
            }
            return prev;
          });
          setHasLoaded(true);
          setLastUpdated(new Date());
          if (initial) setLoading(false);
        })
        .catch(() => {
          if (!isMounted) return;
          if (initial) {
            setError('Não foi possível carregar as notícias.');
            setLoading(false);
          }
        });
    };

    fetchWatch({ initial: true });

    refreshTimerRef.current = setInterval(() => {
      fetchWatch();
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [queryEmail]);

  const items = data.items || [];
  const heroItem = items[0];
  const secondaryItems = items.slice(1, 6);
  const listItems = items.slice(6, 12);
  const latestItems = items.slice(12, 18);

  const now = new Date();
  const todayLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const topics = uniqueTopics(data.topics);

  return (
    <div className="public-news">
      <div className="public-news-topbar">
        <span>EDIÇÃO DIÁRIA</span>
        <span>
          {todayLabel}
          {lastUpdated && ` • Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
        </span>
      </div>
      <header className="public-news-header">
        <div className="public-news-brand">
          <div className="public-news-logo">RN</div>
          <div>
            <div className="public-news-title">Radar de Notícias</div>
            <div className="public-news-subtitle">Seu radar ativo de notícias.</div>
          </div>
        </div>
        <nav className="public-news-nav">
          <a href="/noticias"><span className="material-icons-outlined">home</span>Home</a>
          <a href="/app"><span className="material-icons-outlined">dashboard</span>Entrar</a>
          <a href="/admin"><span className="material-icons-outlined">admin_panel_settings</span>Admin</a>
        </nav>
      </header>
      <main className="public-news-main">
        {loading && (
          <div className="public-news-layout public-news-skeleton">
            <section className="public-news-feature-grid">
              <div className="public-news-feature">
                <div className="skeleton-pill" />
                <div className="skeleton-title" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="public-news-chips">
                  <div className="skeleton-chip" />
                  <div className="skeleton-chip" />
                  <div className="skeleton-chip" />
                </div>
              </div>
              <aside className="public-news-rail">
                <div className="public-news-rail-card">
                  <div className="skeleton-label" />
                  <div className="skeleton-stat" />
                  <div className="skeleton-stat" />
                  <div className="skeleton-stat" />
                </div>
                <div className="public-news-rail-card">
                  <div className="skeleton-label" />
                  <div className="skeleton-topic" />
                  <div className="skeleton-topic" />
                  <div className="skeleton-topic" />
                </div>
              </aside>
            </section>
            <section className="public-news-feed-grid">
              <div className="public-news-feed">
                <div className="public-news-feed-card">
                  <div className="skeleton-label" />
                  <div className="skeleton-title" />
                  <div className="skeleton-line" />
                </div>
                <div className="public-news-feed-card">
                  <div className="skeleton-label" />
                  <div className="skeleton-title" />
                  <div className="skeleton-line" />
                </div>
                <div className="public-news-feed-card">
                  <div className="skeleton-label" />
                  <div className="skeleton-title" />
                  <div className="skeleton-line" />
                </div>
              </div>
              <div className="public-news-latest">
                <div className="public-news-latest-card">
                  <div className="skeleton-label" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
                <div className="public-news-latest-card">
                  <div className="skeleton-label" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            </section>
          </div>
        )}
        {!loading && error && !hasLoaded && (
          <div className="public-news-rail-card">{error}</div>
        )}
        {!loading && !error && (
          <div className="public-news-layout">
            <section className="public-news-feature-grid">
              <article className="public-news-feature">
                <div className="public-news-badge">
                  <span className="material-icons-outlined">insights</span>Destaque
                </div>
                {heroItem ? (
                  <>
                    <h1>{heroItem.title || 'Sem título'}</h1>
                    <p>{heroItem.contentSnippet || 'Sem resumo disponível.'}</p>
                    <div className="public-news-meta-row">
                      <span className="material-icons-outlined">source</span>
                      <span>{heroItem.feedName || 'Fonte'}</span>
                      <span className="material-icons-outlined">calendar_today</span>
                      <span>{formatDate(getItemDate(heroItem))}</span>
                      <span className="material-icons-outlined">schedule</span>
                      <span>{formatTime(getItemDate(heroItem))}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h1>Nenhuma notícia disponível</h1>
                    <p>Configure acompanhamentos para ver os destaques.</p>
                  </>
                )}
                <div className="public-news-chips">
                  <div className="public-news-chip"><span className="material-icons-outlined">bolt</span>Atualização contínua</div>
                  <div className="public-news-chip"><span className="material-icons-outlined">shield</span>Curadoria automatizada</div>
                  <div className="public-news-chip"><span className="material-icons-outlined">analytics</span>Monitoramento confiável</div>
                </div>
              </article>
              <aside className="public-news-rail">
                <div className="public-news-rail-card">
                  <h4>Painel do dia</h4>
                  <div className="public-news-stat-grid">
                    <div className="public-news-stat">
                      <span className="material-icons-outlined">rss_feed</span>
                      <div>
                        <strong>{items.length}</strong>
                        <div>Notícias no radar</div>
                      </div>
                    </div>
                    <div className="public-news-stat">
                      <span className="material-icons-outlined">topic</span>
                      <div>
                        <strong>{topics.length}</strong>
                        <div>Assuntos ativos</div>
                      </div>
                    </div>
                    <div className="public-news-stat">
                      <span className="material-icons-outlined">public</span>
                      <div>
                        <strong>Tempo real</strong>
                        <div>Acompanhe atualizações</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="public-news-rail-card">
                  <h4>Cadernos</h4>
                  <div className="public-news-topic-list">
                    {topics.length === 0 && (
                      <div className="public-news-topic">
                        <span className="material-icons-outlined">info</span>
                        Sem categorias ainda
                      </div>
                    )}
                    {topics.map(topic => (
                      <div key={topic.id} className="public-news-topic">
                        <span className="material-icons-outlined">label</span>
                        {topic.name}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
            <section className="public-news-feed-grid">
              <div className="public-news-feed">
                {secondaryItems.map((item, index) => (
                  <article key={`${item.link || item.title}-feed-${index}`} className="public-news-feed-card">
                    <div className="public-news-feed-meta">
                      <span>{item.topicName || 'Acompanhamento'}</span>
                      <span>{item.feedName || 'Fonte'}</span>
                    </div>
                    <h3>{item.title || 'Sem título'}</h3>
                    <p>{item.contentSnippet || 'Sem resumo disponível.'}</p>
                  </article>
                ))}
                {secondaryItems.length === 0 && (
                  <div className="public-news-feed-card">
                    <h3>Sem destaques adicionais</h3>
                    <p>Assim que houver novos conteúdos, eles aparecerão aqui.</p>
                  </div>
                )}
              </div>
              <div className="public-news-latest">
                <div className="public-news-latest-card">
                  <h4>Agenda</h4>
                  <div className="public-news-latest-list">
                    {listItems.map((item, index) => (
                      <a key={`${item.link || item.title}-list-${index}`} href={item.link || '#'} target="_blank" rel="noreferrer">
                        <h3>{item.title || 'Sem título'}</h3>
                        <p>{item.feedName || 'Fonte'} - {formatDate(getItemDate(item))}</p>
                      </a>
                    ))}
                    {listItems.length === 0 && <p>Nenhuma notícia recente.</p>}
                  </div>
                </div>
                <div className="public-news-latest-card">
                  <h4>Últimas</h4>
                  <div className="public-news-latest-list">
                    {latestItems.map((item, index) => (
                      <a key={`${item.link || item.title}-latest-${index}`} href={item.link || '#'} target="_blank" rel="noreferrer">
                        <h3>{item.title || 'Sem título'}</h3>
                        <p>{item.feedName || 'Fonte'} - {formatTime(getItemDate(item))}</p>
                      </a>
                    ))}
                    {latestItems.length === 0 && <p>Nenhuma notícia agora.</p>}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
      <footer className="public-news-footer">
        Atualizado em {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | Powered by RSS Leitor
      </footer>
    </div>
  );
}

export default PublicWatchSite;
