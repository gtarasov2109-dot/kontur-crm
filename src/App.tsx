import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BeautyClientRow,
  BeautyMasterRow,
  MasterPreferences,
  NavTab,
  ServiceItem,
  SpecializationId,
} from './types/crm';
import {
  DEFAULT_MESSAGE_TEMPLATE,
  FREE_CLIENTS_LIMIT,
  getSpecializationById,
} from './data/specializations';
import {
  addDaysISO,
  formatCurrency,
  getClientRetentionStatus,
  getTodayISO,
} from './utils/formatters';
import {
  ApiError,
  apiBackgroundSync,
  apiCreateClient,
  apiDeleteClient,
  apiGetProfile,
  apiListClients,
  apiLogout,
  apiUpdateClient,
  apiUpdateProfile,
  AuthSession,
  getStoredSession,
  saveStoredSession,
} from './lib/api';
import { AuthView } from './components/AuthView';
import { TodayDashboard } from './components/TodayDashboard';
import { ClientsDirectory } from './components/ClientsDirectory';
import { VisitLogger } from './components/VisitLogger';
import { SettingsView } from './components/SettingsView';
import { ClientDetailSheet } from './components/ClientDetailSheet';
import { BottomNav, TopNav } from './components/BottomNav';
import { ProUpgradeModal } from './components/ProUpgradeModal';

function getDefaultPrefs(specId: SpecializationId): MasterPreferences {
  const spec = getSpecializationById(specId);
  return {
    services: spec.services.map((s) => ({ ...s })),
    messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
    contactedTodayMap: {},
    monthlyReturnedByMonth: {},
  };
}

function loadMasterPrefs(userId: string, specId: SpecializationId): MasterPreferences {
  try {
    const raw = localStorage.getItem(`kontur_master_prefs_${userId}`);
    if (!raw) return getDefaultPrefs(specId);
    const parsed = JSON.parse(raw) as Partial<MasterPreferences>;
    const defaults = getDefaultPrefs(specId);
    return {
      services:
        Array.isArray(parsed.services) && parsed.services.length > 0
          ? parsed.services
          : defaults.services,
      messageTemplate: parsed.messageTemplate || defaults.messageTemplate,
      contactedTodayMap: parsed.contactedTodayMap || {},
      monthlyReturnedByMonth: parsed.monthlyReturnedByMonth || {},
    };
  } catch {
    return getDefaultPrefs(specId);
  }
}

