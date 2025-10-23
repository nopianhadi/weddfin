import React, { useState } from 'react';
import { Project, Client, ProjectStatusConfig, PaymentStatus } from '../types';
import { 
    CalendarIcon, 
    MapPinIcon, 
    DollarSignIcon, 
    CheckCircleIcon,
    AlertCircleIcon,
    MessageSquareIcon,
    FileTextIcon,
    EyeIcon,
    PencilIcon,
    ClockIcon
} from '../constants';

interface ProjectCardProps {
    project: Project;
    client: Client | undefined;
    projectStatusConfig: ProjectStatusConfig[];
    onStatusChange: (projectId: string, newStatus: string) => void;
    onViewDetails: (project: Project) => void;
    onEdit: (project: Project) => void;
    onSendMessage: (project: Project) => void;
    onViewInvoice: (project: Project) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(amount);
};

const getStatusColor = (status: string, config: ProjectStatusConfig[]): string => {
    const statusConfig = config.find(c => c.name === status);
    return statusConfig ? statusConfig.color : '#64748b';
};

const getDaysUntil = (dateString: string): number => {
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const getPaymentStatusInfo = (project: Project) => {
    const remaining = project.totalCost - project.amountPaid;
    const percentage = project.totalCost > 0 ? (project.amountPaid / project.totalCost) * 100 : 0;
    
    let status: PaymentStatus;
    if (remaining === 0) {
        status = PaymentStatus.LUNAS;
    } else if (project.amountPaid > 0) {
        status = PaymentStatus.DP_TERBAYAR;
    } else {
        status = PaymentStatus.BELUM_BAYAR;
    }
    
    return { remaining, percentage, status };
};

const getProgressPercentage = (status: string, config: ProjectStatusConfig[]): number => {
    const statusIndex = config.findIndex(s => s.name === status);
    if (statusIndex === -1) return 0;
    return ((statusIndex + 1) / config.length) * 100;
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
    project,
    client,
    projectStatusConfig,
    onStatusChange,
    onViewDetails,
    onEdit,
    onSendMessage,
    onViewInvoice,
}) => {
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
    
    const daysUntil = getDaysUntil(project.date);
    const paymentInfo = getPaymentStatusInfo(project);
    const progressPercentage = getProgressPercentage(project.status, projectStatusConfig);
    const statusColor = getStatusColor(project.status, projectStatusConfig);
    
    const isVIP = client && (client as any).isVIP; // Assuming VIP flag exists
    const isUrgent = daysUntil >= 0 && daysUntil <= 7;
    
    const handleStatusChange = (newStatus: string) => {
        onStatusChange(project.id, newStatus);
        setIsStatusDropdownOpen(false);
    };
    
    return (
        <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border hover:shadow-xl transition-all duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-base sm:text-lg text-brand-text-light truncate">
                                {project.projectName}
                            </h3>
                            {isVIP && (
                                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 font-semibold">
                                    ⭐ VIP
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-brand-text-secondary truncate">
                            {client?.name || project.clientName}
                        </p>
                    </div>
                </div>
                
                {/* Event Info */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-brand-text-secondary mb-3">
                    <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{new Date(project.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {project.location && (
                        <div className="flex items-center gap-1">
                            <MapPinIcon className="w-4 h-4" />
                            <span className="truncate max-w-[150px]">{project.location}</span>
                        </div>
                    )}
                    {isUrgent && daysUntil >= 0 && (
                        <div className="flex items-center gap-1 text-orange-500 font-semibold">
                            <ClockIcon className="w-4 h-4" />
                            <span>{daysUntil === 0 ? 'Hari ini!' : `${daysUntil} hari lagi`}</span>
                        </div>
                    )}
                </div>
                
                {/* Status & Progress */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="relative">
                            <button
                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:bg-brand-input"
                                style={{ 
                                    backgroundColor: `${statusColor}20`,
                                    color: statusColor 
                                }}
                            >
                                <span>Status: {project.status}</span>
                                <svg className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {/* Status Dropdown */}
                            {isStatusDropdownOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setIsStatusDropdownOpen(false)}
                                    />
                                    <div className="absolute top-full left-0 mt-1 w-48 bg-brand-surface border border-brand-border rounded-lg shadow-xl z-20 py-1">
                                        {projectStatusConfig.map((statusConfig) => (
                                            <button
                                                key={statusConfig.id}
                                                onClick={() => handleStatusChange(statusConfig.name)}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-input transition-colors flex items-center gap-2 ${
                                                    project.status === statusConfig.name ? 'font-semibold' : ''
                                                }`}
                                                style={{ color: statusConfig.color }}
                                            >
                                                {project.status === statusConfig.name && (
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                )}
                                                <span className={project.status === statusConfig.name ? '' : 'ml-6'}>
                                                    {statusConfig.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <span className="text-xs font-semibold text-brand-text-secondary">
                            {Math.round(progressPercentage)}%
                        </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-brand-bg rounded-full overflow-hidden">
                        <div 
                            className="h-full transition-all duration-500 rounded-full"
                            style={{ 
                                width: `${progressPercentage}%`,
                                backgroundColor: statusColor
                            }}
                        />
                    </div>
                </div>
                
                {/* Payment Info */}
                <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center gap-2">
                        <DollarSignIcon className="w-4 h-4 text-brand-text-secondary" />
                        <span className="font-semibold text-brand-text-light">
                            {formatCurrency(project.totalCost)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {paymentInfo.status === PaymentStatus.LUNAS ? (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500 font-semibold">
                                <CheckCircleIcon className="w-3 h-3" />
                                Lunas
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-500 font-semibold">
                                <AlertCircleIcon className="w-3 h-3" />
                                Sisa {formatCurrency(paymentInfo.remaining)}
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => onSendMessage(project)}
                        className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-input hover:bg-brand-accent hover:text-white text-brand-text-primary text-sm font-semibold transition-all"
                        title="Chat Klien"
                    >
                        <MessageSquareIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Chat</span>
                    </button>
                    
                    <button
                        onClick={() => onViewInvoice(project)}
                        className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-input hover:bg-brand-accent hover:text-white text-brand-text-primary text-sm font-semibold transition-all"
                        title="Lihat Invoice"
                    >
                        <FileTextIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Invoice</span>
                    </button>
                    
                    <button
                        onClick={() => onEdit(project)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-input hover:bg-brand-accent hover:text-white text-brand-text-primary text-sm font-semibold transition-all"
                        title="Edit Proyek"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    
                    <button
                        onClick={() => onViewDetails(project)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold transition-all hover:bg-brand-accent-hover"
                        title="Lihat Detail"
                    >
                        <EyeIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
