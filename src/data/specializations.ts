import { SpecializationId, SpecializationPreset } from '../types/crm';

export const DEFAULT_MESSAGE_TEMPLATE =
  'Привет, {имя}! Прошло {дней} дн. после услуги «{услуга}». Подберем удобное окошко на этой неделе?';

export const PROMO_TEMPLATES: Array<{ id: string; label: string; text: string }> = [
  {
    id: 'window',
    label: 'Свободное окошко (-10%)',
    text: 'Привет, {имя}! Это {студия}. Освободилось удобное окошко на этой неделе — дарим скидку 10% на «{услуга}». Записать вас?',
  },
  {
    id: 'holiday',
    label: 'Поздравление + подарок',
    text: 'Привет, {имя}! Команда «{студия}» поздравляет вас и дарит приятный бонус на следующий визит. Будем рады видеть!',
  },
  {
    id: 'vip',
    label: 'Персональное спецпредложение',
    text: 'Привет, {имя}! Для вас в «{студия}» действует особое предложение на уход и обновление услуги «{услуга}». Подберем время?',
  },
];

export const FREE_CLIENTS_LIMIT = 10;

export const SPECIALIZATIONS: SpecializationPreset[] = [
  {
    id: 'nails',
    title: 'НОГТЕВОЙ СЕРВИС',
    subtitle: 'Маникюр, наращивание, педикюр',
    notePlaceholder: 'Например: Камуфляж Luxio Blush + топ, квадрат',
    services: [
      { id: 'nails_manicure', name: 'Маникюр с покрытием', cycleDays: 21, defaultPrice: 2400 },
      { id: 'nails_ext', name: 'Наращивание', cycleDays: 28, defaultPrice: 3600 },
      { id: 'nails_pedicure', name: 'Педикюр', cycleDays: 30, defaultPrice: 2900 },
    ],
  },
  {
    id: 'barber',
    title: 'БАРБЕРШОП',
    subtitle: 'Стрижки, борода, уход',
    notePlaceholder: 'Например: Насадка 6мм, фейд с нуля, укладка матовой глиной',
    services: [
      { id: 'barber_cut', name: 'Мужская стрижка', cycleDays: 21, defaultPrice: 1800 },
      { id: 'barber_combo', name: 'Стрижка + борода', cycleDays: 14, defaultPrice: 2700 },
      { id: 'barber_beard', name: 'Моделирование бороды', cycleDays: 14, defaultPrice: 1300 },
    ],
  },
  {
    id: 'hair',
    title: 'ПАРИКМАХЕРСКАЯ / КОЛОРИСТИКА',
    subtitle: 'Стрижка, тонирование, окрашивание',
    notePlaceholder: 'Например: Краситель 8.1 + 3% оксид (1:1.5), выдержка 25 мин',
    services: [
      { id: 'hair_cut', name: 'Стрижка', cycleDays: 35, defaultPrice: 2600 },
      { id: 'hair_tone', name: 'Тонирование', cycleDays: 28, defaultPrice: 4500 },
      { id: 'hair_complex', name: 'Сложное окрашивание', cycleDays: 45, defaultPrice: 8900 },
    ],
  },
  {
    id: 'lashes',
    title: 'РЕСНИЦЫ И БРОВИ',
    subtitle: 'Наращивание, ламинирование, брови',
    notePlaceholder: 'Например: Изгиб C 0.10, мокрый эффект, микс 9–12мм',
    services: [
      { id: 'lashes_ext', name: 'Наращивание ресниц', cycleDays: 21, defaultPrice: 3200 },
      { id: 'lashes_lami', name: 'Ламинирование', cycleDays: 35, defaultPrice: 2500 },
      { id: 'lashes_brows', name: 'Оформление бровей', cycleDays: 21, defaultPrice: 1600 },
    ],
  },
  {
    id: 'cosmetology',
    title: 'КОСМЕТОЛОГИЯ / УХОД',
    subtitle: 'Чистка, депиляция, массаж лица',
    notePlaceholder: 'Например: УЗ + комбинированная чистка, сыворотка с ниацинамидом',
    services: [
      { id: 'cosm_clean', name: 'Чистка лица', cycleDays: 30, defaultPrice: 3800 },
      { id: 'cosm_depil', name: 'Депиляция', cycleDays: 28, defaultPrice: 2200 },
      { id: 'cosm_massage', name: 'Массаж', cycleDays: 14, defaultPrice: 2600 },
    ],
  },
];

export function getSpecializationById(id: string): SpecializationPreset {
  return (
    SPECIALIZATIONS.find((s) => s.id === (id as SpecializationId)) ||
    SPECIALIZATIONS[0]
  );
}
