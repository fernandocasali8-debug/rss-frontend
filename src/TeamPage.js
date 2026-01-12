import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import { Bell } from 'lucide-react';

const TEAM_TABS = [
  { key: 'overview', label: 'Visao geral' },
  { key: 'members', label: 'Membros' },
  { key: 'tasks', label: 'Tarefas' },
  { key: 'feeds', label: 'Feeds' },
  { key: 'alerts', label: 'Alertas' }
];

function TeamOverview({ team, members, feeds, alerts }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Resumo do time
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{team?.name || 'Time'}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {team?.description || 'Sem descricao definida.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <strong className="block text-lg text-slate-900">{members.length}</strong>
            Membros
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <strong className="block text-lg text-slate-900">{feeds.length}</strong>
            Feeds
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <strong className="block text-lg text-slate-900">
              {(alerts?.recipients || []).length}
            </strong>
            Alertas
          </div>
        </div>
      </div>
    </section>
  );
}

function TeamMembers({
  members,
  newMember,
  onNewMemberChange,
  onCreate,
  edits,
  onEditChange,
  onSave,
  onDelete,
  saving,
  message
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Adicionar membro</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Nome"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newMember.name}
            onChange={(event) => onNewMemberChange('name', event.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newMember.email}
            onChange={(event) => onNewMemberChange('email', event.target.value)}
          />
          <select
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newMember.role}
            onChange={(event) => onNewMemberChange('role', event.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            onClick={onCreate}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Adicionar membro'}
          </button>
        </div>
        {message && <div className="mt-3 text-sm text-slate-600">{message}</div>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Membros do time</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Ativo</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const draft = edits[member.id] || {};
                return (
                  <tr key={member.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.name ?? member.name ?? ''}
                        onChange={(event) => onEditChange(member.id, 'name', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="email"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.email ?? member.email ?? ''}
                        onChange={(event) => onEditChange(member.id, 'email', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.role ?? member.role ?? 'viewer'}
                        onChange={(event) => onEditChange(member.id, 'role', event.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={(draft.active ?? member.active) !== false}
                        onChange={(event) => onEditChange(member.id, 'active', event.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                          onClick={() => onSave(member.id)}
                          disabled={saving}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                          onClick={() => onDelete(member.id)}
                          disabled={saving}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr className="border-t border-slate-200">
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    Nenhum membro cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function TeamFeeds({ feeds, selectedIds, onToggle, onSave, saving }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Feeds do time</h2>
          <p className="mt-1 text-sm text-slate-500">Escolha quais feeds pertencem ao time.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar selecao'}
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Selecionar</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">URL</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((feed) => (
              <tr key={feed.id} className="border-t border-slate-200">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(feed.id)}
                    onChange={() => onToggle(feed.id)}
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800">{feed.name}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{feed.url}</td>
              </tr>
            ))}
            {feeds.length === 0 && (
              <tr className="border-t border-slate-200">
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                  Nenhum feed encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeamAlerts({ alerts, onChange, onSave, saving, message }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Alertas do time</h2>
      <p className="mt-1 text-sm text-slate-500">Destinatarios e palavras criticas.</p>
      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Destinatarios
          </label>
          <input
            type="text"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={alerts.recipients}
            onChange={(event) => onChange('recipients', event.target.value)}
            placeholder="emails separados por virgula"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Palavras criticas
          </label>
          <input
            type="text"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={alerts.criticalKeywords}
            onChange={(event) => onChange('criticalKeywords', event.target.value)}
            placeholder="termos separados por virgula"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          onClick={onSave}
          disabled={saving}
        >
          <Bell size={16} />
          {saving ? 'Salvando...' : 'Salvar alertas'}
        </button>
        {message && <div className="text-sm text-slate-600">{message}</div>}
      </div>
    </section>
  );
}

function TeamTasks({
  tasks,
  members,
  newTask,
  onNewTaskChange,
  onCreateTask,
  onUpdateStatus,
  onDeleteTask,
  onAddComment,
  saving,
  message
}) {
  const priorityRank = (value) => {
    switch (String(value || '').toLowerCase()) {
      case 'alta':
        return 1;
      case 'media':
        return 2;
      case 'baixa':
      default:
        return 3;
    }
  };
  const statusRank = (value) => {
    switch (String(value || '').toLowerCase()) {
      case 'pendente':
        return 1;
      case 'em andamento':
        return 2;
      case 'concluida':
      default:
        return 3;
    }
  };
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusDiff = statusRank(a.status) - statusRank(b.status);
    if (statusDiff !== 0) return statusDiff;
    const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (dueA !== dueB) return dueA - dueB;
    return priorityRank(a.priority) - priorityRank(b.priority);
  });
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Criar tarefa</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-6">
          <input
            type="text"
            placeholder="Titulo"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newTask.title}
            onChange={(event) => onNewTaskChange('title', event.target.value)}
          />
          <input
            type="text"
            placeholder="Descricao"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newTask.description}
            onChange={(event) => onNewTaskChange('description', event.target.value)}
          />
          <select
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newTask.assigneeEmail}
            onChange={(event) => onNewTaskChange('assigneeEmail', event.target.value)}
          >
            <option value="">Responsavel</option>
            {members.map((member) => (
              <option key={member.id} value={member.email}>
                {member.name || member.email}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newTask.dueDate}
            onChange={(event) => onNewTaskChange('dueDate', event.target.value)}
          />
          <select
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newTask.priority}
            onChange={(event) => onNewTaskChange('priority', event.target.value)}
          >
            <option value="baixa">Baixa</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            onClick={onCreateTask}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Criar tarefa'}
          </button>
        </div>
        {message && <div className="mt-3 text-sm text-slate-600">{message}</div>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tarefas do time</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Titulo</th>
                <th className="px-4 py-3">Responsavel</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => {
                const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : null;
                const isOverdue = dueTime && dueTime < Date.now() && task.status !== 'concluida';
                const commentPreview = (task.comments || []).slice(-2);
                return (
                  <tr key={task.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-slate-800">{task.title}</div>
                      {task.description && <div className="text-xs text-slate-500">{task.description}</div>}
                      {commentPreview.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          {commentPreview.map((comment) => (
                            <div key={comment.id}>
                              <strong>{comment.authorName || comment.authorEmail}:</strong> {comment.message}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          placeholder="Adicionar comentario"
                          value={newTask.commentDraft?.[task.id] || ''}
                          onChange={(event) => onNewTaskChange(`comment:${task.id}`, event.target.value)}
                        />
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                          onClick={() => onAddComment(task.id)}
                          disabled={saving}
                        >
                          Enviar
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">
                      {task.assigneeName || task.assigneeEmail}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-500">
                      {task.dueDate || '--'}
                      {isOverdue && <div className="text-xs font-semibold text-red-500">Atrasada</div>}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-500">{task.priority}</td>
                    <td className="px-4 py-3 align-top">
                      <select
                        className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={task.status}
                        onChange={(event) => onUpdateStatus(task.id, event.target.value)}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em andamento">Em andamento</option>
                        <option value="concluida">Concluida</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                        onClick={() => onDeleteTask(task.id)}
                        disabled={saving}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sortedTasks.length === 0 && (
                <tr className="border-t border-slate-200">
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                    Nenhuma tarefa cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function TeamPage() {
  const [tab, setTab] = useState('overview');
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState('');
  const [members, setMembers] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [teamFeedIds, setTeamFeedIds] = useState([]);
  const [alerts, setAlerts] = useState({ recipients: '', criticalKeywords: '' });
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeEmail: '',
    priority: 'media',
    dueDate: '',
    commentDraft: {}
  });
  const [tasksStreamStatus, setTasksStreamStatus] = useState('offline');
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'viewer', active: true });
  const [memberEdits, setMemberEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) || teams[0] || null,
    [teams, activeTeamId]
  );

  useEffect(() => {
    apiFetch(API_BASE + '/auth/me')
      .then((res) => res.json())
      .then((data) => setAuthUser(data?.user || null))
      .catch(() => setAuthUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/teams`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar times.');
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      setTeams([]);
    }
  }, []);

  const loadFeeds = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/feeds`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar feeds.');
      setFeeds(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeeds([]);
    }
  }, []);

  const loadMembers = useCallback(async (teamId) => {
    if (!teamId) return;
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar membros.');
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setMembers([]);
    }
  }, []);

  const loadTeamFeeds = useCallback(async (teamId) => {
    if (!teamId) return;
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}/feeds`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar feeds do time.');
      setTeamFeedIds(Array.isArray(data.feedIds) ? data.feedIds : []);
    } catch (err) {
      setTeamFeedIds([]);
    }
  }, []);

  const loadAlerts = useCallback(async (teamId) => {
    if (!teamId) return;
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}/alerts`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar alertas.');
      setAlerts({
        recipients: (data.recipients || []).join(', '),
        criticalKeywords: (data.criticalKeywords || []).join(', ')
      });
    } catch (err) {
      setAlerts({ recipients: '', criticalKeywords: '' });
    }
  }, []);

  const loadTasks = useCallback(async (teamId) => {
    if (!teamId) return;
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}/tasks`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar tarefas.');
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    loadTeams();
    loadFeeds();
  }, [loadTeams, loadFeeds]);

  useEffect(() => {
    if (teams.length && !activeTeamId) {
      setActiveTeamId(teams[0].id);
    }
  }, [teams, activeTeamId]);

  useEffect(() => {
    if (!activeTeamId) return;
    loadMembers(activeTeamId);
    loadTeamFeeds(activeTeamId);
    loadAlerts(activeTeamId);
    loadTasks(activeTeamId);
  }, [activeTeamId, loadMembers, loadTeamFeeds, loadAlerts, loadTasks]);

  useEffect(() => {
    if (!activeTeamId) return;
    const source = new EventSource(`${API_BASE}/stream/tasks`, { withCredentials: true });
    const handleTaskEvent = () => {
      setTasksStreamStatus('online');
      loadTasks(activeTeamId);
    };
    source.addEventListener('task', handleTaskEvent);
    source.onopen = () => setTasksStreamStatus('online');
    source.onerror = () => {
      setTasksStreamStatus('offline');
    };
    return () => {
      source.close();
      setTasksStreamStatus('offline');
    };
  }, [activeTeamId, loadTasks]);

  const handleNewMemberChange = (field, value) => {
    setNewMember((prev) => ({ ...prev, [field]: value }));
  };

  const handleMemberEditChange = (id, field, value) => {
    setMemberEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  };

  const handleCreateMember = async () => {
    if (!activeTeamId) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${activeTeamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao adicionar membro.');
      setMembers((prev) => [data, ...prev]);
      setNewMember({ name: '', email: '', role: 'viewer', active: true });
      setMessage('Membro adicionado.');
    } catch (err) {
      setMessage(err.message || 'Falha ao adicionar membro.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMember = async (memberId) => {
    if (!activeTeamId) return;
    const current = members.find((item) => item.id === memberId);
    if (!current) return;
    const payload = { ...current, ...(memberEdits[memberId] || {}) };
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${activeTeamId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar membro.');
      setMembers((prev) => prev.map((item) => (item.id === memberId ? data : item)));
      setMemberEdits((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      setMessage('Membro atualizado.');
    } catch (err) {
      setMessage(err.message || 'Falha ao salvar membro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!activeTeamId) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${activeTeamId}/members/${memberId}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao remover membro.');
      }
      setMembers((prev) => prev.filter((item) => item.id !== memberId));
      setMessage('Membro removido.');
    } catch (err) {
      setMessage(err.message || 'Falha ao remover membro.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeed = (feedId) => {
    setTeamFeedIds((prev) => (
      prev.includes(feedId) ? prev.filter((id) => id !== feedId) : [...prev, feedId]
    ));
  };

  const handleSaveFeeds = async () => {
    if (!activeTeamId) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${activeTeamId}/feeds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedIds: teamFeedIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar feeds.');
      setTeamFeedIds(Array.isArray(data.feedIds) ? data.feedIds : []);
      setMessage('Feeds atualizados.');
    } catch (err) {
      setMessage(err.message || 'Falha ao salvar feeds.');
    } finally {
      setSaving(false);
    }
  };

  const handleAlertChange = (field, value) => {
    setAlerts((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAlerts = async () => {
    if (!activeTeamId) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${activeTeamId}/alerts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: alerts.recipients,
          criticalKeywords: alerts.criticalKeywords
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar alertas.');
      setAlerts({
        recipients: (data.recipients || []).join(', '),
        criticalKeywords: (data.criticalKeywords || []).join(', ')
      });
      setMessage('Alertas atualizados.');
    } catch (err) {
      setMessage(err.message || 'Falha ao salvar alertas.');
    } finally {
      setSaving(false);
    }
  };

  const handleNewTaskChange = (field, value) => {
    if (field.startsWith('comment:')) {
      const taskId = field.split(':')[1];
      setNewTask((prev) => ({
        ...prev,
        commentDraft: {
          ...prev.commentDraft,
          [taskId]: value
        }
      }));
      return;
    }
    setNewTask((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateTask = async () => {
    if (!activeTeamId) return;
    setSaving(true);
    setMessage('');
    try {
      const assignee = members.find((member) => member.email === newTask.assigneeEmail);
      const res = await apiFetch(`${API_BASE}/teams/${activeTeamId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          assigneeName: assignee?.name || ''
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar tarefa.');
      setTasks((prev) => [data, ...prev]);
      setNewTask({ title: '', description: '', assigneeEmail: '', priority: 'media', dueDate: '', commentDraft: {} });
      setMessage('Tarefa criada.');
    } catch (err) {
      setMessage(err.message || 'Falha ao criar tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, status) => {
    if (!activeTeamId) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${activeTeamId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar tarefa.');
      setTasks((prev) => prev.map((task) => (task.id === taskId ? data : task)));
    } catch (err) {
      setMessage(err.message || 'Falha ao atualizar tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!activeTeamId) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${activeTeamId}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao remover tarefa.');
      }
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      setMessage('Tarefa removida.');
    } catch (err) {
      setMessage(err.message || 'Falha ao remover tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (taskId) => {
    if (!activeTeamId) return;
    const messageText = newTask.commentDraft?.[taskId] || '';
    if (!messageText.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${activeTeamId}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao adicionar comentario.');
      setTasks((prev) => prev.map((task) => (
        task.id === taskId
          ? { ...task, comments: [...(task.comments || []), data] }
          : task
      )));
      setNewTask((prev) => ({
        ...prev,
        commentDraft: { ...prev.commentDraft, [taskId]: '' }
      }));
      setMessage('Comentario adicionado.');
    } catch (err) {
      setMessage(err.message || 'Falha ao adicionar comentario.');
    } finally {
      setSaving(false);
    }
  };

  const email = String(authUser?.email || '').toLowerCase();
  const isTeamAdmin = teams.some((team) => (
    team.ownerEmail === email
    || (team.members || []).some((member) => (
      member.email === email && member.role === 'admin'
    ))
  ));

  if (!authLoading && authUser && !['business', 'enterprise'].includes(authUser.plan)) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Plano insuficiente</h2>
        <p className="mt-2 text-sm text-slate-500">
          O gestor de time esta disponivel apenas no plano Business ou Enterprise.
        </p>
      </div>
    );
  }

  if (!authLoading && authUser && !isTeamAdmin) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Acesso restrito</h2>
        <p className="mt-2 text-sm text-slate-500">
          Apenas administradores do time podem acessar esta area.
        </p>
      </div>
    );
  }

  if (!teams.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Nenhum time cadastrado</h2>
        <p className="mt-2 text-sm text-slate-500">
          Crie um time no Admin do sistema antes de acessar o gestor de time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Gestor de time
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              Times
              <span className={`ml-3 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                tasksStreamStatus === 'online'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                  : 'border-rose-200 bg-rose-50 text-rose-600'
              }`}>
                {tasksStreamStatus === 'online' ? 'Ao vivo' : 'Desconectado'}
              </span>
            </div>
          </div>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={activeTeam?.id || ''}
            onChange={(event) => setActiveTeamId(event.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TEAM_TABS.map((tabItem) => (
            <button
              key={tabItem.key}
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                tab === tabItem.key
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => setTab(tabItem.key)}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'overview' && (
        <TeamOverview
          team={activeTeam}
          members={members}
          feeds={feeds.filter(feed => teamFeedIds.includes(feed.id))}
          alerts={alerts}
        />
      )}
      {tab === 'members' && (
        <TeamMembers
          members={members}
          newMember={newMember}
          onNewMemberChange={handleNewMemberChange}
          onCreate={handleCreateMember}
          edits={memberEdits}
          onEditChange={handleMemberEditChange}
          onSave={handleSaveMember}
          onDelete={handleDeleteMember}
          saving={saving}
          message={message}
        />
      )}
      {tab === 'feeds' && (
        <TeamFeeds
          feeds={feeds}
          selectedIds={teamFeedIds}
          onToggle={handleToggleFeed}
          onSave={handleSaveFeeds}
          saving={saving}
        />
      )}
      {tab === 'alerts' && (
        <TeamAlerts
          alerts={alerts}
          onChange={handleAlertChange}
          onSave={handleSaveAlerts}
          saving={saving}
          message={message}
        />
      )}
      {tab === 'tasks' && (
        <TeamTasks
          tasks={tasks}
          members={members}
          newTask={newTask}
          onNewTaskChange={handleNewTaskChange}
          onCreateTask={handleCreateTask}
          onUpdateStatus={handleUpdateTaskStatus}
          onDeleteTask={handleDeleteTask}
          onAddComment={handleAddComment}
          saving={saving}
          message={message}
        />
      )}
    </div>
  );
}
