import React, { useState } from 'react';
import { Cpu, Wifi, Radio, Send, X, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Terminal } from '../types.js';

interface TerminalSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminal: Terminal | null;
  onPacketSent?: (packet: string) => void;
}

export const TerminalSimulatorModal: React.FC<TerminalSimulatorModalProps> = ({
  isOpen,
  onClose,
  terminal,
  onPacketSent
}) => {
  const [customPacket, setCustomPacket] = useState<string>('SCAN:DEV:00101');
  const [rssi, setRssi] = useState<number>(-62);
  const [sending, setSending] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const sendPacket = async (packet: string) => {
    setSending(true);
    try {
      const res = await fetch('/api/terminal/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packet, remoteIp: '192.168.1.145 (ESP32-S3)' })
      });
      const data = await res.json();
      setLastResponse(`Отправлено: ${packet} -> Обработано сервером.`);
      if (onPacketSent) onPacketSent(packet);
    } catch (err: any) {
      setLastResponse(`Ошибка отправки: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const testDoubleScan = async (code: string) => {
    // Send twice rapidly within 100ms
    sendPacket(code);
    setTimeout(() => {
      sendPacket(code);
      setLastResponse(`Тест дубликата: ${code} отправлен дважды с интервалом 80 мс (второй должен быть отфильтрован).`);
    }, 80);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div
        id="terminal-simulator-modal"
        className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-cyan-950/50 flex flex-col max-h-[90vh]"
      >
        {/* Header with ESP32-S3 hardware badge */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Эмулятор терминала и сканера штрихкодов</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Сокет связи
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Имитация аппаратных пакетов сканера в локальной сети
              </p>
            </div>
          </div>
          <button
            id="close-terminal-sim-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Hardware & RSSI status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Устройство:</span>
              <span className="font-medium text-slate-200">Сетевой терминал</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">IP / Порт:</span>
              <span className="font-mono text-cyan-300">192.168.1.145:5005</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Тип устройства:</span>
              <span className="font-mono text-slate-300">Сканер штрихкодов</span>
            </div>
          </div>

          {/* Quick Connection Ping Section */}
          <div className="bg-slate-800/30 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">Проверка сигнала сети</span>
              </div>
              <span className="text-xs font-mono text-slate-400">{rssi} dBm</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="rssi-range-input"
                type="range"
                min="-95"
                max="-35"
                value={rssi}
                onChange={(e) => setRssi(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                id="send-heartbeat-btn"
                type="button"
                disabled={sending}
                onClick={() => sendPacket(`HEARTBEAT:${rssi}`)}
                className="shrink-0 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                Проверить связь
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Имитация регулярного импульса связи сканера с сервером.
            </p>
          </div>

          {/* Scenario Buttons */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Быстрые сценарии сканирования (эмуляция лазерного луча)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Card 1: Valid employee badge */}
              <button
                id="sim-scan-valid-badge"
                type="button"
                onClick={() => sendPacket('CARD:0004928192')}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-cyan-300 group-hover:text-cyan-200">
                    Скан пропуска (Иванов А.А.)
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-950 px-1.5 py-0.5 rounded text-cyan-400">
                    CARD:0004928192
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Инженер СВЧ (право брать СИ: <span className="text-emerald-400">РАЗРЕШЕНО</span>)
                </div>
              </button>

              {/* Card 2: Blocked employee badge */}
              <button
                id="sim-scan-blocked-badge"
                type="button"
                onClick={() => sendPacket('CARD:0007829104')}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-rose-300 group-hover:text-rose-200">
                    Скан пропуска (Новиков Д.И.)
                  </span>
                  <span className="text-[10px] font-mono bg-rose-950 px-1.5 py-0.5 rounded text-rose-400">
                    CARD:0007829104
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Стажер (право брать СИ: <span className="text-rose-400">ЗАБЛОКИРОВАНО</span>)
                </div>
              </button>

              {/* Device 1: Ready in stock */}
              <button
                id="sim-scan-valid-dev"
                type="button"
                onClick={() => sendPacket('DEV:00101')}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-emerald-300 group-hover:text-emerald-200">
                    Прибор: Анализатор спектра FSL6
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-400">
                    DEV:00101
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  На складе, поверка действительна
                </div>
              </button>

              {/* Device 2: Expired calibration */}
              <button
                id="sim-scan-expired-dev"
                type="button"
                onClick={() => sendPacket('DEV:00104')}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-rose-300 group-hover:text-rose-200">
                    Прибор: Fluke 8846A (Просрочен!)
                  </span>
                  <span className="text-[10px] font-mono bg-rose-950 px-1.5 py-0.5 rounded text-rose-400">
                    DEV:00104
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Поверка истекла 10 дней назад (проверка блокировки)
                </div>
              </button>

              {/* Device 3: Already issued */}
              <button
                id="sim-scan-issued-dev"
                type="button"
                onClick={() => sendPacket('DEV:00102')}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-amber-300 group-hover:text-amber-200">
                    Прибор: Источник Keysight E36313A
                  </span>
                  <span className="text-[10px] font-mono bg-amber-950 px-1.5 py-0.5 rounded text-amber-400">
                    DEV:00102
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Уже выдан Иванову А.А. (для возврата)
                </div>
              </button>

              {/* Rapid double-scan test */}
              <button
                id="sim-scan-double-test"
                type="button"
                onClick={() => testDoubleScan('SCAN:DEV:00101')}
                className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-purple-300 group-hover:text-purple-200">
                    Тест защиты от дребезга (&lt; 350 мс)
                  </span>
                  <span className="text-[10px] font-mono bg-purple-950 px-1.5 py-0.5 rounded text-purple-400">
                    2x SCAN
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Двойной скан подряд с интервалом 80 мс
                </div>
              </button>
            </div>
          </div>

          {/* Custom packet input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Произвольный UDP-пакет
            </label>
            <div className="flex gap-2">
              <input
                id="custom-udp-packet-input"
                type="text"
                value={customPacket}
                onChange={(e) => setCustomPacket(e.target.value)}
                placeholder="SCAN:460123456789 или DEV:00103"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                id="send-custom-packet-btn"
                type="button"
                disabled={sending || !customPacket.trim()}
                onClick={() => sendPacket(customPacket.trim())}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Отправить
              </button>
            </div>
          </div>

          {/* Log / Feedback */}
          {lastResponse && (
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs font-mono text-slate-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{lastResponse}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-800/60 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>События транслируются по WebSocket в реальном времени</span>
          <button
            id="close-sim-footer-btn"
            onClick={onClose}
            className="text-slate-300 hover:text-white px-4 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
