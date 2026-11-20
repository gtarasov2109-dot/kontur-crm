import React, { useMemo, useState } from 'react';
import {
  Search,
  ChevronRight,
  X,
  NotebookPen,
  Users,
  Plus,
} from 'lucide-react';
import { BeautyClientRow, RetentionStateKind } from '../types/crm';
import {
  extractRussianPhoneDigits,
  formatCurrency,
  getClientRetentionStatus,
  getTodayISO,
} from '../utils/formatters';

interface ClientsDirectoryProps {
  clients: BeautyClientRow[];
  onSelectClient: (client: BeautyClientRow) => void;
  onGoToAddVisit: () => void;
}

type DirectoryFilter = 'all' | 'due' | 'upcoming' | 'returned';

export const ClientsDirectory: React.FC<ClientsDirectoryProps> = ({
  clients,
  onSelectClient,
  onGoToAddVisit,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DirectoryFilter>('all');
  const todayIso = getTodayISO();

  const totalBaseLtv = useMemo(
    () => clients.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0),
    [clients]
  );

  const enrichedClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = extractRussianPhoneDigits(query);

    return clients
      .map((c) => ({
        client: c,
        status: getClientRetentionStatus(c, todayIso),
        ltv: Number(c.total_spent) || 0,
      }))
      .filter(({ status }) => {
        if (filter === 'due') {
          return status.kind === 'overdue' || status.kind === 'due_today';
        }
        if (filter === 'upcoming') {
          return status.kind === 'upcoming';
        }
        if (filter === 'returned') {
          return status.kind === 'returned';
        }
        return true;
      })
      .filter(({ client }) => {
        if (!q) return true;
        const nameMatch = client.name.toLowerCase().includes(q);
        const phoneTextMatch = client.phone.toLowerCase().includes(q);
        const rawDigits = client.phone.replace(/\D/g, '');
        const digitMatch =
          qDigits.length >= 2 &&
          (rawDigits.includes(qDigits) ||
            rawDigits.includes(query.replace(/\D/g, '')));
        return nameMatch || phoneTextMatch || digitMatch;
      })
      .sort((a, b) => b.status.daysDelta - a.status.daysDelta);
  }, [clients, query, filter, todayIso]);

  const statusTextClass = (kind: RetentionStateKind) => {
    if (kind === 'overdue') return 'text-[#FCA5A5] bg-[#EF4444]/15';
    if (kind === 'due_today') return 'text-[#FBBF24] bg-[#F59E0B]/15';
    if (kind === 'upcoming') return 'text-[#D1D5DB] bg-[#1C1F26]';
    return 'text-[#34D399] bg-[#10B981]/15';
  };

  if (clients.length === 0) {
    return (
      <div className="bg-[#252932] border border-[#323846] rounded-2xl p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <div className="font-mono text-xs sm:text-sm font-bold tracking-wide text-[#F3F4F6]">
            [ КЛИЕНТОВ ПОКА НЕТ // НАЖМИТЕ &quot;+ ВИЗИТ&quot; ]
          </div>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Здесь будет храниться вся клиентская база, история визитов, LTV и заметки по формулам.
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
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Search + Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или телефону..."
            aria-label="Поиск по имени или телефону"
            className="w-full h-12 pl-10 pr-10 rounded-xl bg-[#252932] border border-[#323846] text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981] transition-colors"
          />
          {query && (
            <button
              type="button"
              aria-label="Очистить поиск"
              onClick={() => setQuery('')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F3F4F6] absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#252932] border border-[#323846] rounded-xl shrink-0">
          {(
            [
              { id: 'all', label: 'Все' },
              { id: 'due', label: 'К возврату' },
              { id: 'upcoming', label: 'Скоро' },
              { id: 'returned', label: 'Вернулись' },
            ] as Array<{ id: DirectoryFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex-1 md:flex-initial min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary line */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#9CA3AF]">
        <span className="tabular-nums">
          Найдено: <strong className="text-[#F3F4F6]">{enrichedClients.length}</strong>
        </span>
        <span className="tabular-nums">
          Общий LTV базы:{' '}
          <strong className="text-[#F3F4F6]">{formatCurrency(totalBaseLtv)}</strong>
        </span>
      </div>

      {/* Client Cards Grid */}
      {enrichedClients.length === 0 ? (
        <div className="bg-[#252932] border border-[#323846] rounded-2xl p-8 text-center space-y-2.5">
          <div className="w-11 h-11 rounded-xl bg-[#1C1F26] text-[#9CA3AF] flex items-center justify-center mx-auto">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#F3F4F6]">
            Клиенты не найдены
          </p>
          <p className="text-xs text-[#9CA3AF]">
            Попробуйте изменить запрос или фильтр списка.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {enrichedClients.map(({ client, status, ltv }) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelectClient(client)}
              className="w-full text-left bg-[#252932] border border-[#323846] hover:border-[#4B5563] rounded-2xl p-4 flex flex-col justify-between gap-3 transition-colors active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#10B981] min-w-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[#F3F4F6] truncate">
                    {client.name}
                  </span>
                  <div className="mt-0.5 font-mono text-xs text-[#9CA3AF] tabular-nums">
                    {client.phone}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${statusTextClass(
                      status.kind
                    )}`}
                  >
                    {status.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                </div>
              </div>

              <div className="space-y-2">
                {client.formula_note && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] bg-[#1C1F26] border border-[#323846] rounded-lg px-2.5 py-1.5">
                    <NotebookPen className="w-3 h-3 text-[#6B7280] shrink-0" />
                    <span className="truncate text-[#D1D5DB]">
                      {client.formula_note}
                    </span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-[#323846] flex items-center justify-between gap-2 text-xs">
                  <div className="text-[#9CA3AF] truncate">
                    {client.last_service || 'Услуга'} ·{' '}
                    <span className="tabular-nums">{client.return_days} дн.</span>
                  </div>
                  <div className="font-mono font-bold text-[#34D399] tabular-nums shrink-0">
                    LTV {formatCurrency(ltv)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
