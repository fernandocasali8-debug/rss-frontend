import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './Timeline.css';
import './TrendsPage.css';
import fallbackFavicon from './fallback-favicon.svg';

const BRT_TIMEZONE = 'America/Sao_Paulo';
const TRENDS_CACHE_KEY = 'rss-trends-cache';
const TRENDS_CACHE_TTL_MS = 2 * 60 * 1000;
const TRENDS_VIEW_KEY = 'rss-trends-view-mode';
const TRENDS_DENSITY_KEY = 'rss-trends-density';
const TRENDS_FILTER_KEY = 'rss-trends-filter';

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, updatedAt: Date.now() }));
  } catch (e) {
    // ignore
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BRT_TIMEZONE
  }).format(d);
}

function getFaviconUrl(url) {
  if (!url) return '';
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch (e) {
    return '';
  }
}

function handleFaviconError(event) {
  if (!event?.currentTarget || event.currentTarget.dataset.fallbackApplied) return;
  event.currentTarget.dataset.fallbackApplied = '1';
  event.currentTarget.src = fallbackFavicon;
}

function getSourceLabel(url) {
  if (!url) return '';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host;
  } catch (e) {
    return '';
  }
}

function parseTrafficCount(value) {
  if (!value) return 0;
  const raw = String(value).toLowerCase().replace(/\s+/g, '');
  const number = parseFloat(raw.replace(/[^\d.,]/g, '').replace(',', '.'));
  if (!Number.isFinite(number)) return 0;
  if (raw.includes('milhao') || raw.includes('milhoes') || raw.includes('mi') || raw.includes('m+')) {
    return Math.round(number * 1000000);
  }
  if (raw.includes('mil') || raw.includes('k')) return Math.round(number * 1000);
  return Math.round(number);
}

