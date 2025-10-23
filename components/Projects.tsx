import React, { useState, useMemo, useEffect } from 'react';
import { Project, PaymentStatus, TeamMember, Client, Package, TeamProjectPayment, Transaction, TransactionType, AssignedTeamMember, Profile, Revision, RevisionStatus, NavigationAction, AddOn, PrintingItem, Card, ProjectStatusConfig, SubStatusConfig, CustomCost, TransportItem, FinancialPocket } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import StatCardModal from './StatCardModal';
import DonutChart from './DonutChart';
import { EyeIcon, PlusIcon, PencilIcon, Trash2Icon, ListIcon, LayoutGridIcon, FolderKanbanIcon, AlertCircleIcon, CalendarIcon, CheckSquareIcon, Share2Icon, ClockIcon, UsersIcon, ArrowDownIcon, ArrowUpIcon, FileTextIcon, SendIcon, CheckCircleIcon, ClipboardListIcon, DollarSignIcon, MessageSquareIcon, BriefcaseIcon, LightbulbIcon, ArrowUpIcon as ArrowUpIconStat, ArrowDownIcon as ArrowDownIconStat, CreditCardIcon } from '../constants';
import { createProjectWithRelations, updateProject as updateProjectInDb, deleteProject as deleteProjectInDb, sanitizeProjectData, getProjectWithRelations } from '../services/projects';
import { createRevision, listRevisionsByProject } from '../services/projectRevisions';
import { upsertAssignmentsForProject } from '../services/projectTeamAssignments';
import { upsertTeamPaymentsForProject } from '../services/teamProjectPayments';
import { createTransaction, updateCardBalance, updateTransaction as updateTransactionRow, deleteTransaction as deleteTransactionRow } from '../services/transactions';

// UI/UX Improvement Components
import ProjectCard from './ProjectCard';
import CollapsibleSection from './CollapsibleSection';
import BatchPayment from './BatchPayment';
import ProgressTracker from './ProgressTracker';
import QuickStatusModal from './QuickStatusModal';

const getPaymentStatusClass = (status: PaymentStatus) => {
    switch (status) {
        case PaymentStatus.LUNAS: return 'status-badge status-success';
        case PaymentStatus.DP_TERBAYAR: return 'status-badge status-warning';
        case PaymentStatus.BELUM_BAYAR: return 'status-badge status-danger';
        default: return 'status-badge status-gray';
    }
};

const getRevisionStatusClass = (status: RevisionStatus) => {
    switch (status) {
        case RevisionStatus.COMPLETED: return 'bg-green-500/20 text-green-400';
        case RevisionStatus.IN_PROGRESS: return 'bg-blue-500/20 text-blue-400';
        case RevisionStatus.PENDING: return 'bg-yellow-500/20 text-yellow-400';
        default: return 'bg-gray-500/20 text-gray-400';
    }
};


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const getSubStatusText = (project: Project): string => {
    if (project.activeSubStatuses && project.activeSubStatuses.length > 0) {
        return project.activeSubStatuses.join(', ');
    }
    if (project.status === 'Dikirim' && project.shippingDetails) {
        return `Dikirim: ${project.shippingDetails}`;
    }
    return project.status;
};

const getStatusColor = (status: string, config: ProjectStatusConfig[]): string => {
    const statusConfig = config.find(c => c.name === status);
    return statusConfig ? statusConfig.color : '#64748b'; // slate-500 default
};

const getStatusClass = (status: string, config: ProjectStatusConfig[]) => {
    const color = getStatusColor(status, config);
     const colorMap: { [key: string]: string } = {
        '#10b981': 'status-badge status-success', // Selesai
        '#3b82f6': 'status-badge status-info', // Dikonfirmasi
        '#8b5cf6': 'status-badge status-purple', // Editing
        '#f97316': 'status-badge status-orange', // Cetak
        '#06b6d4': 'status-badge status-cyan', // Dikirim
        '#eab308': 'status-badge status-warning', // Tertunda
        '#6366f1': 'status-badge status-info', // Persiapan
        '#ef4444': 'status-badge status-danger', // Dibatalkan
        '#14b8a6': 'status-badge status-cyan', // Revisi
    };
    return colorMap[color] || 'status-badge status-gray';
};

const ConfirmationIcons: React.FC<{ project: Project }> = ({ project }) => (
    <div className="flex items-center gap-1.5">
        {project.isEditingConfirmedByClient && <span title="Editing dikonfirmasi klien"><CheckCircleIcon className="w-4 h-4 text-green-500" /></span>}
        {project.isPrintingConfirmedByClient && <span title="Cetak dikonfirmasi klien"><CheckCircleIcon className="w-4 h-4 text-green-500" /></span>}
        {project.isDeliveryConfirmedByClient && <span title="Pengiriman dikonfirmasi klien"><CheckCircleIcon className="w-4 h-4 text-green-500" /></span>}
    </div>
);

