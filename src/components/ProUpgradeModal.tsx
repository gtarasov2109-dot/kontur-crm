import React from 'react';
import { X, Crown, Check, Send } from 'lucide-react';
import { BeautyMasterRow } from '../types/crm';
import { FREE_CLIENTS_LIMIT } from '../data/specializations';

interface ProUpgradeModalProps {
  master: BeautyMasterRow;
  clientsCount: number;
  onClose: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  master,
  clientsCount,
  onClose,
}) => {
  const activationText = `Привет! Хочу активировать KONTUR PRO (1 490 ₽/мес) для студии «${
    master.studio_name || 'Моя студия'
  }» (${master.email})`;
  const telegramProUrl = `https://t.me/goshan_gg?text=${encodeURIComponent(
    activationText
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-[2px] sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Переход на тариф KONTUR PRO"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[#252932] border border-[#323846] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono text-[11px] font-bold tracking-wider text-[#10B981]">
                KONTUR PRO
              </div>
              <h2 className="text-lg font-bold text-[#F3F4F6]">
                Безлимитная база клиентов
              </h2>
            </div>
          </div>

          <button
            type="button"
            aria-label="Закрыть окно тарифа"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[#1C1F26] hover:bg-[#2E3440] border border-[#323846] text-[#9CA3AF] hover:text-[#F3F4F6] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#1C1F26] border border-[#323846] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9CA3AF]">Текущий тариф: БАЗОВЫЙ</span>
            <span className="font-mono font-bold text-[#FBBF24] tabular-nums">
              {clientsCount} / {FREE_CLIENTS_LIMIT} клиентов
            </span>
          </div>
          <p className="text-xs text-[#D1D5DB] leading-relaxed">
            На бесплатном тарифе доступно до {FREE_CLIENTS_LIMIT} клиентов в базе. Перейдите на PRO, чтобы вести неограниченную базу и увеличивать возвращаемость.
          </p>
        </div>

        <div className="space-y-2.5">
          {[
            'Безлимитное количество клиентов и визитов',
            'Свои шаблоны напоминаний в Telegram / WhatsApp / SMS',
            'Фильтр «Поздравить / Спецпредложение» в 1 клик',
            'Прогноз возвратной выручки за месяц',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-xs text-[#F3F4F6]">
              <span className="w-5 h-5 rounded-full bg-[#10B981]/15 text-[#34D399] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
              <span className="leading-snug">{item}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 space-y-2.5">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-xs text-[#9CA3AF]">Стоимость подписки</span>
            <span className="font-mono text-xl font-bold text-[#F3F4F6] tabular-nums">
              1 490 ₽ / мес
            </span>
          </div>

          <a
            href={telegramProUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[50px] px-4 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#06281E] text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          >
            <Send className="w-4 h-4" />
            <span>Активировать KONTUR PRO в Telegram</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[42px] rounded-xl text-xs font-medium text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors"
          >
            Пока остаться на тарифе БАЗОВЫЙ
          </button>
        </div>
      </div>
    </div>
  );
};
