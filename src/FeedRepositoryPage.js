import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { API_BASE, apiFetch } from './api';
import './FeedRepositoryPage.css';
import fallbackFavicon from './fallback-favicon.svg';

const BASE_FEED_REPOSITORY = [
  {
    name: 'G1',
    url: 'https://g1.globo.com/rss/g1/',
    description: 'Noticias gerais do G1.'
  },
  {
    name: 'UOL Noticias',
    url: 'https://noticias.uol.com.br/rss.xml',
    description: 'Cobertura nacional e internacional do UOL.'
  },
  {
    name: 'Folha de S.Paulo',
    url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',
    description: 'Ultimas noticias da Folha de S.Paulo.'
  },
  {
    name: 'Estadao',
    url: 'https://www.estadao.com.br/rss/',
    description: 'Noticias e analises do Estadao.'
  },
  {
    name: 'Agencia Brasil',
    url: 'https://agenciabrasil.ebc.com.br/rss',
    description: 'Agencia Brasil com noticias oficiais.'
  },
  {
    name: 'CartaCapital',
    url: 'https://www.cartacapital.com.br/rss/',
    description: 'Analises e politica da CartaCapital.'
  },
  {
    name: 'Exame',
    url: 'https://exame.com/feed/',
    description: 'Economia e negocios da Exame.'
  },
  {
    name: 'Veja',
    url: 'https://veja.abril.com.br/rss/',
    description: 'Reportagens e opiniao da Veja.'
  },
  {
    name: 'Poder360',
    url: 'https://www.poder360.com.br/feed/',
    description: 'Politica e bastidores no Poder360.'
  },
  {
    name: 'Congresso em Foco',
    url: 'https://congressoemfoco.uol.com.br/feed/',
    description: 'Cobertura do Congresso Nacional.'
  },
  {
    name: 'Nexo Jornal',
    url: 'https://www.nexojornal.com.br/rss.xml',
    description: 'Jornalismo explicativo do Nexo.'
  },
  {
    name: 'R7 Noticias',
    url: 'https://noticias.r7.com/feed.xml',
    description: 'Noticias gerais do R7.'
  },
  {
    name: 'Terra Noticias',
    url: 'https://www.terra.com.br/rss/',
    description: 'Noticias do portal Terra.'
  },
  {
    name: 'IG Ultimo Segundo',
    url: 'https://ultimosegundo.ig.com.br/rss',
    description: 'Destaques do IG Ultimo Segundo.'
  },
  {
    name: 'Band',
    url: 'https://www.band.uol.com.br/rss',
    description: 'Noticias da Band.'
  },
  {
    name: 'SBT News',
    url: 'https://www.sbtnews.com.br/rss',
    description: 'Noticias do SBT News.'
  },
  {
    name: 'Gazeta do Povo',
    url: 'https://www.gazetadopovo.com.br/rss/',
    description: 'Cobertura politica e economia.'
  },
  {
    name: 'O Antagonista',
    url: 'https://oantagonista.com.br/feed/',
    description: 'Politica e opiniao do O Antagonista.'
  },
  {
    name: 'Revista Oeste',
    url: 'https://revistaoeste.com/feed/',
    description: 'Noticias e opiniao da Revista Oeste.'
  },
  {
    name: 'Brasil 247',
    url: 'https://www.brasil247.com/rss',
    description: 'Noticias politicas do Brasil 247.'
  },
  {
    name: 'Diario do Centro do Mundo',
    url: 'https://www.diariodocentrodomundo.com.br/feed/',
    description: 'Noticias e opiniao do DCM.'
  },
  {
    name: 'Jornal GGN',
    url: 'https://jornalggn.com.br/feed/',
    description: 'Analises e politica do Jornal GGN.'
  },
  {
    name: 'Aos Fatos',
    url: 'https://www.aosfatos.org/rss/',
    description: 'Checagem de fatos do Aos Fatos.'
  },
  {
    name: 'Agencia Publica',
    url: 'https://apublica.org/feed/',
    description: 'Reportagens investigativas da Agencia Publica.'
  },
  {
    name: 'Metropoles',
    url: 'https://www.metropoles.com/rss',
    description: 'Noticias de politica e cidades.'
  },
  {
    name: 'Correio Braziliense',
    url: 'https://www.correiobraziliense.com.br/rss',
    description: 'Cobertura nacional do Correio Braziliense.'
  },
  {
    name: 'Valor Economico',
    url: 'https://valor.globo.com/rss',
    description: 'Economia e mercado no Valor Economico.'
  },
  {
    name: 'InfoMoney',
    url: 'https://www.infomoney.com.br/feed/',
    description: 'Mercado financeiro e investimentos.'
  },
  {
    name: 'Canaltech',
    url: 'https://canaltech.com.br/rss/',
    description: 'Tecnologia e inovacao no Canaltech.'
  }
];


