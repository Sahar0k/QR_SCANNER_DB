import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Calendar,
  Lock
} from 'lucide-react';
import { Movement } from '../types.js';

export const MovementsView: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchMovements = async () => {
    setLoading(true);
    try {
      let url = `/api/movements?action=${actionFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      setMovements(data);
    } catch (err) {
      console.error('Fetch movements error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [actionFilter, search]);

  const totalIssued = movements.filter((m) => m.action === 'issued').length;
  const totalReturned = movements.filter((m) => m.action === 'returned').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              Журнал выдачи средств измерений
            </h2>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Append-Only (Неизменяемый)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Юридически значимый аудит всех операций: выдача, возврат, поверка, перемещение
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/movements/export/csv"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт журнала (CSV)
          </a>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-slate-400 text-xs">Всего записей в аудите</span>
          <div className="text-xl font-bold text-white mt-1">{movements.length}</div>
        </div>
        <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3.5">
          <span className="text-amber-400 text-xs flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Операций выдачи
          </span>
          <div className="text-xl font-bold text-amber-300 mt-1">{totalIssued}</div>
        </div>
        <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-3.5">
          <span className="text-emerald-400 text-xs flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Операций возврата
          </span>
          <div className="text-xl font-bold text-emerald-300 mt-1">{totalReturned}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по прибору, штрихкоду, ФИО, оператору..."
            className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9.5 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Операция:
          </span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">Все действия ({movements.length})</option>
            <option value="issued">Выдача сотруднику</option>
            <option value="returned">Возврат на склад</option>
            <option value="sent_to_verification">Отправка в поверку</option>
            <option value="returned_from_verification">Возврат из поверки</option>
            <option value="decommissioned">Списание</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Время фиксации</th>
                <th className="py-3 px-4">Действие</th>
                <th className="py-3 px-4">Прибор</th>
                <th className="py-3 px-4">Штрихкод</th>
                <th className="py-3 px-4">Сотрудник (Держатель)</th>
                <th className="py-3 px-4">Срок закрепления</th>
                <th className="py-3 px-4">Оператор склада</th>
                <th className="py-3 px-4">Примечания / Основание</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Загрузка журнала...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Записи журнала по заданным критериям не найдены
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isIssue = m.action === 'issued';
                  const isReturn = m.action === 'returned';

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleString('ru-RU', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            isIssue
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : isReturn
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {isIssue && <ArrowUpRight className="w-3 h-3" />}
                          {isReturn && <ArrowDownLeft className="w-3 h-3" />}
                          {isIssue
                            ? 'Выдан'
                            : isReturn
                            ? 'Возвращён'
                            : m.action === 'sent_to_verification'
                            ? 'В поверку'
                            : m.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">{m.deviceName}</td>
                      <td className="py-3.5 px-4 font-mono text-cyan-300">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          {m.deviceBarcode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {m.employeeName || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {isIssue ? 'Бессрочно' : (m.expectedReturnDate || '—')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">{m.operator}</td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