// --- [NEW] ProjectForm Component ---
interface ProjectFormProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    formData: any; // Simplified for now
    onFormChange: (e: React.ChangeEvent<any>) => void;
    onSubStatusChange: (option: string, isChecked: boolean) => void;
    onClientChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onTeamChange: (member: TeamMember) => void;
    onTeamFeeChange: (memberId: string, fee: number) => void;
    onTeamRewardChange: (memberId: string, reward: number) => void;
    onTeamSubJobChange: (memberId: string, subJob: string) => void;
    onCustomSubStatusChange: (index: number, field: 'name' | 'note', value: string) => void;
    onAddCustomSubStatus: () => void;
    onRemoveCustomSubStatus: (index: number) => void;
    onSubmit: (e: React.FormEvent) => void;
    clients: Client[];
    teamMembers: TeamMember[];
    profile: Profile;
    teamByRole: Record<string, TeamMember[]>;
    onCustomCostChange: (index: number, field: 'description' | 'amount', value: string) => void;
    onAddCustomCost: () => void;
    onRemoveCustomCost: (index: number) => void;
    onPayPrintingItem: (projectId: string, printingItemId: string, sourceCardId: string, sourcePocketId?: string) => void;
    onPayTransportItem: (projectId: string, transportItemId: string, cardId: string, pocketId?: string) => void;
    cards: Card[];
    pockets: FinancialPocket[];
    showNotification: (message: string) => void;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
    isOpen, onClose, mode, formData, onFormChange, onSubStatusChange, onClientChange,
    onTeamChange, onTeamFeeChange, onTeamRewardChange, onTeamSubJobChange,
    onCustomSubStatusChange, onAddCustomSubStatus, onRemoveCustomSubStatus,
    onSubmit, clients, teamMembers,
    profile, teamByRole,
    onCustomCostChange, onAddCustomCost, onRemoveCustomCost,
    onPayPrintingItem, onPayTransportItem, cards, pockets, showNotification, setFormData
}) => {
    const [printingPaymentSource, setPrintingPaymentSource] = useState<{ [itemId: string]: string }>({});
    const [printingPaymentType, setPrintingPaymentType] = useState<{ [itemId: string]: 'card' | 'pocket' }>({});

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'add' ? 'Tambah Proyek Baru (Operasional)' : `Edit Proyek: ${formData.projectName}`}
            size="4xl"
        >
            <form onSubmit={onSubmit} className="space-y-4 md:space-y-6 form-compact form-compact--ios-scale">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-4 md:gap-y-6 max-h-[70vh] overflow-y-auto pr-2 pb-4">
                    {/* --- LEFT COLUMN --- */}
                    <div className="space-y-5 md:space-y-6">
                        {/* Section 1: Basic Info */}
                        <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                            <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Informasi Dasar Proyek</h4>
                            <div className="space-y-5">
                                {mode === 'add' && (
                                    <div className="space-y-2">
                                        <label htmlFor="clientId" className="block text-xs text-brand-text-secondary">Klien</label>
                                        <select id="clientId" name="clientId" value={formData.clientId} onChange={onClientChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                            <option value="">Pilih Klien...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <p className="text-xs text-brand-text-secondary">Pilih klien yang terkait dengan proyek ini</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label htmlFor="projectName" className="block text-xs text-brand-text-secondary">Nama Proyek</label>
                                    <input type="text" id="projectName" name="projectName" value={formData.projectName} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Masukkan nama proyek" required />
                                    <p className="text-xs text-brand-text-secondary">Nama proyek atau acara (contoh: Wedding John & Jane)</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="projectType" className="block text-xs text-brand-text-secondary">Jenis Proyek</label>
                                        <select id="projectType" name="projectType" value={formData.projectType} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                            <option value="" disabled>Pilih Jenis...</option>
                                            {profile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                        </select>
                                        <p className="text-xs text-brand-text-secondary">Kategori jenis acara</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="status" className="block text-xs text-brand-text-secondary">Status Proyek</label>
                                        <select id="status" name="status" value={formData.status} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                            {profile.projectStatusConfig.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                        <p className="text-xs text-brand-text-secondary">Status progres proyek saat ini</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="location" className="block text-xs text-brand-text-secondary">Lokasi</label>
                                    <input type="text" id="location" name="location" value={formData.location} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Lokasi acara" />
                                    <p className="text-xs text-brand-text-secondary">Lokasi atau venue tempat acara berlangsung</p>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Schedule & Details */}
                        <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                            <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Jadwal & Detail</h4>
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="date" className="block text-xs text-brand-text-secondary">Tanggal Acara</label>
                                        <input type="date" id="date" name="date" value={formData.date} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required />
                                        <p className="text-xs text-brand-text-secondary">Tanggal pelaksanaan acara</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="deadlineDate" className="block text-xs text-brand-text-secondary">Deadline</label>
                                        <input type="date" id="deadlineDate" name="deadlineDate" value={formData.deadlineDate} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                        <p className="text-xs text-brand-text-secondary">Batas waktu penyerahan hasil</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="startTime" className="block text-xs text-brand-text-secondary">Waktu Mulai</label>
                                        <input type="time" id="startTime" name="startTime" value={formData.startTime} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                        <p className="text-xs text-brand-text-secondary">Jam mulai acara</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="endTime" className="block text-xs text-brand-text-secondary">Waktu Selesai</label>
                                        <input type="time" id="endTime" name="endTime" value={formData.endTime} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                        <p className="text-xs text-brand-text-secondary">Jam selesai acara</p>
                                    </div>
                                </div>
                                {formData.status === 'Dikirim' && (
                                    <div className="space-y-2">
                                        <label htmlFor="shippingDetails" className="block text-xs text-brand-text-secondary">Detail Pengiriman</label>
                                        <input type="text" id="shippingDetails" name="shippingDetails" value={formData.shippingDetails} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Masukkan detail pengiriman" />
                                        <p className="text-xs text-brand-text-secondary">Informasi pengiriman hasil ke klien</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Section 3: Links & Notes - Using CollapsibleSection */}
                        <CollapsibleSection
                            title="Tautan & Catatan"
                            defaultExpanded={false}
                            status={formData.driveLink || formData.notes ? 'valid' : undefined}
                            statusText={formData.driveLink || formData.notes ? 'Terisi' : undefined}
                        >
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="driveLink" className="block text-xs text-brand-text-secondary">Link Brief/Moodboard (Internal)</label>
                                    <input type="url" id="driveLink" name="driveLink" value={formData.driveLink} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="https://..." />
                                    <p className="text-xs text-brand-text-secondary">Link ke folder brief atau moodboard untuk tim internal</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="clientDriveLink" className="block text-xs text-brand-text-secondary">Link File dari Klien</label>
                                    <input type="url" id="clientDriveLink" name="clientDriveLink" value={formData.clientDriveLink} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="https://..." />
                                    <p className="text-xs text-brand-text-secondary">Link file atau referensi yang diberikan klien</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="finalDriveLink" className="block text-xs text-brand-text-secondary">Link File Jadi (untuk Klien)</label>
                                    <input type="url" id="finalDriveLink" name="finalDriveLink" value={formData.finalDriveLink} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="https://..." />
                                    <p className="text-xs text-brand-text-secondary">Link hasil akhir yang akan dibagikan ke klien</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="notes" className="block text-xs text-brand-text-secondary">Catatan Tambahan</label>
                                    <textarea id="notes" name="notes" value={formData.notes} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" placeholder="Catatan tambahan untuk proyek ini..." rows={4}></textarea>
                                    <p className="text-xs text-brand-text-secondary">Catatan penting terkait proyek ini</p>
                                </div>
                            </div>
                        </CollapsibleSection>
                    </div>

                    {/* --- RIGHT COLUMN --- */}
                    <div className="space-y-5 md:space-y-6">
                        {/* Section 4: Team Assignment */}
                        <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                            <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Tugas Tim</h4>
                            <div className="space-y-3">
                                {Object.entries(teamByRole).map(([role, members]) => (
                                    <div key={role}>
                                        <h5 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-2">{role}</h5>
                                        {members.map(member => {
                                            const assignedMember = formData.team.find((t: any) => t.memberId === member.id);
                                            const isSelected = !!assignedMember;
                                            return (
                                                <div key={member.id} className={`p-4 rounded-xl transition-all ${isSelected ? 'bg-blue-50/10 border-2 border-blue-400' : 'bg-brand-bg border border-brand-border'}`}>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" checked={isSelected} onChange={() => onTeamChange(member)} className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0" />
                                                            <span className="font-semibold text-brand-text-light">{member.name}</span>
                                                        </label>
                                                        {isSelected && <p className="text-xs text-brand-text-secondary">Fee Standar: {formatCurrency(member.standardFee)}</p>}
                                                    </div>
                                                    {isSelected && (
                                                        <div className="space-y-4 mt-4 pt-4 border-t border-brand-border">
                                                            <div className="space-y-2">
                                                                <label className="block text-xs text-brand-text-secondary">Fee Proyek</label>
                                                                <input 
                                                                    type="number" 
                                                                    value={assignedMember.fee} 
                                                                    onChange={e => onTeamFeeChange(member.id, Number(e.target.value))} 
                                                                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                                                    placeholder="0"
                                                                />
                                                                <p className="text-xs text-brand-text-secondary">Fee yang akan diterima untuk proyek ini</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="block text-xs text-brand-text-secondary">Reward (Opsional)</label>
                                                                <input 
                                                                    type="number" 
                                                                    value={assignedMember.reward || ''} 
                                                                    onChange={e => onTeamRewardChange(member.id, Number(e.target.value))} 
                                                                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                                                    placeholder="0"
                                                                />
                                                                <p className="text-xs text-brand-text-secondary">Bonus atau reward tambahan</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="block text-xs text-brand-text-secondary">Sub-Job (Opsional)</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={assignedMember.subJob || ''} 
                                                                    onChange={e => onTeamSubJobChange(member.id, e.target.value)} 
                                                                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                                                    placeholder="Tugas spesifik"
                                                                />
                                                                <p className="text-xs text-brand-text-secondary">Tugas atau peran spesifik dalam proyek</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Section 5: Additional Costs */}
                        <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                            <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Biaya Operasional</h4>
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                                <p className="text-xs text-blue-400">
                                    <strong>ℹ️ Info:</strong> Biaya Cetak dan Transport sekarang dikelola secara detail di section masing-masing di bawah.
                                </p>
                            </div>
                            <div className="mt-4">
                                <label className="text-sm font-medium text-brand-text-secondary block mb-2">Biaya Tambahan Lainnya</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {(formData.customCosts || []).map((cost: any, index: number) => (
                                        <div key={cost.id} className="flex items-center gap-2">
                                            <div className="input-group flex-grow !mt-0"><input type="text" value={cost.description || ''} onChange={e => onCustomCostChange(index, 'description', e.target.value)} placeholder="Deskripsi" className="input-field !p-2 !text-sm" /></div>
                                            <div className="input-group w-32 !mt-0"><input type="number" value={cost.amount ?? ''} onChange={e => onCustomCostChange(index, 'amount', e.target.value)} placeholder="Jumlah" className="input-field !p-2 !text-sm" /></div>
                                            <button type="button" onClick={() => onRemoveCustomCost(index)} className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full flex-shrink-0"><Trash2Icon className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={onAddCustomCost} className="text-sm font-semibold text-brand-accent hover:underline mt-2">+ Tambah Biaya</button>
                            </div>
                        </section>
                        
                         <CollapsibleSection
                            title="Output Fisik (Cetak)"
                            defaultExpanded={false}
                            status={(formData.printingDetails || []).length > 0 ? 'info' : undefined}
                            statusText={(formData.printingDetails || []).length > 0 ? `${(formData.printingDetails || []).length} item` : undefined}
                        >
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {(formData.printingDetails || []).length > 0 ? (formData.printingDetails || []).map((item: PrintingItem) => {
                                    const isPaid = item.paymentStatus === 'Paid';
                                    return (
                                        <div key={item.id} className={`p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${isPaid ? 'bg-green-500/10' : 'bg-brand-bg'}`}>
                                            <div>
                                                <p className="font-medium text-brand-text-light">{item.customName || item.type}</p>
                                                <p className="text-sm text-brand-text-secondary">{formatCurrency(item.cost)}</p>
                                            </div>
                                            {isPaid ? (
                                                <span className="text-xs font-bold text-green-500 bg-green-500/20 px-3 py-1 rounded-full flex items-center gap-1.5"><CheckCircleIcon className="w-4 h-4"/> Lunas</span>
                                            ) : (
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                                                    <div className="flex items-center gap-2 flex-grow w-full">
                                                        <div className="input-group flex-grow !mt-0">
                                                            <select 
                                                                value={printingPaymentType[item.id] || 'card'}
                                                                onChange={e => {
                                                                    setPrintingPaymentType(prev => ({ ...prev, [item.id]: e.target.value as 'card' | 'pocket' }));
                                                                    setPrintingPaymentSource(prev => ({ ...prev, [item.id]: '' }));
                                                                }}
                                                                className="input-field !p-2 !text-xs !h-10"
                                                            >
                                                                <option value="card">Kartu</option>
                                                                <option value="pocket">Kantong</option>
                                                            </select>
                                                        </div>
                                                        <div className="input-group flex-grow !mt-0">
                                                            <select 
                                                                value={printingPaymentSource[item.id] || ''}
                                                                onChange={e => setPrintingPaymentSource(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                className="input-field !p-2 !text-xs !h-10"
                                                            >
                                                                <option value="">Pilih {printingPaymentType[item.id] === 'pocket' ? 'Kantong' : 'Kartu'}...</option>
                                                                {printingPaymentType[item.id] === 'pocket' 
                                                                    ? pockets.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.amount)})</option>)
                                                                    : cards.map(c => <option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)
                                                                }
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            if (printingPaymentSource[item.id]) {
                                                                if (printingPaymentType[item.id] === 'pocket') {
                                                                    onPayPrintingItem(formData.id, item.id, '', printingPaymentSource[item.id]);
                                                                } else {
                                                                    onPayPrintingItem(formData.id, item.id, printingPaymentSource[item.id]);
                                                                }
                                                            } else {
                                                                showNotification("Pilih sumber dana terlebih dahulu.");
                                                            }
                                                        }}
                                                        className="button-primary !text-xs !px-3 !py-2.5 whitespace-nowrap"
                                                    >
                                                        Bayar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : <p className="text-sm text-center text-brand-text-secondary py-4">Tidak ada item cetak untuk proyek ini.</p>}
                            </div>
                        </CollapsibleSection>

                        {/* Section 5.5: Transport Details - Using CollapsibleSection */}
                        <CollapsibleSection
                            title="Biaya Transportasi"
                            defaultExpanded={false}
                            status={(formData.transportDetails || []).length > 0 ? 'info' : undefined}
                            statusText={(formData.transportDetails || []).length > 0 ? `${(formData.transportDetails || []).length} item` : undefined}
                        >
                            <div className="flex items-center justify-between pb-2 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.transportUsed || false}
                                        onChange={e => setFormData(prev => ({ ...prev, transportUsed: e.target.checked }))}
                                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
                                    />
                                    <span className="text-xs font-medium text-brand-text-secondary">Gunakan Transport</span>
                                </label>
                            </div>
                            
                            {formData.transportUsed ? (
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {(formData.transportDetails || []).length > 0 ? (formData.transportDetails || []).map((item: TransportItem, idx: number) => {
                                        const isPaid = item.paymentStatus === 'Paid';
                                        return (
                                            <div key={item.id} className={`p-3 rounded-lg border ${isPaid ? 'bg-green-500/10 border-green-500/30' : 'bg-brand-bg border-brand-border'}`}>
                                                {!isPaid ? (
                                                    <div className="space-y-2 mb-3">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input 
                                                                type="text"
                                                                value={item.description || ''}
                                                                onChange={e => {
                                                                    const newDetails = (formData.transportDetails || []).map(t => 
                                                                        t.id === item.id ? {...t, description: e.target.value} : t
                                                                    );
                                                                    setFormData(prev => ({ ...prev, transportDetails: newDetails }));
                                                                }}
                                                                placeholder="Deskripsi (e.g., Tol, Parkir)"
                                                                className="input-field !p-2 !text-xs"
                                                            />
                                                            <input 
                                                                type="number"
                                                                value={item.cost || ''}
                                                                onChange={e => {
                                                                    const newDetails = (formData.transportDetails || []).map(t => 
                                                                        t.id === item.id ? {...t, cost: Number(e.target.value)} : t
                                                                    );
                                                                    setFormData(prev => ({ ...prev, transportDetails: newDetails }));
                                                                }}
                                                                placeholder="Biaya"
                                                                className="input-field !p-2 !text-xs"
                                                            />
                                                        </div>
                                                        <input 
                                                            type="text"
                                                            value={item.notes || ''}
                                                            onChange={e => {
                                                                const newDetails = (formData.transportDetails || []).map(t => 
                                                                    t.id === item.id ? {...t, notes: e.target.value} : t
                                                                );
                                                                setFormData(prev => ({ ...prev, transportDetails: newDetails }));
                                                            }}
                                                            placeholder="Catatan (opsional)"
                                                            className="input-field !p-2 !text-xs"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="mb-3">
                                                        <p className="font-medium text-brand-text-light">{item.description}</p>
                                                        <p className="text-sm text-brand-text-secondary">{formatCurrency(item.cost)}</p>
                                                        {item.notes && <p className="text-xs text-brand-text-secondary mt-1">{item.notes}</p>}
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center justify-between gap-2">
                                                    {isPaid ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-green-500 bg-green-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                                                                <CheckCircleIcon className="w-4 h-4"/> Lunas
                                                            </span>
                                                            {item.paidAt && (
                                                                <span className="text-xs text-brand-text-secondary">
                                                                    {new Date(item.paidAt).toLocaleDateString('id-ID')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-grow">
                                                            <select 
                                                                value={item.paymentType || 'card'}
                                                                onChange={e => {
                                                                    const newDetails = (formData.transportDetails || []).map(t => 
                                                                        t.id === item.id ? {...t, paymentType: e.target.value as 'card' | 'pocket', cardId: '', pocketId: ''} : t
                                                                    );
                                                                    setFormData(prev => ({ ...prev, transportDetails: newDetails }));
                                                                }}
                                                                className="input-field !p-2 !text-xs w-full sm:w-24"
                                                            >
                                                                <option value="card">Kartu</option>
                                                                <option value="pocket">Kantong</option>
                                                            </select>
                                                            <select 
                                                                value={(item.paymentType === 'pocket' ? item.pocketId : item.cardId) || ''}
                                                                onChange={e => {
                                                                    const newDetails = (formData.transportDetails || []).map(t => 
                                                                        t.id === item.id ? {
                                                                            ...t, 
                                                                            ...(item.paymentType === 'pocket' 
                                                                                ? { pocketId: e.target.value, cardId: '' }
                                                                                : { cardId: e.target.value, pocketId: '' }
                                                                            )
                                                                        } : t
                                                                    );
                                                                    setFormData(prev => ({ ...prev, transportDetails: newDetails }));
                                                                }}
                                                                className="input-field !p-2 !text-xs flex-grow"
                                                            >
                                                                <option value="">Pilih {item.paymentType === 'pocket' ? 'Kantong' : 'Kartu'}...</option>
                                                                {item.paymentType === 'pocket'
                                                                    ? pockets.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.amount)})</option>)
                                                                    : cards.map(c => <option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)
                                                                }
                                                            </select>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    if (!item.description || item.cost <= 0) {
                                                                        showNotification("Isi deskripsi dan biaya terlebih dahulu.");
                                                                        return;
                                                                    }
                                                                    const sourceId = item.paymentType === 'pocket' ? item.pocketId : item.cardId;
                                                                    if (sourceId) {
                                                                        if (item.paymentType === 'pocket') {
                                                                            onPayTransportItem(formData.id, item.id, '', sourceId);
                                                                        } else {
                                                                            onPayTransportItem(formData.id, item.id, sourceId);
                                                                        }
                                                                    } else {
                                                                        showNotification(`Pilih ${item.paymentType === 'pocket' ? 'kantong' : 'kartu'} pembayaran terlebih dahulu.`);
                                                                    }
                                                                }}
                                                                className="button-primary !text-xs !px-3 !py-2 whitespace-nowrap"
                                                            >
                                                                Bayar
                                                            </button>
                                                        </div>
                                                    )}
                                                    {!isPaid && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const newDetails = (formData.transportDetails || []).filter(t => t.id !== item.id);
                                                                setFormData(prev => ({ ...prev, transportDetails: newDetails }));
                                                            }}
                                                            className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full"
                                                        >
                                                            <Trash2Icon className="w-4 h-4"/>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }) : <p className="text-sm text-center text-brand-text-secondary py-4">Belum ada item transport. Klik tombol di bawah untuk menambah.</p>}
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const newItem: TransportItem = {
                                                id: `transport-${Date.now()}`,
                                                description: '',
                                                cost: 0,
                                                paymentStatus: 'Unpaid',
                                                notes: ''
                                            };
                                            setFormData(prev => ({
                                                ...prev,
                                                transportDetails: [...(prev.transportDetails || []), newItem]
                                            }));
                                        }}
                                        className="w-full py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50/10 rounded-lg transition-colors border border-dashed border-blue-600"
                                    >
                                        + Tambah Item Transport
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-brand-bg rounded-lg text-center">
                                    <p className="text-sm text-brand-text-secondary">Transport tidak digunakan untuk proyek ini</p>
                                    <p className="text-xs text-brand-text-secondary mt-1">Centang "Gunakan Transport" di atas untuk mengaktifkan</p>
                                </div>
                            )}
                        </CollapsibleSection>

                        {/* Section 6: Client Confirmation - Using CollapsibleSection */}
                        <CollapsibleSection
                            title="Konfirmasi Klien"
                            defaultExpanded={false}
                            status={formData.isEditingConfirmedByClient || formData.isPrintingConfirmedByClient || formData.isDeliveryConfirmedByClient ? 'valid' : undefined}
                            statusText={formData.isEditingConfirmedByClient || formData.isPrintingConfirmedByClient || formData.isDeliveryConfirmedByClient ? 'Ada konfirmasi' : undefined}
                        >
                            <div className="p-3 bg-brand-bg rounded-lg space-y-3">
                                <label className="flex items-center justify-between cursor-pointer"><span className="text-sm">Editing disetujui</span><input type="checkbox" name="isEditingConfirmedByClient" checked={formData.isEditingConfirmedByClient} onChange={onFormChange} className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 flex-shrink-0" /></label>
                                <label className="flex items-center justify-between cursor-pointer"><span className="text-sm">Cetak disetujui</span><input type="checkbox" name="isPrintingConfirmedByClient" checked={formData.isPrintingConfirmedByClient} onChange={onFormChange} className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 flex-shrink-0" /></label>
                                <label className="flex items-center justify-between cursor-pointer"><span className="text-sm">Pengiriman disetujui</span><input type="checkbox" name="isDeliveryConfirmedByClient" checked={formData.isDeliveryConfirmedByClient} onChange={onFormChange} className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 flex-shrink-0" /></label>
                            </div>
                        </CollapsibleSection>
                        
                        {/* Section 7: Custom Sub-Status */}
                        <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                            <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Sub-Status untuk "{formData.status}"</h4>
                            <div className="p-4 bg-brand-bg rounded-xl">
                                <label className="block text-xs font-semibold text-blue-600 mb-2">Pilih sub-status aktif:</label>
                                <p className="text-xs text-brand-text-secondary mb-3">Centang sub-status yang sedang aktif untuk proyek ini</p>
                                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                                    {(formData.customSubStatuses || []).map((sub: SubStatusConfig) => (
                                        <label key={sub.name} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                            (formData.activeSubStatuses || []).includes(sub.name) 
                                            ? 'bg-blue-50/10 border-2 border-blue-400' 
                                            : 'bg-brand-input border border-brand-border hover:border-blue-300'
                                        }`}>
                                            <input 
                                                type="checkbox" 
                                                checked={(formData.activeSubStatuses || []).includes(sub.name)} 
                                                onChange={e => onSubStatusChange(sub.name, e.target.checked)} 
                                                className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
                                            />
                                            <span className="font-medium">{sub.name}</span>
                                        </label>
                                    ))}
                                </div>

                                <h5 className="text-sm font-semibold text-brand-text-secondary mt-6 pt-4 border-t border-brand-border">Edit Sub-Status (khusus proyek ini)</h5>
                                <p className="text-xs text-brand-text-secondary mb-3">Kelola sub-status khusus untuk proyek ini</p>
                                <div className="space-y-4 mt-3 max-h-60 overflow-y-auto pr-2">
                                    {(formData.customSubStatuses || []).map((sub: SubStatusConfig, index: number) => (
                                        <div key={index} className="p-4 bg-brand-surface rounded-xl border border-brand-border space-y-4">
                                            <div className="space-y-2">
                                                <label className="block text-xs text-brand-text-secondary">Nama Sub-Status</label>
                                                <input 
                                                    type="text" 
                                                    value={sub.name || ''} 
                                                    onChange={e => onCustomSubStatusChange(index, 'name', e.target.value)} 
                                                    placeholder="Masukkan nama sub-status" 
                                                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                />
                                                <p className="text-xs text-brand-text-secondary">Nama tahapan atau status (contoh: Editing Foto)</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-xs text-brand-text-secondary">Catatan (Opsional)</label>
                                                <input 
                                                    type="text" 
                                                    value={sub.note || ''} 
                                                    onChange={e => onCustomSubStatusChange(index, 'note', e.target.value)} 
                                                    placeholder="Catatan tambahan" 
                                                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                />
                                                <p className="text-xs text-brand-text-secondary">Keterangan atau detail tambahan</p>
                                            </div>
                                            <div className="flex justify-end pt-2 border-t border-brand-border">
                                                <button 
                                                    type="button" 
                                                    onClick={() => onRemoveCustomSubStatus(index)} 
                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2Icon className="w-4 h-4"/>
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    type="button" 
                                    onClick={onAddCustomSubStatus} 
                                    className="mt-3 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50/10 rounded-lg transition-colors"
                                >
                                    + Tambah Sub-Status Baru
                                </button>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-end items-stretch md:items-center gap-3 pt-6 border-t border-brand-border">
                    <button type="button" onClick={onClose} className="button-secondary w-full md:w-auto order-2 md:order-1">Batal</button>
                    <button type="submit" className="button-primary w-full md:w-auto order-1 md:order-2 active:scale-95 transition-transform">{mode === 'add' ? 'Simpan Proyek' : 'Update Proyek'}</button>
                </div>
            </form>
        </Modal>
    );
};


// --- Project Value by Type Chart Component ---
const ProjectValueByTypeChart: React.FC<{ projects: Project[] }> = ({ projects }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    
    const chartData = useMemo(() => {
        const typeValues = projects.reduce((acc, p) => {
            acc[p.projectType] = (acc[p.projectType] || 0) + p.totalCost;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(typeValues)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6 types
    }, [projects]);
    
    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    const colors = ['from-blue-500 to-cyan-400', 'from-purple-500 to-pink-400', 'from-green-500 to-emerald-400', 'from-orange-500 to-amber-400', 'from-pink-500 to-rose-400', 'from-indigo-500 to-blue-400'];
    
    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-sm text-brand-text-secondary">
                Belum ada data proyek
            </div>
        );
    }
    
    return (
        <div className="space-y-3">
            {chartData.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;
                const isHovered = hoveredIndex === index;
                return (
                    <div 
                        key={item.name}
                        className="relative"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm font-medium transition-colors ${isHovered ? 'text-brand-accent' : 'text-brand-text-light'}`}>
                                {item.name}
                            </span>
                            <span className="text-xs font-semibold text-brand-text-secondary">
                                {formatCurrency(item.value)}
                            </span>
                        </div>
                        <div className="h-3 bg-brand-bg rounded-full overflow-hidden">
                            <div 
                                className={`h-full bg-gradient-to-r ${colors[index % colors.length]} transition-all duration-500 rounded-full ${isHovered ? 'shadow-lg' : ''}`}
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- [NEW] ProjectAnalytics Component ---
const ProjectAnalytics: React.FC<{
    projects: Project[];
    teamProjectPayments: TeamProjectPayment[];
    projectStatusConfig: ProjectStatusConfig[];
    onStatCardClick: (stat: 'value' | 'receivables' | 'team_costs' | 'top_type') => void;
}> = ({ projects, teamProjectPayments, projectStatusConfig, onStatCardClick }) => {
    const activeProjects = useMemo(() => projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);

    const stats = useMemo(() => {
        const totalActiveValue = activeProjects.reduce((sum, p) => sum + p.totalCost, 0);
        const totalReceivables = activeProjects.reduce((sum, p) => sum + (p.totalCost - p.amountPaid), 0);
        const unpaidTeamCosts = teamProjectPayments.filter(p => p.status === 'Unpaid' && activeProjects.some(ap => ap.id === p.projectId)).reduce((sum, p) => sum + p.fee, 0);

        const projectTypeCounts = projects.reduce((acc, p) => {
            acc[p.projectType] = (acc[p.projectType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topProjectType = Object.keys(projectTypeCounts).length > 0
            ? Object.entries(projectTypeCounts).sort(([, a], [, b]) => b - a)[0][0]
            : 'N/A';
            
        return { totalActiveValue, totalReceivables, unpaidTeamCosts, topProjectType };
    }, [activeProjects, teamProjectPayments, projects]);
    
    const projectStatusDistribution = useMemo(() => {
        const statusCounts = activeProjects.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([label, value]) => {
            const config = projectStatusConfig.find(s => s.name === label);
            return {
                label,
                value,
                color: config ? config.color : '#64748b'
            };
        }).sort((a,b) => b.value - a.value);
    }, [activeProjects, projectStatusConfig]);

    return (
        <div className="mb-6 space-y-6">
             <div className="grid grid-cols-2 gap-3 md:gap-6">
                <div className="widget-animate transition-transform duration-200 hover:scale-105" style={{ animationDelay: '100ms' }}>
                    <StatCard 
                        icon={<DollarSignIcon className="w-5 h-5 md:w-6 md:h-6"/>} 
                        title="Nilai Proyek Aktif" 
                        value={formatCurrency(stats.totalActiveValue)} 
                        subtitle="Total nilai proyek berjalan" 
                        colorVariant="blue"
                        description={`Nilai total dari semua proyek yang sedang aktif (belum selesai atau dibatalkan).\n\nTotal: ${formatCurrency(stats.totalActiveValue)}\nJumlah Proyek: ${activeProjects.length}\n\nNilai ini mencerminkan potensi pendapatan dari proyek yang sedang berjalan.`}
                        onClick={() => onStatCardClick('value')}
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-105" style={{ animationDelay: '200ms' }}>
                    <StatCard 
                        icon={<AlertCircleIcon className="w-5 h-5 md:w-6 md:h-6"/>} 
                        title="Total Piutang" 
                        value={formatCurrency(stats.totalReceivables)} 
                        subtitle="Sisa tagihan belum dibayar" 
                        colorVariant="orange"
                        description={`Total piutang adalah sisa pembayaran yang belum diterima dari klien.\n\nTotal Piutang: ${formatCurrency(stats.totalReceivables)}\n\nPiutang perlu ditagih untuk menjaga cash flow bisnis Anda. Pastikan untuk menindaklanjuti pembayaran yang tertunda.`}
                        onClick={() => onStatCardClick('receivables')}
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-105" style={{ animationDelay: '300ms' }}>
                    <StatCard 
                        icon={<BriefcaseIcon className="w-5 h-5 md:w-6 md:h-6"/>} 
                        title="Biaya Tim Belum Lunas" 
                        value={formatCurrency(stats.unpaidTeamCosts)} 
                        subtitle="Fee freelancer yang tertunda" 
                        colorVariant="pink"
                        description={`Total fee yang belum dibayarkan kepada freelancer/tim.\n\nTotal Belum Lunas: ${formatCurrency(stats.unpaidTeamCosts)}\n\nPastikan untuk membayar fee tim tepat waktu untuk menjaga hubungan baik dan motivasi kerja.`}
                        onClick={() => onStatCardClick('team_costs')}
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-105" style={{ animationDelay: '400ms' }}>
                    <StatCard 
                        icon={<FolderKanbanIcon className="w-5 h-5 md:w-6 md:h-6"/>} 
                        title="Jenis Proyek Teratas" 
                        value={stats.topProjectType} 
                        subtitle="Jenis paling banyak dikerjakan" 
                        colorVariant="purple"
                        description={`Jenis proyek yang paling sering Anda kerjakan.\n\nJenis Teratas: ${stats.topProjectType}\n\nInformasi ini membantu Anda memahami spesialisasi bisnis dan fokus pemasaran.`}
                        onClick={() => onStatCardClick('top_type')}
                    />
                </div>
            </div>

            <div className="bg-brand-surface p-4 md:p-6 rounded-2xl shadow-lg border border-brand-border widget-animate" style={{ animationDelay: '500ms' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="md:col-span-1">
                         <h3 className="text-base md:text-lg font-bold text-gradient mb-2">Distribusi Status Proyek</h3>
                         <p className="text-xs text-brand-text-secondary mb-3 md:mb-4">Breakdown status proyek aktif</p>
                        <DonutChart data={projectStatusDistribution} />
                    </div>
                    <div className="md:col-span-2">
                        <h3 className="text-base md:text-lg font-bold text-gradient mb-2">Nilai Proyek per Jenis</h3>
                        <p className="text-xs text-brand-text-secondary mb-3 md:mb-4">Total nilai proyek berdasarkan jenis acara</p>
                        <ProjectValueByTypeChart projects={activeProjects} />
                    </div>
                </div>
            </div>
        </div>
    );
};


interface ProjectListViewProps {
    projects: Project[];
    handleOpenDetailModal: (project: Project) => void;
    handleOpenForm: (mode: 'edit', project: Project) => void;
    handleProjectDelete: (projectId: string) => void;
    config: ProjectStatusConfig[];
    clients: Client[];
    handleQuickStatusChange: (projectId: string, newStatus: string, notifyClient: boolean) => Promise<void>;
    handleSendMessage: (project: Project) => void;
    handleViewInvoice: (project: Project) => void;
}

const ProjectListView: React.FC<ProjectListViewProps> = ({ projects, handleOpenDetailModal, handleOpenForm, handleProjectDelete, config, clients, handleQuickStatusChange, handleSendMessage, handleViewInvoice }) => {
    
    const ProgressBar: React.FC<{ progress: number, status: string, config: ProjectStatusConfig[] }> = ({ progress, status, config }) => (
        <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: getStatusColor(status, config) }}></div>
        </div>
    );
    
    return (
    <div>
        {/* Mobile cards - Using ProjectCard Component */}
        <div className="md:hidden space-y-3">
            {projects.map(p => {
                const client = clients.find(c => c.id === p.clientId);
                return (
                    <ProjectCard
                        key={p.id}
                        project={p}
                        client={client}
                        projectStatusConfig={config}
                        onStatusChange={(projectId, newStatus) => handleQuickStatusChange(projectId, newStatus, false)}
                        onViewDetails={handleOpenDetailModal}
                        onEdit={(project) => handleOpenForm('edit', project)}
                        onSendMessage={handleSendMessage}
                        onViewInvoice={handleViewInvoice}
                    />
                );
            })}
            {projects.length === 0 && <p className="text-center py-8 text-sm text-brand-text-secondary">Tidak ada proyek dalam kategori ini.</p>}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-brand-text-secondary uppercase">
                <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Nama Proyek</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Klien</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Tanggal</th>
                    <th className="px-6 py-4 font-medium tracking-wider min-w-[200px]">Progress</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Tim</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
                {projects.map(p => (
                    <tr key={p.id} className="hover:bg-brand-bg transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-brand-text-light">{p.projectName}</p>
                                <ConfirmationIcons project={p} />
                            </div>
                            <p className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${getStatusClass(p.status, config)}`}>
                                {getSubStatusText(p)}
                            </p>
                        </td>
                        <td className="px-6 py-4 text-brand-text-primary">{p.clientName}</td>
                        <td className="px-6 py-4 text-brand-text-primary">{new Date(p.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <ProgressBar progress={p.progress} status={p.status} config={config} />
                                <span className="text-xs font-semibold text-brand-text-secondary">{p.progress}%</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-brand-text-primary">{p.team.map(t => t.name.split(' ')[0]).join(', ') || '-'}</td>
                        <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-1">
                                <button onClick={() => handleOpenDetailModal(p)} className="p-2 text-brand-text-secondary hover:bg-gray-700/50 rounded-full" title="Detail Proyek"><EyeIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleOpenForm('edit', p)} className="p-2 text-brand-text-secondary hover:bg-gray-700/50 rounded-full" title="Edit Proyek"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleProjectDelete(p.id)} className="p-2 text-brand-text-secondary hover:bg-gray-700/50 rounded-full" title="Hapus Proyek"><Trash2Icon className="w-5 h-5"/></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {projects.length === 0 && <p className="text-center py-8 text-sm text-brand-text-secondary">Tidak ada proyek dalam kategori ini.</p>}
        </div>
    </div>
    );
};

interface ProjectKanbanViewProps {
    projects: Project[];
    handleOpenDetailModal: (project: Project) => void;
    draggedProjectId: string | null;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, projectId: string) => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDrop: (e: React.DragEvent<HTMLDivElement>, newStatus: string) => void;
    config: ProjectStatusConfig[];
}

const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({ projects, handleOpenDetailModal, draggedProjectId, handleDragStart, handleDragOver, handleDrop, config }) => {
    
    const ProgressBar: React.FC<{ progress: number, status: string, config: ProjectStatusConfig[] }> = ({ progress, status, config }) => (
        <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: getStatusColor(status, config) }}></div>
        </div>
    );
    
    return (
    <div className="flex gap-6 overflow-x-auto pb-4">
        {config
            .filter(statusConfig => statusConfig.name !== 'Dibatalkan')
            .map(statusConfig => {
                const status = statusConfig.name;
                return (
                    <div 
                        key={status} 
                        className="w-80 flex-shrink-0 bg-brand-bg rounded-2xl border border-brand-border"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        <div className="p-4 font-semibold text-brand-text-light border-b-2 flex justify-between items-center sticky top-0 bg-brand-bg/80 backdrop-blur-sm rounded-t-2xl z-10" style={{ borderBottomColor: getStatusColor(status, config) }}>
                            <span>{status}</span>
                            <span className="text-sm font-normal bg-brand-surface text-brand-text-secondary px-2.5 py-1 rounded-full">{projects.filter(p => p.status === status).length}</span>
                        </div>
                        <div className="p-3 space-y-3 h-[calc(100vh-420px)] overflow-y-auto">
                            {projects
                                .filter(p => p.status === status)
                                .map(p => (
                                    <div
                                        key={p.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, p.id)}
                                        onClick={() => handleOpenDetailModal(p)}
                                        className={`p-4 bg-brand-surface rounded-xl cursor-grab border-l-4 shadow-lg ${draggedProjectId === p.id ? 'opacity-50 ring-2 ring-brand-accent' : 'opacity-100'}`}
                                        style={{ borderLeftColor: getStatusColor(p.status, config) }}
                                    >
                                        <p className="font-semibold text-sm text-brand-text-light">{p.projectName}</p>
                                        <p className="text-xs text-brand-text-secondary mt-1">{p.clientName}</p>
                                        <p className="text-xs font-bold text-brand-text-primary mt-1">
                                            {getSubStatusText(p)}
                                        </p>
                                        <ProgressBar progress={p.progress} status={p.status} config={config}/>
                                        <div className="flex justify-between items-center mt-3 text-xs">
                                            <span className="text-brand-text-secondary">{new Date(p.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</span>
                                            <ConfirmationIcons project={p} />
                                            <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] ${getPaymentStatusClass(p.paymentStatus)}`}>
                                                <CreditCardIcon className="w-2.5 h-2.5" />
                                                {p.paymentStatus}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )
            })
        }
    </div>
    );
};

interface ProjectDetailModalProps {
    selectedProject: Project | null;
    setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>;
    teamMembers: TeamMember[];
    clients: Client[];
    profile: Profile;
    showNotification: (message: string) => void;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    onClose: () => void;
    handleOpenForm: (mode: 'edit', project: Project) => void;
    handleProjectDelete: (projectId: string) => void;
    handleOpenBriefingModal: (project: Project) => void;
    handleOpenConfirmationModal: (project: Project, subStatus: SubStatusConfig, isFollowUp: boolean) => void;
    packages: Package[];
    transactions: Transaction[];
    teamProjectPayments: TeamProjectPayment[];
    cards: Card[];
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ selectedProject, setSelectedProject, teamMembers, clients, profile, showNotification, setProjects, onClose, handleOpenForm, handleProjectDelete, handleOpenBriefingModal, handleOpenConfirmationModal, packages, transactions, teamProjectPayments, cards }) => {
    const [detailTab, setDetailTab] = useState<'details' | 'revisions' | 'files' | 'laba-rugi' | 'transport'>('details');
    const [newRevision, setNewRevision] = useState({ adminNotes: '', deadline: '', freelancerId: '' });

    const teamByRole = useMemo(() => {
        if (!selectedProject?.team) return {};
        return selectedProject.team.reduce((acc, member) => {
            const { role } = member;
            if (!acc[role]) {
                acc[role] = [];
            }
            acc[role].push(member);
            return acc;
        }, {} as Record<string, AssignedTeamMember[]>);
    }, [selectedProject?.team]);

    const handleAddRevision = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !newRevision.freelancerId || !newRevision.adminNotes || !newRevision.deadline) {
            showNotification('Harap lengkapi semua field revisi.');
            return;
        }

        // Persist to Supabase first
        try {
            const created = await createRevision(selectedProject.id, {
                // id will be generated by DB
                date: new Date().toISOString(),
                adminNotes: newRevision.adminNotes,
                deadline: newRevision.deadline,
                freelancerId: newRevision.freelancerId,
                status: RevisionStatus.PENDING,
            } as Omit<Revision, 'id'>);

            const updatedProject = { ...selectedProject, revisions: [...(selectedProject.revisions || []), created] } as Project;
            setProjects(prevProjects => prevProjects.map(p => p.id === selectedProject.id ? updatedProject : p));
            setSelectedProject(updatedProject);

            showNotification('Revisi baru berhasil ditambahkan.');
            setNewRevision({ adminNotes: '', deadline: '', freelancerId: '' });
        } catch (err) {
            console.warn('[Projects] Gagal menyimpan revisi ke Supabase:', err);
            showNotification('Gagal menyimpan revisi ke server. Coba lagi.');
        }
    };

    const handleShareRevisionLink = (revision: Revision) => {
        if (!selectedProject) return;
        const url = `${window.location.origin}${window.location.pathname}#/revision-form?projectId=${selectedProject.id}&freelancerId=${revision.freelancerId}&revisionId=${revision.id}`;
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Tautan revisi berhasil disalin!');
        }, (err) => {
            showNotification('Gagal menyalin tautan.');
            console.error('Could not copy text: ', err);
        });
    };

    const formatDateFull = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };
    
    const handleToggleDigitalItem = (itemText: string) => {
        if (!selectedProject) return;

        const currentCompleted = selectedProject.completedDigitalItems || [];
        const isCompleted = currentCompleted.includes(itemText);
        const newCompleted = isCompleted
            ? currentCompleted.filter(item => item !== itemText)
            : [...currentCompleted, itemText];

        const updatedProject = { ...selectedProject, completedDigitalItems: newCompleted };

        setProjects(prevProjects => prevProjects.map(p => p.id === selectedProject.id ? updatedProject : p));
        setSelectedProject(updatedProject); // Update local state for immediate UI feedback in the modal
    };
    
    if (!selectedProject) return null;

    const allSubStatusesForCurrentStatus = selectedProject.customSubStatuses || profile.projectStatusConfig.find(s => s.name === selectedProject.status)?.subStatuses || [];

    return (
        <div className="flex flex-col h-full">
            {/* Desktop Tab Navigation - Top */}
            <div className="hidden md:block border-b border-brand-border">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setDetailTab('details')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${detailTab === 'details' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><ClipboardListIcon className="w-5 h-5"/> Detail</button>
                    <button onClick={() => setDetailTab('laba-rugi')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${detailTab === 'laba-rugi' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><DollarSignIcon className="w-5 h-5"/> Laba/Rugi</button>
                    {selectedProject.transportUsed && (
                        <button onClick={() => setDetailTab('transport')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${detailTab === 'transport' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><CreditCardIcon className="w-5 h-5"/> Transport</button>
                    )}
                    <button onClick={() => setDetailTab('files')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${detailTab === 'files' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><FileTextIcon className="w-5 h-5"/> File & Tautan</button>
                    <button onClick={() => setDetailTab('revisions')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${detailTab === 'revisions' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><PencilIcon className="w-5 h-5"/> Revisi</button>
                </nav>
            </div>

            {/* Mobile Tab Navigation - Top Pills */}
            <div className="md:hidden mb-3">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button 
                        onClick={() => setDetailTab('details')} 
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                            detailTab === 'details' 
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30' 
                                : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                        }`}
                    >
                        <ClipboardListIcon className="w-4 h-4"/> 
                        <span>Detail</span>
                    </button>
                    <button 
                        onClick={() => setDetailTab('laba-rugi')} 
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                            detailTab === 'laba-rugi' 
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30' 
                                : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                        }`}
                    >
                        <DollarSignIcon className="w-4 h-4"/> 
                        <span>Laba/Rugi</span>
                    </button>
                    {selectedProject.transportUsed && (
                        <button 
                            onClick={() => setDetailTab('transport')} 
                            className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                                detailTab === 'transport' 
                                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30' 
                                    : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                            }`}
                        >
                            <CreditCardIcon className="w-4 h-4"/> 
                            <span>Transport</span>
                        </button>
                    )}
                    <button 
                        onClick={() => setDetailTab('files')} 
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                            detailTab === 'files' 
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30' 
                                : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                        }`}
                    >
                        <FileTextIcon className="w-4 h-4"/> 
                        <span>File</span>
                    </button>
                    <button 
                        onClick={() => setDetailTab('revisions')} 
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                            detailTab === 'revisions' 
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30' 
                                : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                        }`}
                    >
                        <PencilIcon className="w-4 h-4"/> 
                        <span>Revisi</span>
                    </button>
                </div>
            </div>

            <div className="pt-0 md:pt-6 max-h-[65vh] overflow-y-auto pr-2 pb-4">
                {detailTab === 'details' && (
                    <div className="space-y-6 tab-content-mobile">
                        {/* Mobile cards */}
                        <div className="md:hidden space-y-4">
                            {/* Header card */}
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-base font-semibold text-brand-text-light leading-tight">{selectedProject.projectName}</p>
                                        <p className="text-xs text-brand-text-secondary mt-0.5">{selectedProject.clientName}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${getStatusClass(selectedProject.status, profile.projectStatusConfig)}`}>{selectedProject.status}</span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-brand-text-secondary">Tanggal</span>
                                    <span className="text-brand-text-light text-right">{formatDateFull(selectedProject.date)}</span>
                                    <span className="text-brand-text-secondary">Lokasi</span>
                                    <span className="text-brand-text-light text-right">{selectedProject.location || '-'}</span>
                                </div>
                            </div>

                            {/* Paket & Biaya */}
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <h4 className="font-semibold text-brand-text-primary mb-1">Paket & Biaya</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Informasi paket yang dipilih, add-ons, dan rincian biaya proyek</p>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-brand-text-secondary">Paket</span>
                                    <span className="text-brand-text-light text-right">{selectedProject.packageName}</span>
                                    <span className="text-brand-text-secondary">Add-ons</span>
                                    <span className="text-brand-text-light text-right">{selectedProject.addOns.map(a => a.name).join(', ') || '-'}</span>
                                    <span className="text-brand-text-secondary">Total</span>
                                    <span className="font-bold text-brand-text-light text-right">{formatCurrency(selectedProject.totalCost)}</span>
                                    <span className="text-brand-text-secondary">Pembayaran</span>
                                    <span className="flex justify-end">
                                        <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${getPaymentStatusClass(selectedProject.paymentStatus)}`}>{selectedProject.paymentStatus}</span>
                                    </span>
                                    <span className="text-brand-text-secondary">Biaya Cetak</span>
                                    <span className="text-brand-text-light text-right">{formatCurrency(selectedProject.printingCost || 0)}</span>
                                    <span className="text-brand-text-secondary">Transport</span>
                                    <span className="flex items-center justify-end gap-2">
                                        <span className="text-brand-text-light">{formatCurrency(selectedProject.transportCost || 0)}</span>
                                        {selectedProject.transportUsed && (
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                (selectedProject.transportDetails || []).every(t => t.paymentStatus === 'Paid')
                                                    ? 'bg-green-500/20 text-green-500'
                                                    : 'bg-yellow-500/20 text-yellow-500'
                                            }`}>
                                                {(selectedProject.transportDetails || []).every(t => t.paymentStatus === 'Paid') ? '✓ Lunas' : '⚠ Belum Lunas'}
                                            </span>
                                        )}
                                    </span>
                                    {(selectedProject.customCosts || []).map(cost => (
                                        <React.Fragment key={cost.id}>
                                            <span className="text-brand-text-secondary">{cost.description}</span>
                                            <span className="text-brand-text-light text-right">{formatCurrency(cost.amount)}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Sub-status */}
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <h4 className="font-semibold text-brand-text-primary mb-1">Progres Sub-Status</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Tahapan detail dalam status proyek saat ini dan konfirmasi klien</p>
                                {allSubStatusesForCurrentStatus.length > 0 ? (
                                    <div className="space-y-3">
                                        {allSubStatusesForCurrentStatus.map(subStatus => {
                                            const isActive = selectedProject.activeSubStatuses?.includes(subStatus.name);
                                            const sentAt = selectedProject.subStatusConfirmationSentAt?.[subStatus.name];
                                            const isConfirmed = selectedProject.confirmedSubStatuses?.includes(subStatus.name);
                                            const clientNote = selectedProject.clientSubStatusNotes?.[subStatus.name];
                                            const needsFollowUp = sentAt && !isConfirmed && (new Date().getTime() - new Date(sentAt).getTime()) / (1000 * 60 * 60) > 24;

                                            return (
                                                <div key={subStatus.name} className="py-2 border-b border-brand-border last:border-b-0">
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                {isConfirmed && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                                                                <p className={`font-medium truncate ${isActive ? 'text-brand-text-light' : 'text-brand-text-secondary'}`}>{subStatus.name}</p>
                                                                {needsFollowUp && <span className="text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Follow-up</span>}
                                                            </div>
                                                            {subStatus.note && <p className="text-xs text-brand-text-secondary">{subStatus.note}</p>}
                                                        </div>
                                                        <button 
                                                            onClick={() => handleOpenConfirmationModal(selectedProject, subStatus, needsFollowUp || false)} 
                                                            className="button-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                                                            disabled={isConfirmed}
                                                        >
                                                            {isConfirmed ? 'Terkonfirmasi' : <><SendIcon className="w-3 h-3" /> Konfirmasi</>}
                                                        </button>
                                                    </div>
                                                    {clientNote && (
                                                        <div className="mt-3 p-2 bg-brand-input rounded-md border-l-2 border-brand-accent">
                                                            <p className="text-xs font-semibold text-brand-accent">Catatan Klien</p>
                                                            <p className="text-sm text-brand-text-primary italic">"{clientNote}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-brand-text-secondary">Tidak ada sub-status aktif.</p>
                                )}
                            </div>

                            {/* Output */}
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-brand-border">
                                    <h5 className="font-semibold text-brand-text-primary text-sm mb-1">Output Fisik (Cetak)</h5>
                                    <p className="text-xs text-brand-text-secondary mb-2">Hasil cetak yang akan diterima klien</p>
                                    {(() => {
                                        const printingItems = selectedProject.printingDetails || [];
                                        if (printingItems.length > 0) {
                                            return (
                                                <ul className="divide-y divide-brand-border/60">
                                                    {printingItems.map(item => (
                                                        <li key={item.id} className="py-2 flex justify-between items-center text-sm">
                                                            <span className="text-brand-text-light">{item.customName || item.type}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-brand-text-secondary font-medium">{formatCurrency(item.cost)}</span>
                                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.paymentStatus === 'Paid' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                                    {item.paymentStatus === 'Paid' ? 'Lunas' : 'Belum'}
                                                                </span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            );
                                        }
                                        const pkg = packages.find(p => p.id === selectedProject.packageId);
                                        if (pkg && pkg.physicalItems && pkg.physicalItems.length > 0) {
                                            return (
                                                <ul className="list-disc list-inside text-sm space-y-1">
                                                    {pkg.physicalItems.map((it, idx) => (
                                                        <li key={idx} className="text-brand-text-light">{it.name}</li>
                                                    ))}
                                                </ul>
                                            );
                                        }
                                        return <p className="text-sm text-brand-text-secondary italic">Tidak ada item fisik.</p>;
                                    })()}
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-brand-border">
                                    <h5 className="font-semibold text-brand-text-primary text-sm mb-1">Output Digital</h5>
                                    <p className="text-xs text-brand-text-secondary mb-2">File digital yang akan dikirim ke klien</p>
                                    {(() => {
                                        const pkg = packages.find(p => p.id === selectedProject.packageId);
                                        if (!pkg || pkg.digitalItems.length === 0) {
                                            return <p className="text-sm text-brand-text-secondary italic">Tidak ada item digital.</p>;
                                        }
                                        return (
                                            <div className="space-y-2 text-sm">
                                                {pkg.digitalItems.map((item, index) => {
                                                    const isCompleted = selectedProject.completedDigitalItems?.includes(item);
                                                    return (
                                                        <label key={index} className="flex items-center justify-between p-2 rounded-lg bg-brand-bg">
                                                            <div className="flex items-center gap-2">
                                                                <input type="checkbox" checked={isCompleted} onChange={() => handleToggleDigitalItem(item)} className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                                                <span className={`text-brand-text-primary text-sm ${isCompleted ? 'line-through text-brand-text-secondary' : ''}`}>{item}</span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Tim */}
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <h4 className="font-semibold text-brand-text-primary mb-1">Tim</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Anggota tim yang ditugaskan dan status pembayaran fee mereka</p>
                                {Object.entries(teamByRole).length > 0 ? (
                                    Object.entries(teamByRole).map(([role, members]) => (
                                        <div key={role} className="mb-3 last:mb-0">
                                            <h5 className="text-xs uppercase tracking-wider text-brand-text-secondary mb-1">{role}</h5>
                                            <div className="space-y-2">
                                                {members.map(member => {
                                                    const paymentStatus = teamProjectPayments.find(p => p.projectId === selectedProject.id && p.teamMemberId === member.memberId)?.status;
                                                    return (
                                                        <div key={member.memberId} className="p-3 bg-brand-bg rounded-lg flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm text-brand-text-light font-medium">{member.name}</p>
                                                                {member.subJob && <p className="text-xs text-brand-text-secondary">{member.subJob}</p>}
                                                            </div>
                                                            <div className="text-right text-xs">
                                                                {paymentStatus && (
                                                                    <span className={`px-2 py-1 rounded-full inline-block mb-1 ${paymentStatus === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                                        {paymentStatus === 'Paid' ? 'Lunas' : 'Belum'}
                                                                    </span>
                                                                )}
                                                                <div className="flex items-center gap-3 justify-end">
                                                                    <span className="text-brand-text-secondary">Fee</span>
                                                                    <span className="font-semibold text-brand-text-primary">{formatCurrency(member.fee)}</span>
                                                                    {(member.reward && member.reward > 0) && (
                                                                        <span className="font-semibold text-yellow-400">{formatCurrency(member.reward)}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-brand-text-secondary">Belum ada tim yang ditugaskan.</p>
                                )}
                            </div>

                            {/* Catatan */}
                            {selectedProject.notes && (
                                <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                    <h4 className="font-semibold text-brand-text-primary mb-1">Catatan</h4>
                                    <p className="text-xs text-brand-text-secondary mb-2">Catatan tambahan terkait proyek ini</p>
                                    <p className="text-sm text-brand-text-primary whitespace-pre-wrap">{selectedProject.notes}</p>
                                </div>
                            )}

                            {/* Aksi Cepat */}
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <h4 className="font-semibold text-brand-text-primary mb-1">Aksi Cepat</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Tombol aksi untuk mengelola proyek dengan cepat</p>
                                <div className="flex items-center gap-3">
                                <button type="button" onClick={() => { handleOpenForm('edit', selectedProject); onClose(); }} className="button-secondary text-sm inline-flex items-center gap-2">
                                    <PencilIcon className="w-4 h-4"/> Edit Proyek
                                </button>
                                <button type="button" onClick={() => handleOpenBriefingModal(selectedProject)} className="button-secondary text-sm inline-flex items-center gap-2">
                                    <Share2Icon className="w-4 h-4"/> Briefing Tim
                                </button>
                                </div>
                            </div>
                        </div>

                        {/* Desktop (existing) */}
                        <div className="hidden md:block space-y-6">
                            <div className="text-sm space-y-2">
                                <p><strong className="font-semibold text-brand-text-secondary w-32 inline-block">Klien:</strong> {selectedProject.clientName}</p>
                                <p><strong className="font-semibold text-brand-text-secondary w-32 inline-block">Tanggal Acara:</strong> {formatDateFull(selectedProject.date)}</p>
                                <p><strong className="font-semibold text-brand-text-secondary w-32 inline-block">Lokasi:</strong> {selectedProject.location}</p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gradient mb-1">Paket & Biaya</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Informasi paket yang dipilih, add-ons, dan rincian biaya proyek</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm p-4 bg-brand-bg rounded-lg">
                                    <span className="text-brand-text-secondary">Paket:</span> <span className="font-medium text-brand-text-light">{selectedProject.packageName}</span>
                                    <span className="text-brand-text-secondary">Add-ons:</span> <span className="font-medium text-brand-text-light">{selectedProject.addOns.map(a => a.name).join(', ') || '-'}</span>
                                    <span className="text-brand-text-secondary">Total Biaya Proyek:</span> <span className="font-bold text-brand-text-light">{formatCurrency(selectedProject.totalCost)}</span>
                                    <span className="text-brand-text-secondary">Status Pembayaran:</span> <span><span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusClass(selectedProject.paymentStatus)}`}>{selectedProject.paymentStatus}</span></span>
                                    <span className="text-brand-text-secondary">Biaya Cetak:</span> <span className="font-medium text-brand-text-light">{formatCurrency(selectedProject.printingCost || 0)}</span>
                                    <span className="text-brand-text-secondary">Biaya Transportasi:</span> <span className="font-medium text-brand-text-light">{formatCurrency(selectedProject.transportCost || 0)}</span>
                                    {(selectedProject.customCosts || []).map(cost => (
                                        <React.Fragment key={cost.id}>
                                            <span className="text-brand-text-secondary">{cost.description}:</span> <span className="font-medium text-brand-text-light">{formatCurrency(cost.amount)}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Transport Details Section */}
                            {selectedProject.transportUsed && (
                                <div>
                                    <h4 className="font-semibold text-gradient mb-1">Rincian Biaya Transport</h4>
                                    <p className="text-xs text-brand-text-secondary mb-3">Detail penggunaan transport untuk proyek ini</p>
                                    <div className="space-y-2">
                                        {(selectedProject.transportDetails || []).length > 0 ? (
                                            (selectedProject.transportDetails || []).map((item: TransportItem) => (
                                                <div key={item.id} className={`p-3 rounded-lg border ${item.paymentStatus === 'Paid' ? 'bg-green-500/10 border-green-500/30' : 'bg-brand-bg border-brand-border'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-grow">
                                                            <p className="font-medium text-brand-text-light">{item.description}</p>
                                                            <p className="text-sm text-brand-text-secondary">{formatCurrency(item.cost)}</p>
                                                            {item.notes && <p className="text-xs text-brand-text-secondary mt-1">{item.notes}</p>}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                                                                item.paymentStatus === 'Paid' 
                                                                    ? 'bg-green-500/20 text-green-500' 
                                                                    : 'bg-yellow-500/20 text-yellow-500'
                                                            }`}>
                                                                {item.paymentStatus === 'Paid' ? (
                                                                    <><CheckCircleIcon className="w-4 h-4"/> Lunas</>
                                                                ) : (
                                                                    <><AlertCircleIcon className="w-4 h-4"/> Belum Bayar</>
                                                                )}
                                                            </span>
                                                            {item.paidAt && (
                                                                <span className="text-xs text-brand-text-secondary">
                                                                    {new Date(item.paidAt).toLocaleDateString('id-ID')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-center text-brand-text-secondary py-4 bg-brand-bg rounded-lg">
                                                Belum ada item transport yang dicatat.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="font-semibold text-gradient mb-1">Progres Sub-Status</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Tahapan detail dalam status proyek saat ini dan konfirmasi klien</p>
                                {allSubStatusesForCurrentStatus.length > 0 ? (
                                    <div className="space-y-3 p-4 bg-brand-bg rounded-lg">
                                        {allSubStatusesForCurrentStatus.map(subStatus => {
                                            const isActive = selectedProject.activeSubStatuses?.includes(subStatus.name);
                                            const sentAt = selectedProject.subStatusConfirmationSentAt?.[subStatus.name];
                                            const isConfirmed = selectedProject.confirmedSubStatuses?.includes(subStatus.name);
                                            const clientNote = selectedProject.clientSubStatusNotes?.[subStatus.name];
                                            const needsFollowUp = sentAt && !isConfirmed && (new Date().getTime() - new Date(sentAt).getTime()) / (1000 * 60 * 60) > 24;

                                            return (
                                                <div key={subStatus.name} className="py-2 border-b border-brand-border last:border-b-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                {isConfirmed && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                                                                <p className={`font-medium ${isActive ? 'text-brand-text-light' : 'text-brand-text-secondary'}`}>{subStatus.name}</p>
                                                                {needsFollowUp && <span className="text-xs font-semibold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Perlu Follow-up</span>}
                                                            </div>
                                                            <p className="text-xs text-brand-text-secondary">{subStatus.note}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleOpenConfirmationModal(selectedProject, subStatus, needsFollowUp || false)} 
                                                            className="button-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                                                            disabled={isConfirmed}
                                                        >
                                                            {isConfirmed ? 'Terkonfirmasi' : <><SendIcon className="w-3 h-3" /> Minta Konfirmasi</>}
                                                        </button>
                                                    </div>
                                                    {clientNote && (
                                                        <div className="mt-3 ml-4 p-2 bg-brand-input rounded-md border-l-2 border-brand-accent">
                                                            <p className="text-xs font-semibold text-brand-accent">Catatan Klien:</p>
                                                            <p className="text-sm text-brand-text-primary italic">"{clientNote}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-brand-text-secondary p-4 bg-brand-bg rounded-lg">Tidak ada sub-status untuk status proyek saat ini.</p>
                                )}
                            </div>

                            <div>
                                <h4 className="font-semibold text-gradient mb-1">Output Pengantin</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Daftar hasil yang akan diterima oleh pengantin (fisik dan digital)</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-brand-bg rounded-lg">
                                        <h5 className="font-semibold text-brand-text-primary text-sm mb-2">Output Fisik (Cetak)</h5>
                                        {(() => {
                                            const printingItems = selectedProject.printingDetails || [];
                                            if (printingItems.length > 0) {
                                                return (
                                                    <ul className="space-y-2 text-sm">
                                                        {printingItems.map(item => (
                                                            <li key={item.id} className="flex justify-between items-center">
                                                                <span className="text-brand-text-light">{item.customName || item.type}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-brand-text-secondary font-medium">{formatCurrency(item.cost)}</span>
                                                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${item.paymentStatus === 'Paid' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                                        {item.paymentStatus === 'Paid' ? 'Lunas' : 'Belum Dibayar'}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                );
                                            }
                                            const pkg = packages.find(p => p.id === selectedProject.packageId);
                                            if (pkg && pkg.physicalItems && pkg.physicalItems.length > 0) {
                                                return (
                                                    <ul className="space-y-1 text-sm list-disc list-inside">
                                                        {pkg.physicalItems.map((it, idx) => (
                                                            <li key={idx} className="text-brand-text-light">{it.name}</li>
                                                        ))}
                                                    </ul>
                                                );
                                            }
                                            return <p className="text-sm text-brand-text-secondary italic">Tidak ada item fisik.</p>;
                                        })()}
                                    </div>
                                    <div className="p-4 bg-brand-bg rounded-lg">
                                        <h5 className="font-semibold text-brand-text-primary text-sm mb-2">Output Digital</h5>
                                        {(() => {
                                            const pkg = packages.find(p => p.id === selectedProject.packageId);
                                            if (!pkg || pkg.digitalItems.length === 0) {
                                                return <p className="text-sm text-brand-text-secondary italic">Tidak ada item digital.</p>;
                                            }
                                            return (
                                                <div className="space-y-2 text-sm">
                                                    {pkg.digitalItems.map((item, index) => {
                                                        const isCompleted = selectedProject.completedDigitalItems?.includes(item);
                                                        return (
                                                            <label key={index} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-brand-input cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isCompleted}
                                                                    onChange={() => handleToggleDigitalItem(item)}
                                                                    className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 flex-shrink-0"
                                                                />
                                                                <span className={`text-sm text-brand-text-primary ${isCompleted ? 'line-through text-brand-text-secondary' : ''}`}>{item}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gradient mb-1">Tim</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Anggota tim yang ditugaskan dan status pembayaran fee mereka</p>
                                <div className="space-y-4">
                                    {Object.entries(teamByRole).length > 0 ? (
                                        Object.entries(teamByRole).map(([role, members]) => (
                                            <div key={role}>
                                                <h5 className="font-semibold text-brand-text-primary text-sm uppercase tracking-wider">{role}</h5>
                                                <div className="mt-2 space-y-2">
                                                    {members.map(member => {
                                                        const paymentStatus = teamProjectPayments.find(p => p.projectId === selectedProject.id && p.teamMemberId === member.memberId)?.status;
                                                        return (
                                                            <div key={member.memberId} className="p-3 bg-brand-bg rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                                                <div>
                                                                    <p className="text-sm text-brand-text-light font-medium">{member.name}</p>
                                                                    {member.subJob && <p className="text-xs text-brand-text-secondary">{member.subJob}</p>}
                                                                </div>
                                                                <div className="text-xs flex items-center gap-4 mt-2 sm:mt-0 self-start sm:self-center">
                                                                    {paymentStatus && (
                                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentStatus === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                                            {paymentStatus === 'Paid' ? 'Lunas' : 'Belum Lunas'}
                                                                        </span>
                                                                    )}
                                                                    <div className="text-right">
                                                                        <p className="text-brand-text-secondary">Fee</p>
                                                                        <p className="font-semibold text-brand-text-primary">{formatCurrency(member.fee)}</p>
                                                                    </div>
                                                                    {(member.reward && member.reward > 0) && (
                                                                        <div className="text-right">
                                                                            <p className="text-brand-text-secondary">Hadiah</p>
                                                                            <p className="font-semibold text-yellow-400">{formatCurrency(member.reward)}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-brand-text-secondary p-4 bg-brand-bg rounded-lg">Belum ada tim yang ditugaskan.</p>
                                    )}
                                </div>
                            </div>

                            {selectedProject.notes && (
                                <div>
                                    <h4 className="font-semibold text-gradient mb-1">Catatan</h4>
                                    <p className="text-xs text-brand-text-secondary mb-3">Catatan tambahan terkait proyek ini</p>
                                    <div className="p-4 bg-brand-bg rounded-lg">
                                        <p className="text-sm text-brand-text-primary whitespace-pre-wrap">{selectedProject.notes}</p>
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <h4 className="font-semibold text-gradient mb-1">Aksi Cepat</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Tombol aksi untuk mengelola proyek dengan cepat</p>
                                <div className="p-4 bg-brand-bg rounded-lg flex items-center gap-3">
                                    <button type="button" onClick={() => { handleOpenForm('edit', selectedProject); onClose(); }} className="button-secondary text-sm inline-flex items-center gap-2">
                                        <PencilIcon className="w-4 h-4"/> Edit Proyek
                                    </button>
                                    <button type="button" onClick={() => handleOpenBriefingModal(selectedProject)} className="button-secondary text-sm inline-flex items-center gap-2">
                                        <Share2Icon className="w-4 h-4"/> Bagikan Briefing Tim
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
                {detailTab === 'laba-rugi' && (() => {
                    const projectTransactions = transactions.filter(t => t.projectId === selectedProject.id);
                    const incomeTransactions = projectTransactions.filter(t => t.type === TransactionType.INCOME);
                    const expenseTransactions = projectTransactions.filter(t => t.type === TransactionType.EXPENSE);

                    const actualIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
                    const actualExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
                    const actualProfit = actualIncome - actualExpense;
                    
                    const TransactionRow: React.FC<{transaction: Transaction}> = ({transaction}) => (
                         <div className="flex justify-between items-center py-2 border-b border-brand-border/50 text-sm">
                            <div>
                                <p className="text-brand-text-light">{transaction.description}</p>
                                <p className="text-xs text-brand-text-secondary">{new Date(transaction.date).toLocaleDateString('id-ID')} - {transaction.category}</p>
                            </div>
                            <p className={`font-semibold ${transaction.type === TransactionType.INCOME ? 'text-brand-success' : 'text-brand-danger'}`}>{formatCurrency(transaction.amount)}</p>
                        </div>
                    );

                    return (
                         <div className="space-y-6 tab-content-mobile">
                            {/* Mobile summary cards */}
                            <div className="md:hidden space-y-3">
                                <div className="rounded-2xl bg-white/5 border border-brand-border p-4 flex items-center justify-between">
                                    <span className="text-sm text-brand-text-secondary">Pemasukan</span>
                                    <span className="font-semibold text-green-400">{formatCurrency(actualIncome)}</span>
                                </div>
                                <div className="rounded-2xl bg-white/5 border border-brand-border p-4 flex items-center justify-between">
                                    <span className="text-sm text-brand-text-secondary">Pengeluaran</span>
                                    <span className="font-semibold text-red-400">{formatCurrency(actualExpense)}</span>
                                </div>
                                <div className="rounded-2xl bg-white/5 border border-brand-border p-4 flex items-center justify-between">
                                    <span className="text-sm text-brand-text-secondary">Laba</span>
                                    <span className="font-semibold text-blue-400">{formatCurrency(actualProfit)}</span>
                                </div>
                                <div className="rounded-2xl bg-white/5 border border-brand-border p-4">
                                    <h5 className="font-semibold text-brand-text-primary mb-2">Rincian Pemasukan</h5>
                                    <div className="divide-y divide-brand-border/60">
                                        {incomeTransactions.length > 0 ? incomeTransactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />) : <p className="text-sm text-brand-text-secondary py-2">Belum ada pemasukan.</p>}
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-white/5 border border-brand-border p-4">
                                    <h5 className="font-semibold text-brand-text-primary mb-2">Rincian Pengeluaran</h5>
                                    <div className="divide-y divide-brand-border/60">
                                        {expenseTransactions.length > 0 ? expenseTransactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />) : <p className="text-sm text-brand-text-secondary py-2">Belum ada pengeluaran.</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Desktop existing */}
                            <div className="hidden md:block">
                                <div>
                                    <h4 className="font-semibold text-gradient mb-3">Ringkasan Keuangan Proyek (Aktual)</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <StatCard icon={<ArrowUpIconStat />} title="Total Pemasukan Aktual" value={formatCurrency(actualIncome)} subtitle="Dari transaksi tercatat" colorVariant="green" />
                                        <StatCard icon={<ArrowDownIconStat />} title="Total Pengeluaran Aktual" value={formatCurrency(actualExpense)} subtitle="Biaya produksi tercatat" colorVariant="pink" />
                                        <StatCard icon={<DollarSignIcon />} title="Laba Aktual" value={formatCurrency(actualProfit)} subtitle="Selisih pemasukan & biaya" colorVariant="blue" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    <div className="p-4 bg-brand-bg rounded-lg">
                                        <h5 className="font-semibold text-brand-text-primary mb-2">Rincian Pemasukan Aktual</h5>
                                        <div className="space-y-1">
                                            {incomeTransactions.length > 0 ? incomeTransactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />) : <p className="text-sm text-brand-text-secondary text-center py-4">Belum ada pemasukan.</p>}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-brand-bg rounded-lg">
                                        <h5 className="font-semibold text-brand-text-primary mb-2">Rincian Pengeluaran Aktual</h5>
                                        <div className="space-y-1">
                                            {expenseTransactions.length > 0 ? expenseTransactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />) : <p className="text-sm text-brand-text-secondary text-center py-4">Belum ada pengeluaran.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                {detailTab === 'transport' && (
                    <div className="space-y-6 tab-content-mobile">
                        <div>
                            <h4 className="font-semibold text-gradient mb-2">Riwayat Pembayaran Transport</h4>
                            <p className="text-xs text-brand-text-secondary mb-4">Detail lengkap semua biaya transport untuk proyek ini</p>
                            
                            {(selectedProject.transportDetails || []).length > 0 ? (
                                <div className="space-y-3">
                                    {(selectedProject.transportDetails || []).map((item: TransportItem, idx: number) => {
                                        const isPaid = item.paymentStatus === 'Paid';
                                        const cardUsed = item.cardId ? cards.find(c => c.id === item.cardId) : null;
                                        
                                        return (
                                            <div key={item.id} className={`p-4 rounded-lg border ${isPaid ? 'bg-green-500/5 border-green-500/30' : 'bg-yellow-500/5 border-yellow-500/30'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-grow">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold text-brand-text-light">#{idx + 1}</span>
                                                            <h5 className="font-semibold text-brand-text-light">{item.description}</h5>
                                                        </div>
                                                        <p className="text-lg font-bold text-brand-text-primary">{formatCurrency(item.cost)}</p>
                                                        {item.notes && (
                                                            <p className="text-xs text-brand-text-secondary mt-1">
                                                                <span className="font-medium">Catatan:</span> {item.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                                                        isPaid 
                                                            ? 'bg-green-500/20 text-green-500' 
                                                            : 'bg-yellow-500/20 text-yellow-500'
                                                    }`}>
                                                        {isPaid ? (
                                                            <><CheckCircleIcon className="w-4 h-4"/> Lunas</>
                                                        ) : (
                                                            <><AlertCircleIcon className="w-4 h-4"/> Belum Bayar</>
                                                        )}
                                                    </span>
                                                </div>
                                                
                                                {isPaid && (
                                                    <div className="pt-3 border-t border-brand-border/30 grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-xs text-brand-text-secondary mb-1">Tanggal Bayar</p>
                                                            <p className="font-medium text-brand-text-light">
                                                                {item.paidAt ? new Date(item.paidAt).toLocaleDateString('id-ID', {
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric'
                                                                }) : '-'}
                                                            </p>
                                                        </div>
                                                        {cardUsed && (
                                                            <div>
                                                                <p className="text-xs text-brand-text-secondary mb-1">Kartu Pembayaran</p>
                                                                <p className="font-medium text-brand-text-light">
                                                                    {cardUsed.bankName} **** {cardUsed.lastFourDigits}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Summary */}
                                    <div className="mt-6 p-4 bg-brand-surface rounded-lg border border-brand-border">
                                        <h5 className="font-semibold text-brand-text-primary mb-3">Ringkasan Transport</h5>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-brand-text-secondary">Total Item:</span>
                                                <span className="font-semibold text-brand-text-light">{(selectedProject.transportDetails || []).length} item</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-brand-text-secondary">Total Biaya:</span>
                                                <span className="font-bold text-brand-text-primary">
                                                    {formatCurrency((selectedProject.transportDetails || []).reduce((sum, item) => sum + item.cost, 0))}
                                                </span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-brand-border">
                                                <span className="text-brand-text-secondary">Sudah Dibayar:</span>
                                                <span className="font-semibold text-green-500">
                                                    {(selectedProject.transportDetails || []).filter(i => i.paymentStatus === 'Paid').length} item
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-brand-text-secondary">Belum Dibayar:</span>
                                                <span className="font-semibold text-yellow-500">
                                                    {(selectedProject.transportDetails || []).filter(i => i.paymentStatus !== 'Paid').length} item
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 bg-brand-bg rounded-lg text-center">
                                    <AlertCircleIcon className="w-12 h-12 text-brand-text-secondary mx-auto mb-3 opacity-50" />
                                    <p className="text-brand-text-secondary">Belum ada item transport yang dicatat untuk proyek ini.</p>
                                    <p className="text-xs text-brand-text-secondary mt-1">Tambahkan item transport saat mengedit proyek.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {detailTab === 'files' && (
                    <div className="space-y-4 tab-content-mobile">
                        {/* Mobile */}
                        <div className="md:hidden space-y-3">
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4">
                                <h4 className="font-semibold text-brand-text-primary mb-2">File & Tautan</h4>
                                <div className="divide-y divide-brand-border/60 text-sm">
                                    <div className="py-3 flex items-center justify-between">
                                        <span className="text-brand-text-secondary">Brief/Moodboard</span>
                                        {selectedProject.driveLink ? <a href={selectedProject.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold">Buka</a> : <span className="text-brand-text-secondary">N/A</span>}
                                    </div>
                                    <div className="py-3 flex items-center justify-between">
                                        <span className="text-brand-text-secondary">File dari Klien</span>
                                        {selectedProject.clientDriveLink ? <a href={selectedProject.clientDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold">Buka</a> : <span className="text-brand-text-secondary">N/A</span>}
                                    </div>
                                    <div className="py-3 flex items-center justify-between">
                                        <span className="text-brand-text-secondary">File Jadi</span>
                                        {selectedProject.finalDriveLink ? <a href={selectedProject.finalDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold">Buka</a> : <span className="text-brand-text-secondary">Belum tersedia</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Desktop existing */}
                        <div className="hidden md:block">
                            <h4 className="font-semibold text-gradient mb-2">File & Tautan Penting</h4>
                            <div className="p-4 bg-brand-bg rounded-lg space-y-3 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-brand-border"><span className="text-brand-text-secondary">Link Moodboard/Brief (Internal)</span>{selectedProject.driveLink ? <a href={selectedProject.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">Buka Tautan</a> : <span className="text-brand-text-secondary">N/A</span>}</div>
                                <div className="flex justify-between items-center py-2 border-b border-brand-border"><span className="text-brand-text-secondary">Link File dari Klien</span>{selectedProject.clientDriveLink ? <a href={selectedProject.clientDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">Buka Tautan</a> : <span className="text-brand-text-secondary">N/A</span>}</div>
                                <div className="flex justify-between items-center py-2"><span className="text-brand-text-secondary">Link File Jadi (untuk Klien)</span>{selectedProject.finalDriveLink ? <a href={selectedProject.finalDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">Buka Tautan</a> : <span className="text-brand-text-secondary">Belum tersedia</span>}</div>
                            </div>
                        </div>
                    </div>
                )}
                {detailTab === 'revisions' && (
                    <div className="space-y-6 tab-content-mobile">
                        {/* Mobile */}
                        <div className="md:hidden space-y-4">
                            <div>
                                <h4 className="font-semibold text-brand-text-primary mb-2">Daftar Revisi</h4>
                                <div className="space-y-3">
                                    {(selectedProject.revisions || []).length > 0 ? (selectedProject.revisions || []).map(rev => (
                                        <div key={rev.id} className="p-4 rounded-2xl bg-white/5 border border-brand-border">
                                            <div className="flex justify-between items-center text-xs mb-2">
                                                <span className={`px-2 py-0.5 rounded-full font-medium ${getRevisionStatusClass(rev.status)}`}>{rev.status}</span>
                                                <span>Deadline: {new Date(rev.deadline).toLocaleDateString('id-ID')}</span>
                                            </div>
                                            <p className="text-sm"><strong className="text-brand-text-secondary">Admin:</strong> {rev.adminNotes}</p>
                                            <p className="text-sm mt-1"><strong className="text-brand-text-secondary">Freelancer ({teamMembers.find(t => t.id === rev.freelancerId)?.name || 'N/A'}):</strong> {rev.freelancerNotes || '-'}</p>
                                            {rev.driveLink && <p className="text-sm mt-1"><strong className="text-brand-text-secondary">Link Hasil:</strong> <a href={rev.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400">Buka</a></p>}
                                            <button onClick={() => handleShareRevisionLink(rev)} className="text-xs font-semibold text-brand-accent mt-2">Bagikan Tautan</button>
                                        </div>
                                    )) : <p className="text-sm text-brand-text-secondary">Belum ada revisi.</p>}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-brand-text-primary mb-2">Tambah Revisi</h4>
                                <form onSubmit={handleAddRevision} className="rounded-2xl bg-white/5 border border-brand-border p-4 space-y-4">
                                    <div className="input-group"><textarea id="adminNotes" value={newRevision.adminNotes} onChange={e => setNewRevision(p => ({...p, adminNotes: e.target.value}))} className="input-field" rows={3} placeholder=" " required /><label htmlFor="adminNotes" className="input-label">Catatan Revisi</label></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="input-group"><select id="freelancerId" value={newRevision.freelancerId} onChange={e => setNewRevision(p => ({...p, freelancerId: e.target.value}))} className="input-field" required><option value="">Pilih Freelancer...</option>{selectedProject.team.map(t => <option key={t.memberId} value={t.memberId}>{t.name}</option>)}</select><label htmlFor="freelancerId" className="input-label">Tugaskan ke</label></div>
                                        <div className="input-group"><input type="date" id="deadline" value={newRevision.deadline} onChange={e => setNewRevision(p => ({...p, deadline: e.target.value}))} className="input-field" placeholder=" " required /><label htmlFor="deadline" className="input-label">Deadline</label></div>
                                    </div>
                                    <div className="text-right"><button type="submit" className="button-primary">Tambah Revisi</button></div>
                                </form>
                            </div>
                        </div>

                        {/* Desktop existing */}
                        <div className="hidden md:block">
                            <div>
                                <h4 className="font-semibold text-gradient mb-3">Daftar Revisi</h4>
                                <div className="space-y-3">
                                    {(selectedProject.revisions || []).length > 0 ? (selectedProject.revisions || []).map(rev => (
                                        <div key={rev.id} className="p-3 bg-brand-bg rounded-lg">
                                            <div className="flex justify-between items-center text-xs mb-2">
                                                <span className={`px-2 py-0.5 rounded-full font-medium ${getRevisionStatusClass(rev.status)}`}>{rev.status}</span>
                                                <span>Deadline: {new Date(rev.deadline).toLocaleDateString('id-ID')}</span>
                                            </div>
                                            <p className="text-sm"><strong className="text-brand-text-secondary">Admin:</strong> {rev.adminNotes}</p>
                                            <p className="text-sm mt-1"><strong className="text-brand-text-secondary">Freelancer ({teamMembers.find(t => t.id === rev.freelancerId)?.name || 'N/A'}):</strong> {rev.freelancerNotes || '-'}</p>
                                            {rev.driveLink && <p className="text-sm mt-1"><strong className="text-brand-text-secondary">Link Hasil:</strong> <a href={rev.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Buka Tautan</a></p>}
                                            <button onClick={() => handleShareRevisionLink(rev)} className="text-xs font-semibold text-brand-accent hover:underline mt-2">Bagikan Tautan Revisi</button>
                                        </div>
                                    )) : <p className="text-center text-sm text-brand-text-secondary py-4">Belum ada revisi.</p>}
                                </div>
                            </div>
                            <div className="mt-6">
                                <h4 className="font-semibold text-gradient mb-3">Tambah Tugas Revisi Baru</h4>
                                <form onSubmit={handleAddRevision} className="p-4 bg-brand-bg rounded-lg space-y-4">
                                    <div className="input-group"><textarea id="adminNotes" value={newRevision.adminNotes} onChange={e => setNewRevision(p => ({...p, adminNotes: e.target.value}))} className="input-field" rows={3} placeholder=" " required /><label htmlFor="adminNotes" className="input-label">Catatan Revisi untuk Freelancer</label></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="input-group"><select id="freelancerId" value={newRevision.freelancerId} onChange={e => setNewRevision(p => ({...p, freelancerId: e.target.value}))} className="input-field" required><option value="">Pilih Freelancer...</option>{selectedProject.team.map(t => <option key={t.memberId} value={t.memberId}>{t.name}</option>)}</select><label htmlFor="freelancerId" className="input-label">Tugaskan ke</label></div>
                                        <div className="input-group"><input type="date" id="deadline" value={newRevision.deadline} onChange={e => setNewRevision(p => ({...p, deadline: e.target.value}))} className="input-field" placeholder=" " required /><label htmlFor="deadline" className="input-label">Deadline</label></div>
                                    </div>
                                    <div className="text-right"><button type="submit" className="button-primary">Tambah Revisi</button></div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


interface ProjectsProps {
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    clients: Client[];
    packages: Package[];
    teamMembers: TeamMember[];
    teamProjectPayments: TeamProjectPayment[];
    setTeamProjectPayments: React.Dispatch<React.SetStateAction<TeamProjectPayment[]>>;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    initialAction: NavigationAction | null;
    setInitialAction: (action: NavigationAction | null) => void;
    profile: Profile;
    showNotification: (message: string) => void;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
}

const ConfirmationModal: React.FC<{
    project: Project;
    subStatus: SubStatusConfig;
    isFollowUp: boolean;
    clients: Client[];
    teamMembers: TeamMember[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    onClose: () => void;
}> = ({ project, subStatus, isFollowUp, clients, teamMembers, setProjects, onClose }) => {
    const [recipientId, setRecipientId] = useState<string>('');
    const [message, setMessage] = useState('');

    const client = useMemo(() => clients.find(c => c.id === project.clientId), [clients, project.clientId]);

    useEffect(() => {
        if (client) {
            setRecipientId(`client-${client.id}`);
        } else if (project.team.length > 0) {
            setRecipientId(`freelancer-${project.team[0].memberId}`);
        }
    }, [client, project.team]);

    useEffect(() => {
        let recipientName = '[Penerima]';
        if (recipientId.startsWith('client-') && client) {
            recipientName = client.name;
        } else if (recipientId.startsWith('freelancer-')) {
            const memberId = recipientId.split('-')[1];
            recipientName = project.team.find(t => t.memberId === memberId)?.name || '[Freelancer]';
        }

        const initialMessage = `✨ *Konfirmasi Tugas Proyek* ✨

Halo *${recipientName}*,

Kami dari *Vena Pictures* ingin meminta konfirmasi Anda untuk sub-tugas pada proyek *"${project.projectName}"*.

*Tugas yang perlu dikonfirmasi:*
📝 *${subStatus.name}*

*Detail/Catatan Tambahan:*
📄 ${subStatus.note || "_Tidak ada catatan tambahan._"}

Mohon untuk meninjau detail di atas dan balas pesan ini dengan *"SETUJU"* atau *"CONFIRM"* jika Anda sudah memahami dan menyetujui tugas tersebut.

Jika ada pertanyaan, jangan ragu untuk menghubungi kami kembali.

Terima kasih atas perhatian dan kerja samanya!

Salam hangat,
*Tim Vena Pictures*`;

        const followUpMessage = `✨ *Follow-Up Konfirmasi Tugas* ✨

Halo *${recipientName}*,

Kami dari *Vena Pictures* ingin menindaklanjuti dengan hormat permintaan konfirmasi kami sebelumnya untuk sub-tugas pada proyek *"${project.projectName}"*.

*Tugas yang perlu dikonfirmasi:*
📝 *${subStatus.name}*

*Detail/Catatan Tambahan:*
📄 ${subStatus.note || "_Tidak ada catatan tambahan._"}

Kami mohon kesediaan Anda untuk memberikan konfirmasi agar kami dapat melanjutkan ke tahap berikutnya.

Jika ada pertanyaan atau kendala, jangan ragu untuk menghubungi kami.

Terima kasih atas perhatian dan kerja samanya!

Salam hangat,
*Tim Vena Pictures*`;

        setMessage(isFollowUp ? followUpMessage : initialMessage);

    }, [recipientId, project, subStatus, client, isFollowUp]);

    const handleShare = () => {
        let phoneNumber = '';
        if (recipientId.startsWith('client-') && client) {
            phoneNumber = client.phone;
        } else if (recipientId.startsWith('freelancer-')) {
            const memberId = recipientId.split('-')[1];
            phoneNumber = teamMembers.find(t => t.id === memberId)?.phone || '';
        }

        if (phoneNumber) {
            // Update project state with the timestamp
            setProjects(prev => prev.map(p => {
                if (p.id === project.id) {
                    const newConfirmationSentAt = {
                        ...(p.subStatusConfirmationSentAt || {}),
                        [subStatus.name]: new Date().toISOString(),
                    };
                    return { ...p, subStatusConfirmationSentAt: newConfirmationSentAt };
                }
                return p;
            }));

            // Open WhatsApp
            const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
            onClose(); // Close modal after sharing
        } else {
            alert('Nomor telepon untuk penerima ini tidak ditemukan.');
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`${isFollowUp ? 'Follow-Up' : 'Minta'} Konfirmasi Tugas: ${subStatus.name}`}>
            <div className="space-y-6">
                <div className="input-group">
                    <select id="recipient" value={recipientId} onChange={e => setRecipientId(e.target.value)} className="input-field">
                        {client && <option value={`client-${client.id}`}>Klien: {client.name}</option>}
                        {project.team.map(member => (
                            <option key={member.memberId} value={`freelancer-${member.memberId}`}>Freelancer: {member.name}</option>
                        ))}
                    </select>
                    <label className="input-label">Kirim ke</label>
                </div>
                <div>
                    <label className="text-sm font-medium text-brand-text-secondary mb-2 block">Pesan Kustom</label>
                    <div className="p-3 bg-brand-bg rounded-lg border border-brand-border">
                         <textarea 
                            id="message" 
                            value={message} 
                            onChange={e => setMessage(e.target.value)} 
                            rows={15} 
                            className="w-full bg-transparent text-sm text-brand-text-primary focus:outline-none resize-none"
                        ></textarea>
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-brand-border">
                    <button onClick={handleShare} className="button-primary inline-flex items-center gap-2">
                        <SendIcon className="w-4 h-4"/> Bagikan ke WhatsApp
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export const Projects: React.FC<ProjectsProps> = ({ projects, setProjects, clients, packages, teamMembers, teamProjectPayments, setTeamProjectPayments, transactions, setTransactions, initialAction, setInitialAction, profile, showNotification, cards, setCards, pockets, setPockets }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    
    // UI/UX Improvement States
    const [quickStatusModalOpen, setQuickStatusModalOpen] = useState(false);
    const [selectedProjectForStatus, setSelectedProjectForStatus] = useState<Project | null>(null);
    
    const initialFormState = useMemo(() => ({
        id: '',
        clientId: '',
        projectName: '',
        clientName: '',
        projectType: '',
        packageName: '',
        status: profile.projectStatusConfig.find(s => s.name === 'Persiapan')?.name || profile.projectStatusConfig[0]?.name || '',
        activeSubStatuses: [] as string[],
        customSubStatuses: [] as SubStatusConfig[],
        customCosts: [] as { id: string, description: string, amount: string | number }[],
        location: '',
        date: new Date().toISOString().split('T')[0],
        deadlineDate: '',
        team: [] as AssignedTeamMember[],
        notes: '',
        driveLink: '',
        clientDriveLink: '',
        finalDriveLink: '',
        startTime: '',
        endTime: '',
        shippingDetails: '',
        printingDetails: [] as PrintingItem[],
        printingCost: 0,
        transportCost: 0,
        transportDetails: [] as TransportItem[],
        transportUsed: false,
        // duration/unit price for packages that offer durationOptions
        durationSelection: undefined as string | undefined,
        unitPrice: undefined as number | undefined,
        isEditingConfirmedByClient: false,
        isPrintingConfirmedByClient: false,
        isDeliveryConfirmedByClient: false,
    }), [profile]);

    const [formData, setFormData] = useState(initialFormState);

    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
    
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
    const [briefingText, setBriefingText] = useState('');
    const [whatsappLink, setWhatsappLink] = useState('');
    const [googleCalendarLink, setGoogleCalendarLink] = useState('');
    const [icsDataUri, setIcsDataUri] = useState('');
    
    const [activeStatModal, setActiveStatModal] = useState<string | null>(null);

    // Calculate stats for modals
    const allActiveProjectsForStats = useMemo(() => projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);
    const statsForModal = useMemo(() => {
        const totalActiveValue = allActiveProjectsForStats.reduce((sum, p) => sum + p.totalCost, 0);
        const totalReceivables = allActiveProjectsForStats.reduce((sum, p) => sum + (p.totalCost - p.amountPaid), 0);
        const unpaidTeamCosts = teamProjectPayments.filter(p => p.status === 'Unpaid' && allActiveProjectsForStats.some(ap => ap.id === p.projectId)).reduce((sum, p) => sum + p.fee, 0);
        const projectTypeCounts = projects.reduce((acc, p) => {
            acc[p.projectType] = (acc[p.projectType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topProjectType = Object.keys(projectTypeCounts).length > 0
            ? Object.entries(projectTypeCounts).sort(([, a], [, b]) => b - a)[0][0]
            : 'N/A';
        return { totalActiveValue, totalReceivables, unpaidTeamCosts, topProjectType };
    }, [allActiveProjectsForStats, teamProjectPayments, projects]);

    const [activeSectionOpen, setActiveSectionOpen] = useState(true);
    const [completedSectionOpen, setCompletedSectionOpen] = useState(false);

    const [confirmationModalState, setConfirmationModalState] = useState<{ project: Project; subStatus: SubStatusConfig; isFollowUp: boolean; } | null>(null);

    // Keep selectedProject in sync when projects list updates
    useEffect(() => {
        if (!selectedProject) return;
        const updated = projects.find(p => p.id === selectedProject.id);
        if (updated && updated !== selectedProject) {
            // Preserve richer fields from selectedProject (e.g., team) if the incoming snapshot lacks them
            const merged = {
                ...updated,
                team: (updated as any).team && (updated as any).team.length > 0 ? (updated as any).team : (selectedProject as any).team,
                revisions: (updated as any).revisions && (updated as any).revisions.length > 0 ? (updated as any).revisions : (selectedProject as any).revisions,
            } as Project;
            setSelectedProject(merged);
        }
    }, [projects, selectedProject?.id]);

    const handleOpenDetailModal = async (project: Project) => {
        try {
            const fresh = await getProjectWithRelations(project.id);
            let next = fresh || project;
            // Fetch revisions from Supabase and attach
            try {
                const revisions = await listRevisionsByProject(project.id);
                next = { ...(next as Project), revisions } as Project;
            } catch (revErr) {
                // keep existing revisions if fetch fails
            }
            // Fallback: if team is empty, enrich from teamProjectPayments
            if (!next.team || next.team.length === 0) {
                const payments = teamProjectPayments.filter(p => p.projectId === project.id);
                if (payments.length > 0) {
                    const enrichedTeam = payments.map(p => {
                        const tm = teamMembers.find(m => m.id === p.teamMemberId);
                        return {
                            memberId: p.teamMemberId,
                            name: p.teamMemberName,
                            role: tm?.role || 'Tim',
                            fee: p.fee,
                            reward: p.reward || 0,
                        } as AssignedTeamMember;
                    });
                    next = { ...next, team: enrichedTeam } as Project;
                }
            }
            setSelectedProject(next);
        } catch {
            setSelectedProject(project);
        }
        setIsDetailModalOpen(true);
    };

    useEffect(() => {
        if (initialAction && initialAction.type === 'VIEW_PROJECT_DETAILS' && initialAction.id) {
            const projectToView = projects.find(p => p.id === initialAction.id);
            if (projectToView) {
                handleOpenDetailModal(projectToView);
            }
            setInitialAction(null);
        }
    }, [initialAction, projects, setInitialAction]);

    const teamByRole = useMemo(() => {
        return teamMembers.reduce((acc, member) => {
            if (!acc[member.role]) {
                acc[member.role] = [];
            }
            acc[member.role].push(member);
            return acc;
        }, {} as Record<string, TeamMember[]>);
    }, [teamMembers]);

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => viewMode === 'kanban' || statusFilter === 'all' || p.status === statusFilter)
            .filter(p => p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) || p.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [projects, searchTerm, statusFilter, viewMode]);
    
    const allActiveProjects = useMemo(() => projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);
    const activeProjects = useMemo(() => filteredProjects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [filteredProjects]);
    const completedAndCancelledProjects = useMemo(() => filteredProjects.filter(p => p.status === 'Selesai' || p.status === 'Dibatalkan'), [filteredProjects]);
    
    const modalData = useMemo(() => {
        if (!activeStatModal) return null;
    
        const activeProjectsList = projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan');
    
        switch (activeStatModal) {
            case 'value':
                return {
                    title: 'Rincian Nilai Proyek Aktif',
                    items: activeProjectsList.map(p => ({
                        id: p.id,
                        primary: p.projectName,
                        secondary: p.clientName,
                        value: p.totalCost
                    })),
                    total: activeProjectsList.reduce((sum, p) => sum + p.totalCost, 0)
                };
            case 'receivables':
                const receivablesProjects = activeProjectsList.filter(p => p.totalCost > p.amountPaid);
                return {
                    title: 'Rincian Total Piutang',
                    items: receivablesProjects.map(p => ({
                        id: p.id,
                        primary: p.projectName,
                        secondary: p.clientName,
                        value: p.totalCost - p.amountPaid
                    })),
                    total: receivablesProjects.reduce((sum, p) => sum + (p.totalCost - p.amountPaid), 0)
                };
            case 'team_costs':
                const unpaidTeamCostsList = teamProjectPayments.filter(p => p.status === 'Unpaid' && activeProjectsList.some(ap => ap.id === p.projectId));
                return {
                    title: 'Rincian Biaya Tim Belum Lunas',
                    items: unpaidTeamCostsList.map(p => ({
                        id: p.id,
                        primary: p.teamMemberName,
                        secondary: `Proyek: ${projects.find(proj => proj.id === p.projectId)?.projectName || 'N/A'}`,
                        value: p.fee
                    })),
                    total: unpaidTeamCostsList.reduce((sum, p) => sum + p.fee, 0)
                };
            case 'top_type':
                const projectTypeCounts = projects.reduce((acc, p) => {
                    acc[p.projectType] = (acc[p.projectType] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
    
                const topProjectType = Object.keys(projectTypeCounts).length > 0
                    ? Object.entries(projectTypeCounts).sort(([, a], [, b]) => b - a)[0][0]
                    : 'N/A';
                
                const topTypeProjects = projects.filter(p => p.projectType === topProjectType);
                
                return {
                    title: `Daftar Proyek Jenis: ${topProjectType}`,
                    items: topTypeProjects.map(p => ({
                        id: p.id,
                        primary: p.projectName,
                        secondary: p.clientName,
                        value: p.status
                    })),
                    total: null
                };
            default:
                return null;
        }
    }, [activeStatModal, projects, teamProjectPayments]);


    const handleOpenForm = async (mode: 'add' | 'edit', project?: Project) => {
        setFormMode(mode);
        if (mode === 'edit' && project) {
            // fetch fresh project to ensure latest team/details
            let current = project;
            try {
                const fresh = await getProjectWithRelations(project.id);
                if (fresh) current = fresh as Project;
            } catch {}
            // Fallback: if team is empty, enrich from teamProjectPayments
            if (!current.team || current.team.length === 0) {
                const payments = teamProjectPayments.filter(p => p.projectId === project.id);
                if (payments.length > 0) {
                    const enrichedTeam = payments.map(p => {
                        const tm = teamMembers.find(m => m.id === p.teamMemberId);
                        return {
                            memberId: p.teamMemberId,
                            name: p.teamMemberName,
                            role: tm?.role || 'Tim',
                            fee: p.fee,
                            reward: p.reward || 0,
                        } as AssignedTeamMember;
                    });
                    current = { ...current, team: enrichedTeam } as Project;
                }
            }
            const { addOns, paymentStatus, amountPaid, totalCost, progress, packageId, dpProofUrl, ...operationalData } = current;
            const statusConfig = profile.projectStatusConfig.find(s => s.name === project.status);
            const subStatuses = project.customSubStatuses ?? statusConfig?.subStatuses ?? [];
            // Auto-populate printingDetails from package physicalItems when empty
            let printingDetailsBase = (current.printingDetails || []) as PrintingItem[];
            if (!printingDetailsBase || printingDetailsBase.length === 0) {
                const pkg = packages.find(p => (p as any).id === (current as any).packageId || p.name === current.packageName);
                if (pkg && Array.isArray(pkg.physicalItems) && pkg.physicalItems.length > 0) {
                    printingDetailsBase = pkg.physicalItems.map((it, idx) => ({
                        id: `pi-${current.id}-${idx}`,
                        type: 'Custom' as const,
                        customName: it.name,
                        details: '',
                        cost: Number(it.price || 0),
                        paymentStatus: 'Unpaid' as const,
                    }));
                }
            }
            const printingDetailsWithStatus = (printingDetailsBase || []).map(item => ({...item, paymentStatus: item.paymentStatus || 'Unpaid'}));


            setFormData({
                ...initialFormState,
                ...operationalData,
                // preserve explicit duration/unit if present on project
                durationSelection: (current as any).durationSelection,
                unitPrice: (current as any).unitPrice,
                printingDetails: printingDetailsWithStatus, 
                activeSubStatuses: current.activeSubStatuses || [],
                customSubStatuses: subStatuses,
                customCosts: (current.customCosts || []).map(c => ({...c, amount: c.amount.toString()})),
                printingCost: current.printingCost || 0,
                transportCost: current.transportCost || 0,
                isEditingConfirmedByClient: current.isEditingConfirmedByClient || false,
                isPrintingConfirmedByClient: current.isPrintingConfirmedByClient || false,
                isDeliveryConfirmedByClient: current.isDeliveryConfirmedByClient || false,
            });
        } else {
            setFormData({...initialFormState, projectType: profile.projectTypes[0] || ''});
        }
        setIsFormModalOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormModalOpen(false);
        setFormData(initialFormState);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }

        setFormData(prev => {
            const newState = {...prev, [name]: value};
            if (name === 'status') {
                newState.activeSubStatuses = [];
                // When status changes, populate customSubStatuses from the new status template
                const statusConfig = profile.projectStatusConfig.find(s => s.name === value);
                newState.customSubStatuses = statusConfig?.subStatuses || [];
                if (value !== 'Dikirim') {
                    newState.shippingDetails = '';
                }
            }
            return newState;
        });
    };
    
    const handleSubStatusChange = (option: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentSubStatuses = prev.activeSubStatuses || [];
            if (isChecked) {
                return { ...prev, activeSubStatuses: [...currentSubStatuses, option] };
            } else {
                return { ...prev, activeSubStatuses: currentSubStatuses.filter(s => s !== option) };
            }
        });
    };

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clientId = e.target.value;
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setFormData(prev => ({
                ...prev,
                clientId: client.id,
                clientName: client.name,
                projectName: prev.projectName || `Acara ${client.name}`
            }));
        }
    };

    const handleTeamChange = (member: TeamMember) => {
        setFormData(prev => {
            const isSelected = prev.team.some(t => t.memberId === member.id);
            if (isSelected) {
                return {
                    ...prev,
                    team: prev.team.filter(t => t.memberId !== member.id)
                }
            } else {
                const newTeamMember: AssignedTeamMember = {
                    memberId: member.id,
                    name: member.name,
                    role: member.role,
                    fee: member.standardFee,
                    reward: 0,
                };
                return {
                    ...prev,
                    team: [...prev.team, newTeamMember]
                }
            }
        });
    };
    
    const handleTeamFeeChange = (memberId: string, newFee: number) => {
        setFormData(prev => ({
            ...prev,
            team: prev.team.map(t => t.memberId === memberId ? { ...t, fee: newFee } : t)
        }));
    };

    const handleTeamRewardChange = (memberId: string, newReward: number) => {
        setFormData(prev => ({
            ...prev,
            team: prev.team.map(t => t.memberId === memberId ? { ...t, reward: newReward } : t)
        }));
    };

    const handleTeamSubJobChange = (memberId: string, subJob: string) => {
        setFormData(prev => ({
            ...prev,
            team: prev.team.map(t => t.memberId === memberId ? { ...t, subJob: subJob } : t)
        }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let projectData: Project;

        if (formMode === 'add') {
            // Persist new project to Supabase
            const sanitized = sanitizeProjectData({ ...initialFormState, ...formData });
            try {
                const created = await createProjectWithRelations({
                    projectName: sanitized.projectName,
                    clientName: sanitized.clientName,
                    clientId: sanitized.clientId,
                    projectType: sanitized.projectType,
                    packageName: sanitized.packageName,
                    date: sanitized.date,
                    location: sanitized.location,
                    status: sanitized.status,
                    progress: 0,
                    totalCost: 0,
                    amountPaid: 0,
                    paymentStatus: PaymentStatus.BELUM_BAYAR,
                    bookingStatus: sanitized.bookingStatus,
                    notes: sanitized.notes,
                    accommodation: sanitized.accommodation,
                    driveLink: sanitized.driveLink,
                    promoCodeId: sanitized.promoCodeId,
                    discountAmount: sanitized.discountAmount,
                    printingCost: sanitized.printingCost,
                    transportCost: sanitized.transportCost,
                    addOns: (sanitized.addOns || []).map((a: AddOn) => ({ id: a.id, name: a.name, price: a.price })),
                    // Persist explicit duration/unit price if provided
                    durationSelection: sanitized.durationSelection,
                    unitPrice: sanitized.unitPrice,
                    // relations
                    team: (sanitized.team || []).map((t: AssignedTeamMember) => ({
                        memberId: t.memberId,
                        name: t.name,
                        role: t.role,
                        fee: t.fee,
                        reward: t.reward,
                        subJob: t.subJob,
                    })),
                    activeSubStatuses: sanitized.activeSubStatuses,
                    customSubStatuses: sanitized.customSubStatuses,
                    // extras passed through by services.createProject (printingDetails/customCosts handled in update step below if needed)
                } as any);
                projectData = created;
            } catch (err) {
                console.warn('[Projects] Failed to create project in Supabase:', err);
                showNotification('Gagal membuat proyek. Coba lagi.');
                return;
            }
        } else { // edit mode
            const originalProject = projects.find(p => p.id === formData.id);
            if (!originalProject) return; 

            const oldPrintingCost = originalProject.printingCost || 0;
            const oldTransportCost = originalProject.transportCost || 0;
            const oldCustomCostsTotal = (originalProject.customCosts || []).reduce((sum, c) => sum + c.amount, 0);

            const newPrintingCost = Number(formData.printingCost) || 0;
            const newTransportCost = Number(formData.transportCost) || 0;
            const newCustomCosts = (formData.customCosts || [])
                .filter((c: any) => c.description && Number(c.amount) > 0)
                .map((c: any) => ({ ...c, id: c.id || `cc-${Date.now()}`, amount: Number(c.amount) }));
            const newCustomCostsTotal = newCustomCosts.reduce((sum, c) => sum + c.amount, 0);

            const costDifference = (newPrintingCost - oldPrintingCost) + (newTransportCost - oldTransportCost) + (newCustomCostsTotal - oldCustomCostsTotal);

            const newTotalCost = originalProject.totalCost + costDifference;
            const newAmountPaid = originalProject.amountPaid;
            const newPaymentStatus = newAmountPaid >= newTotalCost ? PaymentStatus.LUNAS : (newAmountPaid > 0 ? PaymentStatus.DP_TERBAYAR : PaymentStatus.BELUM_BAYAR);

            projectData = { 
                ...originalProject, 
                ...formData,
                customCosts: newCustomCosts,
                printingCost: newPrintingCost,
                transportCost: newTransportCost,
                totalCost: newTotalCost,
                paymentStatus: newPaymentStatus,
            };
            // Persist to Supabase
            try {
                await updateProjectInDb(projectData.id, {
                    projectName: projectData.projectName,
                    clientName: projectData.clientName,
                    clientId: projectData.clientId,
                    projectType: projectData.projectType,
                    packageName: projectData.packageName,
                    date: projectData.date,
                    deadlineDate: projectData.deadlineDate as any,
                    location: projectData.location,
                    status: projectData.status,
                    progress: projectData.progress,
                    totalCost: projectData.totalCost,
                    amountPaid: projectData.amountPaid,
                    paymentStatus: projectData.paymentStatus,
                    notes: projectData.notes,
                    accommodation: projectData.accommodation,
                    driveLink: projectData.driveLink,
                    clientDriveLink: projectData.clientDriveLink as any,
                    finalDriveLink: projectData.finalDriveLink as any,
                    startTime: projectData.startTime as any,
                    endTime: projectData.endTime as any,
                    discountAmount: projectData.discountAmount,
                    printingDetails: projectData.printingDetails as any,
                    customCosts: projectData.customCosts as any,
                    printingCost: projectData.printingCost,
                    transportCost: projectData.transportCost,
                    transportPaid: projectData.transportPaid as any,
                    transportNote: projectData.transportNote as any,
                    printingCardId: projectData.printingCardId as any,
                    transportCardId: projectData.transportCardId as any,
                    transportDetails: projectData.transportDetails as any,
                    transportUsed: projectData.transportUsed as any,
                    completedDigitalItems: projectData.completedDigitalItems,
                    dpProofUrl: projectData.dpProofUrl,
                    shippingDetails: projectData.shippingDetails as any,
                    // Persist duration/unit if present
                    durationSelection: (projectData as any).durationSelection,
                    unitPrice: (projectData as any).unitPrice,
                    activeSubStatuses: projectData.activeSubStatuses as any,
                    customSubStatuses: projectData.customSubStatuses as any,
                    confirmedSubStatuses: projectData.confirmedSubStatuses as any,
                    clientSubStatusNotes: projectData.clientSubStatusNotes as any,
                    subStatusConfirmationSentAt: projectData.subStatusConfirmationSentAt as any,
                    invoiceSignature: projectData.invoiceSignature as any,
                    isEditingConfirmedByClient: projectData.isEditingConfirmedByClient as any,
                    isPrintingConfirmedByClient: projectData.isPrintingConfirmedByClient as any,
                    isDeliveryConfirmedByClient: projectData.isDeliveryConfirmedByClient as any,
                } as any);

                // Persist team assignments to Supabase (delete+insert strategy)
                try {
                    await upsertAssignmentsForProject(projectData.id, (projectData.team || []).map((t: AssignedTeamMember) => ({
                        memberId: t.memberId,
                        name: t.name,
                        role: t.role,
                        fee: t.fee,
                        reward: t.reward,
                        subJob: t.subJob,
                    })));
                } catch (teamErr) {
                    console.warn('[Projects] Failed to persist team assignments:', teamErr);
                }
            } catch (err) {
                console.warn('[Projects] Failed to update project in Supabase:', err);
                showNotification('Gagal menyimpan perubahan proyek. Coba lagi.');
                return;
            }
            
            // Persist cost changes as transactions in Supabase
            const paymentCardId = cards.find(c => c.id !== 'CARD_CASH')?.id;
            if (paymentCardId) {
                const fieldsToProcess: ('printingCost' | 'transportCost')[] = [];
                if (originalProject.printingCost !== projectData.printingCost) fieldsToProcess.push('printingCost');
                if (originalProject.transportCost !== projectData.transportCost) fieldsToProcess.push('transportCost');

                for (const field of fieldsToProcess) {
                    const cost = projectData[field] || 0;
                    const oldCost = originalProject[field] || 0;
                    const costDiff = cost - oldCost;
                    const category = field === 'printingCost' ? 'Cetak Album' : 'Transportasi';
                    const description = `${category} - ${projectData.projectName}`;

                    // Try to find an existing cost transaction in local state for this project+category+description
                    const existingTx = transactions.find(t => t.projectId === projectData.id && t.category === category && t.description === description);

                    try {
                        if (existingTx) {
                            if (cost > 0) {
                                // Update existing transaction amount
                                const updated = await updateTransactionRow(existingTx.id, { amount: cost });
                                // Adjust card by the delta
                                if (costDiff !== 0) await updateCardBalance(paymentCardId, -Math.abs(costDiff) * Math.sign(costDiff));
                                // Update local cache
                                setTransactions(prev => prev.map(tx => tx.id === existingTx.id ? updated : tx).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                                setCards(prev => prev.map(c => c.id === paymentCardId ? { ...c, balance: c.balance - costDiff } : c));
                            } else {
                                // Remove transaction and refund card by oldCost
                                await deleteTransactionRow(existingTx.id);
                                await updateCardBalance(paymentCardId, Math.abs(oldCost));
                                setTransactions(prev => prev.filter(tx => tx.id !== existingTx.id));
                                setCards(prev => prev.map(c => c.id === paymentCardId ? { ...c, balance: c.balance + oldCost } : c));
                            }
                        } else if (cost > 0) {
                            // Create new transaction and decrease card by full cost
                            const created = await createTransaction({
                                date: new Date().toISOString().split('T')[0],
                                description,
                                amount: cost,
                                type: TransactionType.EXPENSE,
                                projectId: projectData.id,
                                category,
                                method: 'Sistem',
                                cardId: paymentCardId,
                            } as any);
                            await updateCardBalance(paymentCardId, -Math.abs(cost));
                            setTransactions(prev => [created, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                            setCards(prev => prev.map(c => c.id === paymentCardId ? { ...c, balance: c.balance - cost } : c));
                        }
                    } catch (e) {
                        console.warn('[Projects] Failed to persist cost transaction:', e);
                        // Non-fatal: continue with other fields
                    }
                }
            }
        }
        
        const allTeamMembersOnProject = projectData.team;
        const otherProjectPayments = teamProjectPayments.filter(p => p.projectId !== projectData.id);
        const newProjectPaymentEntries: TeamProjectPayment[] = allTeamMembersOnProject.map(teamMember => ({
            id: `TPP-${projectData.id}-${teamMember.memberId}`,
            projectId: projectData.id,
            teamMemberName: teamMember.name,
            teamMemberId: teamMember.memberId,
            date: projectData.date,
            status: 'Unpaid',
            fee: teamMember.fee,
            reward: teamMember.reward || 0,
        }));
        // Persist team payments to Supabase so they survive reloads
        try {
            await upsertTeamPaymentsForProject(projectData.id, newProjectPaymentEntries);
        } catch (e) {
            console.warn('[Projects] Failed to persist team payments:', e);
        }
        setTeamProjectPayments([...otherProjectPayments, ...newProjectPaymentEntries]);

        if (formMode === 'add') {
            setProjects(prev => [projectData, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else {
            setProjects(prev => prev.map(p => p.id === projectData.id ? projectData : p).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
        
        // Notifikasi status transport
        if (projectData.transportUsed) {
            const unpaidTransport = (projectData.transportDetails || []).filter(t => t.paymentStatus !== 'Paid');
            if (unpaidTransport.length > 0) {
                showNotification(`⚠️ Transport digunakan: ${unpaidTransport.length} item belum dibayar.`);
            } else if ((projectData.transportDetails || []).length > 0) {
                showNotification(`✅ Semua biaya transport telah dibayar.`);
            }
        }
        
        handleCloseForm();
    };

    const handleProjectDelete = async (projectId: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus proyek ini? Semua data terkait (termasuk tugas tim dan transaksi) akan dihapus.")) {
            try {
                await deleteProjectInDb(projectId);
            } catch (err) {
                console.warn('[Projects] Failed to delete project in Supabase:', err);
                showNotification('Gagal menghapus proyek di server. Coba lagi.');
                return;
            }
            setProjects(prev => prev.filter(p => p.id !== projectId));
            setTeamProjectPayments(prev => prev.filter(fp => fp.projectId !== projectId));
            setTransactions(prev => prev.filter(t => t.projectId !== projectId));
        }
    };
    
    const handleOpenBriefingModal = (project: Project) => {
        setSelectedProject(project);
        const date = new Date(project.date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    
        const teamList = project.team.length > 0
            ? project.team.map(t => `- ${t.name}`).join('\n')
            : 'Tim belum ditugaskan.';
    
        const parts = [];
        parts.push(`${date}`);
        parts.push(`*${project.projectName}*`);
        parts.push(`\n*Tim Bertugas:*\n${teamList}`);
        
        if (project.startTime || project.endTime || project.location) parts.push(''); 
    
        if (project.startTime) parts.push(`*Waktu Mulai:* ${project.startTime}`);
        if (project.endTime) parts.push(`*Waktu Selesai:* ${project.endTime}`);
        if (project.location) parts.push(`*Lokasi :* ${project.location}`);
        
        if (project.notes) {
            parts.push('');
            parts.push(`*Catatan:*\n${project.notes}`);
        }
    
        if (project.location || project.driveLink) parts.push('');
    
        if (project.location) {
            const mapsQuery = encodeURIComponent(project.location);
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
            parts.push(`*Link Lokasi:*\n${mapsLink}`);
        }
    
        if (project.driveLink) {
             if (project.location) parts.push('');
            parts.push(`*Link Moodboard:*\n${project.driveLink}`);
        }

        if (profile.briefingTemplate) {
            parts.push('\n---\n');
            parts.push(profile.briefingTemplate);
        }

        const text = parts.join('\n').replace(/\n\n\n+/g, '\n\n').trim();
    
        setBriefingText(text);
        setWhatsappLink(`whatsapp://send?text=${encodeURIComponent(text)}`);
        
        const toGoogleCalendarFormat = (date: Date) => date.toISOString().replace(/-|:|\.\d{3}/g, '');
        const timeRegex = /(\d{2}:\d{2})/;
        const startTimeMatch = project.startTime?.match(timeRegex);
        const endTimeMatch = project.endTime?.match(timeRegex);

        let googleLink = '';
        let icsContent = '';

        if (startTimeMatch) {
            const projectDateOnly = project.date.split('T')[0];
            const startDate = new Date(`${projectDateOnly}T${startTimeMatch[1]}:00`);
            const isInternalEvent = profile.eventTypes.includes(project.projectType);
            const durationHours = isInternalEvent ? 2 : 8;

            const endDate = endTimeMatch 
                ? new Date(`${projectDateOnly}T${endTimeMatch[1]}:00`)
                : new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

            const googleDates = `${toGoogleCalendarFormat(startDate)}/${toGoogleCalendarFormat(endDate)}`;
            
            const calendarDescription = `Briefing untuk ${project.projectName}:\n\n${text}`;

            googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(project.projectName)}&dates=${googleDates}&details=${encodeURIComponent(calendarDescription)}&location=${encodeURIComponent(project.location || '')}`;

            const icsDescription = calendarDescription.replace(/\n/g, '\\n');
            icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'BEGIN:VEVENT',
                `UID:${project.id}@venapictures.com`,
                `DTSTAMP:${toGoogleCalendarFormat(new Date())}`,
                `DTSTART:${toGoogleCalendarFormat(startDate)}`,
                `DTEND:${toGoogleCalendarFormat(endDate)}`,
                `SUMMARY:${project.projectName}`,
                `DESCRIPTION:${icsDescription}`,
                `LOCATION:${project.location || ''}`,
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\n');
        }

        setGoogleCalendarLink(googleLink);
        setIcsDataUri(icsContent ? `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}` : '');
    
        setIsBriefingModalOpen(true);
    };
    
    const getProgressForStatus = (status: string, config: ProjectStatusConfig[]): number => {
        const progressMap: { [key: string]: number } = {
            'Tertunda': 0,
            'Persiapan': 10,
            'Dikonfirmasi': 25,
            'Editing': 70,
            'Revisi': 80,
            'Cetak': 90,
            'Dikirim': 95,
            'Selesai': 100,
            'Dibatalkan': 0,
        };
        return progressMap[status] ?? 0;
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, projectId: string) => {
        e.dataTransfer.setData("projectId", projectId);
        setDraggedProjectId(projectId);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
        e.preventDefault();
        const projectId = e.dataTransfer.getData("projectId");
        const projectToUpdate = projects.find(p => p.id === projectId);

        if (projectToUpdate && projectToUpdate.status !== newStatus) {
            const nextProgress = getProgressForStatus(newStatus, profile.projectStatusConfig);
            try {
                await updateProjectInDb(projectToUpdate.id, {
                    status: newStatus as any,
                    progress: nextProgress as any,
                    activeSubStatuses: [] as any,
                } as any);
                setProjects(prevProjects =>
                    prevProjects.map(p =>
                        p.id === projectId ? { ...p, status: newStatus, progress: nextProgress, activeSubStatuses: [] } : p
                    )
                );
                showNotification(`Status "${projectToUpdate.projectName}" diubah ke "${newStatus}"`);
            } catch (err) {
                console.warn('[Projects] Failed to persist status change to Supabase:', err);
                showNotification('Gagal memperbarui status proyek di server. Coba lagi.');
            }
        }
        setDraggedProjectId(null);
    };
    
    const handleOpenConfirmationModal = (project: Project, subStatus: SubStatusConfig, isFollowUp: boolean) => {
        setConfirmationModalState({ project, subStatus, isFollowUp });
    };

    const handleCustomCostChange = (index: number, field: 'description' | 'amount', value: string) => {
        setFormData(prev => {
            const newCustomCosts = [...(prev.customCosts || [])];
            newCustomCosts[index] = { ...newCustomCosts[index], [field]: value };
            return { ...prev, customCosts: newCustomCosts };
        });
    };
    
    const addCustomCost = () => {
        setFormData(prev => ({ ...prev, customCosts: [...(prev.customCosts || []), { id: `cc-${Date.now()}`, description: '', amount: '' }] }));
    };

    const removeCustomCost = (index: number) => {
        setFormData(prev => {
            const newCustomCosts = [...(prev.customCosts || [])];
            newCustomCosts.splice(index, 1);
            return { ...prev, customCosts: newCustomCosts };
        });
    };

    const handleCustomSubStatusChange = (index: number, field: 'name' | 'note', value: string) => {
        setFormData(prev => {
            const newCustomSubStatuses = [...(prev.customSubStatuses || [])];
            const oldName = newCustomSubStatuses[index]?.name;
            newCustomSubStatuses[index] = { ...newCustomSubStatuses[index], [field]: value };
    
            if (field === 'name' && oldName && (prev.activeSubStatuses || []).includes(oldName)) {
                const newActiveSubStatuses = (prev.activeSubStatuses || []).map(name => name === oldName ? value : name);
                return { ...prev, customSubStatuses: newCustomSubStatuses, activeSubStatuses: newActiveSubStatuses };
            }
    
            return { ...prev, customSubStatuses: newCustomSubStatuses };
        });
    };

    const addCustomSubStatus = () => {
        setFormData(prev => ({
            ...prev,
            customSubStatuses: [...(prev.customSubStatuses || []), { name: '', note: '' }]
        }));
    };

    const removeCustomSubStatus = (index: number) => {
        setFormData(prev => {
            const customSubStatuses = prev.customSubStatuses || [];
            const subStatusToRemove = customSubStatuses[index];
            const newCustomSubStatuses = customSubStatuses.filter((_, i) => i !== index);

            let newActiveSubStatuses = prev.activeSubStatuses || [];
            if (subStatusToRemove) {
                newActiveSubStatuses = newActiveSubStatuses.filter(name => name !== subStatusToRemove.name);
            }

            return {
                ...prev,
                customSubStatuses: newCustomSubStatuses,
                activeSubStatuses: newActiveSubStatuses
            };
        });
    };
    
    const handlePayForPrintingItem = async (projectId: string, printingItemId: string, sourceCardId: string, sourcePocketId?: string) => {
        const project = projects.find(p => p.id === projectId) || (selectedProject && selectedProject.id === projectId ? selectedProject : null);
        // Resolve current list of printing items: prefer project, fallback to the open form
        const formIsForThisProject = !!(formData?.id && formData.id === projectId);
        const currentItems: PrintingItem[] = (project?.printingDetails && project.printingDetails.length > 0)
            ? (project.printingDetails as PrintingItem[])
            : (formIsForThisProject && Array.isArray(formData.printingDetails) ? (formData.printingDetails as PrintingItem[]) : []);

        const printingItem = currentItems.find(item => item.id === printingItemId);
        
        // Determine payment source: pocket or card
        const isFromPocket = !!sourcePocketId;
        const sourcePocket = isFromPocket ? pockets.find(p => p.id === sourcePocketId) : null;
        const sourceCard = !isFromPocket ? cards.find(c => c.id === sourceCardId) : null;

        if (!printingItem || (!sourcePocket && !sourceCard)) {
            showNotification("Error: Data tidak lengkap untuk memproses pembayaran.");
            return;
        }
        
        // Check balance
        if (isFromPocket && sourcePocket) {
            if (sourcePocket.amount < printingItem.cost) {
                showNotification(`Error: Saldo di kantong ${sourcePocket.name} tidak mencukupi.`);
                return;
            }
        } else if (sourceCard) {
            if (sourceCard.balance < printingItem.cost) {
                showNotification(`Error: Saldo di ${sourceCard.bankName} tidak mencukupi.`);
                return;
            }
        }

        try {
            // 1) Create expense transaction in DB
            const created = await createTransaction({
                date: new Date().toISOString().split('T')[0],
                description: `Biaya Cetak: ${printingItem.customName || printingItem.type} - Proyek ${project?.projectName || (formIsForThisProject ? formData.projectName : 'Proyek')}`,
                amount: printingItem.cost,
                type: TransactionType.EXPENSE,
                projectId: projectId,
                category: 'Cetak Album',
                method: 'Sistem',
                cardId: isFromPocket ? undefined : sourceCardId,
                pocketId: isFromPocket ? sourcePocketId : undefined,
                printingItemId: printingItemId,
            } as any);

            // 2) Decrease balance in DB (card or pocket)
            if (isFromPocket && sourcePocketId) {
                const { updatePocket } = await import('../services/pockets');
                await updatePocket(sourcePocketId, { amount: sourcePocket!.amount - printingItem.cost });
            } else if (sourceCardId) {
                await updateCardBalance(sourceCardId, -Math.abs(printingItem.cost));
            }

            // 3) Persist project printingDetails paymentStatus change
            const updatedPrintingDetails = (currentItems || []).map(item =>
                item.id === printingItemId ? { ...item, paymentStatus: 'Paid' as 'Paid' } : item
            );
            await updateProjectInDb(projectId, { printingDetails: updatedPrintingDetails } as any);

            // 4) Optimistically update local UI state
            setTransactions(prev => [created, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            
            if (isFromPocket && sourcePocketId) {
                setPockets(prev => prev.map(p => p.id === sourcePocketId ? { ...p, amount: p.amount - printingItem.cost } : p));
            } else if (sourceCardId) {
                setCards(prev => prev.map(c => c.id === sourceCardId ? { ...c, balance: c.balance - printingItem.cost } : c));
            }
            
            if (project) {
                setProjects(prevProjects => prevProjects.map(p => {
                    if (p.id === projectId) {
                        return { ...p, printingDetails: updatedPrintingDetails } as Project;
                    }
                    return p;
                }));
            }
            setFormData(prev => {
                const updatedPrintingDetailsForm = (prev.printingDetails || []).map((item: PrintingItem) =>
                    item.id === printingItemId ? { ...item, paymentStatus: 'Paid' as 'Paid' } : item
                );
                return { ...prev, printingDetails: updatedPrintingDetailsForm };
            });

            const sourceName = isFromPocket ? sourcePocket!.name : sourceCard!.bankName;
            showNotification(`Pembayaran untuk "${printingItem.customName || printingItem.type}" berhasil dari ${sourceName}.`);
        } catch (err) {
            console.warn('[Projects] Failed to process printing payment:', err);
            showNotification('Gagal memproses pembayaran cetak di server. Coba lagi.');
        }
    };

    const handlePayForTransportItem = async (projectId: string, transportItemId: string, cardId: string, pocketId?: string) => {
        const project = projects.find(p => p.id === projectId) || (selectedProject && selectedProject.id === projectId ? selectedProject : null);
        const formIsForThisProject = !!(formData?.id && formData.id === projectId);
        const currentItems: TransportItem[] = (project?.transportDetails && project.transportDetails.length > 0)
            ? (project.transportDetails as TransportItem[])
            : (formIsForThisProject && Array.isArray(formData.transportDetails) ? (formData.transportDetails as TransportItem[]) : []);

        const transportItem = currentItems.find(item => item.id === transportItemId);
        
        // Determine payment source: pocket or card
        const isFromPocket = !!pocketId;
        const sourcePocket = isFromPocket ? pockets.find(p => p.id === pocketId) : null;
        const sourceCard = !isFromPocket ? cards.find(c => c.id === cardId) : null;

        if (!transportItem || (!sourcePocket && !sourceCard)) {
            showNotification("Error: Data tidak lengkap untuk memproses pembayaran transport.");
            return;
        }
        
        // Check balance
        if (isFromPocket && sourcePocket) {
            if (sourcePocket.amount < transportItem.cost) {
                showNotification(`Error: Saldo di kantong ${sourcePocket.name} tidak mencukupi.`);
                return;
            }
        } else if (sourceCard) {
            if (sourceCard.balance < transportItem.cost) {
                showNotification(`Error: Saldo di ${sourceCard.bankName} tidak mencukupi.`);
                return;
            }
        }

        try {
            // 1) Create expense transaction in DB
            const created = await createTransaction({
                date: new Date().toISOString().split('T')[0],
                description: `Transport: ${transportItem.description} - Proyek ${project?.projectName || (formIsForThisProject ? formData.projectName : 'Proyek')}`,
                amount: transportItem.cost,
                type: TransactionType.EXPENSE,
                projectId: projectId,
                category: 'Transportasi',
                method: 'Sistem',
                cardId: isFromPocket ? undefined : cardId,
                pocketId: isFromPocket ? pocketId : undefined,
            } as any);

            // 2) Decrease balance in DB (card or pocket)
            if (isFromPocket && pocketId) {
                const { updatePocket } = await import('../services/pockets');
                await updatePocket(pocketId, { amount: sourcePocket!.amount - transportItem.cost });
            } else if (cardId) {
                await updateCardBalance(cardId, -Math.abs(transportItem.cost));
            }

            // 3) Persist project transportDetails paymentStatus change
            const updatedTransportDetails = (currentItems || []).map(item =>
                item.id === transportItemId ? { 
                    ...item, 
                    paymentStatus: 'Paid' as 'Paid',
                    paidAt: new Date().toISOString(),
                    paymentType: isFromPocket ? 'pocket' as 'pocket' : 'card' as 'card',
                    cardId: isFromPocket ? undefined : cardId,
                    pocketId: isFromPocket ? pocketId : undefined
                } : item
            );
            await updateProjectInDb(projectId, { transportDetails: updatedTransportDetails } as any);

            // 4) Optimistically update local UI state
            setTransactions(prev => [created, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            
            if (isFromPocket && pocketId) {
                setPockets(prev => prev.map(p => p.id === pocketId ? { ...p, amount: p.amount - transportItem.cost } : p));
            } else if (cardId) {
                setCards(prev => prev.map(c => c.id === cardId ? { ...c, balance: c.balance - transportItem.cost } : c));
            }
            
            if (project) {
                setProjects(prevProjects => prevProjects.map(p => {
                    if (p.id === projectId) {
                        return { ...p, transportDetails: updatedTransportDetails } as Project;
                    }
                    return p;
                }));
            }
            setFormData(prev => {
                const updatedTransportDetailsForm = (prev.transportDetails || []).map((item: TransportItem) =>
                    item.id === transportItemId ? { 
                        ...item, 
                        paymentStatus: 'Paid' as 'Paid',
                        paidAt: new Date().toISOString(),
                        paymentType: isFromPocket ? 'pocket' as 'pocket' : 'card' as 'card',
                        cardId: isFromPocket ? undefined : cardId,
                        pocketId: isFromPocket ? pocketId : undefined
                    } : item
                );
                return { ...prev, transportDetails: updatedTransportDetailsForm };
            });

            const sourceName = isFromPocket ? sourcePocket!.name : sourceCard!.bankName;
            showNotification(`Pembayaran transport "${transportItem.description}" berhasil dari ${sourceName}.`);
        } catch (err) {
            console.warn('[Projects] Failed to process transport payment:', err);
            showNotification('Gagal memproses pembayaran transport di server. Coba lagi.');
        }
    };

    // UI/UX Improvement Handlers
    const handleQuickStatusChange = async (projectId: string, newStatus: string, notifyClient: boolean) => {
        try {
            const project = projects.find(p => p.id === projectId);
            if (!project) return;
            
            const updated = { ...project, status: newStatus };
            await updateProjectInDb(projectId, { status: newStatus } as any);
            
            setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
            
            if (notifyClient) {
                // TODO: Implement client notification
                console.log('Notifying client about status change:', newStatus);
            }
            
            showNotification(`Status berhasil diubah ke "${newStatus}"`);
        } catch (error) {
            console.error('Quick status change error:', error);
            showNotification('Gagal mengubah status');
        }
    };

    const handleSendMessage = (project: Project) => {
        const client = clients.find(c => c.id === project.clientId);
        if (!client) return;
        
        const phone = client.whatsapp || client.phone;
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            const message = `Halo ${client.name}, terkait proyek ${project.projectName}...`;
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            showNotification('Nomor telepon klien tidak tersedia');
        }
    };

    const handleViewInvoice = (project: Project) => {
        setSelectedProject(project);
        // TODO: Open invoice modal or navigate to invoice page
        showNotification('Fitur invoice akan segera tersedia');
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Pekerjaan Wedding" subtitle="Lacak semua proyek dari awal hingga selesai.">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary">Pelajari Halaman Ini</button>
                    <button onClick={() => handleOpenForm('add')} className="button-primary inline-flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/>
                        Tambah Proyek
                    </button>
                </div>
            </PageHeader>
            
            <div className="space-y-6">
                <ProjectAnalytics 
                    projects={projects}
                    teamProjectPayments={teamProjectPayments}
                    projectStatusConfig={profile.projectStatusConfig}
                    onStatCardClick={setActiveStatModal}
                />

                <div className="bg-brand-surface p-3 md:p-4 rounded-xl shadow-lg border border-brand-border flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
                    <div className="input-group flex-grow !mt-0 w-full md:w-auto">
                        <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 md:p-2.5 text-sm" placeholder=" " />
                        <label className="input-label text-sm">Cari proyek atau klien...</label>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 md:p-2.5 text-sm w-full md:w-48">
                            <option value="all">Semua Status</option>
                            {profile.projectStatusConfig.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                         <div className="p-0.5 md:p-1 bg-brand-bg rounded-lg flex items-center h-fit">
                            <button onClick={() => setViewMode('list')} className={`p-1.5 md:p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}><ListIcon className="w-4 h-4 md:w-5 md:h-5"/></button>
                            <button onClick={() => setViewMode('kanban')} className={`p-1.5 md:p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}><LayoutGridIcon className="w-4 h-4 md:w-5 md:h-5"/></button>
                        </div>
                    </div>
                </div>
                
                {viewMode === 'list' ? (
                    <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                        <div className="p-3 md:p-4 border-b border-brand-border">
                            <button onClick={() => setActiveSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                                <h3 className="text-sm md:text-base font-semibold text-brand-text-light">Proyek Aktif ({activeProjects.length})</h3>
                                {activeSectionOpen ? <ArrowUpIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary"/> : <ArrowDownIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary"/>}
                            </button>
                        </div>
                        {activeSectionOpen && <ProjectListView projects={activeProjects} handleOpenDetailModal={handleOpenDetailModal} handleOpenForm={handleOpenForm} handleProjectDelete={handleProjectDelete} config={profile.projectStatusConfig} clients={clients} handleQuickStatusChange={handleQuickStatusChange} handleSendMessage={handleSendMessage} handleViewInvoice={handleViewInvoice} />}
                         <div className="p-3 md:p-4 border-t border-brand-border">
                            <button onClick={() => setCompletedSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                                <h3 className="text-sm md:text-base font-semibold text-brand-text-light">Proyek Selesai & Dibatalkan ({completedAndCancelledProjects.length})</h3>
                                {completedSectionOpen ? <ArrowUpIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary"/> : <ArrowDownIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary"/>}
                            </button>
                        </div>
                        {completedSectionOpen && <ProjectListView projects={completedAndCancelledProjects} handleOpenDetailModal={handleOpenDetailModal} handleOpenForm={handleOpenForm} handleProjectDelete={handleProjectDelete} config={profile.projectStatusConfig} clients={clients} handleQuickStatusChange={handleQuickStatusChange} handleSendMessage={handleSendMessage} handleViewInvoice={handleViewInvoice} />}
                    </div>
                ) : (
                    <ProjectKanbanView projects={filteredProjects} handleOpenDetailModal={handleOpenDetailModal} draggedProjectId={draggedProjectId} handleDragStart={handleDragStart} handleDragOver={handleDragOver} handleDrop={handleDrop} config={profile.projectStatusConfig} />
                )}
            </div>
            
            <ProjectForm
                isOpen={isFormModalOpen}
                onClose={handleCloseForm}
                mode={formMode}
                formData={formData}
                onFormChange={handleFormChange}
                onSubStatusChange={handleSubStatusChange}
                onClientChange={handleClientChange}
                onTeamChange={handleTeamChange}
                onTeamFeeChange={handleTeamFeeChange}
                onTeamRewardChange={handleTeamRewardChange}
                onTeamSubJobChange={handleTeamSubJobChange}
                onCustomSubStatusChange={handleCustomSubStatusChange}
                onAddCustomSubStatus={addCustomSubStatus}
                onRemoveCustomSubStatus={removeCustomSubStatus}
                onSubmit={handleFormSubmit}
                clients={clients}
                teamMembers={teamMembers}
                profile={profile}
                teamByRole={teamByRole}
                onCustomCostChange={handleCustomCostChange}
                onAddCustomCost={addCustomCost}
                onRemoveCustomCost={removeCustomCost}
                onPayPrintingItem={handlePayForPrintingItem}
                onPayTransportItem={handlePayForTransportItem}
                cards={cards}
                pockets={pockets}
                showNotification={showNotification}
                setFormData={setFormData}
            />

            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Detail Proyek: ${selectedProject?.projectName}`} size="3xl">
                <ProjectDetailModal 
                    selectedProject={selectedProject}
                    setSelectedProject={setSelectedProject}
                    teamMembers={teamMembers}
                    clients={clients}
                    profile={profile}
                    showNotification={showNotification}
                    setProjects={setProjects}
                    onClose={() => setIsDetailModalOpen(false)}
                    handleOpenForm={handleOpenForm}
                    handleProjectDelete={handleProjectDelete}
                    handleOpenBriefingModal={handleOpenBriefingModal}
                    handleOpenConfirmationModal={handleOpenConfirmationModal}
                    packages={packages}
                    transactions={transactions}
                    teamProjectPayments={teamProjectPayments}
                    cards={cards}
                />
            </Modal>

            <Modal isOpen={isBriefingModalOpen} onClose={() => setIsBriefingModalOpen(false)} title="Bagikan Briefing Proyek" size="2xl">
                {selectedProject && (
                    <div className="space-y-4">
                        <textarea value={briefingText} readOnly rows={15} className="input-field w-full text-sm"></textarea>
                        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-brand-border">
                            {icsDataUri && <a href={icsDataUri} download={`${selectedProject.projectName}.ics`} className="button-secondary text-sm">Download .ICS</a>}
                            {googleCalendarLink && <a href={googleCalendarLink} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm">Tambah ke Google Calendar</a>}
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="button-primary inline-flex items-center gap-2">
                                <SendIcon className="w-4 h-4"/> Bagikan ke WhatsApp
                            </a>
                        </div>
                    </div>
                )}
            </Modal>

            {/* StatCard Detail Modals */}
            <StatCardModal
                isOpen={activeStatModal === 'value'}
                onClose={() => setActiveStatModal(null)}
                icon={<DollarSignIcon className="w-6 h-6"/>}
                title="Nilai Proyek Aktif"
                value={formatCurrency(statsForModal.totalActiveValue)}
                subtitle="Total nilai proyek berjalan"
                colorVariant="blue"
                description={`Nilai total dari semua proyek yang sedang aktif (belum selesai atau dibatalkan).\n\nTotal: ${formatCurrency(statsForModal.totalActiveValue)}\nJumlah Proyek: ${allActiveProjectsForStats.length}\n\nNilai ini mencerminkan potensi pendapatan dari proyek yang sedang berjalan.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Proyek Aktif</h4>
                    {allActiveProjectsForStats.slice(0, 10).map(project => (
                        <div key={project.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <p className="font-semibold text-brand-text-light text-sm">{project.projectName}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent">{project.status}</span>
                            </div>
                            <p className="text-xs text-brand-text-secondary">{clients.find(c => c.id === project.clientId)?.name}</p>
                            <p className="text-sm text-brand-accent font-semibold mt-1">{formatCurrency(project.totalCost)}</p>
                        </div>
                    ))}
                    {allActiveProjectsForStats.length > 10 && (
                        <p className="text-xs text-brand-text-secondary text-center pt-2">Dan {allActiveProjectsForStats.length - 10} proyek lainnya...</p>
                    )}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'receivables'}
                onClose={() => setActiveStatModal(null)}
                icon={<AlertCircleIcon className="w-6 h-6"/>}
                title="Total Piutang"
                value={formatCurrency(statsForModal.totalReceivables)}
                subtitle="Sisa tagihan belum dibayar"
                colorVariant="orange"
                description={`Total piutang adalah sisa pembayaran yang belum diterima dari klien.\n\nTotal Piutang: ${formatCurrency(statsForModal.totalReceivables)}\n\nPiutang perlu ditagih untuk menjaga cash flow bisnis Anda.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Proyek dengan Piutang</h4>
                    {allActiveProjectsForStats.filter(p => (p.totalCost - p.amountPaid) > 0).map(project => {
                        const remaining = project.totalCost - project.amountPaid;
                        return (
                            <div key={project.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-brand-text-light text-sm">{project.projectName}</p>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500">{formatCurrency(remaining)}</span>
                                </div>
                                <p className="text-xs text-brand-text-secondary">{clients.find(c => c.id === project.clientId)?.name}</p>
                                <div className="mt-2 text-xs">
                                    <span className="text-brand-text-secondary">Dibayar: </span>
                                    <span className="text-brand-accent font-semibold">{formatCurrency(project.amountPaid)}</span>
                                    <span className="text-brand-text-secondary"> / {formatCurrency(project.totalCost)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'team_costs'}
                onClose={() => setActiveStatModal(null)}
                icon={<BriefcaseIcon className="w-6 h-6"/>}
                title="Biaya Tim Belum Lunas"
                value={formatCurrency(statsForModal.unpaidTeamCosts)}
                subtitle="Fee freelancer yang tertunda"
                colorVariant="pink"
                description={`Total fee yang belum dibayarkan kepada freelancer/tim.\n\nTotal Belum Lunas: ${formatCurrency(statsForModal.unpaidTeamCosts)}\n\nPastikan untuk membayar fee tim tepat waktu untuk menjaga hubungan baik.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Fee Belum Dibayar</h4>
                    {teamProjectPayments.filter(p => p.status === 'Unpaid').map(payment => {
                        const project = projects.find(pr => pr.id === payment.projectId);
                        return (
                            <div key={payment.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-brand-text-light text-sm">{payment.teamMemberName}</p>
                                    <span className="text-sm text-pink-500 font-semibold">{formatCurrency(payment.fee)}</span>
                                </div>
                                <p className="text-xs text-brand-text-secondary">{project?.projectName || 'Unknown Project'}</p>
                                <p className="text-xs text-brand-text-secondary mt-1">Fee: {formatCurrency(payment.fee)}</p>
                            </div>
                        );
                    })}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'top_type'}
                onClose={() => setActiveStatModal(null)}
                icon={<FolderKanbanIcon className="w-6 h-6"/>}
                title="Jenis Proyek Teratas"
                value={statsForModal.topProjectType}
                subtitle="Jenis paling banyak dikerjakan"
                colorVariant="purple"
                description={`Jenis proyek yang paling sering Anda kerjakan.\n\nJenis Teratas: ${statsForModal.topProjectType}\n\nInformasi ini membantu Anda memahami spesialisasi bisnis dan fokus pemasaran.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Distribusi Jenis Proyek</h4>
                    {Object.entries(
                        projects.reduce((acc, p) => {
                            acc[p.projectType] = (acc[p.projectType] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>)
                    ).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                        <div key={type} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                            <p className="font-semibold text-brand-text-light text-sm">{type}</p>
                            <span className="text-sm text-brand-accent font-semibold">{count} proyek</span>
                        </div>
                    ))}
                </div>
            </StatCardModal>
        
        {/* UI/UX Improvement: Quick Status Modal */}
        <QuickStatusModal
            isOpen={quickStatusModalOpen}
            onClose={() => {
                setQuickStatusModalOpen(false);
                setSelectedProjectForStatus(null);
            }}
            project={selectedProjectForStatus}
            statusConfig={profile.projectStatusConfig}
            onStatusChange={handleQuickStatusChange}
            showNotification={showNotification}
        />
        </div>
    );
};

export default Projects;