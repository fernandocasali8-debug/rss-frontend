import React, { useMemo, useState } from 'react';
import './HighlightsPage.css';
import { useHighlights } from './HighlightContext';

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
          <h2>Meus sublinhados</h2>
          <p className="highlights-sub">
            Texto marcado em qualquer tela. Clique no × para remover.
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
                      {group.cardTitle}
                    </a>
                  ) : (
                    <div className="highlight-card-title">{group.cardTitle}</div>
                  )}
                  <div className="highlight-page">{group.page || '—'}</div>
                </div>
              </div>
              <div className="highlight-list">
                {group.items.map((h) => (
                  <div key={h.id} className="highlight-text-row">
                    <span className="highlight-bullet" style={{ backgroundColor: h.color }} />
                    <span className="highlight-text">({h.text})</span>
                    <button className="highlight-remove" onClick={() => removeHighlight(h.id)} aria-label="Remover">
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="highlight-foot">
                <span>
                  {group.items.length} grifo{group.items.length > 1 ? 's' : ''}
                </span>
                {group.cardId && <span className="highlight-id">ID: {group.cardId}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
