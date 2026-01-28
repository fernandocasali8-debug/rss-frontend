import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import AdminPage from './AdminPage';
import {
  Activity,
  LogOut,
  RefreshCw,
  Rss,
  Settings,
  Shield,
  Users
} from 'lucide-react';

const ADMIN_ROUTES = [
  { key: 'overview', label: 'Visao geral', icon: Shield, path: '' },
  { key: 'feeds', label: 'Feeds', icon: Rss, path: 'feeds' },
  { key: 'events', label: 'Eventos', icon: Activity, path: 'eventos' },
  { key: 'teams', label: 'Times', icon: Users, path: 'times' },
  { key: 'users', label: 'Usuarios', icon: Users, path: 'usuarios' },
  { key: 'config', label: 'Configuracoes', icon: Settings, path: 'config' }
];

const ADMIN_PATH_TO_KEY = ADMIN_ROUTES.reduce((acc, route) => {
  if (route.path) {
    acc[route.path] = route.key;
  }
  return acc;
}, {});

const ADMIN_GUEST = {
  id: 'guest-admin',
  name: 'Administrador',
  email: 'admin@local',
  role: 'admin',
  plan: 'enterprise',
  approved: true
};

function getAdminRouteFromPath() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (!path.startsWith('/admin')) return 'overview';
  const segments = path.replace('/admin', '').split('/').filter(Boolean);
  if (!segments.length) return 'overview';
  return ADMIN_PATH_TO_KEY[segments[0]] || 'overview';
}