function normalizeUrl(value) {
  if (!value) return '';
  return value.replace(/\/+$/, '').toLowerCase();
}

function getFaviconUrl(feedUrl) {
  try {
    const host = new URL(feedUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch (e) {
    return 'https://www.google.com/s2/favicons?domain=example.com&sz=128';
  }
}

function handleFaviconError(event) {
  if (!event?.currentTarget || event.currentTarget.dataset.fallbackApplied) return;
  event.currentTarget.dataset.fallbackApplied = '1';
  event.currentTarget.src = fallbackFavicon;
}

export default function FeedRepositoryPage() {
  const [existingFeeds, setExistingFeeds] = useState([]);
  const [message, setMessage] = useState('');
  const [loadingId, setLoadingId] = useState('');
  const [query, setQuery] = useState('');
  const [customFeeds, setCustomFeeds] = useState([]);
  const [showHidden, setShowHidden] = useState(false);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedDescription, setNewFeedDescription] = useState('');
  const [newFeedLanguage, setNewFeedLanguage] = useState('pt');
  const [statusMap, setStatusMap] = useState({});
  const [statusLoading, setStatusLoading] = useState(false);
  const [generatedFeeds, setGeneratedFeeds] = useState([]);
  const [maintenanceFeed, setMaintenanceFeed] = useState(null);
  const [maintenanceUrl, setMaintenanceUrl] = useState('');
  const [maintenanceName, setMaintenanceName] = useState('');
  const [maintenanceLanguage, setMaintenanceLanguage] = useState('pt');
  const [customUrls, setCustomUrls] = useState({});
  const [customNames, setCustomNames] = useState({});

  useEffect(() => {
    apiFetch(`${API_BASE}/feeds`)
      .then(res => res.json())
      .then(data => setExistingFeeds(Array.isArray(data) ? data : []))
      .catch(() => setExistingFeeds([]));
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('rss-repo-custom');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomFeeds(parsed);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    apiFetch(`${API_BASE}/rss/generated?limit=200`)
      .then(res => res.json())
      .then(data => setGeneratedFeeds(Array.isArray(data) ? data : []))
      .catch(() => setGeneratedFeeds([]));
  }, []);

  const extraFeeds = useMemo(() => {
    const baseSet = new Set(BASE_FEED_REPOSITORY.map(feed => normalizeUrl(feed.url)));
    const customSet = new Set(customFeeds.map(feed => normalizeUrl(feed.url)));
    return existingFeeds
      .filter(feed => !baseSet.has(normalizeUrl(feed.url)) && !customSet.has(normalizeUrl(feed.url)))
      .map(feed => ({
        name: feed.name || 'Fonte adicionada',
        url: feed.url,
        sourceUrl: feed.sourceUrl || '',
        description: 'Fonte adicionada ao sistema.',
        custom: true
      }));
  }, [customFeeds, existingFeeds]);

  const existingUrlSet = useMemo(() => {
    return new Set(existingFeeds.map(feed => normalizeUrl(feed.url)));
  }, [existingFeeds]);

  const hiddenSet = useMemo(() => {
    return new Set(
      existingFeeds
        .filter((feed) => feed.showOnTimeline === false)
        .map((feed) => normalizeUrl(feed.url))
    );
  }, [existingFeeds]);

  const getEffectiveUrl = useCallback(
    (feed) => customUrls[feed.url] || feed.url,
    [customUrls]
  );
  const getEffectiveName = useCallback(
    (feed) => customNames[feed.url] || feed.name,
    [customNames]
  );
  const generatedMap = useMemo(() => {
    const map = new Map();
    generatedFeeds.forEach(item => {
      if (item?.feedUrl && item?.url) {
        map.set(`${API_BASE}${item.feedUrl}`.toLowerCase(), item.url);
      }
    });
    return map;
  }, [generatedFeeds]);

  const getFaviconTarget = (feed) => {
    if (feed.sourceUrl) return feed.sourceUrl;
    const effective = getEffectiveUrl(feed);
    const mapped = generatedMap.get(effective.toLowerCase());
    return mapped || effective;
  };
  const getExistingFeed = (feed) => {
    const effectiveUrl = getEffectiveUrl(feed);
    return existingFeeds.find(item => normalizeUrl(item.url) === normalizeUrl(effectiveUrl));
  };

  const repositoryFeeds = useMemo(() => {
    const custom = customFeeds.map(feed => ({
      ...feed,
      custom: true
    }));
    return [...BASE_FEED_REPOSITORY, ...custom, ...extraFeeds];
  }, [customFeeds, extraFeeds]);

  const filteredFeeds = useMemo(() => {
    const term = query.trim().toLowerCase();
    return repositoryFeeds.filter(feed => {
      const matches =
        !term ||
        feed.name.toLowerCase().includes(term) ||
        (feed.description || '').toLowerCase().includes(term);
      const isHidden = hiddenSet.has(normalizeUrl(getEffectiveUrl(feed)));
      return matches && (showHidden || !isHidden);
    });
  }, [query, repositoryFeeds, hiddenSet, showHidden, getEffectiveUrl]);

  useEffect(() => {
    const urls = repositoryFeeds.map(feed => feed.url);
    if (!urls.length) return;
    setStatusLoading(true);
    apiFetch(`${API_BASE}/feeds/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls })
    })
      .then(res => res.json())
      .then(data => {
        const map = {};
        (data.items || []).forEach(item => {
          map[normalizeUrl(item.url)] = item;
        });
        setStatusMap(map);
      })
      .catch(() => {
        setStatusMap({});
      })
      .finally(() => setStatusLoading(false));
  }, [repositoryFeeds]);

  const refreshStatus = async (urls) => {
    try {
      const res = await apiFetch(`${API_BASE}/feeds/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });
      const data = await res.json();
      const map = {};
      (data.items || []).forEach(item => {
        map[normalizeUrl(item.url)] = item;
      });
      setStatusMap(prev => ({ ...prev, ...map }));
    } catch (err) {
      // ignore
    }
  };

  const handleAdd = async (feed) => {
    setMessage('');
    const effectiveUrl = getEffectiveUrl(feed);
    setLoadingId(effectiveUrl);
    try {
      const res = await apiFetch(`${API_BASE}/feeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: feed.name,
          url: effectiveUrl,
          showOnTimeline: true,
          language: feed.language || 'pt'
        })
      });
      if (!res.ok) throw new Error('Falha ao adicionar feed.');
      const data = await res.json();
      setExistingFeeds(prev => [...prev, data]);
      setMessage(`Feed adicionado: ${feed.name}.`);
      refreshStatus([effectiveUrl]);
    } catch (err) {
      setMessage('Nao foi possivel adicionar o feed.');
    } finally {
      setLoadingId('');
    }
  };

  const handleRemove = async (feed) => {
    setMessage('');
    const effectiveUrl = getEffectiveUrl(feed);
    const existing = getExistingFeed(feed);
    const feedName = getEffectiveName(feed);
    if (!window.confirm(`Remover o feed "${feedName}" do repositorio?`)) {
      return;
    }
    setLoadingId(`remove:${effectiveUrl}`);
    try {
      if (existing) {
        // Em vez de deletar, marca como oculto para não reaparecer
        const res = await apiFetch(`${API_BASE}/feeds/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...existing, showOnTimeline: false })
        });
        if (!res.ok) throw new Error('Falha ao remover feed.');
        const data = await res.json();
        setExistingFeeds(prev =>
          prev.map(item => (item.id === data.id ? data : item))
        );
      } else {
        // Base/custom sem id: cria um registro somente para esconder
        const res = await apiFetch(`${API_BASE}/feeds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: effectiveUrl,
            title: feed.title || feedName,
            category: feed.category,
            language: feed.language || 'pt',
            showOnTimeline: false
          })
        });
        if (res.ok) {
          const data = await res.json();
          setExistingFeeds(prev => [...prev, data]);
        }
      }

      if (feed.custom) {
        const next = customFeeds.filter(item => normalizeUrl(item.url) !== normalizeUrl(feed.url));
        setCustomFeeds(next);
        localStorage.setItem('rss-repo-custom', JSON.stringify(next));
        setCustomUrls(prev => {
          const nextUrls = { ...prev };
          delete nextUrls[feed.url];
          return nextUrls;
        });
        setCustomNames(prev => {
          const nextNames = { ...prev };
          delete nextNames[feed.url];
          return nextNames;
        });
      }

      setStatusMap(prev => {
        const next = { ...prev };
        delete next[normalizeUrl(effectiveUrl)];
        return next;
      });
      setMessage(`Feed removido: ${feedName}.`);
    } catch (err) {
      console.error(err);
      setMessage('Nao foi possivel remover o feed.');
    } finally {
      setLoadingId('');
    }
  };

  const handleToggleTimeline = async (feed) => {
    const existing = getExistingFeed(feed);
    if (!existing) {
      handleAdd(feed);
      return;
    }
    setMessage('');
    setLoadingId(existing.url);
    try {
      const res = await apiFetch(`${API_BASE}/feeds/${existing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnTimeline: !existing.showOnTimeline })
      });
      if (!res.ok) throw new Error('Falha ao atualizar feed.');
      const data = await res.json();
      setExistingFeeds(prev => prev.map(item => (item.id === data.id ? data : item)));
      setMessage(`Feed ${data.showOnTimeline ? 'ativado' : 'desativado'}: ${data.name}.`);
    } catch (err) {
      setMessage('Nao foi possivel atualizar o feed.');
    } finally {
      setLoadingId('');
    }
  };

  const handleAddCustomFeed = () => {
    const name = newFeedName.trim();
    const url = newFeedUrl.trim();
    const description = newFeedDescription.trim() || 'Fonte adicionada manualmente.';
    if (!name || !url) {
      setMessage('Informe nome e URL para adicionar a fonte.');
      return;
    }
    const newFeed = { name, url, description, language: newFeedLanguage, custom: true };
    const next = [...customFeeds, newFeed];
    setCustomFeeds(next);
    localStorage.setItem('rss-repo-custom', JSON.stringify(next));
    setNewFeedName('');
    setNewFeedUrl('');
    setNewFeedDescription('');
    setNewFeedLanguage('pt');
    setMessage(`Fonte adicionada ao repositorio: ${name}.`);
    refreshStatus([url]);
    handleAdd(newFeed);
  };

  const openMaintenance = (feed) => {
    setMaintenanceFeed(feed);
    setMaintenanceUrl(getEffectiveUrl(feed));
    setMaintenanceName(getEffectiveName(feed));
    setMaintenanceLanguage(feed.language || 'pt');
  };

  const closeMaintenance = () => {
    setMaintenanceFeed(null);
    setMaintenanceUrl('');
    setMaintenanceName('');
    setMaintenanceLanguage('pt');
  };

  const saveMaintenance = async () => {
    if (!maintenanceFeed) return;
    const nextUrl = maintenanceUrl.trim();
    const nextName = maintenanceName.trim() || maintenanceFeed.name;
    if (!nextUrl) {
      setMessage('Informe a URL do RSS.');
      return;
    }
    setMessage('');
    try {
      const previousUrl = getEffectiveUrl(maintenanceFeed);
      const existing = existingFeeds.find(feed => normalizeUrl(feed.url) === normalizeUrl(previousUrl));
      let updatedFeed = null;
      if (existing) {
        const res = await apiFetch(`${API_BASE}/feeds/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: nextUrl, name: nextName, language: maintenanceLanguage })
        });
        if (!res.ok) throw new Error('Falha ao atualizar feed.');
        updatedFeed = await res.json();
        setExistingFeeds(prev => prev.map(item => (item.id === updatedFeed.id ? updatedFeed : item)));
      } else {
        const res = await apiFetch(`${API_BASE}/feeds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nextName,
            url: nextUrl,
            showOnTimeline: true,
            language: maintenanceLanguage
          })
        });
        if (!res.ok) throw new Error('Falha ao adicionar feed.');
        updatedFeed = await res.json();
        setExistingFeeds(prev => [...prev, updatedFeed]);
      }
      setCustomUrls(prev => ({ ...prev, [maintenanceFeed.url]: nextUrl }));
      setCustomNames(prev => ({ ...prev, [maintenanceFeed.url]: nextName }));
      setCustomFeeds(prev => prev.map(item => (
        item.url === maintenanceFeed.url ? { ...item, language: maintenanceLanguage } : item
      )));
      refreshStatus([nextUrl]);
      setMessage(`Feed atualizado: ${nextName}.`);
      closeMaintenance();
    } catch (err) {
      setMessage(err.message || 'Nao foi possivel atualizar o feed.');
    }
  };

  return (
    <div className="feed-repo">
      <div className="feed-repo-header">
        <div>
          <h2>Repositorio de feeds</h2>
          <p>Selecione fontes prontas e adicione com um clique.</p>
        </div>
        <input
          className="feed-repo-search"
          type="search"
          placeholder="Buscar por nome ou tema"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <label className="feed-repo-toggle">
        <input
          type="checkbox"
          checked={showHidden}
          onChange={(e) => setShowHidden(e.target.checked)}
        />{' '}
        Mostrar feeds ocultos
      </label>

      {message && <div className="feed-repo-message">{message}</div>}
      {statusLoading && <div className="feed-repo-message">Verificando status dos feeds...</div>}

      <div className="feed-repo-add">
        <div>
          <h3>Adicionar nova fonte</h3>
          <p>Cadastre um site manualmente e depois clique em Adicionar feed.</p>
        </div>
        <div className="feed-repo-add-form">
          <input
            className="feed-repo-input"
            type="text"
            placeholder="Nome da fonte"
            value={newFeedName}
            onChange={(e) => setNewFeedName(e.target.value)}
          />
          <input
            className="feed-repo-input"
            type="text"
            placeholder="URL do RSS"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
          />

          <select
            className="feed-repo-input"
            value={newFeedLanguage}
            onChange={(e) => setNewFeedLanguage(e.target.value)}
          >
            <option value="pt">Portugues (nao traduzir)</option>
            <option value="auto">Outro idioma (auto detectar e traduzir para PT)</option>
          </select>
          <input
            className="feed-repo-input"
            type="text"
            placeholder="Descricao curta (opcional)"
            value={newFeedDescription}
            onChange={(e) => setNewFeedDescription(e.target.value)}
          />
          <button className="feed-repo-button" type="button" onClick={handleAddCustomFeed}>
            Adicionar ao repositorio
          </button>
        </div>
      </div>

      <div className="feed-repo-grid">
        {filteredFeeds.map(feed => {
          const effectiveUrl = getEffectiveUrl(feed);
          const existing = getExistingFeed(feed);
          const isAdded = existingUrlSet.has(normalizeUrl(effectiveUrl));
          const isRemoving = loadingId === `remove:${effectiveUrl}`;
          const status = statusMap[normalizeUrl(effectiveUrl)];
          return (
            <div
              className="feed-repo-card"
              key={feed.url}
              data-context-card="true"
              data-context-type="repo"
              data-context-id={feed.url}
              data-context-url={feed.url}
              data-context-title={feed.name || ''}
            >
              <div className="feed-repo-card-header">
                <img
                  src={getFaviconUrl(getFaviconTarget(feed))}
                  alt=""
                  className="feed-repo-logo"
                  onError={handleFaviconError}
                />
                <div>
                  <div className="feed-repo-name">
                    <span className={`feed-repo-status ${status?.status || 'unknown'}`} title={status?.message || 'Status desconhecido'} />
                    {getEffectiveName(feed)}
                  </div>
                  <div className="feed-repo-desc">{feed.description}</div>
                </div>
              </div>
              <div className="feed-repo-url">{effectiveUrl}</div>
              <div className="feed-repo-footer">
                <div className="feed-repo-status-text" title={status?.message || 'Status desconhecido'}>
                  {status?.status === 'green' && 'Operando'}
                  {status?.status === 'yellow' && 'Problema parcial'}
                  {status?.status === 'red' && 'Fora do ar'}
                  {!status?.status && 'Sem status'}
                </div>
                <div className="feed-repo-actions">
                  <button
                    className="feed-repo-refresh"
                    onClick={() => refreshStatus([effectiveUrl])}
                    title="Reverificar status"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                      <polyline points="21 3 21 9 15 9" />
                    </svg>
                  </button>
                  {status?.status === 'red' && (
                    <button className="feed-repo-maintenance" onClick={() => openMaintenance(feed)} title="Manutencao">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1 1 0 0 0 1.4 1.4l6-6a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3z" />
                      </svg>
                    </button>
                  )}
                  {(isAdded || feed.custom) && (
                    <button
                      className="feed-repo-remove"
                      onClick={() => handleRemove(feed)}
                      disabled={isRemoving || loadingId === effectiveUrl || loadingId === existing?.url}
                    >
                      {isRemoving ? 'Removendo...' : 'Remover'}
                    </button>
                  )}
                  <button
                    className={`feed-repo-button ${isAdded ? 'is-added' : ''} ${existing && !existing.showOnTimeline ? 'is-muted' : ''}`}
                    onClick={() => handleToggleTimeline(feed)}
                    disabled={loadingId === effectiveUrl || loadingId === existing?.url}
                  >
                    {loadingId === effectiveUrl || loadingId === existing?.url
                      ? 'Atualizando...'
                      : isAdded
                        ? (existing?.showOnTimeline === false ? 'Inativo' : 'Ativo')
                        : 'Adicionar feed'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {maintenanceFeed && (
        <div className="feed-repo-maintenance-panel">
          <div className="feed-repo-maintenance-card">
            <div className="feed-repo-maintenance-title">
              Manutencao do feed: {getEffectiveName(maintenanceFeed)}
            </div>
            <label className="feed-field">
              <span className="feed-label">Nome do feed</span>
              <input
                className="feed-input"
                type="text"
                value={maintenanceName}
                onChange={(e) => setMaintenanceName(e.target.value)}
              />
            </label>
            <label className="feed-field">
              <span className="feed-label">Nova URL do RSS</span>
              <input
                className="feed-input"
                type="text"
                value={maintenanceUrl}
                onChange={(e) => setMaintenanceUrl(e.target.value)}
              />
            </label>
            <label className="feed-field">
              <span className="feed-label">Idioma</span>
              <select
                className="feed-input"
                value={maintenanceLanguage}
                onChange={(e) => setMaintenanceLanguage(e.target.value)}
              >
                <option value="pt">PT</option>
                <option value="auto">Auto + PT</option>
              </select>
            </label>
            <div className="feed-repo-maintenance-actions">
              <button className="feed-repo-button" onClick={saveMaintenance}>
                Salvar
              </button>
              <button className="feed-repo-button" onClick={closeMaintenance}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



