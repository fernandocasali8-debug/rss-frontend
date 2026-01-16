import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './TrendsPage.css';
import './TrendsEventsPage.css';

const VIEW_KEY = 'rss-polymarket-view';

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}

function formatCompactNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(number);
}

function formatProbability(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number.toFixed(1).replace('.0', '')}%`;
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function translateCategoryLabel(label) {
  const raw = normalizeText(label);
  const map = {
    politics: 'Politica',
    political: 'Politica',
    government: 'Politica',
    economy: 'Economia',
    economic: 'Economia',
    finance: 'Economia',
    geopolitics: 'Geopolitica',
    war: 'Guerra',
    conflict: 'Guerra',
    justice: 'Justica',
    legal: 'Justica',
    elections: 'Eleicoes'
  };
  return map[raw] || label;
}


export default function TrendsEventsPage() {
  const [items, setItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const storedView = localStorage.getItem(VIEW_KEY);
    if (storedView === 'grid' || storedView === 'list' || storedView === 'columns') {
      setViewMode(storedView);
    }
  }, []);

  const loadEvents = async (query = '', limit = 200) => {
    setLoading(true);
    setError('');
    try {
      const url = new URL(`${API_BASE}/polymarket/events`);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('lang', 'pt');
      url.searchParams.set('category', 'politics');
      if (query) {
        url.searchParams.set('q', query);
      }
      const res = await apiFetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados.');
      setItems(Array.isArray(data.items) ? data.items : []);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Falha ao carregar dados.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (!search || search.trim().length < 3) return undefined;
    const handle = setTimeout(() => {
      loadEvents(search.trim(), 500);
    }, 450);
    return () => clearTimeout(handle);
  }, [search]);

  const filteredItems = useMemo(() => {
    const text = normalizeText(search);
    const tokens = text.split(/[,\s]+/).map((token) => token.trim()).filter(token => token.length > 2);
    return items.filter((item) => {
      if (tokens.length) {
        const haystack = normalizeText([
          item.title,
          item.originalTitle,
          item.seriesTitle,
          item.eventTitle
        ].filter(Boolean).join(' '));
        if (!tokens.some((token) => haystack.includes(token))) return false;
      } else if (text) {
        if (!normalizeText(item.title).includes(text)) return false;
      }
      return true;
    });
  }, [items, search]);

  const handleView = (mode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_KEY, mode);
  };

  return (
    <div className="trends-page polymarket-page">
      <div className="trends-page-header">
        <div>
          <h2 className="trends-page-title">Expectativas de eventos - Politica</h2>
          <p className="trends-page-subtitle">Fonte: Polymarket (apostas de mercado)</p>
        </div>
        <div className="trends-actions">
          <div className="trends-view-toggle">
            <button
              type="button"
              className={`trends-view-button ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => handleView('grid')}
            >
              Grade
            </button>
            <button
              type="button"
              className={`trends-view-button ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => handleView('list')}
            >
              Lista
            </button>
            <button
              type="button"
              className={`trends-view-button ${viewMode === 'columns' ? 'is-active' : ''}`}
              onClick={() => handleView('columns')}
            >
              Colunas
            </button>
          </div>
          <div className="trends-refresh-row">
            <button className="trends-refresh" onClick={loadEvents} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar agora'}
            </button>
          </div>
        </div>
      </div>

      <div className="trends-page-meta polymarket-meta">
        <span>Atualizado: {updatedAt ? formatDateTime(updatedAt) : '-'}</span>
        <div className="polymarket-search">
          <label htmlFor="polymarket-search">Buscar:</label>
          <input
            id="polymarket-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="filtrar por tema ou pergunta"
          />
        </div>
        <span>Filtro fixo: Politica</span>
      </div>

      {error && <div className="timeline-trends-status is-error">{error}</div>}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="timeline-trends-status">Nenhuma expectativa encontrada.</div>
      )}

      <div className={`polymarket-grid is-${viewMode}`}>
        {filteredItems.map((item) => (
          <a
            key={item.id}
            href={item.url}
            className="polymarket-card"
            target="_blank"
            rel="noopener noreferrer"
            data-context-card="true"
            data-context-type="trends"
            data-context-id={item.id}
            data-context-url={item.url}
            data-context-title={item.title || ''}
          >
            <div className="polymarket-card-header">
              <span className="polymarket-badge">
                {translateCategoryLabel(item.categoryLabel || 'Outros')}
              </span>
              {item.probability !== null && item.probability !== undefined && (
                <span className="polymarket-prob">{formatProbability(item.probability)}</span>
              )}
            </div>
            {item.source && (
              <div className="polymarket-source">Fonte: {item.source}</div>
            )}
            <h3 className="polymarket-title">{item.title}</h3>
            {item.probability !== null && item.probability !== undefined && (
              <div className="polymarket-thermo">
                <span className="polymarket-thermo-label">Nao</span>
                <div className="polymarket-thermo-track">
                  <span
                    className="polymarket-thermo-pointer"
                    style={{ left: `calc(${Math.min(item.probability, 100)}% - 6px)` }}
                  />
                  <span className="polymarket-thermo-mid" />
                </div>
                <span className="polymarket-thermo-label">Sim</span>
              </div>
            )}
            {item.probability !== null && item.probability !== undefined && (
              <div className="polymarket-prob-line">
                <span>Sim: {formatProbability(item.probability)}</span>
                <span>Nao: {formatProbability(100 - item.probability)}</span>
              </div>
            )}
            <div className="polymarket-meta">
              {item.volume !== '' && <span>Volume: {formatCompactNumber(item.volume)}</span>}
              {item.liquidity !== '' && <span>Liquidez: {formatCompactNumber(item.liquidity)}</span>}
            </div>
            <div className="polymarket-meta">
              {item.endDate && <span>Fecha em: {formatDateTime(item.endDate)}</span>}
              {item.updatedAt && <span>Atualizado: {formatDateTime(item.updatedAt)}</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
