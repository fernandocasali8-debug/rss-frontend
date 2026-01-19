import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './SpacesLivePage.css';
import fallbackFavicon from './fallback-favicon.svg';

const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(value || 0);

const formatUpdatedAt = (value) => {
  if (!value) return 'Sem dados';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem dados';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
};

const getFaviconUrl = (url) => {
  if (!url) return '';
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch (e) {
    return '';
  }
};

const handleFaviconError = (event) => {
  if (!event?.currentTarget || event.currentTarget.dataset.fallbackApplied) return;
  event.currentTarget.dataset.fallbackApplied = '1';
  event.currentTarget.src = fallbackFavicon;
};

export default function SpacesLivePage() {
  const [items, setItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');

  const loadSpaces = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/spaces/live`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Falha ao carregar spaces.');
      setItems(Array.isArray(data.items) ? data.items : []);
      setUpdatedAt(data.updatedAt ? new Date(data.updatedAt).toISOString() : '');
      setSource(data.source || '');
      if (data.stale) {
        setMessage('Cache exibido. Falha ao atualizar agora.');
      }
    } catch (err) {
      setItems([]);
      setMessage(err.message || 'Falha ao carregar spaces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
    const interval = setInterval(loadSpaces, 300000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const totalListeners = items.reduce((acc, item) => acc + (item.listeners || 0), 0);
    return { total: items.length, totalListeners };
  }, [items]);

  return (
    <div className="spaces-live">
      <div className="spaces-live-header">
        <div>
          <h2>Spaces ao vivo</h2>
          <p>Espelho dos spaces abertos com base no SpacesDashboard.</p>
        </div>
        <div className="spaces-live-actions">
          <div className="spaces-live-pill">
            Atualizado: {formatUpdatedAt(updatedAt)}
          </div>
          {source && <div className="spaces-live-pill">Fonte: {source}</div>}
          <button className="spaces-live-button" onClick={loadSpaces} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar agora'}
          </button>
        </div>
      </div>

      <div className="spaces-live-summary">
        <div>
          <strong>{formatNumber(stats.total)}</strong>
          <span>spaces listados</span>
        </div>
        <div>
          <strong>{formatNumber(stats.totalListeners)}</strong>
          <span>ouvintes estimados</span>
        </div>
      </div>

      {message && <div className="spaces-live-message">{message}</div>}
      {loading && <div className="spaces-live-message">Carregando spaces...</div>}

      {!loading && items.length === 0 && !message && (
        <div className="spaces-live-empty">Nenhum space encontrado agora.</div>
      )}

      <div className="spaces-live-grid">
        {items.map((item) => (
          <div key={item.id} className="spaces-live-card">
            <div className="spaces-live-card-header">
              <img
                src={item.hostAvatar || getFaviconUrl(item.detailUrl)}
                alt=""
                className="spaces-live-avatar"
                onError={handleFaviconError}
              />
              <div>
                <div className="spaces-live-title">{item.title || item.fallbackTitle || 'Space ao vivo'}</div>
                <div className="spaces-live-host">
                  {item.hostName || item.hostHandle || 'Host'}
                  {item.hostHandle ? ` (@${item.hostHandle})` : ''}
                </div>
              </div>
            </div>
            <div className="spaces-live-meta">
              <span>Ouvintes: {formatNumber(item.listeners)}</span>
              {item.speakers ? <span>Speakers: {formatNumber(item.speakers)}</span> : null}
              {item.startedAt ? <span>Inicio: {item.startedAt}</span> : null}
            </div>
            {Array.isArray(item.titleHistory) && item.titleHistory.length > 1 && (
              <div className="spaces-live-history">
                <div className="spaces-live-history-label">Titulos anteriores</div>
                <ul>
                  {item.titleHistory.slice(0, -1).map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="spaces-live-actions">
              {item.spaceUrl && (
                <a href={item.spaceUrl} target="_blank" rel="noreferrer">
                  Abrir no X
                </a>
              )}
              {item.detailUrl && (
                <a href={item.detailUrl} target="_blank" rel="noreferrer">
                  Ver detalhes
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
