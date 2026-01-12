import React, { useEffect, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './Timeline.css';
import './SavedPage.css';
import fallbackFavicon from './fallback-favicon.svg';

const BRT_TIMEZONE = 'America/Sao_Paulo';
const SAVED_VIEW_KEY = 'rss-saved-view';

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

export default function SavedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [sheetsMessage, setSheetsMessage] = useState('');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const fetchSaved = () => {
    setLoading(true);
    setError('');
    apiFetch(API_BASE + '/saved')
      .then(res => res.json())
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar itens salvos.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(SAVED_VIEW_KEY);
    if (stored === 'grid' || stored === 'list' || stored === 'compact') {
      setViewMode(stored);
    }
  }, []);

  const handleRemove = React.useCallback(async (id) => {
    try {
      await apiFetch(`${API_BASE}/saved/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError('Nao foi possivel remover o item salvo.');
    }
  }, []);

  const handleExportSaved = async () => {
    setSheetsMessage('');
    setSheetsExporting(true);
    try {
      const res = await apiFetch(API_BASE + '/google/sheets/export/saved', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao exportar salvos.');
      }
      setSheetsMessage(`Salvos exportados (${data.rows || 0} itens).`);
    } catch (err) {
      setSheetsMessage(err.message || 'Falha ao exportar salvos.');
    } finally {
      setSheetsExporting(false);
      setTimeout(() => setSheetsMessage(''), 3500);
    }
  };

  useEffect(() => {
    const handleContextAction = (event) => {
      const detail = event?.detail || {};
      if (detail.action !== 'remove' || !detail.id) return;
      handleRemove(detail.id);
    };
    window.addEventListener('context:saved', handleContextAction);
    return () => window.removeEventListener('context:saved', handleContextAction);
  }, [handleRemove]);

  if (loading) return <div className="timeline-loading">Carregando salvos...</div>;

  const matchesQuery = (item) => {
    if (!query.trim()) return true;
    const haystack = [
      item.title,
      item.contentSnippet,
      item.feedName
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return tokens.every(token => haystack.includes(token));
  };

  const filteredItems = items.filter(matchesQuery);

  const handleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(SAVED_VIEW_KEY, mode);
    } catch (e) {
      // ignore
    }
  };

  const getSourceLabel = (source) => {
    const fallback = source || 'timeline';
    switch (fallback) {
      case 'timeline':
        return 'Linha do tempo';
      case 'watch':
        return 'Acompanhamentos';
      case 'trends':
        return 'Tendências';
      case 'influencers':
        return 'Influenciadores';
      case 'summary':
        return 'Resumo diário';
      default:
        return 'Linha do tempo';
    }
  };

  return (
    <div className="saved-page">
      <div className="saved-header">
        <div>
          <h2>Itens salvos</h2>
          <p>Seus artigos guardados para ler depois.</p>
        </div>
        <div className="saved-actions">
          <div className="saved-view-toggle">
            <button
              type="button"
              className={`saved-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => handleViewMode('grid')}
            >
              Grade
            </button>
            <button
              type="button"
              className={`saved-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => handleViewMode('list')}
            >
              Lista
            </button>
            <button
              type="button"
              className={`saved-view-btn ${viewMode === 'compact' ? 'is-active' : ''}`}
              onClick={() => handleViewMode('compact')}
            >
              Compacta
            </button>
          </div>
          <button
            className="saved-refresh"
            onClick={handleExportSaved}
            disabled={sheetsExporting}
          >
            {sheetsExporting ? 'Exportando...' : 'Exportar (Sheets)'}
          </button>
          <button className="saved-refresh" onClick={fetchSaved}>Atualizar</button>
        </div>
      </div>
      {sheetsMessage && <div className="saved-error">{sheetsMessage}</div>}
      <div className="timeline-search">
        <input
          className="timeline-search-input"
          type="search"
          placeholder="Filtrar salvos por palavras"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filtrar itens salvos"
        />
        <button
          className="timeline-search-clear"
          onClick={() => setQuery('')}
          disabled={!query.trim()}
        >
          Limpar filtro
        </button>
      </div>
      <div className="timeline-search-meta">
        {filteredItems.length} resultado{filteredItems.length === 1 ? '' : 's'}
      </div>
      {error && <div className="saved-error">{error}</div>}
      {items.length === 0 ? (
        <div className="timeline-empty">Nenhum item salvo ainda.</div>
      ) : filteredItems.length === 0 ? (
        <div className="timeline-empty">Nenhum resultado encontrado.</div>
      ) : (
        <div className={`timeline saved-grid ${viewMode === 'grid' ? 'is-grid' : ''} ${viewMode === 'list' ? 'is-list' : ''} ${viewMode === 'compact' ? 'is-compact' : ''}`}>
          {filteredItems.map(item => (
            <div
              className="timeline-post"
              key={item.id}
              data-context-card="true"
              data-context-type="saved"
              data-context-id={item.id}
              data-context-url={item.link || ''}
              data-context-title={item.title || ''}
            >
              <div className="timeline-post-header">
                <span className="saved-feed">
                  <img
                    className="saved-feed-favicon"
                    src={getFaviconUrl(item.link)}
                    alt=""
                    onError={handleFaviconError}
                  />
                  <span className="timeline-feed-name">{item.feedName || 'Feed'}</span>
                </span>
                <span className="saved-source-tag">{getSourceLabel(item.source)}</span>
                <span className="timeline-date">{formatDateTime(item.pubDate || item.isoDate)}</span>
              </div>
              <div className="saved-card-body">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="timeline-title">
                  {item.title}
                </a>
                {item.contentSnippet && <div className="timeline-snippet">{item.contentSnippet}</div>}
              </div>
              <div className="timeline-post-actions">
                <button className="timeline-save is-saved" onClick={() => handleRemove(item.id)}>
                  Remover dos salvos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



