import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Save,
  Download,
  Upload,
  RotateCcw,
  Shield,
  Wifi,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { SystemSettings, User } from '../types.js';

interface SettingsViewProps {
  currentUser: User;
  onSettingsSaved?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onSettingsSaved
}) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data: SystemSettings = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setSavedMsg('Настройки системы успешно сохранены!');
      setTimeout(() => setSavedMsg(null), 3000);
      if (onSettingsSaved) onSettingsSaved();
    } catch (err: any) {
      alert(`Ошибка сохранения: ${err.message}`);
    }
  };

  const handleResetToSeed = async () => {
    if (!window.confirm('ВНИМАНИЕ: Сбросить базу данных к эталонным демо-данным? Все созданные записи будут заменены.')) {
      return;
    }

    try {
      const res = await fetch('/api/database/reset', { method: 'POST' });
      const data = await res.json();
      setResetMsg('База данных успешно сброшена к исходным эталонным данным!');
      setTimeout(() => setResetMsg(null), 4000);
      fetchSettings();
    } catch (err: any) {
      alert(`Ошибка сброса: ${err.message}`);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch('/api/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      setResetMsg('Резервная копия базы данных успешно восстановлена!');
      setTimeout(() => setResetMsg(null), 4000);
      fetchSettings();
    } catch (err: any) {
      alert(`Ошибка восстановления файла резервной копии: ${err.message}`);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs">
        Загрузка параметров системы...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-cyan-400" />
          Параметры системы и управление базой данных
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Конфигурация бизнес-правил, сетевого сокета UDP и резервное копирование
        </p>
      </div>

      {savedMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      {resetMsg && (
        <div className="p-4 bg-cyan-950/40 border border-cyan-500/40 rounded-2xl flex items-center gap-2 text-cyan-300 text-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>{resetMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Business Rules Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Бизнес-правила метрологического контроля
          </h3>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.blockIssueOnExpiredVerification}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    blockIssueOnExpiredVerification: e.target.checked
                  })
                }
                className="w-4 h-4 mt-0.5 accent-cyan-500 rounded cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">
                  Строгая блокировка выдачи приборов с просроченной поверкой
                </span>
                <span className="text-slate-400 text-[11px]">
                  Запрещает операцию выдачи, если срок свидетельства о поверке СИ истек (согласно ГОСТ и 102-ФЗ)
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.blockIssueOnNoBorrowRights}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    blockIssueOnNoBorrowRights: e.target.checked
                  })
                }
                className="w-4 h-4 mt-0.5 accent-cyan-500 rounded cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">
                  Контроль права получения СИ у сотрудников
                </span>
                <span className="text-slate-400 text-[11px]">
                  Блокирует операцию, если у сотрудника снят флаг «Право брать средства измерений»
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Hardware and Network Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-400" />
            Сетевые параметры терминала и сканеров
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Сетевой порт сервера</label>
              <input
                type="number"
                value={settings.udpPort}
                onChange={(e) =>
                  setSettings({ ...settings, udpPort: Number(e.target.value) })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Сетевой порт приема данных от сканера (по умолчанию: 5005)
              </span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Таймаут потери связи (секунды)</label>
              <input
                type="number"
                value={settings.terminalTimeoutSeconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    terminalTimeoutSeconds: Number(e.target.value)
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Время без ответа сканера до фиксации статуса «Оффлайн» (по умолчанию: 6 с)
              </span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Окно фильтрации дубликатов сканов (мс)</label>
              <input
                type="number"
                value={settings.duplicateScanWindowMs}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    duplicateScanWindowMs: Number(e.target.value)
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Защита от повторного считывания при дребезге луча (&lt; 350 мс)
              </span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Префикс команды сканера</label>
              <input
                type="text"
                value={settings.scannerPrefix}
                onChange={(e) =>
                  setSettings({ ...settings, scannerPrefix: e.target.value })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Ожидаемый префикс в пакете (например: SCAN:)
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Сохранить параметры
            </button>
          </div>
        </div>
      </form>

      {/* Database Backup & Restore & Reset Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          Резервное копирование и обслуживание базы данных
        </h3>

        <p className="text-xs text-slate-400">
          Данные сохраняются в защищённом хранилище сервера. Вы можете выгрузить полный дамп в формате JSON
          или восстановить базу из сохранённого архива.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            id="download-backup-btn"
            href="/api/database/backup"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Выгрузить дамп базы (JSON)
          </a>

          <label className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Загрузить резервную копию</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetToSeed}
            className="text-xs bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-800/60 px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ml-auto"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            Сброс к эталонным демо-данным
          </button>
        </div>
      </div>
    </div>
  );
};
