import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './InfluencersPage.css';
import fallbackFavicon from './fallback-favicon.svg';

const STATUS_ORDER = ['recommended', 'pending', 'approved', 'discarded'];
const STATUS_LABELS = {
  recommended: 'Recomendadas',
  pending: 'Pendentes',
  approved: 'Aprovadas',
  discarded: 'Descartadas'
};

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function buildDraftFromInfluencer(influencer) {
  if (!influencer) return null;
    return {
      name: influencer.name || '',
      description: influencer.description || '',
      topics: (influencer.topics || []).join(', '),
      requireWords: (influencer.requireWords || []).join(', '),
      blockWords: (influencer.blockWords || []).join(', '),
      feedIds: influencer.feedIds || [],
      blockedFeedIds: influencer.blockedFeedIds || [],
      onlyWithLink: influencer.onlyWithLink !== false,
      diversity: influencer.diversity ?? 30,
      alignment: influencer.alignment ?? 70,
      maxItems: influencer.maxItems ?? 40,
      lookbackHours: influencer.lookbackHours ?? 48,
      language: influencer.language || '',
      region: influencer.region || '',
      useAi: influencer.useAi !== false,
      axesEconomic: influencer.axes?.economic ?? 50,
      axesSocial: influencer.axes?.social ?? 50,
      axesInstitutional: influencer.axes?.institutional ?? 50
    };
  }

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState([]);
  const [presets, setPresets] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueMessage, setQueueMessage] = useState('');
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [sheetsMessage, setSheetsMessage] = useState('');
  const [draft, setDraft] = useState(null);
  const [createDraft, setCreateDraft] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [autoApprove, setAutoApprove] = useState(true);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [publishNotice, setPublishNotice] = useState(null);
  const [postPreview, setPostPreview] = useState(null);
  const [postLoading, setPostLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const getFaviconUrl = (url) => {
    if (!url) return '';
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    } catch (err) {
      return '';
    }
  };

  const handleFaviconError = (event) => {
    if (!event?.currentTarget || event.currentTarget.dataset.fallbackApplied) return;
    event.currentTarget.dataset.fallbackApplied = '1';
    event.currentTarget.src = fallbackFavicon;
  };

  const selectedInfluencer = useMemo(
    () => influencers.find(item => item.id === selectedId) || null,
    [influencers, selectedId]
  );

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [profilesRes, presetsRes, feedsRes] = await Promise.all([
          apiFetch(`${API_BASE}/influencers`),
          apiFetch(`${API_BASE}/influencers/presets`),
          apiFetch(`${API_BASE}/feeds`)
        ]);
        const profilesData = await profilesRes.json();
        const presetsData = await presetsRes.json();
        const feedsData = await feedsRes.json();
        setInfluencers(Array.isArray(profilesData) ? profilesData : []);
        setPresets(Array.isArray(presetsData) ? presetsData : []);
        setFeeds(Array.isArray(feedsData) ? feedsData : []);
      } catch (err) {
        // ignore
      }
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedId && influencers.length) {
      setSelectedId(influencers[0].id);
    }
  }, [influencers, selectedId]);

  useEffect(() => {
    if (!selectedInfluencer) {
      setDraft(null);
      return;
    }
    setDraft(buildDraftFromInfluencer(selectedInfluencer));
    setUseAi(selectedInfluencer.useAi !== false);
    setHasChanges(false);
  }, [selectedInfluencer]);

  const updateDraft = (next) => {
    setDraft(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      return value;
    });
    setHasChanges(true);
  };

  useEffect(() => {
    if (!selectedId) return;
    const loadQueue = async () => {
      setQueueLoading(true);
      setQueueMessage('');
      try {
        const res = await apiFetch(`${API_BASE}/influencers/${selectedId}/queue`);
        const data = await res.json();
        setQueue(Array.isArray(data) ? data : []);
      } catch (err) {
        setQueueMessage('Falha ao carregar fila.');
      } finally {
        setQueueLoading(false);
      }
    };
    loadQueue();
  }, [selectedId]);

  const queueByStatus = useMemo(() => {
    return STATUS_ORDER.reduce((acc, status) => {
      acc[status] = queue.filter(item => item.status === status);
      return acc;
    }, {});
  }, [queue]);

  const refreshInfluencers = async (nextSelectedId) => {
    try {
      const res = await apiFetch(`${API_BASE}/influencers`);
      const data = await res.json();
      setInfluencers(Array.isArray(data) ? data : []);
      if (nextSelectedId) {
        setSelectedId(nextSelectedId);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleCreateInfluencer = async () => {
    if (!createDraft.name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE}/influencers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createDraft.name,
          description: createDraft.description
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      await refreshInfluencers(data.id);
      setCreateDraft({ name: '', description: '' });
      setHasChanges(false);
    } catch (err) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFromPreset = async (preset) => {
    if (!preset) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE}/influencers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preset.name,
          description: preset.description,
          topics: preset.topics,
          diversity: preset.diversity
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      await refreshInfluencers(data.id);
      setHasChanges(false);
    } catch (err) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSetup = async () => {
    if (!selectedInfluencer || !draft) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        topics: splitList(draft.topics),
        requireWords: splitList(draft.requireWords),
        blockWords: splitList(draft.blockWords),
        feedIds: draft.feedIds || [],
        blockedFeedIds: draft.blockedFeedIds || [],
        onlyWithLink: !!draft.onlyWithLink,
        diversity: Number(draft.diversity || 0),
        alignment: Number(draft.alignment || 0),
        maxItems: Number(draft.maxItems || 40),
        lookbackHours: Number(draft.lookbackHours || 48),
        language: draft.language || '',
        region: draft.region || '',
        useAi: !!draft.useAi,
        axes: {
          economic: Number(draft.axesEconomic || 0),
          social: Number(draft.axesSocial || 0),
          institutional: Number(draft.axesInstitutional || 0)
        }
      };
      const res = await apiFetch(`${API_BASE}/influencers/${selectedInfluencer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      await refreshInfluencers(selectedInfluencer.id);
      setHasChanges(false);
    } catch (err) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQueue = async () => {
    if (!selectedInfluencer) return;
    setQueueLoading(true);
    setQueueMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/influencers/${selectedInfluencer.id}/queue/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAi })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setQueue(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setQueueMessage('Falha ao gerar fila.');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleUpdateStatus = async (itemId, status) => {
    if (!selectedInfluencer || !itemId) return;
    try {
      const res = await apiFetch(`${API_BASE}/influencers/${selectedInfluencer.id}/queue/${itemId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error();
      setQueue(prev => prev.map(item => (item.id === itemId ? { ...item, status } : item)));
    } catch (err) {
      // ignore
    }
  };

  const handlePublishItem = async (itemId, channels) => {
    if (!selectedInfluencer || !itemId) return;
    try {
      const res = await apiFetch(`${API_BASE}/influencers/${selectedInfluencer.id}/queue/${itemId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels, autoApprove })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      if (data.item) {
        setQueue(prev => prev.map(entry => (entry.id === data.item.id ? data.item : entry)));
      }
      const sentChannels = Object.entries(data.results || {})
        .filter(([, ok]) => ok)
        .map(([key]) => key);
      setPublishNotice({
        title: 'Publicado',
        message: sentChannels.length
          ? `Publicado em: ${sentChannels.join(', ')}`
          : 'Nenhum canal foi publicado.'
      });
    } catch (err) {
      // ignore
    }
  };

  const handleExportQueue = async () => {
    setSheetsMessage('');
    setSheetsExporting(true);
    try {
      const res = await apiFetch(API_BASE + '/google/sheets/export/queue', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao exportar fila.');
      }
      setSheetsMessage(`Fila exportada (${data.rows || 0} itens).`);
    } catch (err) {
      setSheetsMessage(err.message || 'Falha ao exportar fila.');
    } finally {
      setSheetsExporting(false);
      setTimeout(() => setSheetsMessage(''), 3500);
    }
  };

  const handleGeneratePost = async (item) => {
    if (!item) return;
    setPostLoading(true);
    setPostPreview({ item, text: '' });
    try {
      const res = await apiFetch(`${API_BASE}/ai/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          contentSnippet: item.contentSnippet || '',
          feedName: item.feedName || '',
          link: item.link || '',
          mode: 'default'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setPostPreview({ item, text: data.text || '' });
    } catch (err) {
      setPostPreview({ item, text: 'Falha ao gerar texto.' });
    } finally {
      setPostLoading(false);
    }
  };

  const loadInfluencerEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/events?limit=80`);
      const data = await res.json();
      const filtered = Array.isArray(data)
        ? data.filter(event => event.source === 'influencer')
        : [];
      setEvents(filtered);
    } catch (err) {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleDeleteInfluencer = async () => {
    if (!selectedInfluencer) return;
    setConfirmDialog({
      title: 'Excluir perfil',
      message: `Excluir o perfil "${selectedInfluencer.name}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        setSaving(true);
        try {
          const res = await apiFetch(`${API_BASE}/influencers/${selectedInfluencer.id}`, {
            method: 'DELETE'
          });
          if (!res.ok) throw new Error();
          await refreshInfluencers();
          setSelectedId('');
          setQueue([]);
          setHasChanges(false);
        } catch (err) {
          // ignore
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleSelectInfluencer = (id) => {
    if (hasChanges) {
      setConfirmDialog({
        title: 'Descartar alteracoes',
        message: 'Existem alteracoes nao salvas. Deseja descartar?',
        confirmLabel: 'Descartar',
        cancelLabel: 'Voltar',
        onConfirm: () => {
          setSelectedId(id);
        }
      });
      return;
    }
    setSelectedId(id);
  };

  const handleDiscardChanges = () => {
    if (!selectedInfluencer) return;
    setDraft(buildDraftFromInfluencer(selectedInfluencer));
    setHasChanges(false);
  };

  return (
    <div className="influencer-page">
      <section className="influencer-hero">
        <div className="influencer-hero-text">
          <div className="influencer-eyebrow">editorial + ia</div>
          <h2 className="influencer-title">Influencers</h2>
          <p className="influencer-lead">
            Configure perfis com orientacao editorial, gere filas de noticias e revise antes
            de postar. Layout pensado para caber presets, filtros e a fila em um unico fluxo.
          </p>
          <div className="influencer-actions">
            <button className="influencer-button" onClick={handleCreateInfluencer} disabled={saving}>
              Novo perfil
            </button>
            <button className="influencer-button ghost" onClick={handleGenerateQueue} disabled={!selectedInfluencer}>
              Gerar fila
            </button>
            <label className="influencer-toggle-inline">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(event) => {
                  setUseAi(event.target.checked);
                  updateDraft(prev => (prev ? { ...prev, useAi: event.target.checked } : prev));
                }}
              />
              Usar IA na fila
            </label>
            <label className="influencer-toggle-inline">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(event) => setAutoApprove(event.target.checked)}
              />
              Aprovar ao publicar
            </label>
          </div>
        </div>
        <div className="influencer-hero-kpis">
          <div className="influencer-kpi">
            <span>Perfis ativos</span>
            <strong>{influencers.length}</strong>
          </div>
          <div className="influencer-kpi">
            <span>Fila diaria</span>
            <strong>{queue.length}</strong>
          </div>
          <div className="influencer-kpi">
            <span>Taxa aprovacao</span>
            <strong>
              {queue.length
                ? Math.round((queue.filter(item => item.status === 'approved').length / queue.length) * 100)
                : 0}
              %
            </strong>
          </div>
        </div>
      </section>

      <section className="influencer-workspace">
        <div className="influencer-dropdowns">
          <details className="influencer-dropdown" open>
            <summary>
              <span>Perfis e presets</span>
              <span className="influencer-dropdown-hint">Selecionar perfil</span>
            </summary>
            <div className="influencer-dropdown-body">
              <div className="influencer-form">
                <label>
                  Nome do perfil
                  <input
                    type="text"
                    value={createDraft.name}
                    onChange={(event) => setCreateDraft(prev => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label>
                  Descricao curta
                  <input
                    type="text"
                    value={createDraft.description}
                    onChange={(event) => setCreateDraft(prev => ({ ...prev, description: event.target.value }))}
                  />
                </label>
                <button type="button" onClick={handleCreateInfluencer} disabled={saving}>
                  Criar perfil
                </button>
              </div>

              <div className="influencer-profile-list">
                {influencers.map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    className={`influencer-profile-card ${profile.id === selectedId ? 'active' : ''}`}
                    onClick={() => handleSelectInfluencer(profile.id)}
                  >
                    <div className="influencer-profile-header">
                      <strong>{profile.name}</strong>
                      <span className="influencer-badge">Ativo</span>
                    </div>
                    <div className="influencer-profile-meta">{profile.description || 'Sem descricao'}</div>
                    <div className="influencer-chip-row">
                      <span className="influencer-chip">Alinhamento {profile.alignment ?? 70}%</span>
                      <span className="influencer-chip secondary">Diversidade {profile.diversity ?? 30}%</span>
                    </div>
                  </button>
                ))}
                {!influencers.length && (
                  <div className="influencer-empty">Nenhum perfil criado.</div>
                )}
              </div>

              <div className="influencer-presets">
                <div className="influencer-panel-subtitle">Presets rapidos</div>
                <div className="influencer-chip-row">
                  {presets.map(preset => (
                    <button
                      key={preset.key}
                      type="button"
                      className="influencer-chip secondary"
                      onClick={() => handleCreateFromPreset(preset)}
                    >
                      {preset.name}
                    </button>
                  ))}
                  {!presets.length && <span className="influencer-empty">Sem presets.</span>}
                </div>
              </div>
            </div>
          </details>

          <details className="influencer-dropdown" open>
            <summary>
              <span>Setup editorial</span>
              <span className="influencer-dropdown-hint">Filtros e eixos</span>
            </summary>
            <div className="influencer-dropdown-body">
              {!draft && <div className="influencer-empty">Selecione um perfil.</div>}
              {draft && (
                <div className="influencer-setup">
                  <div className="influencer-setup-card">
                    <div className="influencer-panel-subtitle">Identidade</div>
                    <div className="influencer-form">
                      <label>
                        Nome
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(event) => updateDraft(prev => ({ ...prev, name: event.target.value }))}
                        />
                      </label>
                      <label>
                        Descricao
                        <input
                          type="text"
                          value={draft.description}
                          onChange={(event) => updateDraft(prev => ({ ...prev, description: event.target.value }))}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="influencer-setup-card">
                    <div className="influencer-panel-subtitle">Eixos ideologicos</div>
                    <div className="influencer-axis-form">
                      <div className="influencer-axis-row">
                        <div className="influencer-axis-label">Economico</div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={draft.axesEconomic}
                          onChange={(event) => updateDraft(prev => ({ ...prev, axesEconomic: event.target.value }))}
                        />
                        <span className="influencer-axis-value">{draft.axesEconomic}</span>
                      </div>
                      <div className="influencer-axis-row">
                        <div className="influencer-axis-label">Social</div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={draft.axesSocial}
                          onChange={(event) => updateDraft(prev => ({ ...prev, axesSocial: event.target.value }))}
                        />
                        <span className="influencer-axis-value">{draft.axesSocial}</span>
                      </div>
                      <div className="influencer-axis-row">
                        <div className="influencer-axis-label">Institucional</div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={draft.axesInstitutional}
                          onChange={(event) => updateDraft(prev => ({ ...prev, axesInstitutional: event.target.value }))}
                        />
                        <span className="influencer-axis-value">{draft.axesInstitutional}</span>
                      </div>
                    </div>
                  </div>

                  <div className="influencer-setup-card">
                    <div className="influencer-panel-subtitle">Temas e palavras</div>
                    <div className="influencer-form">
                      <label>
                        Temas (separados por virgula)
                        <input
                          type="text"
                          value={draft.topics}
                          onChange={(event) => updateDraft(prev => ({ ...prev, topics: event.target.value }))}
                        />
                      </label>
                      <label>
                        Palavras obrigatorias
                        <input
                          type="text"
                          value={draft.requireWords}
                          onChange={(event) => updateDraft(prev => ({ ...prev, requireWords: event.target.value }))}
                        />
                      </label>
                      <label>
                        Palavras bloqueadas
                        <input
                          type="text"
                          value={draft.blockWords}
                          onChange={(event) => updateDraft(prev => ({ ...prev, blockWords: event.target.value }))}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="influencer-setup-card">
                    <div className="influencer-panel-subtitle">Idioma e regiao</div>
                    <div className="influencer-form">
                      <label>
                        Idioma (pt/en)
                        <input
                          type="text"
                          value={draft.language}
                          onChange={(event) => updateDraft(prev => ({ ...prev, language: event.target.value }))}
                        />
                      </label>
                      <label>
                        Regiao (ex: br)
                        <input
                          type="text"
                          value={draft.region}
                          onChange={(event) => updateDraft(prev => ({ ...prev, region: event.target.value }))}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="influencer-setup-card">
                    <div className="influencer-panel-subtitle">Fontes (permitir ou bloquear)</div>
                    <div className="influencer-feed-list">
                      {feeds.map(feed => {
                        const isAllowed = draft.feedIds.includes(feed.id);
                        const isBlocked = (draft.blockedFeedIds || []).includes(feed.id);
                        return (
                          <div key={feed.id} className="influencer-feed-row">
                            <div className="influencer-feed-name">{feed.name}</div>
                            <div className="influencer-feed-actions">
                              <button
                                type="button"
                                className={isAllowed ? 'active' : ''}
                                onClick={() => updateDraft(prev => ({
                                  ...prev,
                                  feedIds: [feed.id, ...(prev.feedIds || []).filter(item => item !== feed.id)],
                                  blockedFeedIds: (prev.blockedFeedIds || []).filter(item => item !== feed.id)
                                }))}
                              >
                                Permitir
                              </button>
                              <button
                                type="button"
                                className={isBlocked ? 'active danger' : 'danger'}
                                onClick={() => updateDraft(prev => ({
                                  ...prev,
                                  blockedFeedIds: [feed.id, ...(prev.blockedFeedIds || []).filter(item => item !== feed.id)],
                                  feedIds: (prev.feedIds || []).filter(item => item !== feed.id)
                                }))}
                              >
                                Bloquear
                              </button>
                              <button
                                type="button"
                                className={!isAllowed && !isBlocked ? 'active' : ''}
                                onClick={() => updateDraft(prev => ({
                                  ...prev,
                                  feedIds: (prev.feedIds || []).filter(item => item !== feed.id),
                                  blockedFeedIds: (prev.blockedFeedIds || []).filter(item => item !== feed.id)
                                }))}
                              >
                                Neutro
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {!feeds.length && <div className="influencer-empty">Nenhum feed disponivel.</div>}
                    </div>
                  </div>

                  <div className="influencer-setup-card">
                    <div className="influencer-panel-subtitle">Filtro IA</div>
                    <div className="influencer-form">
                      <label>
                        Alinhamento (0-100)
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.alignment}
                          onChange={(event) => updateDraft(prev => ({ ...prev, alignment: event.target.value }))}
                        />
                      </label>
                      <label>
                        Diversidade (0-100)
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.diversity}
                          onChange={(event) => updateDraft(prev => ({ ...prev, diversity: event.target.value }))}
                        />
                      </label>
                      <div className="influencer-toggle-row">
                        <label className="influencer-toggle">
                          <input
                            type="checkbox"
                            checked={draft.onlyWithLink}
                            onChange={(event) => updateDraft(prev => ({ ...prev, onlyWithLink: event.target.checked }))}
                          />
                          Exigir link valido
                        </label>
                        <label className="influencer-toggle">
                          <input
                            type="checkbox"
                            checked={!!draft.useAi}
                            onChange={(event) => {
                              updateDraft(prev => ({ ...prev, useAi: event.target.checked }));
                              setUseAi(event.target.checked);
                            }}
                          />
                          Usar IA como preferencia
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="influencer-setup-card">
                    <div className="influencer-panel-subtitle">Revisão</div>
                    <div className="influencer-inline-fields">
                      <div className="influencer-inline-field">
                        <span>Quantidade por fila</span>
                        <div className="influencer-stepper">
                          <button type="button" onClick={() => updateDraft(prev => ({ ...prev, maxItems: Math.max(5, Number(prev.maxItems || 0) - 10) }))}>-10</button>
                          <button type="button" onClick={() => updateDraft(prev => ({ ...prev, maxItems: Math.max(5, Number(prev.maxItems || 0) - 5) }))}>-5</button>
                          <input
                            type="number"
                            min="5"
                            max="200"
                            value={draft.maxItems}
                            onChange={(event) => updateDraft(prev => ({ ...prev, maxItems: event.target.value }))}
                          />
                          <button type="button" onClick={() => updateDraft(prev => ({ ...prev, maxItems: Math.min(200, Number(prev.maxItems || 0) + 5) }))}>+5</button>
                          <button type="button" onClick={() => updateDraft(prev => ({ ...prev, maxItems: Math.min(200, Number(prev.maxItems || 0) + 10) }))}>+10</button>
                        </div>
                      </div>
                      <div className="influencer-inline-field">
                        <span>Janela (horas)</span>
                        <div className="influencer-stepper">
                          <button type="button" onClick={() => updateDraft(prev => ({ ...prev, lookbackHours: Math.max(6, Number(prev.lookbackHours || 0) - 10) }))}>-10</button>
                          <button type="button" onClick={() => updateDraft(prev => ({ ...prev, lookbackHours: Math.max(6, Number(prev.lookbackHours || 0) - 5) }))}>-5</button>
                          <input
                            type="number"
                            min="6"
                            max="168"
                            value={draft.lookbackHours}
                            onChange={(event) => updateDraft(prev => ({ ...prev, lookbackHours: event.target.value }))}
                          />
                          <button type="button" onClick={() => updateDraft(prev => ({ ...prev, lookbackHours: Math.min(168, Number(prev.lookbackHours || 0) + 5) }))}>+5</button>
                          <button type="button" onClick={() => updateDraft(prev => ({ ...prev, lookbackHours: Math.min(168, Number(prev.lookbackHours || 0) + 10) }))}>+10</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="influencer-form-actions">
                    {hasChanges && <span className="influencer-unsaved">Alteracoes pendentes</span>}
                    <button type="button" onClick={handleSaveSetup} disabled={saving}>
                      Salvar setup
                    </button>
                    <button type="button" onClick={handleDiscardChanges} disabled={saving || !hasChanges}>
                      Descartar alteracoes
                    </button>
                    <button type="button" onClick={handleDeleteInfluencer} disabled={saving}>
                      Excluir perfil
                    </button>
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>

        <main className="influencer-panel influencer-panel-queue influencer-panel-full">
          <div className="influencer-panel-title">Fila de revisao</div>
          <div className="influencer-form-actions">
            <button type="button" onClick={handleExportQueue} disabled={sheetsExporting}>
              {sheetsExporting ? 'Exportando...' : 'Exportar fila (Sheets)'}
            </button>
            {sheetsMessage && <span className="influencer-copy-status">{sheetsMessage}</span>}
          </div>
          {queueMessage && <div className="influencer-empty">{queueMessage}</div>}
          {queueLoading && <div className="influencer-empty">Carregando fila...</div>}
          {!queueLoading && !queue.length && (
            <div className="influencer-empty">Nenhum item na fila. Gere uma nova fila.</div>
          )}
          <div className="influencer-queue">
            {STATUS_ORDER.map(status => (
              <div key={status} className="influencer-queue-column">
                <div className="influencer-queue-title">{STATUS_LABELS[status]}</div>
                {queueByStatus[status]?.map(item => (
                  <article key={item.id} className="influencer-news-card">
                    <div className="influencer-news-header">
                      {getFaviconUrl(item.feedUrl || item.link) && (
                        <img
                          className="influencer-news-favicon"
                          src={getFaviconUrl(item.feedUrl || item.link)}
                          alt=""
                          onError={handleFaviconError}
                        />
                      )}
                      <div className="influencer-news-title">{item.title || item.link}</div>
                    </div>
                    <div className="influencer-news-meta">
                      <span>{item.feedName || 'Fonte'}</span>
                      <span>{item.pubDate ? new Date(item.pubDate).toLocaleString('pt-BR') : ''}</span>
                    </div>
                    <div className="influencer-news-score">
                      Score alinhamento: {item.score || 0}
                      {item.aiScore !== null && item.aiScore !== undefined ? ` (IA ${item.aiScore})` : ''}
                    </div>
                    {item.publishedAt && (
                      <div className="influencer-news-meta">
                        <span>Publicado</span>
                        <span>{new Date(item.publishedAt).toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    <div className="influencer-status-actions">
                      <button type="button" onClick={() => handleUpdateStatus(item.id, 'approved')}>
                        Aprovar
                      </button>
                      <button type="button" onClick={() => handleUpdateStatus(item.id, 'pending')}>
                        Pendente
                      </button>
                      <button type="button" onClick={() => handleUpdateStatus(item.id, 'discarded')}>
                        Descartar
                      </button>
                      <button type="button" onClick={() => handleGeneratePost(item)}>
                        Gerar post
                      </button>
                      <button type="button" onClick={() => handlePublishItem(item.id, { twitter: true, telegram: true, whatsapp: true })}>
                        Publicar tudo
                      </button>
                      <button type="button" onClick={() => handlePublishItem(item.id, { twitter: true })}>
                        Publicar X
                      </button>
                      <button type="button" onClick={() => handlePublishItem(item.id, { telegram: true })}>
                        Telegram
                      </button>
                      <button type="button" onClick={() => handlePublishItem(item.id, { whatsapp: true })}>
                        WhatsApp
                      </button>
                    </div>
                  </article>
                ))}
                {!queueByStatus[status]?.length && (
                  <div className="influencer-empty">Sem itens.</div>
                )}
              </div>
            ))}
          </div>
        </main>
      </section>

      <section className="influencer-panel">
        <div className="influencer-panel-title">Log de publicacao</div>
        <div className="influencer-form-actions">
          <button type="button" onClick={loadInfluencerEvents} disabled={eventsLoading}>
            {eventsLoading ? 'Carregando...' : 'Atualizar log'}
          </button>
        </div>
        {events.length === 0 && !eventsLoading && (
          <div className="influencer-empty">Nenhum registro ainda.</div>
        )}
        {events.length > 0 && (
          <div className="influencer-log">
            {events.map(event => (
              <div key={event.id} className="influencer-log-item">
                <div>{event.message}</div>
                <div>{event.detail}</div>
                <span>{new Date(event.timestamp).toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="influencer-flow">
        <div className="influencer-flow-card">
          <span>1</span>
          <div>
            <strong>Seleciona preset</strong>
            <p>Comece com um perfil pronto e ajuste eixos quando quiser.</p>
          </div>
        </div>
        <div className="influencer-flow-card">
          <span>2</span>
          <div>
            <strong>IA organiza fila</strong>
            <p>Relevância, alinhamento e diversidade entram no ranking.</p>
          </div>
        </div>
        <div className="influencer-flow-card">
          <span>3</span>
          <div>
            <strong>Revisão humana</strong>
            <p>Aprove, descarte ou marque como exemplo para refinar.</p>
          </div>
        </div>
      </section>

      {publishNotice && (
        <div className="influencer-modal-backdrop" role="dialog" aria-modal="true">
          <div className="influencer-modal">
            <div className="influencer-modal-header">
              <strong>{publishNotice.title}</strong>
              <button type="button" onClick={() => setPublishNotice(null)}>X</button>
            </div>
            <div className="influencer-modal-body">
              {publishNotice.message}
            </div>
            <div className="influencer-modal-actions">
              <button type="button" onClick={() => setPublishNotice(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {postPreview && (
        <div className="influencer-modal-backdrop" role="dialog" aria-modal="true">
          <div className="influencer-modal">
            <div className="influencer-modal-header">
              <strong>Post gerado</strong>
              <button type="button" onClick={() => setPostPreview(null)}>X</button>
            </div>
            <div className="influencer-modal-body">
              <div className="influencer-modal-title">{postPreview.item?.title || 'Sem titulo'}</div>
              {postLoading ? (
                <div className="influencer-empty">Gerando texto...</div>
              ) : (
                <textarea readOnly value={postPreview.text || ''} rows="6" />
              )}
            </div>
            <div className="influencer-modal-actions">
              {copyStatus && <span className="influencer-copy-status">{copyStatus}</span>}
              <button
                type="button"
                onClick={() => {
                  if (postPreview?.text) {
                    navigator.clipboard?.writeText(postPreview.text);
                    setCopyStatus('Copiado!');
                    setTimeout(() => setCopyStatus(''), 1500);
                  }
                }}
              >
                Copiar texto
              </button>
              <button type="button" onClick={() => setPostPreview(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="influencer-modal-backdrop" role="dialog" aria-modal="true">
          <div className="influencer-modal">
            <div className="influencer-modal-header">
              <strong>{confirmDialog.title}</strong>
              <button type="button" onClick={() => setConfirmDialog(null)}>X</button>
            </div>
            <div className="influencer-modal-body">
              {confirmDialog.message}
            </div>
            <div className="influencer-modal-actions">
              <button type="button" onClick={() => setConfirmDialog(null)}>
                {confirmDialog.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  if (typeof action === 'function') {
                    action();
                  }
                }}
              >
                {confirmDialog.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



