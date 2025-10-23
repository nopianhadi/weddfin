import React, { useState, useMemo, useEffect } from 'react';
import { Client, Project, ClientFeedback, SatisfactionLevel, Contract, Transaction, Profile, Package, SubStatusConfig, Revision, RevisionStatus, TransactionType, ClientPortalProps } from '../types';
import { FolderKanbanIcon, ClockIcon, StarIcon, FileTextIcon, HomeIcon, CreditCardIcon, CheckCircleIcon, SendIcon, DownloadIcon, GalleryHorizontalIcon, MessageSquareIcon, PrinterIcon } from '../constants';
import Modal from './Modal';
import SignaturePad from './SignaturePad';
import PrintButton from './PrintButton';
import { createClientFeedback } from '../services/clientFeedback';
import HelpBox from './HelpBox';

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
const formatCurrency = (amount: number, options?: {
    showDecimals?: boolean;
    compact?: boolean;
}) => {
    const { showDecimals = true, compact = false } = options || {};

    // Indonesian currency formatting: Rp 10.416.183,30
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0,
        notation: compact ? 'compact' : 'standard'
    }).format(amount);
};

// Utility function for consistent currency display in documents
const formatDocumentCurrency = (amount: number) => {
    // Always show decimals for formal documents
    return formatCurrency(amount, { showDecimals: true });
};

// Utility function for display in tables/lists (no decimals for cleaner look)
const formatDisplayCurrency = (amount: number) => {
    return formatCurrency(amount, { showDecimals: false });
};

const getSatisfactionFromRating = (rating: number): SatisfactionLevel => {
    if (rating >= 5) return SatisfactionLevel.VERY_SATISFIED;
    if (rating >= 4) return SatisfactionLevel.SATISFIED;
    if (rating >= 3) return SatisfactionLevel.NEUTRAL;
    return SatisfactionLevel.UNSATISFIED;
};


