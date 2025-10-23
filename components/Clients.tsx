import React, { useState, useMemo, useEffect } from 'react';
import { Client, Project, PaymentStatus, Package, AddOn, TransactionType, Profile, Transaction, ClientStatus, Card, FinancialPocket, Contract, ViewType, NavigationAction, ClientFeedback, SatisfactionLevel, PromoCode, ClientType, Notification } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import StatCardModal from './StatCardModal';
import SignaturePad from './SignaturePad';
import DonutChart from './DonutChart';
import PrintButton from './PrintButton';
import { EyeIcon, PencilIcon, Trash2Icon, FileTextIcon, PlusIcon, PrinterIcon, CreditCardIcon, Share2Icon, HistoryIcon, DollarSignIcon, FolderKanbanIcon, UsersIcon, TrendingUpIcon, AlertCircleIcon, LightbulbIcon, MessageSquareIcon, PhoneIncomingIcon, MapPinIcon, QrCodeIcon, StarIcon, TrendingDownIcon, ArrowDownIcon, ArrowUpIcon, DownloadIcon, WhatsappIcon } from '../constants';
import { cleanPhoneNumber } from '../constants';
import { createClient as createClientRow, updateClient as updateClientRow, deleteClient as deleteClientRow } from '../services/clients';
import { createProject as createProjectRow, updateProject as updateProjectRow, deleteProject as deleteProjectRow } from '../services/projects';
import { createTransaction as createTransactionRow, updateCardBalance } from '../services/transactions';
import { findCardIdByMeta } from '../services/cards';

