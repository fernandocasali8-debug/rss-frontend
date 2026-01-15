import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import fallbackFavicon from './fallback-favicon.svg';
import './PublicWatchSite.css';

const DEFAULT_EMAIL = 'fernandocasali8@gmail.com';
const THEME_KEY = 'public-watch-theme';
const CACHE_KEY = 'public-watch-cache-v1';
const SEEN_KEY = 'public-watch-seen-v1';
const REFRESH_INTERVAL = 5 * 60 * 1000;

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

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const getItemDate = (item) => item.isoDate || item.pubDate || '';
const getFirstSentence = (text) => {
  if (!text) return '';
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(.*?[.!?])\s/);
  if (match && match[1]) return match[1];
  return normalized;
};

const readCache = (email) => {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const entry = parsed[email];
    if (!entry || !entry.data) return null;
    if (!Array.isArray(entry.data.items)) return null;
    return entry;
  } catch (e) {
    return null;
  }
};

const writeCache = (email, data) => {
  if (!email) return;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[email] = {
      data,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
  } catch (e) {
    // ignore cache errors
  }
};

const readSeenMap = () => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
};

const writeSeenMap = (map) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map || {}));
  } catch (e) {
    // ignore
  }
};

function PublicWatchSite() {
  const queryEmail = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || DEFAULT_EMAIL;
  }, []);
  const cachedEntry = useMemo(() => readCache(queryEmail), [queryEmail]);
  const [data, setData] = useState(() => cachedEntry?.data || { items: [], topics: [] });
  const [loading, setLoading] = useState(() => !cachedEntry);
  const [error, setError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(() => Boolean(cachedEntry));
  const [lastUpdated, setLastUpdated] = useState(() => (
    cachedEntry?.updatedAt ? new Date(cachedEntry.updatedAt) : null
  ));
  const [theme, setTheme] = useState('light');
  const [fontScale, setFontScale] = useState(1);
  const [nextRefreshAt, setNextRefreshAt] = useState(() => Date.now() + REFRESH_INTERVAL);
  const [countdown, setCountdown] = useState({ minutes: 0, seconds: 0, millis: 0 });
  const [seenMap, setSeenMap] = useState(() => readSeenMap());
  const [activeItem, setActiveItem] = useState(null);
  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [tickerSpeed, setTickerSpeed] = useState(60);
  const [menuOpen, setMenuOpen] = useState(false);
  const refreshTimerRef = useRef(null);
  const hasCacheRef = useRef(Boolean(cachedEntry));
  const tickerTrackRef = useRef(null);
  const tickerOffsetRef = useRef(0);
  const tickerSpeedRef = useRef(tickerSpeed);
  const tickerFrameRef = useRef(null);
  const tickerLastRef = useRef(0);
  const tickerHalfWidthRef = useRef(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = prefersDark ? 'dark' : 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setActiveItem(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchWatch = ({ initial = false } = {}) => {
      setNextRefreshAt(Date.now() + REFRESH_INTERVAL);
      if (initial && !hasCacheRef.current) {
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
            if (initial && !hasCacheRef.current) {
              setError('Nao foi possivel carregar as noticias.');
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
          hasCacheRef.current = true;
          writeCache(queryEmail, nextData);
          if (initial) setLoading(false);
        })
        .catch(() => {
          if (!isMounted) return;
          if (initial && !hasCacheRef.current) {
            setError('Nao foi possivel carregar as noticias.');
            setLoading(false);
          }
        });
    };

    fetchWatch({ initial: true });

    refreshTimerRef.current = setInterval(() => {
      fetchWatch();
    }, REFRESH_INTERVAL);

    return () => {
      isMounted = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [queryEmail]);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, nextRefreshAt - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const millis = Math.floor(remaining % 1000);
      setCountdown({ minutes, seconds, millis });
    };
    tick();
    const timer = setInterval(tick, 50);
    return () => clearInterval(timer);
  }, [nextRefreshAt]);

  const items = data.items || [];
  const getFaviconUrl = (url) => {
    if (!url) return '';
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    } catch (e) {
      return '';
    }
  };

  const handleFaviconError = (event) => {
    if (!event?.currentTarget || event.currentTarget.dataset.fallbackApplied) return;
    event.currentTarget.dataset.fallbackApplied = '1';
    event.currentTarget.src = fallbackFavicon;
  };

  const tickerItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.slice(0, 30).map((item, index) => ({
      id: item.link || item.title || `ticker-${index}`,
      title: item.title || 'Sem titulo',
      link: item.link || '#',
      favicon: getFaviconUrl(item.feedUrl || item.link)
    }));
  }, [items]);

  useEffect(() => {
    tickerSpeedRef.current = tickerSpeed;
  }, [tickerSpeed]);

  useEffect(() => {
    if (!tickerEnabled) {
      if (tickerTrackRef.current) {
        tickerTrackRef.current.style.transform = 'translateX(0px)';
      }
      return undefined;
    }
    const track = tickerTrackRef.current;
    if (!track) return undefined;

    const updateSizes = () => {
      const fullWidth = track.scrollWidth;
      tickerHalfWidthRef.current = fullWidth / 2;
      if (!Number.isFinite(tickerOffsetRef.current)) {
        tickerOffsetRef.current = 0;
      }
    };

    updateSizes();
    const handleResize = () => updateSizes();
    window.addEventListener('resize', handleResize);

    const animate = (timestamp) => {
      if (!tickerLastRef.current) {
        tickerLastRef.current = timestamp;
      }
      const delta = Math.min(64, timestamp - tickerLastRef.current);
      tickerLastRef.current = timestamp;

      const speed = tickerSpeedRef.current;
      tickerOffsetRef.current -= (speed * delta) / 1000;
      const halfWidth = tickerHalfWidthRef.current || 0;
      if (halfWidth && tickerOffsetRef.current <= -halfWidth) {
        tickerOffsetRef.current = 0;
      }
      track.style.transform = `translateX(${tickerOffsetRef.current}px)`;
      tickerFrameRef.current = window.requestAnimationFrame(animate);
    };

    tickerFrameRef.current = window.requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (tickerFrameRef.current) {
        window.cancelAnimationFrame(tickerFrameRef.current);
        tickerFrameRef.current = null;
      }
      tickerLastRef.current = 0;
    };
  }, [tickerEnabled, tickerItems.length]);

  const handleShare = async (item) => {
    const url = item?.link || '';
    if (!url) return;
    const title = item?.title || 'Noticia';
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (e) {
        // fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      // ignore
    }
  };

  const markSeen = (item) => {
    const key = item?.link || item?.title || '';
    if (!key) return;
    setSeenMap((prev) => {
      const next = { ...prev, [key]: new Date().toISOString() };
      writeSeenMap(next);
      return next;
    });
  };

  const handleOpenItem = (item) => {
    markSeen(item);
    setActiveItem(item);
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleFontScale = (delta) => {
    setFontScale((prev) => {
      const next = Math.min(1.15, Math.max(0.9, Number((prev + delta).toFixed(2))));
      return next;
    });
  };

  const formatCountdown = () => (
    `${String(countdown.minutes).padStart(2, '0')}:` +
    `${String(countdown.seconds).padStart(2, '0')}.` +
    `${String(countdown.millis).padStart(3, '0')}`
  );

  return (
    <div className="public-news" style={{ '--font-scale': fontScale }}>
      <div className="public-news-top">
        <div className="public-news-left">
          <div className={`public-news-menu ${menuOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="public-news-tool"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Menu"
            >
              <span className="material-icons-outlined">menu</span>
            </button>
            {menuOpen && (
              <div className="public-news-dropdown">
                <div className="dropdown-section">
                  <div className="dropdown-title">Ticker</div>
                  <label className="dropdown-row">
                    <input
                      type="checkbox"
                      checked={tickerEnabled}
                      onChange={(event) => setTickerEnabled(event.target.checked)}
                    />
                    <span>Ativar ticker</span>
                  </label>
                  <label className="dropdown-row">
                    <span>Velocidade</span>
                    <select
                      value={tickerSpeed}
                      onChange={(event) => setTickerSpeed(Number(event.target.value))}
                    >
                      <option value={40}>Muito lento</option>
                      <option value={60}>Lento</option>
                      <option value={80}>Normal</option>
                      <option value={100}>Rapido</option>
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>
          <div className="public-news-timer">
            <span className="public-news-rec" />
            <span className="public-news-time">{formatCountdown()}</span>
            <span className="public-news-label">Proxima atualizacao</span>
          </div>
        </div>
        <div className="public-news-tools">
          <button
            type="button"
            className="public-news-tool"
            onClick={() => handleFontScale(-0.05)}
            aria-label="Diminuir fonte"
          >
            <span className="material-icons-outlined">remove</span>
          </button>
          <button
            type="button"
            className="public-news-tool"
            onClick={() => handleFontScale(0.05)}
            aria-label="Aumentar fonte"
          >
            <span className="material-icons-outlined">add</span>
          </button>
          <button
            type="button"
            className="public-news-tool"
            onClick={handleThemeToggle}
            aria-label="Alternar tema"
          >
            <span className="material-icons-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </div>
      {tickerEnabled && tickerItems.length > 0 && (
        <div className="public-news-ticker">
          <div
            className="ticker-track"
            ref={tickerTrackRef}
          >
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <a
                key={`${item.id}-tick-${idx}`}
                className="ticker-item"
                href={item.link}
                target="_blank"
                rel="noreferrer"
              >
                {item.favicon && (
                  <img
                    className="ticker-favicon"
                    src={item.favicon}
                    alt=""
                    onError={handleFaviconError}
                  />
                )}
                <span className="ticker-title">{item.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <main className="public-news-main public-news-main--full">
        {loading && !hasLoaded && (
          <div className="public-news-grid">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={`sk-${idx}`} className="news-card news-card--skeleton">
                <div className="skeleton-line wide" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-pill" />
              </div>
            ))}
          </div>
        )}
        {!loading && error && !hasLoaded && (
          <div className="public-news-grid">
            <div className="news-card news-card--empty">{error}</div>
          </div>
        )}
        {(!loading || hasLoaded) && (
          <section className="public-news-grid">
            {items.map((item, index) => (
              <article
                key={`${item.link || item.title}-card-${index}`}
                className="news-card"
                onClick={() => handleOpenItem(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOpenItem(item);
                  }
                }}
              >
                <div className="news-card-header">
                  <div className="news-card-source">
                    <img
                      className="news-card-favicon"
                      src={getFaviconUrl(item.feedUrl || item.link)}
                      alt=""
                      onError={handleFaviconError}
                    />
                    <div>
                      <div className="news-card-feed">{item.feedName || 'Fonte'}</div>
                      <div className="news-card-time">{formatTime(getItemDate(item))}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="news-card-share"
                    onClick={() => handleShare(item)}
                    aria-label="Compartilhar"
                  >
                    <span className="material-icons-outlined">share</span>
                  </button>
                </div>
                <a className="news-card-title" href={item.link || '#'} target="_blank" rel="noreferrer">
                  {item.title || 'Sem titulo'}
                </a>
                <p className="news-card-snippet">{item.contentSnippet || 'Sem resumo disponivel.'}</p>
                <div className="news-card-footer">
                  <span>{item.topicName || 'Acompanhamento'}</span>
                  <span>{formatDate(getItemDate(item))}</span>
                  {seenMap[item.link || item.title] && (
                    <span className="news-card-seen">
                      Visto {formatTime(seenMap[item.link || item.title])}
                    </span>
                  )}
                </div>
              </article>
            ))}
            {items.length === 0 && (
              <div className="news-card news-card--empty">Sem noticias disponiveis no momento.</div>
            )}
          </section>
        )}
        {activeItem && (
          <div
            className="news-modal"
            onClick={(event) => {
              if (event.target.classList.contains('news-modal')) {
                setActiveItem(null);
              }
            }}
          >
            <div className="news-modal-card">
              <button
                type="button"
                className="news-modal-close"
                onClick={() => setActiveItem(null)}
                aria-label="Fechar"
              >
                <span className="material-icons-outlined">close</span>
              </button>
              <div className="news-modal-head">
                <img
                  className="news-card-favicon"
                  src={getFaviconUrl(activeItem.feedUrl || activeItem.link)}
                  alt=""
                  onError={handleFaviconError}
                />
                <div>
                  <div className="news-card-feed">{activeItem.feedName || 'Fonte'}</div>
                  <div className="news-card-time">{formatDateTime(getItemDate(activeItem))}</div>
                </div>
              </div>
              <a className="news-modal-title" href={activeItem.link || '#'} target="_blank" rel="noreferrer">
                {activeItem.title || 'Sem titulo'}
              </a>
              <p className="news-modal-snippet">{activeItem.contentSnippet || 'Sem resumo disponivel.'}</p>
              <div className="news-modal-meta">
                <span>Visto por ultimo: {formatDateTime(seenMap[activeItem.link || activeItem.title])}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PublicWatchSite;
