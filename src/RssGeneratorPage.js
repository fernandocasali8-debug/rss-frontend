import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './RssGeneratorPage.css';
import fallbackFavicon from './fallback-favicon.svg';

const DEFAULT_MAX_ITEMS = 25;
const RSS_VIEW_KEY = 'rss-generator-view';

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}

export default function RssGeneratorPage() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [maxItems, setMaxItems] = useState(DEFAULT_MAX_ITEMS);
  const [useAi, setUseAi] = useState(true);
  const [language, setLanguage] = useState('pt');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('grid');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [actionState, setActionState] = useState({ id: '', type: '' });
  const [addedIds, setAddedIds] = useState([]);
  const [existingFeeds, setExistingFeeds] = useState([]);
  const [driveStatus, setDriveStatus] = useState({ connected: false, clients: [] });
  const [driveClientId, setDriveClientId] = useState('');
  const [driveExporting, setDriveExporting] = useState(false);
  const [testStatus, setTestStatus] = useState({});

  const fetchGenerated = useCallback(() => {
    setListLoading(true);
    setError('');
    apiFetch(`${API_BASE}/rss/generated?limit=80`)
      .then(res => res.json())
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setListLoading(false);
      })
      .catch(() => {
        setError('Não foi possível carregar os RSS gerados.');
        setListLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchGenerated();
  }, [fetchGenerated]);

  useEffect(() => {
    const stored = localStorage.getItem(RSS_VIEW_KEY);
    if (stored === 'grid' || stored === 'list' || stored === 'compact' || stored === 'table') {
      setViewMode(stored);
    }
  }, []);

  useEffect(() => {
    apiFetch(`${API_BASE}/feeds`)
      .then(res => res.json())
      .then(data => setExistingFeeds(Array.isArray(data) ? data : []))
      .catch(() => setExistingFeeds([]));
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

  const getFaviconUrl = (siteUrl) => {
    if (!siteUrl) return '';
    try {
      const host = new URL(siteUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
    } catch (e) {
      return '';
    }
  };

  const handleFaviconError = (event) => {
  if (!event?.currentTarget || event.currentTarget.dataset.fallbackApplied) return;
  event.currentTarget.dataset.fallbackApplied = '1';
  event.currentTarget.src = fallbackFavicon;
};

  const handleGenerate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!url.trim()) {
      setError('Informe a URL do site.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch(`${API_BASE}/rss/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim(),
          maxItems: Number(maxItems) || DEFAULT_MAX_ITEMS,
          useAi,
          language
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao gerar RSS.');
      }
      const data = await response.json();
      setMessage(`RSS gerado com ${data.itemsCount || 0} itens.`);
      setUrl('');
      setTitle('');
      setMaxItems(DEFAULT_MAX_ITEMS);
      setLanguage('pt');
      fetchGenerated();
    } catch (err) {
      setError(err.message || 'Falha ao gerar RSS.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Link copiado.');
    } catch (e) {
      setMessage('Não foi possível copiar o link.');
    }
  };

  const handleDelete = useCallback(async (entry) => {
    if (!entry?.id) return;
    setActionState({ id: entry.id, type: 'delete' });
    setError('');
    setMessage('');
    try {
      const response = await apiFetch(`${API_BASE}/rss/generated/${entry.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao remover RSS.');
      }
      setMessage('RSS removido.');
      fetchGenerated();
    } catch (err) {
      setError(err.message || 'Falha ao remover RSS.');
    } finally {
      setActionState({ id: '', type: '' });
    }
  }, [fetchGenerated]);

  const handleTestFeed = useCallback(async (entry) => {
    if (!entry?.feedUrl) return;
    const feedLink = `${API_BASE}${entry.feedUrl}`;
    setTestStatus((prev) => ({ ...prev, [entry.id]: { status: 'loading', message: 'Testando…' } }));
    try {
      const res = await fetch(feedLink, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const ok = text && text.includes('<item>');
      setTestStatus((prev) => ({
        ...prev,
        [entry.id]: { status: ok ? 'ok' : 'warn', message: ok ? 'OK' : 'Sem <item>' }
      }));
    } catch (err) {
      setTestStatus((prev) => ({
        ...prev,
        [entry.id]: { status: 'error', message: err.message || 'Erro ao testar' }
      }));
    }
  }, []);

  const handleAddFeed = async (entry) => {
    if (!entry?.feedUrl) return;
    setActionState({ id: entry.id, type: 'add' });
    setError('');
    setMessage('');
    let fallbackName = 'Feed RSS';
    try {
      fallbackName = new URL(entry.url).hostname.replace(/^www\./, '');
    } catch (e) {
      // ignore
    }
    try {
      const response = await apiFetch(`${API_BASE}/feeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: entry.title || fallbackName,
          url: `${API_BASE}${entry.feedUrl}`,
          sourceUrl: entry.url || '',
          showOnTimeline: true,
          language: entry.language || 'pt'
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao adicionar feed.');
      }
      setMessage('Feed adicionado ao repositório.');
      setAddedIds(prev => (prev.includes(entry.id) ? prev : [entry.id, ...prev]));
      if (data?.id) {
        setExistingFeeds(prev => [data, ...prev]);
      }
    } catch (err) {
      setError(err.message || 'Falha ao adicionar feed.');
    } finally {
      setActionState({ id: '', type: '' });
    }
  };

  const handleDriveExport = async () => {
    setError('');
    setMessage('');
    if (!driveStatus.connected) {
      setError('Google Drive nao conectado.');
      return;
    }
    setDriveExporting(true);
    try {
      const res = await apiFetch(`${API_BASE}/google/drive/export/rss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: driveClientId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao exportar para o Drive.');
      setMessage('RSS exportados para o Drive.');
    } catch (err) {
      setError(err.message || 'Falha ao exportar para o Drive.');
    } finally {
      setDriveExporting(false);
    }
  };

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    let next = items;
    if (term) {
      next = items.filter((entry) => {
        const haystack = [
          entry.title,
          entry.url,
          entry.fileName
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
    }
    if (sortBy === 'title') {
      next = [...next].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'pt-BR'));
    } else if (sortBy === 'items') {
      next = [...next].sort((a, b) => (b.itemsCount || 0) - (a.itemsCount || 0));
    } else {
      next = [...next].sort((a, b) => {
        const aTime = Date.parse(a.createdAt) || 0;
        const bTime = Date.parse(b.createdAt) || 0;
        return bTime - aTime;
      });
    }
    return next;
  }, [items, query, sortBy]);

  const existingFeedUrls = useMemo(() => {
    const urls = new Set();
    existingFeeds.forEach((feed) => {
      if (feed?.url) {
        urls.add(feed.url.toLowerCase());
      }
    });
    return urls;
  }, [existingFeeds]);

  const listContent = useMemo(() => {
    if (listLoading) {
      return <div className="rss-gen-status">Carregando RSS gerados...</div>;
    }
    if (!items.length) {
      return <div className="rss-gen-status">Nenhum RSS gerado ainda.</div>;
    }
    if (!filteredItems.length) {
      return <div className="rss-gen-status">Nenhum RSS encontrado com os filtros atuais.</div>;
    }
    if (viewMode === 'table') {
      return (
        <div className="rss-gen-table">
          <div className="rss-gen-table-row is-head">
            <span>Fonte</span>
            <span>URL</span>
            <span>Itens</span>
            <span>Gerado</span>
            <span>Ações</span>
            <span>Teste</span>
          </div>
          {filteredItems.map((entry) => {
            const feedUrl = `${API_BASE}${entry.feedUrl || ''}`.toLowerCase();
            const isAdded = addedIds.includes(entry.id) || existingFeedUrls.has(feedUrl);
            return (
              <div key={entry.id} className="rss-gen-table-row">
                <div className="rss-gen-table-main">
                  <img
                    className="rss-gen-card-favicon"
                    src={getFaviconUrl(entry.url)}
                    alt=""
                    loading="lazy"
                    onError={handleFaviconError}
                  />
                  <div className="rss-gen-table-title">
                    <strong>{entry.title || 'RSS sem título'}</strong>
                    <span className="rss-gen-table-file">{entry.fileName}</span>
                  </div>
                  {isAdded && <span className="rss-gen-tag">No repositório</span>}
                </div>
              <span className="rss-gen-table-url">{entry.url}</span>
              <span className="rss-gen-table-count">{entry.itemsCount || 0}</span>
              <span>{formatDate(entry.createdAt)}</span>
              <div className="rss-gen-table-actions">
                  <button
                    type="button"
                    className="rss-gen-button small primary"
                    onClick={() => window.open(`${API_BASE}${entry.feedUrl}`, '_blank')}
                  >
                    RSS
                  </button>
                  <button
                    type="button"
                    className="rss-gen-button small"
                    onClick={() => handleCopy(`${API_BASE}${entry.feedUrl}`)}
                  >
                    Copiar
                  </button>
                  <button
                    type="button"
                    className="rss-gen-button small"
                    onClick={() => window.open(entry.url, '_blank')}
                  >
                    Site
                  </button>
                  <button
                    type="button"
                    className="rss-gen-button small"
                    disabled={isAdded || (actionState.id === entry.id && actionState.type === 'add')}
                    onClick={() => handleAddFeed(entry)}
                  >
                    {isAdded ? 'No repo' : (actionState.id === entry.id && actionState.type === 'add' ? 'Adicionando' : 'Usar')}
                  </button>
                  <button
                    type="button"
                    className="rss-gen-button small danger"
                    disabled={actionState.id === entry.id && actionState.type === 'delete'}
                    onClick={() => handleDelete(entry)}
                  >
                    {actionState.id === entry.id && actionState.type === 'delete' ? 'Removendo' : 'Remover'}
                  </button>
                </div>
                <div className="rss-gen-test">
                  <button
                    type="button"
                    className="rss-gen-button small"
                    onClick={() => handleTestFeed(entry)}
                  >
                    Testar
                  </button>
                  {testStatus[entry.id]?.status && (
                    <span className={`rss-gen-tag ${testStatus[entry.id].status}`}>
                      {testStatus[entry.id].message}
                    </span>
                  )}
                </div>
            </div>
          );
        })}
      </div>
    );
    }

    return (
      <div className={`rss-gen-grid ${viewMode === 'list' ? 'is-list' : ''} ${viewMode === 'compact' ? 'is-compact' : ''}`}>
        {filteredItems.map((entry) => {
          const feedUrl = `${API_BASE}${entry.feedUrl || ''}`.toLowerCase();
          const isAdded = addedIds.includes(entry.id) || existingFeedUrls.has(feedUrl);
          return (
            <article
              key={entry.id}
              className="rss-gen-card"
              data-context-card="true"
              data-context-type="rss-generator"
              data-context-id={entry.id}
              data-context-url={entry.url || ''}
              data-context-title={entry.title || ''}
            >
              <div className="rss-gen-card-header">
                <div className="rss-gen-card-main">
                  <img
                    className="rss-gen-card-favicon"
                    src={getFaviconUrl(entry.url)}
                    alt=""
                    loading="lazy"
                    onError={handleFaviconError}
                  />
                  <div className="rss-gen-card-text">
                    <div className="rss-gen-card-title">{entry.title || 'RSS sem título'}</div>
                    <div className="rss-gen-card-url">{entry.url}</div>
                  </div>
                </div>
                <div className="rss-gen-card-info">
                  {isAdded && <span className="rss-gen-tag">No repositório</span>}
                  <div className="rss-gen-card-count">{entry.itemsCount || 0} itens</div>
                </div>
              </div>
              <div className="rss-gen-card-meta">
                <span>Gerado em {formatDate(entry.createdAt)}</span>
                <span className="rss-gen-card-file">{entry.fileName}</span>
                {testStatus[entry.id]?.status && (
                  <span className={`rss-gen-tag ${testStatus[entry.id].status}`}>
                    {testStatus[entry.id].message}
                  </span>
                )}
              </div>
              <div className="rss-gen-card-actions">
                <button
                  type="button"
                  className="rss-gen-button primary"
                  onClick={() => window.open(`${API_BASE}${entry.feedUrl}`, '_blank')}
                >
                  Abrir RSS
                </button>
                <button
                  type="button"
                  className="rss-gen-button"
                  onClick={() => handleCopy(`${API_BASE}${entry.feedUrl}`)}
                >
                  Copiar link
                </button>
                <button
                  type="button"
                  className="rss-gen-button"
                  onClick={() => window.open(entry.url, '_blank')}
                >
                  Abrir site
                </button>
                <button
                  type="button"
                  className="rss-gen-button"
                  disabled={isAdded || (actionState.id === entry.id && actionState.type === 'add')}
                  onClick={() => handleAddFeed(entry)}
                >
                  {isAdded
                    ? 'Já no repositório'
                    : (actionState.id === entry.id && actionState.type === 'add'
                      ? 'Adicionando...'
                      : 'Usar no repositório')}
                </button>
                <button
                  type="button"
                  className="rss-gen-button danger"
                  disabled={actionState.id === entry.id && actionState.type === 'delete'}
                  onClick={() => handleDelete(entry)}
                >
                  {actionState.id === entry.id && actionState.type === 'delete' ? 'Removendo...' : 'Remover'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  }, [
    filteredItems,
    listLoading,
    actionState,
    viewMode,
    addedIds,
    existingFeedUrls,
    handleDelete,
    items.length
  ]);

  const handleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(RSS_VIEW_KEY, mode);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="rss-gen-page">
      <header className="rss-gen-header">
        <div>
          <h2>Gerador de RSS com IA</h2>
          <p>Crie feeds inteligentes a partir de qualquer site e salve para uso futuro.</p>
        </div>
        <div className="rss-gen-header-note">Retenção automática: até 45 dias ou 200 arquivos.</div>
      </header>

      <form className="rss-gen-form" onSubmit={handleGenerate}>
        <div className="rss-gen-field">
          <label>URL do site</label>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://site.com"
            required
          />
        </div>
        <div className="rss-gen-field">
          <label>Título opcional</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nome do feed"
          />
        </div>
        <div className="rss-gen-field">
          <label>Máximo de itens</label>
          <input
            type="number"
            min="5"
            max="40"
            value={maxItems}
            onChange={(event) => setMaxItems(event.target.value)}
          />
        </div>
        <div className="rss-gen-field toggle">
          <label>Usar IA para estruturar</label>
          <input
            type="checkbox"
            checked={useAi}
            onChange={(event) => setUseAi(event.target.checked)}
          />
        </div>
        <div className="rss-gen-field">
          <label>Idioma do conteudo</label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="pt">Portugues (nao traduzir)</option>
            <option value="auto">Outro idioma (auto detectar e traduzir para PT)</option>
          </select>
        </div>
        <button className="rss-gen-submit" type="submit" disabled={loading}>
          {loading ? 'Gerando...' : 'Gerar RSS'}
        </button>
      </form>

      {(message || error) && (
        <div className={`rss-gen-message ${error ? 'error' : ''}`}>
          {error || message}
        </div>
      )}

      <section className="rss-gen-section">
        <div className="rss-gen-section-header">
          <h3>RSS gerados</h3>
          <div className="rss-gen-section-actions">
            <div className="rss-gen-view-toggle">
              <button
                type="button"
                className={`rss-gen-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => handleViewMode('grid')}
              >
                Grade
              </button>
              <button
                type="button"
                className={`rss-gen-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                onClick={() => handleViewMode('list')}
              >
                Lista
              </button>
              <button
                type="button"
                className={`rss-gen-view-btn ${viewMode === 'compact' ? 'is-active' : ''}`}
                onClick={() => handleViewMode('compact')}
              >
                Compacta
              </button>
              <button
                type="button"
                className={`rss-gen-view-btn ${viewMode === 'table' ? 'is-active' : ''}`}
                onClick={() => handleViewMode('table')}
              >
                Tabela
              </button>
            </div>
            <span className="rss-gen-section-count">{filteredItems.length} itens</span>
            <select
              className="rss-gen-select"
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
              type="button"
              className="rss-gen-button"
              onClick={handleDriveExport}
              disabled={!driveStatus.connected || driveExporting}
            >
              {driveExporting ? 'Exportando...' : 'Exportar Drive'}
            </button>
            <button type="button" className="rss-gen-button" onClick={fetchGenerated}>
              Atualizar
            </button>
          </div>
        </div>
        <div className="rss-gen-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, URL ou arquivo"
            className="rss-gen-search"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rss-gen-select"
          >
            <option value="recent">Mais recentes</option>
            <option value="title">Título A-Z</option>
            <option value="items">Mais itens</option>
          </select>
        </div>
        {listContent}
      </section>
    </div>
  );
}



