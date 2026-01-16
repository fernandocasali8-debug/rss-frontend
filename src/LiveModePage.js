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

export default function LiveModePage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialCode = (params.get('code') || '').toUpperCase();
  const obsMode = params.get('obs') === '1';
  const [authUser, setAuthUser] = useState(null);
  const [, setAuthLoading] = useState(true);
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
  const [showControls, setShowControls] = useState(!obsMode);
  const [shareScreenActive, setShareScreenActive] = useState(false);
  const [muted, setMuted] = useState(false);

  const wsRef = useRef(null);
  const clientIdRef = useRef('');
  const peersRef = useRef(new Map());
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    apiFetch(API_BASE + '/auth/me')
      .then((res) => res.json())
      .then((data) => setAuthUser(data?.user || null))
      .catch(() => setAuthUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

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
    setTiles((prev) => {
      let next = { ...prev };
      next = ensureTile(next, 'local', 0, bounds);
      Object.keys(remoteStreams).forEach((id, index) => {
        next = ensureTile(next, id, index + 1, bounds);
      });
      return next;
    });
  }, [remoteStreams]);

  const updateTile = (id, patch) => {
    setTiles((prev) => ({ ...prev, [id]: { ...(prev[id] || DEFAULT_TILE), ...patch } }));
  };

  const handlePointerDown = (event, id, modeType) => {
    if (modeType === 'resize') {
      dragRef.current = {
        id,
        mode: 'resize',
        startX: event.clientX,
        startY: event.clientY,
        start: tiles[id] || DEFAULT_TILE
      };
    } else {
      dragRef.current = {
        id,
        mode: 'drag',
        startX: event.clientX,
        startY: event.clientY,
        start: tiles[id] || DEFAULT_TILE
      };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.mode === 'drag') {
      updateTile(drag.id, { x: drag.start.x + dx, y: drag.start.y + dy });
    } else {
      updateTile(drag.id, {
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

  const connectSocket = (code, role) => {
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
            if (peer.role !== 'guest') return;
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
        if (role === 'host' && payload.role === 'guest') {
          createPeerConnection(payload.id, true);
        }
      }
      if (payload.type === 'peer-left') {
        setPeers((prev) => prev.filter((p) => p.id !== payload.id));
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
    };
  };

  const sendSignal = (to, data) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'signal', to, data }));
  };

  const createPeerConnection = async (peerId, isInitiator) => {
    if (peersRef.current.has(peerId)) return;
    if (!localStreamRef.current) {
      await startCamera();
    }
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    peersRef.current.set(peerId, pc);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
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

  const allTiles = useMemo(() => {
    const list = [{ id: 'local', label: userName || 'Voce', stream: localStream }];
    Object.entries(remoteStreams).forEach(([id, stream]) => {
      const peer = peers.find((p) => p.id === id);
      list.push({ id, label: peer?.name || 'Convidado', stream });
    });
    return list;
  }, [localStream, remoteStreams, peers, userName]);

  return (
    <div
      className={`live-root ${obsMode ? 'is-obs' : ''}`}
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
            <button type="button" onClick={() => setMuted((prev) => !prev)}>
              {muted ? 'Som ligado' : 'Mutar'}
            </button>
            <button type="button" onClick={() => setShowControls(false)}>Modo OBS</button>
          </div>
        </div>
      )}

      <div className="live-shell">
        {!obsMode && (
          <aside className="live-panel">
            <h2>Modo Live</h2>
            <p>Crie uma sala e envie o codigo para ate 5 convidados.</p>
            <div className="live-field">
              <label>Seu nome</label>
              <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nome na transmissao" />
            </div>
            <div className="live-buttons">
              <button type="button" onClick={handleCreateRoom}>Criar sala</button>
              <button type="button" onClick={handleJoinRoom}>Entrar com codigo</button>
              <button type="button" className="secondary" onClick={handleLeave}>Sair</button>
            </div>
            <div className="live-field">
              <label>Codigo da sala</label>
              <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="ABC123" />
            </div>
            <div className="live-meta">
              <div>Expira em: {roomExpiresAt ? new Date(roomExpiresAt).toLocaleTimeString('pt-BR') : '-'}</div>
              <div>Participantes: {peers.length + (localStream ? 1 : 0)}/{MAX_PEERS}</div>
            </div>
            {status && <div className="live-status">{status}</div>}
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
              <div className="live-tile-header" onPointerDown={(e) => handlePointerDown(e, tile.id, 'drag')}>
                <span>{tile.label}</span>
              </div>
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
              <div className="live-tile-resize" onPointerDown={(e) => handlePointerDown(e, tile.id, 'resize')} />
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
