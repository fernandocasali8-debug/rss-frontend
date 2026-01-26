import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { API_BASE, apiFetch, setRuntimeToken } from './api';
import fallbackFavicon from './fallback-favicon.svg';

import Timeline from './Timeline';
import ConfigPage from './ConfigPage';
import SavedPage from './SavedPage';
import DisplayMode from './DisplayMode';
import DashboardPage from './DashboardPage';
import SummaryPage from './SummaryPage';
import TrendsPage from './TrendsPage';
import TrendsTermsPage from './TrendsTermsPage';
import TrendsEventsPage from './TrendsEventsPage';
import FeedRepositoryPage from './FeedRepositoryPage';
import RssGeneratorPage from './RssGeneratorPage';
import WatchPage from './WatchPage';
import InfluencersPage from './InfluencersPage';
import AdminApp from './AdminApp';
import TeamPage from './TeamPage';
import PublicSite from './PublicSite';
import PublicWatchSite from './PublicWatchSite';
import XGeneratorPage from './XGeneratorPage';
import FactCheckPage from './FactCheckPage';
import SpacesLivePage from './SpacesLivePage';
import Sidebar from './Sidebar';
import HighlightsPage from './HighlightsPage';
import './HighlightsPage.css';
import { HighlightProvider } from './HighlightContext';
import Highlighter from './Highlighter';
import {
  Bell,
  Bookmark,
  BookOpen,
  Highlighter as HighlighterIcon,
  Eye,
  Folder,
  LayoutDashboard,
  Menu,
  Mic,
  Moon,
  Search,
  Rss,
  Sparkles,
  Settings,
  Sun,
  TrendingUp,
  Users
} from 'lucide-react';

const THEME_KEY = 'rss-theme';
const CONTEXT_MENU_KEY = 'rss-context-menu-config';
const APP_VERSION = process.env.REACT_APP_VERSION || 'v0.1.0';
const DEFAULT_CONTEXT_MENU = {
  enabled: true,
  shortcutsEnabled: true,
  showShortcuts: true,
  actions: {
    refresh: true,
    copyUrl: true,
    copyTitle: true,
    toggleTheme: true,
    toggleSidebar: true,
    events: true,
    broadcast: true
  },
  cardActions: {
    openLink: true,
    copyLink: true,
    copyTitle: true,
    saveToggle: true,
    generateText: true,
    removeSaved: true
  }
};
const ROUTE_SECTIONS = [
  {
    section: 'GERAL',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'home', label: 'Linha do tempo', icon: Rss },
      { key: 'saved', label: 'Salvos', icon: Bookmark },
      { key: 'highlights', label: 'Sublinhos', icon: HighlighterIcon },
      { key: 'watch', label: 'Acompanhamentos', icon: Eye },
      { key: 'fact-check', label: 'Fact Check', icon: Search },
      { key: 'spaces-live', label: 'Spaces', icon: Mic }
    ]
  },
  {
    section: 'GEST\u00C3O',
    items: [
      { key: 'summary', label: 'Resumo di\u00E1rio', icon: BookOpen },
      {
        key: 'trends',
        label: 'Tend\u00EAncias',
        icon: TrendingUp,
        subItems: [
          { key: 'trends-news', label: 'Not\u00EDcias Google', routeKey: 'trends' },
          { key: 'trends-terms', label: 'Termos Google' },
          { key: 'trends-events', label: 'Expectativas de eventos' }
        ]
      },
      { key: 'influencers', label: 'Influenciadores', icon: Users },
      { key: 'team', label: 'Times', icon: Users },
      { key: 'rss-generator', label: 'Gerador RSS', icon: Sparkles },
      { key: 'repo', label: 'Reposit\u00F3rio', icon: Folder },
      { key: 'config', label: 'Configura\u00E7\u00E3o', icon: Settings }
    ]
  }
];

const PLAN_ACCESS = {
  starter: ['dashboard', 'home', 'saved', 'highlights', 'fact-check', 'spaces-live'],
  pro: ['dashboard', 'home', 'saved', 'summary', 'trends', 'trends-news', 'trends-terms', 'trends-events', 'watch', 'influencers', 'highlights', 'fact-check', 'spaces-live'],
  business: ['dashboard', 'home', 'saved', 'summary', 'trends', 'trends-news', 'trends-terms', 'trends-events', 'watch', 'influencers', 'team', 'rss-generator', 'repo', 'config', 'highlights', 'fact-check', 'spaces-live'],
  enterprise: ['dashboard', 'home', 'saved', 'summary', 'trends', 'trends-news', 'trends-terms', 'trends-events', 'watch', 'influencers', 'team', 'rss-generator', 'repo', 'config', 'fact-check', 'spaces-live', 'highlights']
};

