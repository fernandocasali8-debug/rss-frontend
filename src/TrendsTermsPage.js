import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './Timeline.css';
import './TrendsPage.css';
import fallbackFavicon from './fallback-favicon.svg';

const BRT_TIMEZONE = 'America/Sao_Paulo';
const TERMS_CACHE_KEY = 'rss-trends-terms-cache';
const TERMS_CACHE_TTL_MS = 2 * 60 * 1000;

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

export default function TrendsTermsPage() {
  const [trendsConfig, setTrendsConfig] = useState({ enabled: false, refreshMinutes: 10, maxItems: 10 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    apiFetch(API_BASE + '/trends/config')
      .then(res => res.json())
      .then(data => {
        setTrendsConfig(prev => ({ ...prev, ...data }));
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const loadTerms = useCallback((force = false) => {
    if (!trendsConfig.enabled) {
      setItems([]);
      setError('Trends desativado. Ative na configuracao.');
      return Promise.resolve();
    }
    const cached = readCache(TERMS_CACHE_KEY);
    if (!force && cached && (Date.now() - cached.updatedAt) < TERMS_CACHE_TTL_MS) {
      setItems(cached.data.items || []);
      setLastUpdated(cached.data.lastUpdated || '');
      return Promise.resolve();
    }
    setLoading(true);
    setRefreshing(!loading);
    setError('');
    return apiFetch(API_BASE + '/trends/terms')
      .then(res => res.json())
      .then(data => {
        if (data && data.ok === false) {
          setItems([]);
          setError('Falha ao carregar termos.');
          return;
        }
        const nextItems = Array.isArray(data.items) ? data.items : [];
        const updatedAt = data.updatedAt || new Date().toISOString();
        setItems(nextItems);
        setLastUpdated(updatedAt);
        writeCache(TERMS_CACHE_KEY, { items: nextItems, lastUpdated: updatedAt });
      })
      .catch(() => {
        setItems([]);
        setError('Falha ao carregar termos.');
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [trendsConfig.enabled, loading]);

  useEffect(() => {
    if (!trendsConfig.enabled) return;
    const cached = readCache(TERMS_CACHE_KEY);
    if (cached) {
      setItems(cached.data.items || []);
      setLastUpdated(cached.data.lastUpdated || '');
    }
    loadTerms();
    const interval = setInterval(loadTerms, (Number(trendsConfig.refreshMinutes) || 10) * 60 * 1000);
    return () => clearInterval(interval);
  }, [trendsConfig.enabled, trendsConfig.refreshMinutes, loadTerms]);

  return (
    <div className="trends-page">
      <div className="trends-page-header">
        <div>
          <h2 className="trends-page-title">Termos Google</h2>
          <p className="trends-page-subtitle">Fonte: trends24.in (Brasil)</p>
        </div>
        <div className="trends-actions">
          <div className="trends-refresh-row">
            {refreshing && <span className="trends-refreshing">Atualizando...</span>}
            <button
              className="trends-refresh"
              onClick={() => loadTerms(true)}
              disabled={loading || !trendsConfig.enabled}
            >
              {loading ? 'Atualizando...' : 'Atualizar agora'}
            </button>
          </div>
        </div>
      </div>
      <div className="trends-page-meta">
        <span>Intervalo: {trendsConfig.refreshMinutes || 10} min</span>
        <span>Maximo: {trendsConfig.maxItems || 10} itens</span>
        <span>Ultima atualizacao: {lastUpdated ? formatDateTime(lastUpdated) : '-'}</span>
      </div>

      <div className="timeline-trends is-grid">
        {loading && (
          <div className="timeline-trends-status">Carregando termos...</div>
        )}
        {!loading && error && (
          <div className="timeline-trends-status is-error">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="timeline-trends-status">Nenhum termo disponivel.</div>
        )}
        {items.length > 0 && (
          <div className="timeline-trends-list">
            {items.map((item, idx) => (
              <a
                key={`${item.title}-${idx}`}
                href={item.link || '#'}
                className="timeline-trend-item"
                target="_blank"
                rel="noopener noreferrer"
                data-context-card="true"
                data-context-type="trends-terms"
                data-context-id={item.link || item.title || `term-${idx}`}
                data-context-url={item.link || ''}
                data-context-title={item.title || ''}
              >
                <span className="timeline-trend-main">
                  {item.link && (
                    <img
                      className="timeline-trend-favicon"
                      src={getFaviconUrl(item.link)}
                      alt=""
                      onError={handleFaviconError}
                    />
                  )}
                  <span className="timeline-trend-title">{item.title}</span>
                </span>
                <span className="timeline-trend-meta">
                  {item.category && (
                    <span className="timeline-trend-source">{item.category}</span>
                  )}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
