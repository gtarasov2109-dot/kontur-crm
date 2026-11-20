import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  NotebookPen,
  Check,
  Phone,
  Pencil,
  Calendar,
} from 'lucide-react';
import { BeautyClientRow } from '../types/crm';
import {
  formatCurrency,
  formatPhoneInput,
  formatRussianDate,
  getClientRetentionStatus,
  getTodayISO,
} from '../utils/formatters';
import { OutreachActions } from './OutreachActions';

interface ClientDetailSheetProps {
  client: BeautyClientRow;
  studioName: string;
  messageTemplate: string;
  onClose: () => void;
  onUpdateClient: (
    clientId: string,
    patch: Partial<
      Pick<
        BeautyClientRow,
        | 'name'
        | 'phone'
        | 'last_service'
        | 'price'
        | 'return_days'
        | 'formula_note'
        | 'next_visit_date'
      >
    >
  ) => Promise<void>;
  onAddVisitForClient: (client: BeautyClientRow) => void;
  onMarkReturned: (clientId: string) => void;
  onContacted: (clientId: string, channel: 'telegram' | 'whatsapp' | 'sms') => void;
  onDeleteClient: (clientId: string) => void;
  onShowToast: (message: string) => void;
}

export const ClientDetailSheet: React.FC<ClientDetailSheetProps> = ({
  client,
  studioName,
  messageTemplate,
  onClose,
  onUpdateClient,
  onAddVisitForClient,
  onMarkReturned,
  onContacted,
  onDeleteClient,
  onShowToast,
}) => {
  const todayIso = getTodayISO();
  const status = getClientRetentionStatus(client, todayIso);

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(client.name);
  const [phoneDraft, setPhoneDraft] = useState(client.phone);
  const [serviceDraft, setServiceDraft] = useState(client.last_service);
  const [priceDraft, setPriceDraft] = useState(String(client.price || 0));
  const [daysDraft, setDaysDraft] = useState(String(client.return_days || 21));
  const [nextDateDraft, setNextDateDraft] = useState(client.next_visit_date);
  const [noteDraft, setNoteDraft] = useState(client.formula_note || '');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    setSavingEdit(true);
    try {
      await onUpdateClient(client.id, {
        name: nameDraft.trim(),
        phone: formatPhoneInput(phoneDraft) || client.phone,
        last_service: serviceDraft.trim() || client.last_service,
        price: Math.max(0, Number(priceDraft) || 0),
        return_days: Math.max(1, Number(daysDraft) || 21),
        next_visit_date: nextDateDraft || client.next_visit_date,
        formula_note: noteDraft.trim() || null,
      });
      setEditing(false);
      onShowToast('Карточка клиента обновлена');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/65 backdrop-blur-[2px] md:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Карточка клиента ${client.name}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-xl max-h-[90vh] bg-[#252932] rounded-t-3xl md:rounded-2xl border border-[#323846] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="pt-3 pb-1 flex justify-center shrink-0 md:hidden">
          <div className="w-10 h-1.5 rounded-full bg-[#4B5563]" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#323846] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#F3F4F6] truncate">
              {client.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#9CA3AF]">
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span className="font-mono tabular-nums text-[#D1D5DB]">
                  {client.phone}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={`font-semibold ${
                  status.kind === 'overdue'
                    ? 'text-[#FCA5A5]'
                    : status.kind === 'due_today'
                    ? 'text-[#FBBF24]'
                    : 'text-[#34D399]'
                }`}
              >
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              aria-label="Редактировать клиента"
              className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                editing
                  ? 'bg-[#0B0C0E] border-[#10B981] text-[#FFFFFF]'
                  : 'bg-[#1C1F26] hover:bg-[#2E3440] border-[#323846] text-[#D1D5DB]'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Редактировать</span>
            </button>
            <button
              type="button"
              aria-label="Закрыть карточку"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-[#1C1F26] hover:bg-[#2E3440] border border-[#323846] text-[#9CA3AF] hover:text-[#F3F4F6] flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {editing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#9CA3AF]">
                    Имя клиента
                  </label>
                  <input
                    type="text"
                    required
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#1C1F26] border border-[#323846] text-xs font-medium text-[#F3F4F6] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#9CA3AF]">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(formatPhoneInput(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl bg-[#1C1F26] border border-[#323846] font-mono text-xs text-[#F3F4F6] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1 space-y-1">
                  <label className="text-[11px] font-semibold text-[#9CA3AF]">
                    Услуга
                  </label>
                  <input
                    type="text"
                    value={serviceDraft}
                    onChange={(e) => setServiceDraft(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#1C1F26] border border-[#323846] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#9CA3AF]">
                    Цена (₽)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#1C1F26] border border-[#323846] font-mono text-xs text-[#F3F4F6] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#9CA3AF]">
                    Цикл (дней)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={daysDraft}
                    onChange={(e) => setDaysDraft(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#1C1F26] border border-[#323846] font-mono text-xs text-[#F3F4F6] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#9CA3AF]">
                  Следующий визит
                </label>
                <input
                  type="date"
                  value={nextDateDraft}
                  onChange={(e) => setNextDateDraft(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#1C1F26] border border-[#323846] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#9CA3AF]">
                  Формула / Заметка мастера
                </label>
                <textarea
                  rows={2}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Запишите формулу, насадку или предпочтения..."
                  className="w-full px-3 py-2 rounded-xl bg-[#1C1F26] border border-[#323846] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#10B981] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#1C1F26] border border-[#323846] text-xs font-semibold text-[#9CA3AF]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#06281E] text-xs font-bold"
                >
                  {savingEdit ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* LTV & Last Visit Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1C1F26] border border-[#323846] rounded-xl p-3.5">
                  <div className="text-[11px] font-semibold text-[#9CA3AF] uppercase">
                    Всего принёс (LTV)
                  </div>
                  <div className="mt-1 text-xl font-bold text-[#34D399] tabular-nums">
                    {formatCurrency(client.total_spent)}
                  </div>
                </div>
                <div className="bg-[#1C1F26] border border-[#323846] rounded-xl p-3.5">
                  <div className="text-[11px] font-semibold text-[#9CA3AF] uppercase">
                    Последний чек
                  </div>
                  <div className="mt-1 text-xl font-bold text-[#F3F4F6] tabular-nums">
                    {formatCurrency(client.price)}
                  </div>
                </div>
              </div>

              {/* Service & Dates */}
              <div className="bg-[#1C1F26] border border-[#323846] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#9CA3AF]">Последняя услуга</span>
                  <span className="font-semibold text-[#F3F4F6]">
                    {client.last_service}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#9CA3AF] inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Был(а) последний раз</span>
                  </span>
                  <span className="font-mono text-[#D1D5DB] tabular-nums">
                    {formatRussianDate(client.last_visit_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#9CA3AF]">План возврата ({client.return_days} дн.)</span>
                  <span className="font-mono text-[#F3F4F6] tabular-nums">
                    {formatRussianDate(client.next_visit_date)}
                  </span>
                </div>
              </div>

              {/* Master Formula / Note */}
              <div className="bg-[#1C1F26] border border-[#323846] rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F3F4F6]">
                  <NotebookPen className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span>Формула / Заметка мастера</span>
                </div>
                <p className="text-xs text-[#D1D5DB] leading-relaxed">
                  {client.formula_note || 'Заметка ещё не добавлена — нажмите «Редактировать»'}
                </p>
              </div>

              {/* Outreach */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#F3F4F6]">
                  Быстрая связь с клиентом
                </div>
                <OutreachActions
                  client={client}
                  studioName={studioName}
                  messageTemplate={messageTemplate}
                  onContacted={onContacted}
                  onShowToast={onShowToast}
                />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(status.kind === 'overdue' || status.kind === 'due_today') && (
                  <button
                    type="button"
                    onClick={() => {
                      onMarkReturned(client.id);
                      onClose();
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#06281E] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Check className="w-4 h-4" strokeWidth={2.75} />
                    <span>✓ ЗАПИСАН СЕГОДНЯ</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onAddVisitForClient(client)}
                  className={`min-h-[44px] px-3 rounded-xl bg-[#0B0C0E] hover:bg-[#15181E] border border-[#323846] text-[#FFFFFF] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    status.kind !== 'overdue' && status.kind !== 'due_today'
                      ? 'sm:col-span-2'
                      : ''
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Записать новый визит</span>
                </button>
              </div>

              {/* Delete Client */}
              <div className="pt-1">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="w-full min-h-[44px] rounded-xl text-xs font-semibold text-[#FCA5A5] hover:bg-[#EF4444]/15 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Удалить клиента из базы</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 min-h-[44px] rounded-xl bg-[#1C1F26] border border-[#323846] text-xs font-semibold text-[#F3F4F6]"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteClient(client.id);
                        onClose();
                      }}
                      className="flex-1 min-h-[44px] rounded-xl bg-[#DC2626] text-white text-xs font-bold"
                    >
                      Точно удалить
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
