export type SpecializationId =
  | 'nails'
  | 'barber'
  | 'hair'
  | 'lashes'
  | 'cosmetology';

export type NavTab = 'today' | 'clients' | 'add_visit' | 'settings';

export interface ServiceItem {
  id: string;
  name: string;
  cycleDays: number;
  defaultPrice: number;
  isCustom?: boolean;
}

export interface SpecializationPreset {
  id: SpecializationId;
  title: string;
  subtitle: string;
  notePlaceholder: string;
  services: ServiceItem[];
}

export interface BeautyMasterRow {
  id: string;
  email: string;
  studio_name: string;
  specialization: SpecializationId;
  is_pro: boolean;
  created_at?: string;
}

export interface BeautyClientRow {
  id: string;
  master_id: string;
  name: string;
  phone: string;
  last_service: string;
  formula_note: string | null;
  price: number;
  return_days: number;
  last_visit_date: string; // YYYY-MM-DD
  next_visit_date: string; // YYYY-MM-DD
  status: string;
  total_spent: number;
  created_at?: string;
}

export interface MasterPreferences {
  services: ServiceItem[];
  messageTemplate: string;
  contactedTodayMap: Record<string, string>; // clientId -> YYYY-MM-DD
  monthlyReturnedByMonth: Record<string, number>; // YYYY-MM -> total ₽
}

export type RetentionStateKind = 'overdue' | 'due_today' | 'upcoming' | 'returned';

export interface RetentionStatus {
  kind: RetentionStateKind;
  label: string;
  daysDelta: number; // positive = overdue, 0 = today, negative = days until due
  daysSinceLastVisit: number;
}
