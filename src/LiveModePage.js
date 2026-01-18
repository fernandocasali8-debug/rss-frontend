import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './LiveModePage.css';

const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const MAX_PEERS = 5;
const DEFAULT_TILE = { x: 40, y: 120, w: 320, h: 240 };

const buildWsUrl = (path) => {
  try {
    const base = new URL(API_BASE);
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    base.pathname = path;
    return base.toString();
  } catch (e) {
    const prefix = API_BASE.startsWith('https') ? 'wss' : 'ws';
    return `${prefix}://${API_BASE.replace(/^https?:\/\//, '')}${path}`;
  }
};

const ensureTile = (tiles, id, index, bounds) => {
  if (tiles[id]) return tiles;
  const cols = Math.max(1, Math.floor((bounds?.width || 960) / 360));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const next = {
    ...tiles,
    [id]: {
      x: 40 + col * 360,
      y: 120 + row * 260,
      w: DEFAULT_TILE.w,
      h: DEFAULT_TILE.h
    }
  };
  return next;
};

const buildLiveLayout = (preset, ids, bounds) => {
  const width = Math.max(640, Math.floor(bounds?.width || 960));
  const height = Math.max(360, Math.floor(bounds?.height || 540));
  const padding = 20;
  const gap = 12;
  const next = {};
  if (!ids.length) return next;
  if (preset === 'side') {
    if (ids.length === 1) {
      next[ids[0]] = { x: padding, y: padding, w: width - padding * 2, h: height - padding * 2 };
      return next;
    }
    const mainId = ids[0];
    const sideIds = ids.slice(1);
    const mainWidth = Math.max(320, Math.floor(width * 0.65));
    next[mainId] = {
      x: padding,
      y: padding,
      w: mainWidth - padding - gap,
      h: height - padding * 2
    };
    const columnX = mainWidth + gap;
    const columnWidth = width - columnX - padding;
    const tileHeight = Math.max(120, Math.floor((height - padding * 2 - gap * (sideIds.length - 1)) / sideIds.length));
    sideIds.forEach((id, index) => {
      next[id] = {
        x: columnX,
        y: padding + index * (tileHeight + gap),
        w: columnWidth,
        h: tileHeight
      };
    });
    return next;
  }
  if (preset === 'pip') {
    const mainId = ids[0];
    const others = ids.slice(1);
    next[mainId] = { x: padding, y: padding, w: width - padding * 2, h: height - padding * 2 };
    const pipWidth = Math.min(260, Math.floor(width * 0.28));
    const pipHeight = Math.min(180, Math.floor(height * 0.25));
    others.forEach((id, index) => {
      next[id] = {
        x: width - pipWidth - padding,
        y: padding + index * (pipHeight + gap),
        w: pipWidth,
        h: pipHeight
      };
    });
    return next;
  }
  const cols = Math.ceil(Math.sqrt(ids.length));
  const rows = Math.ceil(ids.length / cols);
  const cellWidth = Math.floor((width - padding * 2 - gap * (cols - 1)) / cols);
  const cellHeight = Math.floor((height - padding * 2 - gap * (rows - 1)) / rows);
  ids.forEach((id, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    next[id] = {
      x: padding + col * (cellWidth + gap),
      y: padding + row * (cellHeight + gap),
      w: cellWidth,
      h: cellHeight
    };
  });
  return next;
};

