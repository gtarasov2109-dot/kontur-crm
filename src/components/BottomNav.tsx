import React from 'react';
import { CalendarCheck2, Users, Plus, SlidersHorizontal, LogOut } from 'lucide-react';
import { NavTab } from '../types/crm';

interface TopNavProps {
  activeTab: NavTab;
  dueCount: number;
  studioName: string;
  isPro: boolean;
  onChangeTab: (tab: NavTab) => void;
  onOpenUpgrade: () => void;
  onLogout: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  dueCount,
  studioName,
  isPro,
  onChangeTab,
  onOpenUpgrade,
  onLogout,
}) => {
  const desktopTabs: Array<{
    id: Exclude<NavTab, 'add_visit'>;
    label: string;
    badge?: number;
  }> = [
    { id: 'today', label: 'СЕГОДНЯ', badge: dueCount > 0 ? dueCount : undefined },
    { id: 'clients', label: 'КЛИЕНТЫ' },
    { id: 'settings', label: 'НАСТРОЙКИ' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#1C1F26]/95 backdrop-blur-md border-b border-[#323846]">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onChangeTab('today')}
          className="text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#10B981] rounded-lg"
        >
          <span className="font-mono text-xs sm:text-base font-bold tracking-wider text-[#F3F4F6]">
            KONTUR // CRM
          </span>
        </button>

        {/* Zone 2: Desktop Horizontal Navigation Tabs */}
        <nav
          aria-label="Навигация по разделам"
          className="hidden md:flex items-center gap-2"
        >
          {desktopTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#10B981] ${
                  isActive
                    ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                    : 'bg-transparent text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#252932]/70'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#F59E0B] text-[#0B0C0E] text-[11px] font-bold tabular-nums inline-flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Studio Name + Subscription Badge + + ВИЗИТ + Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onChangeTab('settings')}
            className="hidden sm:inline-block text-xs font-medium text-[#D1D5DB] hover:text-[#F3F4F6] truncate max-w-[140px]"
            title={studioName}
          >
            {studioName || 'Моя студия'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isPro) onOpenUpgrade();
            }}
            className={`px-2 py-1 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold tracking-wide whitespace-nowrap shrink-0 border transition-colors ${
              isPro
                ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#34D399] cursor-default'
                : 'bg-[#252932] border-[#323846] text-[#9CA3AF] hover:text-[#F3F4F6] hover:border-[#10B981]'
            }`}
            title={isPro ? 'Активна подписка PRO' : 'Нажмите для перехода на PRO'}
          >
            {isPro ? '[ PRO ]' : '[ БАЗОВЫЙ ]'}
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('add_visit')}
            className={`hidden md:inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-colors whitespace-nowrap shrink-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981] ${
              activeTab === 'add_visit'
                ? 'bg-[#34D399] text-[#06281E]'
                : 'bg-[#10B981] hover:bg-[#34D399] text-[#06281E]'
            }`}
          >
            <Plus className="w-4 h-4" strokeWidth={2.75} />
            <span>+ ВИЗИТ</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Выйти из аккаунта"
            title="Выйти из аккаунта"
            className="min-h-[38px] min-w-[38px] px-2.5 sm:px-3 rounded-xl bg-[#252932] hover:bg-[#2E3440] border border-[#323846] text-[#9CA3AF] hover:text-[#F3F4F6] text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">ВЫЙТИ</span>
          </button>
        </div>
      </div>
    </header>
  );
};

interface BottomNavProps {
  activeTab: NavTab;
  dueCount: number;
  onChangeTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  dueCount,
  onChangeTab,
}) => {
  const items: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'today',
      label: 'СЕГОДНЯ',
      icon: <CalendarCheck2 className="w-5 h-5" />,
      badge: dueCount > 0 ? dueCount : undefined,
    },
    {
      id: 'clients',
      label: 'КЛИЕНТЫ',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'add_visit',
      label: '+ ВИЗИТ',
      icon: <Plus className="w-5 h-5" strokeWidth={2.75} />,
    },
    {
      id: 'settings',
      label: 'НАСТРОЙКИ',
      icon: <SlidersHorizontal className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Мобильная навигация"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#252932]/95 backdrop-blur-md border-t border-[#323846]"
    >
      <div className="grid grid-cols-4 items-center h-16 px-1.5 gap-1">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const isAdd = item.id === 'add_visit';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`relative flex flex-col items-center justify-center min-h-[46px] px-1 rounded-full transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#10B981] ${
                isAdd
                  ? 'bg-[#10B981] hover:bg-[#34D399] text-[#06281E] rounded-xl'
                  : isActive
                  ? 'bg-[#0B0C0E] text-[#FFFFFF]'
                  : 'bg-transparent text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F59E0B] text-[#0B0C0E] text-[10px] font-bold tabular-nums flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-wide mt-0.5 whitespace-nowrap ${
                  isAdd
                    ? 'font-bold text-[#06281E]'
                    : isActive
                    ? 'font-semibold text-[#FFFFFF]'
                    : 'font-medium text-[#9CA3AF]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
