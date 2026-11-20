import React, { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, UserCheck, Calendar, Crown } from 'lucide-react';
import { BeautyClientRow, ServiceItem, SpecializationId } from '../types/crm';
import { FREE_CLIENTS_LIMIT, getSpecializationById } from '../data/specializations';
import {
  addDaysISO,
  extractRussianPhoneDigits,
  formatCurrency,
  formatPhoneInput,
  formatRussianDate,
  getTodayISO,
  pluralizeDays,
} from '../utils/formatters';

interface VisitLoggerProps {
  clients: BeautyClientRow[];
  services: ServiceItem[];
  specializationId: SpecializationId;
  isPro: boolean;
  prefillClient?: BeautyClientRow | null;
  saving?: boolean;
  onSaveVisit: (payload: {
    existingClientId?: string;
    clientName: string;
    phone: string;
    serviceName: string;
    price: number;
    cycleDays: number;
    formulaNote: string;
    visitDate: string;
  }) => void;
  onOpenUpgrade: () => void;
}

export const VisitLogger: React.FC<VisitLoggerProps> = ({
  clients,
  services,
  specializationId,
  isPro,
  prefillClient,
  saving = false,
  onSaveVisit,
  onOpenUpgrade,
}) => {
  const spec = getSpecializationById(specializationId);
  const todayIso = getTodayISO();
  const yesterdayIso = addDaysISO(todayIso, -1);

  const [selectedExistingId, setSelectedExistingId] = useState<string | undefined>(
    prefillClient?.id
  );
  const [clientName, setClientName] = useState(prefillClient?.name || '');
  const [phone, setPhone] = useState(prefillClient?.phone || '+7');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    services[0]?.id || ''
  );
  const [customServiceName, setCustomServiceName] = useState('');
  const [cycleDays, setCycleDays] = useState<number>(services[0]?.cycleDays || 21);
  const [price, setPrice] = useState<string>(
    services[0]?.defaultPrice ? String(services[0].defaultPrice) : ''
  );
  const [formulaNote, setFormulaNote] = useState(
    prefillClient?.formula_note || ''
  );
  const [visitDate, setVisitDate] = useState<string>(todayIso);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (prefillClient) {
      setSelectedExistingId(prefillClient.id);
      setClientName(prefillClient.name);
      setPhone(prefillClient.phone);
      setFormulaNote(prefillClient.formula_note || '');
      const matched = services.find((s) => s.name === prefillClient.last_service);
      if (matched) {
        setSelectedServiceId(matched.id);
        setCycleDays(prefillClient.return_days || matched.cycleDays);
        setPrice(String(prefillClient.price || matched.defaultPrice));
      } else {
        setSelectedServiceId('__custom__');
        setCustomServiceName(prefillClient.last_service || '');
        setCycleDays(prefillClient.return_days || 21);
        setPrice(String(prefillClient.price || 0));
      }
    }
  }, [prefillClient, services]);

  const matchingClients = useMemo(() => {
    if (prefillClient) return [];
    const qName = clientName.trim().toLowerCase();
    const qDigits = extractRussianPhoneDigits(phone);
    if (!qName && qDigits.length < 4) return [];

    return clients
      .filter((c) => {
        const matchName = qName && c.name.toLowerCase().includes(qName);
        const cDigits = extractRussianPhoneDigits(c.phone);
        const matchPhone = qDigits.length >= 4 && cDigits.includes(qDigits);
        return matchName || matchPhone;
      })
      .slice(0, 3);
  }, [clientName, phone, clients, prefillClient]);

  const handleSelectService = (svc: ServiceItem) => {
    setSelectedServiceId(svc.id);
    setCycleDays(svc.cycleDays);
    setPrice(String(svc.defaultPrice));
    setErrorMsg('');
  };

  const handlePickExistingClient = (c: BeautyClientRow) => {
    setSelectedExistingId(c.id);
    setClientName(c.name);
    setPhone(c.phone);
    if (c.formula_note && !formulaNote.trim()) {
      setFormulaNote(c.formula_note);
    }
    setErrorMsg('');
  };

  const handlePhoneChange = (val: string) => {
    setSelectedExistingId(undefined);
    if (!val || val === '+') {
      setPhone('+7');
      return;
    }
    setPhone(formatPhoneInput(val));
    setErrorMsg('');
  };

  const resolvedServiceName =
    selectedServiceId === '__custom__'
      ? customServiceName.trim()
      : services.find((s) => s.id === selectedServiceId)?.name ||
        services[0]?.name ||
        '';

  const nextReturnIso = addDaysISO(visitDate || todayIso, Math.max(1, cycleDays));
  const atFreeLimit = !isPro && clients.length >= FREE_CLIENTS_LIMIT;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = clientName.trim();
    const phoneDigits = extractRussianPhoneDigits(phone);
    const numericPrice = Number(price.replace(/\D/g, '')) || 0;

    if (!cleanName) {
      setErrorMsg('Введите имя клиента');
      return;
    }
    if (phoneDigits.length < 11) {
      setErrorMsg('Введите полный номер телефона (+7 ...)');
      return;
    }
    if (!resolvedServiceName) {
      setErrorMsg('Выберите или введите услугу');
      return;
    }

    const matchedExisting =
      clients.find((c) => c.id === selectedExistingId) ||
      clients.find(
        (c) =>
          extractRussianPhoneDigits(c.phone) === phoneDigits ||
          c.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

    if (!matchedExisting && atFreeLimit) {
      onOpenUpgrade();
      return;
    }

    onSaveVisit({
      existingClientId: matchedExisting?.id,
      clientName: cleanName,
      phone: formatPhoneInput(phoneDigits),
      serviceName: resolvedServiceName,
      price: numericPrice,
      cycleDays: Math.max(1, cycleDays),
      formulaNote: formulaNote.trim(),
      visitDate: visitDate || todayIso,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-6">
      {!isPro && (
        <div className="bg-[#252932] border border-[#323846] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-[#9CA3AF]">
            База на тарифе БАЗОВЫЙ:{' '}
            <strong
              className={`font-mono tabular-nums ${
                atFreeLimit ? 'text-[#FBBF24]' : 'text-[#F3F4F6]'
              }`}
            >
              {clients.length} / {FREE_CLIENTS_LIMIT}
            </strong>
          </div>
          {atFreeLimit && (
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10B981] hover:text-[#34D399]"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Открыть PRO (безлимит)</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left Column */}
        <div className="space-y-5">
          <div className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#F3F4F6]">Данные клиента</h2>
              <span className="text-xs font-medium text-[#9CA3AF]">
                Шаг 1 из 2
              </span>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="visit-client-name"
                className="block text-xs font-semibold text-[#F3F4F6]"
              >
                Имя клиента
              </label>
              <input
                id="visit-client-name"
                type="text"
                value={clientName}
                onChange={(e) => {
                  setSelectedExistingId(undefined);
                  setClientName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Например: Анна Смирнова"
                className="w-full h-12 px-3.5 rounded-xl bg-[#1C1F26] border border-[#323846] text-sm font-medium text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="visit-client-phone"
                className="block text-xs font-semibold text-[#F3F4F6]"
              >
                Телефон (для Telegram / WhatsApp / SMS)
              </label>
              <input
                id="visit-client-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="w-full h-12 px-3.5 rounded-xl bg-[#1C1F26] border border-[#323846] font-mono text-sm font-medium text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981] transition-colors tabular-nums"
              />
            </div>

            {matchingClients.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[11px] font-medium text-[#9CA3AF]">
                  Найдены в базе — нажмите для автозаполнения:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {matchingClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handlePickExistingClient(c)}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl bg-[#10B981]/15 text-[#34D399] text-xs font-semibold hover:bg-[#10B981]/25 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Service Selection */}
          <div className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#F3F4F6]">
                Услуга ({spec.title.toLowerCase()})
              </span>
              <span className="text-xs font-semibold text-[#34D399] tabular-nums shrink-0">
                Через {pluralizeDays(cycleDays)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {services.map((svc) => {
                const active = selectedServiceId === svc.id;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleSelectService(svc)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors active:scale-[0.98] flex items-center gap-2 ${
                      active
                        ? 'bg-[#0B0C0E] border-[#10B981] text-[#FFFFFF]'
                        : 'bg-[#1C1F26] border-[#323846] text-[#F3F4F6] hover:border-[#4B5563]'
                    }`}
                  >
                    <span>{svc.name}</span>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        active ? 'text-[#34D399]' : 'text-[#9CA3AF]'
                      }`}
                    >
                      {svc.cycleDays} дн.
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedServiceId('__custom__')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  selectedServiceId === '__custom__'
                    ? 'bg-[#0B0C0E] border-[#10B981] text-[#FFFFFF]'
                    : 'bg-[#1C1F26] border-[#323846] text-[#9CA3AF] hover:text-[#F3F4F6]'
                }`}
              >
                Своя услуга
              </button>
            </div>

            {selectedServiceId === '__custom__' && (
              <input
                type="text"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                placeholder="Название услуги"
                className="w-full h-11 px-3.5 rounded-xl bg-[#1C1F26] border border-[#323846] text-sm font-medium text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981]"
              />
            )}

            <div className="pt-3 flex items-center justify-between gap-2 border-t border-[#323846]">
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-semibold text-[#F3F4F6]">
                  Цикл возврата
                </div>
                <div className="text-[11px] text-[#9CA3AF] tabular-nums">
                  Напомнить: {formatRussianDate(nextReturnIso)}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  aria-label="Уменьшить цикл на 1 день"
                  onClick={() => setCycleDays((d) => Math.max(1, d - 1))}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#1C1F26] hover:bg-[#2E3440] border border-[#323846] text-[#F3F4F6] flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="min-w-[78px] text-center font-mono text-xs font-semibold text-[#F3F4F6] tabular-nums">
                  {pluralizeDays(cycleDays)}
                </div>
                <button
                  type="button"
                  aria-label="Увеличить цикл на 1 день"
                  onClick={() => setCycleDays((d) => Math.min(180, d + 1))}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#1C1F26] hover:bg-[#2E3440] border border-[#323846] text-[#F3F4F6] flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          <div className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#F3F4F6]">Детали визита</h2>
              <span className="text-xs font-medium text-[#9CA3AF]">
                Шаг 2 из 2
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="visit-price"
                  className="block text-xs font-semibold text-[#F3F4F6]"
                >
                  Стоимость (₽)
                </label>
                <input
                  id="visit-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={50}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2500"
                  className="w-full h-12 px-3.5 rounded-xl bg-[#1C1F26] border border-[#323846] font-mono text-base font-bold text-[#F3F4F6] focus:outline-none focus:border-[#10B981] tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="visit-date"
                  className="block text-xs font-semibold text-[#F3F4F6]"
                >
                  Дата визита
                </label>
                <input
                  id="visit-date"
                  type="date"
                  value={visitDate}
                  max={todayIso}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-[#1C1F26] border border-[#323846] text-xs font-semibold text-[#F3F4F6] focus:outline-none focus:border-[#10B981] tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
              <button
                type="button"
                onClick={() => setVisitDate(todayIso)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  visitDate === todayIso
                    ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                    : 'bg-[#1C1F26] border border-[#323846] text-[#9CA3AF] hover:text-[#F3F4F6]'
                }`}
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => setVisitDate(yesterdayIso)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  visitDate === yesterdayIso
                    ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                    : 'bg-[#1C1F26] border border-[#323846] text-[#9CA3AF] hover:text-[#F3F4F6]'
                }`}
              >
                Вчера
              </button>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="visit-formula"
                className="block text-xs font-semibold text-[#F3F4F6]"
              >
                Формула / Заметка мастера (необязательно)
              </label>
              <textarea
                id="visit-formula"
                rows={3}
                value={formulaNote}
                onChange={(e) => setFormulaNote(e.target.value)}
                placeholder={spec.notePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1F26] border border-[#323846] text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981] resize-none"
              />
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="px-4 py-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs font-semibold text-[#FCA5A5]"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[52px] px-4 rounded-xl bg-[#10B981] hover:bg-[#34D399] disabled:opacity-60 text-[#06281E] text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]"
            >
              <Check className="w-4 h-4" strokeWidth={2.75} />
              <span>
                {saving
                  ? 'Сохраняем в базу...'
                  : `Сохранить визит${
                      price ? ` · ${formatCurrency(Number(price) || 0)}` : ''
                    }`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
