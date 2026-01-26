import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'rss-highlights';
const HighlightContext = createContext();

function generateId() {
  return `hl-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function HighlightProvider({ children }) {
  const [highlights, setHighlights] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(highlights.slice(0, 1000)));
    } catch (e) {
      // ignore
    }
  }, [highlights]);

  const addHighlight = (payload) => {
    const next = {
      id: generateId(),
      text: payload.text || '',
      color: payload.color || '#3478f6',
      page: payload.page || window.location.pathname,
      cardId: payload.cardId || '',
      cardTitle: payload.cardTitle || '',
      cardUrl: payload.cardUrl || '',
      createdAt: payload.createdAt || new Date().toISOString()
    };
    setHighlights((prev) => [next, ...prev]);
    return next;
  };

  const removeHighlight = (id) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const clearHighlightsForCard = (cardId) => {
    if (!cardId) return;
    setHighlights((prev) => prev.filter((h) => h.cardId !== cardId));
  };

  const value = useMemo(() => ({
    highlights,
    addHighlight,
    removeHighlight,
    clearHighlightsForCard
  }), [highlights]);

  return (
    <HighlightContext.Provider value={value}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlights() {
  return useContext(HighlightContext);
}
