import React from 'react';
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  Radio,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  Cpu,
  ChevronRight
} from 'lucide-react';
import { DashboardSummary } from '../types.js';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  onNavigateToOperations: () => void;
  onNavigateToDevices: (filterStatus?: string) => void;
  onNavigateToReports: () => void;
  onOpenSimulator: () => void;
  theme?: 'dark' | 'light';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  onNavigateToOperations,
  onNavigateToDevices,
  onNavigateToReports,
  onOpenSimulator,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  if (!summary) {
    return (
      <div className={`flex items-center justify-center py-20 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Загрузка данных дашборда...
      </div>
    );
  }

  const { counts, terminal, verificationAlerts, recentMovements, overdueLoans } = summary;

  const statCards = [
    {
      title: 'Всего приборов',
      count: counts.total,
      sub: 'В реестре организации',
      icon: Layers,
      color: isDark ? 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300' : 'from-cyan-50 to-blue-50 border-cyan-200 text-cyan-800',
      action: () => onNavigateToDevices('all')
    },
    {
      title: 'На складе',
      count: counts.inStock,
      sub: 'Готовы к выдаче',
      icon: CheckCircle2,
      color: isDark ? 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300' : 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800',
      action: () => onNavigateToDevices('in_stock')
    },
    {
      title: 'Выдано на руки',
      count: counts.issued,
      sub: 'Закреплены за сотрудниками',
      icon: Clock,
      color: isDark ? 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300' : 'from-amber-50 to-orange-50 border-amber-200 text-amber-800',
      action: () => onNavigateToDevices('issued')
    },
    {
      title: 'В поверке / ЦСМ',
      count: counts.inVerification,
      sub: 'Метрологический контроль',
      icon: Calendar,
      color: isDark ? 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-300' : 'from-blue-50 to-indigo-50 border-blue-200 text-blue-800',
      action: () => onNavigateToDevices('in_verification')
    },
    {
      title: 'В ремонте / списано',
      count: counts.inRepair + counts.decommissioned,
      sub: `${counts.inRepair} рем. / ${counts.decommissioned} списано`,
      icon: Wrench,
      color: isDark ? 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-300' : 'from-rose-50 to-pink-50 border-rose-200 text-rose-800',
      action: () => onNavigateToDevices('in_repair')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Terminal Status */}
      <div className={`rounded-2xl border p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
        isDark 
          ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700/80' 
          : 'bg-gradient-to-r from-slate-50 via-white to-slate-50 border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
              terminal.isOnline
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
            }`}
          >
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Аппаратный терминал склада: {terminal.isOnline ? 'ОНЛАЙН' : 'ОФФЛАЙН'}
              </h2>
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                terminal.isOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}>
                Сетевой терминал сканеров
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {terminal.isOnline ? (
                <>
                  Сигнал сети: <span className="font-mono text-cyan-500">{terminal.rssi} dBm</span> • <span className="text-emerald-400">Связь со сканером активна</span>
                </>
              ) : (
                <span className="text-rose-500 font-medium">
                  Сканер не в сети. Проверьте подключение устройства.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            id="dashboard-open-sim-btn"
            type="button"
            onClick={onOpenSimulator}
            className={`flex-1 sm:flex-initial text-xs border px-4 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-500" />
            Эмулятор сканера
          </button>
          <button
            id="dashboard-start-op-btn"
            type="button"
            onClick={onNavigateToOperations}
            className="flex-1 sm:flex-initial text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            Выдача / Возврат СИ
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={card.action}
              className={`rounded-2xl p-4 border bg-gradient-to-b ${card.color} cursor-pointer hover:scale-[1.02] transition-all group ${
                isDark ? 'bg-slate-900/90' : 'bg-white shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{card.title}</span>
                <Icon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.count}</div>
              <div className={`text-[11px] mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Two columns: Verification Alerts & Overdue loans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Alerts */}
        <div className={`border rounded-2xl p-5 space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Контроль сроков поверки
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Приборы с приближающимся сроком поверки
                </p>
              </div>
            </div>
            <button
              id="view-all-verification-btn"
              onClick={onNavigateToReports}
              className="text-xs text-cyan-500 hover:text-cyan-600 font-medium flex items-center gap-1 cursor-pointer"
            >
              График
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2">
              <span className="block text-lg font-bold text-rose-500">{verificationAlerts.expiredCount}</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Просрочено</span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
              <span className="block text-lg font-bold text-amber-500">{verificationAlerts.in30DaysCount}</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>&lt; 30 дн.</span>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2">
              <span className="block text-lg font-bold text-yellow-600">{verificationAlerts.in60DaysCount}</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>&lt; 60 дн.</span>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2">
              <span className="block text-lg font-bold text-blue-500">{verificationAlerts.in90DaysCount}</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>&lt; 90 дн.</span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {verificationAlerts.items.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Все приборы имеют действующие свидетельства о поверке
              </div>
            ) : (
              verificationAlerts.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    item.isExpired
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="space-y-0.5 max-w-[70%]">
                    <div className={`font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {item.device.name} {item.device.model}
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Инв. № {item.device.inventoryNumber} • {item.device.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        item.isExpired
                          ? 'bg-rose-500/20 text-rose-500'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.isExpired
                        ? `Просрочена на ${Math.abs(item.daysRemaining)} дн.`
                        : `Через ${item.daysRemaining} дн.`}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      до {item.device.nextVerificationDate}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Loans */}
        <div className={`border rounded-2xl p-5 space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Просроченные возвраты
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Приборы на руках сверх планового срока
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30">
              {overdueLoans.length} поз.
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {overdueLoans.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                Задолженностей нет: все приборы находятся в пределах плановых сроков
              </div>
            ) : (
              overdueLoans.map((loan, idx) => (
                <div
                  key={idx}
                  className={`p-3 border rounded-xl flex items-center justify-between text-xs ${
                    isDark ? 'bg-slate-800/40 border-rose-500/30' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {loan.device.name} {loan.device.model}
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Сотрудник: <span className="font-semibold text-rose-600 dark:text-rose-400">{loan.employeeName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-rose-500 font-bold bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30 text-[11px]">
                      +{loan.daysOverdue} дн.
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Срок: {loan.expectedReturnDate}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Movements Feed */}
      <div className={`border rounded-2xl p-5 space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-500">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Лента последних операций
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Неизменяемый журнал перемещений СИ
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b uppercase tracking-wider text-[10px] ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500 font-semibold'
              }`}>
                <th className="py-2.5 px-3">Время</th>
                <th className="py-2.5 px-3">Действие</th>
                <th className="py-2.5 px-3">Прибор</th>
                <th className="py-2.5 px-3">Штрихкод</th>
                <th className="py-2.5 px-3">Сотрудник</th>
                <th className="py-2.5 px-3">Оператор</th>
                <th className="py-2.5 px-3">Примечания</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {recentMovements.slice(0, 7).map((m) => {
                const isIssue = m.action === 'issued';
                const isReturn = m.action === 'returned';

                return (
                  <tr key={m.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(m.timestamp).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        isIssue
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          : isReturn
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      }`}>
                        {isIssue && <ArrowUpRight className="w-3 h-3" />}
                        {isReturn && <ArrowDownLeft className="w-3 h-3" />}
                        {isIssue ? 'Выдан' : isReturn ? 'Возвращён' : m.action}
                      </span>
                    </td>
                    <td className={`py-3 px-3 font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{m.deviceName}</td>
                    <td className="py-3 px-3 font-mono text-cyan-500">{m.deviceBarcode}</td>
                    <td className={`py-3 px-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{m.employeeName || '—'}</td>
                    <td className="py-3 px-3 text-slate-400">{m.operator}</td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-xs">{m.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
