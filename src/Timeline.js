import React, { useEffect, useState } from 'react';
import './Timeline.css';
import { API_BASE, apiFetch } from './api';
import fallbackFavicon from './fallback-favicon.svg';
/* eslint-disable react-hooks/exhaustive-deps */

const REFRESH_MS = 60000;
const RETRY_MS = 15000;
const INITIAL_BATCH = 10;
const BATCH_STEP = 10;
const BATCH_DELAY_MS = 200;
const VISIBLE_CAP = 80;
const BRT_TIMEZONE = 'America/Sao_Paulo';
const promoItems = [
  {
    title: 'Monitoramento rapido de noticias em tempo real',
    feedName: 'Radar de Noticias',
    contentSnippet: 'Acompanhe os temas que importam com alertas e resumos prontos.',
    tags: ['alertas', 'tempo real', 'resumo']
  },
  {
    title: 'Painel com sinais de tendencia para decisao rapida',
    feedName: 'Radar de Noticias',
    contentSnippet: 'Indicadores de impacto, fontes relevantes e curadoria inteligente.',
    tags: ['tendencias', 'curadoria', 'impacto']
  },
  {
    title: 'Colecao de noticias salvas para seu time',
    feedName: 'Radar de Noticias',
    contentSnippet: 'Organize por assunto, marque e compartilhe com facilidade.',
    tags: ['salvos', 'time', 'organizacao']
  }
];
function formatHour(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BRT_TIMEZONE
  }).format(d);
}

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

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getDateKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BRT_TIMEZONE
  }).format(d);
}

function getHourKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    timeZone: BRT_TIMEZONE
  }).format(d);
}

function shortenTitle(title, max = 40) {
  if (!title) return '';
  return title.length > max ? title.slice(0, max - 3) + '...' : title;
}


function getFaviconUrl(url) {
  if (!url) return '';
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch (e) {
    return '';
  }
}

function handleFaviconError(event) {
  if (!event?.currentTarget || event.currentTarget.dataset.fallbackApplied) return;
  event.currentTarget.dataset.fallbackApplied = '1';
  event.currentTarget.src = fallbackFavicon;
}

function getItemId(item) {
  return item.link || item.guid || item.id || item.title || '';
}

  function normalizeSavedItem(item) {
    return {
      id: getItemId(item),
      title: item.title || '',
      link: item.link || '',
      feedName: item.feedName || '',
      contentSnippet: item.contentSnippet || '',
      pubDate: item.pubDate || '',
      isoDate: item.isoDate || '',
      source: 'timeline'
    };
  }

