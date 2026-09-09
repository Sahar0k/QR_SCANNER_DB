import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  Printer,
  Download,
  AlertTriangle,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  History
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Device, Movement, DashboardSummary } from '../types.js';

interface ReportsViewProps {
  summary: DashboardSummary | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ summary }) => {
  const [activeReportTab, setActiveReportTab] = useState<'on_hands' | 'verification_plan' | 'device_history'>('on_hands');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Device history search
  const [historySearch, setHistorySearch] = useState<string>('');
  const [selectedDeviceHistory, setSelectedDeviceHistory] = useState<Movement[]>([]);
  const [searchingHistory, setSearchingHistory] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/devices')
      .then((r) => r.json())
      .then((data) => setDevices(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearchDeviceHistory = async (devBarcode: string) => {
    setSearchingHistory(true);
    try {
      const res = await fetch(`/api/movements?search=${encodeURIComponent(devBarcode)}`);
      const data = await res.json();
      setSelectedDeviceHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingHistory(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Pie chart data for status distribution
  const statusData = summary
    ? [
        { name: 'На складе', value: summary.counts.inStock, color: '#10b981' },
        { name: 'Выдано', value: summary.counts.issued, color: '#f59e0b' },
        { name: 'В поверке', value: summary.counts.inVerification, color: '#3b82f6' },
        { name: 'В ремонте', value: summary.counts.inRepair, color: '#f43f5e' },
        { name: 'Списано', value: summary.counts.decommissioned, color: '#64748b' }
      ]
    : [];

  // Verification schedule histogram data
  const verifData = summary
    ? [
        { name: 'Просрочено', count: summary.verificationAlerts.expiredCount, fill: '#f43f5e' },
        { name: '< 30 дней', count: summary.verificationAlerts.in30DaysCount, fill: '#f59e0b' },
        { name: '30-60 дн.', count: summary.verificationAlerts.in60DaysCount, fill: '#eab308' },
        { name: '60-90 дн.', count: summary.verificationAlerts.in90DaysCount, fill: '#3b82f6' }
      ]
    : [];

  const issuedDevices = devices.filter((d) => d.status === 'issued');
  const nowStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Аналитические отчёты и метрологический контроль
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Сводные данные по парку СИ, графики поверки и хронология движения
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Печать отчёта
          </button>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Распределение парка СИ по статусам
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(val) => <span className="text-slate-300">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verification Timing Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Сроки наступления поверки приборов
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={verifData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {verifData.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs for detailed reports */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          type="button"
          onClick={() => setActiveReportTab('on_hands')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'on_hands'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Приборы на руках ({issuedDevices.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('verification_plan')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'verification_plan'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          График поверки
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('device_history')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeReportTab === 'device_history'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          История по конкретному прибору
        </button>
      </div>

      {/* Report 1: On Hands */}
      {activeReportTab === 'on_hands' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Код СИ</th>
                  <th className="py-3 px-4">Наименование и модель</th>
                  <th className="py-3 px-4">Сотрудник (Держатель)</th>
                  <th className="py-3 px-4">Дата выдачи</th>
                  <th className="py-3 px-4">Срок закрепления</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {issuedDevices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Все средства измерений находятся на складе
                    </td>
                  </tr>
                ) : (
                  issuedDevices.map((dev) => {
                    return (
                      <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-cyan-300 font-medium">
                          {dev.barcode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{dev.name}</div>
                          <div className="text-[11px] text-slate-400">{dev.model}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {dev.currentHolderName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {dev.issuedAt ? dev.issuedAt.split('T')[0] : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-emerald-400 font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                            Бессрочно
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Verification Plan */}
      {activeReportTab === 'verification_plan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Инв. №</th>
                  <th className="py-3 px-4">Прибор и модель</th>
                  <th className="py-3 px-4">Заводской номер</th>
                  <th className="py-3 px-4">Срок поверки</th>
                  <th className="py-3 px-4">Статус свидетельства</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {devices
                  .sort((a, b) => a.nextVerificationDate.localeCompare(b.nextVerificationDate))
                  .map((dev) => {
                    const isExpired = dev.nextVerificationDate < nowStr;

                    return (
                      <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-cyan-300 font-medium">
                          {dev.inventoryNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{dev.name}</div>
                          <div className="text-[11px] text-slate-400">{dev.model}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {dev.serialNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-200 font-semibold">
                          {dev.nextVerificationDate}
                        </td>
                        <td className="py-3.5 px-4">
                          {isExpired ? (
                            <span className="font-mono text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                              Поверка истекла!
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-medium">Действительно</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 3: Device History */}
      {activeReportTab === 'device_history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="max-w-md space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Поиск истории по штрихкоду прибора (DEV:...):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="напр., DEV:00101"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => handleSearchDeviceHistory(historySearch.trim())}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
              >
                Построить
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {selectedDeviceHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Введите штрихкод прибора и нажмите «Построить» для отображения таймлайна движений
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-cyan-500/30 space-y-4">
                {selectedDeviceHistory.map((m) => (
                  <div key={m.id} className="relative group">
                    <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-900" />
                    <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">
                          {new Date(m.timestamp).toLocaleString('ru-RU')}
                        </span>
                        <span className="font-semibold text-cyan-300 uppercase">
                          {m.action}
                        </span>
                      </div>
                      <div className="font-bold text-slate-200">
                        Сотрудник: {m.employeeName || '—'}
                      </div>
                      <div className="text-slate-400">
                        Оператор: {m.operator} • Примечания: {m.notes || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
