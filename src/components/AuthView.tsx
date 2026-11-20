import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, Building2, CheckCircle2 } from 'lucide-react';
import { BeautyMasterRow, SpecializationId } from '../types/crm';
import { SpecializationCards } from './SpecializationCards';
import { apiLogin, apiSignup, AuthSession } from '../lib/api';

interface AuthViewProps {
  onAuthSuccess: (result: {
    session: AuthSession;
    master: BeautyMasterRow | null;
  }) => void;
}

const PENDING_PROFILE_KEY = 'kontur_pending_master_profile';

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studioName, setStudioName] = useState('');
  const [specialization, setSpecialization] = useState<SpecializationId>('nails');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rawErrorMsg, setRawErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const translateAuthError = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'Неверный email или пароль. Проверьте данные и попробуйте снова.';
    }
    if (lower.includes('password should be at least')) {
      return 'Пароль должен содержать минимум 6 символов.';
    }
    if (lower.includes('unable to validate email')) {
      return 'Введите корректный адрес электронной почты.';
    }
    return msg;
  };

  const setAuthError = (rawMessage: string) => {
    setRawErrorMsg(rawMessage);
    setErrorMsg(translateAuthError(rawMessage));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRawErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setAuthError('Введите email и пароль.');
      return;
    }

    if (mode === 'signup') {
      const cleanStudio = studioName.trim();
      if (!cleanStudio) {
        setAuthError('Укажите имя мастера или название студии.');
        return;
      }
      if (password.length < 6) {
        setAuthError('Пароль должен содержать минимум 6 символов.');
        return;
      }

      setLoading(true);
      try {
        try {
          localStorage.setItem(
            PENDING_PROFILE_KEY,
            JSON.stringify({ studioName: cleanStudio, specialization })
          );
        } catch {
          // ignore
        }

        const result = await apiSignup({
          email: cleanEmail,
          password,
          studio_name: cleanStudio,
          specialization,
        });

        if (result.session) {
          try {
            localStorage.removeItem(PENDING_PROFILE_KEY);
          } catch {
            // ignore
          }
          onAuthSuccess({
            session: result.session,
            master: result.master,
          });
        } else {
          setInfoMsg(
            `Аккаунт создан! Если требуется подтверждение почты, проверьте письмо на ${cleanEmail}, затем войдите.`
          );
          setMode('signin');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setAuthError(message);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const result = await apiLogin({
          email: cleanEmail,
          password,
        });

        try {
          localStorage.removeItem(PENDING_PROFILE_KEY);
        } catch {
          // ignore
        }

        onAuthSuccess({
          session: result.session,
          master: result.master,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setAuthError(message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#1C1F26] flex items-center justify-center px-4 py-8 sm:py-12">
      <div
        className={`w-full ${
          mode === 'signup' ? 'max-w-3xl' : 'max-w-md'
        } bg-[#252932] border border-[#323846] rounded-3xl p-5 sm:p-8 space-y-6 transition-all`}
      >
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs font-bold tracking-wider text-[#10B981]">
              KONTUR // CRM
            </span>
            <span className="text-[11px] font-medium text-[#9CA3AF]">
              CRM возврата клиентов
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F4F6]">
            {mode === 'signin' ? 'Вход в студию' : 'Регистрация мастера'}
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
            {mode === 'signin'
              ? 'Войдите в свой аккаунт, чтобы управлять базой клиентов и возвратами.'
              : 'Создайте изолированный кабинет студии. До 10 клиентов — бесплатно навсегда.'}
          </p>
        </header>

        {/* Auth Mode Switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#1C1F26] border border-[#323846] rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg('');
              setRawErrorMsg('');
            }}
            className={`min-h-[42px] rounded-lg text-xs font-semibold transition-colors ${
              mode === 'signin'
                ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg('');
              setRawErrorMsg('');
            }}
            className={`min-h-[42px] rounded-lg text-xs font-semibold transition-colors ${
              mode === 'signup'
                ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={mode === 'signin' ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-[#F3F4F6]"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="master@studio.ru"
                  className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-[#1C1F26] border border-[#323846] text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <div className={mode === 'signin' ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-[#F3F4F6]"
              >
                Пароль
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-[#1C1F26] border border-[#323846] text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>
          </div>

          {mode === 'signup' && (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-studio"
                  className="block text-xs font-semibold text-[#F3F4F6]"
                >
                  Имя мастера или название студии
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-studio"
                    type="text"
                    required
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="Например: Студия Анны или Барбершоп Бритва"
                    className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-[#1C1F26] border border-[#323846] text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#F3F4F6]">
                  Выберите специализацию
                </div>
                <SpecializationCards
                  selectedId={specialization}
                  onSelect={setSpecialization}
                  columns={2}
                />
              </div>
            </>
          )}

          {infoMsg && (
            <div
              role="status"
              className="px-4 py-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs font-medium text-[#34D399] flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="px-4 py-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs font-semibold text-[#FCA5A5] space-y-1"
            >
              <div>{errorMsg}</div>
              {rawErrorMsg && rawErrorMsg !== errorMsg && (
                <div className="font-mono text-[11px] font-normal text-[#FECACA] break-all">
                  {rawErrorMsg}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[50px] px-6 rounded-xl bg-[#10B981] hover:bg-[#34D399] disabled:opacity-60 text-[#06281E] font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          >
            <span>
              {loading
                ? 'Выполняем запрос...'
                : mode === 'signin'
                ? 'Войти в кабинет'
                : 'Создать кабинет студии'}
            </span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
