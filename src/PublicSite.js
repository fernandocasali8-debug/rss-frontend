import React from 'react';
import { API_BASE, apiFetch } from './api';
import './PublicSite.css';

const BRT_TIMEZONE = 'America/Sao_Paulo';

const hexToRgba = (value, alpha) => {
  if (!value) return '';
  const hex = value.replace('#', '').trim();
  if (!(hex.length === 3 || hex.length === 6)) return '';
  const full = hex.length === 3
    ? hex.split('').map(ch => ch + ch).join('')
    : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(n => Number.isNaN(n))) return '';
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BRT_TIMEZONE
  }).format(d);
}

export default function PublicSite({ slug }) {
  const [config, setConfig] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const fallbackConfig = React.useMemo(() => ({
    title: 'Reescritas',
    subtitle: 'Feed público',
    slug: slug || 'default',
    logo: '📰',
    themeMode: 'dark'
  }), [slug]);

  React.useEffect(() => {
    if (!slug) return;
    let active = true;
    const fetchConfig = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/site/${slug}`);
        if (!res.ok) throw new Error('Site nao encontrado.');
        const data = await res.json();
        if (active) setConfig(data);
      } catch (err) {
        if (active) setConfig(fallbackConfig);
      }
    };
    fetchConfig();
    return () => {
      active = false;
    };
  }, [slug, fallbackConfig]);

  React.useEffect(() => {
    if (!slug) return;
    let active = true;
    const fetchItems = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/site/${slug}/items`);
        const data = await res.json();
        if (!res.ok) throw new Error();
        if (active) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setLoading(false);
        }
      } catch (err) {
        try {
          const res = await apiFetch(`${API_BASE}/aggregate`);
          const data = await res.json();
          if (!res.ok) throw new Error();
          if (active) {
            setItems(Array.isArray(data) ? data : []);
            setLoading(false);
            setError('');
          }
        } catch (e2) {
          if (active) {
            setError('Nao foi possivel carregar as noticias.');
            setLoading(false);
          }
        }
      }
    };
    fetchItems();
    const interval = setInterval(fetchItems, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [slug]);

  const isLight = config && config.themeMode === 'light';
  const styleVars = config
    ? {
        '--site-primary': config.primaryColor,
        '--site-accent': config.accentColor,
        '--site-bg': config.backgroundColor,
        '--site-panel': config.surfaceColor,
        '--site-text': config.textColor,
        '--site-border': hexToRgba(config.textColor, isLight ? 0.12 : 0.2),
        '--site-muted': hexToRgba(config.textColor, isLight ? 0.65 : 0.6),
        '--site-hover': hexToRgba(config.textColor, isLight ? 0.06 : 0.08),
        '--site-font': config.fontFamily || '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif'
      }
    : {};

  if (error) {
    return (
      <div className="public-site" style={styleVars}>
        <div className="public-site-error">{error}</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="public-site" style={styleVars}>
        <div className="public-site-loading">Carregando...</div>
      </div>
    );
  }

  const featured = items[0];
  const gridItems = items.slice(1, 40);
  const latestList = items.slice(1, 7);

  return (
    <div className="public-site" style={styleVars}>
      <div className="public-site-shell">
        <aside className="public-site-left">
          <div className="public-site-brand">
            <div className="public-site-title">{config.title}</div>
            <div className="public-site-subtitle">{config.subtitle}</div>
          </div>
          <nav className="public-site-nav">
            {(config.menuLinks || []).map((link, idx) => (
              <a key={`${link.label}-${idx}`} href={link.url} className="public-site-link">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="public-site-cta">
            <div className="public-site-cta-label">Mini site publico</div>
            <div className="public-site-cta-url">{window.location.origin}/site/{config.slug}</div>
          </div>
        </aside>

        <main className="public-site-main">
          <header className="public-site-feed-header">
            <div className="public-site-feed-title">Noticias</div>
            <div className="public-site-feed-subtitle">Atualizado automaticamente</div>
          </header>

          {config.showTicker && items.length > 0 && (
            <div className="public-site-ticker">
              <div className="public-site-ticker-track">
                <div className="public-site-ticker-content">
                  {items.slice(0, 12).map((item, idx) => (
                    <span key={`${item.link}-${idx}`} className="public-site-ticker-item">
                      {item.title}
                    </span>
                  ))}
                </div>
                <div className="public-site-ticker-content" aria-hidden="true">
                  {items.slice(0, 12).map((item, idx) => (
                    <span key={`dup-${item.link}-${idx}`} className="public-site-ticker-item">
                      {item.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && <div className="public-site-loading">Carregando noticias...</div>}
          {!loading && items.length === 0 && (
            <div className="public-site-empty">Nenhuma noticia encontrada.</div>
          )}
          {!loading && items.length > 0 && (
            <>
              {featured && (
                <section className="public-hero">
                  <div className="public-hero-content">
                    <div className="public-site-pill">{featured.feedName}</div>
                    <h1 className="public-hero-title">{featured.title}</h1>
                    <p className="public-hero-snippet">{featured.contentSnippet}</p>
                    <div className="public-hero-meta">
                      <span>{formatDateTime(featured.pubDate || featured.isoDate)}</span>
                      <a href={featured.link} target="_blank" rel="noreferrer" className="public-hero-link">
                        Ler agora
                      </a>
                    </div>
                  </div>
                  <div className="public-hero-overlay" />
                </section>
              )}

              <section className="public-grid-modern">
                {gridItems.map((item, idx) => (
                  <article
                    key={`${item.link}-${idx}`}
                    className={`public-card modern ${idx % 7 === 0 ? 'wide' : ''}`}
                  >
                    <div className="public-card-meta">
                      <span className="public-card-feed">{item.feedName}</span>
                      <span className="public-card-date">{formatDateTime(item.pubDate || item.isoDate)}</span>
                    </div>
                    <h3 className="public-card-title">{item.title}</h3>
                    <p className="public-card-snippet">{item.contentSnippet}</p>
                    <a className="public-card-link" href={item.link} target="_blank" rel="noreferrer">
                      Abrir notícia
                    </a>
                  </article>
                ))}
              </section>
            </>
          )}
        </main>

        <aside className="public-site-right">
          <div className="public-site-panel">
            <div className="public-site-panel-title">Destaque</div>
            {featured && (
              <a href={featured.link} className="public-site-panel-item" target="_blank" rel="noopener noreferrer">
                {featured.title}
              </a>
            )}
          </div>
          <div className="public-site-panel">
            <div className="public-site-panel-title">Ultimas atualizacoes</div>
            {latestList.map((item, idx) => (
              <a key={`${item.link}-${idx}`} className="public-site-panel-item" href={item.link} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}