const formatCurrency = (amount: number) => {
    // Ensure proper Indonesian currency formatting with correct decimal separator
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

const getPaymentStatusClass = (status: PaymentStatus | null) => {
    if (!status) return 'bg-gray-500/20 text-gray-400';
    switch (status) {
        case PaymentStatus.LUNAS: return 'bg-green-500/20 text-green-400';
        case PaymentStatus.DP_TERBAYAR: return 'bg-blue-500/20 text-blue-400';
        case PaymentStatus.BELUM_BAYAR: return 'bg-yellow-500/20 text-yellow-400';
        default: return 'bg-gray-500/20 text-gray-400';
    }
};

const initialFormState = {
    // Client fields
    clientId: '',
    clientName: '',
    email: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    clientType: ClientType.DIRECT,
    // Project fields
    projectId: '', // Keep track of which project is being edited
    projectName: '',
    projectType: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    packageId: '',
    selectedAddOnIds: [] as string[],
    // duration and unit price for packages with durationOptions
    durationSelection: '',
    unitPrice: undefined as number | undefined,
    dp: '',
    dpDestinationCardId: '',
    notes: '',
    accommodation: '',
    driveLink: '',
    promoCodeId: '',
};

const downloadCSV = (headers: string[], data: (string | number)[][], filename: string) => {
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            row.map(field => {
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        )
    ];
    
    const csvString = csvRows.join('\n');
    // Add UTF-8 BOM so Excel (Windows) recognizes encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


interface BillingChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    projects: Project[];
    userProfile: Profile;
    showNotification: (message: string) => void;
}

const BillingChatModal: React.FC<BillingChatModalProps> = ({ isOpen, onClose, client, projects, userProfile, showNotification }) => {
    const [message, setMessage] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('friendly_reminder');

    const BILLING_CHAT_TEMPLATES = [
        {
            id: 'friendly_reminder',
            title: 'Pengingat Ramah',
            template: 'Halo {clientName},\n\nSemoga sehat selalu. Kami ingin mengingatkan perihal sisa pembayaran untuk proyek Anda.\n\nBerikut rinciannya:\n{projectDetails}\n\nTotal Sisa Tagihan: *{totalDue}*\n\nAnda dapat melihat rincian invoice dan riwayat pembayaran melalui Portal Klien Anda di sini:\n{portalLink}\n\nPembayaran dapat dilakukan ke rekening berikut:\n{bankAccount}\n\nMohon konfirmasinya jika pembayaran telah dilakukan. Terima kasih!\n\nSalam,\nTim {companyName}'
        },
        {
            id: 'due_date_reminder',
            title: 'Pengingat Jatuh Tempo',
            template: 'Yth. Bapak/Ibu {clientName},\n\nMenurut catatan kami, sisa pembayaran proyek Anda akan jatuh tempo. Berikut adalah rincian tagihan Anda:\n\n{projectDetails}\n\nTotal Sisa Tagihan: *{totalDue}*\n\nUntuk melihat detail invoice, silakan akses Portal Klien Anda di tautan berikut:\n{portalLink}\n\nKami mohon kesediaan Anda untuk menyelesaikan pembayaran sebelum tanggal jatuh tempo untuk menghindari kendala. Pembayaran dapat ditransfer ke:\n{bankAccount}\n\nTerima kasih atas kerja samanya.\n\nHormat kami,\nTim {companyName}'
        }
    ];

    useEffect(() => {
        if (!client) return;

        const projectsWithBalance = projects.filter(p => p.clientId === client.id && (p.totalCost - p.amountPaid) > 0);
        if (projectsWithBalance.length === 0) return;

        const totalDue = projectsWithBalance.reduce((sum, p) => sum + (p.totalCost - p.amountPaid), 0);

        const projectDetails = projectsWithBalance.map(p => 
            `- Proyek: *${p.projectName}*\n  Sisa Tagihan: ${formatCurrency(p.totalCost - p.amountPaid)}`
        ).join('\n');
        
        const path = window.location.pathname.replace(/index\.html$/, '');
        const portalLink = `${window.location.origin}${path}#/portal/${client.portalAccessId}`;
        
        const template = BILLING_CHAT_TEMPLATES.find(t => t.id === selectedTemplateId)?.template || BILLING_CHAT_TEMPLATES[0].template;

        const processedMessage = template
            .replace('{clientName}', client.name)
            .replace('{projectDetails}', projectDetails)
            .replace('{totalDue}', formatCurrency(totalDue))
            .replace('{portalLink}', portalLink)
            .replace('{bankAccount}', userProfile.bankAccount || 'N/A')
            .replace(/{companyName}/g, userProfile.companyName || 'Tim Kami');
        
        setMessage(processedMessage);

    }, [client, projects, userProfile, selectedTemplateId]);

    const handleShareToWhatsApp = () => {
        if (!client || (!client.phone && !client.whatsapp)) {
            showNotification('Nomor telepon klien tidak tersedia.');
            return;
        }
        if (!message.trim()) {
            showNotification('Pesan tidak boleh kosong.');
            return;
        }
        const phoneNumber = cleanPhoneNumber(client.whatsapp || client.phone);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    if (!isOpen || !client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kirim Tagihan ke ${client.name}`} size="2xl">
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-semibold text-brand-text-secondary">Gunakan Template Pesan:</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {BILLING_CHAT_TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => setSelectedTemplateId(template.id)}
                                className={`button-secondary !text-xs !px-3 !py-1.5 ${selectedTemplateId === template.id ? '!bg-brand-accent !text-white !border-brand-accent' : ''}`}
                            >
                                {template.title}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="input-group">
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={12} className="input-field"></textarea>
                    <label className="input-label">Isi Pesan</label>
                </div>
                <div className="flex justify-end items-center pt-4 border-t border-brand-border">
                    <button onClick={handleShareToWhatsApp} className="button-primary inline-flex items-center gap-2">
                        <WhatsappIcon className="w-5 h-5" /> Kirim via WhatsApp
                    </button>
                </div>
            </div>
        </Modal>
    );
};


interface ClientFormProps {
    formData: typeof initialFormState;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleFormSubmit: (e: React.FormEvent) => void;
    handleCloseModal: () => void;
    packages: Package[];
    addOns: AddOn[];
    userProfile: Profile;
    modalMode: 'add' | 'edit';
    cards: Card[];
    promoCodes: PromoCode[];
}

const ClientForm: React.FC<ClientFormProps> = ({ formData, handleFormChange, handleFormSubmit, handleCloseModal, packages, addOns, userProfile, modalMode, cards, promoCodes }) => {
    
    const priceCalculations = useMemo(() => {
            const selectedPackage = packages.find(p => p.id === formData.packageId);
            // Prefer explicit unitPrice stored in form (selected duration), fallback to package.price
            const packagePrice = (formData.unitPrice && Number(formData.unitPrice) > 0) ? Number(formData.unitPrice) : (selectedPackage?.price || 0);

        const addOnsPrice = addOns
            .filter(addon => formData.selectedAddOnIds.includes(addon.id))
            .reduce((sum, addon) => sum + addon.price, 0);

        let totalProjectBeforeDiscount = packagePrice + addOnsPrice;
        let discountAmount = 0;
        let discountApplied = 'N/A';
        const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);

        if (promoCode) {
            if (promoCode.discountType === 'percentage') {
                discountAmount = (totalProjectBeforeDiscount * promoCode.discountValue) / 100;
                discountApplied = `${promoCode.discountValue}%`;
            } else { // fixed
                discountAmount = promoCode.discountValue;
                discountApplied = formatCurrency(promoCode.discountValue);
            }
        }
        
        const totalProject = totalProjectBeforeDiscount - discountAmount;
        const remainingPayment = totalProject - Number(formData.dp);

        return { packagePrice, addOnsPrice, totalProject, remainingPayment, discountAmount, discountApplied };
    }, [formData.packageId, formData.selectedAddOnIds, formData.dp, formData.promoCodeId, packages, addOns, promoCodes]);
    
    return (
        <form onSubmit={handleFormSubmit} className="form-compact form-compact--ios-scale">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-2">
                {/* Left Column: Client & Project Info */}
                <div className="space-y-5">
                    <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2">Informasi Klien</h4>
                    <div className="space-y-2">
                        <label htmlFor="clientName" className="block text-xs text-brand-text-secondary">Nama Klien</label>
                        <input type="text" id="clientName" name="clientName" value={formData.clientName} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Masukkan nama klien" required/>
                        <p className="text-xs text-brand-text-secondary">Nama lengkap klien atau pasangan</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="clientType" className="block text-xs text-brand-text-secondary">Jenis Klien</label>
                        <select id="clientType" name="clientType" value={formData.clientType} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            {Object.values(ClientType).map(ct => <option key={ct} value={ct}>{ct}</option>)}
                        </select>
                        <p className="text-xs text-brand-text-secondary">Kategori jenis klien (Direct/Vendor/Referral)</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="phone" className="block text-xs text-brand-text-secondary">Nomor Telepon</label>
                        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="08123456789" required/>
                        <p className="text-xs text-brand-text-secondary">Nomor telepon utama yang bisa dihubungi</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="whatsapp" className="block text-xs text-brand-text-secondary">No. WhatsApp (Opsional)</label>
                        <input type="tel" id="whatsapp" name="whatsapp" value={formData.whatsapp || ''} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="08123456789"/>
                        <p className="text-xs text-brand-text-secondary">Nomor WhatsApp jika berbeda dengan nomor telepon</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-xs text-brand-text-secondary">Email</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="email@example.com" required/>
                        <p className="text-xs text-brand-text-secondary">Alamat email untuk komunikasi dan invoice</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="instagram" className="block text-xs text-brand-text-secondary">Instagram (Opsional)</label>
                        <input type="text" id="instagram" name="instagram" value={formData.instagram} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="@username"/>
                        <p className="text-xs text-brand-text-secondary">Username Instagram klien (tanpa @)</p>
                    </div>
                    
                    <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Informasi Proyek</h4>
                    <div className="space-y-2">
                        <label htmlFor="projectName" className="block text-xs text-brand-text-secondary">Nama Proyek</label>
                        <input type="text" id="projectName" name="projectName" value={formData.projectName} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Masukkan nama proyek" required/>
                        <p className="text-xs text-brand-text-secondary">Nama proyek atau acara (contoh: Wedding John & Jane)</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="projectType" className="block text-xs text-brand-text-secondary">Jenis Proyek</label>
                            <select id="projectType" name="projectType" value={formData.projectType} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                <option value="" disabled>Pilih Jenis...</option>
                                {userProfile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                            </select>
                            <p className="text-xs text-brand-text-secondary">Kategori jenis acara</p>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="date" className="block text-xs text-brand-text-secondary">Tanggal Acara</label>
                            <input type="date" id="date" name="date" value={formData.date} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/>
                            <p className="text-xs text-brand-text-secondary">Tanggal pelaksanaan acara</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="location" className="block text-xs text-brand-text-secondary">Lokasi</label>
                        <input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Lokasi acara"/>
                        <p className="text-xs text-brand-text-secondary">Lokasi atau venue tempat acara berlangsung</p>
                    </div>
                </div>

                {/* Right Column: Financial & Other Info */}
                <div className="space-y-4">
                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2">Detail Paket & Pembayaran</h4>
                    <div className="input-group">
                        <select id="packageId" name="packageId" value={formData.packageId} onChange={handleFormChange} className="input-field" required>
                            <option value="">Pilih paket...</option>
                            {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <label htmlFor="packageId" className="input-label">Paket</label>
                        <p className="text-right text-xs text-brand-text-secondary mt-1">Harga Paket: {formatCurrency(priceCalculations.packagePrice)}</p>
                    </div>
                    {/* Duration selector when package has durationOptions */}
                    {(() => {
                        const pkg = packages.find(p => p.id === formData.packageId);
                        if (pkg && Array.isArray(pkg.durationOptions) && pkg.durationOptions.length > 0) {
                            return (
                                <div className="input-group">
                                    <select id="durationSelection" name="durationSelection" value={formData.durationSelection || ''} onChange={handleFormChange} className="input-field">
                                        <option value="">Pilih Durasi...</option>
                                        {pkg.durationOptions.map((opt, idx) => <option key={idx} value={opt.label}>{opt.label} — {formatCurrency(opt.price)}</option>)}
                                    </select>
                                    <label htmlFor="durationSelection" className="input-label">Durasi</label>
                                    {formData.unitPrice && <p className="text-right text-xs text-brand-text-secondary mt-1">Harga Terpilih: {formatCurrency(Number(formData.unitPrice))}</p>}
                                </div>
                            );
                        }
                        return null;
                    })()}
                    
                    <div className="input-group">
                        <label className="input-label !static !-top-4 !text-brand-accent">Add-On</label>
                        <div className="p-3 border border-brand-border bg-brand-bg rounded-lg max-h-32 overflow-y-auto space-y-2 mt-2">
                            {addOns.map(addon => (
                                <label key={addon.id} className="flex items-center justify-between p-2 rounded-md hover:bg-brand-input cursor-pointer">
                                    <span className="text-sm text-brand-text-primary">{addon.name}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-brand-text-secondary">{formatCurrency(addon.price)}</span>
                                        <input type="checkbox" id={addon.id} name="addOns" checked={formData.selectedAddOnIds.includes(addon.id)} onChange={handleFormChange} />
                                    </div>
                                </label>
                            ))}
                        </div>
                        <p className="text-right text-xs text-brand-text-secondary mt-1">Total Harga Add-On: {formatCurrency(priceCalculations.addOnsPrice)}</p>
                    </div>

                    <div className="input-group">
                        <select id="promoCodeId" name="promoCodeId" value={formData.promoCodeId} onChange={handleFormChange} className="input-field">
                            <option value="">Tanpa Kode Promo</option>
                            {promoCodes.filter(p => p.isActive).map(p => (
                                <option key={p.id} value={p.id}>{p.code} - ({p.discountType === 'percentage' ? `${p.discountValue}%` : formatCurrency(p.discountValue)})</option>
                            ))}
                        </select>
                        <label htmlFor="promoCodeId" className="input-label">Kode Promo</label>
                        {formData.promoCodeId && <p className="text-right text-xs text-brand-success mt-1">Diskon Diterapkan: {priceCalculations.discountApplied}</p>}
                    </div>

                    <div className="p-4 bg-brand-bg rounded-lg space-y-3">
                        <div className="flex justify-between items-center font-bold text-lg"><span className="text-brand-text-secondary">Total Proyek</span><span className="text-brand-text-light">{formatCurrency(priceCalculations.totalProject)}</span></div>
                        <div className="input-group !mt-2">
                            <input type="number" name="dp" id="dp" value={formData.dp} onChange={handleFormChange} className="input-field text-right" placeholder=" "/>
                             <label htmlFor="dp" className="input-label">Uang DP</label>
                        </div>
                        {Number(formData.dp) > 0 && (
                            <div className="input-group !mt-2">
                                <select name="dpDestinationCardId" value={formData.dpDestinationCardId} onChange={handleFormChange} className="input-field" required>
                                    <option value="">Setor DP ke...</option>
                                    {cards.map(c => <option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)}
                                </select>
                                <label htmlFor="dpDestinationCardId" className="input-label">Kartu Tujuan</label>
                            </div>
                        )}
                        <hr className="border-brand-border"/>
                        <div className="flex justify-between items-center font-bold text-lg"><span className="text-brand-text-secondary">Sisa Pembayaran</span><span className="text-blue-500">{formatCurrency(priceCalculations.remainingPayment)}</span></div>
                    </div>

                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Lainnya (Opsional)</h4>
                    <div className="input-group"><textarea id="notes" name="notes" value={formData.notes} onChange={handleFormChange} className="input-field" placeholder=" "></textarea><label htmlFor="notes" className="input-label">Catatan Tambahan</label></div>
                </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-8 mt-8 border-t border-brand-border">
                <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan Klien & Proyek' : 'Update Klien & Proyek'}</button>
            </div>
        </form>
    );
};

interface ClientDetailModalProps {
    client: Client | null;
    projects: Project[];
    transactions: Transaction[];
    contracts: Contract[];
    onClose: () => void;
    onEditClient: (client: Client) => void;
    onDeleteClient: (clientId: string) => void;
    onViewReceipt: (transaction: Transaction) => void;
    onViewInvoice: (project: Project) => void;
    handleNavigation: (view: ViewType, action: NavigationAction) => void;
    onRecordPayment: (projectId: string, amount: number, destinationCardId: string) => void;
    cards: Card[];
    onSharePortal: (client: Client) => void;
    onDeleteProject: (projectId: string) => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, projects, transactions, contracts, onClose, onEditClient, onDeleteClient, onViewReceipt, onViewInvoice, handleNavigation, onRecordPayment, cards, onSharePortal, onDeleteProject }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [newPayments, setNewPayments] = useState<{[key: string]: { amount: string, destinationCardId: string }}>({});

    if (!client) return null;
    
    const handleNewPaymentChange = (projectId: string, field: 'amount' | 'destinationCardId', value: string) => {
        const currentProjectPayment = newPayments[projectId] || { amount: '', destinationCardId: '' };
        setNewPayments(prev => ({
            ...prev,
            [projectId]: {
                ...currentProjectPayment,
                [field]: value,
            }
        }));
    };

    const handleNewPaymentSubmit = (projectId: string) => {
        const paymentData = newPayments[projectId];
        const project = clientProjects.find(p => p.id === projectId);
        if (paymentData && Number(paymentData.amount) > 0 && paymentData.destinationCardId && project) {
            const amount = Number(paymentData.amount);
            if(amount > (project.totalCost - project.amountPaid)) {
                alert('Jumlah pembayaran melebihi sisa tagihan.');
                return;
            }
            onRecordPayment(projectId, amount, paymentData.destinationCardId);
            setNewPayments(prev => ({ ...prev, [projectId]: { amount: '', destinationCardId: '' } }));
        } else {
            alert('Harap isi jumlah dan tujuan pembayaran dengan benar.');
        }
    };


    const clientProjects = projects.filter(p => p.clientId === client.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const clientTransactions = transactions.filter(t => clientProjects.some(p => p.id === t.projectId)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const totalProjects = clientProjects.length;
    const totalProjectValue = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
    const totalPaid = clientProjects.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalDue = totalProjectValue - totalPaid;

    const InfoStatCard: React.FC<{icon: React.ReactNode, title: string, value: string}> = ({icon, title, value}) => (
        <div className="bg-brand-bg p-3 md:p-4 rounded-xl flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 border border-brand-border shadow-sm">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center bg-brand-surface flex-shrink-0">
                {icon}
            </div>
            <div className="text-center md:text-left">
                <p className="text-[10px] md:text-sm text-brand-text-secondary">{title}</p>
                <p className="text-sm md:text-lg font-bold text-brand-text-light truncate">{value}</p>
            </div>
        </div>
    );

    const DetailRow: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-1 sm:gap-4 border-b border-brand-border">
            <dt className="text-sm text-brand-text-secondary">{label}</dt>
            <dd className="text-sm text-brand-text-light font-semibold">{children}</dd>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Desktop Tab Navigation - Top */}
            <div className="hidden md:block border-b border-brand-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('info')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'info' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><UsersIcon className="w-5 h-5"/> Informasi Klien</button>
                    <button onClick={() => setActiveTab('payments')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'payments' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><HistoryIcon className="w-5 h-5"/> Riwayat Pembayaran</button>
                    <button onClick={() => setActiveTab('documents')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'documents' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><FileTextIcon className="w-5 h-5"/> Kontrak Kerja</button>
                </nav>
            </div>

            {/* Mobile Tab Navigation - Top Pills */}
            <div className="md:hidden mb-3">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button 
                        onClick={() => setActiveTab('info')} 
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                            activeTab === 'info' 
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30' 
                                : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                        }`}
                    >
                        <UsersIcon className="w-4 h-4"/> 
                        <span>Info Klien</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('payments')} 
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                            activeTab === 'payments' 
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30' 
                                : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                        }`}
                    >
                        <HistoryIcon className="w-4 h-4"/> 
                        <span>Pembayaran</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('documents')} 
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                            activeTab === 'documents' 
                                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30' 
                                : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                        }`}
                    >
                        <FileTextIcon className="w-4 h-4"/> 
                        <span>Kontrak</span>
                    </button>
                </div>
            </div>

            <div className="pt-0 md:pt-5 max-h-[65vh] md:max-h-[65vh] overflow-y-auto pr-2 pb-4">
                {activeTab === 'info' && (
                     <div className="space-y-6 md:space-y-8 tab-content-mobile">
                        {/* Mobile: Card-based info display */}
                        <div className="md:hidden bg-brand-surface rounded-2xl p-4 border border-brand-border shadow-sm">
                            <div className="space-y-3">
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Nama Lengkap</p>
                                    <p className="text-sm font-semibold text-brand-text-light">{client.name}</p>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Jenis Klien</p>
                                    <p className="text-sm font-semibold text-brand-text-light">{client.clientType}</p>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Email</p>
                                    <p className="text-sm font-semibold text-brand-text-light break-all">{client.email}</p>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Telepon</p>
                                    <a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-400 hover:underline active:text-blue-300">{client.whatsapp || client.phone}</a>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">No. WhatsApp</p>
                                    <a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-400 hover:underline active:text-blue-300">{client.whatsapp || client.phone}</a>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Instagram</p>
                                    <p className="text-sm font-semibold text-brand-text-light">{client.instagram || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-brand-text-secondary mb-1">Klien Sejak</p>
                                    <p className="text-sm font-semibold text-brand-text-light">{new Date(client.since).toLocaleDateString('id-ID')}</p>
                                </div>
                            </div>
                            <button onClick={() => onSharePortal(client)} className="mt-4 w-full button-primary inline-flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"><Share2Icon className="w-4 h-4" /> Bagikan Portal Klien</button>
                        </div>

                        {/* Desktop: Table-based info display */}
                        <div className="hidden md:block">
                            <dl>
                                <DetailRow label="Nama Lengkap">{client.name}</DetailRow>
                                <DetailRow label="Jenis Klien">{client.clientType}</DetailRow>
                                <DetailRow label="Email">{client.email}</DetailRow>
                                <DetailRow label="Telepon"><a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{client.whatsapp || client.phone}</a></DetailRow>
                                <DetailRow label="No. WhatsApp"><a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{client.whatsapp || client.phone}</a></DetailRow>
                                <DetailRow label="Instagram">{client.instagram || '-'}</DetailRow>
                                <DetailRow label="Klien Sejak">{new Date(client.since).toLocaleDateString('id-ID')}</DetailRow>
                            </dl>
                            <button onClick={() => onSharePortal(client)} className="mt-5 button-secondary inline-flex items-center gap-2 text-sm"><Share2Icon className="w-4 h-4" /> Bagikan Portal Klien</button>
                        </div>
                        
                        <div>
                            <h4 className="text-sm md:text-base font-semibold text-brand-text-light mb-1">Ringkasan Keuangan Klien</h4>
                            <p className="text-xs text-brand-text-secondary mb-3 md:mb-4">Total nilai proyek, pembayaran, dan sisa tagihan klien ini</p>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <InfoStatCard icon={<FolderKanbanIcon className="w-5 h-5 md:w-6 md:h-6 text-indigo-400"/>} title="Jumlah Proyek" value={totalProjects.toString()} />
                                <InfoStatCard icon={<DollarSignIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-400"/>} title="Total Nilai Proyek" value={formatCurrency(totalProjectValue)} />
                                <InfoStatCard icon={<TrendingUpIcon className="w-5 h-5 md:w-6 md:h-6 text-green-400"/>} title="Total Telah Dibayar" value={formatCurrency(totalPaid)} />
                                <InfoStatCard icon={<TrendingDownIcon className="w-5 h-5 md:w-6 md:h-6 text-red-400"/>} title="Total Sisa Tagihan" value={formatCurrency(totalDue)} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'payments' && (
                     <div className="space-y-6 md:space-y-8 tab-content-mobile">
                        {clientProjects.map(p => {
                            const transactionsForProject = clientTransactions.filter(t => t.projectId === p.id);
                            const remainingBalance = p.totalCost - p.amountPaid;
                            return (
                                <div key={p.id}>
                                    <h4 className="text-sm md:text-base font-semibold text-brand-text-light mb-1">Ringkasan Proyek & Invoice</h4>
                                    <p className="text-xs text-brand-text-secondary mb-2">Informasi biaya dan status pembayaran proyek</p>
                                    
                                    {/* Mobile: Enhanced card layout */}
                                    <div className="md:hidden bg-brand-surface rounded-2xl p-4 border border-brand-border shadow-sm space-y-4">
                                        <div>
                                            <p className="font-semibold text-brand-text-light text-base mb-3">{p.projectName}</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-brand-bg rounded-lg p-2.5 text-center">
                                                    <p className="text-[10px] text-brand-text-secondary mb-1">Total</p>
                                                    <p className="text-xs font-bold text-brand-text-primary">{formatCurrency(p.totalCost)}</p>
                                                </div>
                                                <div className="bg-brand-bg rounded-lg p-2.5 text-center">
                                                    <p className="text-[10px] text-brand-text-secondary mb-1">Terbayar</p>
                                                    <p className="text-xs font-bold text-green-400">{formatCurrency(p.amountPaid)}</p>
                                                </div>
                                                <div className="bg-brand-bg rounded-lg p-2.5 text-center">
                                                    <p className="text-[10px] text-brand-text-secondary mb-1">Sisa</p>
                                                    <p className="text-xs font-bold text-red-400">{formatCurrency(remainingBalance)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {p.dpProofUrl && (
                                                <a href={p.dpProofUrl} target="_blank" rel="noopener noreferrer" className="button-secondary text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-transform">
                                                    <CreditCardIcon className="w-4 h-4" /> Lihat Bukti DP
                                                </a>
                                            )}
                                            <button onClick={() => onViewInvoice(p)} className="button-primary text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-transform">
                                                <FileTextIcon className="w-4 h-4" /> Lihat Invoice
                                            </button>
                                            <button onClick={() => onDeleteProject(p.id)} className="button-secondary text-xs inline-flex items-center justify-center gap-2 !text-red-300 hover:!text-red-400 active:scale-95 transition-transform">
                                                <Trash2Icon className="w-4 h-4" /> Hapus Proyek
                                            </button>
                                        </div>
                                    </div>

                                    {/* Desktop: Original layout */}
                                    <div className="hidden md:block p-4 bg-brand-bg rounded-lg">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                            <div>
                                                <p className="font-semibold text-brand-text-light">{p.projectName}</p>
                                                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs mt-1">
                                                    <span>Total: <span className="font-medium text-brand-text-primary">{formatCurrency(p.totalCost)}</span></span>
                                                    <span>Terbayar: <span className="font-medium text-green-400">{formatCurrency(p.amountPaid)}</span></span>
                                                    <span>Sisa: <span className="font-medium text-red-400">{formatCurrency(remainingBalance)}</span></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                                                {p.dpProofUrl && (
                                                    <a href={p.dpProofUrl} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm inline-flex items-center gap-2">
                                                        <CreditCardIcon className="w-4 h-4" /> Lihat Bukti DP
                                                    </a>
                                                )}
                                                <button onClick={() => onViewInvoice(p)} className="button-secondary text-sm inline-flex items-center gap-2">
                                                    <FileTextIcon className="w-4 h-4" /> Lihat Invoice
                                                </button>
                                                <button onClick={() => onDeleteProject(p.id)} className="button-secondary text-sm inline-flex items-center gap-2 !text-red-300 hover:!text-red-400">
                                                    <Trash2Icon className="w-4 h-4" /> Hapus Proyek
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="text-sm md:text-base font-semibold text-brand-text-light mt-4 mb-1">Detail Transaksi Pembayaran</h4>
                                    <p className="text-xs text-brand-text-secondary mb-2">Riwayat semua pembayaran yang telah dilakukan untuk proyek ini</p>
                                    {/* Mobile cards */}
                                    <div className="md:hidden space-y-2">
                                        {transactionsForProject.length > 0 ? transactionsForProject.map(t => {
                                            const isTransport = 
                                                (t.category && t.category.toLowerCase().includes('transport')) || 
                                                (t.description && t.description.toLowerCase().includes('transport'));
                                            return (
                                            <div key={t.id} className="rounded-xl bg-brand-surface border border-brand-border p-3 shadow-sm flex items-start justify-between active:scale-[0.98] transition-transform">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <p className="text-sm font-medium text-brand-text-light">{t.description}</p>
                                                        {isTransport && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">🚗 TRANSPORT</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-brand-text-secondary">{new Date(t.date).toLocaleDateString('id-ID')}</p>
                                                    <p className="text-[10px] text-brand-text-secondary mt-0.5">{t.category || 'Tidak ada kategori'}</p>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <p className={`text-sm font-bold mb-1.5 ${t.type === TransactionType.INCOME ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(t.amount)}</p>
                                                    <button onClick={() => onViewReceipt(t)} className="button-secondary !text-[10px] !px-2 !py-1 active:scale-95 transition-transform">Bukti</button>
                                                </div>
                                            </div>
                                        )}) : (
                                            <div className="text-center p-8 bg-brand-surface rounded-xl border border-brand-border">
                                                <p className="text-sm text-brand-text-secondary">Belum ada pembayaran untuk proyek ini.</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* Desktop table */}
                                    <div className="hidden md:block border border-brand-border rounded-lg overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-brand-bg"><tr className="bg-brand-bg"><th className="p-3 text-left font-medium text-brand-text-secondary">Tanggal</th><th className="p-3 text-left font-medium text-brand-text-secondary">Deskripsi</th><th className="p-3 text-left font-medium text-brand-text-secondary">Kategori</th><th className="p-3 text-right font-medium text-brand-text-secondary">Jumlah</th><th className="p-3 text-center font-medium text-brand-text-secondary">Aksi</th></tr></thead>
                                            <tbody>
                                                {transactionsForProject.length > 0 ? transactionsForProject.map(t => {
                                                    const isTransport = 
                                                        (t.category && t.category.toLowerCase().includes('transport')) || 
                                                        (t.description && t.description.toLowerCase().includes('transport'));
                                                    return (
                                                    <tr key={t.id} className="border-t border-brand-border hover:bg-brand-bg/50 transition-colors">
                                                        <td className="p-3 text-brand-text-secondary">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-brand-text-light">{t.description}</span>
                                                                {isTransport && (
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 whitespace-nowrap">🚗 TRANSPORT</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-brand-text-secondary text-xs">{t.category || '-'}</td>
                                                        <td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(t.amount)}</td>
                                                        <td className="p-3 text-center"><button onClick={() => onViewReceipt(t)} className="p-1 text-brand-text-secondary hover:text-brand-accent transition-colors"><PrinterIcon className="w-5 h-5"/></button></td>
                                                    </tr>
                                                )}) : (
                                                    <tr><td colSpan={5} className="text-center p-4 text-brand-text-secondary">Belum ada pembayaran untuk proyek ini.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {remainingBalance > 0 && (
                                        <>
                                            <h4 className="text-sm md:text-base font-semibold text-brand-text-light mt-5 mb-3">Catat Pembayaran Baru</h4>
                                            {/* Mobile: Stacked card layout */}
                                            <div className="md:hidden bg-brand-surface rounded-2xl p-4 border border-brand-border shadow-sm">
                                                <div className="space-y-4">
                                                    <div className="input-group !mt-0">
                                                        <input type="number" id={`amount-mobile-${p.id}`} value={newPayments[p.id]?.amount || ''} onChange={(e) => handleNewPaymentChange(p.id, 'amount', e.target.value)} max={remainingBalance} className="input-field" placeholder=" "/>
                                                        <label htmlFor={`amount-mobile-${p.id}`} className="input-label text-xs">Jumlah (Maks: {formatCurrency(remainingBalance)})</label>
                                                    </div>
                                                    <div className="input-group !mt-0">
                                                         <select id={`dest-mobile-${p.id}`} value={newPayments[p.id]?.destinationCardId || ''} onChange={(e) => handleNewPaymentChange(p.id, 'destinationCardId', e.target.value)} className="input-field"><option value="">Pilih Tujuan...</option>{cards.map(c=><option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)}</select>
                                                         <label htmlFor={`dest-mobile-${p.id}`} className="input-label text-xs">Tujuan Pembayaran</label>
                                                    </div>
                                                    <button onClick={() => handleNewPaymentSubmit(p.id)} className="button-primary w-full active:scale-95 transition-transform">CATAT PEMBAYARAN</button>
                                                </div>
                                            </div>
                                            {/* Desktop: Original layout */}
                                            <div className="hidden md:block p-4 bg-brand-bg rounded-lg">
                                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                                    <div className="input-group flex-grow w-full !mt-0">
                                                        <input type="number" id={`amount-${p.id}`} value={newPayments[p.id]?.amount || ''} onChange={(e) => handleNewPaymentChange(p.id, 'amount', e.target.value)} max={remainingBalance} className="input-field" placeholder=" "/>
                                                        <label htmlFor={`amount-${p.id}`} className="input-label">Jumlah Pembayaran (Maks: {formatCurrency(remainingBalance)})</label>
                                                    </div>
                                                    <div className="input-group w-full sm:w-64 !mt-0">
                                                         <select id={`dest-${p.id}`} value={newPayments[p.id]?.destinationCardId || ''} onChange={(e) => handleNewPaymentChange(p.id, 'destinationCardId', e.target.value)} className="input-field"><option value="">Pilih Tujuan...</option>{cards.map(c=><option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)}</select>
                                                         <label htmlFor={`dest-${p.id}`} className="input-label">Tujuan Pembayaran</label>
                                                    </div>
                                                    <button onClick={() => handleNewPaymentSubmit(p.id)} className="button-primary h-fit w-full sm:w-auto flex-shrink-0">CATAT</button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                {activeTab === 'documents' && (
                    <div className="space-y-4 tab-content-mobile">
                        {/* Mobile: Header with stacked button */}
                        <div className="md:hidden space-y-3">
                            <div>
                                <h4 className="text-sm font-semibold text-brand-text-light mb-1">Daftar Kontrak Kerja</h4>
                                <p className="text-xs text-brand-text-secondary">Semua kontrak yang terkait dengan klien ini</p>
                            </div>
                            <button 
                                onClick={() => handleNavigation(ViewType.CONTRACTS, { type: 'CREATE_CONTRACT_FOR_CLIENT', id: client.id })} 
                                className="button-primary w-full inline-flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
                            >
                                <PlusIcon className="w-4 h-4"/> BUAT KONTRAK BARU
                            </button>
                        </div>

                        {/* Desktop: Header with side-by-side button */}
                        <div className="hidden md:flex justify-between items-start">
                            <div>
                                <h4 className="text-base font-semibold text-brand-text-light mb-1">Daftar Kontrak Kerja</h4>
                                <p className="text-xs text-brand-text-secondary">Semua kontrak yang terkait dengan klien ini</p>
                            </div>
                            <button 
                                onClick={() => handleNavigation(ViewType.CONTRACTS, { type: 'CREATE_CONTRACT_FOR_CLIENT', id: client.id })} 
                                className="button-primary inline-flex items-center gap-2 text-sm"
                            >
                                <PlusIcon className="w-4 h-4"/> BUAT KONTRAK BARU
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {contracts.filter(c => c.clientId === client.id).length > 0 ? (
                                contracts.filter(c => c.clientId === client.id).map(contract => {
                                    const project = projects.find(p => p.id === contract.projectId);
                                    return (
                                        <div key={contract.id}>
                                            {/* Mobile: Card layout */}
                                            <div className="md:hidden bg-brand-surface rounded-2xl p-4 border border-brand-border shadow-sm space-y-3">
                                                <div>
                                                    <p className="font-semibold text-brand-text-light text-sm">{contract.contractNumber}</p>
                                                    <p className="text-xs text-brand-text-secondary mt-1.5">Proyek: {project?.projectName || 'N/A'}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleNavigation(ViewType.CONTRACTS, { type: 'VIEW_CONTRACT', id: contract.id })}
                                                    className="button-primary w-full text-sm active:scale-95 transition-transform"
                                                >
                                                    Lihat Detail
                                                </button>
                                            </div>
                                            {/* Desktop: Original layout */}
                                            <div className="hidden md:flex p-4 bg-brand-bg rounded-lg justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-brand-text-light">{contract.contractNumber}</p>
                                                    <p className="text-xs text-brand-text-secondary mt-1">Proyek: {project?.projectName || 'N/A'}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleNavigation(ViewType.CONTRACTS, { type: 'VIEW_CONTRACT', id: contract.id })}
                                                    className="button-secondary text-sm"
                                                >
                                                    Lihat Detail
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 bg-brand-surface rounded-2xl border border-brand-border">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-brand-bg border-2 border-dashed border-brand-border flex items-center justify-center">
                                        <FileTextIcon className="w-8 h-8 text-brand-text-secondary" />
                                    </div>
                                    <p className="text-sm text-brand-text-secondary">Belum ada kontrak untuk klien ini.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


interface ClientsProps {
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    packages: Package[];
    addOns: AddOn[];
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    userProfile: Profile;
    showNotification: (message: string) => void;
    initialAction: NavigationAction | null;
    setInitialAction: (action: NavigationAction | null) => void;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
    contracts: Contract[];
    handleNavigation: (view: ViewType, action: NavigationAction) => void;
    clientFeedback: ClientFeedback[];
    promoCodes: PromoCode[];
    setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
    onSignInvoice: (projectId: string, signatureDataUrl: string) => void;
    onSignTransaction: (transactionId: string, signatureDataUrl: string) => void;
    onRecordPayment: (projectId: string, amount: number, destinationCardId: string) => Promise<void>;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
}

const NewClientsChart: React.FC<{ data: { name: string; count: number }[] }> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const hasData = data.some(d => d.count > 0);

    if (!hasData) {
        return (
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg h-full border border-brand-border">
                <h3 className="font-bold text-lg text-gradient mb-6">Akusisi Klien Baru ({new Date().getFullYear()})</h3>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-brand-bg border-2 border-dashed border-brand-border flex items-center justify-center mb-3">
                        <svg className="w-10 h-10 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-brand-text-light mb-1">Belum Ada Klien Baru</p>
                    <p className="text-xs text-brand-text-secondary">Data klien baru akan muncul di sini</p>
                </div>
            </div>
        );
    }

    // Generate gradient colors for each bar
    const getBarColor = (index: number) => {
        const colors = [
            { from: 'from-blue-500', to: 'to-cyan-400', solid: 'bg-blue-500', glow: 'shadow-blue-500/50' },
            { from: 'from-purple-500', to: 'to-pink-400', solid: 'bg-purple-500', glow: 'shadow-purple-500/50' },
            { from: 'from-green-500', to: 'to-emerald-400', solid: 'bg-green-500', glow: 'shadow-green-500/50' },
            { from: 'from-orange-500', to: 'to-amber-400', solid: 'bg-orange-500', glow: 'shadow-orange-500/50' },
            { from: 'from-pink-500', to: 'to-rose-400', solid: 'bg-pink-500', glow: 'shadow-pink-500/50' },
            { from: 'from-indigo-500', to: 'to-blue-400', solid: 'bg-indigo-500', glow: 'shadow-indigo-500/50' },
            { from: 'from-teal-500', to: 'to-cyan-400', solid: 'bg-teal-500', glow: 'shadow-teal-500/50' },
            { from: 'from-red-500', to: 'to-orange-400', solid: 'bg-red-500', glow: 'shadow-red-500/50' },
            { from: 'from-violet-500', to: 'to-purple-400', solid: 'bg-violet-500', glow: 'shadow-violet-500/50' },
            { from: 'from-cyan-500', to: 'to-blue-400', solid: 'bg-cyan-500', glow: 'shadow-cyan-500/50' },
            { from: 'from-amber-500', to: 'to-yellow-400', solid: 'bg-amber-500', glow: 'shadow-amber-500/50' },
            { from: 'from-emerald-500', to: 'to-green-400', solid: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg h-full border border-brand-border">
            <h3 className="font-bold text-lg text-gradient mb-2">Akusisi Klien Baru ({new Date().getFullYear()})</h3>
            <p className="text-xs text-brand-text-secondary mb-6">Jumlah klien baru per bulan</p>
            <div className="h-52 flex justify-between items-end gap-2 relative bg-gradient-to-t from-brand-bg/50 to-transparent rounded-xl p-4">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="border-t border-brand-border/20"></div>
                    ))}
                </div>
                
                {data.map((item, index) => {
                    const height = Math.max((item.count / maxCount) * 100, 5);
                    const isHovered = hoveredIndex === index;
                    const barColor = getBarColor(index);
                    
                    return (
                        <div 
                            key={item.name} 
                            className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer z-10"
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* Tooltip */}
                            {isHovered && (
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gradient-to-br from-brand-surface to-brand-bg border-2 border-brand-accent/40 text-white font-semibold py-2.5 px-4 rounded-xl shadow-2xl text-xs whitespace-nowrap z-20 backdrop-blur-sm">
                                    <p className="text-brand-accent font-bold mb-1">{item.name}</p>
                                    <p className="text-brand-text-light flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="font-bold text-lg">{item.count}</span>
                                        <span>Klien</span>
                                    </p>
                                </div>
                            )}
                            
                            {/* Count label on top of bar */}
                            {item.count > 0 && (
                                <div className={`absolute -top-6 text-xs font-bold py-1 px-2 rounded-md transition-all duration-300 ${
                                    isHovered 
                                        ? 'opacity-100 scale-110 text-brand-accent' 
                                        : 'opacity-70 text-brand-text-secondary'
                                }`}>
                                    {item.count}
                                </div>
                            )}
                            
                            {/* Bar with gradient */}
                            <div
                                className={`w-full rounded-t-xl transition-all duration-300 bg-gradient-to-t ${barColor.from} ${barColor.to} relative overflow-hidden ${
                                    isHovered 
                                        ? `shadow-2xl ${barColor.glow} scale-x-110 scale-y-105` 
                                        : 'shadow-lg hover:scale-105'
                                }`}
                                style={{ height: `${height}%` }}
                            >
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                {/* Animated pulse when hovered */}
                                {isHovered && (
                                    <div className="absolute inset-0 animate-pulse bg-white/10"></div>
                                )}
                            </div>
                            
                            {/* Month label */}
                            <span className={`text-[10px] mt-2.5 font-medium transition-all duration-300 ${
                                isHovered 
                                    ? 'text-brand-accent font-bold scale-110' 
                                    : 'text-brand-text-secondary'
                            }`}>
                                {item.name}
                            </span>
                        </div>
                    );
                })}
            </div>
            
            {/* Summary info */}
            <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-brand-text-secondary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Total: <span className="font-bold text-brand-text-light">{data.reduce((sum, d) => sum + d.count, 0)} Klien</span></span>
                </div>
                <div className="text-brand-text-secondary">
                    Rata-rata: <span className="font-bold text-brand-text-light">{(data.reduce((sum, d) => sum + d.count, 0) / data.length).toFixed(1)} / bulan</span>
                </div>
            </div>
        </div>
    );
};

const Clients: React.FC<ClientsProps> = ({ clients, setClients, projects, setProjects, packages, addOns, transactions, setTransactions, userProfile, showNotification, initialAction, setInitialAction, cards, setCards, pockets, setPockets, contracts, handleNavigation, clientFeedback, promoCodes, setPromoCodes, onSignInvoice, onSignTransaction, addNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState(initialFormState);
    
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [clientForDetail, setClientForDetail] = useState<Client | null>(null);
    const [billingChatModal, setBillingChatModal] = useState<Client | null>(null);

    const [documentToView, setDocumentToView] = useState<{ type: 'invoice', project: Project } | { type: 'receipt', transaction: Transaction } | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [qrModalContent, setQrModalContent] = useState<{ title: string; url: string } | null>(null);
    
    // New state for filters and UI
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Semua Status');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeSectionOpen, setActiveSectionOpen] = useState(true);
    const [inactiveSectionOpen, setInactiveSectionOpen] = useState(true);
    const [isBookingFormShareModalOpen, setIsBookingFormShareModalOpen] = useState(false);
    const [activeStatModal, setActiveStatModal] = useState<'active' | 'location' | 'receivables' | 'total' | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    useEffect(() => {
        if (initialAction && initialAction.type === 'VIEW_CLIENT_DETAILS' && initialAction.id) {
            const clientToView = clients.find(c => c.id === initialAction.id);
            if (clientToView) {
                setClientForDetail(clientToView);
                setIsDetailModalOpen(true);
            }
            setInitialAction(null); // Reset action after handling
        }
    }, [initialAction, clients, setInitialAction]);
    
    const bookingFormUrl = useMemo(() => {
        const path = window.location.pathname.replace(/index\.html$/, '');
        return `${window.location.origin}${path}#/public-booking`;
    }, []);

    useEffect(() => {
        if (qrModalContent) {
            const qrCodeContainer = document.getElementById('client-portal-qrcode');
            if (qrCodeContainer && typeof (window as any).QRCode !== 'undefined') {
                qrCodeContainer.innerHTML = '';
                 new (window as any).QRCode(qrCodeContainer, {
                    text: qrModalContent.url,
                    width: 200,
                    height: 200,
                    colorDark: "#020617",
                    colorLight: "#ffffff",
                    correctLevel: 2 // H
                });
            }
        }
        
        if (isBookingFormShareModalOpen) {
            const qrCodeContainer = document.getElementById('clients-booking-form-qrcode');
            if (qrCodeContainer && typeof (window as any).QRCode !== 'undefined') {
                qrCodeContainer.innerHTML = '';
                new (window as any).QRCode(qrCodeContainer, {
                    text: bookingFormUrl,
                    width: 200,
                    height: 200,
                    colorDark: "#020617",
                    colorLight: "#ffffff",
                    correctLevel: 2 // H
                });
            }
        }
    }, [qrModalContent, isBookingFormShareModalOpen, bookingFormUrl]);

    const handleOpenQrModal = (client: Client) => {
        const path = window.location.pathname.replace(/index\.html$/, '');
        const url = `${window.location.origin}${path}#/portal/${client.portalAccessId}`;
        setQrModalContent({ title: `Portal QR Code untuk ${client.name}`, url });
    };

    const copyBookingLinkToClipboard = () => {
        navigator.clipboard.writeText(bookingFormUrl).then(() => {
            showNotification('Tautan formulir booking berhasil disalin!');
            setIsBookingFormShareModalOpen(false);
        });
    };
    
    const downloadBookingQrCode = () => {
        const canvas = document.querySelector('#clients-booking-form-qrcode canvas') as HTMLCanvasElement;
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'form-booking-qr.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    const handleOpenModal = (mode: 'add' | 'edit', client?: Client, project?: Project) => {
        setModalMode(mode);
        if (mode === 'edit' && client) {
            setSelectedClient(client);
            if (project) {
                setSelectedProject(project);
                setFormData({
                    clientId: client.id,
                    clientName: client.name,
                    email: client.email,
                    phone: client.phone,
                    whatsapp: client.whatsapp || '',
                    instagram: client.instagram || '',
                    clientType: client.clientType,
                    projectId: project.id,
                    projectName: project.projectName,
                    projectType: project.projectType,
                    location: project.location,
                    date: project.date,
                    packageId: project.packageId,
                    selectedAddOnIds: project.addOns.map(a => a.id),
                    durationSelection: (project as any).durationSelection || '',
                    unitPrice: (project as any).unitPrice,
                    dp: '', // Not editing DP here, handle in payment
                    dpDestinationCardId: '',
                    notes: project.notes || '',
                    accommodation: project.accommodation || '',
                    driveLink: project.driveLink || '',
                    promoCodeId: project.promoCodeId || '',
                });
            } else {
                // Edit client only (no project yet)
                setSelectedProject(null);
                setFormData({ 
                    ...initialFormState, 
                    clientId: client.id, 
                    clientName: client.name, 
                    email: client.email, 
                    phone: client.phone, 
                    whatsapp: client.whatsapp || '', 
                    instagram: client.instagram || '', 
                    clientType: client.clientType,
                    projectType: userProfile.projectTypes[0] || ''
                });
            }
        } else if (mode === 'add' && client) { // Adding new project for existing client
             setSelectedClient(client);
             setFormData({ ...initialFormState, clientId: client.id, clientName: client.name, email: client.email, phone: client.phone, whatsapp: client.whatsapp || '', instagram: client.instagram || '', clientType: client.clientType });
        } else { // Adding new client
            setSelectedClient(null);
            setSelectedProject(null);
            setFormData({...initialFormState, projectType: userProfile.projectTypes[0] || ''});
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setDocumentToView(null);
        setIsSignatureModalOpen(false);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { id, checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, selectedAddOnIds: checked ? [...prev.selectedAddOnIds, id] : prev.selectedAddOnIds.filter(addOnId => addOnId !== id) }));
        } else {
                setFormData(prev => {
                    // If package changed, attempt to apply default duration option
                    if (name === 'packageId') {
                        const pkg = packages.find(p => p.id === value);
                        if (pkg && Array.isArray(pkg.durationOptions) && pkg.durationOptions.length > 0) {
                            const defaultOpt = pkg.durationOptions.find(o => o.default) || pkg.durationOptions[0];
                            return { ...prev, [name]: value, durationSelection: defaultOpt.label, unitPrice: Number(defaultOpt.price) };
                        }
                        // no durationOptions
                        return { ...prev, [name]: value, durationSelection: '', unitPrice: pkg ? pkg.price : undefined };
                    }

                    // If durationSelection changed, compute unitPrice from selected package
                    if (name === 'durationSelection') {
                        const pkg = packages.find(p => p.id === prev.packageId);
                        if (pkg && Array.isArray(pkg.durationOptions)) {
                            const opt = pkg.durationOptions.find(o => o.label === value);
                            if (opt) return { ...prev, durationSelection: value, unitPrice: Number(opt.price) };
                        }
                        return { ...prev, durationSelection: value };
                    }

                    return { ...prev, [name]: value };
                });
        }
    };
    
    const allClientData = useMemo(() => {
        return clients.map(client => {
            const clientProjects = projects.filter(p => p.clientId === client.id);
            const totalValue = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
            const totalPaid = clientProjects.reduce((sum, p) => sum + p.amountPaid, 0);
            
            const mostRecentProject = clientProjects.length > 0
                ? [...clientProjects].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                : null;
    
            return {
                ...client,
                projects: clientProjects,
                totalProyekValue: totalValue,
                balanceDue: totalValue - totalPaid,
                paketTerbaru: mostRecentProject ? `${mostRecentProject.packageName}${mostRecentProject.addOns.length > 0 ? ` + ${mostRecentProject.addOns.length} Add-on` : ''}` : 'Belum ada proyek',
                overallPaymentStatus: mostRecentProject ? mostRecentProject.paymentStatus : null,
                mostRecentProject: mostRecentProject,
            };
        });
    }, [clients, projects]);

    const clientsWithDues = useMemo(() => {
        return allClientData
            .filter(client => client.balanceDue > 0)
            .sort((a, b) => b.balanceDue - a.balanceDue);
    }, [allClientData]);

    const clientStats = useMemo(() => {
        const locationCounts = projects.reduce((acc, p) => {
            if (p.location) {
                const mainLocation = p.location.split(',')[0].trim();
                acc[mainLocation] = (acc[mainLocation] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const mostFrequentLocation = Object.keys(locationCounts).length > 0 
            ? Object.keys(locationCounts).reduce((a, b) => locationCounts[a] > locationCounts[b] ? a : b)
            : 'N/A';
        
        const totalReceivables = allClientData.reduce((sum, c) => sum + c.balanceDue, 0);

        return {
            activeClients: clients.filter(c => c.status === ClientStatus.ACTIVE).length,
            mostFrequentLocation,
            totalReceivables: formatCurrency(totalReceivables),
            totalClients: clients.length
        };
    }, [clients, projects, allClientData]);

    const filteredClientData = useMemo(() => {
        return allClientData.filter(client => {
            const searchMatch = searchTerm === '' ||
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
            const statusMatch = statusFilter === 'Semua Status' || client.overallPaymentStatus === statusFilter;
    
            const from = dateFrom ? new Date(dateFrom) : null;
            const to = dateTo ? new Date(dateTo) : null;
            if (from) from.setHours(0, 0, 0, 0);
            if (to) to.setHours(23, 59, 59, 999);
            const dateMatch = (!from && !to) || client.projects.some(p => {
                const projectDate = new Date(p.date);
                return (!from || projectDate >= from) && (!to || projectDate <= to);
            });
    
            return searchMatch && statusMatch && dateMatch;
        });
    }, [allClientData, searchTerm, statusFilter, dateFrom, dateTo]);

    const clientStatusDonutData = useMemo(() => {
        const statusCounts = clients.reduce((acc, client) => {
            acc[client.status] = (acc[client.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    
        const statusColors: { [key in ClientStatus]?: string } = {
            [ClientStatus.ACTIVE]: '#10b981',
            [ClientStatus.INACTIVE]: '#64748b',
            [ClientStatus.LEAD]: '#3b82f6',
            [ClientStatus.LOST]: '#ef4444',
        };
        
        return Object.entries(statusCounts).map(([label, value]) => ({
            label,
            value,
            color: statusColors[label as ClientStatus] || '#9ca3af'
        }));
    }, [clients]);

    const newClientsChartData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const data = months.map(month => ({ name: month, count: 0 }));
    
        clients.forEach(c => {
            const joinDate = new Date(c.since);
            if (joinDate.getFullYear() === currentYear) {
                const monthIndex = joinDate.getMonth();
                data[monthIndex].count += 1;
            }
        });
        return data;
    }, [clients]);
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        if (!selectedPackage) {
            alert('Harap pilih paket layanan.');
            return;
        }

    const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
    // Use unitPrice chosen in form (duration-based) when provided, otherwise fallback to package price
    const packagePriceChosen = formData.unitPrice !== undefined && !isNaN(Number(formData.unitPrice)) ? Number(formData.unitPrice) : (selectedPackage.price || 0);
    const totalBeforeDiscount = packagePriceChosen + selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
        let finalDiscountAmount = 0;
        const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);
        if (promoCode) {
            if (promoCode.discountType === 'percentage') {
                finalDiscountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100;
            } else {
                finalDiscountAmount = promoCode.discountValue;
            }
        }
        const totalProject = totalBeforeDiscount - finalDiscountAmount;

        if (modalMode === 'add') {
             let clientId = selectedClient?.id;
             if (!selectedClient) { // New client
                try {
                    const created = await createClientRow({
                        name: formData.clientName,
                        email: formData.email,
                        phone: formData.phone,
                        whatsapp: formData.whatsapp || formData.phone,
                        instagram: formData.instagram || undefined,
                        clientType: formData.clientType,
                        since: new Date().toISOString().split('T')[0],
                        status: ClientStatus.ACTIVE,
                        lastContact: new Date().toISOString(),
                        portalAccessId: crypto.randomUUID(),
                    } as Omit<Client, 'id'>);
                    clientId = created.id;
                    setClients(prev => [created, ...prev]);
                } catch (err) {
                    alert('Gagal menyimpan klien ke database. Coba lagi.');
                    return;
                }
             }
             
            const dpAmount = Number(formData.dp) || 0;
            const remainingPayment = totalProject - dpAmount;

            // Create project in Supabase
            try {
                const createdProject = await createProjectRow({
                    projectName: formData.projectName,
                    clientName: formData.clientName,
                    clientId: clientId!,
                    projectType: formData.projectType,
                    packageName: selectedPackage.name,
                    date: formData.date,
                    location: formData.location,
                    status: 'Dikonfirmasi',
                    totalCost: totalProject,
                    amountPaid: dpAmount,
                    paymentStatus: dpAmount > 0 ? (remainingPayment <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR) : PaymentStatus.BELUM_BAYAR,
                    // persist chosen duration and unit price if present
                    durationSelection: formData.durationSelection || undefined,
                    unitPrice: formData.unitPrice !== undefined ? Number(formData.unitPrice) : undefined,
                    notes: formData.notes || undefined,
                    accommodation: formData.accommodation || undefined,
                    driveLink: formData.driveLink || undefined,
                    promoCodeId: formData.promoCodeId || undefined,
                    discountAmount: finalDiscountAmount > 0 ? finalDiscountAmount : undefined,
                    printingCost: undefined,
                    transportCost: undefined,
                    completedDigitalItems: [],
                    addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
                });
                // enrich with addOns in local state
                const mergedProject: Project = { ...createdProject, addOns: selectedAddOns };
                setProjects(prev => [mergedProject, ...prev]);

                // Create DP transaction (persist to Supabase) if any
                if (mergedProject.amountPaid > 0) {
                    // Resolve Supabase card UUID from local selection
                    const selectedCard = cards.find(c => c.id === formData.dpDestinationCardId);
                    const supaCardId = selectedCard
                      ? await findCardIdByMeta(selectedCard.bankName, selectedCard.lastFourDigits)
                      : null;
                    try {
                        const createdTx = await createTransactionRow({
                            date: new Date().toISOString().split('T')[0],
                            description: `DP Proyek ${mergedProject.projectName}`,
                            amount: mergedProject.amountPaid,
                            type: TransactionType.INCOME,
                            projectId: mergedProject.id,
                            category: 'DP Proyek',
                            method: 'Transfer Bank',
                            cardId: supaCardId || undefined,
                        } as Omit<Transaction, 'id' | 'vendorSignature'>);
                        setTransactions(prev => [...prev, createdTx].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                        if (supaCardId) {
                            await updateCardBalance(supaCardId, mergedProject.amountPaid);
                            if (formData.dpDestinationCardId) {
                                setCards(prev => prev.map(c => c.id === formData.dpDestinationCardId ? { ...c, balance: c.balance + mergedProject.amountPaid } : c));
                            }
                        }
                    } catch (err) {
                        console.warn('[Supabase] Gagal mencatat transaksi DP, gunakan fallback lokal.', err);
                        const newTransaction: Transaction = {
                            id: `TRN-DP-${mergedProject.id}`,
                            date: new Date().toISOString().split('T')[0],
                            description: `DP Proyek ${mergedProject.projectName}`,
                            amount: mergedProject.amountPaid,
                            type: TransactionType.INCOME,
                            projectId: mergedProject.id,
                            category: 'DP Proyek',
                            method: 'Transfer Bank',
                            cardId: formData.dpDestinationCardId,
                        };
                        setTransactions(prev => [...prev, newTransaction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                        setCards(prev => prev.map(c => c.id === formData.dpDestinationCardId ? { ...c, balance: c.balance + mergedProject.amountPaid } : c));
                    }
                }
            } catch (err) {
                alert('Gagal membuat proyek di database. Coba lagi.');
                return;
            }

            // promo usage increment remains local for now
             if (promoCode) {
                setPromoCodes(prev => prev.map(p => p.id === promoCode.id ? { ...p, usageCount: p.usageCount + 1 } : p));
            }
            showNotification(`Klien ${formData.clientName} dan proyek baru berhasil ditambahkan.`);
            // Close modal and reset form after successful save
            handleCloseModal();
            setFormData(initialFormState);
            setSelectedClient(null);
            setSelectedProject(null);
        } else if (modalMode === 'edit') {
            if (!selectedClient || !selectedProject) {
                alert('Data klien/proyek tidak ditemukan untuk mode edit.');
                return;
            }

            // Update Client first (if any changes)
            try {
                const updatedClient = await updateClientRow(selectedClient.id, {
                    name: formData.clientName,
                    email: formData.email,
                    phone: formData.phone,
                    whatsapp: formData.whatsapp || undefined,
                    instagram: formData.instagram || undefined,
                    clientType: formData.clientType,
                    lastContact: new Date().toISOString(),
                });
                setClients(prev => prev.map(c => (c.id === updatedClient.id ? updatedClient : c)));
            } catch (err) {
                console.warn('Gagal update data klien:', err);
                alert('Gagal mengupdate data klien. Coba lagi.');
                return;
            }

            // Recalculate project totals and update project
            const selectedPackage = packages.find(p => p.id === formData.packageId);
            if (!selectedPackage) {
                alert('Harap pilih paket layanan.');
                return;
            }
            const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
            const packagePriceChosen = formData.unitPrice !== undefined && !isNaN(Number(formData.unitPrice)) ? Number(formData.unitPrice) : (selectedPackage.price || 0);
            const totalBeforeDiscount = packagePriceChosen + selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
            let finalDiscountAmount = 0;
            const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);
            if (promoCode) {
                if (promoCode.discountType === 'percentage') {
                    finalDiscountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100;
                } else {
                    finalDiscountAmount = promoCode.discountValue;
                }
            }
            const totalProject = totalBeforeDiscount - finalDiscountAmount;

            const newAmountPaid = selectedProject.amountPaid; // DP tidak diedit di form ini
            let newPaymentStatus: PaymentStatus = PaymentStatus.BELUM_BAYAR;
            if (newAmountPaid <= 0) newPaymentStatus = PaymentStatus.BELUM_BAYAR;
            else if (newAmountPaid >= totalProject) newPaymentStatus = PaymentStatus.LUNAS;
            else newPaymentStatus = PaymentStatus.DP_TERBAYAR;

            try {
                const updatedProject = await updateProjectRow(selectedProject.id, {
                    projectName: formData.projectName,
                    clientName: formData.clientName,
                    clientId: selectedClient.id,
                    projectType: formData.projectType,
                    packageName: selectedPackage.name,
                    date: formData.date,
                    location: formData.location,
                    status: selectedProject.status,
                    totalCost: totalProject,
                    amountPaid: newAmountPaid,
                    paymentStatus: newPaymentStatus,
                    // persist chosen duration/unit when editing
                    durationSelection: formData.durationSelection || undefined,
                    unitPrice: formData.unitPrice !== undefined ? Number(formData.unitPrice) : undefined,
                    notes: formData.notes || undefined,
                    accommodation: formData.accommodation || undefined,
                    driveLink: formData.driveLink || undefined,
                    promoCodeId: formData.promoCodeId || undefined,
                    discountAmount: finalDiscountAmount > 0 ? finalDiscountAmount : undefined,
                    addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
                });

                // merge addOns into local state copy
                const merged: Project = { ...updatedProject, addOns: selectedAddOns } as Project;
                setProjects(prev => prev.map(p => (p.id === merged.id ? merged : p)));
            } catch (err) {
                console.warn('Gagal update proyek:', err);
                alert('Gagal mengupdate proyek. Coba lagi.');
                return;
            }

            showNotification(`Data klien dan proyek berhasil diperbarui.`);
            // Close and reset
            handleCloseModal();
            setFormData(initialFormState);
            setSelectedClient(null);
            setSelectedProject(null);
        }
    };

    const handleDownloadClients = () => {
        const headers = ['Nama', 'Email', 'Telepon', 'Status', 'Total Nilai Proyek', 'Sisa Tagihan', 'Paket Terbaru'];
        const data = filteredClientData.map(client => [
            `"${client.name.replace(/"/g, '""')}"`,
            client.email,
            client.phone,
            client.status,
            client.totalProyekValue,
            client.balanceDue,
            client.paketTerbaru
        ]);
        downloadCSV(headers, data, `data-klien-${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleDeleteClient = async (clientId: string) => {
        if (!window.confirm('Menghapus klien akan menghapus semua proyek dan transaksi terkait. Apakah Anda yakin?')) return;
        try {
            await deleteClientRow(clientId);
            setClients(prev => prev.filter(c => c.id !== clientId));
            const projectsToDelete = projects.filter(p => p.clientId === clientId).map(p => p.id);
            setProjects(prev => prev.filter(p => p.clientId !== clientId));
            setTransactions(prev => prev.filter(t => !projectsToDelete.includes(t.projectId || '')));
            setIsDetailModalOpen(false);
            showNotification('Klien berhasil dihapus.');
        } catch (err) {
            alert('Gagal menghapus klien di database. Coba lagi.');
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!window.confirm('Hapus proyek ini? Semua transaksi terkait akan tetap ada, tetapi tidak lagi terhubung ke proyek. Lanjutkan?')) return;
        try {
            await deleteProjectRow(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
            setTransactions(prev => prev.map(t => (t.projectId === projectId ? { ...t, projectId: undefined } : t)));
            showNotification('Proyek berhasil dihapus.');
        } catch (err) {
            alert('Gagal menghapus proyek di database. Coba lagi.');
        }
    };

    // --- Record payment handler (persist to Supabase, then sync local state) ---
    const handleRecordPayment = async (projectId: string, amount: number, destinationCardId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        try {
            const selectedCard = cards.find(c => c.id === destinationCardId);
            const supaCardId = selectedCard ? await findCardIdByMeta(selectedCard.bankName, selectedCard.lastFourDigits) : null;
            const createdTx = await createTransactionRow({
                date: new Date().toISOString().split('T')[0],
                description: `Pembayaran Proyek ${project.projectName}`,
                amount,
                type: TransactionType.INCOME,
                projectId: project.id,
                category: 'Pelunasan Proyek',
                method: 'Transfer Bank',
                cardId: supaCardId || undefined,
            } as Omit<Transaction, 'id' | 'vendorSignature'>);
            setTransactions(prev => [...prev, createdTx].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            if (supaCardId) {
                await updateCardBalance(supaCardId, amount);
                if (destinationCardId) {
                    setCards(prev => prev.map(c => c.id === destinationCardId ? { ...c, balance: c.balance + amount } : c));
                }
            }
        } catch (err) {
            console.warn('[Supabase] Gagal mencatat pembayaran, fallback lokal.', err);
            const newTransaction: Transaction = {
                id: `TRN-PAY-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                description: `Pembayaran Proyek ${project.projectName}`,
                amount,
                type: TransactionType.INCOME,
                projectId: project.id,
                category: 'Pelunasan Proyek',
                method: 'Transfer Bank',
                cardId: destinationCardId,
            };
            setTransactions(prev => [...prev, newTransaction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setCards(prev => prev.map(c => c.id === destinationCardId ? { ...c, balance: c.balance + amount } : c));
        }

        // Persist updated amountPaid and paymentStatus to Supabase, then sync local state
        try {
            const currentProject = projects.find(p => p.id === project.id);
            if (currentProject) {
                const newAmountPaid = currentProject.amountPaid + amount;
                const remaining = currentProject.totalCost - newAmountPaid;
                const updated = await updateProjectRow(project.id, {
                    amountPaid: newAmountPaid,
                    paymentStatus: remaining <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR,
                });
                setProjects(prev => prev.map(p => (p.id === updated.id ? { ...p, amountPaid: updated.amountPaid, paymentStatus: updated.paymentStatus } : p)));
            }
        } catch (err) {
            // Fallback: update local state to keep UI responsive even if persistence fails
            setProjects(prev => prev.map(p => {
                if (p.id === project.id) {
                    const newAmountPaid = p.amountPaid + amount;
                    const remaining = p.totalCost - newAmountPaid;
                    return {
                        ...p,
                        amountPaid: newAmountPaid,
                        paymentStatus: remaining <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR
                    };
                }
                return p;
            }));
        }

        showNotification('Pembayaran berhasil dicatat.');
        addNotification({
            title: 'Pembayaran Diterima',
            message: `Pembayaran sebesar ${formatCurrency(amount)} untuk proyek "${project.projectName}" telah diterima.`,
            icon: 'payment',
            link: {
                view: ViewType.CLIENTS,
                action: { type: 'VIEW_CLIENT_DETAILS', id: project.clientId }
            }
        });
    };
    
    const handleSaveSignature = (signatureDataUrl: string) => {
        if (documentToView?.type === 'invoice' && documentToView.project) {
            onSignInvoice(documentToView.project.id, signatureDataUrl);
        } else if (documentToView?.type === 'receipt' && documentToView.transaction) {
            onSignTransaction(documentToView.transaction.id, signatureDataUrl);
        }
        setIsSignatureModalOpen(false);
    };

    const renderDocumentBody = () => {
        if (!documentToView || !clientForDetail) return null;
        const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        
        if (documentToView.type === 'invoice') {
            const project = documentToView.project;
            const selectedPackage = packages.find(p => p.id === project.packageId);
            const subtotal = project.totalCost + (project.discountAmount || 0);
            const remaining = project.totalCost - project.amountPaid;

            // Original package name - no cleaning
            const originalPackageName = selectedPackage?.name || project.packageName;
            
            // Calculate displayedUnitPrice with better fallback logic
            let displayedUnitPrice = 0;
            if ((project as any).unitPrice !== undefined && (project as any).unitPrice !== null && Number((project as any).unitPrice) > 0) {
                displayedUnitPrice = Number((project as any).unitPrice);
            } else if (selectedPackage) {
                // If duration selection exists, try to find the price from duration options
                const durationSelection = (project as any).durationSelection;
                if (durationSelection && selectedPackage.durationOptions && selectedPackage.durationOptions.length > 0) {
                    const durationOption = selectedPackage.durationOptions.find(opt => opt.label === durationSelection);
                    displayedUnitPrice = durationOption ? Number(durationOption.price) : Number(selectedPackage.price);
                } else {
                    displayedUnitPrice = Number(selectedPackage.price);
                }
            } else {
                // Fallback: calculate from total cost minus addons and transport
                const addOnsTotal = (project.addOns || []).reduce((sum, addon) => sum + (addon.price || 0), 0);
                const transportCost = Number(project.transportCost || 0);
                displayedUnitPrice = Math.max(0, subtotal - addOnsTotal - transportCost);
            }
            
            const displayedDurationLabel = (project as any).durationSelection || undefined;

            // Original add-on names - no cleaning, show all duplicates as they are
            const originalAddOns = project.addOns || [];

            // Generate proper invoice number
            const invoiceNumber = project.id ? `INV-${project.id.slice(-6)}` : 'INV-XXXXXX';

            return (
                <div id="invoice-content" className="p-1">
                    <div className="printable-content print-invoice bg-slate-50 font-sans text-slate-800 printable-area">
                        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-lg">
                            <header className="flex justify-between items-start mb-12">
                                <div>
                                    {userProfile.logoBase64 ? (
                                        <img src={userProfile.logoBase64} alt="Company Logo" className="h-20 max-w-[200px] object-contain mb-4" />
                                    ) : (
                                        <h1 className="text-3xl font-extrabold text-slate-900">{userProfile.companyName}</h1>
                                    )}
                                    <p className="text-sm text-slate-500">{userProfile.address}</p>
                                    <p className="text-sm text-slate-500">{userProfile.phone} | {userProfile.email}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-2xl font-bold uppercase text-slate-400 tracking-widest">Invoice</h2>
                                    <p className="text-sm text-slate-500 mt-1">No: <span className="font-semibold text-slate-700">{invoiceNumber}</span></p>
                                    <p className="text-sm text-slate-500">Tanggal: <span className="font-semibold text-slate-700">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></p>
                                </div>
                            </header>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 doc-header-grid">
                                <div className="bg-slate-50 p-6 rounded-xl"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Ditagihkan Kepada</h3><p className="font-bold text-slate-800 break-words">{clientForDetail.name}</p><p className="text-sm text-slate-600 break-words">{clientForDetail.email}</p><p className="text-sm text-slate-600 break-words">{clientForDetail.phone}</p></div>
                                <div className="bg-slate-50 p-6 rounded-xl"><h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Diterbitkan Oleh</h3><p className="font-bold text-slate-800 break-words">{userProfile.companyName}</p><p className="text-sm text-slate-600 break-words">{userProfile.email}</p><p className="text-sm text-slate-600 break-words">{userProfile.phone}</p></div>
                            </section>

                            <section className="mb-12">
                                <div className="bg-blue-600 text-white p-6 rounded-xl printable-bg-blue printable-text-white"><h3 className="text-xs font-semibold uppercase text-blue-200 mb-2">Sisa Tagihan</h3><p className="font-extrabold text-2xl lg:text-3xl tracking-tight break-all">{formatCurrency(remaining)}</p><p className="text-sm text-blue-200 mt-1">Jatuh Tempo: {new Date(project.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                            </section>

                            <section><table className="w-full text-left responsive-table invoice-table">
                                <thead className="invoice-table-header">
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="p-3 text-sm font-semibold uppercase text-slate-500 text-left" data-label="Deskripsi">Deskripsi</th>
                                        <th className="p-3 text-sm font-semibold uppercase text-slate-500 text-center min-w-[50px]" data-label="Jml">Jml</th>
                                        <th className="p-3 text-sm font-semibold uppercase text-slate-500 text-right min-w-[90px]" data-label="Harga">Harga Satuan</th>
                                        <th className="p-3 text-sm font-semibold uppercase text-slate-500 text-right min-w-[90px]" data-label="Total">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="invoice-table-body">
                                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                                        <td data-label="Deskripsi" className="p-3 align-top">
                                            <div className="invoice-item-description">
                                                <p className="font-semibold text-slate-800 text-sm leading-relaxed">{originalPackageName}</p>
                                                {selectedPackage?.digitalItems && selectedPackage.digitalItems.length > 0 && (
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                        {selectedPackage.digitalItems.join(', ')}
                                                    </p>
                                                )}
                                                {displayedDurationLabel && (
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Durasi: {displayedDurationLabel}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Jml" className="p-3 text-center align-top">
                                            <span className="font-semibold text-slate-700">1</span>
                                        </td>
                                        <td data-label="Harga" className="p-3 text-right align-top">
                                            <span className="font-semibold text-slate-700 tabular-nums">
                                                {formatCurrency(displayedUnitPrice)}
                                            </span>
                                        </td>
                                        <td data-label="Total" className="p-3 text-right align-top">
                                            <span className="font-bold text-slate-800 tabular-nums">
                                                {formatCurrency(displayedUnitPrice)}
                                            </span>
                                        </td>
                                    </tr>
                                    {originalAddOns.filter(addon => addon.name && addon.name.trim()).map((addon, index) => (
                                        <tr key={addon.id || index} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td data-label="Deskripsi" className="p-3 align-top">
                                                <div className="invoice-item-description">
                                                    <p className="text-slate-600 text-sm leading-relaxed">
                                                        - {addon.name}
                                                    </p>
                                                </div>
                                            </td>
                                            <td data-label="Jml" className="p-3 text-center align-top">
                                                <span className="text-slate-600">1</span>
                                            </td>
                                            <td data-label="Harga" className="p-3 text-right align-top">
                                                <span className="text-slate-600 tabular-nums">
                                                    {formatCurrency(addon.price)}
                                                </span>
                                            </td>
                                            <td data-label="Total" className="p-3 text-right align-top">
                                                <span className="font-semibold text-slate-700 tabular-nums">
                                                    {formatCurrency(addon.price)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></section>

                            <section className="mt-12 avoid-break totals-section">
                                <div className="flex flex-col-reverse sm:flex-row justify-between gap-8 doc-footer-flex">
                                    <div className="w-full sm:w-2/5 invoice-signature-section">
                                        <h4 className="font-semibold text-slate-600 mb-3">Tanda Tangan</h4>
                                        {project.invoiceSignature ? (
                                            <img src={project.invoiceSignature} alt="Tanda Tangan" className="h-20 mt-2 object-contain border-b border-slate-300" />
                                        ) : (
                                            <div className="h-20 mt-2 flex items-center justify-center text-xs text-slate-400 italic border border-dashed border-slate-300 rounded-lg">
                                                Belum Ditandatangani
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-full sm:w-2/5 space-y-3 text-sm invoice-totals">
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
                                        <div className="flex justify-between items-center py-2 mt-3 pt-3 border-t-2 border-slate-300">
                                            <span className="font-bold text-lg text-slate-900">Sisa Tagihan</span>
                                            <span className="font-bold text-lg text-slate-900 tabular-nums">
                                                {formatCurrency(remaining)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <footer className="mt-12 pt-8 border-t-2 border-slate-200 avoid-break signature-section">
                                {userProfile.termsAndConditions && (
                                    <div className="mb-8">
                                        <h4 className="font-semibold text-slate-600 mb-2">Syarat & Ketentuan</h4>
                                        <p className="text-xs text-slate-500 whitespace-pre-wrap">{userProfile.termsAndConditions.replace(/📜|💰|⏱|📦/g, '').replace(/\s*\*\*(.*?)\*\*\s*/g, '\n<strong>$1</strong>\n')}</p>
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 text-center">Jika Anda memiliki pertanyaan, silakan hubungi kami di {userProfile.phone}</p>
                                <div className="w-full h-2 bg-blue-600 mt-6 rounded"></div>
                            </footer>
                        </div>
                    </div>
                </div>
            );
        } else if (documentToView.type === 'receipt') {
            const transaction = documentToView.transaction;
            const project = transaction.projectId ? projects.find(p => p.id === transaction.projectId) : null;
            return (
                <div id="receipt-content" className="p-1">
                     <div className="printable-content print-receipt bg-slate-50 font-sans text-slate-800 printable-area avoid-break">
                        <div className="max-w-md mx-auto bg-white p-8 shadow-lg rounded-xl">
                            <header className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-slate-900">KWITANSI PEMBAYARAN</h1>
                                <p className="text-sm text-slate-500">{userProfile.companyName}</p>
                            </header>
                            <div className="p-4 bg-green-500/10 border border-green-200 rounded-lg text-center mb-8 printable-bg-green-light">
                                <p className="text-sm font-semibold text-green-700 print-text-green">PEMBAYARAN DITERIMA</p>
                                <p className="text-3xl font-bold text-green-800 print-text-green mt-1">{formatCurrency(transaction.amount)}</p>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">No. Kwitansi</span><span className="font-semibold text-slate-700 font-mono">{transaction.id.slice(0,12)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Tanggal Bayar</span><span className="font-semibold text-slate-700">{formatDate(transaction.date)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Diterima dari</span><span className="font-semibold text-slate-700">{clientForDetail.name}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Metode</span><span className="font-semibold text-slate-700">{transaction.method}</span></div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <p className="text-sm text-slate-500">Untuk pembayaran:</p>
                                <p className="font-semibold text-slate-800 mt-1">{transaction.description}</p>
                                {project && (
                                    <div className="mt-2 text-xs text-slate-500">
                                        <p>Proyek: {project.projectName}</p>
                                        <p>Total Tagihan: {formatCurrency(project.totalCost)} | Sisa: {formatCurrency(project.totalCost - project.amountPaid)}</p>
                                    </div>
                                )}
                            </div>
                            <footer className="mt-12 flex justify-between items-end avoid-break signature-section">
                                <p className="text-xs text-slate-400">Terima kasih.</p>
                                <div className="text-center">
                                    {transaction.vendorSignature ? (
                                        <img src={transaction.vendorSignature} alt="Tanda Tangan" className="h-16 object-contain" />
                                    ) : (
                                        <div className="h-16 flex items-center justify-center text-xs text-slate-400 italic border-b border-dashed">Belum Ditandatangani</div>
                                    )}
                                    <p className="text-xs font-semibold text-slate-600 mt-1">({userProfile.authorizedSigner || userProfile.companyName})</p>
                                </div>
                            </footer>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };
    
    return (
        <div className="space-y-6">
            <PageHeader title="Klien Pengantin" subtitle="Kelola semua klien, proyek, dan pembayaran mereka.">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary">Pelajari Halaman Ini</button>
                    <button onClick={() => setIsBookingFormShareModalOpen(true)} className="button-secondary inline-flex items-center gap-2">
                        <Share2Icon className="w-4 h-4" /> Bagikan Form Booking
                    </button>
                    <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/> Tambah Klien & Proyek
                    </button>
                </div>
            </PageHeader>
    
            <div className="grid grid-cols-2 gap-6">
                <div className="transition-transform duration-200 hover:scale-105">
                    <StatCard 
                        icon={<UsersIcon className="w-6 h-6"/>} 
                        title="Total Klien" 
                        value={clientStats.totalClients.toString()} 
                        subtitle="Semua klien terdaftar" 
                        colorVariant="blue"
                        description={`Total klien yang terdaftar dalam sistem Anda.\n\nTotal: ${clientStats.totalClients} klien\n\nKlien adalah aset berharga bisnis Anda. Jaga hubungan baik untuk repeat business dan referral.`}
                        onClick={() => setActiveStatModal('total')}
                    />
                </div>
                <div className="transition-transform duration-200 hover:scale-105">
                    <StatCard 
                        icon={<TrendingUpIcon className="w-6 h-6"/>} 
                        title="Klien Aktif" 
                        value={clientStats.activeClients.toString()} 
                        subtitle="Klien dengan proyek berjalan" 
                        colorVariant="green"
                        description={`Klien yang memiliki proyek aktif saat ini.\n\nAktif: ${clientStats.activeClients} klien\n\nFokus pada klien aktif untuk memastikan kepuasan dan penyelesaian proyek tepat waktu.`}
                        onClick={() => setActiveStatModal('active')}
                    />
                </div>
                <div className="transition-transform duration-200 hover:scale-105">
                    <StatCard 
                        icon={<AlertCircleIcon className="w-6 h-6"/>} 
                        title="Total Piutang" 
                        value={clientStats.totalReceivables} 
                        subtitle="Tagihan belum terbayar" 
                        colorVariant="orange"
                        description={`Total piutang dari semua klien yang belum dibayar.\n\nPiutang: ${clientStats.totalReceivables}\n\nSegera tagih untuk menjaga cash flow bisnis Anda.`}
                        onClick={() => setActiveStatModal('receivables')}
                    />
                </div>
                <div className="transition-transform duration-200 hover:scale-105">
                    <StatCard 
                        icon={<MapPinIcon className="w-6 h-6"/>} 
                        title="Lokasi Teratas" 
                        value={clientStats.mostFrequentLocation} 
                        subtitle="Lokasi paling sering dipilih" 
                        colorVariant="purple"
                        description={`Lokasi yang paling sering dipilih oleh klien Anda.\n\nTeratas: ${clientStats.mostFrequentLocation}\n\nInformasi ini membantu Anda memahami area market utama.`}
                        onClick={() => setActiveStatModal('location')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                <div className="lg:col-span-2 bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h3 className="font-bold text-lg text-gradient mb-4">Distribusi Status Klien</h3>
                    <DonutChart data={clientStatusDonutData} />
                </div>
                <div className="lg:col-span-3">
                    <NewClientsChart data={newClientsChartData} />
                </div>
            </div>

            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-4 border-b border-brand-border">
                    <h3 className="font-semibold text-brand-text-light">Rekap Klien Belum Lunas ({clientsWithDues.length})</h3>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden p-4 space-y-3">
                    {clientsWithDues.map(client => (
                        <div key={client.id} className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-brand-text-light leading-tight">{client.name}</p>
                                    <p className="text-[11px] text-brand-text-secondary">{client.email}</p>
                                </div>
                                <button 
                                    onClick={() => setBillingChatModal(client)}
                                    className="button-secondary !text-xs !px-3 !py-2"
                                >Tagih</button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-brand-text-secondary">Total Nilai</span>
                                <span className="text-right">{formatCurrency(client.totalProyekValue)}</span>
                                <span className="text-brand-text-secondary">Sisa Tagihan</span>
                                <span className="text-right font-bold text-brand-danger">{formatCurrency(client.balanceDue)}</span>
                                <span className="text-brand-text-secondary">Proyek Terbaru</span>
                                <span className="text-right">{client.mostRecentProject?.projectName || '-'}</span>
                            </div>
                        </div>
                    ))}
                    {clientsWithDues.length === 0 && (
                        <p className="text-center py-8 text-brand-text-secondary">Luar biasa! Semua klien sudah lunas.</p>
                    )}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium tracking-wider">Klien</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right">Total Nilai Proyek</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right">Sisa Tagihan</th>
                                <th className="px-6 py-4 font-medium tracking-wider">Proyek Terbaru</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {clientsWithDues.map(client => (
                                <tr key={client.id} className="hover:bg-brand-bg transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-brand-text-light">{client.name}</p>
                                        <p className="text-xs text-brand-text-secondary">{client.email}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(client.totalProyekValue)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-brand-danger">{formatCurrency(client.balanceDue)}</td>
                                    <td className="px-6 py-4">{client.mostRecentProject?.projectName || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setBillingChatModal(client)}
                                            className="p-2 text-brand-text-secondary hover:text-brand-accent rounded-full hover:bg-brand-input"
                                            title="Tagih via WhatsApp"
                                        >
                                            <MessageSquareIcon className="w-5 h-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {clientsWithDues.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-brand-text-secondary">
                                        Luar biasa! Semua klien sudah lunas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
    
            <div className="bg-brand-surface p-4 rounded-xl shadow-lg border border-brand-border flex flex-col md:flex-row justify-between items-center gap-4 mobile-filter-section">
                <div className="input-group flex-grow !mt-0 w-full md:w-auto">
                    <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5" placeholder=" " />
                    <label className="input-label">Cari klien (nama, email, telepon)...</label>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto search-filter-row">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full">
                        <option value="Semua Status">Semua Status</option>
                        {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={handleDownloadClients} className="button-secondary p-2.5 flex-shrink-0" title="Unduh data klien"><DownloadIcon className="w-5 h-5"/></button>
                </div>
            </div>
    
            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-3 md:p-4 border-b border-brand-border">
                    <button onClick={() => setActiveSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                        <h3 className="text-sm md:text-base font-semibold text-brand-text-light">Klien Aktif ({filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).length})</h3>
                        {activeSectionOpen ? <ArrowUpIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary"/> : <ArrowDownIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary"/>}
                    </button>
                </div>
                {activeSectionOpen && (
                    <>
                    {/* Mobile cards for Active Clients */}
                    <div className="md:hidden p-3 space-y-2">
                        {filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).map(client => (
                            <div key={client.id} className="rounded-xl bg-white/5 border border-brand-border p-3 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-brand-text-light leading-tight truncate">{client.name}</p>
                                        <p className="text-[10px] text-brand-text-secondary mt-0.5 truncate">{client.email}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {client.overallPaymentStatus && (
                                            <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${getPaymentStatusClass(client.overallPaymentStatus)}`}>{client.overallPaymentStatus}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
                                    <span className="text-brand-text-secondary text-[10px]">Total Nilai</span>
                                    <span className="text-right font-semibold text-xs">{formatCurrency(client.totalProyekValue)}</span>
                                    <span className="text-brand-text-secondary text-[10px]">Sisa Tagihan</span>
                                    <span className="text-right font-bold text-xs text-brand-danger">{formatCurrency(client.balanceDue)}</span>
                                    <span className="text-brand-text-secondary text-[10px]">Proyek Terbaru</span>
                                    <span className="text-right text-xs truncate">{client.mostRecentProject?.projectName || '-'}</span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-brand-border/50 flex justify-end gap-1.5">
                                    <button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="button-secondary !text-[10px] !px-2 !py-1.5" title="Detail"><EyeIcon className="w-3 h-3"/></button>
                                    <button onClick={() => handleOpenModal('edit', client, client.mostRecentProject || undefined)} className="button-secondary !text-[10px] !px-2 !py-1.5" title="Edit"><PencilIcon className="w-3 h-3"/></button>
                                    <button onClick={() => handleDeleteClient(client.id)} className="button-secondary !text-[10px] !px-2 !py-1.5 !text-brand-danger !border-brand-danger hover:!bg-brand-danger/10" title="Hapus"><Trash2Icon className="w-3 h-3"/></button>
                                    <button onClick={() => handleOpenModal('add', client)} className="button-primary !text-[10px] !px-2.5 !py-1.5"><PlusIcon className="w-3 h-3"/></button>
                                </div>
                            </div>
                        ))}
                        {filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).length === 0 && (
                            <p className="text-center py-8 text-xs text-brand-text-secondary">Tidak ada klien aktif.</p>
                        )}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-brand-text-secondary uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium tracking-wider">Klien</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Total Nilai Proyek</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Sisa Tagihan</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Proyek Terbaru</th>
                                    <th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).map(client => (
                                    <tr key={client.id} className="hover:bg-brand-bg transition-colors">
                                        <td className="px-6 py-4"><p className="font-semibold text-brand-text-light">{client.name}</p><p className="text-xs text-brand-text-secondary">{client.email}</p></td>
                                        <td className="px-6 py-4 font-semibold">{formatCurrency(client.totalProyekValue)}</td>
                                        <td className="px-6 py-4 font-semibold text-red-400">{formatCurrency(client.balanceDue)}</td>
                                        <td className="px-6 py-4"><p>{client.mostRecentProject?.projectName || '-'}</p>{client.overallPaymentStatus && <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusClass(client.overallPaymentStatus)}`}>{client.overallPaymentStatus}</span>}</td>
                                        <td className="px-6 py-4"><div className="flex items-center justify-center space-x-1"><button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Detail Klien"><EyeIcon className="w-5 h-5"/></button><button onClick={() => handleOpenModal('edit', client, client.mostRecentProject || undefined)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit Klien"><PencilIcon className="w-5 h-5"/></button><button onClick={() => handleDeleteClient(client.id)} className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full" title="Hapus Klien"><Trash2Icon className="w-5 h-5"/></button><button onClick={() => handleOpenModal('add', client)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Tambah Proyek Baru"><PlusIcon className="w-5 h-5"/></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
                <div className="p-3 md:p-4 border-t border-brand-border">
                    <button onClick={() => setInactiveSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                        <h3 className="text-sm md:text-base font-semibold text-brand-text-light">Klien Tidak Aktif / Prospek Hilang ({filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).length})</h3>
                        {inactiveSectionOpen ? <ArrowUpIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary"/> : <ArrowDownIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary"/>}
                    </button>
                </div>
                {inactiveSectionOpen && (
                    <>
                    {/* Mobile cards for Inactive Clients */}
                    <div className="md:hidden p-3 space-y-2">
                        {filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).map(client => (
                            <div key={client.id} className="rounded-xl bg-white/5 border border-brand-border p-3 shadow-sm opacity-70 hover:opacity-90 transition-all">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-brand-text-light leading-tight truncate">{client.name}</p>
                                        <p className="text-[10px] text-brand-text-secondary mt-0.5 truncate">{client.email}</p>
                                    </div>
                                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-gray-700 text-gray-300 flex-shrink-0">{client.status}</span>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
                                    <span className="text-brand-text-secondary text-[10px]">Kontak Terakhir</span>
                                    <span className="text-right text-xs">{new Date(client.lastContact).toLocaleDateString('id-ID')}</span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-brand-border/50 flex justify-end gap-1.5">
                                    <button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="button-secondary !text-[10px] !px-2 !py-1.5" title="Detail"><EyeIcon className="w-3 h-3"/></button>
                                    <button onClick={() => handleOpenModal('edit', client, client.mostRecentProject || undefined)} className="button-secondary !text-[10px] !px-2 !py-1.5" title="Edit"><PencilIcon className="w-3 h-3"/></button>
                                    <button onClick={() => handleDeleteClient(client.id)} className="button-secondary !text-[10px] !px-2 !py-1.5 !text-brand-danger !border-brand-danger hover:!bg-brand-danger/10" title="Hapus"><Trash2Icon className="w-3 h-3"/></button>
                                </div>
                            </div>
                        ))}
                        {filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).length === 0 && (
                            <p className="text-center py-6 text-sm text-brand-text-secondary">Tidak ada klien tidak aktif.</p>
                        )}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-brand-text-secondary uppercase"><tr><th className="px-6 py-4 font-medium tracking-wider">Klien</th><th className="px-6 py-4 font-medium tracking-wider">Status</th><th className="px-6 py-4 font-medium tracking-wider">Kontak Terakhir</th><th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th></tr></thead>
                            <tbody className="divide-y divide-brand-border">
                                 {filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).map(client => (
                                    <tr key={client.id} className="hover:bg-brand-bg transition-colors opacity-70">
                                        <td className="px-6 py-4"><p className="font-semibold text-brand-text-light">{client.name}</p><p className="text-xs text-brand-text-secondary">{client.email}</p></td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">{client.status}</span></td>
                                        <td className="px-6 py-4">{new Date(client.lastContact).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4"><div className="flex items-center justify-center space-x-1"><button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Detail Klien"><EyeIcon className="w-5 h-5"/></button><button onClick={() => handleOpenModal('edit', client, client.mostRecentProject || undefined)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit Klien"><PencilIcon className="w-5 h-5"/></button><button onClick={() => handleDeleteClient(client.id)} className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full" title="Hapus Klien"><Trash2Icon className="w-5 h-5"/></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
            </div>
    
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? (selectedClient ? 'Tambah Proyek Baru' : 'Tambah Klien & Proyek Baru') : 'Edit Klien & Proyek'} size="4xl">
                <ClientForm formData={formData} handleFormChange={handleFormChange} handleFormSubmit={handleFormSubmit} handleCloseModal={handleCloseModal} packages={packages} addOns={addOns} userProfile={userProfile} modalMode={modalMode} cards={cards} promoCodes={promoCodes} />
            </Modal>
            
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Detail Klien: ${clientForDetail?.name}`} size="4xl">
                <ClientDetailModal client={clientForDetail} projects={projects} transactions={transactions} contracts={contracts} onClose={() => setIsDetailModalOpen(false)} onEditClient={(client) => handleOpenModal('edit', client, projects.find(p => p.clientId === client.id))} onDeleteClient={handleDeleteClient} onViewReceipt={(tx) => setDocumentToView({ type: 'receipt', transaction: tx })} onViewInvoice={(proj) => setDocumentToView({ type: 'invoice', project: proj })} handleNavigation={handleNavigation} onRecordPayment={handleRecordPayment} cards={cards} onSharePortal={handleOpenQrModal} onDeleteProject={handleDeleteProject} />
            </Modal>
    
            {/* Helper: open print in a new window to avoid fixed/transform print issues */}
            {(() => {
                // attach once per render scope
                (window as any).__venaPrintFull = (window as any).__venaPrintFull || ((docTitle?: string) => {
                    try {
                        const area = document.querySelector('.printable-area') as HTMLElement | null;
                        if (!area) { window.print(); return; }
                        const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                            .map(el => (el as HTMLElement).outerHTML)
                            .join('\n');
                        const baseHref = `${window.location.origin}${window.location.pathname}`;
                        const title = docTitle || document.title;
                        const extraStyles = `
                            <link rel="preconnect" href="https://fonts.googleapis.com">
                            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                            <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                            <style>
                              @page { size: A4; margin: 10mm; }
                              html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Manrope', sans-serif !important; }
                              .print-a4 { width: 210mm; margin: 0 auto; }
                              .fit-to-page { transform-origin: top left !important; }
                              .fit-to-page[data-fit-scale="true"] { transform: var(--fit-scale) !important; }
                            </style>
                          `;
                        const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title><base href="${baseHref}">${headStyles}${extraStyles}</head><body class="print-a4"><div class="printable-area"><div class="fit-to-page" id="fitWrapper">${area.innerHTML}</div></div><script>(function(){try{function mmToPx(mm){var el=document.createElement('div');el.style.width=mm+'mm';el.style.position='absolute';el.style.visibility='hidden';document.body.appendChild(el);var px=el.getBoundingClientRect().width;document.body.removeChild(el);return px;}var pageWidthMM=210,pageHeightMM=297;var marginTopMM=10,marginBottomMM=10,marginLeftMM=10,marginRightMM=10;var printableWidthPx=mmToPx(pageWidthMM - marginLeftMM - marginRightMM);var printableHeightPx=mmToPx(pageHeightMM - marginTopMM - marginBottomMM);var wrapper=document.getElementById('fitWrapper');if(wrapper){var rect=wrapper.getBoundingClientRect();var scaleX=printableWidthPx/rect.width;var scaleY=printableHeightPx/rect.height;var scale=Math.min(1,scaleX,scaleY);wrapper.setAttribute('data-fit-scale','true');document.documentElement.style.setProperty('--fit-scale','scale('+scale+')');}}catch(e){}})();</script></body></html>`;
                        const w = window.open('', '_blank', 'noopener,noreferrer');
                        if (!w) { window.print(); return; }
                        w.document.open();
                        w.document.write(html);
                        w.document.close();
                        w.focus();
                        w.onload = () => { try { w.print(); setTimeout(() => w.close(), 300); } catch { /* no-op */ } };
                    } catch {
                        window.print();
                    }
                });
                return null;
            })()}

            <Modal isOpen={!!documentToView} onClose={() => setDocumentToView(null)} title={documentToView ? (documentToView.type === 'invoice' ? 'Invoice' : 'Tanda Terima') : ''} size="3xl">
                <div id="invoice" className="printable-area max-h-[70vh] overflow-y-auto">{renderDocumentBody()}</div>
                <div className="mt-6 text-right non-printable space-x-2 border-t border-brand-border pt-4">
                    {documentToView && !documentToView[documentToView.type === 'invoice' ? 'project' : 'transaction'].vendorSignature && (
                        <button type="button" onClick={() => setIsSignatureModalOpen(true)} className="button-secondary">Tanda Tangani</button>
                    )}
                    <PrintButton 
                      areaId="invoice"
                      label={"Cetak Penuh"}
                      title={documentToView ? (documentToView.type === 'invoice' ? `Invoice - ${documentToView.project?.projectName || ''}` : 'Tanda Terima') : 'Dokumen'}
                      directPrint={true}
                    />
                </div>
            </Modal>
    
            <Modal isOpen={isBookingFormShareModalOpen} onClose={() => setIsBookingFormShareModalOpen(false)} title="Bagikan Formulir Booking Publik" size="sm">
                <div className="text-center p-4">
                    <div id="clients-booking-form-qrcode" className="p-4 bg-white rounded-lg inline-block mx-auto"></div>
                    <p className="text-xs text-brand-text-secondary mt-4 break-all">{bookingFormUrl}</p>
                    <div className="flex items-center gap-2 mt-6">
                        <button onClick={copyBookingLinkToClipboard} className="button-secondary w-full">Salin Tautan</button>
                        <button onClick={downloadBookingQrCode} className="button-primary w-full">Unduh QR</button>
                    </div>
                </div>
            </Modal>
             {qrModalContent && (
                <Modal isOpen={!!qrModalContent} onClose={() => setQrModalContent(null)} title={qrModalContent.title} size="sm">
                    <div className="text-center p-4">
                        <div id="client-portal-qrcode" className="p-4 bg-white rounded-lg inline-block mx-auto"></div>
                        <p className="text-xs text-brand-text-secondary mt-4 break-all">{qrModalContent.url}</p>
                        <div className="flex items-center gap-2 mt-6">
                            <button onClick={() => { navigator.clipboard.writeText(qrModalContent.url); showNotification('Tautan berhasil disalin!'); }} className="button-secondary w-full">Salin Tautan</button>
                            <button onClick={() => {
                                const canvas = document.querySelector('#client-portal-qrcode canvas') as HTMLCanvasElement;
                                if (canvas) {
                                    const link = document.createElement('a');
                                    link.download = 'portal-qr-code.png';
                                    link.href = canvas.toDataURL();
                                    link.click();
                                }
                            }} className="button-primary w-full">Unduh QR</button>
                        </div>
                    </div>
                </Modal>
            )}
             <Modal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} title="Bubuhkan Tanda Tangan Anda">
                <SignaturePad onClose={() => setIsSignatureModalOpen(false)} onSave={handleSaveSignature} />
            </Modal>
             {billingChatModal && (
                <BillingChatModal
                    isOpen={!!billingChatModal}
                    onClose={() => setBillingChatModal(null)}
                    client={billingChatModal}
                    projects={projects}
                    userProfile={userProfile}
                    showNotification={showNotification}
                />
            )}

            {/* StatCard Detail Modals */}
            <StatCardModal
                isOpen={activeStatModal === 'total'}
                onClose={() => setActiveStatModal(null)}
                icon={<UsersIcon className="w-6 h-6"/>}
                title="Total Klien"
                value={clientStats.totalClients.toString()}
                subtitle="Semua klien terdaftar"
                colorVariant="blue"
                description={`Total klien yang terdaftar dalam sistem Anda.\n\nTotal: ${clientStats.totalClients} klien\n\nKlien adalah aset berharga bisnis Anda. Jaga hubungan baik untuk repeat business dan referral.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Daftar Klien</h4>
                    {clients.slice(0, 10).map(client => {
                        const clientProjects = projects.filter(p => p.clientId === client.id);
                        return (
                            <div key={client.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-brand-text-light text-sm">{client.name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        client.status === ClientStatus.ACTIVE ? 'bg-green-500/20 text-green-500' :
                                        client.status === ClientStatus.INACTIVE ? 'bg-gray-500/20 text-gray-500' :
                                        'bg-blue-500/20 text-blue-500'
                                    }`}>{client.status}</span>
                                </div>
                                <p className="text-xs text-brand-text-secondary">{client.email}</p>
                                <p className="text-xs text-brand-text-secondary mt-1">{clientProjects.length} proyek</p>
                            </div>
                        );
                    })}
                    {clients.length > 10 && (
                        <p className="text-xs text-brand-text-secondary text-center pt-2">Dan {clients.length - 10} klien lainnya...</p>
                    )}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'active'}
                onClose={() => setActiveStatModal(null)}
                icon={<TrendingUpIcon className="w-6 h-6"/>}
                title="Klien Aktif"
                value={clientStats.activeClients.toString()}
                subtitle="Klien dengan proyek berjalan"
                colorVariant="green"
                description={`Klien yang memiliki proyek aktif saat ini.\n\nAktif: ${clientStats.activeClients} klien\n\nFokus pada klien aktif untuk memastikan kepuasan dan penyelesaian proyek tepat waktu.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Klien dengan Proyek Aktif</h4>
                    {clients.filter(c => projects.some(p => p.clientId === c.id && p.status !== 'Selesai' && p.status !== 'Dibatalkan')).map(client => {
                        const activeProjects = projects.filter(p => p.clientId === client.id && p.status !== 'Selesai' && p.status !== 'Dibatalkan');
                        return (
                            <div key={client.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                                <p className="font-semibold text-brand-text-light text-sm">{client.name}</p>
                                <p className="text-xs text-brand-text-secondary mt-1">{activeProjects.length} proyek aktif</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {activeProjects.slice(0, 3).map(p => (
                                        <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent">
                                            {p.projectName}
                                        </span>
                                    ))}
                                    {activeProjects.length > 3 && (
                                        <span className="text-xs text-brand-text-secondary">+{activeProjects.length - 3} lagi</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'receivables'}
                onClose={() => setActiveStatModal(null)}
                icon={<AlertCircleIcon className="w-6 h-6"/>}
                title="Total Piutang"
                value={clientStats.totalReceivables}
                subtitle="Tagihan belum terbayar"
                colorVariant="orange"
                description={`Total piutang dari semua klien yang belum dibayar.\n\nPiutang: ${clientStats.totalReceivables}\n\nSegera tagih untuk menjaga cash flow bisnis Anda.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Klien dengan Piutang</h4>
                    {clients.map(client => {
                        const clientProjects = projects.filter(p => p.clientId === client.id);
                        const totalReceivable = clientProjects.reduce((sum, p) => sum + (p.totalCost - p.amountPaid), 0);
                        if (totalReceivable <= 0) return null;
                        return (
                            <div key={client.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-brand-text-light text-sm">{client.name}</p>
                                    <span className="text-sm text-orange-500 font-semibold">{formatCurrency(totalReceivable)}</span>
                                </div>
                                <p className="text-xs text-brand-text-secondary">{clientProjects.filter(p => (p.totalCost - p.amountPaid) > 0).length} proyek dengan piutang</p>
                            </div>
                        );
                    }).filter(Boolean)}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'location'}
                onClose={() => setActiveStatModal(null)}
                icon={<MapPinIcon className="w-6 h-6"/>}
                title="Lokasi Teratas"
                value={clientStats.mostFrequentLocation}
                subtitle="Lokasi paling sering dipilih"
                colorVariant="purple"
                description={`Lokasi yang paling sering dipilih oleh klien Anda.\n\nTeratas: ${clientStats.mostFrequentLocation}\n\nInformasi ini membantu Anda memahami area market utama.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Distribusi Lokasi Klien</h4>
                    {Object.entries(
                        clients.reduce((acc, c) => {
                            // Get location from client's projects
                            const clientProjects = projects.filter(p => p.clientId === c.id);
                            const loc = clientProjects.length > 0 && clientProjects[0].location ? clientProjects[0].location : 'Tidak Diketahui';
                            acc[loc] = (acc[loc] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>)
                    ).sort(([, a], [, b]) => b - a).map(([location, count]) => (
                        <div key={location} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                            <p className="font-semibold text-brand-text-light text-sm">{location}</p>
                            <span className="text-sm text-brand-accent font-semibold">{count} klien</span>
                        </div>
                    ))}
                </div>
            </StatCardModal>
        </div>
    );
};

export default Clients;