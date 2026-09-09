import React, { useState } from 'react';
import { KeyRound, X, Check, Lock, UserCheck } from 'lucide-react';
import { User } from '../types.js';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (data.success && data.user) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        setError(data.error || 'Неверный пароль');
      }
    } catch (err: any) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Авторизация в системе СИ
              </h3>
              <p className="text-[11px] text-slate-400">
                Вход в рабочий режим метролога
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-300">
            💡 <span className="font-semibold text-slate-200">Публичный доступ (Гость):</span> любой сотрудник может зайти на сайт, найти нужный прибор и проверить его статус. Для выполнения операций войдите ниже.
          </div>

          <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-xs text-cyan-200">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Обычный вход разрешён только метрологам.</span>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-slate-300 block mb-1 font-medium">
              Пароль метролога
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль метролога"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Пароль задаётся переменной <code className="text-cyan-400 font-mono">METROLOGIST_PASSWORD</code> на сервере.
            </span>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold text-xs py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Проверка...' : 'Войти как метролог'}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};
