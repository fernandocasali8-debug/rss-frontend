import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './DisplayMode.css';

const DEFAULT_CONFIG = {
  refreshMs: 5 * 60 * 1000,
  displayMs: 12 * 1000,
  maxQueue: 60,
  tickerSpeed: 50,
  title: 'Leitor de RSS',
  subtitle: 'Ultimas atualizacoes em sequencia'
};

const DEFAULT_WEATHER = {
  enabled: true,
  insertEvery: 6,
  refreshMs: 5 * 60 * 1000,
  cities: [
    'Sao Paulo',
    'Rio de Janeiro',
    'Brasilia',
    'Belo Horizonte',
    'Curitiba',
    'Porto Alegre',
    'Salvador',
    'Recife',
    'Fortaleza',
    'Manaus'
  ]
};

function weatherCodeToIcon(code) {
  const map = {
    0: '??',
    1: '???',
    2: '?',
    3: '??',
    45: '???',
    48: '???',
    51: '???',
    53: '???',
    55: '???',
    61: '???',
    63: '???',
    65: '???',
    71: '???',
    73: '???',
    75: '??',
    80: '???',
    81: '???',
    82: '??',
    95: '??',
    96: '??',
    99: '??'
  };
  return map[code] || '???';
}

const BRT_TIMEZONE = 'America/Sao_Paulo';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BRT_TIMEZONE
  }).format(d);
}

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

function getId(item) {
  return item.link || item.guid || item.id || item.title || '';
}

