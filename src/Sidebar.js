import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, RefreshCw, X } from 'lucide-react';

const baseItemClasses =
  'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200';

export default function Sidebar({
  routes,
  activeKey,
  onSelect,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onClose,
  authUser,
  onLogin,
  onLogout,
  onSwitchAccount,
  appVersion,
  teamMemberTag
}) {
  const widthClass = collapsed ? 'w-[84px]' : 'w-[260px]';
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const [submenu, setSubmenu] = useState({
    open: false,
    items: [],
    x: 0,
    y: 0,
    title: ''
  });
  const submenuTimerRef = useRef(null);

  const clearSubmenuTimer = () => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
  };

  const closeSubmenu = () => {
    clearSubmenuTimer();
    setSubmenu((prev) => (prev.open ? { ...prev, open: false } : prev));
  };

  const scheduleCloseSubmenu = () => {
    clearSubmenuTimer();
    submenuTimerRef.current = setTimeout(() => {
      setSubmenu((prev) => (prev.open ? { ...prev, open: false } : prev));
    }, 180);
  };

  const openSubmenu = (event, item) => {
    if (!item?.subItems || !item.subItems.length) return;
    clearSubmenuTimer();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.right + 12;
    const y = rect.top + rect.height / 2;
    setSubmenu({
      open: true,
      items: item.subItems,
      x,
      y,
      title: item.label || 'Tendencias'
    });
  };

  useEffect(() => {
    if (!accountOpen) return undefined;
    const handleClickOutside = (event) => {
      if (!accountRef.current || accountRef.current.contains(event.target)) return;
      setAccountOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [accountOpen]);

  useEffect(() => {
    return () => clearSubmenuTimer();
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity md:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-white/10 bg-[#0B1220] text-slate-200 shadow-2xl transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${widthClass}`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              RSS
            </div>
            {!collapsed && (
              <div>
                <div className="text-sm font-semibold text-white">Leitor RSS</div>
                <div className="text-xs text-slate-400">Painel de controle</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 transition hover:bg-white/10 hover:text-white md:inline-flex"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button
              type="button"
              className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 transition hover:bg-white/10 hover:text-white md:hidden"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6">
          {routes.map((section) => (
            <div key={section.section} className="mb-6">
              {!collapsed && (
                <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {section.section}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = item.key === activeKey
                    || (item.subItems || []).some(sub => (sub.routeKey || sub.key) === activeKey);
                  const Icon = item.icon;
                  const hasSubItems = Array.isArray(item.subItems) && item.subItems.length > 0;
                  return (
                    <div
                      key={item.key}
                      className="group relative"
                      onMouseEnter={(event) => hasSubItems && openSubmenu(event, item)}
                      onMouseLeave={() => hasSubItems && scheduleCloseSubmenu()}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(item.key)}
                        title={collapsed ? item.label : undefined}
                        className={`${baseItemClasses} ${
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
                          size={24}
                          className={`transition ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 px-3 py-4">
          {authUser ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
                onClick={() => setAccountOpen((prev) => !prev)}
                title={authUser.email || authUser.name || 'Conta'}
              >
                {authUser.photo ? (
                  <img
                    src={authUser.photo}
                    alt=""
                    className="h-9 w-9 rounded-full border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                    {authUser.name ? authUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{authUser.name || 'Conta Google'}</div>
                    <div className="truncate text-xs text-slate-400">{authUser.email || ''}</div>
                    {authUser.email && authUser.email.includes('@') && (
                      <div className="truncate text-[11px] text-slate-500">
                        Dominio: {authUser.email.split('@')[1]}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-slate-500">Conta</div>
                    {teamMemberTag && (
                      <div className="mt-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                        Time: {teamMemberTag}
                      </div>
                    )}
                    {authUser?.plan && (
                      <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Plano: {authUser.plan}
                      </div>
                    )}
                  </div>
                )}
              </button>
              {!collapsed && accountOpen && (
                <div className="absolute bottom-12 left-0 right-0 rounded-xl border border-white/10 bg-[#0B1220] p-2 shadow-2xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
                    onClick={() => {
                      setAccountOpen(false);
                      onSwitchAccount();
                    }}
                  >
                    <RefreshCw size={16} />
                    Trocar conta
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
                    onClick={() => {
                      setAccountOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={onLogin}
            >
              Entrar com Google
            </button>
          )}
          {!collapsed && (
            <div className="mt-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Versao {appVersion || 'v0.1.0'}
            </div>
          )}
        </div>
      </aside>
      {submenu.open && (
        <div
          className="fixed z-[60] min-w-[220px] rounded-xl border border-white/10 bg-[#0B1220] p-2 shadow-2xl"
          style={{ left: submenu.x, top: submenu.y, transform: 'translateY(-50%)' }}
          onMouseEnter={clearSubmenuTimer}
          onMouseLeave={scheduleCloseSubmenu}
        >
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {submenu.title}
          </div>
          <div className="space-y-1">
            {submenu.items.map((sub) => {
              const subActive = (sub.routeKey || sub.key) === activeKey;
              return (
                <button
                  key={sub.key}
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    subActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={() => {
                    onSelect(sub.routeKey || sub.key);
                    closeSubmenu();
                  }}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}



