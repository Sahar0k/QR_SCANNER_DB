import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  UserCheck,
  Package,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  FileText,
  ChevronRight,
  Lock,
  KeyRound,
  Search,
  User,
  Check
} from 'lucide-react';
import { Device, Employee, User as UserType } from '../types.js';

interface OperationsViewProps {
  currentUser: UserType;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  onOperationCompleted: () => void;
  incomingScanCode: string | null;
  onClearIncomingScan: () => void;
  theme?: 'dark' | 'light';
}

function playAudioFeedback(type: 'success' | 'error' | 'scan') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch {
    // Audio Context fail silent
  }
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  currentUser,
  isLoggedIn,
  onRequireLogin,
  onOperationCompleted,
  incomingScanCode,
  onClearIncomingScan,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [opMode, setOpMode] = useState<'issue' | 'return'>('issue');
  const [step, setStep] = useState<number>(1);

  // Loaded lists for search/selection
  const [devicesList, setDevicesList] = useState<Device[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  // Selected entities
  const [device, setDevice] = useState<Device | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);

  // Search filter terms
  const [deviceSearchTerm, setDeviceSearchTerm] = useState<string>('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState<string>('');

  const [expectedDays, setExpectedDays] = useState<number>(7);
  const [notes, setNotes] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');

  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [devRes, empRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/employees')
      ]);
      const devs = await devRes.json();
      const emps = await empRes.json();
      if (Array.isArray(devs)) setDevicesList(devs);
      if (Array.isArray(emps)) setEmployeesList(emps);
    } catch (err) {
      console.error('Error fetching data for operations:', err);
    }
  };

  useEffect(() => {
    scannerInputRef.current?.focus();
  }, [step, opMode, isLoggedIn]);

  useEffect(() => {
    if (!incomingScanCode) return;
    handleProcessBarcode(incomingScanCode);
    onClearIncomingScan();
  }, [incomingScanCode]);

  const selectDevice = (dev: Device) => {
    setErrorReason(null);
    setSuccessMessage(null);
    playAudioFeedback('scan');

    setDevice(dev);

    if (opMode === 'issue') {
      const isExpired = dev.nextVerificationDate && new Date(dev.nextVerificationDate) < new Date();
      if (isExpired) {
        playAudioFeedback('error');
        setErrorReason(`Блокировка: Поверка прибора «${dev.name}» (${dev.inventoryNumber}) просрочена (${dev.nextVerificationDate})! Выдача запрещена.`);
        return;
      }
      if (dev.status !== 'in_stock') {
        playAudioFeedback('error');
        setErrorReason(`Блокировка: Прибор не находится на складе (статус: «${dev.status}», держатель: ${dev.currentHolderName || 'нет'}).`);
        return;
      }
      setStep(2);
    } else {
      if (dev.status !== 'issued') {
        setErrorReason(`Внимание: Прибор числится со статусом «${dev.status}» (не выдан). Нажмите для подтверждения возврата на склад.`);
      }
      setStep(2);
    }
  };

  const selectEmployee = (emp: Employee) => {
    setErrorReason(null);
    setSuccessMessage(null);
    playAudioFeedback('scan');

    setEmployee(emp);
    setStep(3);
  };

  const handleProcessBarcode = async (code: string) => {
    setErrorReason(null);
    setSuccessMessage(null);
    playAudioFeedback('scan');

    const clean = code.trim();

    try {
      const res = await fetch('/api/operations/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean })
      });
      const data = await res.json();

      if (data.type === 'device') {
        selectDevice(data.data);
      } else if (data.type === 'employee') {
        selectEmployee(data.data);
      } else {
        playAudioFeedback('error');
        setErrorReason(`Код «${clean}» не найден в базе данных (не соответствует прибору или сотруднику).`);
      }
    } catch (err: any) {
      setErrorReason(`Ошибка связи с сервером: ${err.message}`);
    }
  };

  const handleConfirmIssue = async () => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    if (!device || !employee) return;
    setLoading(true);
    setErrorReason(null);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + expectedDays);
    const expectedReturnDate = targetDate.toISOString().split('T')[0];

    try {
      const res = await fetch('/api/operations/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceBarcodeOrId: device.barcode || device.id,
          employeeBadgeOrId: employee.badgeId || employee.id,
          operatorName: currentUser.fullName,
          expectedReturnDate,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('error');
        setErrorReason(data.message || 'Ошибка выполнения операции выдачи');
      } else {
        playAudioFeedback('success');
        setSuccessMessage(`Прибор «${device.name} ${device.model}» успешно выдан сотруднику ${employee.fullName} до ${expectedReturnDate}.`);
        onOperationCompleted();
        fetchData();
        setTimeout(() => {
          resetWizard();
        }, 1500);
      }
    } catch (err: any) {
      setErrorReason(`Сбой сети: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    if (!device) return;
    setLoading(true);
    setErrorReason(null);

    try {
      const res = await fetch('/api/operations/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceBarcodeOrId: device.barcode || device.id,
          actualReturnerBadgeOrId: employee?.badgeId || employee?.id,
          operatorName: currentUser.fullName,
          notes,
          newLocation: newLocation.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('error');
        setErrorReason(data.message || 'Ошибка выполнения операции возврата');
      } else {
        playAudioFeedback('success');
        setSuccessMessage(`Прибор «${device.name} ${device.model}» успешно возвращён на склад.`);
        onOperationCompleted();
        fetchData();
        setTimeout(() => {
          resetWizard();
        }, 1500);
      }
    } catch (err: any) {
      setErrorReason(`Сбой сети: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setEmployee(null);
    setDevice(null);
    setDeviceSearchTerm('');
    setEmployeeSearchTerm('');
    setNotes('');
    setNewLocation('');
    setErrorReason(null);
    setSuccessMessage(null);
    setStep(1);
    scannerInputRef.current?.focus();
  };

  if (!isLoggedIn) {
    return (
      <div className={`max-w-2xl mx-auto p-8 rounded-2xl border text-center space-y-4 my-8 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>
        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Требуется авторизация метролога
        </h3>
        <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Гостевой режим позволяет просматривать реестр СИ и их текущие статусы. Для проведения операций выдачи или возврата приборов войдите под аккаунтом метролога.
        </p>
        <button
          type="button"
          onClick={onRequireLogin}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          Войти как метролог
        </button>
      </div>
    );
  }

  const filteredDevices = devicesList.filter((d) => {
    const q = deviceSearchTerm.toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.model.toLowerCase().includes(q) ||
      d.inventoryNumber.toLowerCase().includes(q) ||
      d.serialNumber.toLowerCase().includes(q) ||
      (d.barcode && d.barcode.toLowerCase().includes(q))
    );
  });

  const filteredEmployees = employeesList.filter((e) => {
    const q = employeeSearchTerm.toLowerCase();
    if (!q) return true;
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      (e.badgeId && e.badgeId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mode Switcher */}
      <div className={`flex border p-1.5 rounded-2xl ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <button
          id="op-mode-issue"
          type="button"
          onClick={() => {
            setOpMode('issue');
            resetWizard();
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            opMode === 'issue'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          Выдача прибора (Сотруднику)
        </button>
        <button
          id="op-mode-return"
          type="button"
          onClick={() => {
            setOpMode('return');
            resetWizard();
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            opMode === 'return'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Возврат прибора (На склад)
        </button>
      </div>

      {/* Progress Indicator */}
      <div className={`border rounded-2xl p-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2.5 ${step >= 1 ? 'text-cyan-500' : 'text-slate-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
              step >= 1 ? 'bg-cyan-500/20 border-cyan-400 text-cyan-500' : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}>
              1
            </div>
            <span className="text-xs font-semibold">1. Выбор / Скан прибора</span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400" />

          <div className={`flex items-center gap-2.5 ${step >= 2 ? 'text-cyan-500' : 'text-slate-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
              step >= 2 ? 'bg-cyan-500/20 border-cyan-400 text-cyan-500' : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}>
              2
            </div>
            <span className="text-xs font-semibold">
              {opMode === 'issue' ? '2. Выбор сотрудника' : '2. Кто сдаёт (необязательно)'}
            </span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400" />

          <div className={`flex items-center gap-2.5 ${step === 3 ? 'text-emerald-500' : 'text-slate-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
              step === 3 ? 'bg-emerald-500/20 border-emerald-400 text-emerald-500' : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}>
              3
            </div>
            <span className="text-xs font-semibold">3. Подтверждение</span>
          </div>
        </div>
      </div>

      {/* Main Barcode Scanner Field */}
      <div className={`border rounded-2xl p-6 shadow-xl space-y-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <label htmlFor="main-scanner-input" className="text-xs font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-2">
            <Scan className="w-4 h-4" />
            Ввод штрихкода / QR-кода со сканера
          </label>
          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Нажмите Enter после сканирования
          </span>
        </div>

        <div className="relative">
          <input
            id="main-scanner-input"
            ref={scannerInputRef}
            type="text"
            placeholder="Отсканируйте код прибора или пропуска сотрудника..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                handleProcessBarcode(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            className={`w-full border-2 focus:border-cyan-400 rounded-2xl px-5 py-3.5 text-base sm:text-lg font-mono focus:outline-none shadow-inner ${
              isDark 
                ? 'bg-slate-950 border-cyan-500/40 text-cyan-200 placeholder-slate-600' 
                : 'bg-slate-50 border-cyan-300 text-cyan-900 placeholder-slate-400'
            }`}
          />
          <button
            id="scan-submit-btn"
            type="button"
            onClick={() => {
              if (scannerInputRef.current?.value.trim()) {
                handleProcessBarcode(scannerInputRef.current.value);
                scannerInputRef.current.value = '';
              }
            }}
            className="absolute right-2.5 top-2.5 bottom-2.5 bg-cyan-600 hover:bg-cyan-500 text-white px-5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            Ввод
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error / Success Alerts */}
      {errorReason && (
        <div className="bg-rose-950/40 border-2 border-rose-500/50 rounded-2xl p-5 flex items-start gap-4 text-rose-200">
          <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-rose-300">Операция отклонена системой</h4>
            <p className="text-xs text-rose-200 mt-0.5">{errorReason}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl p-5 flex items-start gap-4 text-emerald-200">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-emerald-300">Операция успешно проведена</h4>
            <p className="text-xs text-emerald-200 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* STEP 1: DEVICE SELECT / SCAN */}
      <div className={`border rounded-2xl p-5 space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Package className="w-4 h-4 text-cyan-500" />
            <span>1. Прибор (СИ)</span>
          </div>
          {device && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Выбран: {device.name}
            </span>
          )}
        </div>

        {device ? (
          <div className="space-y-3 text-xs bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">Наименование и модель:</span>
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {device.name} {device.model}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDevice(null)}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                Сменить прибор
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 text-[11px] block">Заводской номер:</span>
                <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{device.serialNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Инвентарный номер:</span>
                <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{device.inventoryNumber}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск прибора из списка по названию, модели, инв. №..."
                value={deviceSearchTerm}
                onChange={(e) => setDeviceSearchTerm(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-400 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {filteredDevices.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Приборы не найдены</p>
              ) : (
                filteredDevices.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => selectDevice(dev)}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isDark 
                        ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-cyan-500/50' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-cyan-400'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-200 block">{dev.name} ({dev.model})</span>
                      <span className="text-[11px] font-mono text-slate-400">Инв. № {dev.inventoryNumber} | Зав. № {dev.serialNumber}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      dev.status === 'in_stock'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {dev.status === 'in_stock' ? 'На складе' : 'Выдан'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: EMPLOYEE SELECT / SCAN */}
      {device && (
        <div className={`border rounded-2xl p-5 space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-cyan-500" />
              <span>2. Сотрудник ({opMode === 'issue' ? 'Получатель' : 'Сдающий'})</span>
            </div>
            {employee && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Выбран: {employee.fullName}
              </span>
            )}
          </div>

          {employee ? (
            <div className="space-y-3 text-xs bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[11px] block">ФИО сотрудника:</span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{employee.fullName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmployee(null)}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  Сменить сотрудника
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[11px] block">Подразделение:</span>
                  <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{employee.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Телефон:</span>
                  <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{employee.phone}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Поиск сотрудника по ФИО, отделу, коду пропуска..."
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-400 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {filteredEmployees.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Сотрудники не найдены</p>
                ) : (
                  filteredEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => selectEmployee(emp)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isDark 
                          ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-cyan-500/50' 
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-cyan-400'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-slate-200 block">{emp.fullName}</span>
                        <span className="text-[11px] text-slate-400">{emp.department} | {emp.phone}</span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400">
                        {emp.badgeId || 'Без метки'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: CONFIRMATION PANEL */}
      {device && (
        <div className={`border rounded-2xl p-6 space-y-5 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <FileText className="w-4 h-4 text-cyan-500" />
            3. Подтверждение операции ({opMode === 'issue' ? 'Выдача' : 'Возврат'})
          </h3>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={resetWizard}
              className={`text-xs px-4 py-2.5 rounded-xl cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Сбросить
            </button>

            {opMode === 'issue' ? (
              <button
                type="button"
                disabled={loading || !device || !employee}
                onClick={handleConfirmIssue}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? 'Проведение...' : 'Подтвердить выдачу СИ'}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || !device}
                onClick={handleConfirmReturn}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? 'Проведение...' : 'Подтвердить возврат СИ'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
