import { BeautyClientRow, RetentionStatus } from '../types/crm';

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return formatISODate(d);
}

export function ensureISODateYYYYMMDD(
  value?: string | null,
  fallback: string = getTodayISO()
): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    if (trimmed) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return formatISODate(parsed);
      }
    }
  }
  return fallback;
}

export function diffCalendarDays(targetIso: string, baseIso: string): number {
  const a = parseISODate(targetIso).getTime();
  const b = parseISODate(baseIso).getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

export function pluralizeDays(count: number): string {
  const abs = Math.abs(count);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 19) return `${abs} дней`;
  if (mod10 === 1) return `${abs} день`;
  if (mod10 >= 2 && mod10 <= 4) return `${abs} дня`;
  return `${abs} дней`;
}

export function formatRussianDate(iso: string): string {
  const today = getTodayISO();
  if (iso === today) return 'Сегодня';
  if (iso === addDaysISO(today, -1)) return 'Вчера';
  const d = parseISODate(iso);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatCurrency(amount: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(amount || 0))} ₽`;
}

export function extractRussianPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  } else if (digits.startsWith('9') && digits.length <= 10) {
    digits = '7' + digits;
  } else if (!digits.startsWith('7')) {
    digits = '7' + digits;
  }
  return digits.slice(0, 11);
}

export function formatPhoneInput(raw: string): string {
  const digits = extractRussianPhoneDigits(raw);
  if (!digits) return '';
  const body = digits.slice(1);
  if (body.length === 0) return '+7';
  if (body.length <= 3) return `+7 (${body}`;
  if (body.length <= 6) return `+7 (${body.slice(0, 3)}) ${body.slice(3)}`;
  if (body.length <= 8) {
    return `+7 (${body.slice(0, 3)}) ${body.slice(3, 6)}-${body.slice(6)}`;
  }
  return `+7 (${body.slice(0, 3)}) ${body.slice(3, 6)}-${body.slice(6, 8)}-${body.slice(8, 10)}`;
}

export function sanitizePhoneDigits(phone: string): string {
  const digits = extractRussianPhoneDigits(phone);
  return digits.length === 11 ? digits : digits.padEnd(11, '0');
}

export function getClientRetentionStatus(
  client: BeautyClientRow,
  todayIso: string = getTodayISO()
): RetentionStatus {
  const lastVisitDate = client.last_visit_date || todayIso;
  const daysSinceLastVisit = Math.max(0, diffCalendarDays(todayIso, lastVisitDate));
  const daysOverdue = diffCalendarDays(todayIso, client.next_visit_date || todayIso);

  if (daysOverdue > 0) {
    return {
      kind: 'overdue',
      label: `Просрочен на ${pluralizeDays(daysOverdue)}`,
      daysDelta: daysOverdue,
      daysSinceLastVisit,
    };
  }

  if (daysOverdue === 0) {
    return {
      kind: 'due_today',
      label: 'Пора сегодня',
      daysDelta: 0,
      daysSinceLastVisit,
    };
  }

  const daysUntilDue = Math.abs(daysOverdue);
  if (daysUntilDue <= 5) {
    return {
      kind: 'upcoming',
      label: `Через ${pluralizeDays(daysUntilDue)}`,
      daysDelta: -daysUntilDue,
      daysSinceLastVisit,
    };
  }

  if (daysSinceLastVisit <= 7) {
    return {
      kind: 'returned',
      label: 'Вернулся',
      daysDelta: -daysUntilDue,
      daysSinceLastVisit,
    };
  }

  return {
    kind: 'returned',
    label: `Через ${pluralizeDays(daysUntilDue)}`,
    daysDelta: -daysUntilDue,
    daysSinceLastVisit,
  };
}

export function buildOutreachMessage(
  template: string,
  client: Pick<BeautyClientRow, 'name' | 'last_service' | 'last_visit_date'>,
  studioName: string
): string {
  const firstName = client.name.trim().split(/\s+/)[0] || client.name;
  const lastService = (client.last_service || 'услугу').toLowerCase();
  const studio = studioName.trim() || 'наша студия';
  const daysElapsed = Math.max(
    0,
    diffCalendarDays(getTodayISO(), client.last_visit_date || getTodayISO())
  );

  return template
    .replace(/\{имя\}/gi, firstName)
    .replace(/\{услуга\}/gi, lastService)
    .replace(/\{студия\}/gi, studio)
    .replace(/\{дней\}/gi, String(daysElapsed));
}

export function buildTelegramUrl(phone: string, message: string): string {
  const digits = sanitizePhoneDigits(phone);
  return `https://t.me/+${digits}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = sanitizePhoneDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildSmsUrl(phone: string, message: string): string {
  const digits = sanitizePhoneDigits(phone);
  return `sms:+${digits}?body=${encodeURIComponent(message)}`;
}

/**
 * Expected revenue from clients due today, overdue, or due before the end of the current month
 */
export function getExpectedMonthlyReturnRevenue(
  clients: BeautyClientRow[],
  todayIso: string = getTodayISO()
): number {
  const currentMonth = todayIso.slice(0, 7); // YYYY-MM
  return clients.reduce((sum, client) => {
    const nextDate = client.next_visit_date || '';
    const isDueOrOverdue = nextDate <= todayIso;
    const isDueLaterThisMonth = nextDate.startsWith(currentMonth);
    if (isDueOrOverdue || isDueLaterThisMonth) {
      return sum + (Number(client.price) || 0);
    }
    return sum;
  }, 0);
}
