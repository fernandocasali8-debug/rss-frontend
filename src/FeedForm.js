import React, { useState } from 'react';
import { API_BASE, apiFetch } from './api';

export default function FeedForm({ onFeedAdded }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRss, setAutoRss] = useState(false);
  const [language, setLanguage] = useState('pt');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const feedUrl = autoRss
        ? `${API_BASE}/rss?url=${encodeURIComponent(url)}`
        : url;
      const res = await apiFetch(API_BASE + '/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url: feedUrl, language })
      });
      if (!res.ok) throw new Error('Erro ao adicionar feed');
      setName('');
      setUrl('');
      setLanguage('pt');
      onFeedAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="feed-form" onSubmit={handleSubmit}>
      <h2 className="feed-form-title">Adicionar novo feed</h2>
      <div className="feed-field">
        <label className="feed-label">Nome do feed</label>
        <input
          className="feed-input"
          type="text"
          placeholder="Ex: Notícias"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>
      <div className="feed-field">
        <label className="feed-label">{autoRss ? 'URL do site' : 'URL do feed RSS'}</label>
        <input
          className="feed-input"
          type="url"
          placeholder={autoRss ? 'https://www.exemplo.com' : 'https://'}
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
        <span className="feed-help">
          {autoRss
            ? 'O sistema vai gerar um RSS automaticamente a partir do site.'
            : 'Cole o endereço do RSS se o site já fornecer.'}
        </span>
      </div>

      <div className="feed-field">
        <label className="feed-label">Idioma do conteudo</label>
        <select
          className="feed-input"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="pt">Portugues (nao traduzir)</option>
          <option value="auto">Outro idioma (auto detectar e traduzir para PT)</option>
        </select>
        <span className="feed-help">Use "Outro idioma" para traduzir automaticamente com IA.</span>
      </div>
      <label className="feed-toggle">
        <input
          type="checkbox"
          checked={autoRss}
          onChange={(e) => setAutoRss(e.target.checked)}
        />
        Gerar RSS automaticamente a partir do site
      </label>
      <button className="feed-submit" type="submit" disabled={loading}>Adicionar</button>
      {error && <div className="feed-error">{error}</div>}
    </form>
  );
}


