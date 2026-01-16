import React, { useEffect, useState } from 'react';
import { API_BASE, apiFetch } from './api';

const BRT_TIMEZONE = 'America/Sao_Paulo';

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BRT_TIMEZONE
  }).format(d);
}

export default function FeedItems({ feed }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!feed) return;
    setLoading(true);
    apiFetch(API_BASE + '/aggregate')
      .then(res => res.json())
      .then(data => {
        setItems(data.filter(item => item.feedUrl === feed.url));
        setLoading(false);
      });
  }, [feed]);

  if (!feed) return <div>Selecione um feed para ver os itens.</div>;
  if (loading) return <div>Carregando itens...</div>;

  return (
    <div>
      <h3>Itens do feed: {feed.name}</h3>
      <ul>
        {items.map((item, idx) => (
          <li key={idx}>
            <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
            <div><small>{formatDateTime(item.pubDate || item.isoDate)}</small></div>
          </li>
        ))}
      </ul>
    </div>
  );
}


