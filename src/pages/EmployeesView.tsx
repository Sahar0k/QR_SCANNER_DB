import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Building,
  Phone,
  X,
  Check,
  Building2,
  Lock,
  Layers
} from 'lucide-react';
import { Employee, Department, User } from '../types.js';

interface EmployeesViewProps {
  currentUser: User;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  theme?: 'dark' | 'light';
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  currentUser,
  isLoggedIn = false,
  onRequireLogin,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const isAdmin = currentUser.role === 'admin';

  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'departments'>('employees');

  // Employees State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [empSearch, setEmpSearch] = useState<string>('');

  // Employee Modal State
  const [empModalOpen, setEmpModalOpen] = useState<boolean>(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [formBadgeId, setFormBadgeId] = useState<string>('');
  const [formFullName, setFormFullName] = useState<string>('');
  const [formDept, setFormDept] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');

  // Departments State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState<boolean>(true);
  const [deptSearch, setDeptSearch] = useState<string>('');

  // Department Modal State
  const [deptModalOpen, setDeptModalOpen] = useState<boolean>(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptFormName, setDeptFormName] = useState<string>('');

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error('Fetch employees error:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error('Fetch departments error:', err);
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  // --- Employees Actions ---
  const openAddEmpModal = () => {
    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }
    setSelectedEmp(null);
    setFormBadgeId('');
    setFormFullName('');
    setFormDept(departments[0]?.name || 'Отдел разработки СВЧ аппаратуры');
    setFormPhone('+7 (916) 000-00-00');
    setEmpModalOpen(true);
  };

  const openEditEmpModal = (emp: Employee) => {
    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }
    setSelectedEmp(emp);
    setFormBadgeId(emp.badgeId || '');
    setFormFullName(emp.fullName);
    setFormDept(emp.department);
    setFormPhone(emp.phone);
    setEmpModalOpen(true);
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      badgeId: formBadgeId.trim(),
      fullName: formFullName.trim(),
      department: formDept.trim(),
      phone: formPhone.trim(),
      canBorrow: true
    };