export default function TrendsPage() {
  const [trendsConfig, setTrendsConfig] = useState({ enabled: false, geo: 'BR', maxItems: 10, refreshMinutes: 10 });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [trendsItems, setTrendsItems] = useState([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsRefreshing, setTrendsRefreshing] = useState(false);
  const [trendsError, setTrendsError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [listDensity, setListDensity] = useState('normal');
  const [trafficFilter, setTrafficFilter] = useState('all');
  const [driveStatus, setDriveStatus] = useState({ connected: false, clients: [] });
  const [driveClientId, setDriveClientId] = useState('');
  const [driveExporting, setDriveExporting] = useState(false);
  const [driveMessage, setDriveMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(TRENDS_VIEW_KEY);
    if (stored === 'grid' || stored === 'list' || stored === 'columns') {
      setViewMode(stored);
    }
    const densityStored = localStorage.getItem(TRENDS_DENSITY_KEY);
    if (densityStored === 'compact' || densityStored === 'normal' || densityStored === 'tight') {
      setListDensity(densityStored);
    }
    const filterStored = localStorage.getItem(TRENDS_FILTER_KEY);
    if (filterStored === 'all' || filterStored === 'high') {
      setTrafficFilter(filterStored);
    }
  }, []);

  const handleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(TRENDS_VIEW_KEY, mode);
    } catch (e) {
      // ignore
    }
  };

  const handleDensity = (mode) => {
    setListDensity(mode);
    try {
      localStorage.setItem(TRENDS_DENSITY_KEY, mode);
    } catch (e) {
      // ignore
    }
  };

  const handleTrafficFilter = (mode) => {
    setTrafficFilter(mode);
    try {
      localStorage.setItem(TRENDS_FILTER_KEY, mode);
    } catch (e) {
      // ignore
    }
  };

  const filteredItems = trendsItems.filter((item) => {
    if (trafficFilter === 'all') return true;
    const count = parseTrafficCount(item.traffic);
    return count >= 10000;
  });

  useEffect(() => {
    apiFetch(API_BASE + '/trends/config')
      .then(res => res.json())
      .then(data => {
        setTrendsConfig(prev => ({ ...prev, ...data }));
        setConfigLoaded(true);
      })
      .catch(() => {
        setConfigLoaded(true);
      });
  }, []);

  useEffect(() => {
    apiFetch(`${API_BASE}/google/drive/status`)
      .then(res => res.json())
      .then(data => {
        setDriveStatus({
          connected: !!data.connected,
          clients: Array.isArray(data.clients) ? data.clients : []
        });
      })
      .catch(() => {
        setDriveStatus({ connected: false, clients: [] });
      });
  }, []);

  const handleDriveExport = async (endpoint) => {
    setDriveMessage('');
    if (!driveStatus.connected) {
      setDriveMessage('Google Drive nao conectado.');
      return;
    }
    setDriveExporting(true);
    try {
      const res = await apiFetch(`${API_BASE}/google/drive/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: driveClientId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao exportar.');
      setDriveMessage('Exportacao enviada ao Drive.');
    } catch (err) {
      setDriveMessage(err.message || 'Falha ao exportar.');
    } finally {
      setDriveExporting(false);
    }
  };

  const loadTrends = useCallback((force = false) => {
    if (!trendsConfig.enabled) {
      setTrendsItems([]);
      setTrendsError('Trends desativado. Ative na configuracao.');
      return Promise.resolve();
    }
    const cached = readCache(TRENDS_CACHE_KEY);
    if (!force && cached && (Date.now() - cached.updatedAt) < TRENDS_CACHE_TTL_MS) {
      setTrendsItems(cached.data.items || []);
      setLastUpdated(cached.data.lastUpdated || '');
      return Promise.resolve();
    }
    setTrendsLoading(true);
    setTrendsRefreshing(!trendsLoading);
    setTrendsError('');
    return apiFetch(API_BASE + '/trends?explain=1')
      .then(res => res.json())
      .then(data => {
        if (data && data.ok === false) {
          setTrendsItems([]);
          setTrendsError('Falha ao carregar Trends.');
          return;
        }
        const items = Array.isArray(data.items) ? data.items : [];
        const updatedAt = new Date().toISOString();
        setTrendsItems(items);
        setLastUpdated(updatedAt);
        writeCache(TRENDS_CACHE_KEY, { items, lastUpdated: updatedAt });
      })
      .catch(() => {
        setTrendsItems([]);
        setTrendsError('Falha ao carregar Trends.');
      })
      .finally(() => {
        setTrendsLoading(false);
        setTrendsRefreshing(false);
      });
  }, [trendsConfig.enabled]);

  useEffect(() => {
    if (!configLoaded) return;
    if (!trendsConfig.enabled) {
      setTrendsItems([]);
      setTrendsError('Trends desativado. Ative na configuracao.');
      return;
    }
    const cached = readCache(TRENDS_CACHE_KEY);
    if (cached) {
      setTrendsItems(cached.data.items || []);
      setLastUpdated(cached.data.lastUpdated || '');
    }
    loadTrends();
    const interval = setInterval(loadTrends, (Number(trendsConfig.refreshMinutes) || 10) * 60 * 1000);
    return () => clearInterval(interval);
  }, [configLoaded, trendsConfig.enabled, trendsConfig.refreshMinutes, loadTrends]);

  return (
    <div className="trends-page">
      <div className="trends-page-header">
        <div>
          <h2 className="trends-page-title">Tendências</h2>
          <p className="trends-page-subtitle">
            Fonte: Google News (RSS) - {trendsConfig.geo || 'BR'}
          </p>
        </div>
        <div className="trends-actions">
          <div className="trends-drive-actions">
            <select
              className="trends-drive-select"
              value={driveClientId}
              onChange={(event) => setDriveClientId(event.target.value)}
              disabled={!driveStatus.connected}
            >
              <option value="">Pasta principal</option>
              {driveStatus.clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <button
              className="trends-drive-button"
              onClick={() => handleDriveExport('export/trends')}
              disabled={!driveStatus.connected || driveExporting}
            >
              {driveExporting ? 'Exportando...' : 'Exportar Drive'}
            </button>
            <button
              className="trends-drive-button secondary"
              onClick={() => handleDriveExport('export/briefing')}
              disabled={!driveStatus.connected || driveExporting}
            >
              Gerar briefing
            </button>
          </div>
          <div className="trends-view-toggle">
            <button
              type="button"
              className={`trends-view-button ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => handleViewMode('grid')}
            >
              Grade
            </button>
            <button
              type="button"
              className={`trends-view-button ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => handleViewMode('list')}
            >
              Lista
            </button>
            <button
              type="button"
              className={`trends-view-button ${viewMode === 'columns' ? 'is-active' : ''}`}
              onClick={() => handleViewMode('columns')}
            >
              Colunas
            </button>
          </div>
          <div className="trends-density-toggle" aria-label="Densidade da lista">
            <button
              type="button"
              className={`trends-density-button ${listDensity === 'normal' ? 'is-active' : ''}`}
              onClick={() => handleDensity('normal')}
              disabled={viewMode !== 'list'}
            >
              Conforto
            </button>
            <button
              type="button"
              className={`trends-density-button ${listDensity === 'compact' ? 'is-active' : ''}`}
              onClick={() => handleDensity('compact')}
              disabled={viewMode !== 'list'}
            >
              Compacta
            </button>
            <button
              type="button"
              className={`trends-density-button ${listDensity === 'tight' ? 'is-active' : ''}`}
              onClick={() => handleDensity('tight')}
              disabled={viewMode !== 'list'}
            >
              Extrema
            </button>
          </div>
          <div className="trends-refresh-row">
            {trendsRefreshing && <span className="trends-refreshing">Atualizando...</span>}
            <button
              className="trends-refresh"
              onClick={() => loadTrends(true)}
              disabled={trendsLoading || !trendsConfig.enabled}
            >
              {trendsLoading ? 'Atualizando...' : 'Atualizar agora'}
            </button>
          </div>
        </div>
      </div>
      <div className="trends-page-meta">
        <span>Intervalo: {trendsConfig.refreshMinutes || 10} min</span>
        <span>Máximo: {trendsConfig.maxItems || 10} itens</span>
        <span>Última atualização: {lastUpdated ? formatDateTime(lastUpdated) : '-'}</span>
        {driveMessage && <span>{driveMessage}</span>}
        <div className="trends-filter">
          <span className="trends-filter-label">Filtro:</span>
          <div className="trends-filter-toggle">
            <button
              type="button"
              className={`trends-filter-button ${trafficFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => handleTrafficFilter('all')}
            >
              Todas
            </button>
            <button
              type="button"
              className={`trends-filter-button ${trafficFilter === 'high' ? 'is-active' : ''}`}
              onClick={() => handleTrafficFilter('high')}
            >
              Tráfego alto
            </button>
          </div>
        </div>
      </div>

      <div
        className={`timeline-trends ${viewMode === 'list' ? 'is-list' : ''} ${
          viewMode === 'columns' ? 'is-columns' : 'is-grid'
        } ${listDensity === 'compact' ? 'is-compact' : ''} ${
          listDensity === 'tight' ? 'is-tight' : ''
        }`}
      >
        {trendsLoading && (
          <div className="timeline-trends-status">Carregando Trends...</div>
        )}
        {!trendsLoading && trendsError && (
          <div className="timeline-trends-status is-error">{trendsError}</div>
        )}
        {!trendsLoading && !trendsError && filteredItems.length === 0 && (
          <div className="timeline-trends-status">Nenhuma tendencia disponivel.</div>
        )}
        {filteredItems.length > 0 && (
          <div className="timeline-trends-list">
            {filteredItems.map((trend, idx) => (
              <a
                key={`${trend.title}-${idx}`}
                href={trend.link || '#'}
                className="timeline-trend-item"
                target="_blank"
                rel="noopener noreferrer"
                data-context-card="true"
                data-context-type="trends"
                data-context-id={trend.link || trend.title || `trend-${idx}`}
                data-context-url={trend.link || ''}
                data-context-title={trend.title || ''}
              >
                <span className="timeline-trend-main">
                  {trend.link && (
                    <img
                      className="timeline-trend-favicon"
                      src={getFaviconUrl(trend.link)}
                      alt=""
                      onError={handleFaviconError}
                    />
                  )}
                  <span className="timeline-trend-title">{trend.title}</span>
                </span>
                <span className="timeline-trend-meta">
                  {getSourceLabel(trend.link) && (
                    <span className="timeline-trend-source">{getSourceLabel(trend.link)}</span>
                  )}
                  {(trend.isoDate || trend.pubDate) && (
                    <span className="timeline-trend-time">
                      {formatDateTime(trend.isoDate || trend.pubDate)}
                    </span>
                  )}
                  <span className="timeline-trend-traffic">
                    <span className="timeline-trend-label">Tráfego:</span>{' '}
                    {trend.traffic ? trend.traffic : 'sem dados'}
                  </span>
                </span>
                {trend.explanation && (
                  <span className="timeline-trend-explain">{trend.explanation}</span>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}