function AdminSidebar({ activeKey, onSelect, onLogout, authUser }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-white/10 bg-[#0B1220] text-slate-200 md:flex">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
          ADM
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Gestor</div>
          <div className="text-xs text-slate-400">Area administrativa</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          ADMIN
        </div>
        <div className="space-y-1">
          {ADMIN_ROUTES.map((route) => {
            const isActive = route.key === activeKey;
            const Icon = route.icon;
            return (
              <button
                key={route.key}
                type="button"
                onClick={() => onSelect(route.key)}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full ${
                    isActive ? 'bg-white' : 'bg-transparent'
                  }`}
                />
                <Icon
                  size={20}
                  className={`transition ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{route.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4">
        {authUser ? (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="truncate">{authUser.email || authUser.name || 'Conta'}</span>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10"
              onClick={onLogout}
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500">Nao autenticado</div>
        )}
      </div>
    </aside>
  );
}

function AdminHeader({ title, onRefresh, routes, activeKey, onSelect }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Admin
            </div>
            <div className="text-2xl font-semibold text-slate-900">{title}</div>
          </div>
          <div className="md:hidden">
            <select
              value={activeKey}
              onChange={(event) => onSelect(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >
              {routes.map((route) => (
                <option key={route.key} value={route.key}>
                  {route.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={onRefresh}
        >
          <RefreshCw size={16} />
          Atualizar dados
        </button>
      </div>
    </header>
  );
}

function AdminFeedsPage({ feeds, feedStatus, loading, statusLoading, onRefreshStatus }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Feeds cadastrados</h2>
          <p className="mt-1 text-sm text-slate-500">Lista completa de fontes monitoradas.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={onRefreshStatus}
        >
          {statusLoading ? 'Verificando...' : 'Verificar status'}
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Fonte</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Itens</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((feed) => {
              const statusInfo = feedStatus?.[feed.url] || {};
              return (
                <tr key={feed.id || feed.url} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold text-slate-800">{feed.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{feed.url}</td>
                  <td className="px-4 py-3 text-slate-600">{statusInfo.message || 'Sem dados'}</td>
                  <td className="px-4 py-3 text-slate-500">{statusInfo.count ?? '--'}</td>
                </tr>
              );
            })}
            {!loading && feeds.length === 0 && (
              <tr className="border-t border-slate-200">
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  Nenhum feed encontrado.
                </td>
              </tr>
            )}
            {loading && (
              <tr className="border-t border-slate-200">
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  Carregando feeds...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminEventsPage({ events, loading }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Eventos do sistema</h2>
      <p className="mt-1 text-sm text-slate-500">Registro consolidado de alertas e logs.</p>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <div key={event.id || event.timestamp} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="uppercase tracking-[0.2em]">{event.level || 'info'}</span>
              <span>{event.timestamp || ''}</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-800">{event.message || 'Evento'}</div>
            {event.detail && <div className="mt-1 text-xs text-slate-500">{event.detail}</div>}
          </div>
        ))}
        {!loading && events.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Nenhum evento registrado.
          </div>
        )}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Carregando eventos...
          </div>
        )}
      </div>
    </section>
  );
}

function AdminConfigPage({ summaryConfig, emailConfig, automationConfig }) {
  const summaryEnabled = summaryConfig?.enabled ? 'Ativo' : 'Desativado';
  const emailEnabled = emailConfig?.enabled ? 'Ativo' : 'Desativado';
  const automationEnabled = automationConfig?.rules?.enabled ? 'Ativo' : 'Desativado';
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Configuracoes principais</h2>
      <p className="mt-1 text-sm text-slate-500">Resumo das integracoes e politicas ativas.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Resumo diario
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-800">{summaryEnabled}</div>
          <div className="mt-1 text-xs text-slate-500">
            Horario: {summaryConfig?.time || '--'}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Email e alertas
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-800">{emailEnabled}</div>
          <div className="mt-1 text-xs text-slate-500">
            Destinatarios: {emailConfig?.alerts?.recipients?.length ?? 0}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Automacao
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-800">{automationEnabled}</div>
          <div className="mt-1 text-xs text-slate-500">
            Feeds monitorados: {automationConfig?.rules?.feedIds?.length ?? 0}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminTeamsPage({
  teams,
  membersByTeam,
  newTeam,
  onNewTeamChange,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  activeTeamId,
  onSelectTeam,
  newMember,
  onNewMemberChange,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  saving,
  message
}) {
  const activeTeam = teams.find((team) => team.id === activeTeamId) || teams[0];
  const teamMembers = membersByTeam[activeTeam?.id] || [];
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Criar time</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            type="text"
            placeholder="Nome do time"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newTeam.name}
            onChange={(event) => onNewTeamChange('name', event.target.value)}
          />
          <input
            type="text"
            placeholder="Descricao"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newTeam.description}
            onChange={(event) => onNewTeamChange('description', event.target.value)}
          />
          <input
            type="email"
            placeholder="Owner email"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newTeam.ownerEmail}
            onChange={(event) => onNewTeamChange('ownerEmail', event.target.value)}
          />
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            onClick={onCreateTeam}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Criar time'}
          </button>
        </div>
        {message && <div className="mt-3 text-sm text-slate-600">{message}</div>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Times cadastrados</h2>
            <p className="mt-1 text-sm text-slate-500">Selecione um time para editar.</p>
          </div>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={activeTeam?.id || ''}
            onChange={(event) => onSelectTeam(event.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {activeTeam ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                value={activeTeam.name}
                onChange={(event) => onUpdateTeam(activeTeam.id, 'name', event.target.value)}
              />
              <input
                type="text"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                value={activeTeam.description || ''}
                onChange={(event) => onUpdateTeam(activeTeam.id, 'description', event.target.value)}
              />
              <input
                type="email"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                value={activeTeam.ownerEmail || ''}
                onChange={(event) => onUpdateTeam(activeTeam.id, 'ownerEmail', event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => onUpdateTeam(activeTeam.id)}
                disabled={saving}
              >
                Salvar time
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                onClick={() => onDeleteTeam(activeTeam.id)}
                disabled={saving}
              >
                Remover time
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-500">Nenhum time criado.</div>
        )}
      </div>

      {activeTeam && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Membros do time</h3>
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
              onClick={() => onAddMember(activeTeam.id)}
              disabled={saving}
            >
              Adicionar
            </button>
          </div>
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
                {teamMembers.map((member) => (
                  <tr key={member.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">{member.name}</td>
                    <td className="px-4 py-3 text-slate-500">{member.email}</td>
                    <td className="px-4 py-3">{member.role}</td>
                    <td className="px-4 py-3">{member.active === false ? 'Nao' : 'Sim'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                          onClick={() => onUpdateMember(activeTeam.id, member.id, { active: member.active === false })}
                          disabled={saving}
                        >
                          {member.active === false ? 'Ativar' : 'Desativar'}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                          onClick={() => onRemoveMember(activeTeam.id, member.id)}
                          disabled={saving}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {teamMembers.length === 0 && (
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
      )}
    </section>
  );
}

function AdminUsersPage({
  users,
  loading,
  saving,
  message,
  newUser,
  onNewUserChange,
  onCreate,
  edits,
  onEditChange,
  onSave,
  onDelete
}) {
  const pendingUsers = users.filter((user) => user.approved !== true);
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Adicionar usuario</h2>
        <p className="mt-1 text-sm text-slate-500">Cadastre novos acessos administrativos.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Nome"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newUser.name}
            onChange={(event) => onNewUserChange('name', event.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newUser.email}
            onChange={(event) => onNewUserChange('email', event.target.value)}
          />
          <select
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newUser.plan}
            onChange={(event) => onNewUserChange('plan', event.target.value)}
          >
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
            value={newUser.role}
            onChange={(event) => onNewUserChange('role', event.target.value)}
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
            {saving ? 'Salvando...' : 'Criar usuario'}
          </button>
        </div>
        {message && <div className="mt-3 text-sm text-slate-600">{message}</div>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Usuarios aguardando liberacao</h2>
        <p className="mt-1 text-sm text-slate-500">Libere o acesso completo apos definir plano e role.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => {
                const draft = edits[user.id] || {};
                return (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.name ?? user.name ?? ''}
                        onChange={(event) => onEditChange(user.id, 'name', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="email"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.email ?? user.email ?? ''}
                        onChange={(event) => onEditChange(user.id, 'email', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.plan ?? user.plan ?? 'starter'}
                        onChange={(event) => onEditChange(user.id, 'plan', event.target.value)}
                      >
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.role ?? user.role ?? 'viewer'}
                        onChange={(event) => onEditChange(user.id, 'role', event.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                          onClick={() => onSave(user.id, { approved: true, active: true })}
                          disabled={saving}
                        >
                          Liberar
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                          onClick={() => onSave(user.id, { approved: false, active: true })}
                          disabled={saving}
                        >
                          Manter pendente
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pendingUsers.length === 0 && (
                <tr className="border-t border-slate-200">
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    Nenhum usuario aguardando liberacao.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Usuarios cadastrados</h2>
        <p className="mt-1 text-sm text-slate-500">Gerencie roles e status.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Login</th>
                <th className="px-4 py-3">Ultimo acesso</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Ativo</th>
                <th className="px-4 py-3">Aprovado</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const draft = edits[user.id] || {};
                const loginLabel = user.authProvider === 'google'
                  ? 'Google'
                  : (user.authProvider || 'Manual');
                const lastLoginLabel = user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString('pt-BR')
                  : '-';
                return (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.name ?? user.name ?? ''}
                        onChange={(event) => onEditChange(user.id, 'name', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="email"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.email ?? user.email ?? ''}
                        onChange={(event) => onEditChange(user.id, 'email', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {loginLabel}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {lastLoginLabel}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.plan ?? user.plan ?? 'starter'}
                        onChange={(event) => onEditChange(user.id, 'plan', event.target.value)}
                      >
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                        value={draft.role ?? user.role ?? 'viewer'}
                        onChange={(event) => onEditChange(user.id, 'role', event.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={(draft.active ?? user.active) !== false}
                        onChange={(event) => onEditChange(user.id, 'active', event.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={(draft.approved ?? user.approved) === true}
                        onChange={(event) => onEditChange(user.id, 'approved', event.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                          onClick={() => onSave(user.id)}
                          disabled={saving}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                          onClick={() => onDelete(user.id)}
                          disabled={saving}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
                <tr className="border-t border-slate-200">
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                    Nenhum usuario cadastrado.
                  </td>
                </tr>
              )}
              {loading && (
                <tr className="border-t border-slate-200">
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                    Carregando usuarios...
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

export default function AdminApp() {
  const [adminPage, setAdminPage] = useState(getAdminRouteFromPath());
  const [authUser, setAuthUser] = useState(ADMIN_GUEST);
  const [authLoading, setAuthLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [feeds, setFeeds] = useState([]);
  const [feedsLoading, setFeedsLoading] = useState(true);
  const [feedStatus, setFeedStatus] = useState({});
  const [feedStatusLoading, setFeedStatusLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersSaving, setUsersSaving] = useState(false);
  const [usersMessage, setUsersMessage] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    plan: 'starter',
    role: 'viewer',
    active: true,
    approved: true
  });
  const [userEdits, setUserEdits] = useState({});
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  const [activeTeamId, setActiveTeamId] = useState('');
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    ownerEmail: ''
  });
  const [newTeamMember, setNewTeamMember] = useState({
    name: '',
    email: '',
    role: 'viewer'
  });
  const [summaryConfig, setSummaryConfig] = useState(null);
  const [emailConfig, setEmailConfig] = useState(null);
  const [automationConfig, setAutomationConfig] = useState(null);

  const activeRoute = useMemo(
    () => ADMIN_ROUTES.find((route) => route.key === adminPage) || ADMIN_ROUTES[0],
    [adminPage]
  );

  const navigateAdmin = useCallback((key) => {
    const route = ADMIN_ROUTES.find((item) => item.key === key);
    if (!route) return;
    const nextPath = route.path ? `/admin/${route.path}` : '/admin';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setAdminPage(route.key);
  }, []);

  useEffect(() => {
    const handlePopState = () => setAdminPage(getAdminRouteFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    setAuthLoading(true);
    apiFetch(API_BASE + '/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setAuthUser(data?.user || ADMIN_GUEST);
      })
      .catch(() => {
        setAuthUser(ADMIN_GUEST);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/dashboard/metrics?period=24h`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar metricas.');
      setMetrics(data);
    } catch (err) {
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const loadFeeds = useCallback(async () => {
    setFeedsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/feeds`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar feeds.');
      setFeeds(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeeds([]);
    } finally {
      setFeedsLoading(false);
    }
  }, []);

  const loadFeedStatus = useCallback(async (feedList) => {
    if (!Array.isArray(feedList) || feedList.length === 0) {
      setFeedStatus({});
      return;
    }
    setFeedStatusLoading(true);
    try {
      const urls = feedList.map((feed) => feed.url).filter(Boolean);
      const res = await apiFetch(`${API_BASE}/feeds/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao verificar feeds.');
      const nextStatus = {};
      (data.items || []).forEach((item) => {
        nextStatus[item.url] = item;
      });
      setFeedStatus(nextStatus);
    } catch (err) {
      setFeedStatus({});
    } finally {
      setFeedStatusLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/events?limit=60`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar eventos.');
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/admin/users`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar usuarios.');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/teams`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar times.');
      setTeams(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length && !activeTeamId) {
        setActiveTeamId(data[0].id);
      }
    } catch (err) {
      setTeams([]);
    }
  }, [activeTeamId]);

  const loadTeamMembers = useCallback(async (teamId) => {
    if (!teamId) return;
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar membros do time.');
      setTeamMembers((prev) => ({ ...prev, [teamId]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      setTeamMembers((prev) => ({ ...prev, [teamId]: [] }));
    }
  }, []);

  const loadConfigs = useCallback(async () => {
    try {
      const [summaryRes, emailRes, automationRes] = await Promise.all([
        apiFetch(`${API_BASE}/summary/config`),
        apiFetch(`${API_BASE}/email/config`),
        apiFetch(`${API_BASE}/automation`)
      ]);
      const summaryData = await summaryRes.json();
      const emailData = await emailRes.json();
      const automationData = await automationRes.json();
      setSummaryConfig(summaryRes.ok ? summaryData : null);
      setEmailConfig(emailRes.ok ? emailData : null);
      setAutomationConfig(automationRes.ok ? automationData : null);
    } catch (err) {
      setSummaryConfig(null);
      setEmailConfig(null);
      setAutomationConfig(null);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    loadFeeds();
    loadEvents();
    loadUsers();
    loadTeams();
    loadConfigs();
    const interval = setInterval(() => {
      loadMetrics();
      loadEvents();
    }, 120000);
    return () => clearInterval(interval);
  }, [loadMetrics, loadFeeds, loadEvents, loadUsers, loadTeams, loadConfigs]);

  useEffect(() => {
    if (feeds.length) {
      loadFeedStatus(feeds);
    }
  }, [feeds, loadFeedStatus]);

  useEffect(() => {
    if (activeTeamId) {
      loadTeamMembers(activeTeamId);
    }
  }, [activeTeamId, loadTeamMembers]);

  const handleNewUserChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserEditChange = (id, field, value) => {
    setUserEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const createUser = async () => {
    setUsersSaving(true);
    setUsersMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar usuario.');
      setUsers((prev) => [data, ...prev]);
      setNewUser({ name: '', email: '', plan: 'starter', role: 'viewer', active: true, approved: true });
      setUsersMessage('Usuario criado com sucesso.');
    } catch (err) {
      setUsersMessage(err.message || 'Falha ao criar usuario.');
    } finally {
      setUsersSaving(false);
    }
  };

  const handleNewTeamChange = (field, value) => {
    setNewTeam((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateTeam = async () => {
    setUsersSaving(true);
    setUsersMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar time.');
      setTeams((prev) => [data, ...prev]);
      setActiveTeamId(data.id);
      setNewTeam({ name: '', description: '', ownerEmail: '' });
      setUsersMessage('Time criado.');
    } catch (err) {
      setUsersMessage(err.message || 'Falha ao criar time.');
    } finally {
      setUsersSaving(false);
    }
  };

  const handleUpdateTeam = async (teamId, field, value) => {
    if (field) {
      setTeams((prev) => prev.map((team) => (
        team.id === teamId ? { ...team, [field]: value } : team
      )));
      return;
    }
    const team = teams.find((item) => item.id === teamId);
    if (!team) return;
    setUsersSaving(true);
    setUsersMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar time.');
      setTeams((prev) => prev.map((item) => (item.id === teamId ? data : item)));
      setUsersMessage('Time atualizado.');
    } catch (err) {
      setUsersMessage(err.message || 'Falha ao atualizar time.');
    } finally {
      setUsersSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    setUsersSaving(true);
    setUsersMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao remover time.');
      }
      setTeams((prev) => prev.filter((team) => team.id !== teamId));
      setActiveTeamId('');
      setUsersMessage('Time removido.');
    } catch (err) {
      setUsersMessage(err.message || 'Falha ao remover time.');
    } finally {
      setUsersSaving(false);
    }
  };

  const handleNewTeamMemberChange = (field, value) => {
    setNewTeamMember((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTeamMember = async (teamId) => {
    if (!teamId) return;
    setUsersSaving(true);
    setUsersMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeamMember)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao adicionar membro.');
      setTeamMembers((prev) => ({
        ...prev,
        [teamId]: [data, ...(prev[teamId] || [])]
      }));
      setNewTeamMember({ name: '', email: '', role: 'viewer' });
      setUsersMessage('Membro adicionado.');
    } catch (err) {
      setUsersMessage(err.message || 'Falha ao adicionar membro.');
    } finally {
      setUsersSaving(false);
    }
  };

  const handleUpdateTeamMember = async (teamId, memberId, payload) => {
    setUsersSaving(true);
    setUsersMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar membro.');
      setTeamMembers((prev) => ({
        ...prev,
        [teamId]: (prev[teamId] || []).map((item) => (item.id === memberId ? data : item))
      }));
      setUsersMessage('Membro atualizado.');
    } catch (err) {
      setUsersMessage(err.message || 'Falha ao atualizar membro.');
    } finally {
      setUsersSaving(false);
    }
  };

  const handleRemoveTeamMember = async (teamId, memberId) => {
    setUsersSaving(true);
    setUsersMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao remover membro.');
      }
      setTeamMembers((prev) => ({
        ...prev,
        [teamId]: (prev[teamId] || []).filter((item) => item.id !== memberId)
      }));
      setUsersMessage('Membro removido.');
    } catch (err) {
      setUsersMessage(err.message || 'Falha ao remover membro.');
    } finally {
      setUsersSaving(false);
    }
  };

  const saveUser = async (id, overrides = null) => {
    const current = users.find((user) => user.id === id);
    if (!current) return;
    const draft = userEdits[id] || {};
    const payload = { ...current, ...draft, ...(overrides || {}) };
    setUsersSaving(true);
    setUsersMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar usuario.');
      setUsers((prev) => prev.map((user) => (user.id === id ? data : user)));
      setUserEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setUsersMessage('Usuario atualizado.');
    } catch (err) {
      setUsersMessage(err.message || 'Falha ao salvar usuario.');
    } finally {
      setUsersSaving(false);
    }
  };

  const deleteUser = async (id) => {
    setUsersSaving(true);
    setUsersMessage('');
    try {
      const res = await apiFetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao remover usuario.');
      }
      setUsers((prev) => prev.filter((user) => user.id !== id));
      setUsersMessage('Usuario removido.');
    } catch (err) {
      setUsersMessage(err.message || 'Falha ao remover usuario.');
    } finally {
      setUsersSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch(API_BASE + '/auth/logout', { method: 'POST' });
    } catch (err) {
      // ignore
    } finally {
      setAuthUser(ADMIN_GUEST);
    }
  };

  const handleLogin = () => {
    setAuthUser(ADMIN_GUEST);
  };

  if (!authLoading && authUser && authUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Acesso restrito</h2>
            <p className="mt-2 text-sm text-slate-500">
              Esta area e exclusiva para administradores do sistema.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminSidebar
        activeKey={adminPage}
        onSelect={navigateAdmin}
        onLogout={handleLogout}
        authUser={authUser}
      />
      <div className="min-h-screen md:pl-[250px]">
        <AdminHeader
          title={activeRoute.label}
          onRefresh={() => {
            loadMetrics();
            loadFeeds();
            loadEvents();
            loadUsers();
            loadTeams();
            loadConfigs();
          }}
          routes={ADMIN_ROUTES}
          activeKey={adminPage}
          onSelect={navigateAdmin}
        />
        <main className="space-y-6 px-6 pb-16 pt-6 md:px-10">
          {adminPage === 'overview' && (
            <AdminPage
              metrics={metrics}
              feeds={feeds}
              feedStatus={feedStatus}
              events={events}
              summaryConfig={summaryConfig}
              emailConfig={emailConfig}
              automationConfig={automationConfig}
              loading={metricsLoading || feedsLoading || eventsLoading}
            />
          )}
          {adminPage === 'feeds' && (
            <AdminFeedsPage
              feeds={feeds}
              feedStatus={feedStatus}
              loading={feedsLoading}
              statusLoading={feedStatusLoading}
              onRefreshStatus={() => loadFeedStatus(feeds)}
            />
          )}
          {adminPage === 'events' && (
            <AdminEventsPage
              events={events}
              loading={eventsLoading}
            />
          )}
          {adminPage === 'teams' && (
            <AdminTeamsPage
              teams={teams}
              membersByTeam={teamMembers}
              newTeam={newTeam}
              onNewTeamChange={handleNewTeamChange}
              onCreateTeam={handleCreateTeam}
              onUpdateTeam={handleUpdateTeam}
              onDeleteTeam={handleDeleteTeam}
              activeTeamId={activeTeamId}
              onSelectTeam={setActiveTeamId}
              newMember={newTeamMember}
              onNewMemberChange={handleNewTeamMemberChange}
              onAddMember={handleAddTeamMember}
              onUpdateMember={handleUpdateTeamMember}
              onRemoveMember={handleRemoveTeamMember}
              saving={usersSaving}
              message={usersMessage}
            />
          )}
          {adminPage === 'users' && (
            <AdminUsersPage
              users={users}
              loading={usersLoading}
              saving={usersSaving}
              message={usersMessage}
              newUser={newUser}
              onNewUserChange={handleNewUserChange}
              onCreate={createUser}
              edits={userEdits}
              onEditChange={handleUserEditChange}
              onSave={saveUser}
              onDelete={deleteUser}
            />
          )}
          {adminPage === 'config' && (
            <AdminConfigPage
              summaryConfig={summaryConfig}
              emailConfig={emailConfig}
              automationConfig={automationConfig}
            />
          )}
        </main>
      </div>
    </div>
  );
}
