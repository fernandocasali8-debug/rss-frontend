import React, { useState, useEffect, useCallback } from 'react';
import './RssGeneratorPage.css';
import { API_BASE, apiFetch } from './api';

const STALE_MS = 3 * 60 * 60 * 1000;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(d);
};

export default function RssGeneratorPage() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [maxItems, setMaxItems] = useState(25);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const [feeds, setFeeds] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [action, setAction] = useState({ id: '', kind: '' });
  const [preview, setPreview] = useState({ open: false, title: '', items: [], loading: false, error: '' });
  const [query, setQuery] = useState('');

  const loadFeeds = useCallback(() => {
    setListLoading(true);
    apiFetch(`${API_BASE}/rss/generated?limit=100`)
      .then(res => res.json())
      .then(data => setFeeds(Array.isArray(data) ? data : []))
      .catch(() => setFeeds([]))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!url.trim()) { setErr('Informe a URL'); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/rss/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), title: title.trim(), useAi, maxItems: Number(maxItems) || 25 })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar');
      setMsg(`RSS gerado com ${data.itemsCount || 0} itens`);
      setUrl(''); setTitle('');
      loadFeeds();
    } catch (e2) {
      setErr(e2.message || 'Erro ao gerar');
    } finally {
      setLoading(false);
    }
  };

  const refreshFeed = async (feed) => {
    if (!feed?.id) return;
    setAction({ id: feed.id, kind: 'refresh' });
    setMsg(''); setErr('');
    try {
      const res = await apiFetch(`${API_BASE}/rss/generated/${feed.id}/refresh`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao atualizar');
      }
      setMsg('Feed atualizado');
      loadFeeds();
    } catch (e2) {
      setErr(e2.message || 'Erro ao atualizar');
    } finally {
      setAction({ id: '', kind: '' });
    }
  };

  const refreshAll = async () => {
    setAction({ id: 'all', kind: 'refresh' });
    for (const feed of feeds) {
      // sequencial para não sobrecarregar
      // eslint-disable-next-line no-await-in-loop
      await refreshFeed(feed);
    }
    setAction({ id: '', kind: '' });
  };

  const openPreview = async (feed) => {
    if (!feed?.feedUrl) return;
    setPreview({ open: true, title: feed.title || feed.url, items: [], loading: true, error: '' });
    try {
      const res = await fetch(`${API_BASE}${feed.feedUrl}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const xml = new window.DOMParser().parseFromString(text, 'text/xml');
      const items = Array.from(xml.querySelectorAll('item')).slice(0, 10).map((item) => ({
        title: item.querySelector('title')?.textContent || '',
        link: item.querySelector('link')?.textContent || '',
        date: item.querySelector('pubDate')?.textContent || '',
        desc: item.querySelector('description')?.textContent || ''
      }));
      setPreview((prev) => ({ ...prev, items, loading: false }));
    } catch (e2) {
      setPreview((prev) => ({ ...prev, loading: false, error: e2.message || 'Falha ao abrir RSS' }));
    }
  };
  const closePreview = () => setPreview({ open: false, title: '', items: [], loading: false, error: '' });

  const filtered = feeds.filter((f) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return `${f.title} ${f.url} ${f.fileName}`.toLowerCase().includes(q);
  });

  return (
    <div className="rss-gen-page">
      <h2>Gerador RSS</h2>
      <p>Informe a URL do site, gere o feed, teste a prévia e use na timeline.</p>

      <form className="rss-gen-form" onSubmit={handleGenerate}>
        <input
          type="url"
          placeholder="https://site.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Título opcional"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="rss-gen-inline">
          Máx itens:
          <input
            type="number"
            min="5"
            max="40"
            value={maxItems}
            onChange={(e) => setMaxItems(e.target.value)}
          />
        </label>
        <label className="rss-gen-inline">
          Usar IA
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
          />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Gerando...' : 'Gerar RSS'}</button>
        <button type="button" onClick={refreshAll} disabled={action.id === 'all'}>Atualizar todos</button>
      </form>

      {(msg || err) && <div className={`rss-gen-alert ${err ? 'is-err' : ''}`}>{err || msg}</div>}

      <div className="rss-gen-toolbar">
        <input
          type="search"
          placeholder="Filtrar por título/URL"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span>{filtered.length} feeds</span>
        <button type="button" onClick={loadFeeds} disabled={listLoading}>Recarregar lista</button>
      </div>

      <div className="rss-gen-list">
        {filtered.map((feed) => {
          const updated = feed.updatedAt || feed.createdAt;
          const stale = updated ? (Date.now() - Date.parse(updated)) > STALE_MS : true;
          return (
            <div key={feed.id} className={`rss-gen-card-mini ${stale ? 'is-stale' : ''}`}>
              <div className="rss-gen-card-title">{feed.title || feed.url}</div>
              <div className="rss-gen-card-meta">
                <span>{feed.itemsCount || 0} itens</span>
                <span>{feed.fileName}</span>
                <span>{updated ? formatDate(updated) : 'sem data'}</span>
                {stale && <span className="rss-gen-tag">Desatualizado</span>}
              </div>
              <div className="rss-gen-card-actions">
                <button type="button" onClick={() => openPreview(feed)}>Prévia</button>
                <button type="button" onClick={() => window.open(`${API_BASE}${feed.feedUrl}`, '_blank')}>Abrir XML</button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${API_BASE}${feed.feedUrl}`).catch(() => {});
                  }}
                >
                  Copiar link
                </button>
                <button
                  type="button"
                  onClick={() => refreshFeed(feed)}
                  disabled={action.id === feed.id && action.kind === 'refresh'}
                >
                  {action.id === feed.id && action.kind === 'refresh' ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {preview.open && (
        <div className="rss-gen-modal">
          <div className="rss-gen-modal-body">
            <div className="rss-gen-modal-head">
              <strong>Prévia: {preview.title}</strong>
              <button type="button" onClick={closePreview}>Fechar</button>
            </div>
            {preview.loading && <p>Carregando...</p>}
            {preview.error && <p className="rss-gen-error">{preview.error}</p>}
            {!preview.loading && !preview.error && (
              <ul className="rss-gen-preview-list">
                {preview.items.map((it, idx) => (
                  <li key={idx}>
                    <div className="rss-gen-preview-title">{it.title || '(sem título)'}</div>
                    <div className="rss-gen-preview-meta">{it.date}</div>
                    <div className="rss-gen-preview-desc">{it.desc}</div>
                    {it.link && <a href={it.link} target="_blank" rel="noreferrer">Abrir notícia</a>}
                  </li>
                ))}
                {!preview.items.length && <li>Sem itens no XML.</li>}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



