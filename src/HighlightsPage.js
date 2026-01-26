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
      {filtered.length === 0 ? (
        <div className="highlights-empty">Nenhum sublinhado registrado.</div>
      ) : (
        <div className="highlights-grid">
          {filtered.map((h) => (
            <div key={h.id} className="highlight-card">
              <div className="highlight-head">
                <span className="highlight-dot" style={{ backgroundColor: h.color }} />
                <div className="highlight-meta">
                  <div className="highlight-card-title">{h.cardTitle || 'Sem título'}</div>
                  <div className="highlight-page">{h.page}</div>
                </div>
                <button className="highlight-remove" onClick={() => removeHighlight(h.id)} aria-label="Remover">
                  ×
                </button>
              </div>
              <div className="highlight-text">{h.text}</div>
              <div className="highlight-foot">
                <span>{new Date(h.createdAt || Date.now()).toLocaleString('pt-BR')}</span>
                {h.cardId && <span className="highlight-id">ID: {h.cardId}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

