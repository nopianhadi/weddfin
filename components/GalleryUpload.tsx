import React, { useState, useEffect } from 'react';
import { Profile, Gallery } from '../types';
import Modal from './Modal';
import { UploadIcon, TrashIcon, LinkIcon } from '../constants';
import { createGallery, listGalleries, uploadGalleryImages, deleteGallery, updateGallery } from '../services/galleries';

interface GalleryUploadProps {
    userProfile: Profile;
    showNotification: (message: string) => void;
}

const GalleryUpload: React.FC<GalleryUploadProps> = ({ userProfile, showNotification }) => {
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [newGallery, setNewGallery] = useState({
        title: '',
        region: '',
        description: '',
        is_public: true,
        booking_link: ''
    });
    
    const [editGallery, setEditGallery] = useState({
        title: '',
        region: '',
        description: '',
        is_public: true,
        booking_link: ''
    });
    
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        loadGalleries();
    }, []);

    const loadGalleries = async () => {
        try {
            setIsLoading(true);
            const data = await listGalleries();
            setGalleries(data);
        } catch (error) {
            console.error('Error loading galleries:', error);
            showNotification('Gagal memuat galeri');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateGallery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGallery.title.trim() || !newGallery.region.trim()) {
            showNotification('Judul dan daerah harus diisi');
            return;
        }

        try {
            setIsSubmitting(true);
            const gallery = await createGallery({
                title: newGallery.title.trim(),
                region: newGallery.region.trim(),
                description: newGallery.description.trim(),
                is_public: newGallery.is_public,
                booking_link: newGallery.booking_link?.trim() || undefined,
                images: []
            });
            
            setGalleries(prev => [gallery, ...prev]);
            setIsCreateModalOpen(false);
            setNewGallery({ title: '', region: '', description: '', is_public: true, booking_link: '' });
            showNotification('Galeri berhasil dibuat');
        } catch (error) {
            console.error('Error creating gallery:', error);
            showNotification('Gagal membuat galeri');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const validFiles = files.filter(file => {
                if (file.size > 10 * 1024 * 1024) {
                    showNotification(`File ${file.name} terlalu besar (max 10MB)`);
                    return false;
                }
                if (!file.type.startsWith('image/')) {
                    showNotification(`File ${file.name} bukan gambar`);
                    return false;
                }
                return true;
            });
            setSelectedFiles(validFiles);
        }
    };

    const handleUploadImages = async () => {
        if (!selectedGallery || selectedFiles.length === 0) return;

        try {
            setIsSubmitting(true);
            setUploadProgress(0);
            
            const uploadedImages = await uploadGalleryImages(
                selectedGallery.id,
                selectedFiles,
                (progress) => setUploadProgress(progress)
            );
            
            setGalleries(prev => prev.map(g => 
                g.id === selectedGallery.id 
                    ? { ...g, images: [...g.images, ...uploadedImages] }
                    : g
            ));
            
            setIsUploadModalOpen(false);
            setSelectedFiles([]);
            setUploadProgress(0);
            showNotification(`${uploadedImages.length} gambar berhasil diupload`);
        } catch (error) {
            console.error('Error uploading images:', error);
            showNotification('Gagal mengupload gambar');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteGallery = async (galleryId: string) => {
        if (!confirm('Yakin ingin menghapus galeri ini? Semua gambar akan ikut terhapus.')) return;

        try {
            await deleteGallery(galleryId);
            setGalleries(prev => prev.filter(g => g.id !== galleryId));
            showNotification('Galeri berhasil dihapus');
        } catch (error) {
            console.error('Error deleting gallery:', error);
            showNotification('Gagal menghapus galeri');
        }
    };

    const copyPublicLink = (gallery: Gallery) => {
        const link = `${window.location.origin}/#/gallery/${gallery.public_id}`;
        navigator.clipboard.writeText(link);
        showNotification('Link publik berhasil disalin');
    };

    const openUploadModal = (gallery: Gallery) => {
        setSelectedGallery(gallery);
        setIsUploadModalOpen(true);
        setSelectedFiles([]);
    };

    const openEditModal = (gallery: Gallery) => {
        setSelectedGallery(gallery);
        setEditGallery({
            title: gallery.title,
            region: gallery.region,
            description: gallery.description || '',
            is_public: gallery.is_public,
            booking_link: gallery.booking_link || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditGallery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGallery || !editGallery.title.trim() || !editGallery.region.trim()) {
            showNotification('Judul dan daerah harus diisi');
            return;
        }

        try {
            setIsSubmitting(true);
            const updated = await updateGallery(selectedGallery.id, {
                title: editGallery.title.trim(),
                region: editGallery.region.trim(),
                description: editGallery.description.trim(),
                is_public: editGallery.is_public,
                booking_link: editGallery.booking_link?.trim() || null
            });
            
            setGalleries(prev => prev.map(g => 
                g.id === selectedGallery.id ? { ...g, ...updated } : g
            ));
            setIsEditModalOpen(false);
            showNotification('Galeri berhasil diupdate');
        } catch (error) {
            console.error('Error updating gallery:', error);
            showNotification('Gagal mengupdate galeri');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-brand-text-light">Galeri Upload</h2>
                    <p className="text-sm md:text-base text-brand-text-secondary">Kelola galeri foto berdasarkan daerah</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                >
                    <svg className="w-4 md:w-5 h-4 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Buat Galeri Baru
                </button>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {galleries.map(gallery => (
                    <div key={gallery.id} className="bg-brand-surface rounded-lg shadow-md overflow-hidden">
                        {/* Gallery Cover */}
                        <div className="h-40 md:h-48 bg-gray-200 relative">
                            {gallery.images.length > 0 ? (
                                <img
                                    src={gallery.images[0].url}
                                    alt={gallery.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs md:text-sm">
                                {gallery.images.length} foto
                            </div>
                        </div>

                        {/* Gallery Info */}
                        <div className="p-3 md:p-4">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-sm md:text-base text-brand-text-light">{gallery.title}</h3>
                                {gallery.is_public && (
                                    <span className="text-[10px] md:text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                        Publik
                                    </span>
                                )}
                            </div>
                            <p className="text-xs md:text-sm text-brand-accent font-medium mb-2">📍 {gallery.region}</p>
                            {gallery.description && (
                                <p className="text-xs md:text-sm text-brand-text-secondary mb-2 md:mb-3 line-clamp-2">
                                    {gallery.description}
                                </p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-1.5 md:gap-2">
                                <button
                                    onClick={() => openUploadModal(gallery)}
                                    className="flex-1 px-2 md:px-3 py-1.5 md:py-2 bg-brand-accent text-white rounded text-xs md:text-sm hover:bg-brand-accent-hover transition-colors flex items-center justify-center gap-1"
                                >
                                    <UploadIcon className="w-3 md:w-4 h-3 md:h-4" />
                                    <span className="hidden sm:inline">Upload</span>
                                </button>
                                <button
                                    onClick={() => openEditModal(gallery)}
                                    className="px-2 md:px-3 py-1.5 md:py-2 bg-yellow-500 text-white rounded text-xs md:text-sm hover:bg-yellow-600 transition-colors flex items-center justify-center"
                                    title="Edit Galeri"
                                >
                                    <svg className="w-3 md:w-4 h-3 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                {gallery.is_public && (
                                    <button
                                        onClick={() => copyPublicLink(gallery)}
                                        className="px-2 md:px-3 py-1.5 md:py-2 bg-blue-500 text-white rounded text-xs md:text-sm hover:bg-blue-600 transition-colors flex items-center justify-center"
                                        title="Salin Link Publik"
                                    >
                                        <LinkIcon className="w-3 md:w-4 h-3 md:h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDeleteGallery(gallery.id)}
                                    className="px-2 md:px-3 py-1.5 md:py-2 bg-red-500 text-white rounded text-xs md:text-sm hover:bg-red-600 transition-colors flex items-center justify-center"
                                    title="Hapus Galeri"
                                >
                                    <TrashIcon className="w-3 md:w-4 h-3 md:h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {galleries.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-brand-text-light mb-2">Belum ada galeri</h3>
                    <p className="text-brand-text-secondary mb-4">Buat galeri pertama Anda untuk mulai mengupload foto</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors"
                    >
                        Buat Galeri Baru
                    </button>
                </div>
            )}

            {/* Create Gallery Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Buat Galeri Baru">
                <form onSubmit={handleCreateGallery} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-text-light mb-2">
                            Judul Galeri *
                        </label>
                        <input
                            type="text"
                            value={newGallery.title}
                            onChange={(e) => setNewGallery(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            placeholder="Contoh: Wedding Portfolio Jakarta"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text-light mb-2">
                            Daerah *
                        </label>
                        <input
                            type="text"
                            value={newGallery.region}
                            onChange={(e) => setNewGallery(prev => ({ ...prev, region: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            placeholder="Contoh: Jakarta, Bandung, Surabaya"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text-light mb-2">
                            Deskripsi
                        </label>
                        <textarea
                            value={newGallery.description}
                            onChange={(e) => setNewGallery(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            rows={3}
                            placeholder="Deskripsi singkat tentang galeri ini..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text-light mb-2">
                            Tautan Booking (opsional)
                        </label>
                        <input
                            type="url"
                            value={newGallery.booking_link}
                            onChange={(e) => setNewGallery(prev => ({ ...prev, booking_link: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            placeholder="https://..."
                        />
                        <p className="text-xs text-brand-text-secondary mt-1">Jika diisi, tombol Booking di halaman galeri akan menggunakan tautan ini.</p>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="is_public"
                            checked={newGallery.is_public}
                            onChange={(e) => setNewGallery(prev => ({ ...prev, is_public: e.target.checked }))}
                            className="mr-2"
                        />
                        <label htmlFor="is_public" className="text-sm text-brand-text-light">
                            Buat galeri publik (dapat diakses melalui link)
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-brand-surface">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1 px-4 py-2 border border-brand-border text-brand-text-light rounded-lg hover:bg-brand-surface transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Membuat...' : 'Buat Galeri'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Gallery Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Galeri">
                <form onSubmit={handleEditGallery} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-text-light mb-2">
                            Judul Galeri *
                        </label>
                        <input
                            type="text"
                            value={editGallery.title}
                            onChange={(e) => setEditGallery(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            placeholder="Contoh: Wedding Portfolio Jakarta"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text-light mb-2">
                            Daerah *
                        </label>
                        <input
                            type="text"
                            value={editGallery.region}
                            onChange={(e) => setEditGallery(prev => ({ ...prev, region: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            placeholder="Contoh: Jakarta, Bandung, Surabaya"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text-light mb-2">
                            Deskripsi
                        </label>
                        <textarea
                            value={editGallery.description}
                            onChange={(e) => setEditGallery(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            rows={3}
                            placeholder="Deskripsi singkat tentang galeri ini..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text-light mb-2">
                            Tautan Booking (opsional)
                        </label>
                        <input
                            type="url"
                            value={editGallery.booking_link}
                            onChange={(e) => setEditGallery(prev => ({ ...prev, booking_link: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                            placeholder="https://..."
                        />
                        <p className="text-xs text-brand-text-secondary mt-1">Kosongkan untuk memakai tautan booking default berdasarkan wilayah.</p>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="edit_is_public"
                            checked={editGallery.is_public}
                            onChange={(e) => setEditGallery(prev => ({ ...prev, is_public: e.target.checked }))}
                            className="mr-2"
                        />
                        <label htmlFor="edit_is_public" className="text-sm text-brand-text-light">
                            Buat galeri publik (dapat diakses melalui link)
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-brand-surface">
                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 px-4 py-2 border border-brand-border text-brand-text-light rounded-lg hover:bg-brand-surface transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Upload Images Modal */}
            <Modal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
                title={`Upload ke ${selectedGallery?.title}`}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-text-light mb-2">
                            Pilih Gambar
                        </label>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                        />
                        <p className="text-xs text-brand-text-secondary mt-1">
                            Maksimal 10MB per file. Format: JPG, PNG, WebP
                        </p>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-brand-text-light mb-2">
                                {selectedFiles.length} file dipilih:
                            </p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="text-sm text-brand-text-secondary flex justify-between">
                                        <span>{file.name}</span>
                                        <span>{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Mengupload...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-brand-accent h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-brand-surface">
                        <button
                            type="button"
                            onClick={() => setIsUploadModalOpen(false)}
                            className="flex-1 px-4 py-2 border border-brand-border text-brand-text-light rounded-lg hover:bg-brand-surface transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleUploadImages}
                            disabled={selectedFiles.length === 0 || isSubmitting}
                            className="flex-1 px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Mengupload...' : 'Upload Gambar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default GalleryUpload;