const PendingApproval = ({ onLogout, userEmail }) => (
  <div className="auth-screen">
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="auth-brand">
          <div className="auth-logo">RSS</div>
          <div>
            <div className="auth-title">Aguardando liberacao</div>
            <div className="auth-subtitle">Seu acesso precisa ser aprovado pelo administrador.</div>
          </div>
        </div>
        <div className="auth-caption">
          Assim que sua conta for liberada, voce podera acessar o sistema completo.
        </div>
        <div className="auth-features">
          <div className="auth-feature">
            <span className="auth-feature-dot" />
            <div>
              <strong>Conta registrada</strong>
              <span>{userEmail || 'Email confirmado'}</span>
            </div>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-dot" />
            <div>
              <strong>Status</strong>
              <span>Em analise pelo administrador.</span>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-card">
        <div className="auth-card-title">Acesso pendente</div>
        <div className="auth-card-subtitle">Voce sera avisado quando liberar.</div>
        <button type="button" className="auth-button" onClick={onLogout}>
          Sair da conta
        </button>
        <div className="auth-card-footer">Se precisar, fale com o administrador.</div>
      </div>
    </div>
  </div>
);

function MainApp({ initialPage }) {
  const siteMatch = window.location.pathname.startsWith('/site/');
  const siteSlug = siteMatch ? window.location.pathname.replace('/site/', '').split('/')[0] : '';
  const isDisplayMode = new URLSearchParams(window.location.search).get('display') === '1';
  const [refreshFeeds, setRefreshFeeds] = useState(false);
  const [page, setPage] = useState(initialPage || 'dashboard');
  const [timelineKey, setTimelineKey] = useState(0);
  const [theme, setTheme] = useState('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [teamAdminEnabled] = useState(false);
  const [teamMemberTag] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [tickerItems, setTickerItems] = useState([]);
  const [tickerConfig, setTickerConfig] = useState({
    speed: 120,
    pauseOnHover: true,
    onlyNew: false,
    enabled: true
  });
  const lastTickerRef = React.useRef('');
  const [contextMenuConfig, setContextMenuConfig] = useState(DEFAULT_CONTEXT_MENU);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, card: null });
  const userPlan = authUser?.plan || 'starter';
  const baseAllowedKeys = PLAN_ACCESS[userPlan] || PLAN_ACCESS.starter;
  const allowedKeys = teamAdminEnabled
    ? baseAllowedKeys
    : baseAllowedKeys.filter((key) => key !== 'team');
  const routeSections = useMemo(() => (
    ROUTE_SECTIONS.map((section) => {
      const items = section.items
        .map((item) => {
          if (item.subItems && item.subItems.length) {
            const subItems = item.subItems.filter((sub) => (
              allowedKeys.includes(sub.key) || allowedKeys.includes(sub.routeKey)
            ));
            if (!allowedKeys.includes(item.key) && subItems.length === 0) {
              return null;
            }
            return { ...item, subItems };
          }
          return allowedKeys.includes(item.key) ? item : null;
        })
        .filter(Boolean);
      return items.length ? { ...section, items } : null;
    }).filter(Boolean)
  ), [allowedKeys]);
  const flatRoutes = useMemo(() => (
    routeSections.flatMap((section) => (
      section.items.flatMap((item) => (item.subItems ? [item, ...item.subItems] : [item]))
    ))
  ), [routeSections]);

  useEffect(() => {
    if (!allowedKeys.includes(page)) {
      setPage(allowedKeys[0] || 'dashboard');
    }
  }, [page, userPlan, allowedKeys]);

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

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = prefersDark ? 'dark' : 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;
    setRuntimeToken(token);
    localStorage.setItem('rss-auth-token', token);
    sessionStorage.setItem('rss-auth-token', token);
    params.delete('token');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    apiFetch(API_BASE + '/auth/me')
      .then(res => res.json())
      .then(data => {
        setAuthUser(data?.user || null);
        if (data?.user?.id) {
          localStorage.setItem('rss-user-id', data.user.id);
        } else {
          localStorage.removeItem('rss-user-id');
        }
      })
      .catch(() => {
        setAuthUser(null);
        localStorage.removeItem('rss-user-id');
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  useEffect(() => {
    const savedConfig = localStorage.getItem('rss-ticker-config');
    if (savedConfig) {
      try {
        setTickerConfig(JSON.parse(savedConfig));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rss-ticker-config', JSON.stringify(tickerConfig));
  }, [tickerConfig]);

  useEffect(() => {
    const stored = localStorage.getItem(CONTEXT_MENU_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setContextMenuConfig(prev => ({
        ...prev,
        ...parsed,
        actions: { ...prev.actions, ...(parsed.actions || {}) },
        cardActions: { ...prev.cardActions, ...(parsed.cardActions || {}) }
      }));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CONTEXT_MENU_KEY, JSON.stringify(contextMenuConfig));
  }, [contextMenuConfig]);

  useEffect(() => {
    const fetchTicker = () => {
      if (!tickerConfig.enabled) return;
      apiFetch(API_BASE + '/aggregate')
        .then(res => res.json())
        .then(data => {
          const items = Array.isArray(data) ? data : [];
          if (tickerConfig.onlyNew && lastTickerRef.current) {
            const latest = lastTickerRef.current;
            const idx = items.findIndex(item => (item.link || item.guid || '') === latest);
            if (idx === 0) {
              setTickerItems([]);
              return;
            }
            if (idx > 0) {
              setTickerItems(items.slice(0, idx));
              if (items[0]) {
                lastTickerRef.current = items[0].link || items[0].guid || '';
              }
              return;
            }
          }
          setTickerItems(items.slice(0, 25));
          if (items[0]) {
            lastTickerRef.current = items[0].link || items[0].guid || '';
          }
        })
        .catch(() => {
          setTickerItems([]);
        });
    };
    fetchTicker();
    const interval = setInterval(fetchTicker, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tickerConfig]);

  const formatTickerTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).format(d);
  };

  useEffect(() => {
    if (!showEvents) return;
    setEventsLoading(true);
    setEventsError('');
    apiFetch(API_BASE + '/events?limit=100')
      .then(res => res.json())
      .then(data => {
        setEvents(Array.isArray(data) ? data : []);
        setEventsLoading(false);
      })
      .catch(() => {
        setEventsError('NÃ£o foi possÃ­vel carregar os eventos.');
        setEventsLoading(false);
      });
  }, [showEvents]);

  const formatEventTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo'
    }).format(d);
  };

  const handleFeedAdded = () => {
    setRefreshFeeds(r => !r);
  };

  const handleConfigSaved = () => {
    setTimelineKey(k => k + 1);
  };

  useEffect(() => {
    const handleDashboardNavigate = (event) => {
      const next = event?.detail;
      if (next) {
        if (!allowedKeys.includes(next)) return;
        setPage(next);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('dashboard:navigate', handleDashboardNavigate);
    return () => window.removeEventListener('dashboard:navigate', handleDashboardNavigate);
  }, [allowedKeys]);

  const handleSelectPage = useCallback((nextPage) => {
    if (!allowedKeys.includes(nextPage)) return;
    setPage(nextPage);
    setSidebarOpen(false);
  }, [allowedKeys]);

  const handleCopyText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // Clipboard may be blocked; ignore.
    }
  };

  const handleLogin = () => {
    const params = new URLSearchParams();
    if (rememberMe) {
      params.set('remember', '1');
    }
    params.set('redirect', '/app');
    params.set('prompt', 'select_account');
    window.location.href = `${API_BASE}/auth/google?${params.toString()}`;
  };

  const handleLogout = async () => {
    try {
      await apiFetch(API_BASE + '/auth/logout', {
        method: 'POST'
      });
    } catch (e) {
      // ignore
    } finally {
      setAuthUser(null);
      localStorage.removeItem('rss-auth-token');
      sessionStorage.removeItem('rss-auth-token');
      localStorage.removeItem('rss-user-id');
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await apiFetch(API_BASE + '/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      setAuthUser(null);
      localStorage.removeItem('rss-auth-token');
      sessionStorage.removeItem('rss-auth-token');
      localStorage.removeItem('rss-user-id');
      const params = new URLSearchParams();
      params.set('redirect', '/app');
      params.set('prompt', 'select_account');
      window.location.href = `${API_BASE}/auth/google?${params.toString()}`;
    }
  };

  const handleContextMenu = (event) => {
    if (!event) return;
    if (!contextMenuConfig.enabled) return;
    const editableTarget = event.target?.closest('input, textarea, [contenteditable="true"]');
    if (editableTarget) {
      return;
    }
    event.preventDefault();
    const menuWidth = 260;
    const menuHeight = 420;
    const maxX = window.innerWidth - menuWidth - 12;
    const maxY = window.innerHeight - menuHeight - 12;
    const x = Math.max(12, Math.min(event.clientX, maxX));
    const y = Math.max(12, Math.min(event.clientY, maxY));
    const cardTarget = event.target?.closest('[data-context-card="true"]');
    const card = cardTarget ? {
      id: cardTarget.dataset.contextId || '',
      url: cardTarget.dataset.contextUrl || '',
      title: cardTarget.dataset.contextTitle || '',
      type: cardTarget.dataset.contextType || '',
      saved: cardTarget.dataset.contextSaved === '1'
    } : null;
    setContextMenu({ visible: true, x, y, card });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => (
      prev.visible ? { ...prev, visible: false, card: null } : prev
    ));
  };

  useEffect(() => {
    if (!contextMenu.visible) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };
    window.addEventListener('click', closeContextMenu);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', closeContextMenu, true);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', closeContextMenu, true);
    };
  }, [contextMenu.visible]);

  useEffect(() => {
    if (!contextMenuConfig.shortcutsEnabled) return undefined;
    const handleShortcuts = (event) => {
      if (!event || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const editableTarget = event.target?.closest('input, textarea, [contenteditable="true"]');
      if (editableTarget) return;
      const key = String(event.key || '').toLowerCase();
      if (!key) return;
      const openEvents = () => setShowEvents(true);
      switch (key) {
        case 'r':
          event.preventDefault();
          window.location.reload();
          break;
        case 't':
          event.preventDefault();
          setTheme(current => (current === 'dark' ? 'light' : 'dark'));
          break;
        case 'm':
          event.preventDefault();
          setSidebarCollapsed((prev) => !prev);
          break;
        case 'd':
          event.preventDefault();
          handleSelectPage('dashboard');
          break;
        case 'l':
          event.preventDefault();
          handleSelectPage('home');
          break;
        case 's':
          event.preventDefault();
          handleSelectPage('saved');
          break;
        case 'i':
          event.preventDefault();
          handleSelectPage('influencers');
          break;
        case 'g':
          event.preventDefault();
          handleSelectPage('rss-generator');
          break;
        case 'e':
          event.preventDefault();
          openEvents();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [contextMenuConfig.shortcutsEnabled, handleSelectPage]);

  const activeRoute = flatRoutes.find((route) => route.key === page)
    || flatRoutes[0]
    || { key: 'dashboard', label: 'Dashboard' };
  const sidebarPadding = sidebarCollapsed ? 'md:pl-[84px]' : 'md:pl-[260px]';

  if (siteMatch && siteSlug) {
    return <PublicSite slug={siteSlug} />;
  }

  if (isDisplayMode) {
    return <DisplayMode />;
  }

  if (authLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-shell">
          <div className="auth-card">
            <div className="auth-card-title">Carregando...</div>
            <div className="auth-card-subtitle">Verificando sessao.</div>
          </div>
        </div>
      </div>
    );
  }

  if (!authLoading && authUser && authUser.approved === false) {
    return (
      <PendingApproval
        onLogout={handleLogout}
        userEmail={authUser.email}
      />
    );
  }

  if (!authUser) {
    return (
      <div className="auth-screen">
        <div className="auth-shell">
          <div className="auth-card">
            <div className="auth-card-title">Entrar no sistema</div>
            <div className="auth-card-subtitle">Use sua conta Google para autenticar.</div>
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Manter conectado
            </label>
            <button type="button" className="auth-button" onClick={handleLogin}>
              <span className="auth-google-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M21.35 11.1H12v2.9h5.35c-.24 1.3-1.48 3.82-5.35 3.82-3.22 0-5.85-2.66-5.85-5.92S8.78 5.98 12 5.98c1.83 0 3.06.78 3.76 1.46l2.56-2.46C16.69 3.44 14.58 2.5 12 2.5 7.73 2.5 4.25 6.03 4.25 10.9S7.73 19.3 12 19.3c4.1 0 6.83-2.88 6.83-6.94 0-.47-.05-.82-.13-1.26Z"
                  />
                  <path
                    fill="#34A853"
                    d="M5.9 14.22 5.06 14.9 3.2 16.26C4.33 18.44 6.96 19.9 10 19.9c2.58 0 4.69-.85 6.25-2.3l-2.6-2.02c-.7.48-1.64.82-3.65.82-2.6 0-4.8-1.74-5.57-4.11Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.2 7.98c-.27.83-.42 1.72-.42 2.62s.15 1.8.42 2.62l2.7-2.08-.08-.56.08-.56Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M10 5.02c1.4 0 2.64.48 3.63 1.4l2.63-2.54C14.68 2.24 12.57 1.5 10 1.5 6.96 1.5 4.33 2.96 3.2 5.14l2.7 2.08C6.57 5.86 7.4 5.02 10 5.02Z"
                  />
                </svg>
              </span>
              Continuar com Google
            </button>
            <div className="auth-card-footer">Ao continuar, voce aceita nossos termos.</div>
          </div>
        </div>
      </div>
    );
  }

  const contextActions = [
    {
      key: 'reload',
      label: 'Atualizar pagina',
      enabled: contextMenuConfig.actions.refresh,
      onClick: () => window.location.reload()
    },
    {
      key: 'copy-url',
      label: 'Copiar URL da pagina',
      enabled: contextMenuConfig.actions.copyUrl,
      onClick: () => handleCopyText(window.location.href)
    },
    {
      key: 'copy-title',
      label: 'Copiar nome da secao',
      enabled: contextMenuConfig.actions.copyTitle,
      onClick: () => handleCopyText(activeRoute.label)
    },
    {
      key: 'toggle-theme',
      label: theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo noturno',
      enabled: contextMenuConfig.actions.toggleTheme,
      onClick: () => setTheme(current => (current === 'dark' ? 'light' : 'dark'))
    },
    {
      key: 'toggle-sidebar',
      label: sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral',
      enabled: contextMenuConfig.actions.toggleSidebar,
      onClick: () => setSidebarCollapsed((prev) => !prev)
    },
    {
      key: 'events',
      label: 'Abrir eventos do sistema',
      enabled: contextMenuConfig.actions.events,
      onClick: () => setShowEvents(true)
    },
    {
      key: 'broadcast',
      label: 'Abrir modo transmissao',
      enabled: contextMenuConfig.actions.broadcast,
      onClick: () => window.open('/app?display=1', '_blank', 'noopener,noreferrer')
    }
  ].filter(action => action.enabled);

  const cardActions = [];
  if (contextMenu.card) {
    const card = contextMenu.card;
    if (card.url && contextMenuConfig.cardActions.openLink) {
      cardActions.push({
        key: 'open-link',
        label: 'Abrir link',
        onClick: () => window.open(card.url, '_blank', 'noopener,noreferrer')
      });
    }
    if (card.url && contextMenuConfig.cardActions.copyLink) {
      cardActions.push({
        key: 'copy-link',
        label: 'Copiar link',
        onClick: () => handleCopyText(card.url)
      });
    }
    if (card.title && contextMenuConfig.cardActions.copyTitle) {
      cardActions.push({
        key: 'copy-title-card',
        label: 'Copiar titulo',
        onClick: () => handleCopyText(card.title)
      });
    }
    if (card.type === 'timeline' && contextMenuConfig.cardActions.saveToggle) {
      cardActions.push({
        key: 'save-toggle',
        label: card.saved ? 'Remover dos salvos' : 'Salvar item',
        onClick: () => {
          window.dispatchEvent(new CustomEvent('context:timeline', {
            detail: { action: 'save', id: card.id }
          }));
        }
      });
    }
    if (card.type === 'timeline' && contextMenuConfig.cardActions.generateText) {
      cardActions.push({
        key: 'generate-text',
        label: 'Gerar texto (IA)',
        onClick: () => {
          window.dispatchEvent(new CustomEvent('context:timeline', {
            detail: { action: 'rewrite', id: card.id }
          }));
        }
      });
    }
    if (card.type === 'saved' && contextMenuConfig.cardActions.removeSaved) {
      cardActions.push({
        key: 'remove-saved',
        label: 'Remover dos salvos',
        onClick: () => {
          window.dispatchEvent(new CustomEvent('context:saved', {
            detail: { action: 'remove', id: card.id }
          }));
        }
      });
    }
  }

  const contextShortcuts = [
    { key: 'R', label: 'Atualizar pagina' },
    { key: 'T', label: 'Alternar tema' },
    { key: 'M', label: 'Alternar menu lateral' },
    { key: 'D', label: 'Dashboard' },
    { key: 'L', label: 'Linha do tempo' },
    { key: 'S', label: 'Salvos' },
    { key: 'I', label: 'Influenciadores' },
    { key: 'G', label: 'Gerador RSS' },
    { key: 'E', label: 'Eventos' }
  ];

  const contextNavigation = routeSections.flatMap((section) => (
    section.items.map((item) => ({ key: item.key, label: item.label }))
  ));

  return (
    <HighlightProvider>
      <Highlighter />
      <div className="min-h-screen" onContextMenu={handleContextMenu}>
      <Sidebar
        routes={routeSections}
        activeKey={page}
        onSelect={handleSelectPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        authUser={authUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSwitchAccount={handleSwitchAccount}
        appVersion={APP_VERSION}
        teamMemberTag={teamMemberTag}
      />
      <div className={`min-h-screen bg-slate-50 text-slate-900 transition-[padding] duration-200 ${sidebarPadding}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/90 p-2 text-slate-600 shadow-sm transition hover:bg-white md:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu size={20} />
              </button>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Dashboard
                </div>
                <div className="text-2xl font-semibold text-slate-900">{activeRoute.label}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                onClick={() => setShowEvents(true)}
                aria-label="Abrir eventos do sistema"
              >
                <Bell size={18} />
                <span className="hidden sm:inline">Eventos</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                onClick={() => setTheme(current => (current === 'dark' ? 'light' : 'dark'))}
                aria-label="Alternar modo noturno"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span className="hidden sm:inline">{theme === 'dark' ? 'Modo claro' : 'Modo noturno'}</span>
              </button>
            </div>
          </div>
          {tickerConfig.enabled && (
            <div
              className={`ticker-bar ${tickerConfig.pauseOnHover ? 'ticker-pause' : ''}`}
              style={{ '--ticker-speed': `${tickerConfig.speed}s` }}
            >
              <div className="ticker-label">Ãšltimas:</div>
              <div className="ticker-track">
                <div className="ticker-content">
              {tickerItems.map((item, idx) => (
                <a key={`a-${idx}`} href={item.link} target="_blank" rel="noopener noreferrer" className="ticker-item">
                  {getFaviconUrl(item.feedUrl || item.link) && (
                    <img
                      className="ticker-favicon"
                      src={getFaviconUrl(item.feedUrl || item.link)}
                      alt=""
                      onError={handleFaviconError}
                    />
                  )}
                  <span className="ticker-feed">{item.feedName || 'Feed'}</span>
                  <span className="ticker-title">{item.title}</span>
                  <span className="ticker-time">{formatTickerTime(item.pubDate || item.isoDate)}</span>
                </a>
              ))}
            </div>
            <div className="ticker-content" aria-hidden="true">
              {tickerItems.map((item, idx) => (
                <span key={`b-${idx}`} className="ticker-item">
                  {getFaviconUrl(item.feedUrl || item.link) && (
                    <img
                      className="ticker-favicon"
                      src={getFaviconUrl(item.feedUrl || item.link)}
                      alt=""
                      onError={handleFaviconError}
                    />
                  )}
                  <span className="ticker-feed">{item.feedName || 'Feed'}</span>
                  <span className="ticker-title">{item.title}</span>
                  <span className="ticker-time">{formatTickerTime(item.pubDate || item.isoDate)}</span>
                </span>
              ))}
                </div>
              </div>
            </div>
          )}
        </header>

        <main className="px-6 pb-16 pt-6 md:px-10">
          {page === 'dashboard' && <DashboardPage />}
          {page === 'home' && <Timeline key={timelineKey} />}
          {page === 'saved' && <SavedPage />}
          {page === 'highlights' && <HighlightsPage />}
          {page === 'summary' && <SummaryPage />}
          {page === 'trends' && <TrendsPage />}
          {page === 'trends-terms' && <TrendsTermsPage />}
          {page === 'trends-events' && <TrendsEventsPage />}
          {page === 'influencers' && <InfluencersPage />}
          {page === 'repo' && <FeedRepositoryPage />}
          {page === 'team' && <TeamPage />}
          {page === 'rss-generator' && <RssGeneratorPage />}
          {page === 'watch' && <WatchPage />}
          {page === 'fact-check' && <FactCheckPage />}
          {page === 'spaces-live' && <SpacesLivePage />}
          {page === 'config' && (
            <ConfigPage
              onFeedAdded={handleFeedAdded}
              onConfigSaved={handleConfigSaved}
              refreshFeeds={refreshFeeds}
              tickerConfig={tickerConfig}
              onTickerConfigChange={setTickerConfig}
              contextMenuConfig={contextMenuConfig}
              onContextMenuConfigChange={setContextMenuConfig}
            />
          )}
        </main>
      </div>
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onContextMenu={(event) => event.preventDefault()}
        >
          {contextActions.length > 0 && (
            <div className="context-menu-section">
              {contextActions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="context-menu-item"
                  onClick={() => {
                    item.onClick();
                    closeContextMenu();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {cardActions.length > 0 && (
            <>
              <div className="context-menu-divider" />
              <div className="context-menu-section">
                <div className="context-menu-title">Acoes do item</div>
                {contextMenu.card?.title && (
                  <div className="context-menu-card-title">{contextMenu.card.title}</div>
                )}
                {cardActions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="context-menu-item"
                    onClick={() => {
                      item.onClick();
                      closeContextMenu();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {contextMenuConfig.showShortcuts && (
            <>
              <div className="context-menu-divider" />
              <div className="context-menu-section">
                <div className="context-menu-title">Atalhos</div>
                <div className="context-menu-shortcuts">
                  {contextShortcuts.map((item) => (
                    <div key={item.key} className="context-menu-shortcut">
                      <span className="context-menu-shortcut-key">{item.key}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="context-menu-divider" />
          <div className="context-menu-section">
            <div className="context-menu-title">Ir para</div>
            {contextNavigation.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`context-menu-item ${page === item.key ? 'is-active' : ''}`}
                onClick={() => {
                  handleSelectPage(item.key);
                  closeContextMenu();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

{showEvents && (
        <div className="event-overlay" role="dialog" aria-modal="true">
          <div className="event-modal">
            <div className="event-modal-header">
              <h3>Eventos do sistema</h3>
              <button className="event-close" onClick={() => setShowEvents(false)} aria-label="Fechar">
                X
              </button>
            </div>
            <div className="event-modal-body">
              {eventsLoading && <div className="event-loading">Carregando eventos...</div>}
              {eventsError && <div className="event-error">{eventsError}</div>}
              {!eventsLoading && !eventsError && events.length === 0 && (
                <div className="event-empty">Nenhum evento registrado.</div>
              )}
              {!eventsLoading && !eventsError && events.length > 0 && (
                <ul className="event-list">
                  {events.map(event => (
                    <li key={event.id} className={`event-item is-${event.level || 'info'}`}>
                      <div className="event-item-header">
                        <span className="event-item-level">{event.level || 'info'}</span>
                        <span className="event-item-time">{formatEventTime(event.timestamp)}</span>
                      </div>
                      <div className="event-item-message">{event.message}</div>
                      {event.detail && <div className="event-item-detail">{event.detail}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="event-modal-footer">
              <button
                className="event-refresh"
                onClick={() => {
                  setEventsLoading(true);
                  setEventsError('');
                  apiFetch(API_BASE + '/events?limit=100')
                    .then(res => res.json())
                    .then(data => {
                      setEvents(Array.isArray(data) ? data : []);
                      setEventsLoading(false);
                    })
                    .catch(() => {
                      setEventsError('Nao foi possivel carregar os eventos.');
                      setEventsLoading(false);
                    });
                }}
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </HighlightProvider>
  );

}

function App() {
  const pathname = window.location.pathname;
  if (pathname.startsWith('/admin')) {
    return <AdminApp />;
  }
  if (pathname.startsWith('/labs/x-rss')) {
    return <XGeneratorPage />;
  }
  if (pathname.startsWith('/team')) {
    return <MainApp initialPage="team" />;
  }
  if (pathname.startsWith('/app')) {
    return <MainApp initialPage="dashboard" />;
  }
  if (pathname.startsWith('/noticias')) {
    return <PublicWatchSite />;
  }
  if (pathname.startsWith('/site/')) {
    const slug = pathname.replace('/site/', '').split('/')[0];
    return <PublicSite slug={slug} />;
  }
  return <MainApp initialPage="dashboard" />;
}

export default App;


























