import React, { useEffect, useMemo, useState } from 'react';
import './FactCheckPage.css';
import { API_BASE, apiFetch } from './api';

const RECENT_KEY = 'fact-check-recent';
const FAVORITES_KEY = 'fact-check-favorites';
const SEEN_KEY = 'fact-check-seen';
const MAX_RECENT = 6;
const SEEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export default function FactCheckPage() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [recent, setRecent] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [publisherFilter, setPublisherFilter] = useState('all');
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      if (Array.isArray(stored)) {
        setRecent(stored.slice(0, MAX_RECENT));
      }
      const storedFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      if (Array.isArray(storedFavorites)) {
        setFavorites(storedFavorites);
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

  const normalizeClaimKey = (text) => String(text || '').toLowerCase().trim();

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
    setAlertMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/factcheck/search?query=${encodeURIComponent(cleaned)}`);
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || 'Falha ao buscar checagem.');
      }
      const nextItems = Array.isArray(data.items) ? data.items : [];
      const now = Date.now();
      let seenMap = {};
      try {
        seenMap = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
      } catch (e) {
        seenMap = {};
      }
      const repeated = [];
      nextItems.forEach((claim) => {
        const key = normalizeClaimKey(claim.text);
        if (!key) return;
        const lastSeen = Number(seenMap[key] || 0);
        if (lastSeen && now - lastSeen <= SEEN_WINDOW_MS) {
          repeated.push(key);
        }
        seenMap[key] = now;
      });
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(seenMap));
      } catch (e) {
        // ignore
      }
      if (repeated.length > 0) {
        setAlertMessage(`Alegacoes reapareceram nas ultimas buscas: ${repeated.length}.`);
      }
      setItems(nextItems);
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

  const isFavorited = (claim) => favorites.some((entry) => entry.id === claim.id);

  const toggleFavorite = (claim) => {
    setFavorites((prev) => {
      const exists = prev.some((entry) => entry.id === claim.id);
      let next = [];
      if (exists) {
        next = prev.filter((entry) => entry.id !== claim.id);
      } else {
        next = [
          {
            id: claim.id,
            text: claim.text,
            claimant: claim.claimant || '',
            reviews: claim.reviews || [],
            savedAt: new Date().toISOString()
          },
          ...prev
        ];
      }
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const publishers = useMemo(() => Array.from(new Set(
    items.flatMap((claim) => (claim.reviews || []).map((review) => review.publisher)).filter(Boolean)
  )), [items]);

  const filteredItems = useMemo(() => (
    items
      .map((claim) => {
        if (publisherFilter === 'all') return claim;
        const filteredReviews = (claim.reviews || []).filter((review) => review.publisher === publisherFilter);
        return { ...claim, reviews: filteredReviews };
      })
      .filter((claim) => (claim.reviews || []).length > 0 || publisherFilter === 'all')
  ), [items, publisherFilter]);

  const handleExport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      query,
      publisherFilter,
      items: filteredItems
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fact-check-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
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

      <div className="fact-check-toolbar">
        <div className="fact-check-filter">
          <label>Agencia</label>
          <select
            value={publisherFilter}
            onChange={(event) => setPublisherFilter(event.target.value)}
          >
            <option value="all">Todas</option>
            {publishers.map((publisher) => (
              <option key={publisher} value={publisher}>{publisher}</option>
            ))}
          </select>
        </div>
        <button type="button" className="fact-check-export" onClick={handleExport} disabled={!filteredItems.length}>
          Exportar
        </button>
      </div>

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

      {alertMessage && <div className="fact-check-alert">{alertMessage}</div>}

      {error && <div className="fact-check-error">{error}</div>}

      {!loading && !error && filteredItems.length === 0 && (
        <div className="fact-check-empty">
          Nenhuma checagem carregada. Faca uma busca para ver resultados.
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="fact-check-results">
          {filteredItems.map((claim) => (
            <div key={claim.id} className="fact-check-card">
              <div className="fact-check-claim">{claim.text || 'Alegacao sem texto'}</div>
              {claim.claimant && (
                <div className="fact-check-claimant">Atribuicao: {claim.claimant}</div>
              )}
              <button
                type="button"
                className={`fact-check-favorite ${isFavorited(claim) ? 'is-active' : ''}`}
                onClick={() => toggleFavorite(claim)}
              >
                {isFavorited(claim) ? 'Salvo' : 'Salvar'}
              </button>
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

      {favorites.length > 0 && (
        <div className="fact-check-favorites">
          <div className="fact-check-favorites-header">
            <h3>Favoritas</h3>
            <span>{favorites.length} checagens</span>
          </div>
          <div className="fact-check-favorites-list">
            {favorites.map((claim) => (
              <div key={claim.id} className="fact-check-favorites-item">
                <div className="fact-check-favorites-title">{claim.text}</div>
                <div className="fact-check-favorites-meta">
                  {claim.claimant || 'Sem atribuicao'}
                </div>
                <div className="fact-check-favorites-actions">
                  <button type="button" onClick={() => toggleFavorite(claim)}>
                    Remover
                  </button>
                  {claim.reviews?.[0]?.url && (
                    <a href={claim.reviews[0].url} target="_blank" rel="noopener noreferrer">
                      Abrir checagem
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