export default function LiveModePage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialCode = (params.get('code') || '').toUpperCase();
  const obsMode = params.get('obs') === '1';
  const previewMode = params.get('preview') === '1';
  const viewOnly = obsMode || previewMode;
  const [authUser, setAuthUser] = useState(null);
  const [roomCode, setRoomCode] = useState(initialCode);
  const [roomExpiresAt, setRoomExpiresAt] = useState('');
  const [status, setStatus] = useState('');
  const [userName, setUserName] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peers, setPeers] = useState([]);
  const [tiles, setTiles] = useState({});
  const [tickerItems, setTickerItems] = useState([]);
  const [tickerSpeed, setTickerSpeed] = useState(35);
  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [showControls, setShowControls] = useState(!viewOnly);
  const [shareScreenActive, setShareScreenActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [layoutPreset, setLayoutPreset] = useState('grid');
  const [overlays, setOverlays] = useState([]);
  const [overlayTiles, setOverlayTiles] = useState({});
  const [overlayInput, setOverlayInput] = useState('');
  const [overlayType, setOverlayType] = useState('image');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [remoteConfig, setRemoteConfig] = useState(null);

  const wsRef = useRef(null);
  const clientIdRef = useRef('');
  const peersRef = useRef(new Map());
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const localStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordStreamRef = useRef(null);
  const channelRef = useRef(null);
  const previewConfigKey = 'live-preview-config';

  useEffect(() => {
    apiFetch(API_BASE + '/auth/me')
      .then((res) => res.json())
      .then((data) => setAuthUser(data?.user || null))
      .catch(() => setAuthUser(null));
  }, []);

  useEffect(() => {
    if (!previewMode) return undefined;
    const applyConfig = (payload) => {
      if (!payload || typeof payload !== 'object') return;
      setRemoteConfig(payload);
    };
    try {
      const stored = localStorage.getItem(previewConfigKey);
      if (stored) {
        applyConfig(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
    const handleStorage = (event) => {
      if (event.key === previewConfigKey && event.newValue) {
        try {
          applyConfig(JSON.parse(event.newValue));
        } catch (e) {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('live-preview');
      channel.onmessage = (event) => applyConfig(event.data);
      channelRef.current = channel;
    }
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [previewMode]);

  useEffect(() => {
    if (previewMode) return;
    const payload = {
      layoutPreset,
      tiles,
      overlayTiles,
      overlays: overlays.map((item) => ({
        ...item,
        src: item.objectUrl ? '' : item.src,
        objectUrl: item.objectUrl ? true : false
      })),
      tickerEnabled,
      tickerSpeed
    };
    try {
      localStorage.setItem(previewConfigKey, JSON.stringify(payload));
    } catch (e) {
      // ignore
    }
    if (channelRef.current) {
      channelRef.current.postMessage(payload);
    } else if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('live-preview');
      channel.postMessage(payload);
      channel.close();
    }
  }, [previewMode, layoutPreset, tiles, overlayTiles, overlays, tickerEnabled, tickerSpeed]);

  useEffect(() => {
    if (!tickerEnabled) return;
    const load = () => {
      apiFetch(API_BASE + '/aggregate')
        .then((res) => res.json())
        .then((data) => {
          const items = Array.isArray(data) ? data : [];
          setTickerItems(items.slice(0, 30));
        })
        .catch(() => setTickerItems([]));
    };
    load();
    const timer = setInterval(load, 60 * 1000);
    return () => clearInterval(timer);
  }, [tickerEnabled]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [localStream, muted]);

  useEffect(() => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (previewMode && remoteConfig?.tiles) {
      setTiles(remoteConfig.tiles);
      return;
    }
    const ids = ['local', ...Object.keys(remoteStreams)];
    setTiles((prev) => {
      if (layoutPreset === 'manual') {
        let next = { ...prev };
        ids.forEach((id, index) => {
          next = ensureTile(next, id, index, bounds);
        });
        return next;
      }
      return buildLiveLayout(layoutPreset, ids, bounds);
    });
  }, [remoteStreams, localStream, layoutPreset, previewMode, remoteConfig]);

  useEffect(() => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (previewMode && remoteConfig?.overlayTiles) {
      setOverlayTiles(remoteConfig.overlayTiles);
      return;
    }
    setOverlayTiles((prev) => {
      let next = { ...prev };
      overlays.forEach((overlay, index) => {
        if (next[overlay.id]) return;
        next = ensureTile(next, overlay.id, index + 6, bounds);
      });
      return next;
    });
  }, [overlays, previewMode, remoteConfig]);

  useEffect(() => {
    if (!previewMode || !remoteConfig) return;
    const nextOverlays = Array.isArray(remoteConfig.overlays) ? remoteConfig.overlays : [];
    setOverlays(nextOverlays.filter((item) => item && !item.objectUrl && item.src));
    if (typeof remoteConfig.tickerEnabled === 'boolean') {
      setTickerEnabled(remoteConfig.tickerEnabled);
    }
    if (typeof remoteConfig.tickerSpeed === 'number') {
      setTickerSpeed(remoteConfig.tickerSpeed);
    }
  }, [previewMode, remoteConfig]);

  const updateTile = (id, patch) => {
    setTiles((prev) => ({ ...prev, [id]: { ...(prev[id] || DEFAULT_TILE), ...patch } }));
  };

  const updateOverlayTile = (id, patch) => {
    setOverlayTiles((prev) => ({ ...prev, [id]: { ...(prev[id] || DEFAULT_TILE), ...patch } }));
  };

  const handlePointerDown = (event, id, modeType, group = 'video') => {
    if (layoutPreset !== 'manual') {
      setLayoutPreset('manual');
    }
    if (modeType === 'resize') {
      dragRef.current = {
        id,
        mode: 'resize',
        group,
        startX: event.clientX,
        startY: event.clientY,
        start: (group === 'overlay' ? overlayTiles[id] : tiles[id]) || DEFAULT_TILE
      };
    } else {
      dragRef.current = {
        id,
        mode: 'drag',
        group,
        startX: event.clientX,
        startY: event.clientY,
        start: (group === 'overlay' ? overlayTiles[id] : tiles[id]) || DEFAULT_TILE
      };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const updater = drag.group === 'overlay' ? updateOverlayTile : updateTile;
    if (drag.mode === 'drag') {
      updater(drag.id, { x: drag.start.x + dx, y: drag.start.y + dy });
    } else {
      updater(drag.id, {
        w: Math.max(180, drag.start.w + dx),
        h: Math.max(120, drag.start.h + dy)
      });
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const stopLocalStream = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  };

  const replaceTracks = (stream) => {
    peersRef.current.forEach((pc) => {
      stream.getTracks().forEach((track) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
        if (sender) sender.replaceTrack(track);
      });
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stopLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      replaceTracks(stream);
      setShareScreenActive(false);
    } catch (e) {
      setStatus('Nao foi possivel acessar camera/microfone.');
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stopLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      replaceTracks(stream);
      setShareScreenActive(true);
    } catch (e) {
      setStatus('Nao foi possivel compartilhar a tela.');
    }
  };

  const connectSocket = React.useCallback((code, role) => {
    const wsUrl = new URL(buildWsUrl('/live/ws'));
    wsUrl.searchParams.set('code', code);
    wsUrl.searchParams.set('role', role);
    wsUrl.searchParams.set('name', userName || '');
    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('Conectado na sala.');
    };
    ws.onclose = (event) => {
      if (event?.reason) {
        setStatus(event.reason);
        return;
      }
      setStatus('Conexao encerrada.');
    };
    ws.onerror = () => {
      setStatus('Erro na conexao.');
    };
    ws.onmessage = async (event) => {
      let payload = null;
      try {
        payload = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (!payload) return;
      if (payload.type === 'welcome') {
        clientIdRef.current = payload.id;
        setRoomExpiresAt(payload.expiresAt ? new Date(payload.expiresAt).toISOString() : '');
        setPeers(payload.peers || []);
        if (role === 'host') {
          (payload.peers || []).forEach((peer) => {
            if (peer.role === 'host') return;
            createPeerConnection(peer.id, true);
          });
        } else {
          const host = (payload.peers || []).find((peer) => peer.role === 'host');
          if (host) {
            createPeerConnection(host.id, false);
          }
        }
      }
      if (payload.type === 'peer-joined') {
        setPeers((prev) => [...prev.filter((p) => p.id !== payload.id), payload]);
        setChatMessages((prev) => [
          ...prev,
          { id: `${payload.id}-${Date.now()}`, text: `${payload.name || 'Convidado'} entrou.`, system: true }
        ]);
        if (role === 'host' && payload.role !== 'host') {
          createPeerConnection(payload.id, true);
        }
      }
      if (payload.type === 'peer-left') {
        setPeers((prev) => prev.filter((p) => p.id !== payload.id));
        setChatMessages((prev) => [
          ...prev,
          { id: `${payload.id}-${Date.now()}`, text: 'Convidado saiu.', system: true }
        ]);
        const pc = peersRef.current.get(payload.id);
        if (pc) {
          pc.close();
          peersRef.current.delete(payload.id);
        }
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[payload.id];
          return next;
        });
      }
      if (payload.type === 'signal') {
        await handleSignal(payload.from, payload.data);
      }
      if (payload.type === 'broadcast' && payload.data?.type === 'chat') {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `${payload.from}-${Date.now()}`,
            text: payload.data.text,
            name: payload.data.name || 'Convidado'
          }
        ]);
      }
    };
  }, [userName]);

  const sendSignal = (to, data) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'signal', to, data }));
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload = {
      type: 'broadcast',
      data: {
        type: 'chat',
        text: chatInput.trim(),
        name: userName || (authUser?.name || 'Apresentador')
      }
    };
    ws.send(JSON.stringify(payload));
    setChatMessages((prev) => [
      ...prev,
      { id: `self-${Date.now()}`, text: chatInput.trim(), name: 'Voce', self: true }
    ]);
    setChatInput('');
  };

  const createPeerConnection = async (peerId, isInitiator) => {
    if (peersRef.current.has(peerId)) return;
    if (!localStreamRef.current && !viewOnly) {
      await startCamera();
    }
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    peersRef.current.set(peerId, pc);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    } else {
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerId, { candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    };
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal(peerId, { sdp: pc.localDescription });
    }
  };

  const handleSignal = async (peerId, data) => {
    let pc = peersRef.current.get(peerId);
    if (!pc) {
      pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      peersRef.current.set(peerId, pc);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
      } else {
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(peerId, { candidate: event.candidate });
        }
      };
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
      };
    }
    if (data?.sdp) {
      const desc = new RTCSessionDescription(data.sdp);
      await pc.setRemoteDescription(desc);
      if (desc.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(peerId, { sdp: pc.localDescription });
      }
    } else if (data?.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        // ignore
      }
    }
  };

  const handleCreateRoom = async () => {
    if (!authUser) {
      const params = new URLSearchParams();
      params.set('redirect', '/live');
      window.location.href = `${API_BASE}/auth/google?${params.toString()}`;
      return;
    }
    setStatus('');
    try {
      const res = await apiFetch(API_BASE + '/live/rooms', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar sala.');
      setRoomCode(data.code);
      setRoomExpiresAt(data.expiresAt || '');
      connectSocket(data.code, 'host');
      await startCamera();
    } catch (e) {
      setStatus(e.message || 'Falha ao criar sala.');
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode) {
      setStatus('Informe o codigo da sala.');
      return;
    }
    setStatus('');
    connectSocket(roomCode, 'guest');
    await startCamera();
  };

  const handleLeave = () => {
    wsRef.current?.close();
    wsRef.current = null;
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setRemoteStreams({});
    setPeers([]);
    stopLocalStream();
  };

  const startRecording = async () => {
    if (recording) return;
    setStatus('');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      recordStreamRef.current = stream;
      const chunks = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `live-${roomCode || 'sessao'}-${Date.now()}.webm`;
        anchor.click();
        URL.revokeObjectURL(url);
        stream.getTracks().forEach((track) => track.stop());
        recordStreamRef.current = null;
        setRecording(false);
      };
      recorder.start(500);
      setRecording(true);
    } catch (e) {
      setStatus('Nao foi possivel iniciar a gravacao.');
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current = null;
  };

  const handleAddOverlay = () => {
    const value = overlayInput.trim();
    if (!value) return;
    const id = `overlay-${Date.now()}`;
    setOverlays((prev) => [
      ...prev,
      { id, type: overlayType, src: value, name: value }
    ]);
    setOverlayInput('');
  };

  const handleUploadOverlay = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const id = `overlay-${Date.now()}`;
    const objectUrl = URL.createObjectURL(file);
    const type = file.type.startsWith('video') ? 'video' : 'image';
    setOverlays((prev) => [
      ...prev,
      { id, type, src: objectUrl, name: file.name, objectUrl: true }
    ]);
    event.target.value = '';
  };

  const handleRemoveOverlay = (id) => {
    setOverlays((prev) => {
      const item = prev.find((entry) => entry.id === id);
      if (item?.objectUrl) {
        URL.revokeObjectURL(item.src);
      }
      return prev.filter((entry) => entry.id !== id);
    });
    setOverlayTiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const allTiles = useMemo(() => {
    const list = [];
    if (!viewOnly) {
      list.push({ id: 'local', label: userName || 'Voce', stream: localStream });
    }
    Object.entries(remoteStreams).forEach(([id, stream]) => {
      const peer = peers.find((p) => p.id === id);
      list.push({ id, label: peer?.name || 'Convidado', stream });
    });
    return list;
  }, [localStream, remoteStreams, peers, userName, viewOnly]);

  const liveUrl = useMemo(() => (
    roomCode ? `${window.location.origin}/live?code=${roomCode}` : ''
  ), [roomCode]);
  const obsUrl = useMemo(() => (
    roomCode ? `${window.location.origin}/live?code=${roomCode}&obs=1` : ''
  ), [roomCode]);
  const previewUrl = useMemo(() => (
    roomCode ? `${window.location.origin}/live?code=${roomCode}&preview=1` : ''
  ), [roomCode]);

  const handleCopy = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage('Copiado!');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (e) {
      setCopyMessage('Nao foi possivel copiar.');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  useEffect(() => {
    if (!viewOnly || !roomCode) return;
    if (wsRef.current) return;
    connectSocket(roomCode, 'viewer');
  }, [viewOnly, roomCode]);

  return (
    <div
      className={`live-root ${obsMode ? 'is-obs' : ''} ${previewMode ? 'is-preview' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {showControls && (
        <div className="live-topbar">
          <div className="live-brand">Modo Live</div>
          <div className="live-actions">
            <button type="button" onClick={startCamera}>Camera</button>
            <button type="button" onClick={startScreenShare}>
              {shareScreenActive ? 'Tela ativa' : 'Compartilhar tela'}
            </button>
            <button type="button" onClick={recording ? stopRecording : startRecording}>
              {recording ? 'Parar gravacao' : 'Gravar tela'}
            </button>
            <button type="button" onClick={() => setMuted((prev) => !prev)}>
              {muted ? 'Som ligado' : 'Mutar'}
            </button>
            <button type="button" onClick={() => setShowControls(false)}>Modo OBS</button>
          </div>
        </div>
      )}

      <div className="live-shell">
        {!viewOnly && (
          <aside className="live-panel">
            <h2>Modo Live</h2>
            <p>Crie uma sala (host) ou entre com o codigo (convidado).</p>
            <div className="live-field">
              <label>Seu nome</label>
              <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nome na transmissao" />
            </div>
            <div className="live-section">
              <div className="live-section-title">
                <span>Host (quem cria a sala)</span>
                <span className="live-badge">Host</span>
              </div>
              <p className="live-section-hint">Clique para gerar o codigo e compartilhar com os convidados.</p>
              <button type="button" onClick={handleCreateRoom}>Criar sala</button>
              {roomCode && (
                <div className="live-links">
                  <div className="live-link-row">
                    <span className="live-link-label">Codigo</span>
                    <span className="live-link-value">{roomCode}</span>
                    <button type="button" onClick={() => handleCopy(roomCode)}>Copiar</button>
                  </div>
                  <div className="live-link-row">
                    <span className="live-link-label">Link convidado</span>
                    <span className="live-link-value">{liveUrl}</span>
                    <button type="button" onClick={() => handleCopy(liveUrl)}>Copiar</button>
                  </div>
                  <div className="live-link-row">
                    <span className="live-link-label">Link OBS</span>
                    <span className="live-link-value">{obsUrl}</span>
                    <button type="button" onClick={() => handleCopy(obsUrl)}>Copiar</button>
                  </div>
                  <div className="live-link-row">
                    <span className="live-link-label">Preview</span>
                    <span className="live-link-value">{previewUrl}</span>
                    <button type="button" onClick={() => handleCopy(previewUrl)}>Copiar</button>
                  </div>
                  <button type="button" className="secondary" onClick={() => window.open(previewUrl, '_blank')}>
                    Abrir preview
                  </button>
                </div>
              )}
            </div>

            <div className="live-section">
              <div className="live-section-title">
                <span>Convidado</span>
                <span className="live-badge secondary">Guest</span>
              </div>
              <p className="live-section-hint">Insira o codigo recebido para entrar.</p>
              <div className="live-field">
                <label>Codigo da sala</label>
                <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="ABC123" />
              </div>
              <div className="live-buttons">
                <button type="button" onClick={handleJoinRoom}>Entrar com codigo</button>
                <button type="button" className="secondary" onClick={handleLeave}>Sair</button>
              </div>
            </div>
            <div className="live-meta">
              <div>Expira em: {roomExpiresAt ? new Date(roomExpiresAt).toLocaleTimeString('pt-BR') : '-'}</div>
              <div>Participantes: {peers.length + (localStream ? 1 : 0)}/{MAX_PEERS}</div>
            </div>
            {copyMessage && <div className="live-status">{copyMessage}</div>}
            {status && <div className="live-status">{status}</div>}
            <div className="live-layout-controls">
              <label>Layout</label>
              <div className="live-layout-buttons">
                <button
                  type="button"
                  className={layoutPreset === 'grid' ? 'is-active' : ''}
                  onClick={() => setLayoutPreset('grid')}
                >
                  Grade
                </button>
                <button
                  type="button"
                  className={layoutPreset === 'side' ? 'is-active' : ''}
                  onClick={() => setLayoutPreset('side')}
                >
                  Lado a lado
                </button>
                <button
                  type="button"
                  className={layoutPreset === 'pip' ? 'is-active' : ''}
                  onClick={() => setLayoutPreset('pip')}
                >
                  PiP
                </button>
                <button
                  type="button"
                  className={layoutPreset === 'manual' ? 'is-active' : ''}
                  onClick={() => setLayoutPreset('manual')}
                >
                  Manual
                </button>
              </div>
            </div>
            <div className="live-overlay-controls">
              <label>Midias na tela</label>
              <div className="live-overlay-row">
                <select value={overlayType} onChange={(e) => setOverlayType(e.target.value)}>
                  <option value="image">Imagem</option>
                  <option value="video">Video</option>
                </select>
                <input
                  value={overlayInput}
                  onChange={(e) => setOverlayInput(e.target.value)}
                  placeholder="URL da midia"
                />
                <button type="button" onClick={handleAddOverlay}>Adicionar</button>
              </div>
              <div className="live-overlay-upload">
                <input type="file" accept="image/*,video/*" onChange={handleUploadOverlay} />
              </div>
              <div className="live-overlay-list">
                {overlays.map((item) => (
                  <div key={item.id} className="live-overlay-item">
                    <span>{item.name}</span>
                    <button type="button" onClick={() => handleRemoveOverlay(item.id)}>Remover</button>
                  </div>
                ))}
                {overlays.length === 0 && (
                  <div className="live-overlay-empty">Nenhuma midia adicionada.</div>
                )}
              </div>
            </div>
            <div className="live-ticker-controls">
              <label>Velocidade do ticker</label>
              <input
                type="range"
                min="15"
                max="80"
                value={tickerSpeed}
                onChange={(e) => setTickerSpeed(Number(e.target.value))}
              />
              <button type="button" onClick={() => setTickerEnabled((prev) => !prev)}>
                {tickerEnabled ? 'Desligar ticker' : 'Ligar ticker'}
              </button>
            </div>
            <div className="live-chat">
              <label>Chat rapido</label>
              <div className="live-chat-list">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`live-chat-item${msg.self ? ' is-self' : ''}${msg.system ? ' is-system' : ''}`}
                  >
                    {!msg.system && <strong>{msg.name || 'Convidado'}:</strong>}
                    <span>{msg.text}</span>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="live-chat-empty">Sem mensagens ainda.</div>
                )}
              </div>
              <div className="live-chat-input">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Enviar mensagem"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      sendChat();
                    }
                  }}
                />
                <button type="button" onClick={sendChat}>Enviar</button>
              </div>
            </div>
          </aside>
        )}

        <div className="live-stage" ref={containerRef}>
          {allTiles.map((tile) => (
            <div
              key={tile.id}
              className="live-tile"
              style={{
                left: tiles[tile.id]?.x ?? DEFAULT_TILE.x,
                top: tiles[tile.id]?.y ?? DEFAULT_TILE.y,
                width: tiles[tile.id]?.w ?? DEFAULT_TILE.w,
                height: tiles[tile.id]?.h ?? DEFAULT_TILE.h
              }}
            >
              {viewOnly ? (
                <div className="live-tile-header">
                  <span>{tile.label}</span>
                </div>
              ) : (
                <div className="live-tile-header" onPointerDown={(e) => handlePointerDown(e, tile.id, 'drag')}>
                  <span>{tile.label}</span>
                </div>
              )}
              <video
                className="live-video"
                autoPlay
                playsInline
                muted={tile.id === 'local' || muted}
                ref={(node) => {
                  if (node && tile.stream) {
                    node.srcObject = tile.stream;
                  }
                }}
              />
              {!viewOnly && (
                <div className="live-tile-resize" onPointerDown={(e) => handlePointerDown(e, tile.id, 'resize')} />
              )}
            </div>
          ))}
          {overlays.map((overlay) => (
            <div
              key={overlay.id}
              className="live-overlay"
              style={{
                left: overlayTiles[overlay.id]?.x ?? DEFAULT_TILE.x,
                top: overlayTiles[overlay.id]?.y ?? DEFAULT_TILE.y,
                width: overlayTiles[overlay.id]?.w ?? DEFAULT_TILE.w,
                height: overlayTiles[overlay.id]?.h ?? DEFAULT_TILE.h
              }}
            >
              {viewOnly ? (
                <div className="live-overlay-header">
                  <span>{overlay.type === 'video' ? 'Video' : 'Imagem'}</span>
                </div>
              ) : (
                <div
                  className="live-overlay-header"
                  onPointerDown={(e) => handlePointerDown(e, overlay.id, 'drag', 'overlay')}
                >
                  <span>{overlay.type === 'video' ? 'Video' : 'Imagem'}</span>
                </div>
              )}
              {overlay.type === 'video' ? (
                <video className="live-overlay-media" src={overlay.src} autoPlay loop muted />
              ) : (
                <img className="live-overlay-media" src={overlay.src} alt="" />
              )}
              {!viewOnly && (
                <div
                  className="live-overlay-resize"
                  onPointerDown={(e) => handlePointerDown(e, overlay.id, 'resize', 'overlay')}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {tickerEnabled && (
        <div className="live-ticker" style={{ '--ticker-speed': `${tickerSpeed}s` }}>
          <div className="live-ticker-track">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <div key={`${item.link || item.title || index}-${index}`} className="live-ticker-item">
                {item.title || 'Sem titulo'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
