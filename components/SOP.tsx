import React, { useState } from 'react';
import * as types from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { PlusIcon, PencilIcon, Trash2Icon, BookOpenIcon, ArrowDownIcon, ArrowUpIcon } from '../constants';
import { createSOP as createSOPRow, updateSOP as updateSOPRow, deleteSOP as deleteSOPRow } from '../services/sops';

interface SOPProps {
    sops: types.SOP[];
    setSops: React.Dispatch<React.SetStateAction<types.SOP[]>>;
    profile: types.Profile;
    showNotification: (message: string) => void;
}

const SOPManagement: React.FC<SOPProps> = ({ sops, setSops, profile, showNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
    const [selectedSop, setSelectedSop] = useState<types.SOP | null>(null);

    // Normalize categories to avoid undefined access
    const sopCategories = Array.isArray(profile.sopCategories) ? profile.sopCategories : [];

    const initialFormState = {
        title: '',
        category: sopCategories[0] || '',
        content: '',
    };
    const [formData, setFormData] = useState(initialFormState);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set(sopCategories));

    // Ensure uniqueness by id to avoid duplicate React keys in lists
    const uniqueSops = React.useMemo(() => {
        const map = new Map<string, types.SOP>();
        for (const s of sops) map.set(s.id, s);
        return Array.from(map.values());
    }, [sops]);

    const handleOpenModal = (mode: 'add' | 'edit' | 'view', sop?: types.SOP) => {
        setModalMode(mode);
        if ((mode === 'edit' || mode === 'view') && sop) {
            setSelectedSop(sop);
            setFormData({
                title: sop.title,
                category: sop.category,
                content: sop.content,
            });
        } else {
            setSelectedSop(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'add') {
                const payload = {
                    ...formData,
                    lastUpdated: new Date().toISOString(),
                } as Omit<types.SOP, 'id'>;
                const created = await createSOPRow(payload);
                setSops(prev => {
                    const map = new Map(prev.map(s => [s.id, s] as const));
                    map.set(created.id, created);
                    return Array.from(map.values()).sort((a,b) => a.title.localeCompare(b.title));
                });
                showNotification('SOP baru berhasil ditambahkan.');
            } else if (selectedSop) {
                const patch = {
                    ...formData,
                    lastUpdated: new Date().toISOString(),
                } as Partial<types.SOP>;
                try {
                    const updated = await updateSOPRow(selectedSop.id, patch);
                    setSops(prev => prev.map(s => s.id === selectedSop.id ? updated : s));
                    showNotification('SOP berhasil diperbarui.');
                } catch (err: any) {
                    console.warn('[Supabase][sops.update] gagal, fallback create. Detail:', err);
                    const created = await createSOPRow({ ...formData, lastUpdated: new Date().toISOString() } as any);
                    setSops(prev => prev.map(s => s.id === selectedSop.id ? created : s));
                    showNotification('SOP baru berhasil dibuat (fallback).');
                }
            }
            handleCloseModal();
        } catch (err: any) {
            console.error('[Supabase][sops.save] error:', err);
            alert(`Gagal menyimpan SOP ke database. ${err?.message || 'Coba lagi.'}`);
        }
    };
    
    const handleDelete = async (sopId: string) => {
        if (!window.confirm("Yakin ingin menghapus SOP ini?")) return;
        try {
            await deleteSOPRow(sopId);
            setSops(prev => prev.filter(s => s.id !== sopId));
            showNotification('SOP berhasil dihapus.');
        } catch (err: any) {
            console.error('[Supabase][sops.delete] error:', err);
            alert(`Gagal menghapus SOP di database. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };
    
    const sopsByCategory = uniqueSops.reduce((acc, sop) => {
        if (!acc[sop.category]) {
            acc[sop.category] = [];
        }
        acc[sop.category].push(sop);
        return acc;
    }, {} as Record<string, types.SOP[]>);

    return (
        <div className="space-y-6">
            <PageHeader title="Alur Kerja" subtitle="Kelola panduan kerja untuk menjaga kualitas dan konsistensi tim." icon={<BookOpenIcon className="w-6 h-6" />}>
                <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Tambah SOP Baru
                </button>
            </PageHeader>

            {/* Desktop/Tablet View */}
            <div className="hidden sm:block space-y-4">
                {sopCategories.length === 0 ? (
                    <div className="bg-brand-surface p-8 rounded-xl text-center border border-brand-border">
                        <BookOpenIcon className="w-12 h-12 text-brand-text-secondary mx-auto mb-3 opacity-50" />
                        <p className="text-brand-text-secondary">Belum ada kategori SOP. Tambahkan kategori di halaman Pengaturan.</p>
                    </div>
                ) : (
                    sopCategories.map(category => (
                        <div key={category} className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                            <button onClick={() => toggleCategory(category)} className="w-full flex justify-between items-center p-4 hover:bg-brand-bg/50 transition-colors">
                                <h3 className="font-semibold text-lg text-brand-text-light">{category}</h3>
                                {expandedCategories.has(category) ? <ArrowUpIcon className="w-5 h-5 text-brand-text-secondary"/> : <ArrowDownIcon className="w-5 h-5 text-brand-text-secondary"/>}
                            </button>
                            {expandedCategories.has(category) && (
                                <div className="p-4 border-t border-brand-border space-y-3">
                                    {(sopsByCategory[category] || []).map(sop => (
                                        <div key={sop.id} onClick={() => handleOpenModal('view', sop)} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center cursor-pointer hover:bg-brand-input transition-colors">
                                            <div className="flex items-center gap-3">
                                                <BookOpenIcon className="w-5 h-5 text-brand-accent"/>
                                                <div>
                                                    <p className="font-semibold text-brand-text-light">{sop.title}</p>
                                                    <p className="text-xs text-brand-text-secondary">Diperbarui: {new Date(sop.lastUpdated).toLocaleDateString('id-ID')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', sop); }} className="p-2 text-brand-text-secondary hover:text-brand-accent rounded-full"><PencilIcon className="w-5 h-5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(sop.id); }} className="p-2 text-brand-text-secondary hover:text-brand-danger rounded-full"><Trash2Icon className="w-5 h-5" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {!sopsByCategory[category] && <p className="text-center text-sm text-brand-text-secondary p-4">Belum ada SOP di kategori ini.</p>}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-4">
                {sopCategories.length === 0 ? (
                    <div className="bg-brand-surface p-8 rounded-xl text-center border border-brand-border">
                        <BookOpenIcon className="w-12 h-12 text-brand-text-secondary mx-auto mb-3 opacity-50" />
                        <p className="text-brand-text-secondary text-sm">Belum ada kategori SOP. Tambahkan kategori di halaman Pengaturan.</p>
                    </div>
                ) : (
                    sopCategories.map(category => (
                        <div key={category} className="bg-brand-surface rounded-xl shadow-lg border border-brand-border overflow-hidden">
                            {/* Category Header */}
                            <button 
                                onClick={() => toggleCategory(category)} 
                                className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-brand-border"
                            >
                                <h3 className="font-semibold text-base text-brand-text-light">{category}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-brand-text-secondary">
                                        {(sopsByCategory[category] || []).length} SOP
                                    </span>
                                    {expandedCategories.has(category) ? 
                                        <ArrowUpIcon className="w-5 h-5 text-brand-text-secondary"/> : 
                                        <ArrowDownIcon className="w-5 h-5 text-brand-text-secondary"/>
                                    }
                                </div>
                            </button>
                            
                            {/* SOP List */}
                            {expandedCategories.has(category) && (
                                <div className="divide-y divide-brand-border">
                                    {(sopsByCategory[category] || []).length === 0 ? (
                                        <div className="p-6 text-center">
                                            <p className="text-sm text-brand-text-secondary">Belum ada SOP di kategori ini.</p>
                                        </div>
                                    ) : (
                                        (sopsByCategory[category] || []).map(sop => (
                                            <div key={sop.id} className="bg-brand-surface">
                                                {/* SOP Item */}
                                                <div 
                                                    onClick={() => handleOpenModal('view', sop)} 
                                                    className="p-4 cursor-pointer active:bg-brand-bg"
                                                >
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <BookOpenIcon className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5"/>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-brand-text-light mb-1">{sop.title}</p>
                                                            <p className="text-xs text-brand-text-secondary">
                                                                Terakhir diperbarui: {new Date(sop.lastUpdated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 mt-3">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', sop); }} 
                                                            className="flex-1 flex items-center justify-center gap-2 p-2 text-sm text-brand-text-secondary hover:text-blue-400 bg-brand-bg hover:bg-brand-input rounded-lg transition-colors"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                            <span>Edit</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(sop.id); }} 
                                                            className="flex-1 flex items-center justify-center gap-2 p-2 text-sm text-brand-text-secondary hover:text-red-400 bg-brand-bg hover:bg-brand-input rounded-lg transition-colors"
                                                        >
                                                            <Trash2Icon className="w-4 h-4" />
                                                            <span>Hapus</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Tambah SOP' : (modalMode === 'edit' ? 'Edit SOP' : selectedSop?.title || 'Lihat SOP')} size="4xl">
                {modalMode === 'view' && selectedSop ? (
                    <div>
                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <BookOpenIcon className="w-5 h-5 text-indigo-400" />
                                <h4 className="text-sm font-semibold text-indigo-400">Kategori: {selectedSop.category}</h4>
                            </div>
                            <p className="text-xs text-brand-text-secondary">
                                Terakhir diperbarui: {new Date(selectedSop.lastUpdated).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="prose prose-sm md:prose-base prose-invert max-w-none max-h-[60vh] overflow-y-auto bg-brand-bg p-4 rounded-lg">
                            <div dangerouslySetInnerHTML={{ __html: selectedSop.content.replace(/\n/g, '<br />') }} />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 mb-4">
                            <h4 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-2">
                                <BookOpenIcon className="w-4 h-4" />
                                Panduan Kerja (SOP)
                            </h4>
                            <p className="text-xs text-brand-text-secondary">
                                Buat panduan kerja standar untuk memastikan konsistensi dan kualitas dalam setiap proses bisnis Anda.
                            </p>
                        </div>

                        <div>
                            <h5 className="text-sm font-semibold text-brand-text-light mb-3">Informasi Dasar</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="input-group">
                                    <input type="text" id="title" name="title" value={formData.title} onChange={handleFormChange} className="input-field" placeholder=" " required />
                                    <label htmlFor="title" className="input-label">Judul SOP</label>
                                    <p className="text-xs text-brand-text-secondary mt-1">Nama singkat dan jelas untuk SOP ini</p>
                                </div>
                                <div className="input-group">
                                    <select id="category" name="category" value={formData.category} onChange={handleFormChange} className="input-field" required>
                                        {sopCategories.length === 0 ? <option value="">Tidak ada kategori</option> : sopCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                    <label htmlFor="category" className="input-label">Kategori</label>
                                    <p className="text-xs text-brand-text-secondary mt-1">Kelompokkan SOP berdasarkan area kerja</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h5 className="text-sm font-semibold text-brand-text-light mb-3">Konten SOP</h5>
                            <div className="input-group">
                                <textarea 
                                    id="content" 
                                    name="content" 
                                    value={formData.content} 
                                    onChange={handleFormChange} 
                                    className="input-field" 
                                    placeholder=" " 
                                    rows={15} 
                                    required
                                ></textarea>
                                <label htmlFor="content" className="input-label">Isi Panduan</label>
                                <p className="text-xs text-brand-text-secondary mt-1">
                                    Tulis langkah-langkah detail, tips, dan informasi penting lainnya. Gunakan format yang jelas dan mudah dipahami.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-brand-border">
                            <button type="button" onClick={handleCloseModal} className="button-secondary w-full sm:w-auto">Batal</button>
                            <button type="submit" className="button-primary w-full sm:w-auto">{modalMode === 'add' ? 'Simpan' : 'Update'}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default SOPManagement;