import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './WatchPage.css';
import fallbackFavicon from './fallback-favicon.svg';

const WATCH_VIEW_KEY = 'rss-watch-view-mode';
const WATCH_RANGE_KEY = 'rss-watch-range';
const WATCH_SORT_KEY = 'rss-watch-sort';
const WATCH_RELEVANCE_KEY = 'rss-watch-relevance';

function parseKeywords(text) {
  return text
    .split(/[\n,]+/g)
    .map(word => word.trim())
    .filter(Boolean);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(d);
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(':');
  if (parts.length < 2) return null;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return Math.max(0, Math.min(23, hour)) * 60 + Math.max(0, Math.min(59, minute));
}

function getSaoPauloNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const map = parts.reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return new Date(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second || 0)
  );
}

function buildReportSchedulePreview(startValue, endValue, intervalMinutes, maxItems) {
  const startMinutes = parseTimeToMinutes(startValue);
  const endMinutes = parseTimeToMinutes(endValue);
  if (startMinutes == null || endMinutes == null) return [];
  const stepMinutes = Math.max(1, Number(intervalMinutes) || 1);
  const spanMinutes = startMinutes <= endMinutes
    ? endMinutes - startMinutes
    : (1440 - startMinutes + endMinutes);
  if (spanMinutes <= 0) return [];

  const now = getSaoPauloNow();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const inWindow = (date) => {
    const minutes = date.getHours() * 60 + date.getMinutes();
    if (startMinutes <= endMinutes) {
      return minutes >= startMinutes && minutes <= endMinutes;
    }
    return minutes >= startMinutes || minutes <= endMinutes;
  };

  const resolveWindowStart = () => {
    const minutes = now.getHours() * 60 + now.getMinutes();
    const base = new Date(today);
    if (startMinutes <= endMinutes) {
      const start = new Date(base);
      start.setMinutes(startMinutes);
      const end = new Date(base);
      end.setMinutes(endMinutes);
      if (now < start) return start;
      if (now > end) {
        const next = new Date(start);
        next.setDate(next.getDate() + 1);
        return next;
      }
      return start;
    }
    if (inWindow(now)) {
      if (minutes <= endMinutes) {
        const start = new Date(base);
        start.setDate(start.getDate() - 1);
        start.setMinutes(startMinutes);
        return start;
      }
      const start = new Date(base);
      start.setMinutes(startMinutes);
      return start;
    }
    if (minutes < startMinutes) {
      const start = new Date(base);
      start.setMinutes(startMinutes);
      return start;
    }
    const start = new Date(base);
    start.setDate(start.getDate() + 1);
    start.setMinutes(startMinutes);
    return start;
  };

  const schedule = [];
  let windowStart = resolveWindowStart();
  let windowEnd = new Date(windowStart.getTime() + spanMinutes * 60 * 1000);
  let offset = Math.ceil((now.getTime() - windowStart.getTime()) / (stepMinutes * 60 * 1000));
  if (offset < 0) offset = 0;
  let cursor = new Date(windowStart.getTime() + offset * stepMinutes * 60 * 1000);

  while (schedule.length < (maxItems || 6)) {
    if (cursor > windowEnd) {
      windowStart = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
      windowEnd = new Date(windowStart.getTime() + spanMinutes * 60 * 1000);
      cursor = new Date(windowStart);
      continue;
    }
    if (cursor >= now) {
      schedule.push(new Date(cursor));
    }
    cursor = new Date(cursor.getTime() + stepMinutes * 60 * 1000);
  }

  return schedule;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `há ${diffHr} h`;
  const diffDay = Math.round(diffHr / 24);
  return `há ${diffDay} d`;
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

export default function WatchPage() {
  const [topics, setTopics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [name, setName] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [matchMode, setMatchMode] = useState('any');
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState('');
  const [polling, setPolling] = useState(false);
  const [newAlertIds, setNewAlertIds] = useState(new Set());
  const [viewMode, setViewMode] = useState('list');
  const [timeRange, setTimeRange] = useState('24h');
  const [sortMode, setSortMode] = useState('recent');
  const [topicFilter, setTopicFilter] = useState('all');
  const [newOnly, setNewOnly] = useState(false);
  const [recencyWeight, setRecencyWeight] = useState(70);
  const [savedItems, setSavedItems] = useState([]);
  const [savingIds, setSavingIds] = useState([]);
  const [openPanel, setOpenPanel] = useState(null);
  const [reportRange, setReportRange] = useState('1h');
  const [reportMaxItems, setReportMaxItems] = useState(5);
  const [reportUseAi, setReportUseAi] = useState(true);
  const [reportAiRewrite, setReportAiRewrite] = useState(true);
  const [reportAutoEnabled, setReportAutoEnabled] = useState(false);
  const [reportAutoIntervalMinutes, setReportAutoIntervalMinutes] = useState(60);
  const [reportActiveStart, setReportActiveStart] = useState('08:00');
  const [reportActiveEnd, setReportActiveEnd] = useState('22:00');
  const [reportPreview, setReportPreview] = useState('');
  const [reportItems, setReportItems] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reportLogs, setReportLogs] = useState([]);
  const [reportLogsLoading, setReportLogsLoading] = useState(false);
  const [reportState, setReportState] = useState(null);
  const [reportSavedAt, setReportSavedAt] = useState('');
  const [reportSaveError, setReportSaveError] = useState('');
  const dropdownRef = useRef(null);
  const lastCheckRef = useRef(null);
  const alertIdsRef = useRef(new Set());
  const alertsRef = useRef([]);
  const newAlertIdsRef = useRef(new Set());

  useEffect(() => {
    fetchReportLogs();
  }, []);
  useEffect(() => {
    const storedView = localStorage.getItem(WATCH_VIEW_KEY);
    if (storedView === 'list' || storedView === 'grid' || storedView === 'compact') {
      setViewMode(storedView);
    }
    const storedRange = localStorage.getItem(WATCH_RANGE_KEY);
    if (storedRange === '24h' || storedRange === '7d' || storedRange === 'all') {
      setTimeRange(storedRange);
    }
    const storedSort = localStorage.getItem(WATCH_SORT_KEY);
    if (storedSort === 'recent' || storedSort === 'relevant') {
      setSortMode(storedSort);
    }
    const storedRelevance = localStorage.getItem(WATCH_RELEVANCE_KEY);
    if (storedRelevance) {
      const parsed = Number(storedRelevance);
      if (Number.isFinite(parsed)) {
        setRecencyWeight(Math.min(100, Math.max(0, parsed)));
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!openPanel) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenPanel(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPanel]);

  useEffect(() => {
    apiFetch(`${API_BASE}/watch/settings`)
      .then(res => res.json())
      .then(data => {
        if (!data) return;
        if (data.viewMode && ['list', 'grid', 'compact'].includes(data.viewMode)) {
          setViewMode(data.viewMode);
          try {
            localStorage.setItem(WATCH_VIEW_KEY, data.viewMode);
          } catch (e) {
            // ignore
          }
        }
        if (data.timeRange && ['24h', '7d', 'all'].includes(data.timeRange)) {
          setTimeRange(data.timeRange);
          try {
            localStorage.setItem(WATCH_RANGE_KEY, data.timeRange);
          } catch (e) {
            // ignore
          }
        }
        if (data.sortMode && ['recent', 'relevant'].includes(data.sortMode)) {
          setSortMode(data.sortMode);
          try {
            localStorage.setItem(WATCH_SORT_KEY, data.sortMode);
          } catch (e) {
            // ignore
          }
        }
        if (typeof data.topicFilter === 'string') {
          setTopicFilter(data.topicFilter);
        }
        if (typeof data.newOnly === 'boolean') {
          setNewOnly(data.newOnly);
        }
        const next = Number(data.recencyWeight);
        if (Number.isFinite(next)) {
          setRecencyWeight(Math.min(100, Math.max(0, next)));
          try {
            localStorage.setItem(WATCH_RELEVANCE_KEY, String(next));
          } catch (e) {
            // ignore
          }
        }
        if (data.report && typeof data.report === 'object') {
          const report = data.report;
          if (report.range) setReportRange(report.range);
          if (Number.isFinite(Number(report.maxItems))) {
            setReportMaxItems(Math.min(20, Math.max(1, Number(report.maxItems))));
          }
          if (typeof report.useAi === 'boolean') setReportUseAi(report.useAi);
          if (typeof report.aiRewrite === 'boolean') setReportAiRewrite(report.aiRewrite);
          if (typeof report.autoEnabled === 'boolean') setReportAutoEnabled(report.autoEnabled);
          const autoMinutes = Number(report.autoIntervalMinutes);
          if (Number.isFinite(autoMinutes)) {
            setReportAutoIntervalMinutes(Math.min(360, Math.max(1, autoMinutes)));
          } else if (Number.isFinite(Number(report.autoIntervalHours))) {
            const minutes = Number(report.autoIntervalHours) * 60;
            setReportAutoIntervalMinutes(Math.min(360, Math.max(1, minutes)));
          }
          if (typeof report.activeStart === 'string') setReportActiveStart(report.activeStart);
          if (typeof report.activeEnd === 'string') setReportActiveEnd(report.activeEnd);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    apiFetch(`${API_BASE}/watch/topics`)
      .then(res => res.json())
      .then(data => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]));

    apiFetch(`${API_BASE}/watch/alerts?limit=200`)
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : [];
        setAlerts(items);
        alertsRef.current = items;
        alertIdsRef.current = new Set(items.map(alert => alert.id));
        newAlertIdsRef.current = new Set();
        lastCheckRef.current = new Date().toISOString();
      })
      .catch(() => {
        setAlerts([]);
        alertsRef.current = [];
        lastCheckRef.current = new Date().toISOString();
      });

    apiFetch(`${API_BASE}/saved`)
      .then(res => res.json())
      .then(data => setSavedItems(Array.isArray(data) ? data : []))
      .catch(() => setSavedItems([]));
  }, []);

  useEffect(() => {
    const refreshAlerts = async () => {
      setPolling(true);
      try {
        await apiFetch(`${API_BASE}/watch/refresh`, { method: 'POST' });
        const url = new URL(`${API_BASE}/watch/alerts`);
        if (lastCheckRef.current) {
          url.searchParams.set('since', lastCheckRef.current);
        }
        const res = await fetch(url.toString());
        const data = await res.json();
        const incoming = Array.isArray(data) ? data : [];
        if (incoming.length) {
          const nextAlertIds = new Set(alertIdsRef.current);
          const nextNewIds = new Set(newAlertIdsRef.current);
          const merged = [...alertsRef.current];
          incoming.forEach(alert => {
            if (!nextAlertIds.has(alert.id)) {
              nextAlertIds.add(alert.id);
              nextNewIds.add(alert.id);
              merged.unshift(alert);
            }
          });
          alertIdsRef.current = nextAlertIds;
          setNewAlertIds(nextNewIds);
          newAlertIdsRef.current = nextNewIds;
          setAlerts(merged.slice(0, 200));
          alertsRef.current = merged.slice(0, 200);
        }
        lastCheckRef.current = new Date().toISOString();
      } catch (e) {
        // ignore
      } finally {
        setPolling(false);
      }
    };

    refreshAlerts();
    const interval = setInterval(refreshAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage('');
    const keywords = parseKeywords(keywordsText);
    if (!name.trim() || !keywords.length) {
      setMessage('Informe nome e palavras-chave.');
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/watch/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          keywords,
          matchMode,
          enabled
        })
      });
      if (!res.ok) throw new Error('Falha ao salvar tema.');
      const data = await res.json();
      setTopics(prev => [data, ...prev]);
      setName('');
      setKeywordsText('');
      setMatchMode('any');
      setEnabled(true);
      setMessage('Tema salvo.');
    } catch (err) {
      setMessage('Não foi possível salvar o tema.');
    }
  };

  const handleToggle = async (topic) => {
    try {
      const res = await apiFetch(`${API_BASE}/watch/topics/${topic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...topic, enabled: !topic.enabled })
      });
      if (!res.ok) throw new Error('Falha ao atualizar.');
      const data = await res.json();
      setTopics(prev => prev.map(item => (item.id === data.id ? data : item)));
    } catch (e) {
      setMessage('Não foi possível atualizar o tema.');
    }
  };

  const handleDelete = async (topicId) => {
    try {
      const res = await apiFetch(`${API_BASE}/watch/topics/${topicId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao remover.');
      setTopics(prev => prev.filter(item => item.id !== topicId));
    } catch (e) {
      setMessage('Não foi possível remover o tema.');
    }
  };

  const clearNewAlerts = () => {
    setNewAlertIds(new Set());
    newAlertIdsRef.current = new Set();
  };

  const topicsById = useMemo(() => {
    const map = new Map();
    topics.forEach(topic => map.set(topic.id, topic));
    return map;
  }, [topics]);

  const alertsByTopic = useMemo(() => {
    const map = {};
    alerts.forEach(alert => {
      if (!alert.topicId) return;
      map[alert.topicId] = (map[alert.topicId] || 0) + 1;
    });
    return map;
  }, [alerts]);

  const recentCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return alerts.filter(alert => {
      const dateStr = alert.item?.pubDate || alert.item?.isoDate || alert.matchedAt;
      const d = new Date(dateStr);
      return !Number.isNaN(d.getTime()) && d.getTime() >= cutoff;
    }).length;
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const now = Date.now();
    const rangeMs = timeRange === '24h' ? 24 * 60 * 60 * 1000
      : timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000
        : null;
    const recencyMaxMs = timeRange === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const matchWeight = 100 - recencyWeight;

    const scored = alerts.map(alert => {
      const topic = topicsById.get(alert.topicId);
      const keywords = (topic?.keywords || []).map(word => String(word).toLowerCase());
      const text = `${alert.item?.title || ''} ${alert.item?.contentSnippet || ''}`.toLowerCase();
      const matchCount = keywords.reduce((acc, word) => (text.includes(word) ? acc + 1 : acc), 0);
      const matchRatio = keywords.length ? matchCount / keywords.length : 0;
      const dateStr = alert.item?.pubDate || alert.item?.isoDate || alert.matchedAt;
      const dateMs = new Date(dateStr).getTime();
      const ageMs = Number.isFinite(dateMs) ? Math.max(0, now - dateMs) : recencyMaxMs;
      const recencyScore = 1 - Math.min(ageMs / recencyMaxMs, 1);
      const score = (matchRatio * (matchWeight / 100)) + (recencyScore * (recencyWeight / 100));
      return { alert, score };
    });

    const filtered = scored.filter(({ alert }) => {
      if (topicFilter !== 'all' && alert.topicId !== topicFilter) return false;
      if (newOnly && !newAlertIds.has(alert.id)) return false;
      if (rangeMs) {
        const dateStr = alert.item?.pubDate || alert.item?.isoDate || alert.matchedAt;
        const d = new Date(dateStr);
        if (!Number.isNaN(d.getTime()) && (now - d.getTime()) > rangeMs) return false;
      }
      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(a.alert.item?.pubDate || a.alert.item?.isoDate || a.alert.matchedAt).getTime();
      const dateB = new Date(b.alert.item?.pubDate || b.alert.item?.isoDate || b.alert.matchedAt).getTime();
      if (sortMode === 'relevant') {
        if (b.score !== a.score) return b.score - a.score;
        return (dateB || 0) - (dateA || 0);
      }
      return (dateB || 0) - (dateA || 0);
    });

    return sorted.map(item => item.alert);
  }, [alerts, newAlertIds, newOnly, recencyWeight, sortMode, timeRange, topicFilter, topicsById]);

  const buildSettingsPayload = (overrides = {}) => {
    const base = {
      viewMode,
      timeRange,
      sortMode,
      topicFilter,
      newOnly,
      recencyWeight,
      report: {
        range: reportRange,
        maxItems: reportMaxItems,
        useAi: reportUseAi,
        aiRewrite: reportAiRewrite,
        autoEnabled: reportAutoEnabled,
        autoIntervalMinutes: reportAutoIntervalMinutes,
        activeStart: reportActiveStart,
        activeEnd: reportActiveEnd
      }
    };
    if (overrides.report && typeof overrides.report === 'object') {
      base.report = { ...base.report, ...overrides.report };
    }
    return { ...base, ...overrides, report: base.report };
  };

  const persistSettings = (next) => {
    apiFetch(`${API_BASE}/watch/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSettingsPayload(next))
    })
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao salvar configuracao.');
        setReportSavedAt(new Date().toISOString());
        setReportSaveError('');
      })
      .catch(() => {
        setReportSaveError('Falha ao salvar configuracao.');
      });
  };

  const handleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(WATCH_VIEW_KEY, mode);
    } catch (e) {
      // ignore
    }
    persistSettings({ viewMode: mode });
  };

  const handleRange = (value) => {
    setTimeRange(value);
    try {
      localStorage.setItem(WATCH_RANGE_KEY, value);
    } catch (e) {
      // ignore
    }
    persistSettings({ timeRange: value });
  };

  const handleSort = (value) => {
    setSortMode(value);
    try {
      localStorage.setItem(WATCH_SORT_KEY, value);
    } catch (e) {
      // ignore
    }
    persistSettings({ sortMode: value });
  };

  const handleRecencyWeight = (value) => {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 70;
    setRecencyWeight(safe);
    try {
      localStorage.setItem(WATCH_RELEVANCE_KEY, String(safe));
    } catch (e) {
      // ignore
    }
    persistSettings({ recencyWeight: safe });
  };

  const fetchReportLogs = async () => {
    setReportLogsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/watch/report/logs`);
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.logs)) {
        setReportLogs(data.logs);
      }
      if (data && data.ok && data.state) {
        setReportState(data.state);
      }
    } catch (err) {
      // ignore
    } finally {
      setReportLogsLoading(false);
    }
  };

  const handleReportPreview = async () => {
    setReportLoading(true);
    setReportMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/watch/report/preview?range=${encodeURIComponent(reportRange)}`);
      const data = await res.json();
      if (!data || !data.ok) {
        setReportMessage(data?.message || 'Falha ao gerar relatorio.');
        setReportPreview('');
        setReportItems([]);
        return;
      }
      setReportPreview(data.report || '');
      setReportItems(Array.isArray(data.items) ? data.items : []);
      fetchReportLogs();
    } catch (err) {
      setReportMessage('Falha ao gerar relatorio.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleReportPost = async () => {
    setReportLoading(true);
    setReportMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/watch/report/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          range: reportRange,
          maxItems: reportMaxItems,
          useAi: reportUseAi,
          aiRewrite: reportAiRewrite,
          autoIntervalMinutes: reportAutoIntervalMinutes
        })
      });
      const data = await res.json();
      if (!data || !data.ok) {
        setReportMessage(data?.message || 'Falha ao publicar relatorio.');
        return;
      }
      setReportPreview(data.report || '');
      setReportItems(Array.isArray(data.items) ? data.items : []);
      setReportMessage('Relatorio publicado no X.');
      fetchReportLogs();
    } catch (err) {
      setReportMessage('Falha ao publicar relatorio.');
    } finally {
      setReportLoading(false);
    }
  };

  const reportStatusLabel = useMemo(() => {
    const rangeLabel = reportRange === '2h' ? 'ultimas 2 horas'
      : reportRange === '3h' ? 'ultimas 3 horas'
        : reportRange === '24h' ? 'ultimo dia'
          : 'ultima hora';
    const base = `Automatizacao ${reportAutoEnabled ? 'ativada' : 'desativada'}.`;
    const details = [
      `Periodo: ${rangeLabel}`,
      `Itens: ${reportMaxItems}`,
      `IA: ${reportUseAi ? 'sim' : 'nao'}`,
      `Reescrever: ${reportAiRewrite ? 'sim' : 'nao'}`,
      `Intervalo: ${reportAutoIntervalMinutes} min`,
      `Horario: ${reportActiveStart} - ${reportActiveEnd}`
    ].join(' | ');
    return `${base} ${details}`;
  }, [
    reportActiveEnd,
    reportActiveStart,
    reportAutoEnabled,
    reportAiRewrite,
    reportAutoIntervalMinutes,
    reportMaxItems,
    reportRange,
    reportUseAi
  ]);

  const reportSchedule = useMemo(() => {
    return buildReportSchedulePreview(
      reportActiveStart,
      reportActiveEnd,
      reportAutoIntervalMinutes,
      6
    );
  }, [reportActiveEnd, reportActiveStart, reportAutoIntervalMinutes]);

  const getAlertItemId = (alert) => {
    return alert.item?.link || alert.item?.guid || alert.id;
  };

  const isSaved = (alert) => {
    const id = getAlertItemId(alert);
    if (!id) return false;
    return savedItems.some(item => item.id === id);
  };

  const handleSave = async (alert) => {
    const id = getAlertItemId(alert);
    if (!id || savingIds.includes(id)) return;
    setSavingIds(prev => [...prev, id]);
    try {
      if (isSaved(alert)) {
        await apiFetch(`${API_BASE}/saved/${encodeURIComponent(id)}`, { method: 'DELETE' });
        setSavedItems(prev => prev.filter(item => item.id !== id));
      } else {
        const res = await apiFetch(`${API_BASE}/saved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            title: alert.item?.title || '',
            link: alert.item?.link || '',
            feedName: alert.item?.feedName || '',
            contentSnippet: alert.item?.contentSnippet || '',
            pubDate: alert.item?.pubDate || '',
            isoDate: alert.item?.isoDate || '',
            source: 'watch'
          })
        });
        const saved = await res.json();
        if (saved && saved.id) {
          setSavedItems(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setSavingIds(prev => prev.filter(savedId => savedId !== id));
    }
  };

  return (
    <div className="watch-page">
      <div className="watch-header">
        <div>
          <h2>Acompanhamentos</h2>
          <p>Cadastre temas e receba alertas em tempo real quando notícias aparecerem.</p>
        </div>
        <div className="watch-status">
          {polling ? 'Atualizando...' : 'Monitoramento ativo'}
        </div>
      </div>

      {newAlertIds.size > 0 && (
        <div className="watch-alert-banner">
          <span>Novos alertas: {newAlertIds.size}</span>
          <button className="watch-link" onClick={clearNewAlerts}>Marcar como visto</button>
        </div>
      )}

      {message && <div className="watch-message">{message}</div>}

      <div className="watch-dropdowns" ref={dropdownRef}>
        <div className="watch-dropdown">
          <button
            type="button"
            className={`watch-dropdown-toggle ${openPanel === 'new' ? 'is-open' : ''}`}
            onClick={() => setOpenPanel(openPanel === 'new' ? null : 'new')}
          >
            <span>Novo tema</span>
            <span className={`watch-dropdown-icon ${openPanel === 'new' ? 'is-open' : ''}`}>+</span>
          </button>
          {openPanel === 'new' && (
            <div className="watch-dropdown-panel">
              <form className="watch-card" onSubmit={handleAdd}>
                <h3>Novo tema</h3>
                <label className="feed-field">
                  <span className="feed-label">Nome do tema</span>
                  <input
                    className="feed-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Economia e juros"
                  />
                </label>
                <label className="feed-field">
                  <span className="feed-label">Palavras-chave</span>
                  <textarea
                    className="feed-textarea"
                    rows="4"
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    placeholder="Uma palavra por linha ou separadas por vírgula"
                  />
                </label>
                <div className="watch-row">
                  <label className="feed-field">
                    <span className="feed-label">Modo de correspondência</span>
                    <select
                      className="feed-input"
                      value={matchMode}
                      onChange={(e) => setMatchMode(e.target.value)}
                    >
                      <option value="any">Qualquer palavra</option>
                      <option value="all">Todas as palavras</option>
                    </select>
                  </label>
                  <label className="watch-toggle">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                    />
                    <span>Ativo</span>
                  </label>
                </div>
                <button className="watch-button" type="submit">Salvar tema</button>
              </form>
            </div>
          )}
        </div>

        <div className="watch-dropdown">
          <button
            type="button"
            className={`watch-dropdown-toggle ${openPanel === 'topics' ? 'is-open' : ''}`}
            onClick={() => setOpenPanel(openPanel === 'topics' ? null : 'topics')}
          >
            <span>Temas ativos</span>
            <span className={`watch-dropdown-icon ${openPanel === 'topics' ? 'is-open' : ''}`}>+</span>
          </button>
          {openPanel === 'topics' && (
            <div className="watch-dropdown-panel">
              <div className="watch-card">
                <h3>Temas ativos</h3>
                {topics.length === 0 && <p className="watch-empty">Nenhum tema cadastrado.</p>}
                <div className="watch-topic-list">
                  {topics.map(topic => (
                    <div className="watch-topic" key={topic.id}>
                      <div className="watch-topic-main">
                        <div>
                          <div className="watch-topic-name">{topic.name}</div>
                          <div className="watch-topic-words">{(topic.keywords || []).join(', ')}</div>
                        </div>
                        <div className="watch-topic-count">
                          {alertsByTopic[topic.id] || 0} alertas
                        </div>
                      </div>
                      <div className="watch-topic-actions">
                        <button
                          type="button"
                          className={`watch-pill ${topic.enabled ? 'is-on' : ''}`}
                          onClick={() => handleToggle(topic)}
                        >
                          {topic.enabled ? 'Ativo' : 'Pausado'}
                        </button>
                        <button
                          type="button"
                          className="watch-pill is-danger"
                          onClick={() => handleDelete(topic.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="watch-dropdown">
          <button
            type="button"
            className={`watch-dropdown-toggle ${openPanel === 'report' ? 'is-open' : ''}`}
            onClick={() => setOpenPanel(openPanel === 'report' ? null : 'report')}
          >
            <span>Relatorio</span>
            <span className={`watch-dropdown-icon ${openPanel === 'report' ? 'is-open' : ''}`}>+</span>
          </button>
          {openPanel === 'report' && (
            <div className="watch-dropdown-panel">
              <div className="watch-card">
                <h3>Relatorio com IA</h3>
                <p className="watch-card-subtitle">
                  Gere um report dos acompanhamentos e publique no X.
                </p>
                <div className="watch-row">
                  <label className="feed-field">
                    <span className="feed-label">Periodo</span>
                    <select
                      className="feed-input"
                      value={reportRange}
                      onChange={(e) => {
                        const value = e.target.value;
                        setReportRange(value);
                        persistSettings({ report: { range: value } });
                      }}
                    >
                      <option value="1h">Ultima hora</option>
                      <option value="2h">Ultimas 2 horas</option>
                      <option value="3h">Ultimas 3 horas</option>
                      <option value="24h">Ultimo dia</option>
                    </select>
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">Itens por relatorio</span>
                    <input
                      className="feed-input"
                      type="number"
                      min="1"
                      max="20"
                      value={reportMaxItems}
                      onChange={(e) => {
                        const value = Math.min(20, Math.max(1, Number(e.target.value) || 5));
                        setReportMaxItems(value);
                        persistSettings({ report: { maxItems: value } });
                      }}
                    />
                  </label>
                </div>
                <div className="watch-row">
                  <label className="watch-toggle">
                    <input
                      type="checkbox"
                      checked={reportUseAi}
                      onChange={(e) => {
                        const value = e.target.checked;
                        setReportUseAi(value);
                        persistSettings({ report: { useAi: value } });
                      }}
                    />
                    <span>Curadoria por IA</span>
                  </label>
                  <label className="watch-toggle">
                    <input
                      type="checkbox"
                      checked={reportAiRewrite}
                      onChange={(e) => {
                        const value = e.target.checked;
                        setReportAiRewrite(value);
                        persistSettings({ report: { aiRewrite: value } });
                      }}
                    />
                    <span>Reescrever em formato de report</span>
                  </label>
                </div>
                <div className="watch-row">
                  <label className="watch-toggle">
                    <input
                      type="checkbox"
                      checked={reportAutoEnabled}
                      onChange={(e) => {
                        const value = e.target.checked;
                        setReportAutoEnabled(value);
                        persistSettings({ report: { autoEnabled: value } });
                      }}
                    />
                    <span>Automatizar no X</span>
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">Intervalo (minutos)</span>
                    <input
                      className="feed-input"
                      type="number"
                      min="1"
                      max="360"
                      value={reportAutoIntervalMinutes}
                      onChange={(e) => {
                        const value = Math.min(360, Math.max(1, Number(e.target.value) || 60));
                        setReportAutoIntervalMinutes(value);
                        persistSettings({ report: { autoIntervalMinutes: value } });
                      }}
                    />
                  </label>
                </div>
                <div className="watch-row">
                  <label className="feed-field">
                    <span className="feed-label">Ativo de</span>
                    <input
                      className="feed-input"
                      type="time"
                      value={reportActiveStart}
                      onChange={(e) => {
                        const value = e.target.value || '08:00';
                        setReportActiveStart(value);
                        persistSettings({ report: { activeStart: value } });
                      }}
                    />
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">Ativo ate</span>
                    <input
                      className="feed-input"
                      type="time"
                      value={reportActiveEnd}
                      onChange={(e) => {
                        const value = e.target.value || '22:00';
                        setReportActiveEnd(value);
                        persistSettings({ report: { activeEnd: value } });
                      }}
                    />
                  </label>
                </div>
                <div className="watch-report-status">
                  {reportStatusLabel}
                </div>
                {reportState && (
                  <div className="watch-report-status">
                    <div>
                      Proxima postagem (backend): {reportState.nextRunAt ? formatTime(reportState.nextRunAt) : 'Nao agendada'}
                    </div>
                    {reportState.rateLimitUntil && (
                      <div>
                        Em espera ate: {formatTime(reportState.rateLimitUntil)}
                      </div>
                    )}
                    {reportState.lastAutoPostAt && (
                      <div>
                        Ultimo post automatico: {formatTime(reportState.lastAutoPostAt)}
                      </div>
                    )}
                    {reportState.lastAutoAttemptAt && (
                      <div>
                        Ultima tentativa automatica: {formatTime(reportState.lastAutoAttemptAt)}
                      </div>
                    )}
                  </div>
                )}
                <div className="watch-report-schedule">
                  <div className="watch-report-title">Cronograma previsto</div>
                  {reportSchedule.length === 0 ? (
                    <div className="watch-report-status">
                      Defina horario e intervalo para ver o cronograma.
                    </div>
                  ) : (
                    <ul className="watch-report-log-list">
                      {reportSchedule.map((time, index) => (
                        <li key={`${time.toISOString()}-${index}`}>
                          {formatTime(time.toISOString())}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {(reportSavedAt || reportSaveError) && (
                  <div className={`watch-report-status ${reportSaveError ? 'is-error' : ''}`}>
                    {reportSaveError ? reportSaveError : `Configuracao salva em ${formatTime(reportSavedAt)}.`}
                  </div>
                )}
                <div className="watch-report-actions">
                  <button
                    type="button"
                    className="watch-button"
                    onClick={handleReportPreview}
                    disabled={reportLoading}
                  >
                    {reportLoading ? 'Gerando...' : 'Preview do relatorio'}
                  </button>
                  <button
                    type="button"
                    className="watch-button is-secondary"
                    onClick={handleReportPost}
                    disabled={reportLoading}
                  >
                    Publicar no X
                  </button>
                </div>
                {reportMessage && <div className="watch-message">{reportMessage}</div>}
                {reportPreview && (
                  <div className="watch-report-preview">
                    <div className="watch-report-title">Preview</div>
                    <pre className="watch-report-body">{reportPreview}</pre>
                  </div>
                )}
                {reportItems.length > 0 && (
                  <div className="watch-report-items">
                    <div className="watch-report-title">Itens usados</div>
                    <ul>
                      {reportItems.map((item, index) => (
                        <li key={`${item.link || item.title}-${index}`}>
                          {item.title || 'Sem titulo'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {reportLogsLoading && (
                  <div className="watch-report-status">
                    Carregando log da automatizacao...
                  </div>
                )}
                {!reportLogsLoading && reportLogs.length > 0 && (
                  <div className="watch-report-logs">
                    <div className="watch-report-title">Log da automatizacao</div>
                    <ul className="watch-report-log-list">
                      {reportLogs.slice(0, 15).map((logItem) => (
                        <li key={logItem.id || logItem.timestamp}>
                          <div className="watch-report-log-line">
                            {formatTime(logItem.timestamp)} - {logItem.message || logItem.action}
                          </div>
                          {logItem.detail ? (
                            <div className="watch-report-log-detail">
                              {logItem.detail}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="watch-alerts">
        <div className="watch-alerts-header">
          <div>
            <h3>Alertas do monitoramento</h3>
            <p className="watch-alerts-subtitle">
              {filteredAlerts.length} alertas filtrados · {recentCount} nas últimas 24h
            </p>
          </div>
          <div className="watch-alerts-toolbar">
            <div className="watch-view-toggle">
              <button
                type="button"
                className={`watch-view-button ${viewMode === 'list' ? 'is-active' : ''}`}
                onClick={() => handleViewMode('list')}
              >
                Lista
              </button>
              <button
                type="button"
                className={`watch-view-button ${viewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => handleViewMode('grid')}
              >
                Grade
              </button>
              <button
                type="button"
                className={`watch-view-button ${viewMode === 'compact' ? 'is-active' : ''}`}
                onClick={() => handleViewMode('compact')}
              >
                Compacta
              </button>
            </div>
            <div className="watch-filters">
              <label className="watch-filter">
                <span>Período</span>
                <select value={timeRange} onChange={(e) => handleRange(e.target.value)}>
                  <option value="24h">Últimas 24h</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="all">Tudo</option>
                </select>
              </label>
              <label className="watch-filter">
                <span>Ordenação</span>
                <select value={sortMode} onChange={(e) => handleSort(e.target.value)}>
                  <option value="recent">Mais recente</option>
                  <option value="relevant">Mais relevante</option>
                </select>
              </label>
              <label className="watch-filter">
                <span>Tema</span>
                <select
                  value={topicFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTopicFilter(value);
                    persistSettings({ topicFilter: value });
                  }}
                >
                  <option value="all">Todos</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
              </label>
              <label className="watch-filter watch-filter-toggle">
                <input
                  type="checkbox"
                  checked={newOnly}
                  onChange={(e) => {
                    const value = e.target.checked;
                    setNewOnly(value);
                    persistSettings({ newOnly: value });
                  }}
                />
                <span>Somente novos</span>
              </label>
              <label className="watch-filter watch-filter-range">
                <span>Relevância</span>
                <div className="watch-range-row">
                  <span className="watch-range-label">Recência {recencyWeight}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={recencyWeight}
                    onChange={(e) => handleRecencyWeight(e.target.value)}
                    disabled={sortMode !== 'relevant'}
                  />
                  <span className="watch-range-label">Match {100 - recencyWeight}%</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {filteredAlerts.length === 0 && <p className="watch-empty">Nenhuma notícia encontrada ainda.</p>}
        <div className={`watch-alert-list ${viewMode === 'grid' ? 'is-grid' : ''} ${viewMode === 'compact' ? 'is-compact' : ''}`}>
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`watch-alert ${newAlertIds.has(alert.id) ? 'is-new' : ''}`}
            >
              <div className="watch-alert-topic">
                <span>{alert.topicName || 'Tema'}</span>
                {newAlertIds.has(alert.id) && <span className="watch-alert-badge">Novo</span>}
              </div>
              <div className="watch-alert-body">
                <div className="watch-alert-title">{alert.item?.title || 'Sem título'}</div>
                {alert.item?.contentSnippet && (
                  <div className="watch-alert-snippet">{alert.item.contentSnippet}</div>
                )}
                <div className="watch-alert-meta">
                  <span className="watch-alert-source">
                    {alert.item?.link && (
                      <img
                        className="watch-alert-favicon"
                        src={getFaviconUrl(alert.item.link)}
                        alt=""
                        onError={handleFaviconError}
                      />
                    )}
                    {alert.item?.feedName || 'Feed'}
                  </span>
                  <span>{formatTime(alert.item?.pubDate || alert.item?.isoDate || alert.matchedAt)}</span>
                  <span>{formatRelativeTime(alert.item?.pubDate || alert.item?.isoDate || alert.matchedAt)}</span>
                </div>
              </div>
              <div className="watch-alert-actions">
                {alert.item?.link && (
                  <a href={alert.item.link} target="_blank" rel="noopener noreferrer" className="watch-link">
                    Abrir notícia
                  </a>
                )}
                <button
                  type="button"
                  className={`watch-save ${isSaved(alert) ? 'is-saved' : ''}`}
                  onClick={() => handleSave(alert)}
                  disabled={savingIds.includes(getAlertItemId(alert))}
                >
                  {isSaved(alert) ? 'Salvo' : 'Salvar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



