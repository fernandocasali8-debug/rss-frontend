import React from 'react';

import FeedForm from './FeedForm';
import { API_BASE, apiFetch } from './api';
import FeedConfigList from './FeedConfigList';
import './ConfigPage.css';

const DEFAULT_TICKER = {
  speed: 40,
  pauseOnHover: true,
  onlyNew: false,
  enabled: true
};

const DEFAULT_DISPLAY = {
  refreshMs: 5 * 60 * 1000,
  displayMs: 12 * 1000,
  maxQueue: 60,
  tickerSpeed: 50,
  title: 'Leitor de RSS',
  subtitle: 'Ultimas atualizacoes em sequencia'
};

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

const DEFAULT_WEATHER = {
  enabled: true,
  insertEvery: 6,
  refreshMs: 5 * 60 * 1000,
  cities: [
    'São Paulo',
    'Rio de Janeiro',
    'Brasília',
    'Belo Horizonte',
    'Curitiba',
    'Porto Alegre',
    'Salvador',
    'Recife',
    'Fortaleza',
    'Manaus'
  ]
};

const DEFAULT_CITIES = DEFAULT_WEATHER.cities.slice();
const mergeUnique = (base, extra) => Array.from(new Set([...base, ...extra])).filter(Boolean);

const DEFAULT_AUTOMATION = {
  credentials: {
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    accessSecret: ''
  },
  rules: {
    enabled: false,
    feedIds: [],
    useWatchTopics: false,
    useAiSummary: false,
    aiMode: 'twitter_cta',
    maxChars: 4000,
    maxItemsPerPost: 5,
    requireWords: [],
    blockWords: [],
    onlyWithLink: true,
    maxPerDay: 5,
    minIntervalMinutes: 30,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00'
    },
    template: '{title} - {source} {date} {time} {link}'
  }
};


const DEFAULT_EMAIL = {
  enabled: false,
  from: '',
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: ''
  },
  summary: {
    enabled: false,
    recipients: ''
  },
  alerts: {
    enabled: false,
    recipients: '',
    criticalKeywords: ''
  }
};

const normalizeEmailConfig = (data = {}) => {
  const summary = data.summary || {};
  const alerts = data.alerts || {};
  return {
    ...DEFAULT_EMAIL,
    ...data,
    smtp: { ...DEFAULT_EMAIL.smtp, ...(data.smtp || {}) },
    summary: {
      ...DEFAULT_EMAIL.summary,
      ...summary,
      recipients: Array.isArray(summary.recipients)
        ? summary.recipients.join(', ')
        : (summary.recipients || '')
    },
    alerts: {
      ...DEFAULT_EMAIL.alerts,
      ...alerts,
      recipients: Array.isArray(alerts.recipients)
        ? alerts.recipients.join(', ')
        : (alerts.recipients || ''),
      criticalKeywords: Array.isArray(alerts.criticalKeywords)
        ? alerts.criticalKeywords.join(', ')
        : (alerts.criticalKeywords || '')
    }
  };
};

const DEFAULT_TELEGRAM = {
  enabled: false,
  botToken: '',
  chatId: '',
  template: '{title}\n{link}',
  rules: {
    feedIds: [],
    requireWords: [],
    blockWords: [],
    onlyWithLink: true,
    maxPerDay: 20,
    minIntervalMinutes: 10
  }
};

const DEFAULT_WHATSAPP = {
  enabled: false,
  accessToken: '',
  phoneNumberId: '',
  wabaId: '',
  recipientNumber: '',
  templateName: '',
  templateLanguage: 'pt_BR',
  rules: {
    feedIds: [],
    requireWords: [],
    blockWords: [],
    onlyWithLink: true,
    maxPerDay: 10,
    minIntervalMinutes: 60
  }
};


const DEFAULT_TELEGRAM_FEEDS = {
  enabled: false,
  botToken: '',
  feeds: []
};

const DEFAULT_AI = {
  enabled: false,
  provider: 'openai',
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    maxChars: 600
  },
  gemini: {
    apiKey: '',
    model: 'gemini-1.5-flash'
  },
  copilot: {
    apiKey: '',
    baseUrl: '',
    model: 'gpt-4o-mini'
  },
  images: {
    enabled: false,
    provider: 'unsplash',
    unsplash: {
      accessKey: '',
      perPage: 6,
      orientation: 'landscape'
    }
  }
};

const DEFAULT_TRENDS = {
  enabled: false,
  geo: 'BR',
  maxItems: 10,
  refreshMinutes: 10
};

const DEFAULT_YOUTUBE = {
  enabled: false,
  apiKey: '',
  maxResults: 6,
  region: 'BR',
  safeSearch: 'moderate'
};

const DEFAULT_SITE = {
  slug: 'meu-site',
  title: 'Noticias em destaque',
  subtitle: 'Atualizacoes automaticas do leitor de RSS',
  primaryColor: '#0f172a',
  accentColor: '#f97316',
  backgroundColor: '#f5f1ea',
  surfaceColor: '#ffffff',
  textColor: '#1f2937',
  themeMode: 'dark',
  fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  automationEnabled: true,
  showTicker: true,
  maxItems: 80,
  menuLinks: [{ label: 'Inicio', url: '/' }],
  tags: [],
  rules: {
    feedIds: [],
    requireWords: [],
    blockWords: [],
    onlyWithLink: true
  }
};

