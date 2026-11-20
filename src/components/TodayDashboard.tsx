import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  AlertCircle,
  CalendarClock,
  TrendingUp,
  Plus,
  NotebookPen,
  CheckCheck,
  Gift,
  Users,
} from 'lucide-react';
import { BeautyClientRow } from '../types/crm';
import { PROMO_TEMPLATES } from '../data/specializations';
import {
  formatCurrency,
  getClientRetentionStatus,
  getExpectedMonthlyReturnRevenue,
  getTodayISO,
  pluralizeDays,
} from '../utils/formatters';
import { OutreachActions } from './OutreachActions';

interface TodayDashboardProps {
  clients: BeautyClientRow[];
  studioName: string;
  messageTemplate: string;
  monthlyReturned: number;
  contactedTodayMap: Record<string, string>;
  onMarkReturned: (clientId: string) => void;
  onContacted: (clientId: string, channel: 'telegram' | 'whatsapp' | 'sms') => void;
  onOpenClientDetail: (client: BeautyClientRow) => void;
  onGoToAddVisit: () => void;
  onShowToast: (message: string) => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  clients,
  studioName,
  messageTemplate,
  monthlyReturned,
  contactedTodayMap,
  onMarkReturned,
  onContacted,
  onOpenClientDetail,
  onGoToAddVisit,
  onShowToast,
}) => {
  const [segment, setSegment] = useState<'due' | 'upcoming' | 'promo'>('due');
  const [selectedPromoId, setSelectedPromoId] = useState<string>(
    PROMO_TEMPLATES[0].id
  );
  const todayIso = getTodayISO();

  const {
    dueClients,
    upcomingClients,
    promoClients,
    potentialToday,
    expectedMonthly,
  } = useMemo(() => {
    const withStatus = clients.map((c) => ({
      client: c,
      status: getClientRetentionStatus(c, todayIso),
    }));

    const due = withStatus
      .filter((item) => item.status.kind === 'overdue' || item.status.kind === 'due_today')
      .sort((a, b) => b.status.daysDelta - a.status.daysDelta);

    const upcoming = withStatus
      .filter((item) => item.status.kind === 'upcoming')
      .sort((a, b) => b.status.daysDelta - a.status.daysDelta);

    const promo = [...withStatus].sort(
      (a, b) => (Number(b.client.total_spent) || 0) - (Number(a.client.total_spent) || 0)
    );

    const potential = due.reduce(
      (sum, item) => sum + (Number(item.client.price) || 0),
      0
    );

    const expectedMonth = getExpectedMonthlyReturnRevenue(clients, todayIso);

    return {
      dueClients: due,
      upcomingClients: upcoming,
      promoClients: promo,
      potentialToday: potential,
      expectedMonthly: expectedMonth,
    };
  }, [clients, todayIso]);

  const activeList =
    segment === 'due'
      ? dueClients
      : segment === 'upcoming'
      ? upcomingClients
      : promoClients;

  const activePromoTemplate =
    PROMO_TEMPLATES.find((p) => p.id === selectedPromoId)?.text ||
    PROMO_TEMPLATES[0].text;
  const effectiveTemplate =
    segment === 'promo' ? activePromoTemplate : messageTemplate;

  // Empty state for brand new studios
  if (clients.length === 0) {
    return (
      <div className="space-y-5 pb-6">
        {/* Monthly Forecast & Empty KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5">
            <span className="text-[11px] font-semibold tracking-wider text-[#9CA3AF] uppercase">
              К возврату сегодня
            </span>
            <div className="mt-2 text-2xl font-bold text-[#F3F4F6] tabular-nums">
              0 · {formatCurrency(0)}
            </div>
          </div>
          <div className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5">
            <span className="text-[11px] font-semibold tracking-wider text-[#9CA3AF] uppercase">
              Прогноз выручки за месяц
            </span>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-[#9CA3AF]">
              <span>
                Возвращено:{' '}
                <strong className="font-mono text-sm text-[#34D399] tabular-nums">
                  {formatCurrency(monthlyReturned)}
                </strong>
              </span>
              <span>
                Ожидается:{' '}
                <strong className="font-mono text-sm text-[#F3F4F6] tabular-nums">
                  {formatCurrency(0)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#252932] border border-[#323846] rounded-2xl p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="font-mono text-xs sm:text-sm font-bold tracking-wide text-[#F3F4F6]">
              [ КЛИЕНТОВ ПОКА НЕТ // НАЖМИТЕ &quot;+ ВИЗИТ&quot; ]
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Запишите первого клиента после процедуры — система сама рассчитает дату следующего визита и напомнит о возврате.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToAddVisit}
            className="inline-flex items-center justify-center gap-1.5 min-h-[46px] px-6 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#06281E] text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.75} />
            <span>+ ВИЗИТ</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Top KPI + Monthly Revenue Forecast Strip */}
      <section aria-label="Ключевые показатели возврата">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[#9CA3AF] uppercase">
              К возврату сегодня
            </span>
            <div className="mt-2.5 flex items-baseline gap-2.5">
              <span className="text-3xl font-bold text-[#F3F4F6] tabular-nums">
                {dueClients.length}
              </span>
              <span
                className={`text-xs font-semibold ${
                  dueClients.length > 0 ? 'text-[#FBBF24]' : 'text-[#34D399]'
                }`}
              >
                {dueClients.length > 0 ? 'ждут касания' : 'всё чисто'}
              </span>
            </div>
          </div>

          <div className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[#9CA3AF] uppercase">
              Потенц. выручка сегодня
            </span>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-[#F3F4F6] tabular-nums">
                {formatCurrency(potentialToday)}
              </span>
            </div>
          </div>

          {/* Monthly Revenue Forecast Card */}
          <div className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-[#9CA3AF] uppercase">
                Прогноз за месяц
              </span>
              <TrendingUp className="w-4 h-4 text-[#10B981] shrink-0" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-[#9CA3AF]">Возвращено за месяц</span>
                <span className="font-mono text-base font-bold text-[#34D399] tabular-nums">
                  {formatCurrency(monthlyReturned)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-[#323846]">
                <span className="text-xs text-[#9CA3AF]">Ожидается к возврату</span>
                <span className="font-mono text-base font-bold text-[#F3F4F6] tabular-nums">
                  {formatCurrency(expectedMonthly)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar (wraps cleanly on 375px mobile) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#252932] border border-[#323846] rounded-xl w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setSegment('due')}
            className={`flex-1 sm:flex-initial min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              segment === 'due'
                ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Пора и просрочка ({dueClients.length})
          </button>
          <button
            type="button"
            onClick={() => setSegment('upcoming')}
            className={`flex-1 sm:flex-initial min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              segment === 'upcoming'
                ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Скоро 1–5 дн. ({upcomingClients.length})
          </button>
          <button
            type="button"
            onClick={() => setSegment('promo')}
            className={`w-full sm:w-auto min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              segment === 'promo'
                ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <span>Поздравить / Спецпредложение</span>
          </button>
        </div>

        {/* 1-Click Promo Template Picker when Promo filter active */}
        {segment === 'promo' && (
          <div className="bg-[#252932] border border-[#323846] rounded-2xl p-3.5 space-y-2.5">
            <div className="text-xs font-semibold text-[#F3F4F6]">
              Выберите текст акции или поздравления (подставится в кнопки ниже):
            </div>
            <div className="flex flex-wrap gap-2">
              {PROMO_TEMPLATES.map((tpl) => {
                const active = selectedPromoId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedPromoId(tpl.id)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[#0B0C0E] border-[#10B981] text-[#FFFFFF]'
                        : 'bg-[#1C1F26] border-[#323846] text-[#9CA3AF] hover:text-[#F3F4F6]'
                    }`}
                  >
                    {tpl.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Responsive Client Return Cards */}
      {activeList.length === 0 ? (
        <div className="bg-[#252932] border border-[#323846] rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/15 text-[#34D399] flex items-center justify-center mx-auto">
            <CheckCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              {segment === 'due'
                ? 'На сегодня все клиенты отработаны'
                : 'Ближайших возвратов пока нет'}
            </h2>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              {segment === 'due'
                ? 'Вы написали или записали всех клиентов со сроком возврата. Добавьте новый визит после приёма.'
                : 'Клиенты со сроком возврата в ближайшие 5 дней появятся здесь автоматически.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToAddVisit}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#06281E] text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>+ ВИЗИТ</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeList.map(({ client, status }) => {
            const isOverdue = status.kind === 'overdue';
            const isDueToday = status.kind === 'due_today';
            const contactedToday = contactedTodayMap[client.id] === todayIso;

            return (
              <article
                key={client.id}
                className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0"
              >
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenClientDetail(client)}
                      className="text-left group min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-[#10B981] rounded-lg"
                    >
                      <h3 className="text-base font-bold text-[#F3F4F6] group-hover:text-[#34D399] transition-colors truncate">
                        {client.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#9CA3AF]">
                        <span className="font-medium text-[#F3F4F6]">
                          {client.last_service || 'Услуга'}
                        </span>
                        <span aria-hidden="true" className="text-[#4B5563]">
                          ·
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-[#F3F4F6]">
                          {formatCurrency(client.price)}
                        </span>
                        <span aria-hidden="true" className="text-[#4B5563]">
                          ·
                        </span>
                        <span className="tabular-nums text-[#9CA3AF]">
                          Прошло {pluralizeDays(status.daysSinceLastVisit)}
                        </span>
                      </div>
                    </button>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                          isOverdue
                            ? 'bg-[#EF4444]/15 text-[#FCA5A5]'
                            : isDueToday
                            ? 'bg-[#F59E0B]/15 text-[#FBBF24]'
                            : 'bg-[#1C1F26] text-[#9CA3AF]'
                        }`}
                      >
                        {isOverdue ? (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        ) : isDueToday ? (
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{status.label}</span>
                      </span>
                      {contactedToday && (
                        <span className="text-[11px] font-medium text-[#34D399]">
                          Написали сегодня
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Master Formula / Note */}
                  {client.formula_note && (
                    <div className="bg-[#1C1F26] border border-[#323846] rounded-xl px-3 py-2.5 flex items-start gap-2">
                      <NotebookPen className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#D1D5DB] leading-snug break-words">
                        <span className="font-semibold text-[#F3F4F6]">Формула: </span>
                        {client.formula_note}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-1">
                  <OutreachActions
                    client={client}
                    studioName={studioName}
                    messageTemplate={effectiveTemplate}
                    onContacted={onContacted}
                    onShowToast={onShowToast}
                  />

                  <button
                    type="button"
                    onClick={() => onMarkReturned(client.id)}
                    className="w-full min-h-[44px] px-4 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#06281E] text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]"
                  >
                    <Check className="w-4 h-4" strokeWidth={2.75} />
                    <span>✓ ЗАПИСАН · +{formatCurrency(client.price)}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
