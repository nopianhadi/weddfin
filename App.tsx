import React, { useState, useEffect, startTransition, lazy, Suspense } from 'react';
import { ViewType, Client, Project, TeamMember, Transaction, Package, AddOn, TeamProjectPayment, Profile, FinancialPocket, TeamPaymentRecord, Lead, RewardLedgerEntry, User, Card, Asset, ClientFeedback, Contract, RevisionStatus, NavigationAction, Notification, SocialMediaPost, PromoCode, SOP, CardType, PocketType, VendorData, PaymentStatus, TransactionType } from './types';
import { HomeIcon, FolderKanbanIcon, UsersIcon, DollarSignIcon, PlusIcon, lightenColor, darkenColor, hexToHsl } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
// Keep lightweight/core components imported normally
import GlobalSearch from './components/GlobalSearch';
import Homepage from './components/Homepage';
import Login from './components/Login';
// Lazy-load route components to enable real code-splitting and avoid dynamic/static import conflicts
const Dashboard = lazy(() => import('./components/Dashboard'));
const Leads = lazy(() => import('./components/Leads').then(m => ({ default: m.Leads })));
const Booking = lazy(() => import('./components/Booking'));
const Clients = lazy(() => import('./components/Clients'));
const Projects = lazy(() => import('./components/Projects').then(m => ({ default: m.Projects })));
const Freelancers = lazy(() => import('./components/Freelancers').then(m => ({ default: m.Freelancers })));
const Finance = lazy(() => import('./components/Finance'));
const Packages = lazy(() => import('./components/Packages'));
const Assets = lazy(() => import('./components/Assets').then(m => ({ default: m.Assets })));
const Settings = lazy(() => import('./components/Settings'));
const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })));
const ClientReports = lazy(() => import('./components/ClientKPI'));
const Contracts = lazy(() => import('./components/Contracts'));
const ClientPortal = lazy(() => import('./components/ClientPortal'));
const FreelancerPortal = lazy(() => import('./components/FreelancerPortal'));
const SocialPlanner = lazy(() => import('./components/SocialPlanner').then(m => ({ default: m.SocialPlanner })));
const PromoCodes = lazy(() => import('./components/PromoCodes'));
const SOPManagement = lazy(() => import('./components/SOP'));
const PublicBookingForm = lazy(() => import('./components/PublicBookingForm'));
const PublicPackages = lazy(() => import('./components/PublicPackages'));
const PublicFeedbackForm = lazy(() => import('./components/PublicFeedbackForm'));
const PublicRevisionForm = lazy(() => import('./components/PublicRevisionForm'));
const PublicLeadForm = lazy(() => import('./components/PublicLeadForm'));
const SuggestionForm = lazy(() => import('./components/SuggestionForm'));
const TestSignature = lazy(() => import('./components/TestSignature'));
import { listClients } from './services/clients';
import { listLeads } from './services/leads';
import { listPromoCodes } from './services/promoCodes';
import { listCards as listCardsFromDb } from './services/cards';
import { listPackages } from './services/packages';
import { listAddOns } from './services/addOns';
import { listAssets } from './services/assets';
import { listContracts, updateContract as updateContractInDb } from './services/contracts';
import { listSOPs } from './services/sops';
import { listTeamMembers } from './services/teamMembers';
import { listSocialPosts } from './services/socialPosts';
import { listProjects, listProjectsWithRelations } from './services/projects';
import { updateProject as updateProjectInDb } from './services/projects';
import { getProfile as getProfileFromDb } from './services/profile';
import { useAppData } from './hooks/useAppData';
import { DataLoadingWrapper } from './components/LoadingState';
import { listAllTeamPayments } from './services/teamProjectPayments';
import { listUsers as listUsersFromDb } from './services/users';
import { listLeads as listLeadsFromDb } from './services/leads';
import { listClientFeedback as listClientFeedbackFromDb } from './services/clientFeedback';
import { listTransactions as listTransactionsFromDb, createTransaction, updateCardBalance, updateTransaction as updateTransactionInDb } from './services/transactions';
import { listTeamPaymentRecords as listTeamPaymentRecordsFromDb } from './services/teamPaymentRecords';
import { listRewardLedgerEntries as listRewardLedgerEntriesFromDb } from './services/rewardLedger';
import { listPockets as listPocketsFromDb } from './services/pockets';
import { markSubStatusConfirmed } from './services/projectSubStatusConfirmations';
import { createRevisionSubmission } from './services/revisionSubmissions';
import { updateRevision as updateRevisionInDb } from './services/projectRevisions';
import { supabase } from './lib/supabaseClient';
import { listNotifications as listNotificationsFromDb, createNotification as createNotificationRow, updateNotification as updateNotificationRow } from './services/notifications';

const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = window.localStorage.getItem(key);
            if (storedValue) {
                return JSON.parse(storedValue);
            }
            window.localStorage.setItem(key, JSON.stringify(defaultValue));
            return defaultValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState];
};

const AccessDenied: React.FC<{onBackToDashboard: () => void}> = ({ onBackToDashboard }) => (
    <div className="
        flex flex-col items-center justify-center 
        h-full 
        text-center 
        p-4 sm:p-6 md:p-8
        animate-fade-in
    ">
        <div className="
            w-16 h-16 sm:w-20 sm:h-20
            rounded-full 
            bg-red-100
            flex items-center justify-center
            mb-4 sm:mb-6
        ">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
        </div>
        <h2 className="
            text-xl sm:text-2xl 
            font-bold 
            text-red-600 
            mb-2 sm:mb-3
        ">
            Akses Ditolak
        </h2>
        <p className="
            text-brand-text-secondary 
            mb-6 sm:mb-8 
            max-w-md
            leading-relaxed
        ">
            Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
        <button 
            onClick={onBackToDashboard} 
            className="button-primary"
        >
            Kembali ke Dashboard
        </button>
    </div>
);

