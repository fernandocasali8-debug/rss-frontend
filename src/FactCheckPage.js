import React, { useEffect, useState } from 'react';
import './FactCheckPage.css';
import { API_BASE, apiFetch } from './api';

const RECENT_KEY = 'fact-check-recent';
const MAX_RECENT = 6;

export default function FactCheckPage() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      if (Array.isArray(stored)) {
        setRecent(stored.slice(0, MAX_RECENT));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const saveRecent = (term) => {
    const normalized = String(term || '').trim();
    if (!normalized) return;
    setRecent((prev) => {
      const next = [normalized, ...prev.filter((item) => item !== normalized)];
      const trimmed = next.slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
      } catch (e) {
        // ignore
      }
      return trimmed;
    });
  };

  const runSearch = async (term) => {
    const cleaned = String(term || '').trim();
    if (!cleaned) {
      setError('Informe um termo para checar.');
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    setItems([]);
    try {
      const res = await apiFetch(`${API_BASE}/factcheck/search?query=${encodeURIComponent(cleaned)}`);
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || 'Falha ao buscar checagem.');
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      saveRecent(cleaned);
    } catch (err) {
      setError(err.message || 'Falha ao buscar checagem.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    runSearch(query);
  };

  return (
    <div className="fact-check-page">
      <div className="fact-check-header">
        <div>
          <h2>Fact Check</h2>
          <p>Consulte checagens publicas para validar alegacoes rapidamente.</p>
        </div>
      </div>

      <form className="fact-check-search" onSubmit={handleSubmit}>
        <input
          type="search"
          placeholder="Digite uma alegacao ou tema (ex: vacina covid, fraude eleitoral)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Buscando...' : 'Checar'}
        </button>
      </form>

      {recent.length > 0 && (
        <div className="fact-check-recent">
          <span>Buscas recentes:</span>
          <div className="fact-check-recent-list">
            {recent.map((term) => (
              <button key={term} type="button" onClick={() => runSearch(term)}>
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="fact-check-error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="fact-check-empty">
          Nenhuma checagem carregada. Faça uma busca para ver resultados.
        </div>
      )}

      {items.length > 0 && (
        <div className="fact-check-results">
          {items.map((claim) => (
            <div key={claim.id} className="fact-check-card">
              <div className="fact-check-claim">{claim.text || 'Alegacao sem texto'}</div>
              {claim.claimant && (
                <div className="fact-check-claimant">Atribuicao: {claim.claimant}</div>
              )}
              <div className="fact-check-reviews">
                {claim.reviews.map((review, idx) => (
                  <a
                    key={`${claim.id}-${idx}`}
                    className="fact-check-review"
                    href={review.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="fact-check-review-title">{review.title || 'Checagem'}</div>
                    <div className="fact-check-review-meta">
                      <span>{review.publisher}</span>
                      {review.rating && <span className="fact-check-rating">{review.rating}</span>}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
