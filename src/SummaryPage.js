import React, { useEffect, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './SummaryPage.css';

const CACHE_KEY = 'rss-summary-cache';
const PREVIEW_CACHE_KEY = 'rss-summary-preview-cache';
const CACHE_TTL_MS = 2 * 60 * 1000;

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, updatedAt: Date.now() }));
  } catch (e) {
    // ignore
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(d);
}

export default function SummaryPage() {
  const [summary, setSummary] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = (force = false) => {
    const cached = readCache(CACHE_KEY);
    if (!force && cached && (Date.now() - cached.updatedAt) < CACHE_TTL_MS) {
      setSummary(cached.data);
      setLoading(false);
      return;
    }
    setRefreshing(true);
    setError('');
    apiFetch(API_BASE + '/summary/latest')
      .then(res => res.json())
      .then(data => {
        setSummary(data);
        writeCache(CACHE_KEY, data);
        setLoading(false);
      })
      .catch(() => {
        setError('N?o foi poss?vel carregar o resumo di?rio.');
        setLoading(false);
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  const fetchPreview = (force = false) => {
    const cached = readCache(PREVIEW_CACHE_KEY);
    if (!force && cached && (Date.now() - cached.updatedAt) < CACHE_TTL_MS) {
      setPreview(cached.data);
      return;
    }
    apiFetch(API_BASE + '/summary/preview')
      .then(res => res.json())
      .then(data => {
        setPreview(data);
        writeCache(PREVIEW_CACHE_KEY, data);
      })
      .catch(() => {
        setPreview({ ok: false });
      });
  };

  useEffect(() => {
    const cached = readCache(CACHE_KEY);
    if (cached) {
      setSummary(cached.data);
      setLoading(false);
    }
    fetchSummary();
  }, []);

  useEffect(() => {
    if (!summary && !loading && !error) {
      fetchPreview();
    }
  }, [summary, loading, error]);

  if (loading) return <div className="summary-loading">Carregando resumo...</div>;

  return (
    <div className="summary-page">
      <div className="summary-header">
        <div>
          <h2>Resumo diário</h2>
          <p>Seleção automática das principais notícias do dia.</p>
        </div>
        <div className="summary-refresh-row">
          {refreshing && <span className="summary-refreshing">Atualizando...</span>}
          <button className="summary-refresh" onClick={() => fetchSummary(true)}>Atualizar</button>
        </div>
      </div>
      {error && <div className="summary-error">{error}</div>}
      {!summary && !error && (
        <>
          <div className="summary-empty">Nenhum resumo disponível ainda.</div>
          {!preview && <div className="summary-loading">Carregando preview...</div>}
          {preview && preview.ok && (
            <div className="summary-card">
              <div className="summary-meta">Preview do dia</div>
              <ol className="summary-list">
                {(preview.items || []).map((item, idx) => (
                  <li key={`${item.link}-${idx}`} className="summary-item">
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                    <div className="summary-source">
                      {item.feedName} • {formatDateTime(item.pubDate || item.isoDate)}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
      {summary && (
        <div className="summary-card">
          <div className="summary-meta">
            <span>Gerado em {formatDateTime(summary.generatedAt)}</span>
          </div>
          <ol className="summary-list">
            {(summary.items || []).map((item, idx) => (
              <li key={`${item.link}-${idx}`} className="summary-item">
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
                <div className="summary-source">
                  {item.feedName} • {formatDateTime(item.pubDate || item.isoDate)}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}