const BottomNavBar: React.FC<{ activeView: ViewType; handleNavigation: (view: ViewType) => void }> = ({ activeView, handleNavigation }) => {
    const prefetchView = (view: ViewType) => {
        switch (view) {
            case ViewType.DASHBOARD: import('./components/Dashboard'); break;
            case ViewType.PROSPEK: import('./components/Leads'); break;
            case ViewType.BOOKING: import('./components/Booking'); break;
            case ViewType.CLIENTS: import('./components/Clients'); break;
            case ViewType.PROJECTS: import('./components/Projects'); break;
            case ViewType.TEAM: import('./components/Freelancers'); break;
            case ViewType.FINANCE: import('./components/Finance'); break;
            case ViewType.CALENDAR: import('./components/CalendarView'); break;
            case ViewType.SOCIAL_MEDIA_PLANNER: import('./components/SocialPlanner'); break;
            case ViewType.PACKAGES: import('./components/Packages'); break;
            case ViewType.ASSETS: import('./components/Assets'); break;
            case ViewType.CONTRACTS: import('./components/Contracts'); break;
            case ViewType.PROMO_CODES: import('./components/PromoCodes'); break;
            case ViewType.SOP: import('./components/SOP'); break;
            case ViewType.CLIENT_REPORTS: import('./components/ClientKPI'); break;
            case ViewType.SETTINGS: import('./components/Settings'); break;
            default: break;
        }
    };
    const navItems = [
        { view: ViewType.DASHBOARD, label: 'Beranda', icon: HomeIcon },
        { view: ViewType.PROJECTS, label: 'Proyek', icon: FolderKanbanIcon },
        { view: ViewType.CLIENTS, label: 'Klien', icon: UsersIcon },
        { view: ViewType.FINANCE, label: 'Keuangan', icon: DollarSignIcon },
    ];

    return (
        <nav className="
            bottom-nav 
            xl:hidden
            bg-brand-surface/95 
            backdrop-blur-xl
            border-t border-brand-border/50
        ">
            <div className="
                flex justify-around items-center 
                h-16
                px-2
            " 
            style={{
                paddingBottom: 'var(--safe-area-inset-bottom, 0px)'
            }}>
                {navItems.map(item => (
                    <button
                        key={item.view}
                        onClick={() => handleNavigation(item.view)}
                        onMouseEnter={() => prefetchView(item.view)}
                        className={`
                            flex flex-col items-center justify-center 
                            w-full h-full
                            px-2 py-2
                            rounded-xl
                            transition-all duration-200 
                            min-w-[64px] min-h-[48px]
                            relative
                            group
                            ${activeView === item.view 
                                ? 'text-brand-accent bg-brand-accent/10' 
                                : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-input/50 active:bg-brand-input'
                            }
                        `}
                        aria-label={item.label}
                    >
                        {/* Enhanced Icon */}
                        <div className="
                            relative
                            mb-1
                        ">
                            <item.icon className={`
                                w-5 h-5 sm:w-6 sm:h-6
                                transition-all duration-200
                                ${activeView === item.view ? 'transform scale-110' : 'group-active:scale-95'}
                            `} />
                            
                            {/* Active indicator dot */}
                            {activeView === item.view && (
                                <div className="
                                    absolute -top-1 -right-1
                                    w-2 h-2
                                    bg-brand-accent
                                    animate-pulse-soft
                                " />
                            )}
                        </div>
                        
                        {/* Enhanced Label */}
                        <span className={`
                            text-xs font-semibold
                            leading-tight
                            transition-all duration-200
                            ${activeView === item.view ? 'font-bold' : ''}
                        `}>
                            {item.label}
                        </span>
                        
                        {/* Background highlight */}
                        <div className={`
                            absolute inset-0
                            rounded-xl
                            transition-all duration-300
                            ${activeView === item.view 
                                ? 'bg-gradient-to-t from-brand-accent/10 to-transparent' 
                                : 'bg-transparent group-hover:bg-brand-input/30'
                            }
                        `} />
                    </button>
                ))}
            </div>
        </nav>
    );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = usePersistentState<boolean>('vena-isAuthenticated', false);
  const [currentUser, setCurrentUser] = usePersistentState<User | null>('vena-currentUser', null);
  const [activeView, setActiveView] = useState<ViewType>(ViewType.HOMEPAGE);
  const [notification, setNotification] = useState<string>('');
  const [initialAction, setInitialAction] = useState<NavigationAction | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [route, setRoute] = useState(window.location.hash || '#/home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Force light mode globally on app load
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try { window.localStorage.setItem('theme', 'light'); } catch {}
  }, []);

  // --- State Initialization with Persistence ---
  const [users, setUsers] = useState<User[]>([]);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [teamProjectPayments, setTeamProjectPayments] = useState<TeamProjectPayment[]>([]);
  const [teamPaymentsLoaded, setTeamPaymentsLoaded] = useState(false);
  const [teamPaymentRecords, setTeamPaymentRecords] = useState<TeamPaymentRecord[]>([]);
  const [pockets, setPockets] = useState<FinancialPocket[]>([]);
  // Inisialisasi profile tanpa MOCK; isi dari Supabase pada efek load profile
  const [profile, setProfile] = useState<Profile>({
    projectTypes: [],
    projectStatusConfig: [],
    eventTypes: [],
  } as unknown as Profile);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [rewardLedgerEntries, setRewardLedgerEntries] = useState<RewardLedgerEntry[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clientFeedback, setClientFeedback] = useState<ClientFeedback[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socialMediaPosts, setSocialMediaPosts] = useState<SocialMediaPost[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [sops, setSops] = useState<SOP[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);

  // --- Lazy Data Loading Hook ---
  const appData = useAppData();


    // --- [NEW] MOCK EMAIL SERVICE ---
    const sendEmailNotification = (recipientEmail: string, notification: Notification) => {
        // Simulasi pengiriman email dinonaktifkan di konsol untuk kebersihan log.
        // Integrasi email nyata dapat ditambahkan di sini.
    };

    // --- [NEW] CENTRALIZED NOTIFICATION HANDLER ---
    const addNotification = async (newNotificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
        const payload: Omit<Notification, 'id'> = {
            ...newNotificationData,
            timestamp: new Date().toISOString(),
            isRead: false,
        } as any;
        try {
            const created = await createNotificationRow(payload);
            setNotifications(prev => [created, ...prev]);
            if (profile.email) {
                sendEmailNotification(profile.email, created);
            }
        } catch (e) {
            console.warn('[Notifications] Failed to create notification in Supabase:', e);
            // Fallback to local append if needed
            const fallback: Notification = {
                id: crypto.randomUUID(),
                ...payload,
            } as Notification;
            setNotifications(prev => [fallback, ...prev]);
        }
    };

    const handleResetData = () => {
        // Clear all localStorage items related to the app
        Object.keys(window.localStorage).forEach(key => {
            if (key.startsWith('vena-')) {
                window.localStorage.removeItem(key);
            }
        });
        // Reload the page to reset state to defaults
        window.location.reload();
    };


    // --- [NEW] One-time migration: clients from localStorage to Supabase ---
    useEffect(() => {
        const KEY = 'vena-clients';
        const FLAG = 'vena-clients-migrated';
        if ((window as any)[FLAG] || window.localStorage.getItem(FLAG) === 'yes') return;
        try {
            const raw = window.localStorage.getItem(KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) return;
            (async () => {
                try {
                    // Lazy import to avoid circular deps
                    const mod = await import('./services/clients');
                    for (const c of parsed) {
                        try {
                            await mod.createClient({
                                id: c.id, // preserve original id if service allows
                                name: c.name,
                                email: c.email,
                                phone: c.phone,
                                whatsapp: c.whatsapp ?? undefined,
                                since: c.since,
                                instagram: c.instagram ?? undefined,
                                status: c.status,
                                clientType: c.clientType,
                                lastContact: c.lastContact,
                                portalAccessId: c.portalAccessId,
                            } as any);
                        } catch (e) {
                            // ignore per-row errors (e.g., duplicates)
                        }
                    }
                    window.localStorage.setItem(FLAG, 'yes');
                    console.info('[Migration] clients migrated to Supabase.');
                } catch (err) {
                    console.warn('[Migration] clients migration failed.', err);
                }
            })();
        } catch {}
    }, []);

  

    // --- [NEW] Realtime: assets ---
    useEffect(() => {
        const channel = supabase.channel('realtime-assets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, (payload) => {
                console.log('Asset change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setAssets(current => [payload.new as Asset, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setAssets(current => current.map(a => a.id === payload.new.id ? { ...(a as any), ...(payload.new as any) } : a));
                }
                if (payload.eventType === 'DELETE') {
                    setAssets(current => current.filter(a => a.id !== (payload.old as any).id));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // --- [NEW] Realtime: promo_codes ---
    useEffect(() => {
        const channel = supabase.channel('realtime-promo-codes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_codes' }, (payload) => {
                console.log('Promo code change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setPromoCodes(current => [payload.new as PromoCode, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setPromoCodes(current => current.map(pc => pc.id === payload.new.id ? { ...(pc as any), ...(payload.new as any) } : pc));
                }
                if (payload.eventType === 'DELETE') {
                    setPromoCodes(current => current.filter(pc => pc.id !== (payload.old as any).id));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // --- [NEW] Realtime: packages ---
    useEffect(() => {
        const channel = supabase.channel('realtime-packages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, (payload) => {
                console.log('Package change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setPackages(current => [payload.new as Package, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setPackages(current => current.map(p => p.id === payload.new.id ? { ...(p as any), ...(payload.new as any) } : p));
                }
                if (payload.eventType === 'DELETE') {
                    setPackages(current => current.filter(p => p.id !== (payload.old as any).id));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // --- [NEW] Realtime: add_ons ---
    useEffect(() => {
        const channel = supabase.channel('realtime-add-ons')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'add_ons' }, (payload) => {
                console.log('Add-on change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setAddOns(current => [payload.new as AddOn, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setAddOns(current => current.map(a => a.id === payload.new.id ? { ...(a as any), ...(payload.new as any) } : a));
                }
                if (payload.eventType === 'DELETE') {
                    setAddOns(current => current.filter(a => a.id !== (payload.old as any).id));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // --- [NEW] Recalculate each freelancer's rewardBalance from reward ledger entries ---
    useEffect(() => {
        try {
            if (!Array.isArray(rewardLedgerEntries) || teamMembers.length === 0) return;
            const totals: Record<string, number> = {};
            for (const entry of rewardLedgerEntries) {
                if (!entry?.teamMemberId) continue;
                totals[entry.teamMemberId] = (totals[entry.teamMemberId] || 0) + Number(entry.amount || 0);
            }
            setTeamMembers(prev => {
                let changed = false;
                const next = prev.map(m => {
                    const computed = Object.prototype.hasOwnProperty.call(totals, m.id) ? totals[m.id] : 0;
                    if (Number(m.rewardBalance || 0) !== Number(computed)) {
                        changed = true;
                        return { ...m, rewardBalance: computed };
                    }
                    return m;
                });
                return changed ? next : prev;
            });
        } catch (e) {
            console.warn('[Rewards] Failed to recompute reward balances from ledger.', e);
        }
    }, [rewardLedgerEntries, teamMembers.length]);

    // --- Sync clients from lazy loading hook with REALTIME ---
    useEffect(() => {
        if (appData.loaded.clients) {
            setClients(appData.clients);
        }

        const channel = supabase.channel('realtime-clients')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
                console.log('Client change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setClients(currentClients => [payload.new as Client, ...currentClients]);
                }
                if (payload.eventType === 'UPDATE') {
                    setClients(currentClients =>
                        currentClients.map(c => c.id === payload.new.id ? { ...c, ...payload.new } as Client : c)
                    );
                }
                if (payload.eventType === 'DELETE') {
                    setClients(currentClients => currentClients.filter(c => c.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [appData.clients, appData.loaded.clients]);

    // --- Sync team members from lazy loading hook with REALTIME ---
    useEffect(() => {
        if (appData.loaded.teamMembers) {
            setTeamMembers(appData.teamMembers);
        }

        const channel = supabase.channel('realtime-team-members')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, (payload) => {
                console.log('Team member change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setTeamMembers(current => [payload.new as TeamMember, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setTeamMembers(current =>
                        current.map(m => m.id === payload.new.id ? { ...m, ...payload.new } as TeamMember : m)
                    );
                }
                if (payload.eventType === 'DELETE') {
                    setTeamMembers(current => current.filter(m => m.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [appData.teamMembers, appData.loaded.teamMembers]);

    // --- Sync contracts from lazy loading hook with REALTIME ---
    useEffect(() => {
        if (appData.loaded.contracts) {
            setContracts(appData.contracts);
        }

        const channel = supabase.channel('realtime-contracts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, (payload) => {
                console.log('Contract change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setContracts(current => {
                        const next = payload.new as Contract;
                        const exists = current.some(c => c.id === next.id);
                        if (exists) {
                            return current.map(c => (c.id === next.id ? { ...c, ...next } : c));
                        }
                        return [next, ...current];
                    });
                }
                if (payload.eventType === 'UPDATE') {
                    setContracts(current =>
                        current.map(c => c.id === payload.new.id ? { ...c, ...payload.new } as Contract : c)
                    );
                }
                if (payload.eventType === 'DELETE') {
                    setContracts(current => current.filter(c => c.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [appData.contracts, appData.loaded.contracts]);

    // --- Sync SOPs from lazy loading hook with REALTIME ---
    useEffect(() => {
        if (appData.loaded.sops) {
            setSops(appData.sops);
        }

        const channel = supabase.channel('realtime-sops')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sops' }, (payload) => {
                console.log('SOP change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setSops(current => [payload.new as SOP, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setSops(current =>
                        current.map(s => s.id === payload.new.id ? { ...s, ...payload.new } as SOP : s)
                    );
                }
                if (payload.eventType === 'DELETE') {
                    setSops(current => current.filter(s => s.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [appData.sops, appData.loaded.sops]);

    // --- Sync transactions from lazy loading hook with REALTIME ---
    useEffect(() => {
        if (appData.loaded.transactions) {
            setTransactions(appData.transactions);
        }

        const channel = supabase.channel('realtime-transactions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                console.log('Transaction change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setTransactions(current => [payload.new as Transaction, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setTransactions(current =>
                        current.map(t => t.id === payload.new.id ? { ...t, ...payload.new } as Transaction : t)
                    );
                }
                if (payload.eventType === 'DELETE') {
                    setTransactions(current => current.filter(t => t.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [appData.transactions, appData.loaded.transactions]);

    // --- Sync projects from lazy loading hook (which already uses relations) with REALTIME ---
    useEffect(() => {
        if (appData.loaded.projects) {
            // Prefer projects from appData (loaded via listProjectsWithRelations)
            setProjects(appData.projects as any);
        }
        // Keep existing realtime subscription below to capture future changes on 'projects'
    }, [appData.projects, appData.loaded.projects]);

    // Helper: map DB row (snake_case) to Card interface (camelCase)
    const mapCardRowToCard = (row: any): Card => ({
        id: row.id,
        cardHolderName: row.card_holder_name,
        bankName: row.bank_name,
        cardType: row.card_type as CardType,
        lastFourDigits: row.last_four_digits ?? '',
        expiryDate: row.expiry_date ?? undefined,
        balance: Number(row.balance || 0),
        colorGradient: row.color_gradient || 'from-slate-200 to-slate-400',
    });

    // --- [NEW] Realtime: cards ---
    useEffect(() => {
        const channel = supabase.channel('realtime-cards')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, (payload) => {
                console.log('Card change received!', payload);
                if (payload.eventType === 'INSERT') {
                    const next = mapCardRowToCard(payload.new);
                    setCards(current => {
                        const exists = current.some(c => c.id === next.id);
                        return exists ? current.map(c => c.id === next.id ? next : c) : [next, ...current];
                    });
                }
                if (payload.eventType === 'UPDATE') {
                    const next = mapCardRowToCard(payload.new);
                    setCards(current => {
                        const exists = current.some(c => c.id === next.id);
                        return exists ? current.map(c => c.id === next.id ? next : c) : [next, ...current];
                    });
                }
                if (payload.eventType === 'DELETE') {
                    setCards(current => current.filter(c => c.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // --- [NEW] Realtime: pockets ---
    useEffect(() => {
        const channel = supabase.channel('realtime-pockets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pockets' }, (payload) => {
                console.log('Pocket change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setPockets(current => [payload.new as unknown as FinancialPocket, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setPockets(current => current.map(p => p.id === (payload.new as any).id ? { ...p, ...payload.new } as any : p));
                }
                if (payload.eventType === 'DELETE') {
                    setPockets(current => current.filter(p => p.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // --- [NEW] Realtime: reward_ledger_entries ---
    useEffect(() => {
        const channel = supabase.channel('realtime-reward-ledger-entries')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_ledger_entries' }, (payload) => {
                console.log('RewardLedgerEntry change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setRewardLedgerEntries(current => [payload.new as RewardLedgerEntry, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setRewardLedgerEntries(current => current.map(e => e.id === (payload.new as any).id ? { ...e, ...payload.new } as RewardLedgerEntry : e));
                }
                if (payload.eventType === 'DELETE') {
                    setRewardLedgerEntries(current => current.filter(e => e.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // --- [NEW] One-time migration: teamPaymentRecords from localStorage to Supabase ---
    useEffect(() => {
        const KEY = 'vena-teamPaymentRecords';
        const FLAG = 'vena-teamPaymentRecords-migrated';
        if ((window as any)[FLAG] || window.localStorage.getItem(FLAG) === 'yes') return;
        try {
            const raw = window.localStorage.getItem(KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) return;
            (async () => {
                try {
                    // Lazy import to avoid circulars
                    const mod = await import('./services/teamPaymentRecords');
                    for (const rec of parsed) {
                        try {
                            await mod.createTeamPaymentRecord({
                                recordNumber: rec.recordNumber,
                                teamMemberId: rec.teamMemberId,
                                date: rec.date,
                                projectPaymentIds: rec.projectPaymentIds || [],
                                totalAmount: rec.totalAmount || 0,
                                vendorSignature: rec.vendorSignature || null,
                            } as any);
                        } catch {}
                    }
                    window.localStorage.setItem(FLAG, 'yes');
                    window.localStorage.removeItem(KEY);
                    console.info('[Migration] teamPaymentRecords migrated to Supabase.');
                } catch (err) {
                    console.warn('[Migration] teamPaymentRecords migration failed.', err);
                }
            })();
        } catch {}
    }, []);

    // --- [NEW] Load team payment records from Supabase on init and clear legacy localStorage ---
    useEffect(() => {
        try { window.localStorage.removeItem('vena-teamPaymentRecords'); } catch {}
        let isMounted = true;
        (async () => {
            try {
                const remote = await listTeamPaymentRecordsFromDb();
                if (!isMounted) return;
                setTeamPaymentRecords(Array.isArray(remote) ? remote : []);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch team payment records.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- [NEW] Load reward ledger entries from Supabase on init ---
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const remote = await listRewardLedgerEntriesFromDb();
                if (!isMounted) return;
                setRewardLedgerEntries(Array.isArray(remote) ? remote : []);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch reward ledger entries.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    

    // --- [NEW] Load pockets from Supabase on init and clear legacy localStorage ---
    useEffect(() => {
        try { window.localStorage.removeItem('vena-pockets'); } catch {}
        let isMounted = true;
        (async () => {
            try {
                const remote = await listPocketsFromDb();
                if (!isMounted) return;
                setPockets(Array.isArray(remote) ? (remote as any) : []);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch pockets.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- [NEW] Load packages from Supabase on init and clear legacy localStorage ---
    useEffect(() => {
        try { window.localStorage.removeItem('vena-packages'); } catch {}
        let isMounted = true;
        (async () => {
            try {
                const remote = await listPackages();
                if (!isMounted) return;
                if (Array.isArray(remote) && remote.length) setPackages(remote as any);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch packages.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- [NEW] Load add-ons from Supabase on init and clear legacy localStorage ---
    useEffect(() => {
        try { window.localStorage.removeItem('vena-addOns'); } catch {}
        let isMounted = true;
        (async () => {
            try {
                const remote = await listAddOns();
                if (!isMounted) return;
                if (Array.isArray(remote) && remote.length) setAddOns(remote as any);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch add-ons.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // --- [NEW] Load leads from Supabase on init and clear legacy localStorage ---
    useEffect(() => {
        try { window.localStorage.removeItem('vena-leads'); } catch {}
        let isMounted = true;
        (async () => {
            try {
                const remoteLeads = await listLeadsFromDb();
                if (!isMounted) return;
                setLeads(Array.isArray(remoteLeads) ? remoteLeads : []);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch leads.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- [NEW] Load client feedback from Supabase on init ---
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const remote = await listClientFeedbackFromDb();
                if (!isMounted) return;
                setClientFeedback(Array.isArray(remote) ? remote : []);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch client feedback.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- [NEW] Load profile from Supabase on init and clear legacy localStorage ---
    useEffect(() => {
        try { window.localStorage.removeItem('vena-profile'); } catch {}
        let isMounted = true;
        (async () => {
            try {
                const remote = await getProfileFromDb();
                if (!isMounted) return;
                if (remote) setProfile(remote);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch profile, using defaults.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- [NEW] Ensure teamProjectPayments sourced only from Supabase ---
    useEffect(() => {
        try { window.localStorage.removeItem('vena-teamProjectPayments'); } catch {}
        let isMounted = true;
        (async () => {
            try {
                const remote = await listAllTeamPayments();
                if (!isMounted) return;
                setTeamProjectPayments(Array.isArray(remote) ? remote : []);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch team project payments.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- [NEW] Load users from Supabase on init ---
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const remote = await listUsersFromDb();
                if (!isMounted) return;
                setUsers(Array.isArray(remote) ? remote : []);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch users, using empty list.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    

    // --- [NEW] Load cards from Supabase on init (mapped fields) ---
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const remoteCards = await listCardsFromDb();
                if (!isMounted) return;
                if (Array.isArray(remoteCards) && remoteCards.length) {
                    const mapped = remoteCards.map((r: any) => ({
                        id: r.id,
                        bankName: r.bank_name,
                        cardHolderName: r.card_holder_name,
                        lastFourDigits: r.last_four_digits,
                        balance: Number(r.balance || 0),
                        expiryDate: r.expiry_date || '',
                        colorGradient: r.color_gradient || '',
                        cardType: r.card_type,
                    }));
                    setCards(mapped as any);
                }
            } catch (e) {
                console.warn('[Supabase] Failed to fetch cards, falling back to local data.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    

    // --- [NEW] Load promo codes from Supabase on init ---
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const remotePromos = await listPromoCodes();
                if (!isMounted) return;
                if (Array.isArray(remotePromos) && remotePromos.length) {
                    setPromoCodes(remotePromos as any);
                }
            } catch (e) {
                console.warn('[Supabase] Failed to fetch promo codes, falling back to local data.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    

    

    // --- [NEW] Load assets from Supabase on init ---
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const remoteAssets = await listAssets();
                if (!isMounted) return;
                if (Array.isArray(remoteAssets) && remoteAssets.length) {
                    setAssets(remoteAssets as any);
                }
            } catch (e) {
                console.warn('[Supabase] Failed to fetch assets, falling back to local data.', e);
            }
        })();
        return () => { isMounted = false; };
    }, []);

    // --- [NEW] Load social posts from Supabase on init with REALTIME ---
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const remote = await listSocialPosts();
                if (!isMounted) return;
                setSocialMediaPosts(Array.isArray(remote) ? remote : []);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch social posts.', e);
            }
        })();

        const channel = supabase.channel('realtime-social-posts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'social_media_posts' }, (payload) => {
                console.log('Social post change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setSocialMediaPosts(current => [payload.new as SocialMediaPost, ...current]);
                }
                if (payload.eventType === 'UPDATE') {
                    setSocialMediaPosts(current => current.map(p => p.id === payload.new.id ? { ...(p as any), ...(payload.new as any) } : p));
                }
                if (payload.eventType === 'DELETE') {
                    setSocialMediaPosts(current => current.filter(p => p.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    // --- [NEW] Load SOPs from Supabase on init ---
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const remoteSops = await listSOPs();
                if (!isMounted) return;
                if (Array.isArray(remoteSops) && remoteSops.length) {
                    setSops(remoteSops as any);
                }
            } catch (e) {
                console.warn('[Supabase] Failed to fetch SOPs, falling back to local data.', e);
            }
        })();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- [NEW] Ensure projects are sourced only from Supabase (clear legacy localStorage key) ---
    useEffect(() => {
        try {
            window.localStorage.removeItem('vena-projects');
        } catch {}
    }, []);

    // --- [MODIFIED] Load projects from Supabase on init with REALTIME ---
    useEffect(() => {
        let isMounted = true;

        // 1. Initial fetch (with relations so team assignments are available)
        const fetchProjects = async () => {
            try {
                const remoteProjects = await listProjectsWithRelations();
                if (isMounted) {
                    setProjects(Array.isArray(remoteProjects) ? (remoteProjects as any) : []);
                }
            } catch (e) {
                console.warn('[Supabase] Failed to fetch initial projects.', e);
            }
        };

        fetchProjects();

        // 2. Realtime subscription
        const channel = supabase.channel('realtime-projects')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
                console.log('Project change received!', payload);
                if (payload.eventType === 'INSERT') {
                    setProjects(currentProjects => [payload.new as Project, ...currentProjects]);
                }
                if (payload.eventType === 'UPDATE') {
                    setProjects(currentProjects =>
                        currentProjects.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as Project : p)
                    );
                }
                if (payload.eventType === 'DELETE') {
                    setProjects(currentProjects => currentProjects.filter(p => p.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        // 3. Cleanup
        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

  useEffect(() => {
    const handleHashChange = () => {
        const newRoute = window.location.hash || '#/home';
        setRoute(newRoute);
        if (!isAuthenticated) {
            const isPublicRoute = newRoute.startsWith('#/public') || newRoute.startsWith('#/feedback') || newRoute.startsWith('#/suggestion-form') || newRoute.startsWith('#/revision-form') || newRoute.startsWith('#/portal') || newRoute.startsWith('#/freelancer-portal') || newRoute.startsWith('#/login') || newRoute === '#/home' || newRoute === '#';
            if (!isPublicRoute) {
                window.location.hash = '#/home';
            }
        } else {
            // Allow authenticated users to stay on Home if they are there on initial load.
            // Only redirect away from explicit auth landing pages like login or empty hash.
            const shouldRedirectFrom = newRoute.startsWith('#/login') || newRoute === '#';
            if (shouldRedirectFrom) {
                window.location.hash = '#/dashboard';
            }
        }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);

  useEffect(() => {
      const path = (route.split('?')[0].split('/')[1] || 'home').toLowerCase();
      const newView = Object.values(ViewType).find(v => 
          v.toLowerCase().replace(/ /g, '-') === path
      );
      if (newView) {
          setActiveView(newView);
      } else if (path === 'team') { // Handle 'Freelancer' mapping to 'team' route
          setActiveView(ViewType.TEAM);
      }
  }, [route]);

  // Ensure data loads when activeView changes (covers direct URL/hash navigation)
  useEffect(() => {
      switch (activeView) {
          case ViewType.CLIENTS:
              if (!appData.loaded.clients && !appData.loading.clients) appData.loadClients();
              break;
          case ViewType.PROJECTS:
              if (!appData.loaded.projects && !appData.loading.projects) appData.loadProjects();
              // Ensure freelancers are available in Projects view without visiting Freelancers page
              if (!appData.loaded.teamMembers && !appData.loading.teamMembers) appData.loadTeamMembers();
              // Load team payments once for Projects view
              if (!teamPaymentsLoaded) {
                  (async () => {
                      try {
                          const items = await listAllTeamPayments();
                          setTeamProjectPayments(items);
                          setTeamPaymentsLoaded(true);
                      } catch (e) {
                          console.warn('[TeamPayments] Failed to fetch team project payments:', e);
                      }
                  })();
              }
              break;
          case ViewType.TEAM:
              if (!appData.loaded.teamMembers && !appData.loading.teamMembers) appData.loadTeamMembers();
              break;
          case ViewType.CONTRACTS:
              if (!appData.loaded.contracts && !appData.loading.contracts) appData.loadContracts();
              break;
          case ViewType.SOP:
              if (!appData.loaded.sops && !appData.loading.sops) appData.loadSOPs();
              break;
          case ViewType.FINANCE:
              if (!appData.loaded.transactions && !appData.loading.transactions) appData.loadTransactions();
              break;
          default:
              break;
      }
  }, [activeView, appData.loaded.clients, appData.loading.clients, appData.loaded.projects, appData.loading.projects, appData.loaded.teamMembers, appData.loading.teamMembers, appData.loaded.contracts, appData.loading.contracts, appData.loaded.sops, appData.loading.sops, appData.loaded.transactions, appData.loading.transactions]);
  
  useEffect(() => {
        const styleElement = document.getElementById('public-theme-style');
        const isPublicRoute = route.startsWith('#/public') || route.startsWith('#/portal') || route.startsWith('#/freelancer-portal');
        
        document.body.classList.toggle('app-theme', !isPublicRoute);
        document.body.classList.toggle('public-page-body', isPublicRoute);

        if (isPublicRoute) {
            const brandColor = profile.brandColor || '#3b82f6';
            
            if (styleElement) {
                const hoverColor = darkenColor(brandColor, 10);
                const brandHsl = hexToHsl(brandColor);
                styleElement.innerHTML = `
                    :root {
                        --public-accent: ${brandColor};
                        --public-accent-hover: ${hoverColor};
                        --public-accent-hsl: ${brandHsl};
                    }
                `;
            }
        } else if (styleElement) {
            styleElement.innerHTML = '';
        }

    }, [route, profile.brandColor]);

    // Ensure required data is loaded when visiting public portal routes directly
    useEffect(() => {
        if (route.startsWith('#/portal/')) {
            if (!appData.loaded.clients && !appData.loading.clients) appData.loadClients();
            if (!appData.loaded.projects && !appData.loading.projects) appData.loadProjects();
            if (!appData.loaded.contracts && !appData.loading.contracts) appData.loadContracts();
            if (!appData.loaded.transactions && !appData.loading.transactions) appData.loadTransactions();
            if (!appData.loaded.sops && !appData.loading.sops) appData.loadSOPs?.();
        }
        if (route.startsWith('#/freelancer-portal/')) {
            if (!appData.loaded.teamMembers && !appData.loading.teamMembers) appData.loadTeamMembers();
            if (!appData.loaded.projects && !appData.loading.projects) appData.loadProjects();
            if (!appData.loaded.contracts && !appData.loading.contracts) appData.loadContracts();
            if (!appData.loaded.transactions && !appData.loading.transactions) appData.loadTransactions();
            if (!appData.loaded.sops && !appData.loading.sops) appData.loadSOPs?.();
        }
    }, [route, appData.loaded, appData.loading]);

  const showNotification = (message: string, duration: number = 3000) => {
    setNotification(message);
    setTimeout(() => {
      setNotification('');
    }, duration);
  };

  const handleSetProfile = (value: React.SetStateAction<Profile>) => {
    setProfile(value);
  };

  const handleLoginSuccess = (user: User) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    window.location.hash = '#/dashboard';
  };
  
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    window.location.hash = '#/home';
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
  };
  
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNavigation = (view: ViewType, action?: NavigationAction, notificationId?: string) => {
    const pathMap: Partial<Record<ViewType, string>> = {
      [ViewType.HOMEPAGE]: 'home',
      [ViewType.DASHBOARD]: 'dashboard',
      [ViewType.PROSPEK]: 'prospek',
      [ViewType.BOOKING]: 'booking',
      [ViewType.CLIENTS]: 'clients',
      [ViewType.PROJECTS]: 'projects',
      [ViewType.TEAM]: 'team',
      [ViewType.FINANCE]: 'finance',
    [ViewType.CALENDAR]: 'calendar',
    [ViewType.SOCIAL_MEDIA_PLANNER]: 'social-media-planner',
    [ViewType.PACKAGES]: 'packages',
    [ViewType.ASSETS]: 'assets',
      [ViewType.CONTRACTS]: 'contracts',
      [ViewType.PROMO_CODES]: 'promo-codes',
      [ViewType.SOP]: 'sop',
      [ViewType.CLIENT_REPORTS]: 'client-reports',
      [ViewType.SETTINGS]: 'settings',
    };

    const newRoute = `#/${pathMap[view] || view.toLowerCase().replace(/ /g, '-')}`;

    window.location.hash = newRoute;

    // Lazy load data based on view
    switch (view) {
      case ViewType.CLIENTS:
        appData.loadClients();
        break;
      case ViewType.PROJECTS:
        appData.loadProjects();
        appData.loadTeamMembers();
        break;
      case ViewType.TEAM:
        appData.loadTeamMembers();
        break;
      case ViewType.CONTRACTS:
        appData.loadContracts();
        break;
      case ViewType.SOP:
        appData.loadSOPs();
        break;
      case ViewType.FINANCE:
        appData.loadTransactions();
        break;
    }

    setActiveView(view);
    setInitialAction(action || null);
    setIsSidebarOpen(false); // Close sidebar on navigation
    setIsSearchOpen(false); // Close search on navigation
    
    if (notificationId) {
      handleMarkAsRead(notificationId);
    }
  };

  const hasPermission = (view: ViewType) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    return currentUser.permissions?.includes(view) || false;
  };
  
  const renderView = () => {
    if (!hasPermission(activeView)) {
        return <AccessDenied onBackToDashboard={() => setActiveView(ViewType.DASHBOARD)} />;
    }
    switch (activeView) {
      case ViewType.DASHBOARD:
        return <Dashboard 
          projects={projects} 
          clients={clients} 
          transactions={transactions} 
          teamMembers={teamMembers}
          cards={cards}
          pockets={pockets}
          handleNavigation={handleNavigation}
          leads={leads}
          teamProjectPayments={teamProjectPayments}
          packages={packages}
          assets={assets}
          clientFeedback={clientFeedback}
          contracts={contracts}
          currentUser={currentUser}
          projectStatusConfig={profile.projectStatusConfig}
        />;
      case ViewType.PROSPEK:
        return <Leads
            leads={leads} setLeads={setLeads}
            clients={clients} setClients={setClients}
            projects={projects} setProjects={setProjects}
            packages={packages} addOns={addOns}
            transactions={transactions} setTransactions={setTransactions}
            userProfile={profile} setProfile={handleSetProfile} showNotification={showNotification}
            cards={cards} setCards={setCards}
            pockets={pockets} setPockets={setPockets}
            promoCodes={promoCodes} setPromoCodes={setPromoCodes}
            handleNavigation={handleNavigation}
        />;
      case ViewType.BOOKING:
        return <Booking
            leads={leads}
            clients={clients}
            projects={projects}
            setProjects={setProjects}
            packages={packages}
            userProfile={profile}
            setProfile={setProfile}
            handleNavigation={handleNavigation}
            showNotification={showNotification}
        />;
      case ViewType.CLIENTS:
        return (
          <DataLoadingWrapper
            loading={appData.loading.clients}
            loaded={appData.loaded.clients}
            loadingMessage="Memuat data klien..."
            onRetry={appData.loadClients}
          >
            <Clients
              clients={clients} setClients={setClients}
              projects={projects} setProjects={setProjects}
              packages={packages} addOns={addOns}
              transactions={transactions} setTransactions={setTransactions}
              userProfile={profile}
              showNotification={showNotification}
          initialAction={initialAction} setInitialAction={setInitialAction}
          cards={cards} setCards={setCards}
          pockets={pockets} setPockets={setPockets}
          contracts={contracts}
          handleNavigation={handleNavigation}
          clientFeedback={clientFeedback}
          promoCodes={promoCodes} setPromoCodes={setPromoCodes}
          onSignInvoice={async (pId, sig) => {
            // Optimistic UI
            setProjects(prev => prev.map(p => p.id === pId ? { ...p, invoiceSignature: sig } : p));
            try {
              await updateProjectInDb(pId, { invoiceSignature: sig } as any);
            } catch (e) {
              console.warn('[App] Failed to persist invoice signature:', e);
            }
          }}
          onSignTransaction={async (tId, sig) => {
            // Optimistic UI
            setTransactions(prev => prev.map(t => t.id === tId ? { ...t, vendorSignature: sig } : t));
            try {
              await updateTransactionInDb(tId, { vendorSignature: sig } as any);
            } catch (e) {
              console.warn('[App] Failed to persist transaction signature:', e);
            }
          }}
          onRecordPayment={async (projectId: string, amount: number, destinationCardId: string) => {
            try {
              const today = new Date().toISOString().split('T')[0];
              const proj = projects.find(p => p.id === projectId);
              if (!proj) return;
              // Create income transaction
              const tx = await createTransaction({
                date: today,
                description: `Pembayaran Proyek ${proj.projectName}`,
                amount,
                type: TransactionType.INCOME,
                projectId,
                category: 'Pelunasan Proyek',
                method: 'Transfer Bank',
                cardId: destinationCardId,
              } as any);
              // Update card balance
              if (destinationCardId) {
                try { await updateCardBalance(destinationCardId, amount); } catch {}
                setCards(prev => prev.map(c => c.id === destinationCardId ? { ...c, balance: (c.balance || 0) + amount } : c));
              }
              // Update project payment fields
              const newAmountPaid = (proj.amountPaid || 0) + amount;
              let newPaymentStatus = PaymentStatus.BELUM_BAYAR as any;
              if (newAmountPaid >= proj.totalCost) newPaymentStatus = PaymentStatus.LUNAS;
              else if (newAmountPaid > 0) newPaymentStatus = PaymentStatus.DP_TERBAYAR;
              // Optimistic UI
              setProjects(prev => prev.map(p => p.id === projectId ? { ...p, amountPaid: newAmountPaid, paymentStatus: newPaymentStatus } : p));
              // Persist to Supabase
              try { await updateProjectInDb(projectId, { amountPaid: newAmountPaid, paymentStatus: newPaymentStatus } as any); } catch {}
              // Update transactions list
              setTransactions(prev => [tx, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
              showNotification('Pembayaran berhasil dicatat.');
            } catch (e) {
              console.warn('[Clients] Failed to record payment:', e);
              showNotification('Gagal mencatat pembayaran. Coba lagi.');
            }
          }}
          addNotification={addNotification}
            />
          </DataLoadingWrapper>
        );
      case ViewType.PROJECTS:
        return (
          <DataLoadingWrapper
            loading={appData.loading.projects}
            loaded={appData.loaded.projects}
            loadingMessage="Memuat data proyek..."
            onRetry={appData.loadProjects}
          >
            <Projects 
              projects={projects} setProjects={setProjects}
          clients={clients}
          packages={packages}
          teamMembers={teamMembers}
          teamProjectPayments={teamProjectPayments} setTeamProjectPayments={setTeamProjectPayments}
          transactions={transactions} setTransactions={setTransactions}
          initialAction={initialAction} setInitialAction={setInitialAction}
          profile={profile}
          showNotification={showNotification}
          cards={cards}
          setCards={setCards}
            />
          </DataLoadingWrapper>
        );
      case ViewType.TEAM:
        return (
          <DataLoadingWrapper
            loading={appData.loading.teamMembers}
            loaded={appData.loaded.teamMembers}
            loadingMessage="Memuat data tim..."
            onRetry={appData.loadTeamMembers}
          >
            <Freelancers
            teamMembers={teamMembers}
            setTeamMembers={setTeamMembers}
            teamProjectPayments={teamProjectPayments}
            setTeamProjectPayments={setTeamProjectPayments}
            teamPaymentRecords={teamPaymentRecords}
            setTeamPaymentRecords={setTeamPaymentRecords}
            transactions={transactions}
            setTransactions={setTransactions}
            userProfile={profile}
            showNotification={showNotification}
            initialAction={initialAction}
            setInitialAction={setInitialAction}
            projects={projects}
            setProjects={setProjects}
            rewardLedgerEntries={rewardLedgerEntries}
            setRewardLedgerEntries={setRewardLedgerEntries}
            pockets={pockets}
            setPockets={setPockets}
            cards={cards}
            setCards={setCards}
            onSignPaymentRecord={(rId, sig) => setTeamPaymentRecords(prev => prev.map(r => r.id === rId ? { ...r, vendorSignature: sig } : r))}
            />
          </DataLoadingWrapper>
        );
      case ViewType.FINANCE:
        return (
          <DataLoadingWrapper
            loading={appData.loading.transactions}
            loaded={appData.loaded.transactions}
            loadingMessage="Memuat data transaksi..."
            onRetry={appData.loadTransactions}
          >
            <Finance 
              transactions={transactions} setTransactions={setTransactions} 
              pockets={pockets} setPockets={setPockets}
              projects={projects} 
              profile={profile}
              cards={cards} setCards={setCards}
              teamMembers={teamMembers}
              rewardLedgerEntries={rewardLedgerEntries}
              setRewardLedgerEntries={setRewardLedgerEntries}
            />
          </DataLoadingWrapper>
        );
      case ViewType.PACKAGES:
        return <Packages packages={packages} setPackages={setPackages} addOns={addOns} setAddOns={setAddOns} projects={projects} profile={profile} />;
      case ViewType.ASSETS:
        return <Assets assets={assets} setAssets={setAssets} profile={profile} showNotification={showNotification} />;
      case ViewType.CONTRACTS:
        return (
          <DataLoadingWrapper
            loading={appData.loading.contracts}
            loaded={appData.loaded.contracts}
            loadingMessage="Memuat kontrak..."
            onRetry={appData.loadContracts}
          >
            <Contracts 
                contracts={contracts} setContracts={setContracts}
                clients={clients} projects={projects} profile={profile}
                showNotification={showNotification}
                initialAction={initialAction} setInitialAction={setInitialAction}
                packages={packages}
                onSignContract={async (cId, sig, signer) => {
          // Optimistic UI
          setContracts(prev => prev.map(c => c.id === cId ? { ...c, [signer === 'vendor' ? 'vendorSignature' : 'clientSignature']: sig } : c));
          try {
            const patch: any = { [signer === 'vendor' ? 'vendorSignature' : 'clientSignature']: sig };
            await updateContractInDb(cId, patch);
          } catch (e) {
            console.warn('[App] Failed to persist contract signature:', e);
          }
        }}
            />
          </DataLoadingWrapper>
        );
      case ViewType.SOP:
        return (
          <DataLoadingWrapper
            loading={appData.loading.sops}
            loaded={appData.loaded.sops}
            loadingMessage="Memuat SOP..."
            onRetry={appData.loadSOPs}
          >
            <SOPManagement sops={sops} setSops={setSops} profile={profile} showNotification={showNotification} />
          </DataLoadingWrapper>
        );
      case ViewType.SETTINGS:
        return <Settings 
          profile={profile} setProfile={handleSetProfile} 
          transactions={transactions} projects={projects}
          packages={packages}
          users={users}
          setUsers={setUsers}
          currentUser={currentUser}
        />;
      case ViewType.CALENDAR:
        return <CalendarView projects={projects} setProjects={setProjects} teamMembers={teamMembers} profile={profile} />;
      case ViewType.CLIENT_REPORTS:
        return <ClientReports 
            clients={clients}
            leads={leads}
            projects={projects}
            feedback={clientFeedback}
            setFeedback={setClientFeedback}
            showNotification={showNotification}
        />;
      case ViewType.SOCIAL_MEDIA_PLANNER:
        return <SocialPlanner posts={socialMediaPosts} setPosts={setSocialMediaPosts} projects={projects} showNotification={showNotification} />;
      case ViewType.PROMO_CODES:
        return <PromoCodes promoCodes={promoCodes} setPromoCodes={setPromoCodes} projects={projects} showNotification={showNotification} />;
      default:
        return <div />;
    }
  };
  
  // --- ROUTING LOGIC ---
  if (route.startsWith('#/home') || route === '#/') return <Homepage />;
  if (route.startsWith('#/login')) return <Login onLoginSuccess={handleLoginSuccess} users={users} />;
  
  if (route.startsWith('#/public-packages')) {
    return <PublicPackages 
        userProfile={profile}
        showNotification={showNotification}
        setClients={setClients}
        setProjects={setProjects}
        setTransactions={setTransactions}
        setCards={setCards}
        setLeads={setLeads}
        addNotification={addNotification}
        cards={cards}
        projects={projects}
        promoCodes={promoCodes}
        setPromoCodes={setPromoCodes}
    />;
  }
  if (route.startsWith('#/public-booking')) {
    const allDataForForm = { clients, projects, teamMembers, transactions, teamProjectPayments, teamPaymentRecords, pockets, profile, leads, rewardLedgerEntries, cards, assets, contracts, clientFeedback, notifications, socialMediaPosts, promoCodes, sops, packages, addOns };
    return <PublicBookingForm {...allDataForForm} userProfile={profile} showNotification={showNotification} setClients={setClients} setProjects={setProjects} setTransactions={setTransactions} setCards={setCards} setPockets={setPockets} setPromoCodes={setPromoCodes} setLeads={setLeads} addNotification={addNotification} />;
  }
  if (route.startsWith('#/public-lead-form')) {
    // FIX: Pass addNotification prop to PublicLeadForm
    return <PublicLeadForm setLeads={setLeads} userProfile={profile} showNotification={showNotification} addNotification={addNotification} />;
  }
  
  if (route.startsWith('#/feedback')) return <PublicFeedbackForm setClientFeedback={setClientFeedback} />;
  if (route.startsWith('#/suggestion-form')) return <SuggestionForm setLeads={setLeads} />;
  if (route.startsWith('#/revision-form')) return <PublicRevisionForm projects={projects} teamMembers={teamMembers} />;
  if (route.startsWith('#/test-signature')) return <TestSignature />;
  if (route.startsWith('#/portal/')) {
    // Normalize accessId: cut off after next '/' or any query/hash, and decode
    const raw = route.split('/portal/')[1] || '';
    const accessId = decodeURIComponent((raw.split(/[?#]/)[0] || '').split('/')[0] || '').trim();
    return <ClientPortal 
        accessId={accessId} 
        clients={clients} 
        projects={projects} 
        setClientFeedback={setClientFeedback} 
        showNotification={showNotification} 
        contracts={contracts} 
        transactions={transactions} 
        userProfile={profile} 
        packages={packages}
        onClientConfirmation={async (pId, stage) => {
            // Optimistic update
            setProjects(prev => prev.map(p => p.id === pId ? {
                ...p,
                [`is${stage.charAt(0).toUpperCase() + stage.slice(1)}ConfirmedByClient`]: true
            } : p));
            // Persist to DB
            try {
                const fieldMap: Record<string, keyof Project> = {
                    editing: 'isEditingConfirmedByClient',
                    printing: 'isPrintingConfirmedByClient',
                    delivery: 'isDeliveryConfirmedByClient',
                } as any;
                const key = fieldMap[stage];
                if (key) {
                    await updateProjectInDb(pId, { [key]: true } as any);
                }
            } catch (e) {
                console.warn('[Portal] Failed to persist client confirmation:', e);
            }
        }}
        onClientSubStatusConfirmation={async (pId, sub, note) => {
            // Optimistic update
            setProjects(prev => prev.map(p => p.id === pId ? {
                ...p,
                confirmedSubStatuses: [...(p.confirmedSubStatuses || []), sub],
                clientSubStatusNotes: { ...(p.clientSubStatusNotes || {}), [sub]: note }
            } : p));
            // Persist to DB
            try {
                await markSubStatusConfirmed(pId, sub, note);
            } catch (e) {
                console.warn('[Portal] Failed to persist sub-status confirmation:', e);
            }
        }}
        onSignContract={async (cId, sig, signer) => {
            try {
                const patch = signer === 'vendor' ? { vendorSignature: sig } : { clientSignature: sig };
                const updated = await updateContractInDb(cId, patch as any);
                setContracts(prev => prev.map(c => c.id === cId ? updated : c));
            } catch (e) {
                console.warn('[Portal] Failed to persist signature, applying optimistic update.', e);
                setContracts(prev => prev.map(c => c.id === cId ? {
                    ...c,
                    [signer === 'vendor' ? 'vendorSignature' : 'clientSignature']: sig
                } : c));
            }
        }}
    />
;
  }
  if (route.startsWith('#/freelancer-portal/')) {
     // Normalize accessId: cut off after next '/' or any query/hash, and decode
     const raw = route.split('/freelancer-portal/')[1] || '';
     const accessId = decodeURIComponent((raw.split(/[?#]/)[0] || '').split('/')[0] || '').trim();
     return <FreelancerPortal 
        accessId={accessId} 
        teamMembers={teamMembers} 
        projects={projects} 
        teamProjectPayments={teamProjectPayments} 
        teamPaymentRecords={teamPaymentRecords} 
        rewardLedgerEntries={rewardLedgerEntries}
        showNotification={showNotification} 
        onUpdateRevision={async (pId, rId, data) => {
            // Optimistic update on local state
            const completedAt = new Date().toISOString();
            setProjects(prev => prev.map(p => p.id === pId ? {
                ...p,
                revisions: p.revisions?.map(r => r.id === rId ? { ...r, ...data, completedDate: completedAt } : r)
            } : p));
            // Persist both the revision row and submission log to DB
            try {
                await updateRevisionInDb(pId, rId, {
                    freelancerNotes: (data as any).freelancerNotes,
                    driveLink: (data as any).driveLink,
                    status: (data as any).status,
                    completedDate: completedAt,
                } as any);

                const proj = projects.find(pr => pr.id === pId);
                const rev = proj?.revisions?.find(rv => rv.id === rId);
                const freelancerId = rev?.freelancerId;
                if (freelancerId) {
                    await createRevisionSubmission({
                        projectId: pId,
                        freelancerId,
                        revisionId: rId,
                        freelancerNotes: (data as any).freelancerNotes,
                        driveLink: (data as any).driveLink,
                        status: (data as any).status,
                    } as any);

                    // Send admin notification
                    const freelancerName = teamMembers.find(m => m.id === freelancerId)?.name || 'Freelancer';
                    const projectName = proj?.projectName || 'Proyek';
                    addNotification({
                        title: 'Revisi Diselesaikan',
                        message: `${freelancerName} menandai revisi selesai untuk ${projectName}.`,
                        icon: 'revision',
                        link: { view: ViewType.PROJECTS, action: { type: 'VIEW_PROJECT_DETAILS', id: pId } }
                    });
                }
            } catch (e) {
                console.warn('[Freelancer Portal] Failed to persist revision update/submission:', e);
            }
        }} 
        sops={sops} 
        userProfile={profile} 
        addNotification={addNotification} 
     />;
  }

  if (!isAuthenticated) return <Login onLoginSuccess={handleLoginSuccess} users={users} />;

  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-text-primary">
      <Sidebar 
        activeView={activeView} 
        setActiveView={(view) => handleNavigation(view)} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col xl:pl-64 overflow-hidden">
        <Header 
            pageTitle={activeView} 
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            setIsSearchOpen={setIsSearchOpen}
            notifications={notifications}
            handleNavigation={handleNavigation}
            handleMarkAllAsRead={handleMarkAllAsRead}
            currentUser={currentUser}
            profile={profile}
            handleLogout={handleLogout}
        />
        
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-20 xl:pb-8 overflow-y-auto" 
          style={{ 
            paddingBottom: 'calc(5rem + var(--safe-area-inset-bottom, 0px))'
          }}
        >
            <div className="animate-fade-in">
                                <ErrorBoundary fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="text-red-500 text-4xl mb-2">âš ï¸</div>
                      <p className="text-brand-text-secondary">Gagal memuat komponen. Silakan coba lagi.</p>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="mt-2 button-primary"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                                }>
                                                          <Suspense fallback={<div className="py-12 text-center text-brand-text-secondary">Memuat komponenâ€¦</div>}>
                                                            {renderView()}
                                                        </Suspense>
                                </ErrorBoundary>
            </div>
        </main>
      </div>
      
      {/* Enhanced Notification Toast */}
      {notification && (
        <div className="
            fixed top-4 right-4 
            sm:top-6 sm:right-6
            bg-brand-accent 
            text-white 
            py-3 px-4 sm:py-4 sm:px-6
            rounded-xl 
            shadow-2xl 
            z-50 
            animate-fade-in-out
            backdrop-blur-sm
            border border-brand-accent-hover/20
            max-w-sm
            break-words
        "
        style={{
            top: 'calc(1rem + var(--safe-area-inset-top, 0px))',
            right: 'calc(1rem + var(--safe-area-inset-right, 0px))'
        }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse-soft" />
            <span className="font-medium text-sm sm:text-base">{notification}</span>
          </div>
        </div>
      )}
      
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        clients={clients}
        projects={projects}
        teamMembers={teamMembers}
        handleNavigation={handleNavigation}
      />
      
      <BottomNavBar activeView={activeView} handleNavigation={handleNavigation} />
    </div>
  );
};

export default App;
