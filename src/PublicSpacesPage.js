import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './PublicSpacesPage.css';
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

const buildWsUrl = () => {
  const base = API_BASE.replace(/\/+$/, '');
  return base.replace(/^http/, 'ws') + '/spaces/ws';
};

export default function PublicSpacesPage() {
  const [spaces, setSpaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');
  const [name, setName] = useState('');
  const [chatItems, setChatItems] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const wsRef = useRef(null);

  const stats = useMemo(() => {
    const totalListeners = spaces.reduce((acc, item) => acc + (item.listeners || 0), 0);
    return { total: spaces.length, totalListeners };
  }, [spaces]);

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/spaces/live`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Falha ao carregar spaces.');
      const items = Array.isArray(data.items) ? data.items : [];
      setSpaces(items);
      setUpdatedAt(data.updatedAt ? new Date(data.updatedAt).toISOString() : '');
      setSource(data.source || '');
      if (!selected && items.length) {
        setSelected(items[0]);
      }
      if (data.stale) {
        setMessage('Cache exibido. Falha ao atualizar agora.');
      }
    } catch (err) {
      setSpaces([]);
      setMessage(err.message || 'Falha ao carregar spaces.');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    loadSpaces();
    const interval = setInterval(loadSpaces, 300000);
    return () => clearInterval(interval);
  }, [loadSpaces]);

  useEffect(() => {
    if (!selected) return;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setChatItems([]);
    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        spaceId: selected.spaceUrl,
        name: name.trim() || 'Participante'
      }));
    };
    ws.onmessage = (event) => {
      let payload = null;
      try {
        payload = JSON.parse(event.data);
      } catch (err) {
        return;
      }
      if (payload.type === 'history') {
        setChatItems(Array.isArray(payload.items) ? payload.items : []);
      }
      if (payload.type === 'message' && payload.item) {
        setChatItems((prev) => [...prev, payload.item].slice(-200));
      }
    };
    return () => {
      ws.close();
    };
  }, [selected, name]);

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: 'message', text }));
    setChatInput('');
  };

  return (
    <div className="public-spaces">
      <header className="public-spaces-header">
        <div>
          <div className="public-spaces-brand">Radar Spaces</div>
          <h1>Spaces abertos no X</h1>
          <p>Lista ao vivo + chat paralelo para comentar cada space.</p>
        </div>
        <div className="public-spaces-actions">
          <div className="public-spaces-pill">Atualizado: {formatUpdatedAt(updatedAt)}</div>
          {source && <div className="public-spaces-pill">Fonte: {source}</div>}
          <button className="public-spaces-button" onClick={loadSpaces} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar agora'}
          </button>
        </div>
      </header>

      <div className="public-spaces-summary">
        <div>
          <strong>{formatNumber(stats.total)}</strong>
          <span>spaces listados</span>
        </div>
        <div>
          <strong>{formatNumber(stats.totalListeners)}</strong>
          <span>ouvintes estimados</span>
        </div>
      </div>

      {message && <div className="public-spaces-message">{message}</div>}

      <div className="public-spaces-layout">
        <section className="public-spaces-list">
          <h2>Ao vivo agora</h2>
          {loading && <div className="public-spaces-message">Carregando spaces...</div>}
          {!loading && spaces.length === 0 && (
            <div className="public-spaces-empty">Nenhum space encontrado.</div>
          )}
          <div className="public-spaces-grid">
            {spaces.map((item) => {
              const isActive = selected?.spaceUrl === item.spaceUrl;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`public-spaces-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => setSelected(item)}
                >
                  <div className="public-spaces-card-header">
                    <img
                      src={item.hostAvatar || getFaviconUrl(item.detailUrl)}
                      alt=""
                      className="public-spaces-avatar"
                      onError={handleFaviconError}
                    />
                    <div>
                      <div className="public-spaces-title">{item.title}</div>
                      <div className="public-spaces-host">
                        {item.hostName || item.hostHandle || 'Host'}
                        {item.hostHandle ? ` (@${item.hostHandle})` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="public-spaces-meta">
                    <span>Ouvintes: {formatNumber(item.listeners)}</span>
                    {item.speakers ? <span>Speakers: {formatNumber(item.speakers)}</span> : null}
                    {item.startedAt ? <span>Inicio: {item.startedAt}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <aside className="public-spaces-chat">
          <div className="public-spaces-chat-header">
            <h2>Chat ao vivo</h2>
            {selected && (
              <div className="public-spaces-chat-title">{selected.title}</div>
            )}
          </div>
          {!selected && <div className="public-spaces-empty">Selecione um space.</div>}
          {selected && (
            <>
              <div className="public-spaces-chat-controls">
                <label>
                  Seu nome
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Digite seu nome"
                  />
                </label>
                <div className="public-spaces-chat-links">
                  {selected.spaceUrl && (
                    <a href={selected.spaceUrl} target="_blank" rel="noreferrer">
                      Abrir no X
                    </a>
                  )}
                  {selected.detailUrl && (
                    <a href={selected.detailUrl} target="_blank" rel="noreferrer">
                      Ver detalhes
                    </a>
                  )}
                </div>
              </div>
              <div className="public-spaces-chat-list">
                {chatItems.length === 0 && (
                  <div className="public-spaces-empty">Seja o primeiro a comentar.</div>
                )}
                {chatItems.map((item) => (
                  <div key={item.id} className="public-spaces-chat-item">
                    <strong>{item.name}</strong>
                    <span>{item.text}</span>
                    <time>{new Date(item.timestamp).toLocaleTimeString('pt-BR')}</time>
                  </div>
                ))}
              </div>
              <div className="public-spaces-chat-input">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Escreva sua mensagem"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSend();
                    }
                  }}
                />
                <button type="button" onClick={handleSend}>
                  Enviar
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