const ClientPortal: React.FC<ClientPortalProps> = ({ accessId, clients, projects, contracts, transactions, setClientFeedback, showNotification, userProfile, packages, onClientConfirmation, onClientSubStatusConfirmation, onSignContract }) => {
    const profile = userProfile;
    const client = useMemo(() => clients.find(c => c.portalAccessId === accessId), [clients, accessId]);
    const isVendorClient = client?.clientType === 'Vendor';

    const [activeTab, setActiveTab] = useState(isVendorClient ? 'proyek' : 'beranda');
    const clientProjects = useMemo(() => projects.filter(p => p.clientId === client?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [projects, client]);
    const clientContracts = useMemo(() => contracts.filter(c => c.clientId === client?.id), [contracts, client]);
    const [viewingDocument, setViewingDocument] = useState<{ type: 'invoice' | 'receipt' | 'contract', project: Project, data: any } | null>(null);
    const template = profile?.publicPageConfig?.template ?? 'classic';

    // Tabs config and memo MUST come before any conditional return to preserve hooks order across renders
    const allTabs = [
        { id: 'beranda', label: 'Beranda', icon: HomeIcon },
        { id: 'proyek', label: 'Proyek Saya', icon: FolderKanbanIcon },
        { id: 'galeri', label: 'Galeri & File', icon: GalleryHorizontalIcon },
        { id: 'keuangan', label: 'Keuangan', icon: CreditCardIcon },
        { id: 'kontrak', label: 'Kontrak', icon: FileTextIcon },
        { id: 'umpan-balik', label: 'Testimoni Pengantin', icon: MessageSquareIcon },
    ];

    const tabs = useMemo(() => {
        if (isVendorClient) {
            return allTabs.filter(tab => ['proyek', 'galeri', 'umpan-balik'].includes(tab.id));
        }
        return allTabs;
    }, [isVendorClient]);

    if (!client) {
        // While clients data may still be loading (e.g., right after reload), avoid flashing a false error
        if (!clients || clients.length === 0) {
            return (
                <div className="flex items-center justify-center min-h-screen p-4 bg-public-bg">
                    <div className="w-full max-w-lg p-8 text-center bg-public-surface rounded-2xl shadow-lg">
                        <h1 className="text-2xl font-bold portal-text-primary">Memuat Portal…</h1>
                        <p className="mt-4 portal-text-secondary">Mohon tunggu sebentar.</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-public-bg">
                <div className="w-full max-w-lg p-8 text-center bg-public-surface rounded-2xl shadow-lg">
                    <h1 className="text-2xl font-bold text-red-500">Portal Tidak Ditemukan</h1>
                    <p className="mt-4 text-public-text-primary">Tautan yang Anda gunakan tidak valid atau sudah tidak berlaku.</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'beranda':
                return <DashboardTab client={client} projects={clientProjects} profile={profile} packages={packages} />;
            case 'proyek':
                return <ProjectsTab projects={clientProjects} profile={profile} onConfirm={onClientSubStatusConfirmation} />;
            case 'galeri':
                return <GalleryTab projects={clientProjects} packages={packages} />;
            case 'keuangan':
                return <FinanceTab projects={clientProjects} contracts={contracts} transactions={transactions} onSignContract={onSignContract} profile={profile} packages={packages} client={client} onViewDocument={setViewingDocument} />;
            case 'kontrak':
                return <ContractsTab contracts={clientContracts} projects={clientProjects} onViewContract={(contract) => setViewingDocument({ type: 'contract', project: clientProjects.find(p => p.id === contract.projectId)!, data: contract })} />;
            case 'umpan-balik':
                return <FeedbackTab client={client} setClientFeedback={setClientFeedback} showNotification={showNotification} />;
            default:
                return null;
        }
    }

    return (
        <div className={`template-wrapper template-${template} min-h-screen portal-gradient`}>
            <style>{`
                .template-wrapper { background-color: var(--public-bg); color: var(--public-text-primary); }
                .portal-surface { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08); }
                .portal-text-primary { color: var(--public-text-primary); }
                .portal-text-secondary { color: var(--public-text-secondary); }
                .portal-border { border-color: rgba(203, 213, 225, 0.5); }
                .portal-accent-text { color: #3b82f6; }
                .portal-accent-bg { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
                .portal-accent-bg-light { background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%); }
                .portal-gradient { background: #ffffff; min-height: 100vh; }
                .portal-card-gradient { background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%); }
            `}</style>
            <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-12 lg:gap-8">
                {/* --- Sidebar (Desktop) --- */}
                <aside className="hidden lg:block lg:col-span-3 xl:col-span-2 py-8">
                    <div className="sticky top-8">
                        <div className="px-4 mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">{profile.companyName}</h1>
                        </div>
                        <nav className="space-y-2 px-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${activeTab === tab.id ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* --- Main Content --- */}
                <main className="lg:col-span-9 xl:col-span-10 p-3 md:p-4 lg:py-8 lg:px-6">
                    <header className="mb-6 md:mb-8 widget-animate">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Selamat Datang, {client.name.split(' ')[0]}! 👋</h2>
                                <p className="text-sm md:text-base text-slate-600 mt-1">Ini adalah pusat informasi untuk semua proyek Anda bersama kami.</p>
                            </div>
                            <div className="lg:w-[360px]">
                                <HelpBox variant="public" phone="085693762240" />
                            </div>
                        </div>
                    </header>
                    <div>
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* --- Bottom Nav (Mobile) --- */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl rounded-t-3xl" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
                <div className="flex justify-around pt-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 transform ${activeTab === tab.id ? 'scale-110' : 'scale-100'
                                }`}
                        >
                            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === tab.id ? 'portal-accent-bg shadow-lg' : 'bg-transparent'}`}>
                                <tab.icon className={`w-6 h-6 transition-colors ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
                            </div>
                            <span className={`text-[10px] font-bold mt-1 transition-colors ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`}>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
            {/* Add padding to the bottom of the body to prevent content from being hidden by the bottom nav */}
            <div className="h-20 lg:hidden"></div>
            <DocumentViewerModal
                viewingDocument={viewingDocument}
                onClose={() => setViewingDocument(null)}
                profile={profile}
                packages={packages}
                client={client}
                onSignContract={onSignContract}
            />
        </div>
    );
};

// --- Portal Tabs as Components ---

const DashboardTab: React.FC<{ client: Client; projects: Project[], profile: Profile, packages: Package[] }> = ({ client, projects, profile, packages }) => {
    const activeProject = useMemo(() => projects.find(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);
    const upcomingProject = useMemo(() => projects.filter(p => new Date(p.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0], [projects]);

    const financialSummary = useMemo(() => {
        const totalValue = projects.reduce((sum, p) => sum + p.totalCost, 0);
        const totalPaid = projects.reduce((sum, p) => sum + p.amountPaid, 0);
        return { totalValue, totalPaid, totalDue: totalValue - totalPaid };
    }, [projects]);
    const activePackage = useMemo(() => {
        if (!activeProject) return null;
        return packages.find(pk => pk.id === activeProject.packageId) || null;
    }, [activeProject, packages]);
    const addOnsTotal = useMemo(() => {
        if (!activeProject) return 0;
        return (activeProject.addOns || []).reduce((s, a) => s + (a.price || 0), 0);
    }, [activeProject]);

    const packagePrice = useMemo(() => {
        if (!activeProject) return 0;

        // Calculate package price with better fallback logic
        let price = 0;
        if ((activeProject as any).unitPrice !== undefined && (activeProject as any).unitPrice !== null && Number((activeProject as any).unitPrice) > 0) {
            price = Number((activeProject as any).unitPrice);
        } else if (activePackage) {
            // If duration selection exists, try to find the price from duration options
            const durationSelection = (activeProject as any).durationSelection;
            if (durationSelection && activePackage.durationOptions && activePackage.durationOptions.length > 0) {
                const durationOption = activePackage.durationOptions.find(opt => opt.label === durationSelection);
                price = durationOption ? Number(durationOption.price) : Number(activePackage.price);
            } else {
                price = Number(activePackage.price);
            }
        } else {
            // Fallback: calculate from total cost minus addons and transport
            const transportCost = Number(activeProject.transportCost || 0);
            const discountAmount = Number(activeProject.discountAmount || 0);
            const subtotal = activeProject.totalCost + discountAmount;
            price = Math.max(0, subtotal - addOnsTotal - transportCost);
        }
        return price;
    }, [activeProject, activePackage, addOnsTotal]);

    return (
        <div className="space-y-6">
            {upcomingProject && (
                <div className="portal-surface p-3 md:p-4 sm:p-6 rounded-3xl shadow-xl border widget-animate hover:scale-[1.02] transition-transform duration-300" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse"></div>
                        <h3 className="text-base md:text-lg font-bold portal-text-primary">Proyek Mendatang</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
                        <div>
                            <p className="font-semibold text-lg md:text-xl text-blue-600">{upcomingProject.projectName}</p>
                            <p className="text-xs md:text-sm portal-text-secondary mt-1 flex items-center gap-1">📍 {upcomingProject.location}</p>
                        </div>
                        <p className="text-sm md:text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 px-3 md:px-4 py-1.5 md:py-2 rounded-2xl shadow-lg">🗓️ {formatDate(upcomingProject.date)}</p>
                    </div>
                </div>
            )}
            <div className="portal-surface p-3 md:p-4 sm:p-6 rounded-3xl shadow-xl border widget-animate" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <span className="text-2xl">💰</span>
                    <h3 className="text-base md:text-lg font-bold portal-text-primary">Ringkasan Keuangan</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 md:p-4 rounded-2xl shadow-lg widget-animate hover:scale-105 transition-transform duration-300" style={{ animationDelay: '300ms' }}>
                        <p className="text-xs md:text-sm text-white/80 font-medium">💼 Total Nilai Proyek</p>
                        <p className="text-xl md:text-2xl font-bold text-white mt-1">{formatDisplayCurrency(financialSummary.totalValue)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 md:p-4 rounded-2xl shadow-lg widget-animate hover:scale-105 transition-transform duration-300" style={{ animationDelay: '400ms' }}>
                        <p className="text-xs md:text-sm text-white/80 font-medium">✅ Total Terbayar</p>
                        <p className="text-xl md:text-2xl font-bold text-white mt-1">{formatDisplayCurrency(financialSummary.totalPaid)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 md:p-4 rounded-2xl shadow-lg widget-animate hover:scale-105 transition-transform duration-300" style={{ animationDelay: '500ms' }}>
                        <p className="text-xs md:text-sm text-white/80 font-medium">⏳ Sisa Tagihan</p>
                        <p className="text-xl md:text-2xl font-bold text-white mt-1">{formatDisplayCurrency(financialSummary.totalDue)}</p>
                    </div>
                </div>
            </div>
            {activeProject && (
                <div className="portal-surface p-3 md:p-4 sm:p-6 rounded-3xl shadow-xl border widget-animate" style={{ animationDelay: '600ms' }}>
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <span className="text-2xl">🚀</span>
                        <h3 className="text-base md:text-lg font-bold portal-text-primary">Progres Proyek: {activeProject.projectName}</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Progress</span>
                            <span className="text-sm font-bold text-blue-600">{activeProject.progress}%</span>
                        </div>
                        <div className="relative w-full bg-slate-200 rounded-full h-6 overflow-hidden shadow-inner">
                            <div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg transition-all duration-700 ease-out"
                                style={{ width: `${activeProject.progress}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                <p className="text-sm text-slate-600">Status: <span className="font-semibold text-blue-600">{activeProject.status}</span></p>
                            </div>
                            <div className="text-xs text-slate-500">
                                {activeProject.progress === 100 ? '✅ Selesai' : activeProject.progress >= 75 ? '🎯 Hampir Selesai' : activeProject.progress >= 50 ? '⚡ Dalam Proses' : '🔄 Baru Dimulai'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeProject && (
                <div className="portal-surface p-3 md:p-4 sm:p-6 rounded-3xl shadow-xl border widget-animate" style={{ animationDelay: '700ms' }}>
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <span className="text-2xl">📦</span>
                        <h3 className="text-base md:text-lg font-bold portal-text-primary">Paket & Tambahan yang Diambil</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="p-3 md:p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-purple-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                            <p className="text-xs md:text-sm font-semibold text-public-text-secondary mb-1">Paket</p>
                            <p className="text-base md:text-lg font-bold text-public-text-primary">{activeProject.packageName || activePackage?.name || 'N/A'}</p>
                            <div className="mt-2 text-xs md:text-sm">
                                <div className="flex justify-between">
                                    <span className="text-public-text-secondary">Harga Paket</span>
                                    <span className="font-semibold text-public-text-primary">{formatDisplayCurrency(packagePrice)}</span>
                                </div>
                                {(activeProject as any)?.durationSelection && (
                                    <div className="flex justify-between mt-1">
                                        <span className="text-public-text-secondary">Durasi</span>
                                        <span className="font-semibold text-public-text-primary">{(activeProject as any).durationSelection}</span>
                                    </div>
                                )}
                                <div className="flex justify-between mt-1">
                                    <span className="text-public-text-secondary">Subtotal Add-On</span>
                                    <span className="font-semibold text-public-text-primary">{formatDisplayCurrency(addOnsTotal)}</span>
                                </div>
                                {Boolean(activeProject.discountAmount) && (
                                    <div className="flex justify-between mt-1">
                                        <span className="text-public-text-secondary">Diskon</span>
                                        <span className="font-semibold text-red-700">- {formatDisplayCurrency(activeProject.discountAmount || 0)}</span>
                                    </div>
                                )}
                                <hr className="my-2 border-public-border" />
                                <div className="flex justify-between">
                                    <span className="font-bold text-public-text-primary">Total Proyek</span>
                                    <span className="font-extrabold text-public-text-primary">{formatDisplayCurrency(activeProject.totalCost)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 md:p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                            <p className="text-xs md:text-sm font-semibold text-pink-700 mb-2">✨ Add-On</p>
                            {activeProject.addOns && activeProject.addOns.length > 0 ? (
                                <ul className="space-y-2">
                                    {activeProject.addOns.map(ao => (
                                        <li key={ao.id} className="flex items-center justify-between text-xs md:text-sm">
                                            <span className="text-public-text-primary">{ao.name}</span>
                                            <span className="font-semibold text-public-text-primary">{formatDisplayCurrency(ao.price)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-public-text-secondary italic">Tidak ada tambahan.</p>
                            )}
                        </div>
                        <div className="p-3 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                            <p className="text-xs md:text-sm font-semibold text-green-700 mb-2">💳 Ringkasan Pembayaran</p>
                            <div className="space-y-2 text-xs md:text-sm">
                                <div className="flex justify-between"><span className="text-public-text-secondary">Total Proyek</span><span className="font-bold text-public-text-primary">{formatDisplayCurrency(activeProject.totalCost)}</span></div>
                                <div className="flex justify-between"><span className="text-public-text-secondary">Sudah Dibayar</span><span className="font-semibold text-green-700">{formatDisplayCurrency(activeProject.amountPaid)}</span></div>
                                <div className="flex justify-between"><span className="text-public-text-secondary">Sisa Pembayaran</span><span className="font-semibold text-red-700">{formatDisplayCurrency(activeProject.totalCost - activeProject.amountPaid)}</span></div>
                            </div>
                        </div>
                    </div>
                    {activePackage && (
                        <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 shadow-md">
                            <p className="text-sm font-semibold text-blue-700 mb-2">📋 Isi Paket</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-semibold text-public-text-primary mb-1">Digital</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {(activePackage.digitalItems || []).map((it, idx) => (
                                            <li key={idx} className="text-public-text-primary">{it}</li>
                                        ))}
                                        {(activePackage.digitalItems || []).length === 0 && <li className="text-public-text-secondary italic">Tidak ada</li>}
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-semibold text-public-text-primary mb-1">Output Fisik</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {(activePackage.physicalItems || []).map((it, idx) => (
                                            <li key={idx} className="text-public-text-primary">{it.name}</li>
                                        ))}
                                        {(activePackage.physicalItems || []).length === 0 && <li className="text-public-text-secondary italic">Tidak ada</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ProjectsTab: React.FC<{ projects: Project[], profile: Profile, onConfirm: (projectId: string, subStatusName: string, note: string) => void }> = ({ projects, profile, onConfirm }) => {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id || null);
    const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

    const getRevisionStatusClass = (status: RevisionStatus) => {
        switch (status) {
            case RevisionStatus.COMPLETED: return 'bg-green-100 text-green-800';
            case RevisionStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800';
            case RevisionStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            {projects.length > 1 && (
                <div className="portal-surface p-4 rounded-3xl shadow-xl border widget-animate">
                    <label htmlFor="project-selector" className="text-sm font-medium portal-text-primary flex items-center gap-2"><span className="text-xl">🎯</span> Pilih Proyek:</label>
                    <select
                        id="project-selector"
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full mt-2 p-3 border border-blue-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-blue-50 font-medium shadow-sm"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.projectName}</option>
                        ))}
                    </select>
                </div>
            )}

            {!selectedProject ? (
                <div className="portal-surface p-8 rounded-3xl shadow-xl border text-center widget-animate">
                    <span className="text-4xl mb-3 block">🗂️</span>
                    <p className="portal-text-secondary">Pilih proyek untuk melihat perjalanannya.</p>
                </div>
            ) : (
                <div className="portal-surface p-4 sm:p-6 rounded-3xl shadow-xl border widget-animate" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-2xl">🗺️</span>
                        <h3 className="text-xl font-bold portal-text-primary">Perjalanan Proyek: {selectedProject.projectName}</h3>
                    </div>
                    {profile.projectStatusConfig.map((statusConfig, statusIndex) => {
                        // Don't show empty stages unless it's the active one
                        if (statusConfig.subStatuses.length === 0 && selectedProject.status !== statusConfig.name && (statusConfig.name !== "Revisi" || (selectedProject.revisions || []).length === 0)) {
                            return null;
                        }

                        return (
                            <div key={statusConfig.id} className="mb-8 widget-animate" style={{ animationDelay: `${statusIndex * 150}ms` }}>
                                <h4 className="text-lg font-bold portal-text-primary mb-4 flex items-center gap-3">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: statusConfig.color }}></span>
                                    {statusConfig.name}
                                </h4>
                                <div className="relative border-l-2 portal-border">
                                    {statusConfig.subStatuses.map((subStatus, subIndex) => {
                                        const isConfirmed = selectedProject.confirmedSubStatuses?.includes(subStatus.name);
                                        const isActive = selectedProject.activeSubStatuses?.includes(subStatus.name) && selectedProject.status === statusConfig.name;
                                        const clientNote = selectedProject.clientSubStatusNotes?.[subStatus.name];
                                        const totalDelay = statusIndex * 150 + (subIndex + 1) * 100;

                                        let iconClass = 'bg-gray-300';
                                        if (isConfirmed) iconClass = 'bg-green-500';
                                        else if (isActive) iconClass = 'portal-accent-bg active-pulse';

                                        return (
                                            <div className="timeline-item widget-animate" style={{ '--animation-delay': `${totalDelay}ms`, animationDelay: `${totalDelay}ms` } as React.CSSProperties} key={subStatus.name}>
                                                <div className={`timeline-icon-container ${iconClass}`}>
                                                    {isConfirmed && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                </div>
                                                <div className="ml-4">
                                                    <p className={`font-semibold ${!isConfirmed && !isActive ? 'portal-text-secondary' : 'portal-text-primary'}`}>{subStatus.name}</p>
                                                    <p className="text-sm portal-text-secondary">{subStatus.note}</p>
                                                    {clientNote && <blockquote className="mt-2 p-2 bg-slate-100 rounded-md border-l-4 border-slate-400"><p className="text-xs font-semibold text-slate-600">Catatan Anda:</p><p className="text-sm text-slate-800 italic">"{clientNote}"</p></blockquote>}
                                                    {isActive && !isConfirmed && (
                                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                            <p className="text-sm font-semibold text-blue-800">Tugas ini memerlukan konfirmasi Anda</p>
                                                            <button
                                                                onClick={() => { if (selectedProject) onConfirm(selectedProject.id, subStatus.name, '') }}
                                                                className="mt-3 text-sm font-semibold text-white portal-accent-bg hover:bg-opacity-80 px-4 py-2 rounded-lg inline-flex items-center gap-2"
                                                            >
                                                                <SendIcon className="w-4 h-4" /> Konfirmasi
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {statusConfig.name === "Revisi" && (selectedProject.revisions || []).length > 0 && (
                                        (selectedProject.revisions || []).map((rev, revIndex) => {
                                            const isCompleted = rev.status === RevisionStatus.COMPLETED;
                                            let iconClass = isCompleted ? 'bg-green-500' : 'portal-accent-bg';
                                            const totalDelay = statusIndex * 150 + (statusConfig.subStatuses.length + revIndex + 1) * 100;

                                            return (
                                                <div className="timeline-item widget-animate" style={{ '--animation-delay': `${totalDelay}ms`, animationDelay: `${totalDelay}ms` } as React.CSSProperties} key={rev.id}>
                                                    <div className={`timeline-icon-container ${iconClass}`}>
                                                        {isCompleted && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <div className="ml-4 p-3 bg-slate-50 rounded-lg">
                                                        <div className="flex justify-between items-center">
                                                            <p className="font-semibold portal-text-primary">Tugas Revisi</p>
                                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${getRevisionStatusClass(rev.status)}`}>{rev.status}</span>
                                                        </div>
                                                        <p className="text-sm portal-text-secondary mt-2"><strong>Catatan:</strong> {rev.adminNotes}</p>
                                                        <p className="text-xs portal-text-secondary mt-1"><strong>Deadline:</strong> {formatDate(rev.deadline)}</p>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const GalleryTab: React.FC<{ projects: Project[], packages: Package[] }> = ({ projects, packages }) => (
    <div className="space-y-6">
        {projects.map((project, index) => {
            const pkg = packages.find(p => p.id === project.packageId);
            return (
                <div key={project.id} className="portal-surface p-4 sm:p-6 rounded-3xl shadow-xl border widget-animate" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">🎨</span>
                        <h3 className="text-lg font-bold portal-text-primary">File & Output Pengantin: {project.projectName}</h3>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-semibold portal-text-primary text-md flex items-center gap-2"><span>🔗</span> Tautan Penting</h4>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div><p className="font-medium portal-text-primary">Hasil Akhir Foto & Video</p><p className="text-xs portal-text-secondary">Tautan final untuk semua hasil editan.</p></div>
                            {project.finalDriveLink ? <a href={project.finalDriveLink} target="_blank" rel="noopener noreferrer" className="button-primary text-sm px-4 py-2">Buka Galeri</a> : <span className="text-sm font-medium portal-text-secondary">Belum Tersedia</span>}
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div><p className="font-medium portal-text-primary">📝 Moodboard/Brief Proyek</p></div>
                            {project.driveLink ? <a href={project.driveLink} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm px-4 py-2">Lihat Tautan</a> : <span className="text-sm font-medium portal-text-secondary">N/A</span>}
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div><p className="font-medium portal-text-primary">📤 File dari Anda</p></div>
                            {project.clientDriveLink ? <a href={project.clientDriveLink} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm px-4 py-2">Lihat Tautan</a> : <span className="text-sm font-medium portal-text-secondary">N/A</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-4 border-t portal-border">
                            <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 shadow-sm">
                                <h4 className="font-semibold portal-text-primary mb-3 flex items-center gap-2"><span>✅</span> Checklist Digital</h4>
                                <div className="space-y-2 text-sm">
                                    {(pkg?.digitalItems || []).map((item, index) => {
                                        const isCompleted = project.completedDigitalItems?.includes(item);
                                        return (
                                            <div key={index} className="flex items-center gap-3 p-2">
                                                <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isCompleted ? 'text-green-500' : 'text-gray-300'}`} />
                                                <span className={`portal-text-primary ${isCompleted ? 'line-through portal-text-secondary' : ''}`}>{item}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm">
                                <h4 className="font-semibold portal-text-primary mb-3 flex items-center gap-2"><span>📦</span> Output Fisik</h4>
                                <ul className="space-y-2 text-sm list-disc list-inside">
                                    {(((project.printingDetails && project.printingDetails.length > 0)
                                        ? project.printingDetails
                                        : (pkg?.physicalItems || [])) as any[]).map((item, index) => (
                                            <li key={index} className="portal-text-primary">
                                                {(item as any).customName || (item as any).name}
                                            </li>
                                        ))}
                                    {(((project.printingDetails && project.printingDetails.length > 0)
                                        ? project.printingDetails
                                        : (pkg?.physicalItems || [])) as any[]).length === 0 && (
                                            <p className="text-xs portal-text-secondary italic">Tidak ada output fisik.</p>
                                        )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
);

const FinanceTab: React.FC<{ projects: Project[], contracts: Contract[], transactions: Transaction[], onSignContract: (id: string, sig: string, signer: 'vendor' | 'client') => void, profile: Profile, packages: Package[], client: Client, onViewDocument: (doc: any) => void }> = ({ projects, contracts, transactions, profile, client, onViewDocument }) => {
    return (
        <div className="space-y-6">
            {projects.map((project, index) => {
                const projectTransactions = transactions.filter(t => t.projectId === project.id && t.type === 'Pemasukan');
                const projectContract = contracts.find(c => c.projectId === project.id);

                return (
                    <div key={project.id} className="portal-surface p-4 sm:p-6 rounded-3xl shadow-xl border widget-animate" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                            <h3 className="text-lg font-bold portal-text-primary mb-2 sm:mb-0 flex items-center gap-2"><span>💸</span> {project.projectName}</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onViewDocument({ type: 'invoice', project, data: project })} className="button-primary text-sm px-3 py-1.5">Lihat Invoice</button>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t portal-border">
                            <h4 className="font-semibold portal-text-primary mb-2 flex items-center gap-2"><span>📋</span> Riwayat Pembayaran</h4>
                            <div className="space-y-2">
                                {projectTransactions.map(tx => (
                                    <div key={tx.id} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow duration-300">
                                        <div>
                                            <p className="font-medium portal-text-primary">{tx.description}</p>
                                            <p className="text-xs portal-text-secondary">{formatDate(tx.date)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="font-semibold text-green-600">{formatDisplayCurrency(tx.amount)}</p>
                                            <button onClick={() => onViewDocument({ type: 'receipt', project, data: tx })} className="p-1 text-slate-500 hover:text-blue-600" title="Lihat Tanda Terima"><PrinterIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                                {projectTransactions.length === 0 && <p className="text-sm portal-text-secondary">Belum ada pembayaran.</p>}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

const ContractsTab: React.FC<{ contracts: Contract[], projects: Project[], onViewContract: (contract: Contract) => void }> = ({ contracts, projects, onViewContract }) => (
    <div className="portal-surface p-4 sm:p-6 rounded-3xl shadow-xl border widget-animate">
        <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📜</span>
            <h3 className="text-lg font-bold portal-text-primary">Kontrak Kerja Anda</h3>
        </div>
        <div className="space-y-3">
            {contracts.length > 0 ? contracts.map(contract => {
                const project = projects.find(p => p.id === contract.projectId);
                return (
                    <div key={contract.id} className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow duration-300">
                        <div>
                            <p className="font-semibold portal-text-primary">{contract.contractNumber}</p>
                            <p className="text-sm portal-text-secondary">Proyek: {project?.projectName || 'N/A'}</p>
                        </div>
                        <button onClick={() => onViewContract(contract)} className="button-secondary text-sm px-4 py-2">Lihat Dokumen</button>
                    </div>
                )
            }) : (
                <p className="portal-text-secondary text-center py-8">Belum ada kontrak yang tersedia.</p>
            )}
        </div>
    </div>
);


const FeedbackTab: React.FC<{ client: Client, setClientFeedback: any, showNotification: any }> = ({ client, setClientFeedback, showNotification }) => {
    const [rating, setRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) { alert('Mohon berikan peringkat.'); return; }
        setIsSubmitting(true);
        try {
            const payload = {
                clientName: client!.name,
                rating,
                satisfaction: getSatisfactionFromRating(rating),
                feedback: feedbackText,
                date: new Date().toISOString(),
            } as Omit<ClientFeedback, 'id'>;
            const created = await createClientFeedback(payload);
            setClientFeedback((prev: ClientFeedback[]) => [created, ...prev]);
            showNotification('Terima kasih! Masukan Anda telah tersimpan.');
            setRating(0);
            setFeedbackText('');
        } catch (err) {
            console.error('[ClientPortal] Failed to create client feedback:', err);
            showNotification('Gagal menyimpan masukan. Coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="portal-surface p-4 sm:p-6 rounded-3xl shadow-xl border flex flex-col widget-animate">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⭐</span>
                <h3 className="text-lg font-bold portal-text-primary">Berikan Testimoni</h3>
            </div>
            <p className="text-sm portal-text-secondary mt-1">Masukan Anda sangat berharga untuk kami menjadi lebih baik.</p>
            <div className="mt-6"><label className="text-sm font-medium portal-text-primary">Peringkat Kepuasan</label><div className="flex items-center gap-1 mt-2">{[1, 2, 3, 4, 5].map(star => (<button key={star} type="button" onClick={() => setRating(star)} aria-label={`Beri ${star} bintang`} className="transform hover:scale-125 transition-transform duration-200"><StarIcon className={`w-8 h-8 transition-colors ${rating >= star ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg' : 'text-gray-300'}`} /></button>))}</div></div>
            <div className="mt-4 flex-grow flex flex-col"><label htmlFor="feedbackText" className="text-sm font-medium portal-text-primary">Testimoni Kamu</label><textarea id="feedbackText" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="w-full mt-2 p-3 border border-blue-200 rounded-2xl flex-grow focus:ring-2 focus:ring-blue-500 focus:outline-none bg-blue-50 shadow-sm" rows={5}></textarea></div>
            <button type="submit" disabled={isSubmitting} className="mt-4 w-full py-3 px-4 portal-accent-bg text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100">{isSubmitting ? 'Mengirim...' : '🚀 Kirim Masukan'}</button>
        </form>
    );
};

const DocumentViewerModal: React.FC<{ viewingDocument: any, onClose: any, profile: Profile, packages: Package[], client: Client, onSignContract: any }> = ({ viewingDocument, onClose, profile, packages, client, onSignContract }) => {
    const [isSigning, setIsSigning] = useState(false);

    // Debug effect to track isSigning state changes
    useEffect(() => {
        console.log('isSigning state changed to:', isSigning);
    }, [isSigning]);

    const handleSaveSignature = (signature: string) => {
        console.log('Saving signature:', signature?.substring(0, 50) + '...');
        if (viewingDocument?.type === 'contract') {
            onSignContract(viewingDocument.data.id, signature, 'client');
            onClose(); // Close the document viewer modal after signing
        }
        setIsSigning(false);
    }

    const handleSignClick = () => {
        console.log('Sign button clicked, opening signature pad');
        console.log('Current isSigning state:', isSigning);
        console.log('Contract data:', viewingDocument?.data);
        setIsSigning(true);
        // Force a re-render after state change
        setTimeout(() => {
            console.log('isSigning state after timeout:', isSigning);
        }, 100);
    }


    const renderDocumentBody = () => {
        if (!viewingDocument) return null;

        const { type, project, data } = viewingDocument;
        const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

        if (type === 'invoice') {
            // Find package by id; fallback to name if id missing
            let selectedPackage = packages.find(p => p.id === project.packageId);
            if (!selectedPackage) {
                selectedPackage = packages.find(p => p.name === project.packageName);
            }
            const subtotal = project.totalCost + (project.discountAmount || 0);
            const remaining = project.totalCost - project.amountPaid;

            // Calculate unitPrice with better fallback logic
            let unitPrice = 0;
            let durationLabel = '';

            if ((project as any).unitPrice !== undefined && (project as any).unitPrice !== null && Number((project as any).unitPrice) > 0) {
                unitPrice = Number((project as any).unitPrice);
            } else if (selectedPackage) {
                // Try to detect chosen duration from project notes or durationSelection field
                const durationSelection = (project as any).durationSelection || '';
                const durationMatch = (project.notes || '').match(/Durasi dipilih:\s*([^|]+)/i);
                durationLabel = durationSelection || (durationMatch ? durationMatch[1].trim() : '');

                if (durationLabel && selectedPackage.durationOptions && selectedPackage.durationOptions.length > 0) {
                    const durationOption = selectedPackage.durationOptions.find(opt => opt.label === durationLabel);
                    unitPrice = durationOption ? Number(durationOption.price) : Number(selectedPackage.price);
                } else {
                    unitPrice = Number(selectedPackage.price);
                }
            } else {
                // Fallback: calculate from total cost minus addons and transport
                const addOnsTotal = (project.addOns || []).reduce((s, a) => s + (a.price || 0), 0);
                const transportFee = Number(project.transportCost || 0);
                unitPrice = Math.max(0, subtotal - addOnsTotal - transportFee);
            }

            // Set durationLabel from durationSelection if not already set
            if (!durationLabel && (project as any).durationSelection) {
                durationLabel = (project as any).durationSelection;
            }
            return (
                <div id="invoice-content" className="p-2">
                    <div className="printable-content print-invoice bg-slate-50 font-sans text-slate-800 printable-area">
                        <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 lg:p-10 shadow-lg print:shadow-none print:p-0">{/* Optimized padding for print */}
                            <header className="flex justify-between items-start mb-8 print:mb-6">
                                <div>
                                    {profile.logoBase64 ? (
                                        <img src={profile.logoBase64} alt="Company Logo" className="h-16 sm:h-20 max-w-[180px] sm:max-w-[200px] object-contain mb-3 print:h-16 print:mb-2" />
                                    ) : (
                                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 print:text-2xl">{profile.companyName}</h1>
                                    )}
                                    <p className="text-sm text-slate-500 leading-tight">{profile.address}</p>
                                    <p className="text-sm text-slate-500 leading-tight">{profile.phone} | {profile.email}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-xl sm:text-2xl font-bold uppercase text-slate-400 tracking-widest print:text-xl">Invoice</h2>
                                    <p className="text-sm text-slate-500 mt-1">No: <span className="font-semibold text-slate-700">INV-{project.id.slice(-6)}</span></p>
                                    <p className="text-sm text-slate-500">Tanggal: <span className="font-semibold text-slate-700">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></p>
                                </div>
                            </header>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-5 print:mb-4 doc-header-grid">
                                <div className="bg-slate-50 p-4 sm:p-6 rounded-xl print:bg-slate-50"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Ditagihkan Kepada</h3><p className="font-bold text-slate-800 break-words text-sm sm:text-base">{client.name}</p><p className="text-sm text-slate-600 break-words">{client.email}</p><p className="text-sm text-slate-600 break-words">{client.phone}</p></div>
                                <div className="bg-slate-50 p-4 sm:p-6 rounded-xl print:bg-slate-50"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Diterbitkan Oleh</h3><p className="font-bold text-slate-800 break-words text-sm sm:text-base">{profile.companyName}</p><p className="text-sm text-slate-600 break-words">{profile.email}</p><p className="text-sm text-slate-600 break-words">{profile.phone}</p></div>
                            </section>

                            <section className="mb-8 print:mb-6">
                                <div className="bg-blue-600 text-white p-5 sm:p-6 rounded-xl printable-bg-blue printable-text-white"><h3 className="text-xs font-semibold uppercase text-blue-200 mb-2">Sisa Tagihan</h3><p className="font-extrabold text-xl sm:text-2xl lg:text-3xl tracking-tight break-all print:text-2xl">{formatCurrency(remaining)}</p><p className="text-sm text-blue-200 mt-1">Jatuh Tempo: {new Date(project.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                            </section>

                            <section className="mt-6 print:mt-4 mb-6 print:mb-4"><table className="w-full text-left responsive-table invoice-table">
                                <thead className="invoice-table-header">
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="p-2 sm:p-3 text-xs sm:text-sm font-semibold uppercase text-slate-500 text-left print:p-2 print:text-xs" data-label="Deskripsi">Deskripsi</th>
                                        <th className="p-2 sm:p-3 text-xs sm:text-sm font-semibold uppercase text-slate-500 text-center min-w-[40px] sm:min-w-[50px] print:p-2 print:text-xs" data-label="Jml">Jml</th>
                                        <th className="p-2 sm:p-3 text-xs sm:text-sm font-semibold uppercase text-slate-500 text-right min-w-[80px] sm:min-w-[90px] print:p-2 print:text-xs" data-label="Harga">Harga Satuan</th>
                                        <th className="p-2 sm:p-3 text-xs sm:text-sm font-semibold uppercase text-slate-500 text-right min-w-[80px] sm:min-w-[90px] print:p-2 print:text-xs" data-label="Total">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="invoice-table-body">
                                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                                        <td data-label="Deskripsi" className="p-2 sm:p-3 align-top print:p-2">
                                            <div className="invoice-item-description">
                                                <p className="font-semibold text-slate-800 text-sm leading-tight sm:leading-relaxed print:text-sm">
                                                    {project.packageName}
                                                    {durationLabel ? ` · ${durationLabel}` : ''}
                                                </p>
                                                {selectedPackage?.digitalItems && selectedPackage.digitalItems.length > 0 && (
                                                    <p className="text-xs text-slate-500 mt-1 leading-tight sm:leading-relaxed">
                                                        {selectedPackage.digitalItems.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Jml" className="p-2 sm:p-3 text-center align-top print:p-2">
                                            <span className="font-semibold text-slate-700 text-sm">1</span>
                                        </td>
                                        <td data-label="Harga" className="p-2 sm:p-3 text-right align-top print:p-2">
                                            <span className="font-semibold text-slate-700 tabular-nums text-sm">
                                                {formatCurrency(unitPrice)}
                                            </span>
                                        </td>
                                        <td data-label="Total" className="p-2 sm:p-3 text-right align-top print:p-2">
                                            <span className="font-bold text-slate-800 tabular-nums text-sm">
                                                {formatCurrency(unitPrice)}
                                            </span>
                                        </td>
                                    </tr>
                                    {project.addOns.filter(addon => addon.name && addon.name.trim()).map((addon, index) => (
                                        <tr key={addon.id || index} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td data-label="Deskripsi" className="p-2 sm:p-3 align-top print:p-2">
                                                <div className="invoice-item-description">
                                                    <p className="text-slate-600 text-sm leading-tight sm:leading-relaxed">
                                                        - {addon.name}
                                                    </p>
                                                </div>
                                            </td>
                                            <td data-label="Jml" className="p-2 sm:p-3 text-center align-top print:p-2">
                                                <span className="text-slate-600 text-sm">1</span>
                                            </td>
                                            <td data-label="Harga" className="p-2 sm:p-3 text-right align-top print:p-2">
                                                <span className="text-slate-600 tabular-nums text-sm">
                                                    {formatCurrency(addon.price)}
                                                </span>
                                            </td>
                                            <td data-label="Total" className="p-2 sm:p-3 text-right align-top print:p-2">
                                                <span className="font-semibold text-slate-700 tabular-nums text-sm">
                                                    {formatCurrency(addon.price)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {project.transportCost && Number(project.transportCost) > 0 && (
                                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                                            <td data-label="Deskripsi" className="p-2 sm:p-3 align-top print:p-2">
                                                <div className="invoice-item-description">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-slate-600 text-sm leading-tight sm:leading-relaxed">
                                                            - Biaya Transport
                                                        </p>
                                                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 whitespace-nowrap print:bg-blue-100 print:text-blue-700">
                                                            🚗 TRANSPORT
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-0.5">Transport ke lokasi acara</p>
                                                </div>
                                            </td>
                                            <td data-label="Jml" className="p-2 sm:p-3 text-center align-top print:p-2">
                                                <span className="text-slate-600 text-sm">1</span>
                                            </td>
                                            <td data-label="Harga" className="p-2 sm:p-3 text-right align-top print:p-2">
                                                <span className="text-slate-600 tabular-nums text-sm">
                                                    {formatCurrency(Number(project.transportCost))}
                                                </span>
                                            </td>
                                            <td data-label="Total" className="p-2 sm:p-3 text-right align-top print:p-2">
                                                <span className="font-semibold text-slate-700 tabular-nums text-sm">
                                                    {formatCurrency(Number(project.transportCost))}
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table></section>

                            <section className="mt-8 sm:mt-10 print:mt-6 avoid-break totals-section">
                                <div className="flex flex-col-reverse sm:flex-row justify-between gap-6 sm:gap-8 doc-footer-flex">
                                    <div className="w-full sm:w-2/5 invoice-signature-section">
                                        <h4 className="font-semibold text-slate-600 mb-2 sm:mb-3 text-sm">Tanda Tangan</h4>
                                        {project.invoiceSignature ? (
                                            <img src={project.invoiceSignature} alt="Tanda Tangan" className="h-16 sm:h-20 mt-2 object-contain border-b border-slate-300 print:h-16" />
                                        ) : (
                                            <div className="h-16 sm:h-20 mt-2 flex items-center justify-center text-xs text-slate-400 italic border border-dashed border-slate-300 rounded-lg print:h-16">
                                                Belum Ditandatangani
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-full sm:w-2/5 space-y-2 sm:space-y-3 text-sm invoice-totals">
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-slate-500 font-medium">Subtotal</span>
                                            <span className="font-semibold text-slate-800 tabular-nums">
                                                {formatCurrency(subtotal)}
                                            </span>
                                        </div>
                                        {project.discountAmount && project.discountAmount > 0 && (
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-slate-500 font-medium">Diskon</span>
                                                <span className="font-semibold text-green-600 print-text-green tabular-nums">
                                                    -{formatCurrency(project.discountAmount)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-slate-500 font-medium">Telah Dibayar</span>
                                            <span className="font-semibold text-slate-800 tabular-nums">
                                                -{formatCurrency(project.amountPaid)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t-2 border-slate-300">
                                            <span className="font-bold text-base sm:text-lg text-slate-900 print:text-base">Sisa Tagihan</span>
                                            <span className="font-bold text-base sm:text-lg text-slate-900 tabular-nums print:text-base">
                                                {formatCurrency(remaining)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <footer className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t-2 border-slate-200 avoid-break signature-section print:mt-6 print:pt-4">
                                {profile.termsAndConditions && (
                                    <div className="mb-6 sm:mb-8">
                                        <h4 className="font-semibold text-slate-600 mb-2 text-sm">Syarat & Ketentuan</h4>
                                        <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">{profile.termsAndConditions.replace(/📜|💰|⏱|📦/g, '').replace(/\s*\*\*(.*?)\*\*\s*/g, '\n<strong>$1</strong>\n')}</p>
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 text-center leading-relaxed">Jika Anda memiliki pertanyaan, silakan hubungi kami di {profile.phone}</p>
                                <div className="w-full h-1.5 sm:h-2 bg-blue-600 mt-4 sm:mt-6 rounded print:h-1 print:mt-3"></div>
                            </footer>
                        </div>
                    </div>
                </div>
            );
        } else if (type === 'receipt') {
            const transaction = data as Transaction;
            return (
                <div id="receipt-content" className="p-1 print-a4">
                    <div className="printable-content print-receipt bg-slate-50 font-sans text-slate-800 printable-area">
                        <div className="max-w-md mx-auto bg-white p-8 shadow-lg rounded-xl">
                            <header className="text-center mb-8"><h1 className="text-2xl font-bold text-slate-900">KWITANSI PEMBAYARAN</h1><p className="text-sm text-slate-500">{profile.companyName}</p></header>
                            <div className="p-4 bg-green-500/10 border border-green-200 rounded-lg text-center mb-8 printable-bg-green-light"><p className="text-sm font-semibold text-green-700 print-text-green">PEMBAYARAN DITERIMA</p><p className="text-3xl font-bold text-green-800 print-text-green mt-1">{formatCurrency(transaction.amount)}</p></div>
                            <div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">No. Kwitansi</span><span className="font-semibold text-slate-700 font-mono">{transaction.id.slice(0, 12)}</span></div><div className="flex justify-between"><span className="text-slate-500">Tanggal Bayar</span><span className="font-semibold text-slate-700">{formatDate(transaction.date)}</span></div><div className="flex justify-between"><span className="text-slate-500">Diterima dari</span><span className="font-semibold text-slate-700">{client.name}</span></div><div className="flex justify-between"><span className="text-slate-500">Metode</span><span className="font-semibold text-slate-700">{transaction.method}</span></div></div>
                            <div className="mt-6 pt-6 border-t border-slate-200"><p className="text-sm text-slate-500">Untuk pembayaran:</p><p className="font-semibold text-slate-800 mt-1">{transaction.description}</p>{project && (<div className="mt-2 text-xs text-slate-500"><p>Proyek: {project.projectName}</p><p>Total Tagihan: {formatCurrency(project.totalCost)} | Sisa: {formatCurrency(project.totalCost - project.amountPaid)}</p></div>)}</div>
                            <footer className="mt-12 flex justify-between items-end"><p className="text-xs text-slate-400">Terima kasih.</p><div className="text-center">{transaction.vendorSignature ? (<img src={transaction.vendorSignature} alt="Tanda Tangan" className="h-16 object-contain" />) : (<div className="h-16 flex items-center justify-center text-xs text-slate-400 italic border-b border-dashed">Belum Ditandatangani</div>)}<p className="text-xs font-semibold text-slate-600 mt-1">({profile.authorizedSigner || profile.companyName})</p></div></footer>
                        </div>
                    </div>
                </div>
            );
        } else if (type === 'contract') {
            const contract = data as Contract;
            if (!project) {
                return (
                    <div className="text-center p-8">
                        <p className="text-red-500">Error: Data proyek tidak ditemukan untuk kontrak ini.</p>
                    </div>
                );
            }
            return (
                <div className="printable-content print-contract bg-white text-black p-8 font-serif leading-relaxed text-sm">
                    <h2 className="text-xl font-bold text-center mb-1">SURAT PERJANJIAN KERJA SAMA</h2>
                    <h3 className="text-lg font-bold text-center mb-6">JASA {project.projectType.toUpperCase()}</h3>
                    <p>Pada hari ini, {formatDate(contract.signingDate)}, bertempat di {contract.signingLocation}, telah dibuat dan disepakati perjanjian kerja sama antara:</p>

                    <div className="my-4">
                        <p className="font-bold">PIHAK PERTAMA</p>
                        <table>
                            <tbody>
                                <tr><td className="pr-4 align-top">Nama</td><td>: {profile.authorizedSigner}</td></tr>
                                <tr><td className="pr-4 align-top">Jabatan</td><td>: Pemilik Usaha</td></tr>
                                <tr><td className="pr-4 align-top">Alamat</td><td>: {profile.address}</td></tr>
                                <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {profile.phone}</td></tr>
                                {profile.idNumber && <tr><td className="pr-4 align-top">Nomor Identitas</td><td>: {profile.idNumber}</td></tr>}
                            </tbody>
                        </table>
                        <p className="mt-1">Dalam hal ini bertindak atas nama perusahaannya, <strong>{profile.companyName}</strong>, selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.</p>
                    </div>

                    <div className="my-4">
                        <p className="font-bold">PIHAK KEDUA</p>
                        <table>
                            <tbody>
                                <tr><td className="pr-4 align-top">Nama</td><td>: {contract.clientName1}</td></tr>
                                <tr><td className="pr-4 align-top">Alamat</td><td>: {contract.clientAddress1}</td></tr>
                                <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {contract.clientPhone1}</td></tr>
                                {contract.clientName2 && <>
                                    <tr><td className="pr-4 align-top">Nama</td><td>: {contract.clientName2}</td></tr>
                                    <tr><td className="pr-4 align-top">Alamat</td><td>: {contract.clientAddress2}</td></tr>
                                    <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {contract.clientPhone2}</td></tr>
                                </>}
                            </tbody>
                        </table>
                        <p className="mt-1">Dalam hal ini bertindak atas nama pribadi/bersama, selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>
                    </div>

                    <div className="space-y-4 mt-6">
                        <div><h4 className="font-bold text-center my-3">PASAL 1: DEFINISI</h4><p>Pekerjaan adalah jasa {project.projectType.toLowerCase()} yang diberikan oleh PIHAK PERTAMA untuk acara PIHAK KEDUA. Hari Pelaksanaan adalah tanggal {formatDate(project.date)}. Lokasi Pelaksanaan adalah {project.location}.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 2: RUANG LINGKUP PEKERJAAN</h4><p>PIHAK PERTAMA akan memberikan jasa fotografi sesuai dengan paket {project.packageName} yang mencakup: Durasi pemotretan {contract.shootingDuration}, Jumlah foto {contract.guaranteedPhotos}, {contract.albumDetails}, File digital {contract.digitalFilesFormat}, dan {contract.otherItems}. PIHAK PERTAMA akan menyediakan {contract.personnelCount}. Penyerahan hasil akhir dilakukan maksimal {contract.deliveryTimeframe} setelah acara.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 3: HAK DAN KEWAJIBAN PIHAK PERTAMA</h4><p>Hak: Menerima pembayaran sesuai kesepakatan; Menggunakan hasil foto untuk promosi/portofolio dengan persetujuan PIHAK KEDUA. Kewajiban: Melaksanakan pekerjaan secara profesional; Menyerahkan hasil tepat waktu; Menjaga privasi PIHAK KEDUA.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 4: HAK DAN KEWAJIBAN PIHAK KEDUA</h4><p>Hak: Menerima hasil pekerjaan sesuai paket; Meminta revisi minor jika ada kesalahan teknis. Kewajiban: Melakukan pembayaran sesuai jadwal; Memberikan informasi yang dibutuhkan; Menjamin akses kerja di lokasi.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 5: BIAYA DAN CARA PEMBAYARAN</h4><p>Total biaya jasa adalah sebesar {formatCurrency(project.totalCost)}. Pembayaran dilakukan dengan sistem: Uang Muka (DP) sebesar {formatCurrency(project.amountPaid)} dibayarkan pada {formatDate(contract.dpDate)}; Pelunasan sebesar {formatCurrency(project.totalCost - project.amountPaid)} dibayarkan paling lambat pada {formatDate(contract.finalPaymentDate)}. Pembayaran dapat ditransfer ke rekening: {profile.bankAccount}.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 6: PEMBATALAN</h4><p dangerouslySetInnerHTML={{ __html: contract.cancellationPolicy.replace(/\n/g, '<br/>') }}></p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 7: PENYELESAIAN SENGKETA</h4><p>Segala sengketa yang timbul akan diselesaikan secara musyawarah. Apabila tidak tercapai, maka akan diselesaikan secara hukum di wilayah hukum {contract.jurisdiction}.</p></div>
                        <div><h4 className="font-bold text-center my-3">PASAL 8: PENUTUP</h4><p>Demikian surat perjanjian ini dibuat dalam 2 (dua) rangkap bermaterai cukup dan mempunyai kekuatan hukum yang sama, ditandatangani dengan penuh kesadaran oleh kedua belah pihak.</p></div>
                    </div>

                    <div className="flex justify-between items-end mt-16">
                        <div className="text-center w-2/5">
                            <p>PIHAK PERTAMA</p>
                            <div className="h-28 my-1 flex flex-col items-center justify-center text-gray-400 text-xs">
                                {contract.vendorSignature ? <img src={contract.vendorSignature} alt="Tanda Tangan Vendor" className="h-24 object-contain" /> : <span className="italic">(Menunggu TTD Vendor)</span>}
                            </div>
                            <p className="border-t-2 border-dotted w-4/5 mx-auto pt-1">({profile.authorizedSigner})</p>
                        </div>
                        <div className="text-center w-2/5">
                            <p>PIHAK KEDUA</p>
                            <div className="h-28 w-full mx-auto my-1 flex items-center justify-center text-gray-400 text-xs italic">
                                {contract.clientSignature ? (
                                    <img src={contract.clientSignature} alt="Tanda Tangan Klien" className="h-24 object-contain" />
                                ) : (
                                    <span className="italic">Belum Ditandatangani</span>
                                )}
                            </div>
                            <p className="border-t-2 border-dotted w-4/5 mx-auto pt-1">({contract.clientName1}{contract.clientName2 ? ` & ${contract.clientName2}` : ''})</p>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };


    return (
        <>
            <Modal isOpen={!!viewingDocument} onClose={onClose} title={viewingDocument ? `${viewingDocument.type.charAt(0).toUpperCase() + viewingDocument.type.slice(1)}: ${viewingDocument.project.projectName}` : ''} size="4xl">
                {viewingDocument && (
                    <div>
                        <div id="invoice" className="printable-area max-h-[65vh] overflow-y-auto pr-4">{renderDocumentBody()}</div>
                        <div className="mt-6 flex justify-between items-center non-printable border-t border-public-border pt-4">
                            {viewingDocument.type === 'contract' && (
                                <div className="text-sm">
                                    <p className={`font-semibold ${viewingDocument.data.clientSignature ? 'text-green-500' : 'text-yellow-500'}`}>
                                        Status Anda: {viewingDocument.data.clientSignature ? 'Sudah TTD' : 'Belum TTD'}
                                    </p>
                                    <p className={`font-semibold ${viewingDocument.data.vendorSignature ? 'text-green-500' : 'text-yellow-500'}`}>
                                        Status {profile.companyName}: {viewingDocument.data.vendorSignature ? 'Sudah TTD' : 'Belum TTD'}
                                    </p>
                                </div>
                            )}
                            <div className="space-x-2">
                                {(() => {
                                    console.log('Checking signature button visibility:', {
                                        type: viewingDocument.type,
                                        clientSignature: viewingDocument.data.clientSignature,
                                        shouldShow: viewingDocument.type === 'contract' && !viewingDocument.data.clientSignature
                                    });
                                    return null;
                                })()}
                                {viewingDocument.type === 'contract' && !viewingDocument.data.clientSignature && (
                                    <button
                                        onClick={handleSignClick}
                                        className="button-primary"
                                        style={{ zIndex: 1000 }}
                                    >
                                        Tanda Tangani Kontrak
                                    </button>
                                )}
                                <PrintButton
                                    areaId="invoice"
                                    label="Cetak / Simpan PDF"
                                    title={viewingDocument ? `${viewingDocument.type} - ${viewingDocument.project?.projectName || ''}` : 'Dokumen'}
                                    directPrint={true}
                                    className="button-secondary inline-flex items-center gap-2"
                                >
                                    <PrinterIcon className="w-4 h-4" />
                                </PrintButton>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
            <div
                className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 transition-all duration-300 ${isSigning ? 'z-[60] opacity-100 pointer-events-auto' : 'z-[-1] opacity-0 pointer-events-none'
                    }`}
                style={{
                    display: isSigning ? 'flex' : 'none', // Force display control
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: isSigning ? 9999 : -1
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        console.log('Closing signature modal by clicking outside');
                        setIsSigning(false);
                    }
                }}
            >
                <div
                    className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 ${isSigning ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                        }`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-900">Bubuhkan Tanda Tangan Anda</h3>
                        <button
                            onClick={() => {
                                console.log('Closing signature modal via X button');
                                setIsSigning(false);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="w-full min-h-[400px]">
                            <div className="mb-4 text-center">
                                <p className="text-sm text-gray-600">Silakan tanda tangani kontrak ini untuk melanjutkan</p>
                                <p className="text-xs text-blue-600 mt-2">Debug: isSigning = {isSigning.toString()}</p>
                            </div>
                            <SignaturePad
                                onSave={handleSaveSignature}
                                onClose={() => {
                                    console.log('Signature pad cancelled');
                                    setIsSigning(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ClientPortal;