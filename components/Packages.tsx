import React, { useState, useMemo, useEffect } from 'react';
import { Package, AddOn, Project, PhysicalItem, Profile, REGIONS, Region } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { PencilIcon, Trash2Icon, PlusIcon, Share2Icon, FileTextIcon, CameraIcon } from '../constants';
import { createPackage as createPackageRow, updatePackage as updatePackageRow, deletePackage as deletePackageRow } from '../services/packages';
import { createAddOn as createAddOnRow, updateAddOn as updateAddOnRow, deleteAddOn as deleteAddOnRow } from '../services/addOns';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}
const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

const emptyPackageForm = {
    name: '',
    price: '',
    category: '',
    region: '' as '' | Region,
    processingTime: '',
    photographers: '',
    videographers: '',
    physicalItems: [{ name: '', price: '' as string | number }],
    digitalItems: [''],
    coverImage: '',
    durationOptions: [{ label: '', price: '' as string | number, default: true }],
};
const emptyAddOnForm = { name: '', price: '', region: '' };

interface PackagesProps {
    packages: Package[];
    setPackages: React.Dispatch<React.SetStateAction<Package[]>>;
    addOns: AddOn[];
    setAddOns: React.Dispatch<React.SetStateAction<AddOn[]>>;
    projects: Project[];
    profile: Profile;
}

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});


