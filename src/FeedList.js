import React, { useEffect, useState } from 'react';
import { API_BASE, apiFetch } from './api';

export default function FeedList({ onSelectFeed }) {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(API_BASE + '/feeds')
      .then(res => res.json())
      .then(data => {
        setFeeds(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando feeds...</div>;

  return (
    <div>
      <h2>Feeds cadastrados</h2>
      <ul>
        {feeds.map(feed => (
          <li key={feed.id}>
            <button onClick={() => onSelectFeed(feed)}>{feed.name}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}