    try {
      if (selectedEmp) {
        await fetch(`/api/employees/${selectedEmp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setEmpModalOpen(false);
      fetchEmployees();
      fetchDepartments();
    } catch (err) {
      console.error('Save employee error:', err);
    }
  };

  const handleDeleteEmp = async (id: string) => {
    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }
    if (!window.confirm('Удалить сотрудника из реестра?')) return;
    try {
      await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      fetchEmployees();
      fetchDepartments();
    } catch (err) {
      console.error('Delete employee error:', err);
    }
  };

  // --- Department Actions ---
  const openAddDeptModal = () => {
    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }
    setSelectedDept(null);
    setDeptFormName('');
    setDeptModalOpen(true);
  };

  const openEditDeptModal = (dept: Department) => {
    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }
    setSelectedDept(dept);
    setDeptFormName(dept.name);
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: deptFormName.trim()
    };

    try {
      if (selectedDept) {
        await fetch(`/api/departments/${selectedDept.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setDeptModalOpen(false);
      fetchDepartments();
      fetchEmployees();
    } catch (err) {
      console.error('Save department error:', err);
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }
    if (!window.confirm('Удалить отдел из справочника? Сотрудники этого отдела будут сохранены.')) return;
    try {
      await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      fetchDepartments();
    } catch (err) {
      console.error('Delete department error:', err);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const q = empSearch.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.badgeId.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.phone.includes(q)
    );
  });

  const filteredDepartments = departments.filter((d) => {
    const q = deptSearch.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.code && d.code.toLowerCase().includes(q)) ||
      (d.headName && d.headName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Users className="w-5 h-5 text-cyan-500" />
            Справочник сотрудников и отделов
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Держатели пропусков RFID/QR, подразделения и права доступа к средствам измерений
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <a
            href="/api/employees/export/csv"
            className={`text-xs border px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт CSV
          </a>

          {activeSubTab === 'employees' ? (
            <button
              type="button"
              onClick={openAddEmpModal}
              className="text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Добавить сотрудника
            </button>
          ) : (
            <button
              type="button"
              onClick={openAddDeptModal}
              disabled={!isAdmin}
              className={`text-xs font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                isAdmin
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-70'
              }`}
              title={isAdmin ? 'Добавить подразделение' : 'Редактирование отделов только для Администратора'}
            >
              <Plus className="w-4 h-4" />
              Добавить отдел {isAdmin ? '' : '(Админ)'}
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs selection bar */}
      <div className={`p-1 rounded-2xl border flex items-center gap-2 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/80 border-slate-300'
      }`}>
        <button
          type="button"
          onClick={() => setActiveSubTab('employees')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'employees'
              ? isDark
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'bg-white text-cyan-800 border border-slate-300 shadow-xs'
              : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-500" />
          <span>Список сотрудников ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'departments'
              ? isDark
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                : 'bg-white text-purple-800 border border-slate-300 shadow-xs'
              : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-purple-500" />
          <span>Отделы и подразделения ({departments.length})</span>
          {isAdmin && (
            <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-mono uppercase">
              Админ
            </span>
          )}
        </button>
      </div>

      {/* SUB-TAB 1: EMPLOYEES */}
      {activeSubTab === 'employees' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className={`border rounded-2xl p-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                placeholder="Поиск по ФИО, коду пропуска, отделу, телефону..."
                className={`w-full border rounded-xl pl-9.5 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-400 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Table */}
          <div className={`border rounded-2xl overflow-hidden shadow-xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] uppercase tracking-wider font-semibold ${
                    isDark ? 'border-slate-800 bg-slate-800/40 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                  }`}>
                    <th className="py-3 px-4">Код пропуска RFID/QR</th>
                    <th className="py-3 px-4">ФИО сотрудника</th>
                    <th className="py-3 px-4">Подразделение</th>
                    <th className="py-3 px-4">Телефон</th>
                    <th className="py-3 px-4">Приборов на руках</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-normal ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {loadingEmployees ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Загрузка списка сотрудников...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Сотрудники не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                        <td className="py-3.5 px-4 font-mono font-medium">
                          {emp.badgeId && emp.badgeId.trim() ? (
                            <span className={`px-2 py-1 rounded-lg text-xs border ${
                              isDark ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-300 text-cyan-800'
                            }`}>
                              {emp.badgeId}
                            </span>
                          ) : (
                            <span className={`px-2 py-1 rounded-lg text-xs border italic ${
                              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'
                            }`}>
                              Нет метки
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{emp.fullName}</div>
                        </td>
                        <td className={`py-3.5 px-4 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {emp.department}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {emp.phone}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              (emp.activeBorrowedCount || 0) > 0
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                : 'text-slate-500'
                            }`}
                          >
                            {emp.activeBorrowedCount || 0} шт.
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditEmpModal(emp)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                              title="Редактировать сотрудника"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEmp(emp.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Удалить сотрудника"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DEPARTMENTS */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            isDark ? 'bg-slate-900/90 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-900'
          }`}>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h4 className="font-semibold text-xs text-white">Реестр отделов и подразделений организации</h4>
                <p className="text-[11px] text-slate-400">
                  {isAdmin 
                    ? 'Администраторы могут редактировать список отделов, переименовывать подразделения и назначать начальников.' 
                    : 'Редактирование отделов списком доступно Администраторам. Метрологи могут просматривать структуру.'}
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={openAddDeptModal}
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Новый отдел
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className={`border rounded-2xl p-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="Поиск отдела по названию, коду или руководителю..."
                className={`w-full border rounded-xl pl-9.5 pr-4 py-2 text-xs focus:outline-none focus:border-purple-400 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Departments Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingDepartments ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                Загрузка списка отделов...
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                Отделы не найдены
              </div>
            ) : (
              filteredDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-xs hover:border-purple-300'
                  }`}
                >
                  <div className="space-y-1">
                    <h3 className={`font-bold text-sm leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {dept.name}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Сотрудников: <span className="font-semibold text-purple-400">{dept.employeeCount || 0}</span>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditDeptModal(dept)}
                        className={`p-2 rounded-xl border flex items-center gap-1 transition-colors cursor-pointer ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                            : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Изменить название отдела"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDept(dept.id)}
                        className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Удалить отдел"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Employee */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 text-slate-100">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {selectedEmp ? 'Редактирование сотрудника' : 'Добавление нового сотрудника'}
              </h3>
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmp} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Код пропуска RFID / QR (необязательно)</label>
                <input
                  type="text"
                  placeholder="Например: CARD:00012345 (можно оставить пустым)"
                  value={formBadgeId}
                  onChange={(e) => setFormBadgeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">ФИО сотрудника *</label>
                <input
                  type="text"
                  required
                  placeholder="Иванов Иван Иванович"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Подразделение (выберите из списка отделов) *</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                  <option value="Другой отдел">Другой отдел (ввести вручную)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Телефон *</label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="text-slate-400 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Department (Admin feature) */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 text-slate-100">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  {selectedDept ? 'Редактирование названия отдела' : 'Создание нового отдела'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeptModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Название отдела / подразделения *</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Отдел испытаний СВЧ"
                  value={deptFormName}
                  onChange={(e) => setDeptFormName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="text-slate-400 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/20"
                >
                  <Check className="w-4 h-4" />
                  Сохранить отдел
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
