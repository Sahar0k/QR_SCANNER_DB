import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  QrCode,
  X,
  Check,
  Lock
} from 'lucide-react';
import { Device, DeviceStatus, User } from '../types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { QrPrintModal } from '../components/QrPrintModal.js';

interface DevicesViewProps {
  currentUser: User;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  initialFilterStatus?: string;
  onRefreshData?: () => void;
  theme?: 'dark' | 'light';
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  currentUser,
  isLoggedIn,
  onRequireLogin,
  initialFilterStatus,
  onRefreshData,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus || 'all');

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [qrDevice, setQrDevice] = useState<Device | null>(null);

  // Form states for Add/Edit
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formModel, setFormModel] = useState<string>('');
  const [formSerial, setFormSerial] = useState<string>('');
  const [formInv, setFormInv] = useState<string>('');
  const [formStatus, setFormStatus] = useState<DeviceStatus>('in_stock');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formNextVerif, setFormNextVerif] = useState<string>('');
  const [formSpecs, setFormSpecs] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const fetchDevices = async () => {
    setLoading(true);
    try {
      let url = `/api/devices?status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      setDevices(data);
    } catch (err) {
      console.error('Fetch devices error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [statusFilter, search]);

  const openAddModal = () => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    const nextInvNum = `ИНВ-00${101 + devices.length}`;
    const nextBarcode = `DEV:00${101 + devices.length}`;
    setSelectedDevice(null);
    setFormBarcode(nextBarcode);
    setFormName('');
    setFormModel('');
    setFormSerial('');
    setFormInv(nextInvNum);
    setFormStatus('in_stock');
    setFormLocation('Склад СИ, Стеллаж 1');
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setFormNextVerif(d.toISOString().split('T')[0]);
    setFormSpecs('');
    setFormNotes('');
    setEditModalOpen(true);
  };

  const openEditModal = (dev: Device) => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    setSelectedDevice(dev);
    setFormBarcode(dev.barcode);
    setFormName(dev.name);
    setFormModel(dev.model);
    setFormSerial(dev.serialNumber);
    setFormInv(dev.inventoryNumber);
    setFormStatus(dev.status);
    setFormLocation(dev.location);
    setFormNextVerif(dev.nextVerificationDate);
    setFormSpecs(dev.specs || '');
    setFormNotes(dev.notes || '');
    setEditModalOpen(true);
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    const payload = {
      barcode: formBarcode.trim(),
      name: formName.trim(),
      model: formModel.trim(),
      serialNumber: formSerial.trim(),
      inventoryNumber: formInv.trim(),
      status: formStatus,
      location: formLocation.trim(),
      nextVerificationDate: formNextVerif,
      specs: formSpecs.trim(),
      notes: formNotes.trim()
    };

    try {
      if (selectedDevice) {
        await fetch(`/api/devices/${selectedDevice.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setEditModalOpen(false);
      fetchDevices();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    if (!window.confirm('Вы действительно хотите удалить запись о данном средстве измерений?')) {
      return;
    }
    try {
      await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      fetchDevices();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleOpenQrModal = (dev: Device) => {
    setQrDevice(dev);
    setQrModalOpen(true);
  };

  const nowStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Layers className="w-5 h-5 text-cyan-500" />
            Реестр средств измерений (СИ)
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Публичный просмотр статуса приборов ({devices.length} ед.). Управление доступно метрологам.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            id="export-devices-csv-btn"
            href="/api/devices/export/csv"
            className={`text-xs border px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-medium ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' 
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт CSV
          </a>

          {isLoggedIn && (
            <button
              id="add-device-modal-btn"
              type="button"
              onClick={openAddModal}
              className="text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Добавить прибор
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="relative w-full sm:w-80">
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            id="devices-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по наименованию, модели, инв. №..."
            className={`w-full border rounded-xl pl-9.5 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-400 ${
              isDark 
                ? 'bg-slate-800 border-slate-700/80 text-slate-200 placeholder-slate-500' 
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className={`text-xs flex items-center gap-1 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <Filter className="w-3.5 h-3.5" />
            Статус:
          </span>
          <select
            id="devices-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`border text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-slate-200' 
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">Все статусы ({devices.length})</option>
            <option value="in_stock">На складе</option>
            <option value="issued">Выданы</option>
            <option value="in_verification">В поверке</option>
            <option value="in_repair">В ремонте</option>
            <option value="decommissioned">Списаны</option>
          </select>
        </div>
      </div>

      {/* Devices Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b uppercase tracking-wider text-[10px] ${
                isDark ? 'border-slate-800 bg-slate-800/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500 font-semibold'
              }`}>
                <th className="py-3.5 px-4">Код маркировки</th>
                <th className="py-3.5 px-4">Наименование и модель</th>
                <th className="py-3.5 px-4">Зав. № / Инв. №</th>
                <th className="py-3.5 px-4">Статус</th>
                <th className="py-3.5 px-4">Местонахождение / Держатель</th>
                <th className="py-3.5 px-4">Поверка до</th>
                <th className="py-3.5 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-normal ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {loading ? (
                <tr>
                  <td colSpan={7} className={`py-12 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Загрузка списка приборов...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`py-12 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Приборы по заданным критериям поиска не найдены
                  </td>
                </tr>
              ) : (
                devices.map((dev) => {
                  const isExpired = dev.nextVerificationDate < nowStr;

                  return (
                    <tr key={dev.id} className={`transition-colors ${
                      isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}>
                      <td className="py-3.5 px-4 font-mono font-medium text-cyan-500">
                        <span className={`px-2 py-1 rounded-lg border text-xs ${
                          isDark 
                            ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300' 
                            : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                        }`}>
                          {dev.barcode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{dev.name}</div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{dev.model}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className={isDark ? 'text-slate-300' : 'text-slate-700'}>№ {dev.serialNumber}</div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{dev.inventoryNumber}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={dev.status} />
                      </td>
                      <td className={`py-3.5 px-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {dev.status === 'issued' ? (
                          <div>
                            <span className="font-semibold text-amber-600 dark:text-amber-300">{dev.currentHolderName}</span>
                            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>до {dev.expectedReturnDate}</div>
                          </div>
                        ) : (
                          <div className="truncate max-w-[180px]">{dev.location}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-medium text-[11px] ${
                            isExpired
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30 font-bold'
                              : isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          {dev.nextVerificationDate}
                        </span>
                        {isExpired && (
                          <div className="text-[10px] text-rose-500 font-sans font-semibold">
                            Просрочено!
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenQrModal(dev)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800' : 'text-slate-500 hover:text-cyan-600 hover:bg-slate-100'
                            }`}
                            title="Печать QR-этикетки"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {isLoggedIn && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(dev)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                                title="Редактировать / изменить статус"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteDevice(dev.id)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                                }`}
                                title="Удалить прибор"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Device Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className={`border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {selectedDevice ? 'Редактирование прибора и статуса' : 'Новое средство измерений (СИ)'}
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Код маркировки (штрихкод/QR) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 font-mono text-cyan-500 focus:outline-none focus:border-cyan-400 ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Инвентарный номер *
                  </label>
                  <input
                    type="text"
                    required
                    value={formInv}
                    onChange={(e) => setFormInv(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-cyan-400 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Наименование прибора *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр., Осциллограф цифровой"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Модель *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр., Tektronix TBS2104B"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Заводской (серийный) номер *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSerial}
                    onChange={(e) => setFormSerial(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-cyan-400 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Текущий статус прибора *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as DeviceStatus)}
                    className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="in_stock">На складе</option>
                    <option value="issued">Выдан</option>
                    <option value="in_verification">В поверке</option>
                    <option value="in_repair">В ремонте</option>
                    <option value="decommissioned">Списан</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Местоположение на складе *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Стеллаж 1, полка А"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Дата следующей поверки *
                  </label>
                  <input
                    type="date"
                    required
                    value={formNextVerif}
                    onChange={(e) => setFormNextVerif(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-cyan-400 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Технические характеристики
                </label>
                <input
                  type="text"
                  placeholder="Диапазон, частота, погрешность, каналы"
                  value={formSpecs}
                  onChange={(e) => setFormSpecs(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="text-xs">
                <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Примечания / Комплектность
                </label>
                <textarea
                  rows={2}
                  placeholder="Кабели, переходники, насадки"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex justify-end gap-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className={`text-xs px-4 py-2 rounded-xl ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Print Modal */}
      <QrPrintModal
        device={qrDevice}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};
