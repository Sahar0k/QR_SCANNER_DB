import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, TabType } from './components/Navbar.js';
import { ScannerFocusTrap } from './components/ScannerFocusTrap.js';
import { TerminalSimulatorModal } from './components/TerminalSimulatorModal.js';
import { LoginModal } from './components/LoginModal.js';

import { DashboardView } from './pages/DashboardView.js';
import { OperationsView } from './pages/OperationsView.js';
import { DevicesView } from './pages/DevicesView.js';
import { EmployeesView } from './pages/EmployeesView.js';
import { MovementsView } from './pages/MovementsView.js';
import { ReportsView } from './pages/ReportsView.js';
import { TerminalView } from './pages/TerminalView.js';
import { SettingsView } from './pages/SettingsView.js';

import { User, Terminal, DashboardSummary } from './types.js';

const GUEST_USER: User = {
  id: 'usr-guest',
  username: 'guest',
  fullName: 'Гость (Просмотр)',
  role: 'operator'
};

export function App() {
  // Minimalist registry view as default window tab
  const [activeTab, setActiveTab] = useState<TabType>('devices');
  const [devicesFilterStatus, setDevicesFilterStatus] = useState<string>('all');

  // Theme state: dark or light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('app-theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('app-theme', next);
      return next;
    });
  };

  // Auth / Login state with persistent localStorage
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('metrology_logged_in') === 'true';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [engineeringToken, setEngineeringToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('metrology_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.role === 'metrologist' ? parsed : GUEST_USER;
      } catch {
        return GUEST_USER;
      }
    }
    return GUEST_USER;
  });

  const handleLoginSuccess = (user: User) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
    localStorage.setItem('metrology_logged_in', 'true');
    localStorage.setItem('metrology_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(GUEST_USER);
    localStorage.removeItem('metrology_logged_in');
    localStorage.removeItem('metrology_user');
    setEngineeringToken(null);
    setActiveTab('devices');
  };

  useEffect(() => {
    const openEngineeringMenu = async (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== 'e') return;
      const password = window.prompt('Инженерное меню. Введите инженерный пароль:');
      if (!password) return;
      const response = await fetch('/api/auth/engineering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ combination: 'CTRL_SHIFT_E', password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        window.alert(data.error || 'Инженерная авторизация отклонена');
        return;
      }
      setEngineeringToken(data.token);
      setActiveTab('settings');
    };
    window.addEventListener('keydown', openEngineeringMenu);
    return () => window.removeEventListener('keydown', openEngineeringMenu);
  }, []);

  // Enforce devices tab for guests
  useEffect(() => {
    if ((!isLoggedIn || (activeTab === 'settings' && !engineeringToken)) && activeTab !== 'devices') {
      setActiveTab('devices');
    }
  }, [isLoggedIn, activeTab, engineeringToken]);

  // Terminal state
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);

  // Dashboard summary state
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // Incoming scanner events
  const [incomingScanCode, setIncomingScanCode] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // Fetch initial summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
        if (data.terminal) {
          setTerminal({
            id: 'term-esp32-01',
            name: 'Складской терминал ESP32-S3',
            ip: data.terminal.ip,
            port: 5005,
            status: data.terminal.isOnline ? 'online' : 'offline',
            lastHeartbeat: data.terminal.lastHeartbeat,
            rssi: data.terminal.rssi
          });
        }
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  }, []);

  const fetchTerminalStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/terminal/status');
      if (res.ok) {
        const data: Terminal = await res.json();
        setTerminal(data);
      }
    } catch (err) {
      console.error('Error fetching terminal:', err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchTerminalStatus();

    const interval = setInterval(() => {
      fetchSummary();
      fetchTerminalStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchSummary, fetchTerminalStatus]);

  // WebSocket connection for live hardware events
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWs = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('[WebSocket] Connected');
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'SCAN') {
              const code = msg.data.barcode;
              setIncomingScanCode(code);
              setLastScannedCode(code);
            } else if (msg.event === 'TERMINAL_STATUS') {
              setTerminal(msg.data);
            } else if (msg.event === 'MOVEMENT_LOGGED') {
              fetchSummary();
            }
          } catch (e) {
            console.error('Error parsing WS message', e);
          }
        };

        socket.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 3000);
        };

        socket.onerror = (err) => {
          console.warn('[WebSocket] Warning:', err);
          socket?.close();
        };
      } catch (err) {
        console.warn('WS connection failed:', err);
      }
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [fetchSummary]);

  const handleGlobalScan = (barcode: string) => {
    setIncomingScanCode(barcode);
    setLastScannedCode(barcode);
  };

  const handleClearIncomingScan = () => {
    setIncomingScanCode(null);
  };

  const handleNavigateToDevices = (filterStatus?: string) => {
    setDevicesFilterStatus(filterStatus || 'all');
    setActiveTab('devices');
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        terminal={terminal}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        engineeringUnlocked={Boolean(engineeringToken)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'devices' && (
          <DevicesView
            currentUser={currentUser}
            isLoggedIn={isLoggedIn}
            onRequireLogin={() => setIsLoginModalOpen(true)}
            initialFilterStatus={devicesFilterStatus}
            onRefreshData={fetchSummary}
            theme={theme}
          />
        )}

        {activeTab === 'operations' && (
          <OperationsView
            currentUser={currentUser}
            isLoggedIn={isLoggedIn}
            onRequireLogin={() => setIsLoginModalOpen(true)}
            onOperationCompleted={fetchSummary}
            incomingScanCode={incomingScanCode}
            onClearIncomingScan={handleClearIncomingScan}
            theme={theme}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            onNavigateToOperations={() => setActiveTab('operations')}
            onNavigateToDevices={handleNavigateToDevices}
            onNavigateToReports={() => setActiveTab('reports')}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
            theme={theme}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeesView
            currentUser={currentUser}
            isLoggedIn={isLoggedIn}
            onRequireLogin={() => setIsLoginModalOpen(true)}
            theme={theme}
          />
        )}

        {activeTab === 'movements' && (
          <MovementsView isLoggedIn={isLoggedIn} />
        )}

        {activeTab === 'reports' && (
          <ReportsView summary={summary} isLoggedIn={isLoggedIn} />
        )}

        {activeTab === 'terminal' && (
          <TerminalView
            terminal={terminal}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            isLoggedIn={isLoggedIn}
            onSettingsSaved={fetchSummary}
            engineeringToken={engineeringToken}
          />
        )}
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Keyboard Wedge Scanner Trap */}
      <ScannerFocusTrap
        onScan={handleGlobalScan}
        lastScannedCode={lastScannedCode}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Terminal Simulator Modal */}
      <TerminalSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        terminal={terminal}
        onPacketSent={() => {
          fetchSummary();
        }}
      />
    </div>
  );
}

export default App;
