import React, { useState } from 'react';
import './XGeneratorPage.css';
import { API_BASE, apiFetch } from './api';

const buildRequestUrl = (value) => {
  const params = new URLSearchParams();
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    params.set('url', trimmed);
  } else {
    params.set('user', trimmed);
  }
  return `${API_BASE}/x/rss?${params.toString()}`;
};

export default function XGeneratorPage() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [feedUrl, setFeedUrl] = useState('');

  const handleGenerate = async (event) => {
    event.preventDefault();
    const requestUrl = buildRequestUrl(input);
    if (!requestUrl) {
      setStatus('error');
      setMessage('Informe um @usuario ou URL do perfil.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await apiFetch(requestUrl);
      const body = await res.text();
      if (!res.ok || !body) {
        let errorMessage = 'Falha ao gerar RSS.';
        try {
          const parsed = JSON.parse(body || '{}');
          if (parsed && parsed.error) {
            errorMessage = parsed.error;
          }
        } catch (err) {
          // ignore parse errors
        }
        throw new Error(errorMessage);
      }
      if (body.trim().startsWith('{')) {
        let errorMessage = '';
        try {
          const parsed = JSON.parse(body || '{}');
          if (parsed && parsed.error) {
            errorMessage = parsed.error;
          }
        } catch (err) {
          // ignore parse errors
        }
        if (errorMessage) {
          throw new Error(errorMessage);
        }
      }
      setFeedUrl(requestUrl);
      setStatus('success');
      setMessage('RSS gerado com sucesso.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Falha ao gerar RSS.');
    }
  };

  const handleCopy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setMessage('Link copiado para a area de transferencia.');
      setStatus('success');
    } catch (err) {
      setMessage('Nao foi possivel copiar o link.');
      setStatus('error');
    }
  };

  const handleOpen = () => {
    if (!feedUrl) return;
    window.open(feedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    setInput('');
    setFeedUrl('');
    setStatus('idle');
    setMessage('');
  };

  return (
    <div className="xgen-page">
      <div className="xgen-card">
        <div className="xgen-header">
          <div>
            <div className="xgen-title">Gerador RSS para X.com</div>
            <div className="xgen-subtitle">
              RSS indireto para testes. Aceita @usuario ou URL completa do perfil.
            </div>
          </div>
          <span className="xgen-badge">LABS</span>
        </div>

        <form className="xgen-form" onSubmit={handleGenerate}>
          <input
            className="xgen-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="@usuario ou https://x.com/usuario"
          />
          <div className="xgen-actions">
            <button type="submit" className="xgen-button primary" disabled={status === 'loading'}>
              {status === 'loading' ? 'Gerando...' : 'Gerar RSS'}
            </button>
            <button type="button" className="xgen-button secondary" onClick={handleOpen} disabled={!feedUrl}>
              Abrir RSS
            </button>
            <button type="button" className="xgen-button secondary" onClick={handleCopy} disabled={!feedUrl}>
              Copiar link
            </button>
            <button type="button" className="xgen-button secondary" onClick={handleReset}>
              Limpar
            </button>
          </div>
        </form>

        {message && (
          <div className={`xgen-status ${status === 'error' ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {feedUrl && (
          <div className="xgen-output">
            {feedUrl}
          </div>
        )}

        <div className="xgen-footer">
          Este recurso usa uma fonte indireta e pode ficar indisponivel se o provedor externo limitar acesso.
        </div>
      </div>
    </div>
  );
}
