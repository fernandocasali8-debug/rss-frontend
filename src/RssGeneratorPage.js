import React, { useState, useEffect, useCallback } from 'react';
import './RssGeneratorPage.css';
import { API_BASE, apiFetch } from './api';

// Página simplificada com teste/preview do RSS gerado
export default function RssGeneratorPage() {
  const [feeds, setFeeds] = useState([]);
  const [preview, setPreview] = useState({ open: false, title: '', items: [], loading: false, error: '' });

  const loadFeeds = useCallback(() => {
    apiFetch(`${API_BASE}/rss/generated?limit=50`)
      .then(res => res.json())
      .then(data => setFeeds(Array.isArray(data) ? data : []))
      .catch(() => setFeeds([]));
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const openPreview = async (feed) => {
    if (!feed?.feedUrl) return;
    setPreview({ open: true, title: feed.title || feed.url, items: [], loading: true, error: '' });
    try {
      const res = await fetch(`${API_BASE}${feed.feedUrl}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parser = new window.DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const items = Array.from(xml.querySelectorAll('item')).slice(0, 10).map((item) => ({
        title: item.querySelector('title')?.textContent || '',
        link: item.querySelector('link')?.textContent || '',
        date: item.querySelector('pubDate')?.textContent || '',
        desc: item.querySelector('description')?.textContent || ''
      }));
      setPreview((prev) => ({ ...prev, items, loading: false }));
    } catch (err) {
      setPreview((prev) => ({ ...prev, loading: false, error: err.message || 'Falha ao abrir RSS' }));
    }
  };

  const closePreview = () => setPreview({ open: false, title: '', items: [], loading: false, error: '' });

  return (
    <div className="rss-gen-page">
      <h2>Gerador de RSS</h2>
      <p>Lista dos feeds gerados. Clique em “Prévia” para ver os itens do XML.</p>

      <div className="rss-gen-list">
        {feeds.map((feed) => (
          <div key={feed.id} className="rss-gen-card-mini">
            <div className="rss-gen-card-title">{feed.title || feed.url}</div>
            <div className="rss-gen-card-meta">
              <span>{feed.itemsCount || 0} itens</span>
              <span>{feed.fileName}</span>
            </div>
            <div className="rss-gen-card-actions">
              <button type="button" onClick={() => openPreview(feed)}>Prévia</button>
              <button type="button" onClick={() => window.open(`${API_BASE}${feed.feedUrl}`, '_blank')}>Abrir XML</button>
            </div>
          </div>
        ))}
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



