import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Radio,
  Wifi,
  Terminal as TerminalIcon,
  Send,
  Sliders,
  CheckCircle2,
  Save,
  Activity,
  Zap,
  Plus,
  Trash2,
  Edit3,
  Barcode,
  Check,
  X
} from 'lucide-react';
import { Terminal, TerminalPacketLog, SystemSettings, ScannerDevice } from '../types.js';

interface TerminalViewProps {
  terminal: Terminal | null;
  onOpenSimulator: () => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  terminal,
  onOpenSimulator
}) => {
  const [logs, setLogs] = useState<TerminalPacketLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [customScanCode, setCustomScanCode] = useState<string>('DEV:00101');
  const [activeTab, setActiveTab] = useState<'scanners' | 'monitor' | 'config'>('scanners');

  // Scanners state (1 to N)
  const [scanners, setScanners] = useState<ScannerDevice[]>([]);
  const [loadingScanners, setLoadingScanners] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingScanner, setEditingScanner] = useState<ScannerDevice | null>(null);

  // Form for Add/Edit Scanner
  const [scannerFormName, setScannerFormName] = useState<string>('');
  const [scannerFormType, setScannerFormType] = useState<ScannerDevice['type']>('network_scanner');
  const [scannerFormIdentifier, setScannerFormIdentifier] = useState<string>('');
  const [scannerFormLocation, setScannerFormLocation] = useState<string>('');
  const [scannerFormStatus, setScannerFormStatus] = useState<ScannerDevice['status']>('active');

  // Network settings state
  const [wifiSsid, setWifiSsid] = useState<string>('1235');
  const [wifiPassword, setWifiPassword] = useState<string>('63336333');
  const [pcIp, setPcIp] = useState<string>('192.168.137.1');
  const [pcPort, setPcPort] = useState<number>(5005);
  const [scannerIp, setScannerIp] = useState<string>('192.168.137.100');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Ping state
  const [pinging, setPinging] = useState<boolean>(false);
  const [pingMsg, setPingMsg] = useState<{ text: string; success: boolean } | null>(null);

  const fetchScanners = async () => {
    try {
      const res = await fetch('/api/scanners');
      const data = await res.json();
      setScanners(data);
    } catch (err) {
      console.error('Error fetching scanners:', err);
    } finally {
      setLoadingScanners(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/terminal/logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data: SystemSettings = await res.json();
      if (data.wifiSsid) setWifiSsid(data.wifiSsid);
      if (data.wifiPassword) setWifiPassword(data.wifiPassword);
      if (data.pcIp) setPcIp(data.pcIp);
      if (data.udpPort) setPcPort(data.udpPort);
      if (data.scannerIp) setScannerIp(data.scannerIp);
    } catch (err) {
      console.error('Error loading terminal settings:', err);
    }
  };

  useEffect(() => {
    fetchScanners();
    fetchLogs();
    fetchSettings();
    const interval = setInterval(() => {
      fetchLogs();
      fetchScanners();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAddScanner = () => {
    setEditingScanner(null);
    setScannerFormName(`Сканер №${scanners.length + 1}`);
    setScannerFormType('network_scanner');
    setScannerFormIdentifier('192.168.137.' + (100 + scanners.length));
    setScannerFormLocation('Склад СИ / Зона ' + (scanners.length + 1));
    setScannerFormStatus('active');
    setShowAddModal(true);
  };

  const handleOpenEditScanner = (scn: ScannerDevice) => {
    setEditingScanner(scn);
    setScannerFormName(scn.name);
    setScannerFormType(scn.type);
    setScannerFormIdentifier(scn.identifier);
    setScannerFormLocation(scn.location);
    setScannerFormStatus(scn.status);
    setShowAddModal(true);
  };

  const handleSaveScannerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingScanner) {
        await fetch(`/api/scanners/${editingScanner.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: scannerFormName,
            type: scannerFormType,
            identifier: scannerFormIdentifier,
            location: scannerFormLocation,
            status: scannerFormStatus
          })
        });
      } else {
        await fetch('/api/scanners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: scannerFormName,
            type: scannerFormType,
            identifier: scannerFormIdentifier,
            location: scannerFormLocation,
            status: scannerFormStatus
          })
        });
      }
      setShowAddModal(false);
      fetchScanners();
    } catch (err: any) {
      alert(`Ошибка сохранения сканера: ${err.message}`);
    }
  };

  const handleDeleteScanner = async (id: string) => {
    if (!confirm('Удалить данный сканер из реестра оборудования?')) return;
    try {
      await fetch(`/api/scanners/${id}`, { method: 'DELETE' });
      fetchScanners();
    } catch (err: any) {
      alert(`Ошибка удаления: ${err.message}`);
    }
  };

  const handleSaveScannerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSavedSuccessMsg(null);

    try {
      const currentRes = await fetch('/api/settings');
      const currentSettings = await currentRes.json();

      const updated = {
        ...currentSettings,
        wifiSsid,
        wifiPassword,
        pcIp,
        udpPort: pcPort,
        scannerIp
      };

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      setSavedSuccessMsg('Настройки сети и сервера успешно сохранены!');
      setTimeout(() => setSavedSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Ошибка сохранения: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePingScanner = async (targetIpOverride?: string) => {
    setPinging(true);
    setPingMsg(null);

    const target = targetIpOverride || scannerIp;

    try {
      const res = await fetch('/api/terminal/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scannerIp: target, pcIp, pcPort })
      });
      const data = await res.json();
      const isOk = data.status === 'online';
      setPingMsg({
        text: isOk 
          ? `Устройство ${target}: Связь есть (Онлайн)`
          : `Устройство ${target}: Нет ответа (Оффлайн)`,
        success: isOk
      });
      fetchLogs();
    } catch (err: any) {
      setPingMsg({
        text: `Ошибка проверки связи с ${target}: ${err.message}`,
        success: false
      });
    } finally {
      setPinging(false);
      setTimeout(() => setPingMsg(null), 4000);
    }
  };

  const sendTestPacket = async (packet: string) => {
    try {
      await fetch('/api/terminal/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packet, remoteIp: `${scannerIp}` })
      });
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const isOnline = terminal?.status === 'online';
  const activeScannersCount = scanners.filter(s => s.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Управление сканерами и терминалами связи
            </h2>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border bg-cyan-950 text-cyan-300 border-cyan-500/40">
              Подключено: {activeScannersCount} / {scanners.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Мониторинг сети, добавление сканеров (от 1 до N) и диагностика каналов связи
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handlePingScanner()}
            disabled={pinging}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
            {pinging ? 'Проверка...' : 'Пинговать связь'}
          </button>

          <button
            type="button"
            onClick={onOpenSimulator}
            className="text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            Эмулятор
          </button>
        </div>
      </div>

      {/* Hardware Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-slate-400 text-xs flex items-center justify-between">
            <span>Статус канала связи</span>
            <Wifi className={`w-4 h-4 ${isOnline ? 'text-emerald-400' : 'text-slate-400'}`} />
          </span>
          <div className="text-xl font-bold text-white mt-1">
            {isOnline ? 'Активен' : 'Ожидание'}
          </div>
          <div className="text-[11px] font-mono text-cyan-300 mt-0.5">
            {terminal ? `Сигнал: ${terminal.rssi} dBm` : 'Готов к приёму'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-slate-400 text-xs">Беспроводная сеть (SSID)</span>
          <div className="text-base font-mono font-bold text-white mt-1 truncate">{wifiSsid}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Пароль: {wifiPassword}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-slate-400 text-xs">IP Сервера / Порт</span>
          <div className="text-base font-mono font-bold text-cyan-300 mt-1">{pcIp}:{pcPort}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Основной IP: {scannerIp}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-slate-400 text-xs">Всего сканеров</span>
          <div className="text-xl font-bold text-white mt-1">
            {scanners.length} устройств
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5">Сетевые &amp; USB</div>
        </div>
      </div>

      {/* Compact Ping Notification Toast */}
      {pingMsg && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-lg transition-all animate-fade-in ${
            pingMsg.success
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0" />
            <span>{pingMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setPingMsg(null)}
            className="opacity-70 hover:opacity-100 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab('scanners')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'scanners'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Barcode className="w-4 h-4" />
          Реестр сканеров ({scanners.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monitor')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'monitor'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TerminalIcon className="w-4 h-4" />
          Журнал считываний ({logs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'config'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Настройки сети
        </button>
      </div>

      {/* Tab 1: Scanners Management (1 to N) */}
      {activeTab === 'scanners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Barcode className="w-4 h-4 text-cyan-400" />
              Подключенные устройства сканирования (1..N)
            </h3>

            <button
              type="button"
              onClick={handleOpenAddScanner}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Добавить сканер
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scanners.map((scn) => (
              <div
                key={scn.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{scn.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{scn.location}</p>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        scn.status === 'active'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {scn.status === 'active' ? 'АКТИВЕН' : 'НЕАКТИВЕН'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Тип подключения:</span>
                      <span className="font-mono text-slate-200">
                        {scn.type === 'network_scanner'
                          ? 'Сетевой / Беспроводной'
                          : scn.type === 'usb_keyboard'
                          ? 'USB-Сканер (Клавиатура)'
                          : scn.type === 'rfid_udp'
                          ? 'RFID / Сетевой сокет'
                          : 'COM-Порт'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Идентификатор / IP:</span>
                      <span className="font-mono text-cyan-300 font-semibold">{scn.identifier}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handlePingScanner(scn.identifier)}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    Ping
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditScanner(scn)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Редактировать"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteScanner(scn.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Live Log */}
      {activeTab === 'monitor' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs font-semibold text-slate-300 shrink-0">
              Ручная имитация ввода штрихкода:
            </span>
            <div className="flex gap-2 flex-1 w-full">
              <input
                type="text"
                value={customScanCode}
                onChange={(e) => setCustomScanCode(e.target.value)}
                placeholder="SCAN:DEV:00101"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => sendTestPacket(customScanCode)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Передать
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Время</th>
                    <th className="py-3 px-4">Тип</th>
                    <th className="py-3 px-4">Переданные данные</th>
                    <th className="py-3 px-4">Распознанный код</th>
                    <th className="py-3 px-4">Источник</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-sans text-xs">
                        Загрузка журнала считываний...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-sans text-xs">
                        Пакеты пока не поступали. Отсканируйте штрихкод сканером.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isScan = log.type === 'SCAN';
                      const isHeartbeat = log.type === 'HEARTBEAT';

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isScan
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  : isHeartbeat
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {log.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-semibold">{log.raw}</td>
                          <td className="py-3 px-4 text-cyan-400">{log.decoded || '—'}</td>
                          <td className="py-3 px-4 text-slate-400">{log.remoteIp}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Config & Server Settings */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveScannerSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Параметры сетевого взаимодействия
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Настройки подключения беспроводных сканеров и локального сервера
                </p>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingSettings ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </div>

            {savedSuccessMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{savedSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Имя точки доступа Wi-Fi (SSID)</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Пароль Wi-Fi</label>
                <input
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">IP-адрес сервера в локальной сети</label>
                <input
                  type="text"
                  value={pcIp}
                  onChange={(e) => setPcIp(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Порт приема сокета</label>
                <input
                  type="number"
                  value={pcPort}
                  onChange={(e) => setPcPort(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add/Edit Scanner */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Barcode className="w-4 h-4 text-cyan-400" />
                {editingScanner ? 'Редактирование сканера' : 'Добавление нового сканера'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScannerForm} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Наименование сканера</label>
                <input
                  type="text"
                  value={scannerFormName}
                  onChange={(e) => setScannerFormName(e.target.value)}
                  placeholder="Например: Беспроводной сканер №3"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Тип подключения</label>
                  <select
                    value={scannerFormType}
                    onChange={(e) => setScannerFormType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="network_scanner">Сетевой / Беспроводной</option>
                    <option value="usb_keyboard">USB-Сканер (HID)</option>
                    <option value="rfid_udp">RFID / Сетевой сокет</option>
                    <option value="com_port">COM-Порт / RS-232</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Статус</label>
                  <select
                    value={scannerFormStatus}
                    onChange={(e) => setScannerFormStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="active">Активен</option>
                    <option value="inactive">Неактивен</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Идентификатор / IP-адрес</label>
                <input
                  type="text"
                  value={scannerFormIdentifier}
                  onChange={(e) => setScannerFormIdentifier(e.target.value)}
                  placeholder="192.168.137.105 или USB-01"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Место установки / Зона</label>
                <input
                  type="text"
                  value={scannerFormLocation}
                  onChange={(e) => setScannerFormLocation(e.target.value)}
                  placeholder="Склад СИ / Зона приемки"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