const FONT_OPTIONS = [
  { label: 'System UI', value: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' },
  { label: 'Poppins', value: '"Poppins", "Segoe UI", sans-serif' },
  { label: 'Montserrat', value: '"Montserrat", "Segoe UI", sans-serif' },
  { label: 'Merriweather', value: '"Merriweather", Georgia, serif' },
  { label: 'Playfair Display', value: '"Playfair Display", "Times New Roman", serif' }
];

export default function ConfigPage({
  onFeedAdded,
  onConfigSaved,
  refreshFeeds,
  tickerConfig = DEFAULT_TICKER,
  onTickerConfigChange,
  contextMenuConfig = DEFAULT_CONTEXT_MENU,
  onContextMenuConfigChange
}) {
  const [displayConfig, setDisplayConfig] = React.useState(DEFAULT_DISPLAY);
  const [weatherConfig, setWeatherConfig] = React.useState(DEFAULT_WEATHER);
  const [automation, setAutomation] = React.useState(DEFAULT_AUTOMATION);
  const [automationSaving, setAutomationSaving] = React.useState(false);
  const [automationMessage, setAutomationMessage] = React.useState('');
  const [automationTesting, setAutomationTesting] = React.useState(false);
  const [automationPreview, setAutomationPreview] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('feeds');
  const [alerts, setAlerts] = React.useState({
    enabled: false,
    keywords: [],
    matchAll: false,
    matchTitleOnly: false,
    feedIds: []
  });
  const [alertsMessage, setAlertsMessage] = React.useState('');
  const [alertsSaving, setAlertsSaving] = React.useState(false);
  const [summaryConfig, setSummaryConfig] = React.useState({
    enabled: false,
    time: '08:00',
    maxItems: 10,
    lookbackHours: 24
  });
  const [summaryMessage, setSummaryMessage] = React.useState('');
  const [summaryPreview, setSummaryPreview] = React.useState(null);
  const [tagsConfig, setTagsConfig] = React.useState({ enabled: true, rules: [] });
  const [tagsMessage, setTagsMessage] = React.useState('');
  const [aiConfig, setAiConfig] = React.useState(DEFAULT_AI);
  const [aiMessage, setAiMessage] = React.useState('');
  const [aiSaving, setAiSaving] = React.useState(false);
  const [telegramConfig, setTelegramConfig] = React.useState(DEFAULT_TELEGRAM);
  const [telegramFeedsConfig, setTelegramFeedsConfig] = React.useState(DEFAULT_TELEGRAM_FEEDS);
  const [telegramMessage, setTelegramMessage] = React.useState('');
  const [telegramFeedsMessage, setTelegramFeedsMessage] = React.useState('');
  const [telegramSaving, setTelegramSaving] = React.useState(false);
  const [telegramFeedsSaving, setTelegramFeedsSaving] = React.useState(false);
  const [telegramTesting, setTelegramTesting] = React.useState(false);
  const [telegramPreview, setTelegramPreview] = React.useState(null);
  const [telegramHelpOpen, setTelegramHelpOpen] = React.useState(false);
  const [whatsappConfig, setWhatsappConfig] = React.useState(DEFAULT_WHATSAPP);
  const [emailConfig, setEmailConfig] = React.useState(DEFAULT_EMAIL);
  const [emailMessage, setEmailMessage] = React.useState('');
  const [emailSaving, setEmailSaving] = React.useState(false);
  const [emailTestTo, setEmailTestTo] = React.useState('');
  const [emailTesting, setEmailTesting] = React.useState(false);
  const [whatsappMessage, setWhatsappMessage] = React.useState('');
  const [whatsappSaving, setWhatsappSaving] = React.useState(false);
  const [whatsappTesting, setWhatsappTesting] = React.useState(false);
  const [whatsappPreview, setWhatsappPreview] = React.useState(null);
  const [whatsappHelpOpen, setWhatsappHelpOpen] = React.useState(false);
  const [trendsConfig, setTrendsConfig] = React.useState(DEFAULT_TRENDS);
  const [sheetsStatus, setSheetsStatus] = React.useState({ connected: false, spreadsheetId: '' });
  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = React.useState('');
  const [sheetsMessage, setSheetsMessage] = React.useState('');
  const [, setSheetsLoading] = React.useState(false);
  const [sheetsExporting, setSheetsExporting] = React.useState(false);
  const [sheetsPeriod, setSheetsPeriod] = React.useState('24h');
  const [driveStatus, setDriveStatus] = React.useState({
    connected: false,
    rootFolderId: '',
    clients: [],
    lastExportAt: '',
    lastBackupAt: ''
  });
  const [driveMessage, setDriveMessage] = React.useState('');
  const [driveClientName, setDriveClientName] = React.useState('');
  const [driveBusy, setDriveBusy] = React.useState(false);
  const [trendsMessage, setTrendsMessage] = React.useState('');
  const [trendsSaving, setTrendsSaving] = React.useState(false);
  const [youtubeConfig, setYoutubeConfig] = React.useState(DEFAULT_YOUTUBE);
  const [youtubeMessage, setYoutubeMessage] = React.useState('');
  const [youtubeSaving, setYoutubeSaving] = React.useState(false);
  const [siteConfig, setSiteConfig] = React.useState(DEFAULT_SITE);
  const [siteMessage, setSiteMessage] = React.useState('');
  const [siteSaving, setSiteSaving] = React.useState(false);
  const [sitePosts, setSitePosts] = React.useState([]);
  const [sitePostsLoading, setSitePostsLoading] = React.useState(false);
  const [sitePostsError, setSitePostsError] = React.useState('');

  const updateTicker = (next) => {
    if (!onTickerConfigChange) return;
    onTickerConfigChange(prev => ({ ...prev, ...next }));
  };

  const updateContextMenu = (next) => {
    if (!onContextMenuConfigChange) return;
    onContextMenuConfigChange(prev => ({
      ...prev,
      ...next,
      actions: { ...prev.actions, ...(next.actions || {}) },
      cardActions: { ...prev.cardActions, ...(next.cardActions || {}) }
    }));
  };

  const updateContextAction = (key, value) => {
    updateContextMenu({ actions: { [key]: value } });
  };

  const updateContextCardAction = (key, value) => {
    updateContextMenu({ cardActions: { [key]: value } });
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('rss-display-config');
    if (saved) {
      try {
        setDisplayConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('rss-display-config', JSON.stringify(displayConfig));
  }, [displayConfig]);

  React.useEffect(() => {
    const saved = localStorage.getItem('rss-weather-config');
    if (saved) {
      try {
        setWeatherConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('rss-weather-config', JSON.stringify(weatherConfig));
  }, [weatherConfig]);

  React.useEffect(() => {
    apiFetch(API_BASE + '/automation')
      .then(res => res.json())
      .then(data => {
        setAutomation({
          ...DEFAULT_AUTOMATION,
          ...data,
          credentials: { ...DEFAULT_AUTOMATION.credentials, ...(data.credentials || {}) },
          rules: { ...DEFAULT_AUTOMATION.rules, ...(data.rules || {}) }
        });
      })
      .catch(() => {
        // ignore
      });
  }, []);

  React.useEffect(() => {
    apiFetch(API_BASE + '/alerts')
      .then(res => res.json())
      .then(data => {
        setAlerts(prev => ({ ...prev, ...data }));
      })
      .catch(() => {
        // ignore
      });
  }, []);

  React.useEffect(() => {
    apiFetch(API_BASE + '/summary/config')
      .then(res => res.json())
      .then(data => {
        setSummaryConfig(prev => ({ ...prev, ...data }));
      })
      .catch(() => {
        // ignore
      });
  }, []);

  React.useEffect(() => {
    apiFetch(API_BASE + '/email/config')
      .then(res => res.json())
      .then(data => {
        setEmailConfig(normalizeEmailConfig(data));
      })
      .catch(() => {
        // ignore
      });
  }, []);


  React.useEffect(() => {
    apiFetch(API_BASE + '/ai/config')
      .then(res => res.json())
      .then(data => {
        setAiConfig(prev => ({ ...prev, ...data }));
      })
      .catch(() => {
        // ignore
      });
  }, []);

  React.useEffect(() => {
    apiFetch(API_BASE + '/telegram')
      .then(res => res.json())
      .then(data => {
        setTelegramConfig(prev => ({ ...prev, ...data }));
      })
      .catch(() => {
        // ignore
      });
  }, []);

  React.useEffect(() => {
    apiFetch(API_BASE + '/telegram/feeds')
      .then(res => res.json())
      .then(data => {
        setTelegramFeedsConfig(prev => ({ ...prev, ...data }));
      })
      .catch(() => {
        // ignore
      });
  }, []);


  React.useEffect(() => {
    apiFetch(API_BASE + '/whatsapp')
      .then(res => res.json())
      .then(data => {
        setWhatsappConfig(prev => ({ ...prev, ...data }));
      })
      .catch(() => {
        // ignore
      });
  }, []);

  React.useEffect(() => {
    apiFetch(API_BASE + '/trends/config')
      .then(res => res.json())
      .then(data => {
        setTrendsConfig(prev => ({ ...prev, ...data }));
      })
      .catch(() => {
        // ignore
      });
  }, []);

  React.useEffect(() => {
    apiFetch(API_BASE + '/youtube/config')
      .then(res => res.json())
      .then(data => {
        setYoutubeConfig(prev => ({ ...prev, ...data }));
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const fetchSitePosts = React.useCallback(async (slugValue) => {
    const slug = slugValue || siteConfig.slug;
    if (!slug) return;
    setSitePostsLoading(true);
    setSitePostsError('');
    try {
      const res = await apiFetch(`${API_BASE}/site/${slug}/posts`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setSitePosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (err) {
      setSitePostsError('N?o foi poss?vel carregar o log.');
    } finally {
      setSitePostsLoading(false);
    }
  }, [siteConfig.slug]);

  React.useEffect(() => {
    apiFetch(API_BASE + '/site/config')
      .then(res => res.json())
      .then(data => {
        setSiteConfig(prev => ({ ...prev, ...data }));
        if (data && data.slug) {
          fetchSitePosts(data.slug);
        }
      })
      .catch(() => {
        // ignore
      });
  }, [fetchSitePosts]);

  React.useEffect(() => {
    apiFetch(API_BASE + '/tags')
      .then(res => res.json())
      .then(data => setTagsConfig(data))
      .catch(() => {
        // ignore
      });
  }, []);

  const saveAlerts = async () => {
    setAlertsSaving(true);
    setAlertsMessage('');
    try {
      const res = await apiFetch(API_BASE + '/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alerts)
      });
      if (!res.ok) throw new Error('Falha ao salvar alertas.');
      setAlertsMessage('Alertas salvos com sucesso.');
    } catch (err) {
      setAlertsMessage('Não foi possível salvar os alertas.');
    } finally {
      setAlertsSaving(false);
    }
  };

  const saveSummaryConfig = async () => {
    setSummaryMessage('');
    try {
      const res = await apiFetch(API_BASE + '/summary/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryConfig)
      });
      if (!res.ok) throw new Error();
      setSummaryMessage('Resumo diário salvo.');
    } catch (err) {
      setSummaryMessage('Não foi possível salvar o resumo.');
    }
  };

  const previewSummary = async () => {
    setSummaryPreview(null);
    try {
      const res = await apiFetch(API_BASE + '/summary/preview');
      const data = await res.json();
      setSummaryPreview(data);
    } catch (err) {
      setSummaryPreview({ ok: false, error: 'Falha ao gerar preview.' });
    }
  };

  const saveTags = async () => {
    setTagsMessage('');
    try {
      const res = await apiFetch(API_BASE + '/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagsConfig)
      });
      if (!res.ok) throw new Error();
      setTagsMessage('Tags salvas.');
    } catch (err) {
      setTagsMessage('Não foi possível salvar as tags.');
    }
  };

  const saveTrendsConfig = async () => {
    setTrendsSaving(true);
    setTrendsMessage('');
    try {
      const res = await apiFetch(API_BASE + '/trends/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trendsConfig)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao salvar Trends.');
      }
      setTrendsMessage('Trends salvo.');
    } catch (err) {
      setTrendsMessage(err.message || 'N?o foi poss?vel salvar o Trends.');
    } finally {
      setTrendsSaving(false);
    }
  };

  const saveYoutubeConfig = async () => {
    setYoutubeSaving(true);
    setYoutubeMessage('');
    try {
      const res = await apiFetch(API_BASE + '/youtube/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(youtubeConfig)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao salvar YouTube.');
      }
      setYoutubeMessage('YouTube salvo.');
    } catch (err) {
      setYoutubeMessage(err.message || 'Nao foi possivel salvar o YouTube.');
    } finally {
      setYoutubeSaving(false);
    }
  };

  const saveWhatsAppConfig = async () => {
    setWhatsappSaving(true);
    setWhatsappMessage('');
    try {
      const res = await apiFetch(API_BASE + '/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappConfig)
      });
      if (!res.ok) throw new Error();
      setWhatsappMessage('WhatsApp salvo.');
    } catch (err) {
      setWhatsappMessage('N?o foi poss?vel salvar o WhatsApp.');
    } finally {
      setWhatsappSaving(false);
    }
  };

  const testWhatsApp = async () => {
    setWhatsappTesting(true);
    setWhatsappMessage('');
    try {
      const res = await apiFetch(API_BASE + '/whatsapp/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Falha ao enviar teste.');
      }
      setWhatsappMessage('Teste enviado no WhatsApp.');
    } catch (err) {
      setWhatsappMessage(`N?o foi poss?vel enviar o teste. ${err.message || ''}`.trim());
    } finally {
      setWhatsappTesting(false);
    }
  };

  const previewWhatsApp = async () => {
    setWhatsappPreview(null);
    setWhatsappMessage('');
    try {
      const res = await apiFetch(API_BASE + '/whatsapp/preview');
      const data = await res.json();
      if (!res.ok) throw new Error();
      setWhatsappPreview(data);
    } catch (err) {
      setWhatsappPreview({ ok: false });
    }
  };


  const saveTelegramFeedsConfig = async () => {
    setTelegramFeedsSaving(true);
    setTelegramFeedsMessage('');
    try {
      const res = await apiFetch(API_BASE + '/telegram/feeds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramFeedsConfig)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao salvar Telegram feeds.');
      }
      setTelegramFeedsMessage('Telegram feeds salvo.');
    } catch (err) {
      setTelegramFeedsMessage(err.message || 'Nao foi possivel salvar Telegram feeds.');
    } finally {
      setTelegramFeedsSaving(false);
    }
  };

  const addTelegramFeed = () => {
    const id = `tg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    setTelegramFeedsConfig(prev => ({
      ...prev,
      feeds: [...prev.feeds, { id, name: '', chatId: '', showOnTimeline: true }]
    }));
  };

  const updateTelegramFeed = (id, changes) => {
    setTelegramFeedsConfig(prev => ({
      ...prev,
      feeds: prev.feeds.map(feed => (feed.id === id ? { ...feed, ...changes } : feed))
    }));
  };

  const removeTelegramFeed = (id) => {
    setTelegramFeedsConfig(prev => ({
      ...prev,
      feeds: prev.feeds.filter(feed => feed.id !== id)
    }));
  };

  const saveTelegramConfig = async () => {
    setTelegramSaving(true);
    setTelegramMessage('');
    try {
      const res = await apiFetch(API_BASE + '/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramConfig)
      });
      if (!res.ok) throw new Error();
      setTelegramMessage('Telegram salvo.');
    } catch (err) {
      setTelegramMessage('N?o foi poss?vel salvar o Telegram.');
    } finally {
      setTelegramSaving(false);
    }
  };

  const testTelegram = async () => {
    setTelegramTesting(true);
    setTelegramMessage('');
    try {
      const res = await apiFetch(API_BASE + '/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Falha ao enviar teste.');
      }
      setTelegramMessage('Teste enviado no Telegram.');
    } catch (err) {
      setTelegramMessage(`N?o foi poss?vel enviar o teste. ${err.message || ''}`.trim());
    } finally {
      setTelegramTesting(false);
    }
  };

  const previewTelegram = async () => {
    setTelegramPreview(null);
    setTelegramMessage('');
    try {
      const res = await apiFetch(API_BASE + '/telegram/preview');
      const data = await res.json();
      if (!res.ok) throw new Error();
      setTelegramPreview(data);
    } catch (err) {
      setTelegramPreview({ ok: false });
    }
  };

  const saveAiConfig = async () => {
    setAiSaving(true);
    setAiMessage('');
    try {
      const res = await apiFetch(API_BASE + '/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig)
      });
      if (!res.ok) throw new Error();
      setAiMessage('IA salva.');
    } catch (err) {
      setAiMessage('Não foi possível salvar a IA.');
    } finally {
      setAiSaving(false);
    }
  };

  const saveSiteConfig = async () => {
    setSiteSaving(true);
    setSiteMessage('');
    try {
      const res = await apiFetch(API_BASE + '/site/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteConfig)
      });
      if (!res.ok) throw new Error();
      setSiteMessage('Mini site salvo.');
      fetchSitePosts(siteConfig.slug);
    } catch (err) {
      setSiteMessage('Não foi possível salvar o mini site.');
    } finally {
      setSiteSaving(false);
    }
  };

  const saveAutomation = async () => {
    setAutomationSaving(true);
    setAutomationMessage('');
    try {
      const res = await apiFetch(API_BASE + '/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automation)
      });
      if (!res.ok) throw new Error('Falha ao salvar automação.');
      setAutomationMessage('Automação salva com sucesso.');
    } catch (err) {
      setAutomationMessage('Não foi possível salvar a automação.');
    } finally {
      setAutomationSaving(false);
    }
  };

  const testAutomation = async () => {
    setAutomationTesting(true);
    setAutomationMessage('');
    try {
      const res = await apiFetch(API_BASE + '/automation/test', { method: 'POST' });
      if (!res.ok) {
        let detail = '';
        try {
          const data = await res.json();
          detail = data?.error || '';
        } catch (e) {
          detail = '';
        }
        throw new Error(detail || 'Falha ao testar automação.');
      }
      setAutomationMessage('Post de teste enviado com sucesso.');
    } catch (err) {
      setAutomationMessage(`Não foi possível enviar o post de teste. ${err.message || ''}`.trim());
    } finally {
      setAutomationTesting(false);
    }
  };

  const previewAutomation = async () => {
    setAutomationPreview(null);
    setAutomationMessage('');
    try {
      const res = await apiFetch(API_BASE + '/automation/preview');
      const data = await res.json();
      setAutomationPreview(data);
    } catch (err) {
      setAutomationPreview({ ok: false, reason: 'Não foi possível gerar o preview.' });
    }
  };
  const loadSheetsStatus = async () => {
    setSheetsLoading(true);
    try {
      const res = await apiFetch(API_BASE + '/google/sheets/status');
      const data = await res.json();
      setSheetsStatus({
        connected: !!data.connected,
        spreadsheetId: data.spreadsheetId || ''
      });
      if (data.spreadsheetId) {
        setSheetsSpreadsheetId(data.spreadsheetId);
      }
    } catch (err) {
      setSheetsMessage('Nao foi possivel carregar o status do Sheets.');
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleSheetsConnect = () => {
    window.location.href = API_BASE + '/google/sheets/connect';
  };

  const handleSheetsDisconnect = async () => {
    setSheetsMessage('');
    try {
      await apiFetch(API_BASE + '/google/sheets/disconnect', { method: 'POST' });
      setSheetsStatus({ connected: false, spreadsheetId: '' });
      setSheetsSpreadsheetId('');
      setSheetsMessage('Google Sheets desconectado.');
    } catch (err) {
      setSheetsMessage('Nao foi possivel desconectar.');
    }
  };

  const handleSheetsSave = async () => {
    setSheetsMessage('');
    if (!sheetsSpreadsheetId.trim()) {
      setSheetsMessage('Informe o ID da planilha.');
      return;
    }
    try {
      const res = await apiFetch(API_BASE + '/google/sheets/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: sheetsSpreadsheetId.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setSheetsStatus({ connected: true, spreadsheetId: data.spreadsheetId || sheetsSpreadsheetId.trim() });
      setSheetsMessage('Planilha salva com sucesso.');
    } catch (err) {
      setSheetsMessage(err.message || 'Falha ao salvar planilha.');
    }
  };

  const handleSheetsExportQueue = async () => {
    setSheetsMessage('');
    setSheetsExporting(true);
    try {
      const res = await apiFetch(API_BASE + '/google/sheets/export/queue', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao exportar fila.');
      setSheetsMessage(`Fila exportada (${data.rows || 0} itens).`);
    } catch (err) {
      setSheetsMessage(err.message || 'Falha ao exportar fila.');
    } finally {
      setSheetsExporting(false);
    }
  };

  const handleSheetsExportMetrics = async () => {
    setSheetsMessage('');
    setSheetsExporting(true);
    try {
      const res = await apiFetch(API_BASE + '/google/sheets/export/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: sheetsPeriod })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao exportar metricas.');
      setSheetsMessage('Metricas exportadas com sucesso.');
    } catch (err) {
      setSheetsMessage(err.message || 'Falha ao exportar metricas.');
    } finally {
      setSheetsExporting(false);
    }
  };

  const loadDriveStatus = async () => {
    try {
      const res = await apiFetch(API_BASE + '/google/drive/status');
      const data = await res.json();
      setDriveStatus({
        connected: !!data.connected,
        rootFolderId: data.rootFolderId || '',
        clients: Array.isArray(data.clients) ? data.clients : [],
        lastExportAt: data.lastExportAt || '',
        lastBackupAt: data.lastBackupAt || ''
      });
    } catch (err) {
      setDriveStatus({
        connected: false,
        rootFolderId: '',
        clients: [],
        lastExportAt: '',
        lastBackupAt: ''
      });
    }
  };

  const handleDriveConnect = () => {
    window.location.href = `${API_BASE}/google/drive/connect`;
  };

  const handleDriveDisconnect = async () => {
    setDriveMessage('');
    setDriveBusy(true);
    try {
      const res = await apiFetch(API_BASE + '/google/drive/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao desconectar Drive.');
      setDriveMessage('Google Drive desconectado.');
      await loadDriveStatus();
    } catch (err) {
      setDriveMessage(err.message || 'Falha ao desconectar Drive.');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDriveCreateRoot = async () => {
    setDriveMessage('');
    setDriveBusy(true);
    try {
      const res = await apiFetch(API_BASE + '/google/drive/root', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar pasta.');
      setDriveMessage('Pasta principal criada no Drive.');
      await loadDriveStatus();
    } catch (err) {
      setDriveMessage(err.message || 'Falha ao criar pasta.');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDriveAddClient = async () => {
    const name = driveClientName.trim();
    if (!name) {
      setDriveMessage('Informe o nome do cliente.');
      return;
    }
    setDriveMessage('');
    setDriveBusy(true);
    try {
      const res = await apiFetch(API_BASE + '/google/drive/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar cliente.');
      setDriveClientName('');
      setDriveMessage('Cliente criado no Drive.');
      await loadDriveStatus();
    } catch (err) {
      setDriveMessage(err.message || 'Falha ao criar cliente.');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDriveRemoveClient = async (clientId) => {
    setDriveMessage('');
    setDriveBusy(true);
    try {
      const res = await apiFetch(`${API_BASE}/google/drive/clients/${clientId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao remover cliente.');
      setDriveMessage('Cliente removido.');
      await loadDriveStatus();
    } catch (err) {
      setDriveMessage(err.message || 'Falha ao remover cliente.');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDriveExport = async (endpoint, clientId) => {
    setDriveMessage('');
    setDriveBusy(true);
    try {
      const res = await apiFetch(`${API_BASE}/google/drive/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao exportar.');
      setDriveMessage('Exportacao concluida no Drive.');
      await loadDriveStatus();
    } catch (err) {
      setDriveMessage(err.message || 'Falha ao exportar.');
    } finally {
      setDriveBusy(false);
    }
  };

  React.useEffect(() => {
    loadSheetsStatus();
    loadDriveStatus();
    const params = new URLSearchParams(window.location.search);
    const status = params.get('sheets');
    const driveStatus = params.get('drive');
    if (status === 'ok') {
      setSheetsMessage('Google Sheets conectado.');
    } else if (status === 'fail') {
      setSheetsMessage('Falha ao conectar o Google Sheets.');
    }
    if (driveStatus === 'ok') {
      setDriveMessage('Google Drive conectado.');
    } else if (driveStatus === 'fail') {
      setDriveMessage('Falha ao conectar o Google Drive.');
    }
    if (status) {
      params.delete('sheets');
    }
    if (driveStatus) {
      params.delete('drive');
    }
    if (status || driveStatus) {
      const next = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
    }
  }, []);

  const handleSaveEmail = async () => {
    setEmailMessage('');
    setEmailSaving(true);
    try {
      const payload = {
        enabled: !!emailConfig.enabled,
        from: emailConfig.from,
        smtp: {
          host: emailConfig.smtp.host,
          port: Number(emailConfig.smtp.port || 587),
          secure: !!emailConfig.smtp.secure,
          user: emailConfig.smtp.user,
          pass: emailConfig.smtp.pass
        },
        summary: {
          enabled: !!emailConfig.summary.enabled,
          recipients: String(emailConfig.summary.recipients || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
        },
        alerts: {
          enabled: !!emailConfig.alerts.enabled,
          recipients: String(emailConfig.alerts.recipients || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean),
          criticalKeywords: String(emailConfig.alerts.criticalKeywords || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
        }
      };
      const res = await apiFetch(API_BASE + '/email/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar email.');
      setEmailMessage('Email salvo com sucesso.');
    } catch (err) {
      setEmailMessage(err.message || 'Falha ao salvar email.');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setEmailMessage('');
    setEmailTesting(true);
    try {
      const res = await apiFetch(API_BASE + '/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTestTo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar teste.');
      setEmailMessage('Teste enviado com sucesso.');
    } catch (err) {
      setEmailMessage(err.message || 'Falha ao enviar teste.');
    } finally {
      setEmailTesting(false);
    }
  };

  const fontSelectValue = FONT_OPTIONS.some(option => option.value === siteConfig.fontFamily)
    ? siteConfig.fontFamily
    : '__custom__';


  return (
    <div className="config-container">
      <div className="config-header">
        <h2>Configuração de Feeds RSS</h2>
        <p className="config-subtitle">Gerencie fontes e escolha o que aparece na linha do tempo.</p>
      </div>

      <div className="config-tabs">
        <button
          className={`config-tab ${activeTab === 'feeds' ? 'active' : ''}`}
          onClick={() => setActiveTab('feeds')}
        >
          Feeds
        </button>
        <button
          className={`config-tab ${activeTab === 'ticker' ? 'active' : ''}`}
          onClick={() => setActiveTab('ticker')}
        >
          Ticker
        </button>
        <button
          className={`config-tab ${activeTab === 'display' ? 'active' : ''}`}
          onClick={() => setActiveTab('display')}
        >
          Display
        </button>
        <button
          className={`config-tab ${activeTab === 'integracoes' ? 'active' : ''}`}
          onClick={() => setActiveTab('integracoes')}
        >
          Integracoes
        </button>
        <button
          className={`config-tab ${activeTab === 'clima' ? 'active' : ''}`}
          onClick={() => setActiveTab('clima')}
        >
          Clima
        </button>
        <button
          className={`config-tab ${activeTab === 'automacao' ? 'active' : ''}`}
          onClick={() => setActiveTab('automacao')}
        >
          Automação
        </button>
        <button
          className={`config-tab ${activeTab === 'telegram' ? 'active' : ''}`}
          onClick={() => setActiveTab('telegram')}
        >
          Telegram
        </button>
        <button
          className={`config-tab ${activeTab === 'whatsapp' ? 'active' : ''}`}
          onClick={() => setActiveTab('whatsapp')}
        >
          WhatsApp
        </button>
        <button
          className={`config-tab ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Trends
        </button>
        <button
          className={`config-tab ${activeTab === 'youtube' ? 'active' : ''}`}
          onClick={() => setActiveTab('youtube')}
        >
          YouTube
        </button>
        <button
          className={`config-tab ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          Email
        </button>
        <button
          className={`config-tab ${activeTab === 'ia' ? 'active' : ''}`}
          onClick={() => setActiveTab('ia')}
        >
          IA
        </button>
        <button
          className={`config-tab ${activeTab === 'site' ? 'active' : ''}`}
          onClick={() => setActiveTab('site')}
        >
          Mini site
        </button>

        <button
          className={`config-tab ${activeTab === 'alertas' ? 'active' : ''}`}
          onClick={() => setActiveTab('alertas')}
        >
          Alertas
        </button>
        <button
          className={`config-tab ${activeTab === 'resumo' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumo')}
        >
          Resumo diário
        </button>
        <button
          className={`config-tab ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          Tags
        </button>
      </div>

      {activeTab === 'feeds' && (
        <div className="config-grid">
          <section className="config-panel">
            <FeedForm onFeedAdded={onFeedAdded} />
          </section>
          <section className="config-panel">
            <FeedConfigList onFeedUpdated={onConfigSaved} refreshToken={refreshFeeds} />
            <div className="config-info">Marque quais feeds devem aparecer na linha do tempo principal.</div>
          </section>
        </div>
      )}

      {activeTab === 'ticker' && (
        <section className="config-panel config-panel-wide">
          <h3>Configurações do ticker</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!tickerConfig.enabled}
                onChange={(e) => updateTicker({ enabled: e.target.checked })}
              />
              Ativar ticker de notícias
            </label>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!tickerConfig.pauseOnHover}
                onChange={(e) => updateTicker({ pauseOnHover: e.target.checked })}
              />
              Pausar ao passar o mouse
            </label>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!tickerConfig.onlyNew}
                onChange={(e) => updateTicker({ onlyNew: e.target.checked })}
              />
              Mostrar apenas itens novos desde a última atualização
            </label>
            <div className="ticker-speed">
              <div>
                <span className="ticker-speed-label">Velocidade do ticker</span>
                <span className="ticker-speed-value">{tickerConfig.speed}s</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="5"
                value={tickerConfig.speed}
                onChange={(e) => updateTicker({ speed: Number(e.target.value) })}
              />
            </div>
          </div>
        </section>
      )}

      {activeTab === 'display' && (
        <section className="config-panel config-panel-wide">
          <h3>Configurações do display</h3>
          <div className="ticker-settings">
            <div className="display-texts">
              <label className="feed-field">
                <span className="feed-label">Título do display</span>
                <input
                  className="feed-input"
                  type="text"
                  value={displayConfig.title}
                  onChange={(e) => setDisplayConfig(prev => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Subtítulo do display</span>
                <input
                  className="feed-input"
                  type="text"
                  value={displayConfig.subtitle}
                  onChange={(e) => setDisplayConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </label>
            </div>
            <div className="ticker-speed">
              <div>
                <span className="ticker-speed-label">Tempo por notícia</span>
                <span className="ticker-speed-value">{Math.round(displayConfig.displayMs / 1000)}s</span>
              </div>
              <input
                type="range"
                min="6"
                max="30"
                step="1"
                value={Math.round(displayConfig.displayMs / 1000)}
                onChange={(e) => setDisplayConfig(prev => ({ ...prev, displayMs: Number(e.target.value) * 1000 }))}
              />
            </div>
            <div className="ticker-speed">
              <div>
                <span className="ticker-speed-label">Atualização do display</span>
                <span className="ticker-speed-value">{Math.round(displayConfig.refreshMs / 60000)} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={Math.round(displayConfig.refreshMs / 60000)}
                onChange={(e) => setDisplayConfig(prev => ({ ...prev, refreshMs: Number(e.target.value) * 60000 }))}
              />
            </div>
            <div className="ticker-speed">
              <div>
                <span className="ticker-speed-label">Tamanho da fila</span>
                <span className="ticker-speed-value">{displayConfig.maxQueue} itens</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={displayConfig.maxQueue}
                onChange={(e) => setDisplayConfig(prev => ({ ...prev, maxQueue: Number(e.target.value) }))}
              />
            </div>
            <div className="ticker-speed">
              <div>
                <span className="ticker-speed-label">Velocidade do ticker do display</span>
                <span className="ticker-speed-value">{displayConfig.tickerSpeed}s</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="5"
                value={displayConfig.tickerSpeed}
                onChange={(e) => setDisplayConfig(prev => ({ ...prev, tickerSpeed: Number(e.target.value) }))}
              />
            </div>            <button
              className="display-open-button"
              onClick={() => window.open('/app?display=1', '_blank', 'noopener,noreferrer')}
            >
              Abrir modo transmissão
            </button>
            <div className="config-panel-divider" />
            <h4>Menu de contexto</h4>
            <div className="ticker-settings">
              <label className="ticker-toggle">
                <input
                  type="checkbox"
                  checked={!!contextMenuConfig.enabled}
                  onChange={(e) => updateContextMenu({ enabled: e.target.checked })}
                />
                Ativar menu de contexto (clique direito)
              </label>
              <label className="ticker-toggle">
                <input
                  type="checkbox"
                  checked={!!contextMenuConfig.shortcutsEnabled}
                  onChange={(e) => updateContextMenu({ shortcutsEnabled: e.target.checked })}
                />
                Ativar atalhos de teclado
              </label>
              <label className="ticker-toggle">
                <input
                  type="checkbox"
                  checked={!!contextMenuConfig.showShortcuts}
                  onChange={(e) => updateContextMenu({ showShortcuts: e.target.checked })}
                />
                Mostrar atalhos no menu
              </label>
              <div className="context-menu-grid">
                <div>
                  <div className="context-menu-subtitle">Acoes gerais</div>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.actions.refresh}
                      onChange={(e) => updateContextAction('refresh', e.target.checked)}
                    />
                    Atualizar pagina
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.actions.copyUrl}
                      onChange={(e) => updateContextAction('copyUrl', e.target.checked)}
                    />
                    Copiar URL da pagina
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.actions.copyTitle}
                      onChange={(e) => updateContextAction('copyTitle', e.target.checked)}
                    />
                    Copiar nome da secao
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.actions.toggleTheme}
                      onChange={(e) => updateContextAction('toggleTheme', e.target.checked)}
                    />
                    Alternar tema
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.actions.toggleSidebar}
                      onChange={(e) => updateContextAction('toggleSidebar', e.target.checked)}
                    />
                    Alternar menu lateral
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.actions.events}
                      onChange={(e) => updateContextAction('events', e.target.checked)}
                    />
                    Abrir eventos do sistema
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.actions.broadcast}
                      onChange={(e) => updateContextAction('broadcast', e.target.checked)}
                    />
                    Abrir modo transmissao
                  </label>
                </div>
                <div>
                  <div className="context-menu-subtitle">Acoes nos cards</div>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.cardActions.openLink}
                      onChange={(e) => updateContextCardAction('openLink', e.target.checked)}
                    />
                    Abrir link
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.cardActions.copyLink}
                      onChange={(e) => updateContextCardAction('copyLink', e.target.checked)}
                    />
                    Copiar link
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.cardActions.copyTitle}
                      onChange={(e) => updateContextCardAction('copyTitle', e.target.checked)}
                    />
                    Copiar titulo
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.cardActions.saveToggle}
                      onChange={(e) => updateContextCardAction('saveToggle', e.target.checked)}
                    />
                    Salvar ou remover dos salvos
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.cardActions.generateText}
                      onChange={(e) => updateContextCardAction('generateText', e.target.checked)}
                    />
                    Gerar texto com IA
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!contextMenuConfig.cardActions.removeSaved}
                      onChange={(e) => updateContextCardAction('removeSaved', e.target.checked)}
                    />
                    Remover dos salvos
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'integracoes' && (
        <section className="config-panel config-panel-wide">
          <h3>Google Sheets</h3>
          <div className="ticker-settings">
            <div className="config-info">
              Conecte sua conta para exportar fila e métricas direto para uma planilha.
            </div>
            <div className="context-menu-grid">
              <div>
                <label className="feed-field">
                  <span className="feed-label">Status</span>
                  <div className="feed-help">{sheetsStatus.connected ? 'Conectado' : 'Nao conectado'}</div>
                </label>
                {!sheetsStatus.connected ? (
                  <button className="display-open-button" type="button" onClick={handleSheetsConnect}>
                    Conectar Google Sheets
                  </button>
                ) : (
                  <button className="display-open-button secondary" type="button" onClick={handleSheetsDisconnect}>
                    Desconectar
                  </button>
                )}
              </div>
              <div>
                <label className="feed-field">
                  <span className="feed-label">ID da planilha</span>
                  <input
                    className="feed-input"
                    type="text"
                    value={sheetsSpreadsheetId}
                    onChange={(e) => setSheetsSpreadsheetId(e.target.value)}
                    placeholder="Cole o ID da planilha"
                  />
                </label>
                <button
                  className="display-open-button"
                  type="button"
                  onClick={handleSheetsSave}
                  disabled={!sheetsStatus.connected}
                >
                  Salvar planilha
                </button>
              </div>
            </div>
            <div className="context-menu-grid">
              <div>
                <label className="feed-field">
                  <span className="feed-label">Periodo das métricas</span>
                  <select
                    className="feed-input"
                    value={sheetsPeriod}
                    onChange={(e) => setSheetsPeriod(e.target.value)}
                  >
                    <option value="24h">24h</option>
                    <option value="7d">7d</option>
                    <option value="30d">30d</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className="display-open-button"
                  type="button"
                  onClick={handleSheetsExportMetrics}
                  disabled={sheetsExporting || !sheetsStatus.connected}
                >
                  Exportar métricas
                </button>
                <button
                  className="display-open-button"
                  type="button"
                  onClick={handleSheetsExportQueue}
                  disabled={sheetsExporting || !sheetsStatus.connected}
                >
                  Exportar fila
                </button>
              </div>
            </div>
            {sheetsMessage && <div className="config-info">{sheetsMessage}</div>}
          </div>
          <div className="config-panel-divider" />
          <h3>Google Drive</h3>
          <div className="ticker-settings">
            <div className="config-info">
              Exporte RSS gerados, tendencias e backups para pastas por cliente.
            </div>
            <div className="config-info">
              Se aparecer erro de API desativada, ative em{' '}
              <a
                href="https://console.developers.google.com/apis/api/drive.googleapis.com/overview"
                target="_blank"
                rel="noreferrer"
              >
                Google Drive API
              </a>
              .
            </div>
            <div className="context-menu-grid">
              <div>
                <label className="feed-field">
                  <span className="feed-label">Status</span>
                  <div className="feed-help">{driveStatus.connected ? 'Conectado' : 'Nao conectado'}</div>
                </label>
                {!driveStatus.connected ? (
                  <button className="display-open-button" type="button" onClick={handleDriveConnect}>
                    Conectar Google Drive
                  </button>
                ) : (
                  <button
                    className="display-open-button secondary"
                    type="button"
                    onClick={handleDriveDisconnect}
                    disabled={driveBusy}
                  >
                    Desconectar
                  </button>
                )}
              </div>
              <div>
                <label className="feed-field">
                  <span className="feed-label">Pasta principal</span>
                  <div className="feed-help">
                    {driveStatus.rootFolderId ? 'Pasta configurada' : 'Nao configurada'}
                  </div>
                </label>
                <button
                  className="display-open-button"
                  type="button"
                  onClick={handleDriveCreateRoot}
                  disabled={!driveStatus.connected || driveBusy}
                >
                  Criar pasta principal
                </button>
              </div>
            </div>
            <div className="context-menu-grid">
              <div>
                <label className="feed-field">
                  <span className="feed-label">Novo cliente</span>
                  <input
                    className="feed-input"
                    type="text"
                    value={driveClientName}
                    onChange={(e) => setDriveClientName(e.target.value)}
                    placeholder="Nome do cliente"
                  />
                </label>
                <button
                  className="display-open-button"
                  type="button"
                  onClick={handleDriveAddClient}
                  disabled={!driveStatus.connected || driveBusy}
                >
                  Criar pasta do cliente
                </button>
              </div>
              <div className="automation-actions">
                <button
                  className="display-open-button secondary"
                  type="button"
                  onClick={() => handleDriveExport('backup', '')}
                  disabled={!driveStatus.connected || driveBusy}
                >
                  Backup de configuracoes
                </button>
                {driveStatus.lastExportAt && (
                  <div className="automation-status">Ultima exportacao: {driveStatus.lastExportAt}</div>
                )}
                {driveStatus.lastBackupAt && (
                  <div className="automation-status">Ultimo backup: {driveStatus.lastBackupAt}</div>
                )}
              </div>
            </div>
            <div className="config-feed-list">
              {driveStatus.clients.map(client => (
                <div key={client.id} className="feed-config-item">
                  <div className="feed-config-meta">
                    <span className="feed-config-name">{client.name}</span>
                    <span className="feed-config-pill">{client.folderId ? 'Pasta criada' : 'Sem pasta'}</span>
                  </div>
                  <div className="feed-config-actions">
                    <button
                      className="feed-config-action"
                      type="button"
                      onClick={() => handleDriveExport('export/rss', client.id)}
                      disabled={driveBusy}
                    >
                      Exportar RSS
                    </button>
                    <button
                      className="feed-config-action"
                      type="button"
                      onClick={() => handleDriveExport('export/trends', client.id)}
                      disabled={driveBusy}
                    >
                      Exportar tendencias
                    </button>
                    <button
                      className="feed-config-action"
                      type="button"
                      onClick={() => handleDriveExport('export/briefing', client.id)}
                      disabled={driveBusy}
                    >
                      Gerar briefing
                    </button>
                    <button
                      className="feed-config-action secondary"
                      type="button"
                      onClick={() => handleDriveRemoveClient(client.id)}
                      disabled={driveBusy}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              {!driveStatus.clients.length && (
                <div className="automation-empty">Nenhum cliente configurado.</div>
              )}
            </div>
            {driveMessage && <div className="config-info">{driveMessage}</div>}
          </div>
        </section>
      )}

      {activeTab === 'clima' && (
        <section className="config-panel config-panel-wide">
          <h3>Previsão do tempo</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!weatherConfig.enabled}
                onChange={(e) => setWeatherConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Intercalar previsão do tempo entre as notícias
            </label>
            <div className="ticker-speed">
              <div>
                <span className="ticker-speed-label">Inserir previsão a cada</span>
                <span className="ticker-speed-value">{weatherConfig.insertEvery} notícias</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="1"
                value={weatherConfig.insertEvery}
                onChange={(e) => setWeatherConfig(prev => ({ ...prev, insertEvery: Number(e.target.value) }))}
              />
            </div>
            <div className="ticker-speed">
              <div>
                <span className="ticker-speed-label">Atualização da previsão</span>
                <span className="ticker-speed-value">{Math.round(weatherConfig.refreshMs / 60000)} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={Math.round(weatherConfig.refreshMs / 60000)}
                onChange={(e) => setWeatherConfig(prev => ({ ...prev, refreshMs: Number(e.target.value) * 60000 }))}
              />
            </div>
            <label className="feed-field">
              <span className="feed-label">Cidades (uma por linha)</span>
              <textarea
                className="feed-textarea"
                rows="6"
                value={weatherConfig.cities.join('\n')}
                onChange={(e) => {
                  const cities = e.target.value
                    .split('\n')
                    .map((c) => c.trim())
                    .filter(Boolean);
                  setWeatherConfig(prev => ({ ...prev, cities }));
                }}
              />
            </label>
            <button
              className="display-open-button"
              onClick={() => setWeatherConfig(prev => ({ ...prev, cities: DEFAULT_CITIES.slice() }))}
              type="button"
            >
              Usar capitais padrão
            </button>
            <button
              className="display-open-button secondary"
              onClick={() => setWeatherConfig(prev => ({ ...prev, cities: mergeUnique(DEFAULT_CITIES, prev.cities) }))}
              type="button"
            >
              Capitais + minhas cidades
            </button>
          </div>
        </section>
      )}

      {activeTab === 'automacao' && (
        <section className="config-panel config-panel-wide">
          <h3>Automação X/Twitter</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!automation.rules.enabled}
                onChange={(e) => setAutomation(prev => ({
                  ...prev,
                  rules: { ...prev.rules, enabled: e.target.checked }
                }))}
              />
              Ativar automação
            </label>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">API Key (Consumer Key)</span>
                <input
                  className="feed-input"
                  type="text"
                  value={automation.credentials.apiKey}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    credentials: { ...prev.credentials, apiKey: e.target.value }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">API Secret (Consumer Secret)</span>
                <input
                  className="feed-input"
                  type="password"
                  value={automation.credentials.apiSecret}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    credentials: { ...prev.credentials, apiSecret: e.target.value }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Access Token (Authentication Tokens)</span>
                <input
                  className="feed-input"
                  type="text"
                  value={automation.credentials.accessToken}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    credentials: { ...prev.credentials, accessToken: e.target.value }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Access Token Secret</span>
                <input
                  className="feed-input"
                  type="password"
                  value={automation.credentials.accessSecret}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    credentials: { ...prev.credentials, accessSecret: e.target.value }
                  }))}
                />
              </label>
            </div>
            <div className="automation-hint">O Bearer Token não é necessário para postar.</div>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!automation.rules.useWatchTopics}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setAutomation(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      useWatchTopics: enabled,
                      minIntervalMinutes: enabled
                        ? Math.max(prev.rules.minIntervalMinutes || 0, 180)
                        : prev.rules.minIntervalMinutes
                    }
                  }));
                }}
              />
              Usar Acompanhamentos como fonte
            </label>
            {automation.rules.useWatchTopics && (
              <div className="automation-hint">
                A automação vai postar somente itens que baterem nos termos de Acompanhamentos.
              </div>
            )}
            <span className="feed-label">Fontes para automação</span>
            <AutomationFeedSelector
              selectedIds={automation.rules.feedIds}
              disabled={automation.rules.useWatchTopics}
              onChange={(ids) => setAutomation(prev => ({
                ...prev,
                rules: { ...prev.rules, feedIds: ids }
              }))}
            />
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Palavras obrigatórias (uma por linha)</span>
                <textarea
                  className="feed-textarea"
                  rows="4"
                  value={automation.rules.requireWords.join('\n')}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      requireWords: e.target.value.split('\n').map(w => w.trim()).filter(Boolean)
                    }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Palavras bloqueadas (uma por linha)</span>
                <textarea
                  className="feed-textarea"
                  rows="4"
                  value={automation.rules.blockWords.join('\n')}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      blockWords: e.target.value.split('\n').map(w => w.trim()).filter(Boolean)
                    }
                  }))}
                />
              </label>
            </div>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!automation.rules.onlyWithLink}
                onChange={(e) => setAutomation(prev => ({
                  ...prev,
                  rules: { ...prev.rules, onlyWithLink: e.target.checked }
                }))}
              />
              Publicar somente se houver link
            </label>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Limite diário</span>
                <input
                  className="feed-input"
                  type="number"
                  min="1"
                  max="50"
                  value={automation.rules.maxPerDay}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    rules: { ...prev.rules, maxPerDay: Number(e.target.value) }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Itens por post (clipping)</span>
                <input
                  className="feed-input"
                  type="number"
                  min="1"
                  max="10"
                  value={automation.rules.maxItemsPerPost}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    rules: { ...prev.rules, maxItemsPerPost: Number(e.target.value) }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Intervalo mínimo (min)</span>
                <input
                  className="feed-input"
                  type="number"
                  min="5"
                  max="240"
                  value={automation.rules.minIntervalMinutes}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    rules: { ...prev.rules, minIntervalMinutes: Number(e.target.value) }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Tamanho máximo do post</span>
                <input
                  className="feed-input"
                  type="number"
                  min="280"
                  max="10000"
                  value={automation.rules.maxChars}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    rules: { ...prev.rules, maxChars: Number(e.target.value) }
                  }))}
                />
              </label>
            </div>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!automation.rules.quietHours.enabled}
                onChange={(e) => setAutomation(prev => ({
                  ...prev,
                  rules: {
                    ...prev.rules,
                    quietHours: { ...prev.rules.quietHours, enabled: e.target.checked }
                  }
                }))}
              />
              Ativar horário silencioso
            </label>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Início</span>
                <input
                  className="feed-input"
                  type="time"
                  value={automation.rules.quietHours.start}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      quietHours: { ...prev.rules.quietHours, start: e.target.value }
                    }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Fim</span>
                <input
                  className="feed-input"
                  type="time"
                  value={automation.rules.quietHours.end}
                  onChange={(e) => setAutomation(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      quietHours: { ...prev.rules.quietHours, end: e.target.value }
                    }
                  }))}
                />
              </label>
            </div>
            <label className="feed-field">
              <span className="feed-label">Template do post</span>
              <input
                className="feed-input"
                type="text"
                value={automation.rules.template}
                onChange={(e) => setAutomation(prev => ({
                  ...prev,
                  rules: { ...prev.rules, template: e.target.value }
                }))}
              />
              <span className="feed-help">Use {'{title}'}, {'{link}'}, {'{source}'}, {'{date}'}, {'{time}'}.</span>
            </label>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!automation.rules.useAiSummary}
                onChange={(e) => setAutomation(prev => ({
                  ...prev,
                  rules: { ...prev.rules, useAiSummary: e.target.checked }
                }))}
              />
              Gerar clipping com IA
            </label>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={automation.rules.template.trim() === '{title}'}
                onChange={(e) => {
                  const onlyTitle = e.target.checked;
                  setAutomation(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      template: onlyTitle ? '{title}' : prev.rules.template,
                      onlyWithLink: onlyTitle ? false : prev.rules.onlyWithLink
                    }
                  }));
                }}
              />
              Somente manchete (sem link)
            </label>
            <div className="automation-actions">
              <button className="display-open-button" onClick={saveAutomation} disabled={automationSaving}>
                {automationSaving ? 'Salvando...' : 'Salvar automação'}
              </button>
              <button className="display-open-button secondary" onClick={testAutomation} disabled={automationTesting}>
                {automationTesting ? 'Testando...' : 'Testar postagem'}
              </button>
              <button className="display-open-button secondary" onClick={previewAutomation} type="button">
                Preview do próximo post
              </button>
              {automationMessage && <span className="automation-status">{automationMessage}</span>}
            </div>
            {automationPreview && (
              <div className="automation-preview">
                {automationPreview.ok ? (
                  <>
                    <div className="automation-preview-title">Próximos posts elegíveis:</div>
                    {(automationPreview.candidates || []).map((item, idx) => (
                      <div key={`${item.link || item.title}-${idx}`} className="automation-preview-item">
                        <strong>{item.feedName || item.topicName || 'Fonte'}</strong> — {item.title}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="automation-preview-empty">{automationPreview.reason || 'Sem itens elegíveis.'}</div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      


      {activeTab === 'whatsapp' && (
        <section className="config-panel config-panel-wide">
          <h3>WhatsApp Business</h3>
          <div className="automation-hint">
            <div>1) Configure o app no Meta Developers e habilite WhatsApp Cloud API.</div>
            <div>2) Copie o Phone Number ID e o Access Token permanente.</div>
            <div>3) Crie um template aprovado (nome + idioma) no WhatsApp Manager.</div>
            <div>4) Informe o numero de destino em formato E.164 (ex: 55XXXXXXXXXXX).</div>
            <button className="display-open-button secondary" type="button" onClick={() => setWhatsappHelpOpen(true)}>
              Ver instrucoes completas
            </button>
          </div>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!whatsappConfig.enabled}
                onChange={(e) => setWhatsappConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar envio no WhatsApp
            </label>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Access Token</span>
                <input
                  className="feed-input"
                  type="password"
                  value={whatsappConfig.accessToken}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Phone Number ID</span>
                <input
                  className="feed-input"
                  type="text"
                  value={whatsappConfig.phoneNumberId}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">WABA ID</span>
                <input
                  className="feed-input"
                  type="text"
                  value={whatsappConfig.wabaId}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, wabaId: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Numero destino (E.164)</span>
                <input
                  className="feed-input"
                  type="text"
                  value={whatsappConfig.recipientNumber}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, recipientNumber: e.target.value }))}
                />
              </label>
            </div>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Template</span>
                <input
                  className="feed-input"
                  type="text"
                  value={whatsappConfig.templateName}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, templateName: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Idioma do template</span>
                <input
                  className="feed-input"
                  type="text"
                  value={whatsappConfig.templateLanguage}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, templateLanguage: e.target.value }))}
                />
              </label>
              <div className="feed-help">O template deve ter 3 variaveis: {'{{1}}'} titulo, {'{{2}}'} link, {'{{3}}'} fonte.</div>
            </div>
            <span className="feed-label">Fontes para WhatsApp</span>
            <AutomationFeedSelector
              selectedIds={whatsappConfig.rules?.feedIds || []}
              onChange={(ids) => setWhatsappConfig(prev => ({
                ...prev,
                rules: { ...prev.rules, feedIds: ids }
              }))}
            />
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Palavras obrigatorias (uma por linha)</span>
                <textarea
                  className="feed-textarea"
                  rows="4"
                  value={(whatsappConfig.rules?.requireWords || []).join('\n')}
                  onChange={(e) => setWhatsappConfig(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      requireWords: e.target.value.split('\n').map(w => w.trim()).filter(Boolean)
                    }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Palavras bloqueadas (uma por linha)</span>
                <textarea
                  className="feed-textarea"
                  rows="4"
                  value={(whatsappConfig.rules?.blockWords || []).join('\n')}
                  onChange={(e) => setWhatsappConfig(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      blockWords: e.target.value.split('\n').map(w => w.trim()).filter(Boolean)
                    }
                  }))}
                />
              </label>
            </div>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Posts por dia</span>
                <input
                  className="feed-input"
                  type="number"
                  min="1"
                  max="200"
                  value={whatsappConfig.rules?.maxPerDay || 10}
                  onChange={(e) => setWhatsappConfig(prev => ({
                    ...prev,
                    rules: { ...prev.rules, maxPerDay: Number(e.target.value) }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Intervalo minimo (min)</span>
                <input
                  className="feed-input"
                  type="number"
                  min="1"
                  max="240"
                  value={whatsappConfig.rules?.minIntervalMinutes || 60}
                  onChange={(e) => setWhatsappConfig(prev => ({
                    ...prev,
                    rules: { ...prev.rules, minIntervalMinutes: Number(e.target.value) }
                  }))}
                />
              </label>
              <label className="ticker-toggle">
                <input
                  type="checkbox"
                  checked={!!whatsappConfig.rules?.onlyWithLink}
                  onChange={(e) => setWhatsappConfig(prev => ({
                    ...prev,
                    rules: { ...prev.rules, onlyWithLink: e.target.checked }
                  }))}
                />
                Exigir link valido
              </label>
            </div>
            <div className="automation-actions">
              <button className="display-open-button" onClick={saveWhatsAppConfig} disabled={whatsappSaving}>
                {whatsappSaving ? 'Salvando...' : 'Salvar WhatsApp'}
              </button>
              <button className="display-open-button secondary" onClick={testWhatsApp} disabled={whatsappTesting}>
                {whatsappTesting ? 'Testando...' : 'Testar envio'}
              </button>
              <button className="display-open-button secondary" onClick={previewWhatsApp} type="button">
                Preview
              </button>
              {whatsappMessage && <span className="automation-status">{whatsappMessage}</span>}
            </div>
            {whatsappPreview && (
              <div className="automation-preview">
                {whatsappPreview.ok ? (
                  whatsappPreview.candidate ? (
                    <>
                      <div className="automation-preview-title">Pr?xima not?cia:</div>
                      <div className="automation-preview-item">
                        <strong>{whatsappPreview.candidate.feedName}</strong> - {whatsappPreview.candidate.title}
                      </div>
                      {whatsappPreview.candidate.link && (
                        <div className="automation-preview-link">{whatsappPreview.candidate.link}</div>
                      )}
                    </>
                  ) : (
                    <div className="automation-preview-empty">Nenhuma not?cia eleg?vel.</div>
                  )
                ) : (
                  <div className="automation-preview-empty">Falha ao gerar preview.</div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'telegram' && (
        <section className="config-panel config-panel-wide">
          <h3>Telegram</h3>
          <div className="automation-hint">
            <div>1) Crie um bot no <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a> e copie o Bot Token.</div>
            <div>2) Obtenha o Chat ID (ex: <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer">@userinfobot</a>).</div>
            <div>3) Salve e use o botao Testar envio para validar.</div>
            <button className="display-open-button secondary" type="button" onClick={() => setTelegramHelpOpen(true)}>
              Ver instrucoes completas
            </button>
          </div>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!telegramConfig.enabled}
                onChange={(e) => setTelegramConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar envio no Telegram
            </label>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Bot Token</span>
                <input
                  className="feed-input"
                  type="password"
                  value={telegramConfig.botToken}
                  onChange={(e) => setTelegramConfig(prev => ({ ...prev, botToken: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Chat ID</span>
                <input
                  className="feed-input"
                  type="text"
                  value={telegramConfig.chatId}
                  onChange={(e) => setTelegramConfig(prev => ({ ...prev, chatId: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Template</span>
                <input
                  className="feed-input"
                  type="text"
                  value={telegramConfig.template}
                  onChange={(e) => setTelegramConfig(prev => ({ ...prev, template: e.target.value }))}
                />
                <span className="feed-help">Use {'{title}'}, {'{link}'}, {'{source}'}</span>
              </label>
            </div>
            <span className="feed-label">Fontes para Telegram</span>
            <AutomationFeedSelector
              selectedIds={telegramConfig.rules?.feedIds || []}
              onChange={(ids) => setTelegramConfig(prev => ({
                ...prev,
                rules: { ...prev.rules, feedIds: ids }
              }))}
            />
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Palavras obrigatorias (uma por linha)</span>
                <textarea
                  className="feed-textarea"
                  rows="4"
                  value={(telegramConfig.rules?.requireWords || []).join('\n')}
                  onChange={(e) => setTelegramConfig(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      requireWords: e.target.value.split('\n').map(w => w.trim()).filter(Boolean)
                    }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Palavras bloqueadas (uma por linha)</span>
                <textarea
                  className="feed-textarea"
                  rows="4"
                  value={(telegramConfig.rules?.blockWords || []).join('\n')}
                  onChange={(e) => setTelegramConfig(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      blockWords: e.target.value.split('\n').map(w => w.trim()).filter(Boolean)
                    }
                  }))}
                />
              </label>
            </div>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Posts por dia</span>
                <input
                  className="feed-input"
                  type="number"
                  min="1"
                  max="200"
                  value={telegramConfig.rules?.maxPerDay || 20}
                  onChange={(e) => setTelegramConfig(prev => ({
                    ...prev,
                    rules: { ...prev.rules, maxPerDay: Number(e.target.value) }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Intervalo minimo (min)</span>
                <input
                  className="feed-input"
                  type="number"
                  min="1"
                  max="240"
                  value={telegramConfig.rules?.minIntervalMinutes || 10}
                  onChange={(e) => setTelegramConfig(prev => ({
                    ...prev,
                    rules: { ...prev.rules, minIntervalMinutes: Number(e.target.value) }
                  }))}
                />
              </label>
              <label className="ticker-toggle">
                <input
                  type="checkbox"
                  checked={!!telegramConfig.rules?.onlyWithLink}
                  onChange={(e) => setTelegramConfig(prev => ({
                    ...prev,
                    rules: { ...prev.rules, onlyWithLink: e.target.checked }
                  }))}
                />
                Exigir link valido
              </label>
            </div>
            <div className="automation-actions">
              <button className="display-open-button" onClick={saveTelegramConfig} disabled={telegramSaving}>
                {telegramSaving ? 'Salvando...' : 'Salvar Telegram'}
              </button>
              <button className="display-open-button secondary" onClick={testTelegram} disabled={telegramTesting}>
                {telegramTesting ? 'Testando...' : 'Testar envio'}
              </button>
              <button className="display-open-button secondary" onClick={previewTelegram} type="button">
                Preview
              </button>
              {telegramMessage && <span className="automation-status">{telegramMessage}</span>}
            </div>
            {telegramPreview && (
              <div className="automation-preview">
                {telegramPreview.ok ? (
                  telegramPreview.candidate ? (
                    <>
                      <div className="automation-preview-title">Pr?xima not?cia:</div>
                      <div className="automation-preview-item">
                        <strong>{telegramPreview.candidate.feedName}</strong> - {telegramPreview.candidate.title}
                      </div>
                      {telegramPreview.candidate.link && (
                        <div className="automation-preview-link">{telegramPreview.candidate.link}</div>
                      )}
                    </>
                  ) : (
                    <div className="automation-preview-empty">Nenhuma not?cia eleg?vel.</div>
                  )
                ) : (
                  <div className="automation-preview-empty">Falha ao gerar preview.</div>
                )}
              </div>
            )}
          </div>

          <div className="config-panel-divider"></div>
          <h4>Fontes do Telegram</h4>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!telegramFeedsConfig.enabled}
                onChange={(e) => setTelegramFeedsConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar leitura de grupos/canais
            </label>
            <label className="feed-field">
              <span className="feed-label">Bot Token (o mesmo do Telegram)</span>
              <input
                className="feed-input"
                type="password"
                value={telegramFeedsConfig.botToken}
                onChange={(e) => setTelegramFeedsConfig(prev => ({ ...prev, botToken: e.target.value }))}
              />
            </label>
            <div className="automation-hint">
              Adicione o bot ao grupo/canal e desative o Privacy Mode no BotFather para ler mensagens.
            </div>
            <div className="automation-hint">
              1) Abra `https://api.telegram.org/botSEU_TOKEN/getUpdates` e procure `chat.id` do grupo/canal.
              2) Cadastre Nome e Chat ID (ex: -1001234567890) e salve.
              3) As mensagens passam a aparecer automaticamente na timeline.
            </div>
            <div className="config-feed-list">
              {telegramFeedsConfig.feeds.map(feed => (
                <div className="config-feed-row" key={feed.id}>
                  <input
                    className="feed-input"
                    type="text"
                    placeholder="Nome"
                    value={feed.name}
                    onChange={(e) => updateTelegramFeed(feed.id, { name: e.target.value })}
                  />
                  <input
                    className="feed-input"
                    type="text"
                    placeholder="Chat ID (ex: -1001234567890)"
                    value={feed.chatId}
                    onChange={(e) => updateTelegramFeed(feed.id, { chatId: e.target.value })}
                  />
                  <label className="feed-toggle">
                    <input
                      type="checkbox"
                      checked={feed.showOnTimeline !== false}
                      onChange={(e) => updateTelegramFeed(feed.id, { showOnTimeline: e.target.checked })}
                    />
                    Timeline
                  </label>
                  <button className="feed-remove" onClick={() => removeTelegramFeed(feed.id)}>
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <div className="automation-actions">
              <button className="display-open-button secondary" type="button" onClick={addTelegramFeed}>
                Adicionar fonte
              </button>
              <button className="display-open-button" onClick={saveTelegramFeedsConfig} disabled={telegramFeedsSaving}>
                {telegramFeedsSaving ? 'Salvando...' : 'Salvar Telegram feeds'}
              </button>
              {telegramFeedsMessage && <span className="automation-status">{telegramFeedsMessage}</span>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'ia' && (
        <section className="config-panel config-panel-wide">
          <h3>IA - Reescrita jornalistica</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!aiConfig.enabled}
                onChange={(e) => setAiConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar reescrita com IA
            </label>
            <label className="feed-field">
              <span className="feed-label">Provedor</span>
              <select
                className="feed-input"
                value={aiConfig.provider}
                onChange={(e) => setAiConfig(prev => ({ ...prev, provider: e.target.value }))}
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
                <option value="copilot">Copilot (OpenAI compatível)</option>
              </select>
            </label>
            <div className="automation-hint">
              Como configurar:
              <ol>
                <li>Escolha o provedor no campo acima.</li>
                <li>Preencha as credenciais conforme o provedor selecionado.</li>
                <li>Defina os parametros (modelo, temperatura, limite) e clique em "Salvar IA".</li>
                <li>Depois, use o botao "Gerar texto" nos cards da timeline.</li>
              </ol>
            </div>
            {aiConfig.provider === 'openai' && (
              <>
                <div className="automation-hint">
                  OpenAI: crie uma chave em https://platform.openai.com/account/api-keys
                </div>
                <div className="automation-grid">
                  <label className="feed-field">
                    <span className="feed-label">API Key OpenAI</span>
                    <input
                      className="feed-input"
                      type="password"
                      value={aiConfig.openai.apiKey}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        openai: { ...prev.openai, apiKey: e.target.value }
                      }))}
                    />
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">Modelo</span>
                    <input
                      className="feed-input"
                      type="text"
                      value={aiConfig.openai.model}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        openai: { ...prev.openai, model: e.target.value }
                      }))}
                    />
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">Temperatura (0 a 1)</span>
                    <input
                      className="feed-input"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={aiConfig.openai.temperature}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        openai: { ...prev.openai, temperature: Number(e.target.value) }
                      }))}
                    />
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">Limite de caracteres</span>
                    <input
                      className="feed-input"
                      type="number"
                      min="200"
                      max="1200"
                      value={aiConfig.openai.maxChars}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        openai: { ...prev.openai, maxChars: Number(e.target.value) }
                      }))}
                    />
                  </label>
                </div>
              </>
            )}
            {aiConfig.provider === 'gemini' && (
              <>
                <div className="automation-hint">
                  Gemini: crie uma chave em https://aistudio.google.com/app/apikey
                </div>
                <div className="automation-grid">
                  <label className="feed-field">
                    <span className="feed-label">API Key Gemini</span>
                    <input
                      className="feed-input"
                      type="password"
                      value={aiConfig.gemini.apiKey}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        gemini: { ...prev.gemini, apiKey: e.target.value }
                      }))}
                    />
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">Modelo</span>
                    <input
                      className="feed-input"
                      type="text"
                      value={aiConfig.gemini.model}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        gemini: { ...prev.gemini, model: e.target.value }
                      }))}
                    />
                  </label>
                </div>
              </>
            )}
            {aiConfig.provider === 'copilot' && (
              <>
                <div className="automation-hint">
                  Copilot: informe um endpoint compatível com OpenAI (ex: Azure OpenAI).
                  Base URL deve terminar sem barra (ex: https://SEU-ENDPOINT.openai.azure.com/openai/deployments/SEU-DEPLOYMENT).
                </div>
                <div className="automation-grid">
                  <label className="feed-field">
                    <span className="feed-label">Base URL (endpoint)</span>
                    <input
                      className="feed-input"
                      type="text"
                      value={aiConfig.copilot.baseUrl}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        copilot: { ...prev.copilot, baseUrl: e.target.value }
                      }))}
                    />
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">API Key Copilot</span>
                    <input
                      className="feed-input"
                      type="password"
                      value={aiConfig.copilot.apiKey}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        copilot: { ...prev.copilot, apiKey: e.target.value }
                      }))}
                    />
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">Modelo</span>
                    <input
                      className="feed-input"
                      type="text"
                      value={aiConfig.copilot.model}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        copilot: { ...prev.copilot, model: e.target.value }
                      }))}
                    />
                  </label>
                </div>
              </>
            )}
            <div className="automation-hint">
              Imagens para redes sociais (sem marca dagua).
            </div>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!aiConfig.images?.enabled}
                onChange={(e) => setAiConfig(prev => ({
                  ...prev,
                  images: { ...(prev.images || {}), enabled: e.target.checked }
                }))}
              />
              Ativar busca de imagens na reescrita
            </label>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Provedor de imagens</span>
                <select
                  className="feed-input"
                  value={aiConfig.images?.provider || 'unsplash'}
                  onChange={(e) => setAiConfig(prev => ({
                    ...prev,
                    images: { ...(prev.images || {}), provider: e.target.value }
                  }))}
                >
                  <option value="unsplash">Unsplash</option>
                </select>
              </label>
              <label className="feed-field">
                <span className="feed-label">Access Key (Unsplash)</span>
                <input
                  className="feed-input"
                  type="password"
                  value={aiConfig.images?.unsplash?.accessKey || ''}
                  onChange={(e) => setAiConfig(prev => ({
                    ...prev,
                    images: {
                      ...(prev.images || {}),
                      unsplash: { ...(prev.images?.unsplash || {}), accessKey: e.target.value }
                    }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Quantidade de resultados</span>
                <input
                  className="feed-input"
                  type="number"
                  min="1"
                  max="10"
                  value={aiConfig.images?.unsplash?.perPage || 6}
                  onChange={(e) => setAiConfig(prev => ({
                    ...prev,
                    images: {
                      ...(prev.images || {}),
                      unsplash: { ...(prev.images?.unsplash || {}), perPage: Number(e.target.value) }
                    }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Orientacao</span>
                <select
                  className="feed-input"
                  value={aiConfig.images?.unsplash?.orientation || 'landscape'}
                  onChange={(e) => setAiConfig(prev => ({
                    ...prev,
                    images: {
                      ...(prev.images || {}),
                      unsplash: { ...(prev.images?.unsplash || {}), orientation: e.target.value }
                    }
                  }))}
                >
                  <option value="landscape">Paisagem</option>
                  <option value="portrait">Retrato</option>
                  <option value="squarish">Quadrada</option>
                </select>
              </label>
            </div>
            <div className="automation-hint">
              Como obter: crie uma chave em https://unsplash.com/developers.
              O uso exige credito ao autor e ao Unsplash.
            </div>
            <div className="automation-hint">
              A reescrita usa apenas a manchete e o trecho do RSS. Nao inventa fatos.
            </div>
            <div className="automation-actions">
              <button className="display-open-button secondary" onClick={saveAiConfig} disabled={aiSaving}>
                {aiSaving ? 'Salvando...' : 'Salvar IA'}
              </button>
              {aiMessage && <span className="automation-status">{aiMessage}</span>}
            </div>
          </div>
        </section>
      )}
      {activeTab === 'email' && (
        <section className="config-panel config-panel-wide">
          <h3>Email (SMTP/Gmail)</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!emailConfig.enabled}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar envio por email
            </label>
            <label className="feed-field">
              <span className="feed-label">Remetente (from)</span>
              <input
                className="feed-input"
                type="text"
                value={emailConfig.from}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, from: e.target.value }))}
                placeholder="nome@dominio.com"
              />
              <span className="feed-help">Use o mesmo email do SMTP ou um alias valido.</span>
            </label>
            <div className="context-menu-grid">
              <label className="feed-field">
                <span className="feed-label">SMTP host</span>
                <input
                  className="feed-input"
                  type="text"
                  value={emailConfig.smtp.host}
                  onChange={(e) => setEmailConfig(prev => ({
                    ...prev,
                    smtp: { ...prev.smtp, host: e.target.value }
                  }))}
                  placeholder="smtp.gmail.com"
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Porta</span>
                <input
                  className="feed-input"
                  type="number"
                  value={emailConfig.smtp.port}
                  onChange={(e) => setEmailConfig(prev => ({
                    ...prev,
                    smtp: { ...prev.smtp, port: Number(e.target.value) }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Usuario SMTP</span>
                <input
                  className="feed-input"
                  type="text"
                  value={emailConfig.smtp.user}
                  onChange={(e) => setEmailConfig(prev => ({
                    ...prev,
                    smtp: { ...prev.smtp, user: e.target.value }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Senha SMTP</span>
                <input
                  className="feed-input"
                  type="password"
                  value={emailConfig.smtp.pass}
                  onChange={(e) => setEmailConfig(prev => ({
                    ...prev,
                    smtp: { ...prev.smtp, pass: e.target.value }
                  }))}
                />
              </label>
            </div>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!emailConfig.smtp.secure}
                onChange={(e) => setEmailConfig(prev => ({
                  ...prev,
                  smtp: { ...prev.smtp, secure: e.target.checked }
                }))}
              />
              Usar SSL/TLS (porta 465)
            </label>
            <div className="config-panel-divider" />
            <div className="context-menu-subtitle">Resumo diario</div>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!emailConfig.summary.enabled}
                onChange={(e) => setEmailConfig(prev => ({
                  ...prev,
                  summary: { ...prev.summary, enabled: e.target.checked }
                }))}
              />
              Enviar resumo diario por email
            </label>
            <label className="feed-field">
              <span className="feed-label">Destinatarios (separe por virgula)</span>
              <input
                className="feed-input"
                type="text"
                value={emailConfig.summary.recipients}
                onChange={(e) => setEmailConfig(prev => ({
                  ...prev,
                  summary: { ...prev.summary, recipients: e.target.value }
                }))}
                placeholder="ana@dominio.com, bob@dominio.com"
              />
            </label>
            <div className="config-panel-divider" />
            <div className="context-menu-subtitle">Alertas criticos</div>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!emailConfig.alerts.enabled}
                onChange={(e) => setEmailConfig(prev => ({
                  ...prev,
                  alerts: { ...prev.alerts, enabled: e.target.checked }
                }))}
              />
              Enviar alertas quando aparecer noticia critica
            </label>
            <label className="feed-field">
              <span className="feed-label">Destinatarios (separe por virgula)</span>
              <input
                className="feed-input"
                type="text"
                value={emailConfig.alerts.recipients}
                onChange={(e) => setEmailConfig(prev => ({
                  ...prev,
                  alerts: { ...prev.alerts, recipients: e.target.value }
                }))}
                placeholder="alerts@dominio.com"
              />
            </label>
            <label className="feed-field">
              <span className="feed-label">Palavras criticas (separe por virgula)</span>
              <input
                className="feed-input"
                type="text"
                value={emailConfig.alerts.criticalKeywords}
                onChange={(e) => setEmailConfig(prev => ({
                  ...prev,
                  alerts: { ...prev.alerts, criticalKeywords: e.target.value }
                }))}
                placeholder="crise, vazamento, concorrente"
              />
            </label>
            
            <div className="config-panel-divider" />
            <div className="context-menu-subtitle">Teste rapido</div>
            <label className="feed-field">
              <span className="feed-label">Enviar teste para</span>
              <input
                className="feed-input"
                type="text"
                value={emailTestTo}
                onChange={(e) => setEmailTestTo(e.target.value)}
                placeholder="seuemail@dominio.com"
              />
              <span className="feed-help">Se vazio, usa o primeiro destinatario configurado.</span>
            </label>
            <button
              className="display-open-button secondary"
              type="button"
              onClick={handleTestEmail}
              disabled={emailTesting}
            >
              {emailTesting ? 'Enviando...' : 'Enviar teste'}
            </button>
            <div className="automation-actions">
              <button
                className="display-open-button"
                type="button"
                onClick={handleSaveEmail}
                disabled={emailSaving}
              >
                {emailSaving ? 'Salvando...' : 'Salvar email'}
              </button>
              {emailMessage && <span className="automation-status">{emailMessage}</span>}
            </div>
          </div>
        </section>
      )}






      {activeTab === 'trends' && (
        <section className="config-panel config-panel-wide">
          <h3>Google Trends</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!trendsConfig.enabled}
                onChange={(e) => setTrendsConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar Trends no sistema
            </label>
            <div className="display-texts">
              <label className="feed-field">
                <span className="feed-label">Regi?o</span>
                <select
                  className="feed-input"
                  value={trendsConfig.geo}
                  onChange={(e) => setTrendsConfig(prev => ({ ...prev, geo: e.target.value }))}
                >
                  <option value="BR">Brasil</option>
                  <option value="US">Estados Unidos</option>
                  <option value="PT">Portugal</option>
                  <option value="MX">M?xico</option>
                  <option value="AR">Argentina</option>
                </select>
              </label>
              <label className="feed-field">
                <span className="feed-label">Itens exibidos</span>
                <input
                  className="feed-input"
                  type="number"
                  min="1"
                  max="50"
                  value={trendsConfig.maxItems}
                  onChange={(e) => setTrendsConfig(prev => ({ ...prev, maxItems: Number(e.target.value) }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Atualizar a cada (min)</span>
                <input
                  className="feed-input"
                  type="number"
                  min="5"
                  max="120"
                  value={trendsConfig.refreshMinutes}
                  onChange={(e) => setTrendsConfig(prev => ({ ...prev, refreshMinutes: Number(e.target.value) }))}
                />
              </label>
            </div>
            <div className="automation-actions">
              <button className="display-open-button" onClick={saveTrendsConfig} disabled={trendsSaving}>
                {trendsSaving ? 'Salvando...' : 'Salvar Trends'}
              </button>
              {trendsMessage && <span className="automation-status">{trendsMessage}</span>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'youtube' && (
        <section className="config-panel config-panel-wide">
          <h3>YouTube Data</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!youtubeConfig.enabled}
                onChange={(e) => setYoutubeConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar busca de videos relacionados
            </label>
            <div className="display-texts">
              <label className="feed-field">
                <span className="feed-label">API Key</span>
                <input
                  className="feed-input"
                  type="password"
                  value={youtubeConfig.apiKey}
                  onChange={(e) => setYoutubeConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Cole sua API Key do YouTube"
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Regiao</span>
                <select
                  className="feed-input"
                  value={youtubeConfig.region}
                  onChange={(e) => setYoutubeConfig(prev => ({ ...prev, region: e.target.value }))}
                >
                  <option value="BR">Brasil</option>
                  <option value="US">Estados Unidos</option>
                  <option value="PT">Portugal</option>
                  <option value="MX">Mexico</option>
                  <option value="AR">Argentina</option>
                </select>
              </label>
              <label className="feed-field">
                <span className="feed-label">Videos por busca</span>
                <input
                  className="feed-input"
                  type="number"
                  min="1"
                  max="25"
                  value={youtubeConfig.maxResults}
                  onChange={(e) => setYoutubeConfig(prev => ({ ...prev, maxResults: Number(e.target.value) }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Filtro SafeSearch</span>
                <select
                  className="feed-input"
                  value={youtubeConfig.safeSearch}
                  onChange={(e) => setYoutubeConfig(prev => ({ ...prev, safeSearch: e.target.value }))}
                >
                  <option value="none">Nenhum</option>
                  <option value="moderate">Moderado</option>
                  <option value="strict">Estrito</option>
                </select>
              </label>
            </div>
            <div className="feed-help">
              Crie uma chave no Google Cloud Console, habilite a API do YouTube Data v3 e cole a API Key acima.
            </div>
            <div className="automation-actions">
              <button className="display-open-button" onClick={saveYoutubeConfig} disabled={youtubeSaving}>
                {youtubeSaving ? 'Salvando...' : 'Salvar YouTube'}
              </button>
              {youtubeMessage && <span className="automation-status">{youtubeMessage}</span>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'site' && (
        <section className="config-panel config-panel-wide">
          <h3>Mini site publico</h3>
          <div className="ticker-settings">
            <label className="feed-field">
              <span className="feed-label">Slug (URL publica)</span>
              <input
                className="feed-input"
                type="text"
                value={siteConfig.slug}
                onChange={(e) => setSiteConfig(prev => ({ ...prev, slug: e.target.value }))}
              />
              <span className="feed-help">
                URL: {window.location.origin}/site/{siteConfig.slug || 'meu-site'}
              </span>
            </label>
            <div className="display-texts">
              <label className="feed-field">
                <span className="feed-label">Titulo</span>
                <input
                  className="feed-input"
                  type="text"
                  value={siteConfig.title}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Subtitulo</span>
                <input
                  className="feed-input"
                  type="text"
                  value={siteConfig.subtitle}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </label>
            </div>
            <div className="site-colors">
              <label className="feed-field">
                <span className="feed-label">Cor primaria</span>
                <input
                  className="feed-input color-input"
                  type="color"
                  value={siteConfig.primaryColor}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Cor de destaque</span>
                <input
                  className="feed-input color-input"
                  type="color"
                  value={siteConfig.accentColor}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Fundo</span>
                <input
                  className="feed-input color-input"
                  type="color"
                  value={siteConfig.backgroundColor}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Superficie</span>
                <input
                  className="feed-input color-input"
                  type="color"
                  value={siteConfig.surfaceColor}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, surfaceColor: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Texto</span>
                <input
                  className="feed-input color-input"
                  type="color"
                  value={siteConfig.textColor}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, textColor: e.target.value }))}
                />
              </label>
            </div>
            <div className="display-texts">
              <label className="feed-field">
                <span className="feed-label">Tema do mini site</span>
                <select
                  className="feed-input"
                  value={siteConfig.themeMode || 'dark'}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, themeMode: e.target.value }))}
                >
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                </select>
              </label>
              <label className="feed-field">
                <span className="feed-label">Fonte</span>
                <select
                  className="feed-input"
                  value={fontSelectValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '__custom__') {
                      setSiteConfig(prev => ({ ...prev, fontFamily: prev.fontFamily || '' }));
                      return;
                    }
                    setSiteConfig(prev => ({ ...prev, fontFamily: value }));
                  }}
                >
                  {FONT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  <option value="__custom__">Personalizar...</option>
                </select>
                {fontSelectValue === '__custom__' && (
                  <input
                    className="feed-input"
                    type="text"
                    value={siteConfig.fontFamily}
                    onChange={(e) => setSiteConfig(prev => ({ ...prev, fontFamily: e.target.value }))}
                  />
                )}
                <span className="feed-help">Use a sintaxe CSS de fonte.</span>
              </label>

            </div>
            <div className="display-texts">
              <label className="feed-field">
                <span className="feed-label">Maximo de cards</span>
                <input
                  className="feed-input"
                  type="number"
                  min="10"
                  max="300"
                  value={siteConfig.maxItems}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, maxItems: Number(e.target.value) }))}
                />
              </label>
              <label className="ticker-toggle">
                <input
                  type="checkbox"
                  checked={!!siteConfig.showTicker}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, showTicker: e.target.checked }))}
                />
                Exibir ticker no mini site
              </label>
              <label className="ticker-toggle">
                <input
                  type="checkbox"
                  checked={siteConfig.automationEnabled !== false}
                  onChange={(e) => setSiteConfig(prev => ({ ...prev, automationEnabled: e.target.checked }))}
                />
                Automatizar noticias do mini site
              </label>
            </div>
            <span className="feed-label">Links do menu</span>
            <div className="site-links">
              {(siteConfig.menuLinks || []).map((link, idx) => (
                <div key={`${link.label}-${idx}`} className="site-link-row">
                  <input
                    className="feed-input"
                    type="text"
                    placeholder="Titulo"
                    value={link.label}
                    onChange={(e) => {
                      const next = [...(siteConfig.menuLinks || [])];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setSiteConfig(prev => ({ ...prev, menuLinks: next }));
                    }}
                  />
                  <input
                    className="feed-input"
                    type="text"
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => {
                      const next = [...(siteConfig.menuLinks || [])];
                      next[idx] = { ...next[idx], url: e.target.value };
                      setSiteConfig(prev => ({ ...prev, menuLinks: next }));
                    }}
                  />
                  <button
                    className="display-open-button secondary"
                    onClick={() => {
                      const next = (siteConfig.menuLinks || []).filter((_, i) => i !== idx);
                      setSiteConfig(prev => ({ ...prev, menuLinks: next }));
                    }}
                    type="button"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <button
              className="display-open-button"
              onClick={() => setSiteConfig(prev => ({
                ...prev,
                menuLinks: [...(prev.menuLinks || []), { label: '', url: '' }]
              }))}
              type="button"
            >
              Adicionar link
            </button>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Palavras obrigatorias (uma por linha)</span>
                <textarea
                  className="feed-textarea"
                  rows="4"
                  value={(siteConfig.rules?.requireWords || []).join('\n')}
                  onChange={(e) => setSiteConfig(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      requireWords: e.target.value.split('\n').map(w => w.trim()).filter(Boolean)
                    }
                  }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Palavras bloqueadas (uma por linha)</span>
                <textarea
                  className="feed-textarea"
                  rows="4"
                  value={(siteConfig.rules?.blockWords || []).join('\n')}
                  onChange={(e) => setSiteConfig(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      blockWords: e.target.value.split('\n').map(w => w.trim()).filter(Boolean)
                    }
                  }))}
                />
              </label>
            </div>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!siteConfig.rules?.onlyWithLink}
                onChange={(e) => setSiteConfig(prev => ({
                  ...prev,
                  rules: { ...prev.rules, onlyWithLink: e.target.checked }
                }))}
              />
              Exigir link valido
            </label>
            <label className="feed-field">
              <span className="feed-label">Tags permitidas (separadas por virgula)</span>
              <input
                className="feed-input"
                type="text"
                value={(siteConfig.tags || []).join(', ')}
                onChange={(e) => setSiteConfig(prev => ({
                  ...prev,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                }))}
              />
            </label>
            <span className="feed-label">Feeds do mini site</span>
            <AutomationFeedSelector
              selectedIds={siteConfig.rules?.feedIds || []}
              onChange={(ids) => setSiteConfig(prev => ({
                ...prev,
                rules: { ...prev.rules, feedIds: ids }
              }))}
            />
            <div className="automation-actions">
              <button className="display-open-button secondary" onClick={saveSiteConfig} disabled={siteSaving}>
                {siteSaving ? 'Salvando...' : 'Salvar mini site'}
              </button>
              {siteMessage && <span className="automation-status">{siteMessage}</span>}
            </div>
            <div className="site-log">
              <div className="site-log-header">
                <span className="feed-label">Log de publicacoes</span>
                <button className="display-open-button secondary" onClick={() => fetchSitePosts()} type="button">
                  Atualizar log
                </button>
              </div>
              {sitePostsLoading && <div className="automation-status">Carregando log...</div>}
              {sitePostsError && <div className="feed-error">{sitePostsError}</div>}
              {!sitePostsLoading && !sitePostsError && sitePosts.length === 0 && (
                <div className="automation-status">Nenhuma publicacao registrada.</div>
              )}
              {!sitePostsLoading && !sitePostsError && sitePosts.length > 0 && (
                <ul className="site-log-list">
                  {sitePosts.slice(0, 50).map(post => (
                    <li key={post.id || post.link} className="site-log-item">
                      <div className="site-log-title">{post.title || post.link}</div>
                      <div className="site-log-meta">
                        <span>{post.feedName || 'Manual'}</span>
                        <span>{post.createdAt ? new Date(post.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }) : ''}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}


      {telegramHelpOpen && (
        <div className="event-overlay" role="dialog" aria-modal="true">
          <div className="event-modal">
            <div className="event-modal-header">
              <h3>Como configurar o Telegram</h3>
              <button className="event-close" onClick={() => setTelegramHelpOpen(false)} aria-label="Fechar">
                ?
              </button>
            </div>
            <div className="event-modal-body">
              <ol>
                <li>Abra o Telegram e fale com @BotFather.</li>
                <li>Use o comando /newbot e defina nome e usuario.</li>
                <li>Copie o Bot Token gerado.</li>
                <li>Adicione o bot ao grupo/canal (se for usar grupo).</li>
                <li>Para obter o Chat ID, fale com @userinfobot.</li>
                <li>Cole Bot Token e Chat ID na configuracao e salve.</li>
                <li>Clique em Testar envio.</li>
              </ol>
            </div>
            <div className="event-modal-footer">
              <button className="event-refresh" onClick={() => setTelegramHelpOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}


      {whatsappHelpOpen && (
        <div className="event-overlay" role="dialog" aria-modal="true">
          <div className="event-modal">
            <div className="event-modal-header">
              <h3>Como configurar o WhatsApp Business</h3>
              <button className="event-close" onClick={() => setWhatsappHelpOpen(false)} aria-label="Fechar">
                ?
              </button>
            </div>
            <div className="event-modal-body">
              <ol>
                <li>Acesse https://developers.facebook.com e crie um app.</li>
                <li>Adicione o produto WhatsApp Cloud API.</li>
                <li>Copie o Phone Number ID e o WABA ID do painel.</li>
                <li>Gere um Access Token permanente (System User + permiss?es WhatsApp).</li>
                <li>No WhatsApp Manager, crie um template aprovado (idioma pt_BR).</li>
                <li>Coloque 3 vari?veis no body: {'{{1}}'} titulo, {'{{2}}'} link, {'{{3}}'} fonte.</li>
                <li>Informe o n?mero de destino em formato E.164 (ex: 5511999999999).</li>
                <li>Salve e clique em Testar envio.</li>
              </ol>
            </div>
            <div className="event-modal-footer">
              <button className="event-refresh" onClick={() => setWhatsappHelpOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alertas' && (
        <section className="config-panel config-panel-wide">
          <h3>Alertas por palavra-chave</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!alerts.enabled}
                onChange={(e) => setAlerts(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar alertas
            </label>
            <label className="feed-field">
              <span className="feed-label">Palavras-chave (uma por linha)</span>
              <textarea
                className="feed-textarea"
                rows="5"
                value={alerts.keywords.join('\n')}
                onChange={(e) => setAlerts(prev => ({
                  ...prev,
                  keywords: e.target.value.split('\n').map(w => w.trim()).filter(Boolean)
                }))}
              />
            </label>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!alerts.matchAll}
                onChange={(e) => setAlerts(prev => ({ ...prev, matchAll: e.target.checked }))}
              />
              Exigir todas as palavras
            </label>
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!alerts.matchTitleOnly}
                onChange={(e) => setAlerts(prev => ({ ...prev, matchTitleOnly: e.target.checked }))}
              />
              Buscar somente no título
            </label>
            <span className="feed-label">Fontes para alertas</span>
            <AutomationFeedSelector
              selectedIds={alerts.feedIds}
              onChange={(ids) => setAlerts(prev => ({ ...prev, feedIds: ids }))}
            />
            <div className="automation-actions">
              <button className="display-open-button" onClick={saveAlerts} disabled={alertsSaving}>
                {alertsSaving ? 'Salvando...' : 'Salvar alertas'}
              </button>
              <button
                className="display-open-button secondary"
                onClick={async () => {
                  setAlertsMessage('');
                  try {
                    const res = await apiFetch(API_BASE + '/alerts/test', { method: 'POST' });
                    if (!res.ok) throw new Error();
                    setAlertsMessage('Alerta de teste enviado.');
                  } catch (err) {
                    setAlertsMessage('Não foi possível enviar o alerta de teste.');
                  }
                }}
              >
                Testar alerta
              </button>
              {alertsMessage && <span className="automation-status">{alertsMessage}</span>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'resumo' && (
        <section className="config-panel config-panel-wide">
          <h3>Resumo diário</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!summaryConfig.enabled}
                onChange={(e) => setSummaryConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar resumo diário
            </label>
            <div className="automation-grid">
              <label className="feed-field">
                <span className="feed-label">Horário de geração</span>
                <input
                  className="feed-input"
                  type="time"
                  value={summaryConfig.time}
                  onChange={(e) => setSummaryConfig(prev => ({ ...prev, time: e.target.value }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Quantidade de itens</span>
                <input
                  className="feed-input"
                  type="number"
                  min="3"
                  max="30"
                  value={summaryConfig.maxItems}
                  onChange={(e) => setSummaryConfig(prev => ({ ...prev, maxItems: Number(e.target.value) }))}
                />
              </label>
              <label className="feed-field">
                <span className="feed-label">Janela (horas)</span>
                <input
                  className="feed-input"
                  type="number"
                  min="6"
                  max="72"
                  value={summaryConfig.lookbackHours}
                  onChange={(e) => setSummaryConfig(prev => ({ ...prev, lookbackHours: Number(e.target.value) }))}
                />
              </label>
            </div>
            <div className="automation-actions">
              <button className="display-open-button" onClick={saveSummaryConfig}>
                Salvar resumo
              </button>
              <button className="display-open-button secondary" onClick={previewSummary}>
                Ver preview
              </button>
              {summaryMessage && <span className="automation-status">{summaryMessage}</span>}
            </div>
            {summaryPreview && (
              <div className="automation-preview">
                {summaryPreview.ok ? (
                  <>
                    <div className="automation-preview-title">Preview do resumo:</div>
                    {summaryPreview.items.length === 0 && (
                      <div className="automation-preview-empty">Nenhum item encontrado.</div>
                    )}
                    {summaryPreview.items.map((item, idx) => (
                      <div key={`${item.link}-${idx}`} className="automation-preview-item">
                        <strong>{item.feedName}</strong> — {item.title}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="automation-preview-empty">Falha ao gerar preview.</div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'tags' && (
        <section className="config-panel config-panel-wide">
          <h3>Tags automáticas</h3>
          <div className="ticker-settings">
            <label className="ticker-toggle">
              <input
                type="checkbox"
                checked={!!tagsConfig.enabled}
                onChange={(e) => setTagsConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Ativar tags automáticas
            </label>
            <div className="tag-rule-list">
              {(tagsConfig.rules || []).map((rule, idx) => (
                <div key={`${rule.name}-${idx}`} className="tag-rule">
                  <label className="feed-field">
                    <span className="feed-label">Nome da tag</span>
                    <input
                      className="feed-input"
                      type="text"
                      value={rule.name}
                      onChange={(e) => {
                        const next = [...tagsConfig.rules];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setTagsConfig(prev => ({ ...prev, rules: next }));
                      }}
                    />
                  </label>
                  <label className="feed-field">
                    <span className="feed-label">Palavras-chave (separadas por vírgula)</span>
                    <input
                      className="feed-input"
                      type="text"
                      value={(rule.keywords || []).join(', ')}
                      onChange={(e) => {
                        const next = [...tagsConfig.rules];
                        const keywords = e.target.value
                          .split(',')
                          .map(word => word.trim())
                          .filter(Boolean);
                        next[idx] = { ...next[idx], keywords };
                        setTagsConfig(prev => ({ ...prev, rules: next }));
                      }}
                    />
                  </label>
                  <label className="ticker-toggle">
                    <input
                      type="checkbox"
                      checked={!!rule.matchAll}
                      onChange={(e) => {
                        const next = [...tagsConfig.rules];
                        next[idx] = { ...next[idx], matchAll: e.target.checked };
                        setTagsConfig(prev => ({ ...prev, rules: next }));
                      }}
                    />
                    Exigir todas as palavras
                  </label>
                  <button
                    className="display-open-button secondary"
                    onClick={() => {
                      const next = tagsConfig.rules.filter((_, i) => i !== idx);
                      setTagsConfig(prev => ({ ...prev, rules: next }));
                    }}
                  >
                    Remover tag
                  </button>
                </div>
              ))}
            </div>
            <div className="automation-actions">
              <button
                className="display-open-button"
                onClick={() => {
                  setTagsConfig(prev => ({
                    ...prev,
                    rules: [...(prev.rules || []), { name: '', keywords: [], matchAll: false }]
                  }));
                }}
              >
                Adicionar tag
              </button>
              <button className="display-open-button secondary" onClick={saveTags}>
                Salvar tags
              </button>
              {tagsMessage && <span className="automation-status">{tagsMessage}</span>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AutomationFeedSelector({ selectedIds, onChange, disabled = false }) {
  const [feeds, setFeeds] = React.useState([]);

  React.useEffect(() => {
    apiFetch(API_BASE + '/feeds')
      .then(res => res.json())
      .then(data => {
        setFeeds(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setFeeds([]);
      });
  }, []);

  const toggleFeed = (id) => {
    if (!onChange || disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(item => item !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  return (
    <div className="automation-feeds">
      {feeds.map(feed => (
        <label key={feed.id} className="automation-feed">
          <input
            type="checkbox"
            checked={selectedIds.includes(feed.id)}
            onChange={() => toggleFeed(feed.id)}
            disabled={disabled}
          />
          {feed.name}
        </label>
      ))}
      {feeds.length === 0 && <div className="automation-empty">Nenhum feed disponível.</div>}
    </div>
  );
}




