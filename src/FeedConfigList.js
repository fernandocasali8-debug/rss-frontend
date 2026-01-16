import React, { useEffect, useState, useCallback } from 'react';
import { API_BASE, apiFetch } from './api';

export default function FeedConfigList({ onFeedUpdated, refreshToken }) {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState([]);
  const [error, setError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const fetchFeeds = useCallback(() => {
    setLoading(true);
    setError('');
    apiFetch(API_BASE + '/feeds')
      .then(res => res.json())
      .then(data => {
        setFeeds(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar feeds.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds, refreshToken]);

  const updateFeedTimeline = async (feed, showOnTimeline) => {
    setError('');
    setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, showOnTimeline } : f));
    setSavingIds(prev => (prev.includes(feed.id) ? prev : [...prev, feed.id]));

    try {
      const res = await apiFetch(`${API_BASE}/feeds/${feed.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnTimeline: !!showOnTimeline })
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setLastSavedAt(Date.now());
      if (onFeedUpdated) onFeedUpdated();
    } catch (err) {
      setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, showOnTimeline: feed.showOnTimeline } : f));
      setError(err.message || 'Erro ao salvar.');
    } finally {
      setSavingIds(prev => prev.filter(id => id !== feed.id));
    }
  };

  const updateFeedLanguage = async (feed, language) => {
    setError('');
    setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, language } : f));
    setSavingIds(prev => (prev.includes(feed.id) ? prev : [...prev, feed.id]));

    try {
      const res = await apiFetch(`${API_BASE}/feeds/${feed.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
      });
      if (!res.ok) throw new Error('Erro ao salvar idioma.');
      setLastSavedAt(Date.now());
      if (onFeedUpdated) onFeedUpdated();
    } catch (err) {
      setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, language: feed.language } : f));
      setError(err.message || 'Erro ao salvar idioma.');
    } finally {
      setSavingIds(prev => prev.filter(id => id !== feed.id));
    }
  };

  const startEditing = (feed) => {
    setEditingId(feed.id);
    setEditingName(feed.name || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveFeedName = async (feed) => {
    const nextName = editingName.trim();
    if (!nextName) {
      setError('O nome do feed não pode ficar vazio.');
      return;
    }
    setError('');
    setSavingIds(prev => (prev.includes(feed.id) ? prev : [...prev, feed.id]));
    try {
      const res = await apiFetch(`${API_BASE}/feeds/${feed.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName })
      });
      if (!res.ok) throw new Error('Erro ao salvar nome.');
      setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, name: nextName } : f));
      setLastSavedAt(Date.now());
      setEditingId(null);
      setEditingName('');
      if (onFeedUpdated) onFeedUpdated();
    } catch (err) {
      setError(err.message || 'Erro ao salvar nome.');
    } finally {
      setSavingIds(prev => prev.filter(id => id !== feed.id));
    }
  };

  const getStatusText = () => {
    if (savingIds.length > 0) return 'Salvando...';
    if (lastSavedAt) {
      const time = new Date(lastSavedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      return `Salvo às ${time}`;
    }
    return '';
  };

  if (loading) return <div>Carregando feeds...</div>;

  return (
    <div className="feed-config">
      <h3>Feeds cadastrados</h3>
      {error && <div className="feed-config-error">{error}</div>}
      {getStatusText() && <div className="feed-config-status">{getStatusText()}</div>}
      <ul className="feed-config-list">
        {feeds.map(feed => {
          const isSaving = savingIds.includes(feed.id);
          return (
            <li key={feed.id} className="feed-config-item">
              <div className="feed-config-meta">
                {editingId === feed.id ? (
                  <input
                    className="feed-config-input"
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                ) : (
                  <span className="feed-config-name">{feed.name}</span>
                )}
                <span className={`feed-config-pill ${feed.showOnTimeline ? 'is-on' : ''}`}>
                  {feed.showOnTimeline ? 'Na linha do tempo' : 'Fora da linha do tempo'}
                </span>
              </div>
              <div className="feed-config-actions">

                <label className="feed-field">
                  <span className="feed-label">Idioma</span>
                  <select
                    className="feed-config-input"
                    value={feed.language || 'pt'}
                    onChange={(e) => updateFeedLanguage(feed, e.target.value)}
                    disabled={isSaving}
                  >
                    <option value="pt">PT</option>
                    <option value="auto">Auto + PT</option>
                  </select>
                </label>

                {editingId === feed.id ? (
                  <>
                    <button
                      className="feed-config-action"
                      onClick={() => saveFeedName(feed)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      className="feed-config-action secondary"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    className="feed-config-action"
                    onClick={() => startEditing(feed)}
                  >
                    Editar nome
                  </button>
                )}
                {feed.showOnTimeline ? (
                  <button
                    className={`feed-config-toggle is-active ${isSaving ? 'is-saving' : ''}`}
                    onClick={() => updateFeedTimeline(feed, false)}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Salvando...' : 'Remover da linha do tempo'}
                  </button>
                ) : (
                  <button
                    className={`feed-config-toggle ${isSaving ? 'is-saving' : ''}`}
                    onClick={() => updateFeedTimeline(feed, true)}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Salvando...' : 'Adicionar a linha do tempo'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


