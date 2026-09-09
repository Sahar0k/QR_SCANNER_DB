import React from 'react';
import {
  LayoutDashboard,
  Scan,
  Layers,
  Users,
  History,
  BarChart3,
  Cpu,
  Settings,
  ShieldCheck,
  Radio,
  Sun,
  Moon,
  Lock,
  LogOut,
  UserCheck,
  Shield,
  Eye
} from 'lucide-react';
import { User, Terminal } from '../types.js';

export type TabType = 
  | 'devices'
  | 'operations'
  | 'dashboard'
  | 'employees'
  | 'movements'
  | 'reports'
  | 'terminal'
  | 'settings';

interface NavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isLoggedIn: boolean;
  currentUser: User;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  terminal: Terminal | null;
  onOpenSimulator: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  engineeringUnlocked: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  isLoggedIn,
  currentUser,
  onOpenLoginModal,
  onLogout,
  terminal,
  onOpenSimulator,
  theme,
  onToggleTheme,
  engineeringUnlocked
}) => {
  const isOnline = terminal?.status === 'online';

  const navItems: Array<{ id: TabType; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'devices', label: 'Реестр СИ', icon: Layers },
    { id: 'operations', label: 'Выдача и возврат', icon: Scan },
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { id: 'employees', label: 'Сотрудники и отделы', icon: Users },
    { id: 'movements', label: 'Журнал выдачи', icon: History },
    { id: 'reports', label: 'Отчёты', icon: BarChart3 },
    { id: 'terminal', label: 'Терминал сканеров', icon: Cpu },
    ...(engineeringUnlocked ? [{ id: 'settings' as TabType, label: 'Инженерное меню', icon: Settings }] : [])
  ];

  const isDark = theme === 'dark';
  const isAdmin = currentUser.role === 'admin';

  const visibleNavItems = isLoggedIn
    ? navItems
    : navItems.filter((item) => item.id === 'devices');

  return (
    <header className={`sticky top-0 z-40 transition-colors ${
      isDark 
        ? 'bg-slate-900/90 border-b border-slate-800 backdrop-blur-md' 
        : 'bg-white/90 border-b border-slate-200 shadow-xs backdrop-blur-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Учёт средств измерений
                </span>
              </div>
              <p className={`text-xs hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Метрологический реестр и автоматизация выдачи/поверки СИ
              </p>
            </div>
          </div>

          {/* Right Section: Terminal Live Status, Theme Switcher & Login/Account */}
          <div className="flex items-center gap-2.5">
            {/* Terminal Live Status - Only visible for logged-in users */}
            {isLoggedIn && (
              <div
                id="terminal-status-indicator"
                onClick={onOpenSimulator}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  isOnline
                    ? isDark 
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/30'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : isDark
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/30'
                      : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                }`}
                title="Нажмите для открытия эмулятора терминала"
              >
                <span className="relative flex h-2 w-2">
                  {isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isOnline ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                  ></span>
                </span>

                <div className="flex items-center gap-1.5 font-medium">
                  <Radio className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{isOnline ? 'Терминал Онлайн' : 'Терминал Оффлайн'}</span>
                  {isOnline && terminal && (
                    <span className="font-mono text-[10px] opacity-80">({terminal.rssi} dBm)</span>
                  )}
                </div>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Account / Login Area */}
            {isLoggedIn ? (
              <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${
                isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-100 border-slate-300'
              }`}>
                {isAdmin ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Администратор</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Метролог</span>
                  </div>
                )}
                <button
                  id="logout-btn"
                  type="button"
                  onClick={onLogout}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-rose-300 hover:bg-slate-700' : 'text-slate-600 hover:text-rose-600 hover:bg-slate-200'
                  }`}
                  title="Выйти в режим Гостя"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`hidden lg:inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${
                  isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                }`}>
                  <Eye className="w-3 h-3 text-cyan-400" />
                  Гость (Просмотр)
                </span>

                <button
                  id="login-modal-open-btn"
                  type="button"
                  onClick={onOpenLoginModal}
                  className="text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-3.5 py-2 rounded-xl shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Войти в систему</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 overflow-x-auto py-2.5 scrollbar-none">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs shadow-cyan-500/10 font-semibold'
                      : 'bg-cyan-500/10 text-cyan-700 border border-cyan-500/40 shadow-xs font-semibold'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