interface ToastState {
  id: number;
  message: string;
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredSession()
  );
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  const [master, setMaster] = useState<BeautyMasterRow | null>(null);
  const [clients, setClients] = useState<BeautyClientRow[]>([]);
  const [prefs, setPrefs] = useState<MasterPreferences>(() =>
    getDefaultPrefs('nails')
  );

  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [visitPrefillClient, setVisitPrefillClient] =
    useState<BeautyClientRow | null>(null);
  const [savingVisit, setSavingVisit] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    const id = Date.now();
    setToast({ id, message });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  }, []);

  const handleLogout = useCallback(() => {
    apiLogout();
    setSession(null);
    setMaster(null);
    setClients([]);
    setPrefs(getDefaultPrefs('nails'));
    setSelectedClientId(null);
    setVisitPrefillClient(null);
    setShowProModal(false);
    setActiveTab('today');
  }, []);

  const loadWorkspace = useCallback(
    async (initialMaster?: BeautyMasterRow | null) => {
      setLoadingWorkspace(true);
      try {
        const [resolvedMaster, fetchedClients] = await Promise.all([
          initialMaster ? Promise.resolve(initialMaster) : apiGetProfile(),
          apiListClients(),
        ]);

        setMaster(resolvedMaster);
        setPrefs(loadMasterPrefs(resolvedMaster.id, resolvedMaster.specialization));
        setClients(fetchedClients);

        // Silent background Supabase sync (never blocks or shows errors)
        void apiBackgroundSync()
          .then((synced) => {
            if (!synced) return;
            const currentSession = getStoredSession();
            if (!currentSession || currentSession.user.id !== synced.master.id) {
              return;
            }
            setMaster(synced.master);
            setClients(synced.clients);
          })
          .catch(() => {
            // silent
          });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          handleLogout();
          return;
        }
      } finally {
        setLoadingWorkspace(false);
      }
    },
    [handleLogout]
  );

  // Restore workspace on mount if session exists in localStorage
  useEffect(() => {
    if (session && !master) {
      loadWorkspace();
    }
  }, [session, master, loadWorkspace]);

  // Persist per-master preferences locally
  useEffect(() => {
    if (!master) return;
    try {
      localStorage.setItem(
        `kontur_master_prefs_${master.id}`,
        JSON.stringify(prefs)
      );
    } catch {
      // ignore storage quota
    }
  }, [master, prefs]);

  const todayIso = getTodayISO();
  const currentMonth = todayIso.slice(0, 7);

  const dueCount = useMemo(() => {
    return clients.filter((c) => {
      const status = getClientRetentionStatus(c, todayIso);
      return status.kind === 'overdue' || status.kind === 'due_today';
    }).length;
  }, [clients, todayIso]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const monthlyReturned = prefs.monthlyReturnedByMonth[currentMonth] || 0;

  const handleMarkReturned = async (clientId: string) => {
    const target = clients.find((c) => c.id === clientId);
    if (!target || !master) return;

    const cycleDays = Math.max(1, Number(target.return_days) || 21);
    const price = Number(target.price) || 0;
    const nextVisitDate = addDaysISO(todayIso, cycleDays);
    const newTotalSpent = (Number(target.total_spent) || 0) + price;

    const prevClients = clients;
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              last_visit_date: todayIso,
              next_visit_date: nextVisitDate,
              total_spent: newTotalSpent,
              status: 'active',
            }
          : c
      )
    );

    try {
      const updated = await apiUpdateClient(clientId, {
        last_visit_date: todayIso,
        next_visit_date: nextVisitDate,
        total_spent: newTotalSpent,
        status: 'active',
      });

      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? updated : c))
      );

      setPrefs((prev) => ({
        ...prev,
        monthlyReturnedByMonth: {
          ...prev.monthlyReturnedByMonth,
          [currentMonth]: (prev.monthlyReturnedByMonth[currentMonth] || 0) + price,
        },
      }));

      showToast(`${target.name} записан(а) · +${formatCurrency(price)}`);
    } catch (err) {
      setClients(prevClients);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ошибка обновления: ${msg}`);
    }
  };

  const handleContacted = (
    clientId: string,
    _channel: 'telegram' | 'whatsapp' | 'sms'
  ) => {
    setPrefs((prev) => ({
      ...prev,
      contactedTodayMap: {
        ...prev.contactedTodayMap,
        [clientId]: todayIso,
      },
    }));
  };

  const handleSaveVisit = async (payload: {
    existingClientId?: string;
    clientName: string;
    phone: string;
    serviceName: string;
    price: number;
    cycleDays: number;
    formulaNote: string;
    visitDate: string;
  }) => {
    if (!master) return;

    if (
      !payload.existingClientId &&
      !master.is_pro &&
      clients.length >= FREE_CLIENTS_LIMIT
    ) {
      setShowProModal(true);
      return;
    }

    setSavingVisit(true);
    const nextVisitDate = addDaysISO(payload.visitDate, payload.cycleDays);

    try {
      if (payload.existingClientId) {
        const existing = clients.find((c) => c.id === payload.existingClientId);
        const newTotalSpent =
          (Number(existing?.total_spent) || 0) + payload.price;

        const updated = await apiUpdateClient(payload.existingClientId, {
          name: payload.clientName,
          phone: payload.phone,
          last_service: payload.serviceName,
          formula_note: payload.formulaNote || null,
          price: payload.price,
          return_days: payload.cycleDays,
          last_visit_date: payload.visitDate,
          next_visit_date: nextVisitDate,
          status: 'active',
          total_spent: newTotalSpent,
        });

        setClients((prev) =>
          prev.map((c) => (c.id === payload.existingClientId ? updated : c))
        );

        if (payload.visitDate.startsWith(currentMonth)) {
          setPrefs((prev) => ({
            ...prev,
            monthlyReturnedByMonth: {
              ...prev.monthlyReturnedByMonth,
              [currentMonth]:
                (prev.monthlyReturnedByMonth[currentMonth] || 0) + payload.price,
            },
          }));
        }

        showToast(`Визит для ${payload.clientName} обновлён`);
      } else {
        const inserted = await apiCreateClient({
          name: payload.clientName,
          phone: payload.phone,
          last_service: payload.serviceName,
          formula_note: payload.formulaNote || null,
          price: payload.price,
          return_days: payload.cycleDays,
          last_visit_date: payload.visitDate,
          next_visit_date: nextVisitDate,
          status: 'active',
          total_spent: payload.price,
        });

        setClients((prev) => [inserted, ...prev]);
        showToast(`${payload.clientName} добавлен(а) в базу`);
      }

      setVisitPrefillClient(null);
      setActiveTab('today');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 402 || err.code === 'FREE_LIMIT_REACHED')) {
        setShowProModal(true);
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ошибка сохранения: ${msg}`);
    } finally {
      setSavingVisit(false);
    }
  };

  const handleUpdateClient = async (
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
  ) => {
    try {
      const updated = await apiUpdateClient(clientId, patch);
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? updated : c))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ошибка обновления: ${msg}`);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    const prevClients = clients;
    setClients((prev) => prev.filter((c) => c.id !== clientId));

    try {
      await apiDeleteClient(clientId);
      showToast('Клиент удалён из базы');
    } catch (err) {
      setClients(prevClients);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ошибка удаления: ${msg}`);
    }
  };

  const handleUpdateStudioName = async (studioName: string) => {
    try {
      const updated = await apiUpdateProfile({ studio_name: studioName });
      setMaster(updated);
      showToast('Название студии сохранено');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ошибка сохранения студии: ${msg}`);
    }
  };

  const handleChangeSpecialization = async (specId: SpecializationId) => {
    try {
      const updated = await apiUpdateProfile({ specialization: specId });
      const spec = getSpecializationById(specId);
      setMaster(updated);
      setPrefs((prev) => {
        const customServices = prev.services.filter((s) => s.isCustom);
        return {
          ...prev,
          services: [...spec.services.map((s) => ({ ...s })), ...customServices],
        };
      });
      showToast('Специализация и список услуг обновлены');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ошибка смены специализации: ${msg}`);
    }
  };

  const handleAddService = (service: Omit<ServiceItem, 'id'>) => {
    const newSvc: ServiceItem = {
      ...service,
      id: `custom_${Date.now()}`,
      isCustom: true,
    };
    setPrefs((prev) => ({
      ...prev,
      services: [...prev.services, newSvc],
    }));
  };

  const handleRemoveService = (serviceId: string) => {
    setPrefs((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== serviceId),
    }));
    showToast('Услуга удалена');
  };

  const handleUpdateMessageTemplate = (messageTemplate: string) => {
    setPrefs((prev) => ({ ...prev, messageTemplate }));
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab !== 'add_visit') {
      setVisitPrefillClient(null);
    }
    setActiveTab(tab);
  };

  const tabTitle: Record<NavTab, string> = {
    today: 'Возврат сегодня',
    clients: 'База клиентов',
    add_visit: 'Запись визита',
    settings: 'Настройки студии',
  };

  if (!session) {
    return (
      <AuthView
        onAuthSuccess={async ({ session: nextSession, master: nextMaster }) => {
          saveStoredSession(nextSession);
          setSession(nextSession);
          await loadWorkspace(nextMaster);
        }}
      />
    );
  }

  if (loadingWorkspace || !master) {
    return (
      <div className="min-h-screen bg-[#1C1F26] flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <div className="font-mono text-xs font-bold tracking-wider text-[#10B981]">
            KONTUR // CRM
          </div>
          <div className="text-sm text-[#9CA3AF]">
            Синхронизация базы студии...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#1C1F26] text-[#F3F4F6] flex flex-col">
      <TopNav
        activeTab={activeTab}
        dueCount={dueCount}
        studioName={master.studio_name}
        isPro={master.is_pro}
        onChangeTab={handleTabChange}
        onOpenUpgrade={() => setShowProModal(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-5 sm:pt-6 pb-24 md:pb-12">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F3F4F6]">
            {tabTitle[activeTab]}
          </h1>
          <span className="text-xs text-[#9CA3AF]">
            {getSpecializationById(master.specialization).title}
          </span>
        </div>

        {activeTab === 'today' && (
          <TodayDashboard
            clients={clients}
            studioName={master.studio_name}
            messageTemplate={prefs.messageTemplate}
            monthlyReturned={monthlyReturned}
            contactedTodayMap={prefs.contactedTodayMap}
            onMarkReturned={handleMarkReturned}
            onContacted={handleContacted}
            onOpenClientDetail={(c) => setSelectedClientId(c.id)}
            onGoToAddVisit={() => handleTabChange('add_visit')}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsDirectory
            clients={clients}
            onSelectClient={(c) => setSelectedClientId(c.id)}
            onGoToAddVisit={() => handleTabChange('add_visit')}
          />
        )}

        {activeTab === 'add_visit' && (
          <VisitLogger
            clients={clients}
            services={prefs.services}
            specializationId={master.specialization}
            isPro={master.is_pro}
            prefillClient={visitPrefillClient}
            saving={savingVisit}
            onSaveVisit={handleSaveVisit}
            onOpenUpgrade={() => setShowProModal(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            master={master}
            clientsCount={clients.length}
            services={prefs.services}
            messageTemplate={prefs.messageTemplate}
            onUpdateStudioName={handleUpdateStudioName}
            onChangeSpecialization={handleChangeSpecialization}
            onAddService={handleAddService}
            onRemoveService={handleRemoveService}
            onUpdateMessageTemplate={handleUpdateMessageTemplate}
            onOpenUpgrade={() => setShowProModal(true)}
            onShowToast={showToast}
            onSyncComplete={(synced) => {
              const currentSession = getStoredSession();
              if (!currentSession || currentSession.user.id !== synced.master.id) {
                return;
              }
              setMaster(synced.master);
              setClients(synced.clients);
            }}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        dueCount={dueCount}
        onChangeTab={handleTabChange}
      />

      {selectedClient && (
        <ClientDetailSheet
          client={selectedClient}
          studioName={master.studio_name}
          messageTemplate={prefs.messageTemplate}
          onClose={() => setSelectedClientId(null)}
          onUpdateClient={handleUpdateClient}
          onAddVisitForClient={(client) => {
            setSelectedClientId(null);
            setVisitPrefillClient(client);
            setActiveTab('add_visit');
          }}
          onMarkReturned={handleMarkReturned}
          onContacted={handleContacted}
          onDeleteClient={handleDeleteClient}
          onShowToast={showToast}
        />
      )}

      {showProModal && (
        <ProUpgradeModal
          master={master}
          clientsCount={clients.length}
          onClose={() => setShowProModal(false)}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 w-[calc(100%-2rem)] max-w-sm z-50 bg-[#0B0C0E] border border-[#323846] text-[#F3F4F6] px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3"
        >
          <span className="text-xs font-medium leading-snug">
            {toast.message}
          </span>
        </div>
      )}
    </div>
  );
}
