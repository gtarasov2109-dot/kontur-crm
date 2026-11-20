import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Check, Crown, RefreshCw } from 'lucide-react';
import {
  BeautyClientRow,
  BeautyMasterRow,
  ServiceItem,
  SpecializationId,
} from '../types/crm';
import { SpecializationCards } from './SpecializationCards';
import { FREE_CLIENTS_LIMIT } from '../data/specializations';
import {
  buildOutreachMessage,
  formatCurrency,
  formatISODate,
  pluralizeDays,
} from '../utils/formatters';
import {
  apiBackgroundSync,
  getLastSyncStatus,
  subscribeSyncStatus,
  SyncStatusInfo,
} from '../lib/api';

interface SettingsViewProps {
  master: BeautyMasterRow;
  clientsCount: number;
  services: ServiceItem[];
  messageTemplate: string;
  onUpdateStudioName: (name: string) => void;
  onChangeSpecialization: (specId: SpecializationId) => void;
  onAddService: (service: Omit<ServiceItem, 'id'>) => void;
  onRemoveService: (serviceId: string) => void;
  onUpdateMessageTemplate: (template: string) => void;
  onOpenUpgrade: () => void;
  onShowToast: (message: string) => void;
  onSyncComplete?: (synced: {
    master: BeautyMasterRow;
    clients: BeautyClientRow[];
  }) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  master,
  clientsCount,
  services,
  messageTemplate,
  onUpdateStudioName,
  onChangeSpecialization,
  onAddService,
  onRemoveService,
  onUpdateMessageTemplate,
  onOpenUpgrade,
  onShowToast,
  onSyncComplete,
}) => {
  const [studioDraft, setStudioDraft] = useState(master.studio_name);
  const [templateDraft, setTemplateDraft] = useState(messageTemplate);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo | null>(() =>
    getLastSyncStatus()
  );
  const [syncingNow, setSyncingNow] = useState(false);

  const [showAddService, setShowAddService] = useState(false);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcDays, setNewSvcDays] = useState('21');
  const [newSvcPrice, setNewSvcPrice] = useState('2500');

  useEffect(() => {
    setSyncStatus(getLastSyncStatus());
    return subscribeSyncStatus((next) => {
      setSyncStatus(next);
    });
  }, [master.email]);

  const handleManualSync = async () => {
    if (syncingNow) return;
    setSyncingNow(true);
    try {
      const synced = await apiBackgroundSync();
      if (synced && onSyncComplete) {
        onSyncComplete(synced);
      }
    } finally {
      setSyncStatus(getLastSyncStatus());
      setSyncingNow(false);
    }
  };

  const handleSaveStudioName = () => {
    const clean = studioDraft.trim() || 'Моя студия';
    setStudioDraft(clean);
    onUpdateStudioName(clean);
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSvcName.trim();
    const days = Math.max(1, Math.min(365, Number(newSvcDays) || 21));
    const price = Math.max(0, Number(newSvcPrice) || 0);
    if (!cleanName) return;

    onAddService({
      name: cleanName,
      cycleDays: days,
      defaultPrice: price,
      isCustom: true,
    });

    setNewSvcName('');
    setNewSvcDays('21');
    setNewSvcPrice('2500');
    setShowAddService(false);
    onShowToast(`Услуга «${cleanName}» добавлена`);
  };

  const handleSaveTemplate = () => {
    const clean = templateDraft.trim();
    if (!clean) return;
    onUpdateMessageTemplate(clean);
    onShowToast('Шаблон напоминания сохранён');
  };

  const previewDate = new Date();
  previewDate.setDate(previewDate.getDate() - 21);
  const previewLastVisit = formatISODate(previewDate);

  const previewText = buildOutreachMessage(
    templateDraft,
    {
      name: 'Мария',
      last_service: services[0]?.name || 'Маникюр с покрытием',
      last_visit_date: previewLastVisit,
    },
    studioDraft
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-8 items-start">
      {/* Left Column: Subscription, Studio Profile & Specialization */}
      <div className="space-y-5">
        <section className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-mono text-xs font-bold text-[#F3F4F6]">
                {master.is_pro ? '[ PRO ] Подписка активна' : '[ БАЗОВЫЙ ] Бесплатный тариф'}
              </div>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                {master.is_pro
                  ? `В базе ${clientsCount} клиентов · Безлимит`
                  : `Использовано ${clientsCount} из ${FREE_CLIENTS_LIMIT} бесплатных клиентов`}
              </p>
            </div>
            {!master.is_pro && (
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="min-h-[40px] px-3.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#06281E] text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>PRO</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="text-[11px] text-[#9CA3AF] truncate min-w-0">
              Аккаунт: <span className="font-mono text-[#D1D5DB]">{master.email}</span>
            </div>

            <div className="flex items-center gap-1.5 max-w-full">
              <span
                title={
                  syncStatus
                    ? `${syncStatus.endpoint} · ${syncStatus.message}`
                    : 'Статус последней синхронизации с Supabase'
                }
                className={`inline-flex items-center px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold break-all ${
                  !syncStatus
                    ? 'bg-[#1C1F26] border-[#323846] text-[#9CA3AF]'
                    : syncStatus.ok
                    ? 'bg-[#10B981]/15 border-[#10B981]/35 text-[#34D399]'
                    : 'bg-[#EF4444]/15 border-[#EF4444]/35 text-[#FCA5A5]'
                }`}
              >
                {!syncStatus
                  ? 'SYNC PENDING'
                  : syncStatus.ok
                  ? 'SYNC OK'
                  : `${syncStatus.endpoint.replace('/rest/v1/', '')}: ${syncStatus.message}`}
              </span>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncingNow}
                aria-label="Проверить синхронизацию с Supabase"
                title="Повторить синхронизацию"
                className="w-6 h-6 rounded-md bg-[#1C1F26] hover:bg-[#2E3440] border border-[#323846] text-[#9CA3AF] hover:text-[#F3F4F6] flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${syncingNow ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#F3F4F6]">
            Профиль мастера / студии
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={studioDraft}
              onChange={(e) => setStudioDraft(e.target.value)}
              placeholder="Название студии или имя мастера"
              className="flex-1 h-11 px-3.5 rounded-xl bg-[#1C1F26] border border-[#323846] text-sm font-medium text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981]"
            />
            <button
              type="button"
              onClick={handleSaveStudioName}
              className="min-h-[44px] px-4 rounded-xl bg-[#0B0C0E] hover:bg-[#15181E] border border-[#323846] text-[#FFFFFF] text-xs font-semibold shrink-0 transition-colors"
            >
              Сохранить
            </button>
          </div>
        </section>

        <section className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-[#F3F4F6]">Специализация</h2>
            <p className="text-xs text-[#9CA3AF]">
              При смене профиля подгрузятся базовые услуги и интервалы возврата
            </p>
          </div>
          <SpecializationCards
            selectedId={master.specialization}
            onSelect={onChangeSpecialization}
          />
        </section>
      </div>

      {/* Right Column: Custom Services & Editable Reminder Template */}
      <div className="space-y-5">
        <section className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#F3F4F6]">
                Услуги и циклы возврата
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Используются в форме «+ Визит»
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddService((v) => !v)}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#06281E] text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Добавить</span>
            </button>
          </div>

          {showAddService && (
            <form
              onSubmit={handleCreateService}
              className="p-3.5 rounded-xl bg-[#1C1F26] border border-[#323846] space-y-3"
            >
              <input
                type="text"
                value={newSvcName}
                onChange={(e) => setNewSvcName(e.target.value)}
                placeholder="Название услуги (напр. Ботокс волос)"
                className="w-full h-11 px-3 rounded-xl bg-[#252932] border border-[#323846] text-xs font-medium text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981]"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#9CA3AF] mb-1">
                    Возврат (дней)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={newSvcDays}
                    onChange={(e) => setNewSvcDays(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#252932] border border-[#323846] font-mono text-xs font-semibold text-[#F3F4F6] tabular-nums focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#9CA3AF] mb-1">
                    Цена (₽)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={newSvcPrice}
                    onChange={(e) => setNewSvcPrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#252932] border border-[#323846] font-mono text-xs font-semibold text-[#F3F4F6] tabular-nums focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddService(false)}
                  className="min-h-[38px] px-3 rounded-lg text-xs font-medium text-[#9CA3AF]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-3.5 rounded-lg bg-[#10B981] text-[#06281E] text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Добавить услугу</span>
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-[#323846]">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="py-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#F3F4F6] truncate">
                    {svc.name}
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] tabular-nums mt-0.5">
                    Каждые {pluralizeDays(svc.cycleDays)} ·{' '}
                    <span className="font-mono text-[#D1D5DB]">
                      {formatCurrency(svc.defaultPrice)}
                    </span>
                  </div>
                </div>
                {services.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Удалить услугу ${svc.name}`}
                    onClick={() => onRemoveService(svc.id)}
                    className="w-10 h-10 rounded-xl text-[#9CA3AF] hover:text-[#FCA5A5] hover:bg-[#EF4444]/15 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#252932] border border-[#323846] rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div>
            <h2 className="text-sm font-bold text-[#F3F4F6]">
              Редактируемый шаблон напоминания
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
              Подставляется в кнопки Telegram, WhatsApp и SMS. Теги:{' '}
              <code className="font-mono text-[#34D399]">{'{имя}'}</code>,{' '}
              <code className="font-mono text-[#34D399]">{'{дней}'}</code>,{' '}
              <code className="font-mono text-[#34D399]">{'{услуга}'}</code>,{' '}
              <code className="font-mono text-[#34D399]">{'{студия}'}</code>
            </p>
          </div>

          <textarea
            rows={3}
            value={templateDraft}
            onChange={(e) => setTemplateDraft(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1F26] border border-[#323846] text-xs text-[#F3F4F6] leading-relaxed focus:outline-none focus:border-[#10B981] resize-none"
          />

          <div className="bg-[#1C1F26] border border-[#323846] rounded-xl p-3.5 space-y-1">
            <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase">
              Предпросмотр сообщения
            </div>
            <p className="text-xs text-[#D1D5DB] leading-relaxed">{previewText}</p>
          </div>

          <button
            type="button"
            onClick={handleSaveTemplate}
            className="w-full min-h-[44px] rounded-xl bg-[#0B0C0E] hover:bg-[#15181E] border border-[#323846] text-[#FFFFFF] text-xs font-semibold transition-colors"
          >
            Сохранить шаблон
          </button>
        </section>
      </div>
    </div>
  );
};
