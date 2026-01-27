import React, { useMemo, useState } from 'react';
import './HighlightsPage.css';
import { useHighlights } from './HighlightContext';

const getFaviconUrl = (url) => {
  if (!url) return '';
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch (e) {
    return '';
  }
};

const getHost = (url) => {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
};

export default function HighlightsPage() {
  const { highlights, removeHighlight } = useHighlights();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return highlights.filter((h) => (
      !q
      || h.text.toLowerCase().includes(q)
      || (h.cardTitle || '').toLowerCase().includes(q)
      || (h.page || '').toLowerCase().includes(q)
    ));
  }, [highlights, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((h) => {
      const key = `${h.cardId || 'page'}|${h.page || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          cardId: h.cardId,
          cardTitle: h.cardTitle || 'Sem título',
          cardUrl: h.cardUrl || '',
          page: h.page || '',
          items: []
        });
      }
      map.get(key).items.push(h);
    });
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="highlights-page">
      <div className="highlights-header">
        <div>
          <h2>Grifos</h2>
          <p className="highlights-sub">
            Trechos que você marcou em qualquer tela. Agrupados por notícia/cartão.
          </p>
        </div>
        <input
          className="highlights-search"
          type="text"
          placeholder="Filtrar por texto, card ou página..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {grouped.length === 0 ? (
        <div className="highlights-empty">Nenhum sublinhado registrado.</div>
      ) : (
        <div className="highlights-grid">
          {grouped.map((group) => (
            <div key={group.key} className="highlight-card">
              <div className="highlight-head">
                <span className="highlight-dot" style={{ backgroundColor: group.items[0]?.color || '#94a3b8' }} />
                <div className="highlight-meta">
                  {group.cardUrl ? (
                    <a
                      href={group.cardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="highlight-card-title link"
                    >
                      {getFaviconUrl(group.cardUrl) && (
                        <img className="highlight-favicon" src={getFaviconUrl(group.cardUrl)} alt="" />
                      )}
                      <span className="highlight-title-text">{group.cardTitle}</span>
                    </a>
                  ) : (
                    <div className="highlight-card-title">
                      <span className="highlight-title-text">{group.cardTitle}</span>
                    </div>
                  )}
                  <div className="highlight-page">
                    {getHost(group.cardUrl) || group.page || '—'}
                    {group.cardId ? ` · ID ${group.cardId}` : ''}
                  </div>
                </div>
              </div>
              <div className="highlight-list">
                {group.items.map((h) => (
                  <div key={h.id} className="highlight-text-row">
                    <span className="highlight-bullet" style={{ backgroundColor: h.color }} />
                    <span className="highlight-text">“{h.text}”</span>
                    <button className="highlight-remove" onClick={() => removeHighlight(h.id)} aria-label="Remover">
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="highlight-foot">
                <span>
                  {group.items.length} grifo{group.items.length > 1 ? 's' : ''} · {new Date(group.items[0]?.createdAt || Date.now()).toLocaleString('pt-BR')}
                </span>
                {group.cardUrl && (
                  <a className="highlight-open" href={group.cardUrl} target="_blank" rel="noopener noreferrer">
                    Abrir notícia
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