const Packages: React.FC<PackagesProps> = ({ packages, setPackages, addOns, setAddOns, projects, profile }) => {
  const [packageFormData, setPackageFormData] = useState<any>(emptyPackageForm);
  const [packageEditMode, setPackageEditMode] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<'' | Region>(REGIONS[0].value as any);

  const [addOnFormData, setAddOnFormData] = useState(emptyAddOnForm);
  const [addOnEditMode, setAddOnEditMode] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const publicPackagesUrl = useMemo(() => {
    // A more robust solution would involve getting the vendor's unique ID
    const vendorId = 'VEN001'; // Placeholder for the default vendor
    return `${window.location.origin}${window.location.pathname}#/public-packages/${vendorId}`;
  }, []);

  const copyPackagesLinkToClipboard = () => {
      navigator.clipboard.writeText(publicPackagesUrl).then(() => {
          alert('Tautan halaman paket berhasil disalin!');
      });
  };

  // Duration Options Handlers
  const handleDurationOptionChange = (index: number, field: 'label' | 'price' | 'default', value: string | number | boolean) => {
    const list = [...packageFormData.durationOptions];
    if (field === 'default') {
        // ensure only one default
        list.forEach((opt: any, i: number) => { opt.default = i === index ? Boolean(value) : false; });
    } else {
        (list[index] as any)[field] = value;
    }
    setPackageFormData((prev: any) => ({ ...prev, durationOptions: list }));
  };
  const addDurationOption = () => {
    setPackageFormData((prev: any) => ({ ...prev, durationOptions: [...(prev.durationOptions || []), { label: '', price: '' }] }));
  };
  const removeDurationOption = (index: number) => {
    const list = [...packageFormData.durationOptions];
    list.splice(index, 1);
    // keep at least one
    const final = list.length > 0 ? list : [{ label: '', price: '' }];
    // ensure one default exists
    if (!final.some((o: any) => o.default)) final[0].default = true;
    setPackageFormData((prev: any) => ({ ...prev, durationOptions: final }));
  };

  const packagesByCategory = useMemo(() => {
    const grouped: Record<string, Package[]> = {};
    const filtered = regionFilter ? packages.filter(p => (p.region ? p.region === regionFilter : false)) : packages;
    for (const pkg of filtered) {
        const category = pkg.category || 'Tanpa Kategori';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(pkg);
    }
    return grouped;
  }, [packages, regionFilter]);

  const packagesByRegionCategory = useMemo(() => {
    // Only used when no regionFilter applied: show separate boxes per region
    const byRegion: Record<string, Record<string, Package[]>> = {};
    const label = (r?: string | null) => r === 'bandung' ? 'Bandung' : r === 'jabodetabek' ? 'Jabodetabek' : r === 'banten' ? 'Banten' : 'Tanpa Wilayah';
    for (const pkg of packages) {
        const rl = label(pkg.region as any);
        if (!byRegion[rl]) byRegion[rl] = {};
        const cat = pkg.category || 'Tanpa Kategori';
        if (!byRegion[rl][cat]) byRegion[rl][cat] = [];
        byRegion[rl][cat].push(pkg);
    }
    return byRegion;
  }, [packages]);
  // removed combined region view

  const existingRegions = useMemo(() => {
    const set = new Set<string>();
    for (const p of packages) {
      if (p.region && String(p.region).trim() !== '') set.add(String(p.region));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [packages]);
  const unionRegions = useMemo(() => {
    const base = REGIONS.map(r => r.value);
    const extra = existingRegions.filter(er => !base.includes(er));
    return [
      ...REGIONS.map(r => ({ value: r.value, label: r.label })),
      ...extra.map(er => ({ value: er, label: titleCase(er) })),
    ];
  }, [existingRegions]);


  // --- Package Handlers ---
  const handlePackageInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPackageFormData(prev => ({...prev, [name]: value}));
  };
  
   const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const file = e.target.files[0];
                // Check file size (max 2MB)
                if (file.size > 2 * 1024 * 1024) {
                    alert('Ukuran file tidak boleh melebihi 2MB');
                    e.target.value = ''; // Reset the input
                    return;
                }
                // Check file type
                if (!file.type.match('image.*')) {
                    alert('Hanya file gambar yang diperbolehkan');
                    e.target.value = ''; // Reset the input
                    return;
                }
                const base64 = await toBase64(file);
                setPackageFormData(prev => ({ ...prev, coverImage: base64 }));
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Terjadi kesalahan saat mengunggah gambar. Silakan coba lagi.');
                e.target.value = ''; // Reset the input
            }
        }
    };

  const handlePhysicalItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const list = [...packageFormData.physicalItems];
    list[index] = { ...list[index], [name]: value };
    setPackageFormData(prev => ({ ...prev, physicalItems: list }));
  };

  const addPhysicalItem = () => {
    setPackageFormData(prev => ({ ...prev, physicalItems: [...prev.physicalItems, { name: '', price: '' }] }));
  };

  const removePhysicalItem = (index: number) => {
    const list = [...packageFormData.physicalItems];
    list.splice(index, 1);
    setPackageFormData(prev => ({ ...prev, physicalItems: list }));
  };
  
  const handleDigitalItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const list = [...packageFormData.digitalItems];
    list[index] = value;
    setPackageFormData(prev => ({ ...prev, digitalItems: list }));
  };

  const addDigitalItem = () => {
    setPackageFormData(prev => ({ ...prev, digitalItems: [...prev.digitalItems, ''] }));
  };

  const removeDigitalItem = (index: number) => {
    const list = [...packageFormData.digitalItems];
    list.splice(index, 1);
    setPackageFormData(prev => ({ ...prev, digitalItems: list }));
  };


  const handlePackageCancelEdit = () => {
    setPackageEditMode(null);
    setPackageFormData(emptyPackageForm);
  }

  const handlePackageEdit = (pkg: Package) => {
    setPackageEditMode(pkg.id);
    setPackageFormData({
        name: pkg.name,
        price: pkg.price.toString(),
        category: pkg.category,
        region: (pkg.region || '') as any,
        processingTime: pkg.processingTime,
        photographers: pkg.photographers || '',
        videographers: pkg.videographers || '',
        physicalItems: pkg.physicalItems.length > 0 ? pkg.physicalItems.map(item => ({...item, price: item.price.toString()})) : [{ name: '', price: '' }],
        digitalItems: pkg.digitalItems.length > 0 ? pkg.digitalItems : [''],
        coverImage: pkg.coverImage || '',
        durationOptions: (pkg.durationOptions && pkg.durationOptions.length > 0)
            ? pkg.durationOptions.map(o => ({ label: o.label, price: o.price.toString(), default: o.default }))
            : [{ label: '', price: '' as string | number, default: true }],
    });
  }

  const handlePackageDelete = async (pkgId: string) => {
    const isPackageInUse = projects.some(p => p.packageId === pkgId);
    if (isPackageInUse) {
        alert("Paket ini tidak dapat dihapus karena sedang digunakan oleh satu atau lebih proyek. Hapus atau ubah proyek tersebut terlebih dahulu.");
        return;
    }

    if (!window.confirm("Apakah Anda yakin ingin menghapus paket ini?")) return;
    try {
        await deletePackageRow(pkgId);
        setPackages(prev => prev.filter(p => p.id !== pkgId));
    } catch (e) {
        alert('Gagal menghapus paket di database. Coba lagi.');
    }
  }

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasValidOptionsPre = Array.isArray(packageFormData.durationOptions) && packageFormData.durationOptions.some((o: any) => String(o.label||'').trim() !== '' && String(o.price||'') !== '');
    if (!packageFormData.name || (!hasValidOptionsPre && !packageFormData.price)) {
        alert('Nama Paket wajib diisi. Jika tidak mengisi Opsi Durasi, maka Harga (IDR) wajib diisi.');
        return;
    }

    // Determine final base price: if duration options exist, base price mirrors the default option
    const hasValidOptions = Array.isArray(packageFormData.durationOptions) && packageFormData.durationOptions.some((o: any) => String(o.label||'').trim() !== '' && String(o.price||'') !== '');
    const defaultOption = hasValidOptions ? (packageFormData.durationOptions.find((o: any) => o.default) || packageFormData.durationOptions.find((o: any) => String(o.label||'').trim() !== '' && String(o.price||'') !== '')) : null;
    const computedBasePrice = defaultOption ? Number(defaultOption.price || 0) : Number(packageFormData.price || 0);

    const packageData: Omit<Package, 'id'> = {
        name: packageFormData.name,
        price: computedBasePrice,
        category: packageFormData.category,
        region: packageFormData.region ? String(packageFormData.region).trim().toLowerCase() : undefined,
        processingTime: packageFormData.processingTime,
        photographers: packageFormData.photographers,
        videographers: packageFormData.videographers,
        physicalItems: packageFormData.physicalItems
            .filter((item: PhysicalItem) => typeof item.name === 'string' && item.name.trim() !== '')
            .map((item: { name: string, price: string | number }) => ({ ...item, name: item.name, price: Number(item.price || 0) })),
        digitalItems: packageFormData.digitalItems.filter((item: string) => item.trim() !== ''),
        coverImage: packageFormData.coverImage,
        durationOptions: Array.isArray(packageFormData.durationOptions)
            ? packageFormData.durationOptions
                .filter((opt: any) => String(opt.label || '').trim() !== '' && Number(opt.price) >= 0)
                .map((opt: any, i: number) => ({ label: String(opt.label).trim(), price: Number(opt.price), default: !!opt.default }))
            : undefined,
    };
    
    try {
        if (packageEditMode !== 'new' && packageEditMode) {
            try {
                const updated = await updatePackageRow(packageEditMode, packageData);
                setPackages(prev => prev.map(p => p.id === packageEditMode ? updated : p));
            } catch (e: any) {
                console.warn('[Supabase][packages.update] gagal, fallback create. Detail:', e);
                // Kemungkinan paket lama hanya lokal (belum ada row di DB). Coba create baru lalu replace di state.
                const created = await createPackageRow(packageData as any);
                setPackages(prev => prev.map(p => p.id === packageEditMode ? created : p));
            }
        } else {
            const created = await createPackageRow(packageData as any);
            setPackages(prev => [...prev, created]);
        }
    } catch (err: any) {
        console.error('[Supabase][packages.save] error:', err);
        alert(`Gagal menyimpan paket ke database. ${err?.message || 'Coba lagi.'}`);
        return;
    }

    handlePackageCancelEdit();
  };

  // --- AddOn Handlers ---
  const handleAddOnInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddOnFormData(prev => ({...prev, [name]: value}));
  };
  
    const handleAddOnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addOnFormData.name || !addOnFormData.price) {
            alert('Nama Add-On dan Harga tidak boleh kosong.');
            return;
        }

        const addOnData: Omit<AddOn, 'id'> = {
            name: addOnFormData.name,
            price: Number(addOnFormData.price),
            region: addOnFormData.region ? String(addOnFormData.region).trim().toLowerCase() : undefined,
        };
        
        try {
            if (addOnEditMode) {
                try {
                    const updated = await updateAddOnRow(addOnEditMode, addOnData);
                    setAddOns(prev => prev.map(a => a.id === addOnEditMode ? updated : a));
                } catch (e: any) {
                    console.warn('[Supabase][addOns.update] gagal, fallback create. Detail:', e);
                    const created = await createAddOnRow(addOnData as any);
                    setAddOns(prev => prev.map(a => a.id === addOnEditMode ? created : a));
                }
            } else {
                const created = await createAddOnRow(addOnData as any);
                setAddOns(prev => [...prev, created]);
            }
        } catch (err: any) {
            console.error('[Supabase][addOns.save] error:', err);
            alert(`Gagal menyimpan add-on ke database. ${err?.message || 'Coba lagi.'}`);
            return;
        }

        handleAddOnCancelEdit();
    };

  const handleAddOnCancelEdit = () => {
    setAddOnEditMode(null);
    setAddOnFormData(emptyAddOnForm);
  }

  const handleAddOnEdit = (addOn: AddOn) => {
    setAddOnEditMode(addOn.id);
    setAddOnFormData({
        name: addOn.name,
        price: addOn.price.toString(),
        region: (addOn.region || '') as any,
    });
  }

  const handleAddOnDelete = async (addOnId: string) => {
    const isAddOnInUse = projects.some(p => p.addOns.some(a => a.id === addOnId));
    if (isAddOnInUse) {
        alert("Add-on ini tidak dapat dihapus karena sedang digunakan oleh satu atau lebih proyek. Hapus atau ubah proyek tersebut terlebih dahulu.");
        return;
    }

    if (!window.confirm("Apakah Anda yakin ingin menghapus add-on ini?")) return;
    try {
        await deleteAddOnRow(addOnId);
        setAddOns(prev => prev.filter(p => p.id !== addOnId));
    } catch (e) {
        alert('Gagal menghapus add-on di database. Coba lagi.');
    }
  };

  return (
        <div className="space-y-6">
            <PageHeader title="Paket Foto" subtitle="Kelola semua paket layanan dan item tambahan yang Anda tawarkan.">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary">Pelajari Halaman Ini</button>
                    <button onClick={() => setIsShareModalOpen(true)} className="button-secondary inline-flex items-center gap-2">
                        <Share2Icon className="w-4 h-4" /> Bagikan Halaman Paket
                    </button>
                    <button onClick={() => setPackageEditMode('new')} className="button-primary inline-flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/> Tambah Paket
                    </button>
                </div>
            </PageHeader>
            <div className="flex flex-wrap gap-2 -mt-3">
                {unionRegions.map(r => (
                    <button
                        key={r.value}
                        onClick={() => setRegionFilter(r.value as any)}
                        className={`px-3 py-1 rounded-full text-sm border ${regionFilter === (r.value as any) ? 'bg-brand-accent text-white border-brand-accent' : 'bg-brand-surface border-brand-border text-brand-text-secondary hover:text-brand-text-light'}`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    {(Object.entries(packagesByCategory) as [string, Package[]][]).map(([category, pkgs]) => (
                        <div key={category}>
                            <h3 className="text-lg md:text-xl font-bold text-gradient mb-3 md:mb-4">{category}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {pkgs.map(pkg => (
                                    <div key={pkg.id} className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border flex flex-col overflow-hidden">
                                        {pkg.coverImage ? (
                                            <img src={pkg.coverImage} alt={pkg.name} className="w-full h-32 md:h-40 object-cover" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-32 md:h-40 bg-brand-bg flex items-center justify-center">
                                                <CameraIcon className="w-10 md:w-12 h-10 md:h-12 text-brand-text-secondary" />
                                            </div>
                                        )}
                                        <div className="p-3 md:p-4 flex-grow flex flex-col">
                                            <h4 className="font-bold text-sm md:text-base text-brand-text-light">{pkg.name}</h4>
                                            <p className="text-lg md:text-2xl font-bold text-brand-accent my-2">
                                                {pkg.durationOptions && pkg.durationOptions.length > 0 ? (
                                                    <span className="block text-xs md:text-sm text-brand-text-secondary">
                                                        {pkg.durationOptions.map((o, i) => `${o.label}: ${formatCurrency(o.price)}`).join(' · ')}
                                                    </span>
                                                ) : (
                                                    formatCurrency(pkg.price)
                                                )}
                                            </p>
                                            <p className="text-[10px] md:text-xs text-brand-text-secondary mb-2 md:mb-3">Waktu Pengerjaan: {pkg.processingTime}</p>
                                            <div className="text-xs md:text-sm space-y-2 flex-grow">
                                                {(pkg.photographers || pkg.videographers) && <div><h5 className="font-semibold text-brand-text-primary text-[10px] md:text-xs uppercase tracking-wider mb-1">Tim</h5><p className="text-brand-text-secondary">{[pkg.photographers, pkg.videographers].filter(Boolean).join(' & ')}</p></div>}
                                                {pkg.digitalItems.length > 0 && <div><h5 className="font-semibold text-brand-text-primary text-[10px] md:text-xs uppercase tracking-wider mb-1">Digital</h5><ul className="list-disc list-inside text-brand-text-secondary">{pkg.digitalItems.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
                                                {pkg.physicalItems.length > 0 && <div><h5 className="font-semibold text-brand-text-primary text-[10px] md:text-xs uppercase tracking-wider mb-1">Outfut Pisik</h5><ul className="list-disc list-inside text-brand-text-secondary">{pkg.physicalItems.map((item, i) => <li key={i}>{item.name}</li>)}</ul></div>}
                                            </div>
                                            <div className="flex gap-2 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-brand-border">
                                                <button onClick={() => handlePackageEdit(pkg)} className="button-secondary flex-1 text-xs md:text-sm">Edit</button>
                                                <button onClick={() => handlePackageDelete(pkg.id)} className="button-secondary text-brand-danger border-brand-danger hover:bg-brand-danger/10 flex-shrink-0 px-2 md:px-3"><Trash2Icon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                        <h3 className="font-semibold text-sm md:text-base text-brand-text-light p-3 md:p-4 border-b border-brand-border">Add-Ons</h3>
                        <div className="p-3 md:p-4 space-y-2 max-h-60 overflow-y-auto">
                            {(regionFilter ? addOns.filter(a => a.region === regionFilter) : addOns).map(addon => (
                                <div key={addon.id} className="flex justify-between items-center bg-brand-bg p-2 rounded-md text-xs md:text-sm">
                                    <span className="text-brand-text-primary">{addon.name} - {formatCurrency(addon.price)}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleAddOnEdit(addon)} className="p-1.5 text-brand-text-secondary hover:text-brand-accent"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleAddOnDelete(addon.id)} className="p-1.5 text-brand-text-secondary hover:text-brand-danger"><Trash2Icon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAddOnSubmit} className="p-3 md:p-4 border-t border-brand-border space-y-2">
                             <div className="input-group">
                                <input type="text" id="addOnName" name="name" value={addOnFormData.name} onChange={handleAddOnInputChange} className="input-field" placeholder=" " required />
                                <label htmlFor="addOnName" className="input-label">{addOnEditMode ? 'Edit Nama' : 'Nama Add-On Baru'}</label>
                            </div>
                             <div className="input-group">
                                <input type="number" id="addOnPrice" name="price" value={addOnFormData.price} onChange={handleAddOnInputChange} className="input-field" placeholder=" " required />
                                <label htmlFor="addOnPrice" className="input-label">Harga</label>
                            </div>
                            <div className="input-group">
                                <input
                                    type="text"
                                    id="addOnRegion"
                                    name="region"
                                    list="region-suggestions"
                                    value={addOnFormData.region}
                                    onChange={handleAddOnInputChange}
                                    className="input-field"
                                    placeholder=" "
                                />
                                <label htmlFor="addOnRegion" className="input-label">Wilayah (opsional)</label>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {unionRegions.map(r => (
                                    <button type="button" key={r.value} onClick={() => setAddOnFormData(prev => ({...prev, region: r.value}))} className={`px-2 py-1 rounded-full text-xs border ${addOnFormData.region === r.value ? 'bg-brand-accent text-white border-brand-accent' : 'bg-brand-bg border-brand-border text-brand-text-secondary hover:text-brand-text-light'}`}>{r.label}</button>
                                ))}
                                {addOnFormData.region && (
                                    <button type="button" onClick={() => setAddOnFormData(prev => ({...prev, region: ''}))} className="px-2 py-1 rounded-full text-xs border bg-brand-bg border-brand-border text-brand-danger">Kosongkan</button>
                                )}
                            </div>
                            <div className="flex gap-2 justify-end">
                                {addOnEditMode && <button type="button" onClick={handleAddOnCancelEdit} className="button-secondary text-sm">Batal</button>}
                                <button type="submit" className="button-primary text-sm">{addOnEditMode ? 'Update' : 'Tambah'}</button>
                            </div>
                        </form>
                    </div>
                </aside>
            </div>

            <Modal isOpen={packageEditMode !== null} onClose={handlePackageCancelEdit} title={packageEditMode === 'new' ? 'Tambah Paket Baru' : 'Edit Paket'} size="3xl">
                <form onSubmit={handlePackageSubmit} className="space-y-5 md:space-y-6 max-h-[70vh] overflow-y-auto pr-2 pb-4 form-compact form-compact--ios-scale">
                    {/* Section 1: Informasi Dasar */}
                    <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                        <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Informasi Dasar Paket</h4>
                        <p className="text-xs text-brand-text-secondary mb-4">Masukkan nama dan harga paket layanan Anda. Nama harus jelas dan menarik untuk klien.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="input-group"><input type="text" name="name" value={packageFormData.name} onChange={handlePackageInputChange} className="input-field" placeholder=" " required /><label className="input-label">Nama Paket</label></div>
                            {(() => {
                                const hasValidOptions = Array.isArray(packageFormData.durationOptions) && packageFormData.durationOptions.some((o: any) => String(o.label||'').trim() !== '' && String(o.price||'') !== '');
                                if (hasValidOptions) {
                                    const def = packageFormData.durationOptions.find((o: any) => o.default) || packageFormData.durationOptions.find((o: any) => String(o.label||'').trim() !== '' && String(o.price||'') !== '');
                                    return (
                                        <div className="input-group">
                                            <input type="text" className="input-field" value={def ? `${def.label}: ${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(def.price||0))}` : 'Mengikuti opsi durasi default'} disabled placeholder=" "/>
                                            <label className="input-label">Harga (mengikuti opsi default)</label>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="input-group"><input type="number" name="price" value={packageFormData.price} onChange={handlePackageInputChange} className="input-field" placeholder=" " required /><label className="input-label">Harga (IDR)</label></div>
                                );
                            })()}
                        </div>
                    </section>

                    {/* Section 2: Opsi Durasi */}
                    <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                        <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Opsi Durasi & Harga (Opsional)</h4>
                        <p className="text-xs text-brand-text-secondary mb-3">Tambahkan variasi durasi seperti 2 Jam, 4 Jam, 8 Jam, Full Day dengan harga berbeda. Pilih satu sebagai default. Jika tidak ada opsi, sistem akan menggunakan harga dasar di atas.</p>
                        {packageFormData.durationOptions?.map((opt: any, index: number) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mt-2">
                                <input type="text" value={opt.label} onChange={e => handleDurationOptionChange(index, 'label', e.target.value)} className="input-field md:col-span-2" placeholder="Label (cth: 8 Jam / Full Day)" />
                                <input type="number" value={opt.price} onChange={e => handleDurationOptionChange(index, 'price', e.target.value)} className="input-field md:col-span-2" placeholder="Harga" />
                                <label className="flex items-center gap-2 text-sm text-brand-text-secondary"><input type="radio" name="durationDefault" checked={!!opt.default} onChange={() => handleDurationOptionChange(index, 'default', true)} /> Default</label>
                                <button type="button" onClick={() => removeDurationOption(index)} className="p-2 text-brand-danger md:col-span-1 justify-self-end"><Trash2Icon className="w-4 h-4"/></button>
                            </div>
                        ))}
                        <button type="button" onClick={addDurationOption} className="text-sm font-semibold text-brand-accent mt-3">+ Tambah Opsi Durasi</button>
                    </section>

                    {/* Section 3: Kategori & Wilayah */}
                    <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                        <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Kategori & Wilayah</h4>
                        <p className="text-xs text-brand-text-secondary mb-4">Pilih kategori paket dan tentukan wilayah layanan. Wilayah membantu klien menemukan paket yang sesuai dengan lokasi mereka.</p>
                        <div className="input-group">
                            <select name="category" value={packageFormData.category} onChange={handlePackageInputChange} className="input-field" required>
                                <option value="">Pilih kategori...</option>
                                {(profile?.packageCategories || []).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <label className="input-label">Kategori</label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="input-group">
                                <input
                                    type="text"
                                    name="region"
                                    list="region-suggestions"
                                    value={packageFormData.region}
                                    onChange={handlePackageInputChange}
                                    className="input-field"
                                    placeholder=" "
                                />
                                <label className="input-label">Wilayah (opsional)</label>
                                <datalist id="region-suggestions">
                                    {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </datalist>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {[...REGIONS.map(r => r.value), ...existingRegions.filter(er => !REGIONS.some(r => r.value === er))].map(val => (
                                    <button type="button" key={val} onClick={() => setPackageFormData((prev:any) => ({...prev, region: val}))} className={`px-2 py-1 rounded-full text-xs border ${packageFormData.region === val ? 'bg-brand-accent text-white border-brand-accent' : 'bg-brand-bg border-brand-border text-brand-text-secondary hover:text-brand-text-light'}`}>{val.replace(/\b\w/g, c => c.toUpperCase())}</button>
                                  ))}
                                  {packageFormData.region && (
                                    <button type="button" onClick={() => setPackageFormData((prev:any) => ({...prev, region: ''}))} className="px-2 py-1 rounded-full text-xs border bg-brand-bg border-brand-border text-brand-danger">Kosongkan</button>
                                  )}
                                </div>
                            </div>
                            <div className="md:col-span-2" />
                        </div>
                    </section>

                    {/* Section 4: Detail Tim & Waktu */}
                    <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                        <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Detail Tim & Waktu Pengerjaan</h4>
                        <p className="text-xs text-brand-text-secondary mb-4">Informasi tentang waktu pengerjaan dan jumlah tim yang akan ditugaskan untuk paket ini.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="input-group"><input type="text" name="processingTime" value={packageFormData.processingTime} onChange={handlePackageInputChange} className="input-field" placeholder=" "/><label className="input-label">Waktu Pengerjaan</label></div>
                            <div className="input-group"><input type="text" name="photographers" value={packageFormData.photographers} onChange={handlePackageInputChange} className="input-field" placeholder=" "/><label className="input-label">Jumlah Fotografer</label></div>
                            <div className="input-group"><input type="text" name="videographers" value={packageFormData.videographers} onChange={handlePackageInputChange} className="input-field" placeholder=" "/><label className="input-label">Jumlah Videografer</label></div>
                        </div>
                    </section>

                    {/* Section 5: Cover Image */}
                    <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                        <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Gambar Sampul</h4>
                        <p className="text-xs text-brand-text-secondary mb-4">Upload gambar menarik untuk mempromosikan paket Anda di halaman publik.</p>
                        <div className="input-group"><label className="input-label !static !-top-4 !text-brand-accent">Cover Image</label><input type="file" onChange={handleCoverImageChange} className="input-field" accept="image/*" /></div>
                    </section>

                    {/* Section 6: Item Digital */}
                    <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                        <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Item Digital</h4>
                        <p className="text-xs text-brand-text-secondary mb-3">Daftar file digital yang akan diterima klien, seperti foto edited, video cinematic, dll.</p>
                        {packageFormData.digitalItems.map((item: string, index: number) => (
                            <div key={index} className="flex flex-col md:flex-row items-stretch md:items-center gap-2 mt-2">
                                <input type="text" value={item} onChange={e => handleDigitalItemChange(index, e)} className="input-field flex-grow" placeholder="Contoh: 300 Foto Edited" />
                                <button type="button" onClick={() => removeDigitalItem(index)} className="button-secondary !px-3 !py-2 text-brand-danger self-end md:self-center"><Trash2Icon className="w-4 h-4"/></button>
                            </div>
                        ))}
                        <button type="button" onClick={addDigitalItem} className="text-sm font-semibold text-brand-accent mt-3">+ Tambah Item Digital</button>
                    </section>

                    {/* Section 7: Item Output Fisik */}
                    <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                        <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Item Output Fisik</h4>
                        <p className="text-xs text-brand-text-secondary mb-3">Produk fisik yang akan dicetak, seperti album, frame, canvas, dll beserta harganya.</p>
                        {packageFormData.physicalItems.map((item: {name: string, price: string|number}, index: number) => (
                            <div key={index} className="flex flex-col md:flex-row items-stretch md:items-center gap-2 mt-2">
                                <input type="text" name="name" value={item.name} onChange={e => handlePhysicalItemChange(index, e)} className="input-field flex-grow" placeholder="Nama Item (cth: Album 20x30)" />
                                <input type="number" name="price" value={item.price} onChange={e => handlePhysicalItemChange(index, e)} className="input-field md:w-40" placeholder="Harga" />
                                <button type="button" onClick={() => removePhysicalItem(index)} className="button-secondary !px-3 !py-2 text-brand-danger self-end md:self-center"><Trash2Icon className="w-4 h-4"/></button>
                            </div>
                        ))}
                        <button type="button" onClick={addPhysicalItem} className="text-sm font-semibold text-brand-accent mt-3">+ Tambah Item Fisik</button>
                    </section>

                    <div className="flex flex-col md:flex-row justify-end items-stretch md:items-center gap-3 pt-6 border-t border-brand-border sticky bottom-0 bg-brand-surface">
                        <button type="button" onClick={handlePackageCancelEdit} className="button-secondary w-full md:w-auto order-2 md:order-1">Batal</button>
                        <button type="submit" className="button-primary w-full md:w-auto order-1 md:order-2 active:scale-95 transition-transform">{packageEditMode === 'new' ? 'Simpan' : 'Update'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Tautan Booking per Wilayah">
                <div className="space-y-4">
                    <p className="text-sm text-brand-text-secondary mb-4">
                        Bagikan tautan booking khusus untuk setiap wilayah. Setiap tautan akan menampilkan paket dan add-ons yang sesuai dengan wilayah tersebut.
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                        {unionRegions.map(r => (
                            <div key={r.value} className="space-y-2">
                                <div className="input-group">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={`${window.location.origin}${window.location.pathname}#/public-booking?region=${r.value}`} 
                                        className="input-field !bg-brand-input text-xs sm:text-sm" 
                                        onClick={(e) => {
                                            e.currentTarget.select();
                                            navigator.clipboard.writeText(e.currentTarget.value);
                                        }}
                                    />
                                    <label className="input-label">Booking - {r.label}</label>
                                </div>
                                <p className="text-xs text-brand-text-secondary pl-1">
                                    Tautan khusus untuk wilayah {r.label}. Klik untuk menyalin.
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Panduan Halaman Paket">
                <div className="space-y-4 text-sm text-brand-text-primary">
                    <p>Halaman ini adalah tempat Anda membuat dan mengelola semua penawaran produk Anda.</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Paket:</strong> Kolom utama di kiri menampilkan semua paket layanan Anda, dikelompokkan berdasarkan kategori. Anda dapat menambah, mengedit, atau menghapus paket.</li>
                        <li><strong>Add-Ons:</strong> Kolom di kanan adalah untuk item tambahan yang bisa dipilih klien, seperti drone, MUA, dll.</li>
                        <li><strong>Cover Image:</strong> Anda bisa menambahkan gambar sampul untuk setiap paket agar lebih menarik secara visual di halaman publik.</li>
                        <li><strong>Bagikan Halaman Paket:</strong> Gunakan tombol di kanan atas untuk mendapatkan tautan ke halaman publik yang menampilkan semua paket Anda, siap untuk dibagikan kepada calon klien.</li>
                        <li><strong>Kategori:</strong> Kategori untuk paket dapat dikelola di halaman <strong>Pengaturan &gt; Kustomisasi Kategori</strong>.</li>
                    </ul>
                </div>
            </Modal>
        </div>
    );
};

export default Packages;