export default function Timeline() {
  const [posts, setPosts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [progressiveLoading, setProgressiveLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [countdown, setCountdown] = useState(Math.ceil(REFRESH_MS / 1000));
  const nextRefreshRef = React.useRef(Date.now() + REFRESH_MS);
  const [savedItems, setSavedItems] = useState([]);
  const [savingIds, setSavingIds] = useState([]);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('two');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedHour, setSelectedHour] = useState('all');
  const refreshAllowed = selectedHour === 'all';
  const [aiModalItem, setAiModalItem] = useState(null);
  const [aiText, setAiText] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [aiAutoTags, setAiAutoTags] = useState(true);
  const [aiAutoDetectTags, setAiAutoDetectTags] = useState(false);
  const [aiTagCount, setAiTagCount] = useState(3);
  const [aiTagSource, setAiTagSource] = useState('local');
  const [aiSuggestedTags, setAiSuggestedTags] = useState([]);
  const [aiTagLoading, setAiTagLoading] = useState(false);
  const [aiTagError, setAiTagError] = useState('');
  const [aiAutoTruncate, setAiAutoTruncate] = useState(true);
  const [aiIncludeEmojis, setAiIncludeEmojis] = useState(false);
  const [aiIncludeTitle, setAiIncludeTitle] = useState(false);
  const [aiFixedTags, setAiFixedTags] = useState('');
  const [aiTags, setAiTags] = useState([]);
  const [aiImageQuery, setAiImageQuery] = useState('');
  const [aiImages, setAiImages] = useState([]);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiImageError, setAiImageError] = useState('');
  const [aiSelectedImage, setAiSelectedImage] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiKeywords, setAiKeywords] = useState([]);
  const [aiThemes, setAiThemes] = useState([]);
  const [aiKeyLoading, setAiKeyLoading] = useState(false);
  const [aiKeyError, setAiKeyError] = useState('');
  const [youtubeModalItem, setYoutubeModalItem] = useState(null);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const [factModalItem, setFactModalItem] = useState(null);
  const [factClaims, setFactClaims] = useState([]);
  const [factLoading, setFactLoading] = useState(false);
  const [factError, setFactError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [readIds, setReadIds] = useState([]);
  const [hiddenFeeds, setHiddenFeeds] = useState([]);
  const [manualTags, setManualTags] = useState({});
  const [tagModalItem, setTagModalItem] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [siteSlug] = useState('');

  const getManualTags = React.useCallback((item) => {
    const id = getItemId(item);
    return manualTags[id] || [];
  }, [manualTags]);

  const getItemTags = React.useCallback((item) => Array.from(
    new Set([...(item.tags || []), ...getManualTags(item)])
  ), [getManualTags]);

  const flashMessage = React.useCallback((text) => {
    setActionMessage(text);
    setTimeout(() => setActionMessage(''), 2500);
  }, []);

  const closeFactModal = () => {
    setFactModalItem(null);
    setFactClaims([]);
    setFactLoading(false);
    setFactError('');
  };

  const openFactModal = React.useCallback(async (item) => {
    if (!item) return;
    setFactModalItem(item);
    setFactClaims([]);
    setFactError('');
    setFactLoading(true);
    try {
      const query = encodeURIComponent(item.title || '');
      const res = await apiFetch(`${API_BASE}/factcheck/search?query=${query}`);
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || 'Falha ao buscar checagem.');
      }
      setFactClaims(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setFactError(err.message || 'Falha ao buscar checagem.');
      setFactClaims([]);
    } finally {
      setFactLoading(false);
    }
  }, []);

  const isSaved = React.useCallback((item) => {
    const id = getItemId(item);
    return savedItems.some(saved => saved.id === id);
  }, [savedItems]);

  const isRead = React.useCallback((item) => readIds.includes(getItemId(item)), [readIds]);

  const isFeedHidden = React.useCallback((item) => hiddenFeeds.includes(item.feedName), [hiddenFeeds]);

  const handleCloseNotif = (idx) => {
    setNotifications(n => n.filter((_, i) => i !== idx));
  };

  const closeAiModal = () => {
    setAiModalItem(null);
    setAiText('');
    setAiDraft('');
    setAiError('');
    setAiLoading(false);
    setAiLoadingId(null);
    setAiAutoTags(true);
    setAiAutoDetectTags(false);
    setAiTagCount(3);
    setAiTagSource('local');
    setAiSuggestedTags([]);
    setAiTagLoading(false);
    setAiTagError('');
    setAiAutoTruncate(true);
    setAiIncludeEmojis(false);
    setAiIncludeTitle(false);
    setAiFixedTags('');
    setAiTags([]);
    setAiImageQuery('');
    setAiImages([]);
    setAiImageError('');
    setAiImageLoading(false);
    setAiSelectedImage(null);
  };

  const handleCopyAi = async () => {
    if (!aiDraft) return;
    try {
      await navigator.clipboard.writeText(aiDraft);
    } catch (err) {
      // ignore
    }
  };

  const closeYoutubeModal = () => {
    setYoutubeModalItem(null);
    setYoutubeVideos([]);
    setYoutubeError('');
    setYoutubeLoading(false);
  };

  const openYoutubeModal = React.useCallback(async (item) => {
    if (!item) return;
    setYoutubeModalItem(item);
    setYoutubeVideos([]);
    setYoutubeError('');
    setYoutubeLoading(true);
    try {
      const query = encodeURIComponent(item.title || '');
      const res = await apiFetch(`${API_BASE}/youtube/search?query=${query}`);
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || 'Falha ao buscar videos.');
      }
      setYoutubeVideos(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setYoutubeVideos([]);
      setYoutubeError(err.message || 'Falha ao buscar videos.');
    } finally {
      setYoutubeLoading(false);
    }
  }, []);

  const buildAutoTagList = (text, tags, useTags, useDetectTags, tagCount) => {
    const baseText = text || '';
    const maxTags = Math.min(5, Math.max(1, Number(tagCount) || 3));
    const collected = [];
    if (useDetectTags && baseText) {
      const stopwords = new Set([
        'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na',
        'nos', 'nas', 'por', 'para', 'com', 'sem', 'sobre', 'que', 'e', 'ou', 'se', 'ao', 'aos', 'ao', 'a',
        'nao', 'nÃƒÂ£o', 'mais', 'menos', 'muito', 'muita', 'muitos', 'muitas', 'ja', 'jÃƒÂ¡', 'ser', 'sao', 'sÃƒÂ£o',
        'foi', 'era', 'estÃƒÂ¡', 'esta', 'estao', 'estÃƒÂ£o', 'tem', 'tÃƒÂªm', 'ter', 'vai', 'vao', 'vÃƒÂ£o', 'como'
      ]);
      const words = baseText
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[#@]/g, '')
        .split(/[^\\p{L}\\p{N}]+/u)
        .filter(word => word.length >= 4 && !stopwords.has(word));
      for (const word of words) {
        const clean = word.replace(/\s+/g, '');
        if (!clean || collected.includes(clean)) continue;
        collected.push(clean);
        if (collected.length >= maxTags) break;
      }
    }
    if (useTags && tags.length && collected.length < maxTags) {
      for (const tag of tags) {
        const clean = String(tag || '').replace(/\s+/g, '');
        if (!clean || collected.includes(clean)) continue;
        collected.push(clean);
        if (collected.length >= maxTags) break;
      }
    }
    return collected.slice(0, maxTags);
  };

  const normalizeAiTitle = React.useCallback((value) => {
    return String(value || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }, []);

  const applyTitlePreference = React.useCallback((text, title, includeTitle) => {
    if (!text) return text;
    const normalizedTitle = normalizeAiTitle(title);
    if (!normalizedTitle) return text;
    if (includeTitle) {
      return text;
    }
    const lines = String(text).split(/\r?\n/);
    if (!lines.length) return text;
    if (normalizeAiTitle(lines[0]) !== normalizedTitle) return text;
    let rest = lines.slice(1);
    while (rest.length && !rest[0].trim()) {
      rest = rest.slice(1);
    }
    return rest.join('\n').trim();
  }, [normalizeAiTitle]);

  const applyAutoTagsToDraft = React.useCallback((text) => {
    if (!text) return text;
    if (!aiAutoTags && !aiAutoDetectTags) return text;
    const autoTags = buildAutoTagList(text, aiTags, aiAutoTags, aiAutoDetectTags, aiTagCount);
    if (!autoTags.length) return text;
    const hashTags = autoTags.map(tag => `#${tag}`).join(' ');
    if (text.includes(hashTags)) return text;
    return `${text.trim()}\n\n${hashTags}`.trim();
  }, [aiTags, aiAutoTags, aiAutoDetectTags, aiTagCount]);

  const applySuggestedTagsToDraft = React.useCallback((text, tags) => {
    if (!text || !tags.length) return text;
    const hashTags = tags.map(tag => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ');
    if (text.includes(hashTags)) return text;
    return `${text.trim()}\n\n${hashTags}`.trim();
  }, []);

  const handleRewrite = React.useCallback(async (item, mode = 'default') => {
    if (!item) return;
    const id = getItemId(item);
    setAiModalItem(item);
    setAiTags(getItemTags(item));
    setAiText('');
    setAiDraft('');
    setAiImageQuery(item.title || '');
    setAiImages([]);
    setAiImageError('');
    setAiImageLoading(false);
    setAiSelectedImage(null);
    setAiTagSource('local');
    setAiSuggestedTags([]);
    setAiTagError('');
    setAiTagLoading(false);
    setAiError('');
    setAiLoading(true);
    setAiLoadingId(id);
    try {
      const res = await apiFetch(API_BASE + '/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title || '',
          contentSnippet: item.contentSnippet || '',
          link: item.link || '',
          feedName: item.feedName || '',
          mode,
          includeEmojis: aiIncludeEmojis,
          includeTitle: aiIncludeTitle
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const message = data.message || 'Falha ao gerar texto.';
        throw new Error(message);
      }
      const text = data.text || '';
      const withTitle = applyTitlePreference(text, item.title || '', aiIncludeTitle);
      setAiText(withTitle);
      setAiDraft(applyAutoTagsToDraft(withTitle));
    } catch (err) {
      setAiError(err.message || 'Falha ao gerar texto.');
      flashMessage(err.message || 'Falha ao gerar texto.');
    } finally {
      setAiLoading(false);
      setAiLoadingId(null);
    }
  }, [aiIncludeEmojis, aiIncludeTitle, applyAutoTagsToDraft, applyTitlePreference, flashMessage, getItemTags]);

  const buildSocialText = React.useCallback((text, tags, useTags, useDetectTags, tagCount, fixedTags, useTruncate) => {
    let composed = text || '';
    const autoTags = buildAutoTagList(composed, tags, useTags, useDetectTags, tagCount);
    if (autoTags.length) {
      const hashTags = autoTags.map(tag => `#${tag}`).join(' ');
      if (!composed.includes(hashTags)) {
        composed = `${composed} ${hashTags}`.trim();
      }
    }
    if (fixedTags.trim()) {
      const fixed = fixedTags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => (tag.startsWith('#') ? tag : `#${tag}`))
        .join(' ');
      if (fixed && !composed.includes(fixed)) {
        composed = `${composed} ${fixed}`.trim();
      }
    }
    if (useTruncate && composed.length > 280) {
      composed = `${composed.slice(0, 277)}...`;
    }
    return composed.trim();
  }, []);

  const previewText = React.useMemo(
    () => buildSocialText(aiText, aiTags, aiAutoTags, aiAutoDetectTags, aiTagCount, aiFixedTags, aiAutoTruncate),
    [aiText, aiTags, aiAutoTags, aiAutoDetectTags, aiTagCount, aiFixedTags, aiAutoTruncate, buildSocialText]
  );

  useEffect(() => {
    if (!aiModalItem) return undefined;
    const timer = setTimeout(() => {
      setAiText(aiDraft);
    }, 150);
    return () => clearTimeout(timer);
  }, [aiDraft, aiModalItem]);

  useEffect(() => {
    if (!aiModalItem || !aiDraft) return;
    const updated = applyTitlePreference(aiDraft, aiModalItem.title || '', aiIncludeTitle);
    if (updated !== aiDraft) {
      setAiDraft(updated);
    }
  }, [aiIncludeTitle, aiModalItem, aiDraft, applyTitlePreference]);

  useEffect(() => {
    if (!aiModalItem) return;
    if (!aiDraft) return;
    if (!aiAutoTags && !aiAutoDetectTags) return;
    const next = applyAutoTagsToDraft(aiDraft);
    if (next !== aiDraft) {
      setAiDraft(next);
    }
  }, [aiAutoTags, aiAutoDetectTags, aiTagCount, aiModalItem, aiDraft, applyAutoTagsToDraft]);

  const handleCopyPreview = async () => {
    if (!previewText) return;
    try {
      await navigator.clipboard.writeText(previewText);
      flashMessage('Preview copiado.');
    } catch (err) {
      flashMessage('Nao foi possivel copiar o preview.');
    }
  };

  const handleOpenTwitter = () => {
    if (!previewText) return;
    const text = encodeURIComponent(previewText);
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleGenerateHashtags = React.useCallback(async () => {
    const baseText = aiDraft || aiModalItem?.title || '';
    if (!baseText) {
      setAiTagError('Informe ou gere um texto antes.');
      return;
    }
    setAiTagLoading(true);
    setAiTagError('');
    try {
      if (aiTagSource === 'ai') {
        const res = await apiFetch(API_BASE + '/ai/hashtags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: baseText,
            maxTags: aiTagCount
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.message || 'Falha ao gerar hashtags.');
        }
        setAiSuggestedTags(Array.isArray(data.tags) ? data.tags : []);
        return;
      }
      const localTags = buildAutoTagList(baseText, aiTags, true, true, aiTagCount);
      setAiSuggestedTags(localTags);
    } catch (err) {
      setAiTagError(err.message || 'Falha ao gerar hashtags.');
    } finally {
      setAiTagLoading(false);
    }
  }, [aiDraft, aiModalItem, aiTagSource, aiTagCount, aiTags]);

  const handleUseSuggestedTags = () => {
    if (!aiSuggestedTags.length) return;
    const merged = aiSuggestedTags
      .map(tag => (tag.startsWith('#') ? tag : `#${tag}`))
      .join(', ');
    setAiFixedTags(merged);
    setAiDraft(text => applySuggestedTagsToDraft(text, aiSuggestedTags));
  };

  const handleImageSearch = React.useCallback(async (query, autoSelect = false) => {
    const term = String(query || '').trim();
    if (!term) {
      setAiImageError('Informe um termo para buscar imagens.');
      return;
    }
    setAiImageLoading(true);
    setAiImageError('');
    setAiImages([]);
    try {
      const res = await apiFetch(`${API_BASE}/images/search?query=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Falha ao buscar imagens.');
      }
      const items = Array.isArray(data.items) ? data.items : [];
      setAiImages(items);
      if (autoSelect && items[0]) {
        setAiSelectedImage(items[0]);
      }
    } catch (err) {
      setAiImageError(err.message || 'Falha ao buscar imagens.');
    } finally {
      setAiImageLoading(false);
    }
  }, []);

  const handleCopyImageLink = async () => {
    if (!aiSelectedImage?.regularUrl) return;
    try {
      await navigator.clipboard.writeText(aiSelectedImage.regularUrl);
      flashMessage('Link da imagem copiado.');
    } catch (err) {
      flashMessage('Nao foi possivel copiar o link.');
    }
  };

  const handleOpenImage = () => {
    if (!aiSelectedImage?.regularUrl) return;
    window.open(aiSelectedImage.regularUrl, '_blank', 'noopener,noreferrer');
  };

  const fetchPosts = (force = false) => {
    if (!force && !refreshAllowed) {
      nextRefreshRef.current = Date.now() + REFRESH_MS;
      setCountdown(Math.ceil(REFRESH_MS / 1000));
      return;
    }
    nextRefreshRef.current = Date.now() + REFRESH_MS;
    setCountdown(Math.ceil(REFRESH_MS / 1000));
    apiFetch(API_BASE + '/aggregate')
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data)) {
          if (res.status === 401) {
            setAccessRestricted(true);
          }
          nextRefreshRef.current = Date.now() + RETRY_MS;
          setCountdown(Math.ceil(RETRY_MS / 1000));
          setProgressiveLoading(false);
          setLoading(false);
          return [];
        }
        setAccessRestricted(false);
        return data;
      })
      .then(data => {
        if (!Array.isArray(data)) return;
        const todayKey = getDateKey(Date.now());
        let merged = data;
        setPosts(prev => {
          const seen = new Set();
          merged = [...data, ...prev].filter(item => {
            const id = getItemId(item);
            if (!id || seen.has(id)) return false;
            const itemDateKey = getDateKey(item.pubDate || item.isoDate);
            if (itemDateKey !== todayKey) return false;
            seen.add(id);
            return true;
          });
          if (prev.length > 0 && merged.length > 0 && merged[0].link !== prev[0].link) {
            setNotifications(n => [
              {
                title: shortenTitle(merged[0].title),
                hour: formatHour(merged[0].pubDate || merged[0].isoDate),
                link: merged[0].link
              },
              ...n.slice(0, 2)
            ]);
          }
          return merged;
        });
        try {
          localStorage.setItem('rss-posts-cache', JSON.stringify((merged || data).slice(0, 200)));
        } catch (e) {
          // ignore
        }
        const mergedLength = (merged || data).length;
        const capped = Math.min(VISIBLE_CAP, mergedLength);
        const nextVisible = Math.min(Math.max(visibleCount, INITIAL_BATCH), capped);
        setVisibleCount(nextVisible);
        setProgressiveLoading(mergedLength > nextVisible);
        setLoading(false);
      })
      .catch(() => {
        setAccessRestricted(false);
        setProgressiveLoading(false);
        setLoading(false);
        nextRefreshRef.current = Date.now() + RETRY_MS;
        setCountdown(Math.ceil(RETRY_MS / 1000));
      });
  };

  useEffect(() => {
    const cached = localStorage.getItem('rss-posts-cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) {
          setPosts(parsed);
          const capped = Math.min(VISIBLE_CAP, parsed.length);
          setVisibleCount(capped);
          setProgressiveLoading(parsed.length > capped);
          setLoading(false);
        }
      } catch (e) {
        // ignore
      }
    }
    fetchPosts();
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextRefreshRef.current - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        fetchPosts();
      }
    }, 1000);
    const onFocus = () => {
      if (Date.now() >= nextRefreshRef.current) {
        fetchPosts();
      }
    };
    const onVisible = () => {
      if (!document.hidden && Date.now() >= nextRefreshRef.current) {
        fetchPosts();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    const storedView = localStorage.getItem('rss-timeline-view');
    if (storedView === 'list' || storedView === 'two' || storedView === 'three') {
      setViewMode(storedView);
    }
  }, []);

  useEffect(() => {
    if (!progressiveLoading) return undefined;
    if (visibleCount >= posts.length) {
      setProgressiveLoading(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setVisibleCount(count => Math.min(count + BATCH_STEP, posts.length));
    }, BATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [progressiveLoading, visibleCount, posts.length]);

  useEffect(() => {
    if (selectedHour === "all") {
      fetchPosts(true);
    }
  }, [selectedHour]);

  useEffect(() => {
    const storedRead = localStorage.getItem('rss-read-items');
    const storedHidden = localStorage.getItem('rss-hidden-feeds');
    const storedManualTags = localStorage.getItem('rss-manual-tags');
    if (storedRead) {
      try {
        setReadIds(JSON.parse(storedRead));
      } catch (e) {
        // ignore
      }
    }
    if (storedHidden) {
      try {
        setHiddenFeeds(JSON.parse(storedHidden));
      } catch (e) {
        // ignore
      }
    }
    if (storedManualTags) {
      try {
        setManualTags(JSON.parse(storedManualTags));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rss-read-items', JSON.stringify(readIds));
  }, [readIds]);

  useEffect(() => {
    localStorage.setItem('rss-hidden-feeds', JSON.stringify(hiddenFeeds));
  }, [hiddenFeeds]);

  useEffect(() => {
    localStorage.setItem('rss-manual-tags', JSON.stringify(manualTags));
  }, [manualTags]);

  useEffect(() => {
    localStorage.setItem('rss-timeline-view', viewMode);
  }, [viewMode]);

  const matchesQuery = React.useCallback((item) => {
    if (!query.trim()) return true;
    const haystack = [
      item.title,
      item.contentSnippet,
      item.feedName,
      ...(getItemTags(item) || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return tokens.every(token => haystack.includes(token));
  }, [query, getItemTags]);

  const filteredPosts = React.useMemo(() => (
    posts
      .filter(item => !isFeedHidden(item))
      .filter(matchesQuery)
      .filter(item => {
        if (selectedSource === 'all') return true;
        return item.feedName === selectedSource;
      })
      .filter(item => {
        if (selectedHour === 'all') return true;
        return getHourKey(item.pubDate || item.isoDate) === selectedHour;
      })
      .filter(item => {
        if (selectedTag === 'all') return true;
        return getItemTags(item).includes(selectedTag);
      })
      .filter(item => {
        const itemDate = getDateKey(item.pubDate || item.isoDate);
        if (!itemDate) return false;
        const today = getDateKey(Date.now());
        return itemDate === today;
      })
  ), [posts, isFeedHidden, matchesQuery, selectedSource, selectedTag, getItemTags, selectedHour]);

  const availableTags = React.useMemo(() => Array.from(
    new Set(
      posts
        .filter(item => !isFeedHidden(item))
        .flatMap(item => getItemTags(item))
    )
  ), [posts, isFeedHidden, getItemTags]);

  const visiblePosts = React.useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount]
  );

  const availableSources = React.useMemo(
    () => Array.from(new Set(posts.map(item => item.feedName).filter(Boolean))).sort(),
    [posts]
  );

  const currentBrtHour = React.useMemo(() => {
    const h = Number(
      new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', timeZone: BRT_TIMEZONE }).format(Date.now())
    );
    return Number.isFinite(h) ? h : 23;
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const availableHours = React.useMemo(() => {
    const map = new Map();
    const todayKey = getDateKey(Date.now());
    posts.forEach(item => {
      const itemDateKey = getDateKey(item.pubDate || item.isoDate);
      if (itemDateKey !== todayKey) return;
      const h = getHourKey(item.pubDate || item.isoDate);
      if (!h) return;
      map.set(h, (map.get(h) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => Number(b[0].slice(0, 2)) - Number(a[0].slice(0, 2)))
      .map(([hour, count]) => ({ hour, count }));
  }, [posts]);

  const hoursProgress = React.useMemo(() => {
    const elapsed = Math.max(1, currentBrtHour + 1);
    const loaded = Math.max(0, availableHours.length);
    const pct = Math.round((loaded / elapsed) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [availableHours, currentBrtHour]);

  const stopwords = React.useMemo(() => new Set([
    'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'em',
    'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sobre', 'que', 'e', 'ou', 'se',
    'ao', 'aos', 'ao', 'a', 'nao', 'não', 'mais', 'menos', 'muito', 'muita', 'muitos', 'muitas',
    'ja', 'já', 'ser', 'sao', 'são', 'foi', 'era', 'esta', 'está', 'estao', 'estão', 'tem', 'têm',
    'ter', 'vai', 'vao', 'vão', 'como', 'onde', 'quando', 'qual', 'quais', 'seu', 'sua', 'seus',
    'suas', 'isso', 'isto', 'aquele', 'aquela', 'aqueles', 'aquelas', 'entre', 'sobre', 'pelas',
    'pelos', 'pela', 'pelo'
  ]), []);

  const topWords = React.useMemo(() => {
    const counts = new Map();
    filteredPosts.forEach(item => {
      const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
      text
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[#@]/g, '')
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .forEach(word => {
          const w = word.trim();
          if (w.length < 4) return;
          if (stopwords.has(w)) return;
          counts.set(w, (counts.get(w) || 0) + 1);
        });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }, [filteredPosts, stopwords]);

  const topTags = React.useMemo(() => {
    const counts = new Map();
    filteredPosts.forEach(item => {
      getItemTags(item).forEach(tag => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
  }, [filteredPosts, getItemTags]);

  // IA para palavras-chave e temas recorrentes
  useEffect(() => {
    const controller = new AbortController();
    if (!filteredPosts.length) {
      setAiKeywords([]);
      setAiThemes([]);
      setAiKeyLoading(false);
      setAiKeyError('');
      return () => controller.abort();
    }
    const timer = setTimeout(async () => {
      try {
        setAiKeyLoading(true);
        setAiKeyError('');
        const sample = filteredPosts
          .slice(0, 30)
          .map(item => `${item.title || ''} - ${item.contentSnippet || ''}`)
          .join('\n')
          .slice(0, 4000);
        const res = await apiFetch(API_BASE + '/ai/hashtags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sample, maxTags: 12 }),
          signal: controller.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false || !Array.isArray(data.tags)) {
          throw new Error(data.message || 'Falha ao extrair palavras-chave.');
        }
        const uniq = Array.from(new Set(data.tags.map(t => String(t || '').trim()).filter(Boolean)));
        setAiKeywords(uniq);
        setAiThemes(uniq);
      } catch (err) {
        if (controller.signal.aborted) return;
        setAiKeyError(err.message || 'Falha ao extrair palavras-chave.');
        setAiKeywords([]);
        setAiThemes([]);
      } finally {
        if (!controller.signal.aborted) setAiKeyLoading(false);
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filteredPosts]);

  const displayKeywords = aiKeywords.length
    ? aiKeywords.map(word => ({ word, count: null }))
    : topWords;

  const displayThemes = aiThemes.length
    ? aiThemes.map(tag => ({ tag, count: null }))
    : topTags;

  const handleSaveToggle = React.useCallback(async (item) => {
    const id = getItemId(item);
    if (!id) return;
    setSavingIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    if (isSaved(item)) {
      try {
        await apiFetch(`${API_BASE}/saved/${encodeURIComponent(id)}`, { method: 'DELETE' });
        setSavedItems(prev => prev.filter(saved => saved.id !== id));
      } finally {
        setSavingIds(prev => prev.filter(savedId => savedId !== id));
      }
      return;
    }

    try {
      const payload = normalizeSavedItem(item);
      const res = await apiFetch(API_BASE + '/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedItems(prev => [saved, ...prev.filter(existing => existing.id !== id)]);
      }
    } finally {
      setSavingIds(prev => prev.filter(savedId => savedId !== id));
    }
  }, [isSaved]);

  useEffect(() => {
    const handleContextAction = (event) => {
      const detail = event?.detail || {};
      if (!detail.id) return;
      const item = posts.find(post => getItemId(post) === detail.id);
      if (!item) return;
      if (detail.action === 'save') {
        handleSaveToggle(item);
      }
      if (detail.action === 'rewrite') {
        handleRewrite(item);
      }
    };
    window.addEventListener('context:timeline', handleContextAction);
    return () => window.removeEventListener('context:timeline', handleContextAction);
  }, [posts, handleSaveToggle, handleRewrite]);

  const handleToggleRead = React.useCallback((item) => {
    const id = getItemId(item);
    if (!id) return;
    setReadIds(prev => (
      prev.includes(id) ? prev.filter(entry => entry !== id) : [...prev, id]
    ));
  }, []);

  const handleHideFeed = React.useCallback((item) => {
    if (!item.feedName) return;
    setHiddenFeeds(prev => (
      prev.includes(item.feedName) ? prev : [...prev, item.feedName]
    ));
    flashMessage(`Fonte ocultada: ${item.feedName}`);
  }, [flashMessage]);

  const handleOpenSource = React.useCallback((item) => {
    if (!item.link) return;
    try {
      const origin = new URL(item.link).origin;
      window.open(origin, '_blank', 'noopener,noreferrer');
    } catch (err) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleCopyLink = React.useCallback(async (item) => {
    if (!item.link) return;
    try {
      await navigator.clipboard.writeText(item.link);
      flashMessage('Link copiado.');
    } catch (err) {
      flashMessage('NÃƒÂ£o foi possÃƒÂ­vel copiar o link.');
    }
  }, [flashMessage]);

  const handleShare = React.useCallback(async (item) => {
    if (!item.link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title || 'NotÃƒÂ­cia',
          text: item.title || '',
          url: item.link
        });
        return;
      } catch (err) {
        // ignore
      }
    }
    handleCopyLink(item);
  }, [handleCopyLink]);
  const handlePostToSite = React.useCallback(async (item) => {
    if (!siteSlug) {
      flashMessage('Slug do mini site n?o configurado.');
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/site/${siteSlug}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title || '',
          contentSnippet: item.contentSnippet || '',
          link: item.link || '',
          feedName: item.feedName || '',
          pubDate: item.pubDate || '',
          isoDate: item.isoDate || '',
          tags: getItemTags(item)
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Falha ao publicar.');
      }
      flashMessage('Publicado no mini site.');
    } catch (err) {
      flashMessage(err.message || 'N?o foi poss?vel publicar no mini site.');
    }
  }, [siteSlug, flashMessage, getItemTags]);


  const openTagModal = React.useCallback((item) => {
    const current = getManualTags(item);
    setTagInput(current.join(', '));
    setTagModalItem(item);
  }, [getManualTags]);

  const saveTagsForItem = React.useCallback(() => {
    if (!tagModalItem) return;
    const id = getItemId(tagModalItem);
    if (!id) return;
      const nextTags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
    setManualTags(prev => {
      if (nextTags.length === 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: nextTags };
    });
    setTagModalItem(null);
    setTagInput('');
    flashMessage('Tags salvas.');
  }, [flashMessage, tagInput, tagModalItem]);

  const timelineCards = React.useMemo(() => (
    visiblePosts.map((item, idx) => {
      const itemTags = getItemTags(item);
      const favicon = getFaviconUrl(item.feedUrl || item.link);
      const itemImage = item.image || '';
      return (
        <div
          className={`timeline-post ${isRead(item) ? 'is-read' : ''}`}
          key={`n-${idx}`}
          data-context-card="true"
          data-context-type="timeline"
          data-context-id={getItemId(item)}
          data-context-url={item.link || ''}
          data-context-title={item.title || ''}
          data-context-saved={isSaved(item) ? '1' : '0'}
          data-card-id={getItemId(item)}
          data-card-title={item.title || ''}
        >
          <div className="timeline-post-header">
            <span className="timeline-feed-meta">
              {favicon && (
                <img
                  className="timeline-feed-favicon"
                  src={favicon}
                  alt=""
                  onError={handleFaviconError}
                />
              )}
              <span className="timeline-feed-name">{item.feedName}</span>
            </span>
            <span className="timeline-date">{formatDateTime(item.pubDate || item.isoDate)}</span>
          </div>
          <div className="timeline-post-body">
            {itemImage && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="timeline-thumb">
                <img src={itemImage} alt={item.title || ''} loading="lazy" />
              </a>
            )}
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="timeline-title">{item.title}</a>
            {itemTags.length > 0 && (
              <div className="timeline-tags-inline">
                {itemTags.map(tag => (
                  <span key={`${item.title}-${tag}`} className="timeline-tag-chip">{tag}</span>
                ))}
              </div>
            )}
            {item.contentSnippet && <div className="timeline-snippet">{item.contentSnippet}</div>}
            {item.sources && item.sources.length > 0 && (
              <div className="timeline-sources">
                <span className="timeline-sources-label">TambÃƒÂ©m em:</span>
                {item.sources.map((source, sourceIdx) => (
                  <a
                    key={`${source.feedName}-${sourceIdx}`}
                    href={source.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="timeline-source-link"
                  >
                    {source.feedName}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="timeline-post-actions">
            <div className="timeline-action-group">
              <button
                className="timeline-action primary"
                onClick={() => handleRewrite(item)}
                disabled={aiLoadingId === getItemId(item)}
                title="Gerar texto com IA"
              >
                {aiLoadingId === getItemId(item) ? 'Gerando...' : 'Gerar texto'}
              </button>
              <button
                className={`timeline-action primary timeline-save ${isSaved(item) ? 'is-saved' : ''}`}
                onClick={() => handleSaveToggle(item)}
                aria-label={isSaved(item) ? 'Remover dos salvos' : 'Salvar item'}
                disabled={savingIds.includes(getItemId(item))}
                title={isSaved(item) ? 'Remover dos salvos' : 'Salvar'}
              >
                {savingIds.includes(getItemId(item)) ? 'Salvando...' : (isSaved(item) ? 'Salvo' : 'Salvar')}
              </button>
            </div>
            <div className="timeline-action-group secondary">
              <button
                className="timeline-action icon-only"
                onClick={() => handleOpenSource(item)}
                title="Abrir site da fonte"
              >
                <span className="timeline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 0 20" />
                    <path d="M12 2a15.3 15.3 0 0 0 0 20" />
                  </svg>
                </span>
                <span className="visually-hidden">Fonte</span>
              </button>
              <button
                className="timeline-action icon-only"
                onClick={() => handleCopyLink(item)}
                title="Copiar link"
              >
                <span className="timeline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L9 5" />
                    <path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L15 19" />
                  </svg>
                </span>
                <span className="visually-hidden">Copiar link</span>
              </button>
              <button
                className="timeline-action icon-only"
                onClick={() => handleShare(item)}
                title="Compartilhar"
              >
                <span className="timeline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>
                <span className="visually-hidden">Compartilhar</span>
              </button>
              <button
                className="timeline-action icon-only"
                onClick={() => openFactModal(item)}
                title="Checagem"
              >
                <span className="timeline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.65" y1="16.65" x2="21" y2="21" />
                  </svg>
                </span>
                <span className="visually-hidden">Checagem</span>
              </button>
              <button
                className="timeline-action icon-only"
                onClick={() => openYoutubeModal(item)}
                title="Videos relacionados"
              >
                <span className="timeline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M23 7l-5 3v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2l5 3z" />
                  </svg>
                </span>
                <span className="visually-hidden">Videos</span>
              </button>
              <button
                className="timeline-action icon-only"
                onClick={() => handlePostToSite(item)}
                title="Publicar no mini site"
              >
                <span className="timeline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </span>
                <span className="visually-hidden">Publicar</span>
              </button>
              <button
                className="timeline-action icon-only"
                onClick={() => handleToggleRead(item)}
                title={isRead(item) ? 'Desmarcar como lido' : 'Marcar como lido'}
              >
                <span className="timeline-icon" aria-hidden="true">
                  {isRead(item) ? (
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </span>
                <span className="visually-hidden">{isRead(item) ? 'Lido' : 'Ler'}</span>
              </button>
              <button
                className="timeline-action icon-only"
                onClick={() => handleHideFeed(item)}
                title="Ocultar fonte"
              >
                <span className="timeline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.78 21.78 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a21.82 21.82 0 0 1-4.88 5.88" />
                    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </span>
                <span className="visually-hidden">Ocultar fonte</span>
              </button>
              <button
                className="timeline-action icon-only"
                onClick={() => openTagModal(item)}
                title="Etiquetar"
              >
                <span className="timeline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M20 10V4h-6l-8 8 6 6 8-8z" />
                    <circle cx="16" cy="8" r="1.5" />
                  </svg>
                </span>
                <span className="visually-hidden">Tags</span>
              </button>
            </div>
          </div>
        </div>
      );
    })
  ), [
    visiblePosts,
    getItemTags,
    isRead,
    isSaved,
    savingIds,
    aiLoadingId,
    handleRewrite,
    handleSaveToggle,
    handleOpenSource,
    handleCopyLink,
    handleShare,
    openFactModal,
    openYoutubeModal,
    handlePostToSite,
    handleToggleRead,
    handleHideFeed,
    openTagModal
  ]);

    if (loading) return <div className="timeline-loading">Carregando noticias...</div>;
  if (accessRestricted) {
    return (
      <div className="timeline-container timeline-promo">
        <div className="timeline-header">
          <div>
            <h2>Beta aberto</h2>
            <div className="timeline-refresh">Veja uma amostra do Radar de Noticias</div>
          </div>
        </div>
        <div className="timeline-promo-hero">
          <div className="timeline-promo-copy">
            <h3>Inteligencia editorial para equipes que precisam de velocidade</h3>
            <p>
              Esta pagina mostra apenas parte do conteudo. Faca login para acessar
              a linha do tempo completa, salvos e filtros inteligentes.
            </p>
          </div>
          <div className="timeline-promo-actions">
            <a
              className="timeline-promo-button"
              href={`${API_BASE}/auth/google?redirect=/beta`}
            >
              Entrar com Google
            </a>
            <div className="timeline-promo-note">Login libera recursos completos.</div>
          </div>
        </div>
        <div className="timeline-promo-grid">
          {promoItems.map((item) => (
            <div key={item.title} className="timeline-promo-card">
              <div className="timeline-promo-meta">{item.feedName}</div>
              <div className="timeline-promo-title">{item.title}</div>
              <div className="timeline-promo-snippet">{item.contentSnippet}</div>
              <div className="timeline-promo-tags">
                {item.tags.map((tag) => (
                  <span key={tag} className="timeline-promo-tag">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="timeline-container">
        <div className="timeline-header">
          <div>
            <h2>Todas as notÃƒÂ­cias dos feeds</h2>
            <div className="timeline-refresh">PrÃƒÂ³xima atualizaÃƒÂ§ÃƒÂ£o em {formatCountdown(countdown)}</div>
          </div>
        </div>
        <div className="timeline-search">
          <input
            className="timeline-search-input"
            type="search"
            placeholder="Filtrar por palavras (ex: economia juros)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filtrar cards da timeline"
          />
          <button
            className="timeline-search-clear"
            onClick={() => setQuery('')}
            disabled={!query.trim()}
          >
            Limpar filtro
          </button>
          <div className="timeline-view-toggle" role="group" aria-label="Modo de visualizacao">
            <button
              className={`timeline-view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              type="button"
            >
              Lista
            </button>
            <button
              className={`timeline-view-button ${viewMode === 'two' ? 'active' : ''}`}
              onClick={() => setViewMode('two')}
              type="button"
            >
              2 colunas
            </button>
            <button
              className={`timeline-view-button ${viewMode === 'three' ? 'active' : ''}`}
              onClick={() => setViewMode('three')}
              type="button"
            >
              3 colunas
            </button>
          </div>
        </div>
        <div className="timeline-meta-panels">
          <div className="timeline-panel">
            <div className="timeline-panel-title">Filtrar por fonte</div>
            <select
              className="timeline-select"
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              aria-label="Filtrar por fonte"
            >
              <option value="all">Todas as fontes</option>
              {availableSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          <div className="timeline-panel">
            <div className="timeline-panel-title">Horas (hoje)</div>
            <div className="timeline-tabs" role="tablist" aria-label="Filtrar por hora">
              <button
                type="button"
                className={`timeline-tab ${selectedHour === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedHour('all')}
                role="tab"
                aria-selected={selectedHour === 'all'}
              >
                Todas
              </button>
              {availableHours.map(({ hour, count }) => (
                <button
                  key={hour}
                  type="button"
                  className={`timeline-tab ${selectedHour === hour ? 'active' : ''}`}
                  onClick={() => setSelectedHour(hour)}
                  role="tab"
                  aria-selected={selectedHour === hour}
                >
                  {`${hour}:00`}
                  <span className="timeline-tab-badge">{count}</span>
                </button>
              ))}
            </div>
            <div className="timeline-progress" aria-label="Progresso de horas carregadas hoje">
              <div className="timeline-progress-bar">
                <div
                  className="timeline-progress-fill"
                  style={{ width: `${hoursProgress}%` }}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={hoursProgress}
                  role="progressbar"
                />
              </div>
              <span className="timeline-progress-label">
                {hoursProgress}% das horas de hoje carregadas
              </span>
            </div>
          </div>
          <div className="timeline-panel">
            <div className="timeline-panel-title">
              Palavras mais citadas
              {aiKeyLoading && <span className="timeline-badge">IA</span>}
              {aiKeywords.length > 0 && !aiKeyLoading && <span className="timeline-badge">IA</span>}
            </div>
            <div className="timeline-chip-list">
              {aiKeyError && <span className="timeline-chip-empty">{aiKeyError}</span>}
              {displayKeywords.length === 0 && !aiKeyError && (
                <span className="timeline-chip-empty">Nenhum dado</span>
              )}
              {displayKeywords.map(({ word, count }) => (
                <button
                  key={word}
                  type="button"
                  className="timeline-chip"
                  onClick={() => setQuery(prev => prev.includes(word) ? prev : `${prev} ${word}`.trim())}
                  title={count ? `${count} ocorrência${count === 1 ? '' : 's'}` : 'Sugerido pela IA'}
                >
                  {word}
                  {count ? <span className="timeline-chip-count">{count}</span> : null}
                </button>
              ))}
            </div>
          </div>
          <div className="timeline-panel">
            <div className="timeline-panel-title">
              Temas recorrentes
              {aiKeyLoading && <span className="timeline-badge">IA</span>}
              {aiThemes.length > 0 && !aiKeyLoading && <span className="timeline-badge">IA</span>}
            </div>
            <div className="timeline-chip-list">
              {aiKeyError && <span className="timeline-chip-empty">{aiKeyError}</span>}
              {displayThemes.length === 0 && !aiKeyError && (
                <span className="timeline-chip-empty">Nenhum dado</span>
              )}
              {displayThemes.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  className={`timeline-chip ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tag)}
                  title={count ? `${count} ocorrência${count === 1 ? '' : 's'}` : 'Sugerido pela IA'}
                >
                  {tag}
                  {count ? <span className="timeline-chip-count">{count}</span> : null}
                </button>
              ))}
              {selectedTag !== 'all' && (
                <button
                  type="button"
                  className="timeline-chip reset"
                  onClick={() => setSelectedTag('all')}
                >
                  Limpar temas
                </button>
              )}
            </div>
          </div>
        </div>
        {availableTags.length > 0 && (
          <div className="timeline-tags">
            <button
              className={`timeline-tag ${selectedTag === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedTag('all')}
            >
              Todas
            </button>
            {availableTags.map(tag => (
              <button
                key={tag}
                className={`timeline-tag ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className="timeline-search-meta">
          {filteredPosts.length} resultado{filteredPosts.length === 1 ? '' : 's'}
          {filteredPosts.length > visibleCount && (
            <span className="timeline-search-more">
              Mostrando {visibleCount}...
            </span>
          )}
        </div>
        
        {actionMessage && <div className="timeline-action-message">{actionMessage}</div>}
        {hiddenFeeds.length > 0 && (
          <div className="timeline-hidden-meta">
            {hiddenFeeds.length} fonte{hiddenFeeds.length === 1 ? '' : 's'} ocultada{hiddenFeeds.length === 1 ? '' : 's'}
            <button className="timeline-hidden-clear" onClick={() => setHiddenFeeds([])}>
              Mostrar todas
            </button>
          </div>
        )}
        {filteredPosts.length === 0 ? (
          <div className="timeline-empty">Nenhum resultado encontrado.</div>
        ) : (
          <div className={`timeline view-${viewMode}`}>
            {timelineCards}
          </div>
        )}
      </div>
      {aiModalItem && (
        <div className="event-overlay" role="dialog" aria-modal="true">
          <div className="event-modal event-modal-large">
            <div className="event-modal-header">
              <h3>Reescrita jornalistica</h3>
              <button className="event-close" onClick={closeAiModal} aria-label="Fechar">
                x
              </button>
            </div>
            <div className="event-modal-body">
              <div className="timeline-ai-meta">
                <div className="timeline-ai-source">{aiModalItem.feedName}</div>
                <div className="timeline-ai-title">{aiModalItem.title}</div>
              </div>
              <div className="timeline-ai-layout">
                <div className="timeline-ai-main">
                  <div className="timeline-ai-toolbar">
                    <button className="timeline-ai-chip" onClick={() => handleRewrite(aiModalItem)}>
                      Regerar jornalistico
                    </button>
                    <button className="timeline-ai-chip" onClick={() => handleRewrite(aiModalItem, 'twitter')}>
                      Gerar para X/Twitter
                    </button>
                    <button className="timeline-ai-chip" onClick={() => handleRewrite(aiModalItem, 'twitter_short')}>
                      Twitter curto
                    </button>
                    <button className="timeline-ai-chip" onClick={() => handleRewrite(aiModalItem, 'twitter_cta')}>
                      Twitter com CTA
                    </button>
                    <button className="timeline-ai-chip" onClick={() => handleRewrite(aiModalItem, 'twitter_nolink')}>
                      Twitter sem link
                    </button>
                    {aiModalItem.link && (
                      <button
                        className="timeline-ai-chip"
                        onClick={() => setAiDraft(text => `${text ? `${text} ` : ''}${aiModalItem.link}`.trim())}
                      >
                        Anexar link
                      </button>
                    )}
                  </div>
                  <div className="timeline-ai-section">
                    <div className="timeline-ai-section-title">Opcoes de estilo</div>
                    <div className="timeline-ai-toggle-grid">
                      <label className="timeline-ai-toggle">
                        <input
                          type="checkbox"
                          checked={aiIncludeTitle}
                          onChange={(e) => setAiIncludeTitle(e.target.checked)}
                        />
                        Incluir titulo no texto
                      </label>
                      <label className="timeline-ai-toggle">
                        <input
                          type="checkbox"
                          checked={aiIncludeEmojis}
                          onChange={(e) => setAiIncludeEmojis(e.target.checked)}
                        />
                        Permitir emojis
                      </label>
                      <label className="timeline-ai-toggle">
                        <input
                          type="checkbox"
                          checked={aiAutoTruncate}
                          onChange={(e) => setAiAutoTruncate(e.target.checked)}
                        />
                        Truncar automaticamente em 280 caracteres
                      </label>
                    </div>
                    <div className="timeline-ai-section-note">
                      Ajuste as opcoes e clique em "Regerar" para aplicar.
                    </div>
                  </div>
                  <div className="timeline-ai-section">
                    <div className="timeline-ai-section-title">Hashtags</div>
                    <div className="timeline-ai-toggle-grid">
                      <label className="timeline-ai-toggle">
                        <input
                          type="checkbox"
                          checked={aiAutoTags}
                          onChange={(e) => setAiAutoTags(e.target.checked)}
                        />
                        Adicionar hashtags do feed automaticamente
                      </label>
                      <label className="timeline-ai-toggle">
                        <input
                          type="checkbox"
                          checked={aiAutoDetectTags}
                          onChange={(e) => setAiAutoDetectTags(e.target.checked)}
                        />
                        Identificar hashtags automaticamente (do texto)
                      </label>
                    </div>
                    <div className="timeline-ai-row">
                      <label className="timeline-ai-fixed">
                        Quantidade de hashtags automaticas (1 a 5)
                        <input
                          className="timeline-ai-input"
                          type="number"
                          min="1"
                          max="5"
                          value={aiTagCount}
                          onChange={(e) => setAiTagCount(Number(e.target.value))}
                        />
                      </label>
                      <label className="timeline-ai-fixed">
                        Gerar hashtags
                        <div className="timeline-ai-hashtags-row">
                          <select
                            className="timeline-ai-input"
                            value={aiTagSource}
                            onChange={(e) => setAiTagSource(e.target.value)}
                          >
                            <option value="local">Sem IA (local)</option>
                            <option value="ai">Com IA (semantico)</option>
                          </select>
                          <button
                            className="timeline-ai-chip"
                            type="button"
                            onClick={handleGenerateHashtags}
                            disabled={aiTagLoading}
                          >
                            {aiTagLoading ? 'Gerando...' : 'Gerar hashtags'}
                          </button>
                        </div>
                        {aiTagError && <div className="timeline-ai-error">{aiTagError}</div>}
                        {aiSuggestedTags.length > 0 && (
                          <div className="timeline-ai-suggested">
                            <div className="timeline-ai-suggested-list">
                              {aiSuggestedTags.map(tag => (
                                <span key={tag} className="timeline-ai-suggested-chip">#{tag}</span>
                              ))}
                            </div>
                            <button
                              className="timeline-ai-chip"
                              type="button"
                              onClick={handleUseSuggestedTags}
                            >
                              Usar sugeridas
                            </button>
                          </div>
                        )}
                      </label>
                    </div>
                    <label className="timeline-ai-fixed">
                      Hashtags fixas (separadas por virgula)
                      <input
                        className="timeline-ai-input"
                        type="text"
                        value={aiFixedTags}
                        onChange={(e) => setAiFixedTags(e.target.value)}
                        placeholder="#noticias, #economia"
                      />
                    </label>
                  </div>
                  <div className="timeline-ai-section timeline-ai-text-section">
                    <div className="timeline-ai-section-title">Texto gerado</div>
                    {aiLoading && <div className="timeline-ai-loading">Gerando texto...</div>}
                    {aiError && <div className="timeline-ai-error">{aiError}</div>}
                    {!aiLoading && !aiError && (
                      <>
                        <textarea
                          className="timeline-ai-text"
                          value={aiDraft}
                          onChange={(e) => setAiDraft(e.target.value)}
                          rows="6"
                        />
                        <div className="timeline-ai-count">{previewText.length} caracteres</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="timeline-ai-side">
                  <div className="timeline-ai-preview">
                    <div className="timeline-ai-preview-header">Preview do tweet</div>
                    <div className="timeline-ai-preview-body">{previewText || 'Sem texto'}</div>
                  </div>
                  <div className="timeline-ai-images">
                    <div className="timeline-ai-images-header">
                      <div className="timeline-ai-images-title">Imagens sugeridas (Unsplash)</div>
                      <div className="timeline-ai-images-hint">
                        Imagens sem marca dagua. Credito obrigatorio ao autor.
                      </div>
                    </div>
                    <div className="timeline-ai-images-controls">
                      <input
                        className="timeline-ai-input"
                        type="text"
                        value={aiImageQuery}
                        onChange={(e) => setAiImageQuery(e.target.value)}
                        placeholder="Buscar imagem por tema (ex: economia, politico, cidade)"
                      />
                      <button
                        className="timeline-ai-chip"
                        onClick={() => handleImageSearch(aiImageQuery, false)}
                        disabled={aiImageLoading || !aiImageQuery.trim()}
                        type="button"
                      >
                        Buscar imagens
                      </button>
                      <button
                        className="timeline-ai-chip"
                        onClick={() => handleImageSearch(aiImageQuery || aiModalItem.title, true)}
                        disabled={aiImageLoading || !(aiImageQuery || aiModalItem.title)}
                        type="button"
                      >
                        Sugestao automatica
                      </button>
                      <button
                        className="timeline-ai-chip"
                        onClick={() => {
                          setAiImages([]);
                          setAiImageError('');
                        }}
                        disabled={aiImageLoading}
                        type="button"
                      >
                        Limpar
                      </button>
                    </div>
                    {aiImageLoading && <div className="timeline-ai-loading">Buscando imagens...</div>}
                    {aiImageError && <div className="timeline-ai-error">{aiImageError}</div>}
                    {aiSelectedImage && (
                      <div className="timeline-ai-image-selected">
                    {(aiSelectedImage.thumbUrl || aiSelectedImage.regularUrl) && (
                      <img
                        src={aiSelectedImage.thumbUrl || aiSelectedImage.regularUrl}
                        alt={aiSelectedImage.alt || 'Imagem'}
                      />
                    )}
                        <div className="timeline-ai-image-meta">
                          <div className="timeline-ai-image-title">{aiSelectedImage.alt || 'Imagem selecionada'}</div>
                          <div className="timeline-ai-image-credit">
                            Foto por{' '}
                            {aiSelectedImage.photographerUrl ? (
                              <a href={aiSelectedImage.photographerUrl} target="_blank" rel="noopener noreferrer">
                                {aiSelectedImage.photographer || 'Autor'}
                              </a>
                            ) : (
                              <span>{aiSelectedImage.photographer || 'Autor'}</span>
                            )}
                            {' '}no{' '}
                            {aiSelectedImage.pageUrl ? (
                              <a href={aiSelectedImage.pageUrl} target="_blank" rel="noopener noreferrer">Unsplash</a>
                            ) : (
                              <span>Unsplash</span>
                            )}
                          </div>
                          <div className="timeline-ai-image-actions">
                            <button className="timeline-ai-chip" onClick={handleOpenImage} type="button">
                              Abrir
                            </button>
                            <button className="timeline-ai-chip" onClick={handleCopyImageLink} type="button">
                              Copiar link
                            </button>
                            <button
                              className="timeline-ai-chip"
                              onClick={() => setAiSelectedImage(null)}
                              type="button"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {aiImages.length > 0 && (
                      <div className="timeline-ai-image-grid">
                    {aiImages.map((image) => (
                      <button
                        key={image.id}
                        className={`timeline-ai-image ${aiSelectedImage?.id === image.id ? 'selected' : ''}`}
                        type="button"
                        onClick={() => setAiSelectedImage(image)}
                        title={image.alt || 'Selecionar imagem'}
                      >
                        {(image.thumbUrl || image.regularUrl) && (
                          <img src={image.thumbUrl || image.regularUrl} alt={image.alt || 'Imagem'} />
                        )}
                      </button>
                    ))}
                      </div>
                    )}
                    <div className="timeline-ai-images-note">
                      Para postar no X/Twitter com imagem, abra o X e anexe a imagem manualmente.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="event-modal-footer">
              <button className="event-refresh" onClick={handleOpenTwitter} disabled={!aiText.trim()}>
                Abrir no X/Twitter
              </button>
              <button className="event-refresh" onClick={handleCopyPreview} disabled={!aiText.trim()}>
                Copiar preview
              </button>
              <button className="event-refresh" onClick={handleCopyAi} disabled={!aiText}>
                Copiar
              </button>
              <button className="event-refresh" onClick={closeAiModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {tagModalItem && (
        <div className="event-overlay" role="dialog" aria-modal="true">
          <div className="event-modal">
            <div className="event-modal-header">
              <h3>Etiquetas manuais</h3>
              <button className="event-close" onClick={() => setTagModalItem(null)} aria-label="Fechar">
                {'Ãƒâ€”'}
              </button>
            </div>
            <div className="event-modal-body">
              <div className="timeline-ai-meta">
                <div className="timeline-ai-source">{tagModalItem.feedName}</div>
                <div className="timeline-ai-title">{tagModalItem.title}</div>
              </div>
              <label className="timeline-tag-label">
                Tags (separadas por vÃƒÂ­rgula)
                <input
                  className="timeline-tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                />
              </label>
            </div>
            <div className="event-modal-footer">
              <button className="event-refresh" onClick={saveTagsForItem}>
                Salvar tags
              </button>
              <button className="event-refresh" onClick={() => setTagModalItem(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {youtubeModalItem && (
        <div className="event-overlay" role="dialog" aria-modal="true">
          <div className="event-modal">
            <div className="event-modal-header">
              <h3>Videos relacionados</h3>
              <button className="event-close" onClick={closeYoutubeModal} aria-label="Fechar">
                z
              </button>
            </div>
            <div className="event-modal-body">
              <div className="timeline-ai-meta">
                <div className="timeline-ai-source">{youtubeModalItem.feedName}</div>
                <div className="timeline-ai-title">{youtubeModalItem.title}</div>
              </div>
              {youtubeLoading && <div className="timeline-ai-loading">Carregando videos...</div>}
              {youtubeError && <div className="timeline-ai-error">{youtubeError}</div>}
              {!youtubeLoading && !youtubeError && youtubeVideos.length === 0 && (
                <div className="timeline-ai-loading">Nenhum video encontrado.</div>
              )}
              {youtubeVideos.length > 0 && (
                <div className="timeline-youtube-list">
                  {youtubeVideos.map(video => (
                    <a
                      key={video.id}
                      className="timeline-youtube-item"
                      href={video.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {video.thumbnail && (
                        <img className="timeline-youtube-thumb" src={video.thumbnail} alt={video.title} />
                      )}
                      <div className="timeline-youtube-meta">
                        <div className="timeline-youtube-title">{video.title}</div>
                        <div className="timeline-youtube-sub">
                          <span>{video.channelTitle}</span>
                          {video.publishedAt && (
                            <span>{formatDateTime(video.publishedAt)}</span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="event-modal-footer">
              <button className="event-refresh" onClick={closeYoutubeModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {factModalItem && (
        <div className="event-overlay" role="dialog" aria-modal="true">
          <div className="event-modal">
            <div className="event-modal-header">
              <h3>Checagem</h3>
              <button className="event-close" onClick={closeFactModal} aria-label="Fechar">
                x
              </button>
            </div>
            <div className="event-modal-body">
              <div className="timeline-ai-meta">
                <div className="timeline-ai-source">{factModalItem.feedName}</div>
                <div className="timeline-ai-title">{factModalItem.title}</div>
              </div>
              {factLoading && <div className="timeline-ai-loading">Buscando checagens...</div>}
              {factError && <div className="timeline-ai-error">{factError}</div>}
              {!factLoading && !factError && factClaims.length === 0 && (
                <div className="timeline-ai-loading">Nenhuma checagem encontrada.</div>
              )}
              {factClaims.length > 0 && (
                <div className="timeline-fact-list">
                  {factClaims.map((claim) => (
                    <div key={claim.id} className="timeline-fact-item">
                      <div className="timeline-fact-claim">{claim.text}</div>
                      {claim.claimant && (
                        <div className="timeline-fact-claimant">Atribuicao: {claim.claimant}</div>
                      )}
                      <div className="timeline-fact-reviews">
                        {claim.reviews.map((review, idx) => (
                          <a
                            key={`${claim.id}-${idx}`}
                            className="timeline-fact-review"
                            href={review.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="timeline-fact-review-title">{review.title || 'Checagem'}</div>
                            <div className="timeline-fact-review-meta">
                              <span>{review.publisher}</span>
                              {review.rating && <span>{review.rating}</span>}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="event-modal-footer">
              <button className="event-refresh" onClick={closeFactModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="timeline-notifications">
        {notifications.map((n, i) => (
          <div key={i} className="timeline-notification">
            <a href={n.link} target="_blank" rel="noopener noreferrer" className="timeline-notif-link">
              <span className="timeline-notif-title">{n.title}</span>
              <span className="timeline-notif-hour">{n.hour}</span>
            </a>
            <button className="timeline-notif-close" onClick={() => handleCloseNotif(i)} title="Fechar notificaÃƒÂ§ÃƒÂ£o">x</button>
          </div>
        ))}
      </div>
    </>
  );
}





