export default function DisplayMode() {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tickerItems, setTickerItems] = useState([]);
  const [status, setStatus] = useState('Carregando noticias...');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [weatherConfig, setWeatherConfig] = useState(DEFAULT_WEATHER);
  const [weatherData, setWeatherData] = useState([]);
  const [now, setNow] = useState(new Date().toISOString());
  const lastSeenRef = useRef('');
  const currentIndexRef = useRef(0);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const buildQueue = useCallback((newsItems) => {
    if (!weatherConfig.enabled || !weatherConfig.cities.length) {
      return newsItems.map(item => ({ type: 'news', data: item, id: getId(item) })).slice(0, config.maxQueue);
    }
    const result = [];
    let weatherIndex = 0;
    newsItems.forEach((item, idx) => {
      result.push({ type: 'news', data: item, id: getId(item) });
      if ((idx + 1) % weatherConfig.insertEvery === 0) {
        const city = weatherConfig.cities[weatherIndex % weatherConfig.cities.length];
        result.push({ type: 'weather', city, id: `weather-${city}-${weatherIndex}` });
        weatherIndex += 1;
      }
    });
    return result.slice(0, config.maxQueue);
  }, [config.maxQueue, weatherConfig.enabled, weatherConfig.cities, weatherConfig.insertEvery]);

  const insertNext = useCallback((items) => {
    if (!items.length) return;
    setQueue(prev => {
      const existing = new Set(
        prev
          .filter(entry => entry.type === 'news')
          .map(entry => getId(entry.data))
      );
      const incoming = items
        .map(item => ({ type: 'news', data: item, id: getId(item) }))
        .filter(entry => entry.id && !existing.has(entry.id));
      if (!incoming.length) return prev;
      const idx = Math.min(currentIndexRef.current + 1, prev.length);
      const next = [...prev.slice(0, idx), ...incoming, ...prev.slice(idx)];
      return next.slice(0, config.maxQueue);
    });
  }, [config.maxQueue]);

  const fetchNews = useCallback(() => {
    apiFetch(`${API_BASE}/aggregate`)
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : [];
        setTickerItems(items.slice(0, 30));
        if (!items.length) {
          setStatus('Nenhuma noticia disponivel.');
          return;
        }
        if (!lastSeenRef.current) {
          setQueue(buildQueue(items.slice(0, config.maxQueue)));
          lastSeenRef.current = items[0].link || items[0].guid || '';
          setStatus('');
          return;
        }
        const latestId = lastSeenRef.current;
        const idx = items.findIndex(item => (item.link || item.guid || '') === latestId);
        if (idx === 0) {
          return;
        }
        const newItems = idx > 0 ? items.slice(0, idx) : items.slice(0, 5);
        if (newItems.length) {
          insertNext(newItems);
          lastSeenRef.current = items[0].link || items[0].guid || '';
        }
      })
      .catch(() => {
        setStatus('Erro ao carregar noticias.');
      });
  }, [buildQueue, insertNext, config.maxQueue]);

  const weatherCitiesKey = useMemo(() => weatherConfig.cities.join('|'), [weatherConfig.cities]);

  useEffect(() => {
    const saved = localStorage.getItem('rss-display-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('rss-weather-config');
    if (saved) {
      try {
        setWeatherConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, config.refreshMs);
    return () => clearInterval(interval);
  }, [fetchNews, config.refreshMs]);

  useEffect(() => {
    if (!weatherConfig.enabled || !weatherConfig.cities.length) {
      setWeatherData([]);
      return undefined;
    }
    const fetchWeather = () => {
      const param = weatherConfig.cities.join(',');
      apiFetch(`${API_BASE}/weather?cities=${encodeURIComponent(param)}`)
        .then(res => res.json())
        .then(data => {
          setWeatherData(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          setWeatherData([]);
        });
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, weatherConfig.refreshMs);
    return () => clearInterval(interval);
  }, [weatherConfig.enabled, weatherConfig.refreshMs, weatherCitiesKey]);

  useEffect(() => {
    if (queue.length <= 1) return undefined;
    const timer = setTimeout(() => {
      setCurrentIndex((idx) => (idx + 1) % queue.length);
    }, config.displayMs);
    return () => clearTimeout(timer);
  }, [queue.length, config.displayMs, currentIndex]);

  const current = queue[currentIndex];
  const weatherMap = weatherData.reduce((acc, item) => {
    acc[item.city] = item;
    return acc;
  }, {});

  return (
    <div className="display-root">
      <div className="display-header">
        <div>
          <div className="display-title">{config.title}</div>
          <div className="display-subtitle">{config.subtitle}</div>
        </div>
        <div className="display-clock">{formatTime(now)}</div>
      </div>

      <div className="display-body">
        {current ? (
          <div
            className="display-card"
            key={`${current.id || current.city || currentIndex}-${currentIndex}`}
            style={{ '--display-duration': `${config.displayMs}ms` }}
          >
            {current.type === 'weather' ? (
              (() => {
                const weather = weatherMap[current.city] || {};
                return (
                  <>
                    <div className="display-meta">
                      <span className="display-feed">Previsao do tempo</span>
                      <span className="display-date">{weather.updatedAt ? formatDateTime(weather.updatedAt) : ''}</span>
                    </div>
                    <div className="display-headline">{current.city}</div>
                    <div className="display-snippet">{weather.description || 'Clima atual'}</div>
                    <div className="display-weather">
                      <span className="display-weather-icon" aria-hidden="true">{weatherCodeToIcon(weather.code)}</span>
                      <span>{weather.temp !== undefined ? `${Math.round(weather.temp)}C` : '--'}</span>
                      <span>Min {weather.tempMin !== undefined ? `${Math.round(weather.tempMin)}C` : '--'}</span>
                      <span>Max {weather.tempMax !== undefined ? `${Math.round(weather.tempMax)}C` : '--'}</span>
                      <span>Vento {weather.wind !== undefined ? `${Math.round(weather.wind)} km/h` : '--'}</span>
                    </div>
                  </>
                );
              })()
            ) : (
              <>
                <div className="display-meta">
                  <span className="display-feed">{current.data.feedName || 'Feed'}</span>
                  <span className="display-date">{formatDateTime(current.data.pubDate || current.data.isoDate)}</span>
                </div>
                <div className="display-headline">{current.data.title}</div>
                {current.data.contentSnippet && <div className="display-snippet">{current.data.contentSnippet}</div>}
              </>
            )}
          </div>
        ) : (
          <div className="display-empty">{status}</div>
        )}
      </div>

      <div className="display-ticker" style={{ '--display-ticker-speed': `${config.tickerSpeed}s` }}>
        <div className="display-ticker-label">Ticker</div>
        <div className="display-ticker-track">
          <div className="display-ticker-content">
            {tickerItems.map((item, idx) => (
              <span key={`t-${idx}`} className="display-ticker-item">
                <span className="display-ticker-feed">{item.feedName || 'Feed'}</span>
                <span className="display-ticker-title">{item.title}</span>
              </span>
            ))}
          </div>
          <div className="display-ticker-content" aria-hidden="true">
            {tickerItems.map((item, idx) => (
              <span key={`t2-${idx}`} className="display-ticker-item">
                <span className="display-ticker-feed">{item.feedName || 'Feed'}</span>
                <span className="display-ticker-title">{item.title}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="display-ticker-time">Atualiza a cada 5 min</div>
      </div>
    </div>
  );
}


