import React from 'react';
import { Send, MessageCircle, MessageSquareText } from 'lucide-react';
import { BeautyClientRow } from '../types/crm';
import {
  buildOutreachMessage,
  buildSmsUrl,
  buildTelegramUrl,
  buildWhatsAppUrl,
} from '../utils/formatters';

interface OutreachActionsProps {
  client: BeautyClientRow;
  studioName: string;
  messageTemplate: string;
  onContacted: (clientId: string, channel: 'telegram' | 'whatsapp' | 'sms') => void;
  onShowToast: (message: string) => void;
}

export const OutreachActions: React.FC<OutreachActionsProps> = ({
  client,
  studioName,
  messageTemplate,
  onContacted,
  onShowToast,
}) => {
  const message = buildOutreachMessage(messageTemplate, client, studioName);
  const telegramHref = buildTelegramUrl(client.phone, message);
  const whatsappHref = buildWhatsAppUrl(client.phone, message);
  const smsHref = buildSmsUrl(client.phone, message);

  const handleCopyAndSms = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = message;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      onShowToast('Текст скопирован! Открываем SMS...');
    } catch {
      onShowToast('Открываем SMS с напоминанием...');
    }
    onContacted(client.id, 'sms');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <a
        href={telegramHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onContacted(client.id, 'telegram')}
        className="w-full min-h-[44px] px-3 rounded-xl bg-[#1C1F26] hover:bg-[#2E3440] border border-[#323846] text-[#F3F4F6] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] whitespace-nowrap"
      >
        <Send className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
        <span>TELEGRAM</span>
      </a>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onContacted(client.id, 'whatsapp')}
        className="w-full min-h-[44px] px-3 rounded-xl bg-[#1C1F26] hover:bg-[#2E3440] border border-[#323846] text-[#F3F4F6] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] whitespace-nowrap"
      >
        <MessageCircle className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
        <span>WHATSAPP</span>
      </a>

      <a
        href={smsHref}
        onClick={handleCopyAndSms}
        className="w-full min-h-[44px] px-3 rounded-xl bg-[#1C1F26] hover:bg-[#2E3440] border border-[#323846] text-[#F3F4F6] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] whitespace-nowrap"
      >
        <MessageSquareText className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
        <span>SMS / КОПИРОВАТЬ</span>
      </a>
    </div>
  );
};
