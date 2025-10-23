import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus, ContactChannel, Profile, PublicLeadFormProps } from '../types';
import { createLead } from '../services/leads';
import { cleanPhoneNumber } from '../constants';

const PublicLeadForm: React.FC<PublicLeadFormProps> = ({ setLeads, userProfile, showNotification }) => {
    const [formState, setFormState] = useState({
        name: '',
        whatsapp: '',
        eventType: userProfile.projectTypes[0] || '',
        eventDate: '',
        eventLocation: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const template = userProfile?.publicPageConfig?.template || 'classic';

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const notes = `Jenis Acara: ${formState.eventType}\nTanggal Acara: ${new Date(formState.eventDate).toLocaleDateString('id-ID')}\nLokasi Acara: ${formState.eventLocation}`;

        try {
            const created = await createLead({
                name: formState.name,
                whatsapp: formState.whatsapp,
                contactChannel: ContactChannel.WEBSITE,
                location: formState.eventLocation,
                status: LeadStatus.DISCUSSION,
                date: new Date().toISOString(),
                notes,
            });
            setLeads(prev => [created, ...prev]);
            setIsSubmitted(true);
            showNotification('Prospek baru diterima dari formulir web.');
        } catch (err: any) {
            alert('Gagal mengirim formulir. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Simple logo for branding
    const Logo = () => (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="#FFF27A"/>
            <path d="M15.44 26L12 19.6667L15.44 13.3333H22.32L25.76 19.6667L22.32 26H15.44ZM17.18 23.8333H20.58L22.32 20.5833L20.58 17.3333H17.18L15.44 20.5833L17.18 23.8333Z" fill="#1E1E21"/>
        </svg>
    );

    if (isSubmitted) {
        return (
            <div className={`template-wrapper template-${template} flex items-center justify-center min-h-screen p-4`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                `}</style>
                <div className="w-full max-w-lg p-8 text-center bg-public-surface rounded-2xl shadow-lg border border-public-border">
                    <div className="mb-6">
                        <svg className="w-20 h-20 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gradient mb-4">Terima Kasih! 🎉</h1>
                    <p className="text-base text-public-text-primary leading-relaxed mb-6">
                        Formulir Anda telah berhasil kami terima. Tim kami akan segera menghubungi Anda melalui WhatsApp untuk diskusi lebih lanjut.
                    </p>
                    <a
                        href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=Halo%20${encodeURIComponent(userProfile.companyName || '')}%2C%20saya%20sudah%20mengisi%20formulir%20prospek.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Konfirmasi via WhatsApp
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={`template-wrapper template-${template} flex items-center justify-center min-h-screen p-4`} style={{ fontFamily: 'Poppins, sans-serif' }}>
             <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                
                .template-wrapper { 
                    background-color: var(--public-bg); 
                    color: var(--public-text-primary);
                    font-family: 'Poppins', sans-serif;
                }
                .template-classic .form-container { max-width: 42rem; width: 100%; margin: auto; }
                .template-modern .form-container { max-width: 56rem; width: 100%; margin: auto; display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; align-items: center; }
                .template-gallery .form-container { max-width: 36rem; width: 100%; margin: auto; }
                @media (max-width: 768px) { .template-modern .form-container { grid-template-columns: 1fr; } }
            `}</style>
            <div className="form-container">
                {template === 'modern' && (
                    <div className="p-8 hidden md:block">
                        {userProfile.logoBase64 ? <img src={userProfile.logoBase64} alt="logo" className="h-12 mb-4" /> : <h2 className="text-2xl font-bold text-gradient">{userProfile.companyName}</h2>}
                        <p className="text-public-text-secondary text-sm mt-4">{userProfile.bio}</p>
                    </div>
                )}
                <div className="bg-public-surface p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-public-border">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <Logo />
                        </div>
                        <h1 className="text-3xl font-bold text-gradient">Formulir  {userProfile.companyName}</h1>
                        <div className="text-sm text-public-text-secondary mt-4 space-y-2">
                            <p>Hai! Terimakasih telah menghubungi #venapictures</p>
                            <p>Perkenalkan aku Nina! (๑•ᴗ•๑)♡</p>
                            <p>Untuk informasi mengenai pricelist dan availability, mohon mengisi data berikut ya!</p>
                            <p>Chat kamu akan di balas secepatnya! Terimakasih )</p>
                        </div>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {/* Info Section */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-2">
                            <p className="text-xs text-center text-public-text-secondary leading-relaxed">
                                Isi formulir di bawah ini dengan lengkap. Kami akan menghubungi Anda secepatnya untuk diskusi lebih lanjut! ✨
                            </p>
                        </div>

                        {/* Data Pribadi */}
                        <div>
                            <h3 className="text-sm font-semibold text-public-text-primary mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Data Pribadi
                            </h3>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="block text-xs text-public-text-secondary">Nama Lengkap</label>
                                    <input 
                                        type="text" 
                                        id="name" 
                                        name="name" 
                                        value={formState.name} 
                                        onChange={handleFormChange} 
                                        className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                        placeholder="Masukkan nama lengkap" 
                                        required 
                                    />
                                    <p className="text-xs text-public-text-secondary">Nama lengkap Anda atau pasangan</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="whatsapp" className="block text-xs text-public-text-secondary">Nomor WhatsApp</label>
                                    <input 
                                        type="tel" 
                                        id="whatsapp" 
                                        name="whatsapp" 
                                        value={formState.whatsapp} 
                                        onChange={handleFormChange} 
                                        className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                        placeholder="08123456789" 
                                        required 
                                    />
                                    <p className="text-xs text-public-text-secondary">Nomor aktif yang bisa dihubungi</p>
                                </div>
                            </div>
                        </div>

                        {/* Detail Acara */}
                        <div>
                            <h3 className="text-sm font-semibold text-public-text-primary mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Detail Acara
                            </h3>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="eventType" className="block text-xs text-public-text-secondary">Jenis Acara</label>
                                    <select 
                                        id="eventType" 
                                        name="eventType" 
                                        value={formState.eventType} 
                                        onChange={handleFormChange} 
                                        className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                        required
                                    >
                                        {userProfile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                    </select>
                                    <p className="text-xs text-public-text-secondary">Pilih jenis acara yang akan Anda adakan</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="eventDate" className="block text-xs text-public-text-secondary">Tanggal Acara</label>
                                    <input 
                                        type="date" 
                                        id="eventDate" 
                                        name="eventDate" 
                                        value={formState.eventDate} 
                                        onChange={handleFormChange} 
                                        className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                        required 
                                    />
                                    <p className="text-xs text-public-text-secondary">Kapan acara akan berlangsung?</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="eventLocation" className="block text-xs text-public-text-secondary">Lokasi (Kota)</label>
                                    <input 
                                        type="text" 
                                        id="eventLocation" 
                                        name="eventLocation" 
                                        value={formState.eventLocation} 
                                        onChange={handleFormChange} 
                                        className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                        placeholder="Jakarta, Bandung, dll" 
                                        required 
                                    />
                                    <p className="text-xs text-public-text-secondary">Kota atau venue tempat acara</p>
                                </div>
                            </div>
                        </div>

                        {/* Submit Section */}
                        <div className="pt-4 space-y-3">
                            <button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="w-full px-6 py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Mengirim...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Kirim Informasi
                                    </span>
                                )}
                            </button>
                            
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-public-border"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-2 bg-public-surface text-public-text-secondary">atau</span>
                                </div>
                            </div>

                            <a
                                href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=Halo%20${encodeURIComponent(userProfile.companyName || '')}%2C%20saya%20tertarik%20dengan%20layanan%20Anda.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 button-secondary text-center py-3 rounded-xl"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                Hubungi via WhatsApp
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PublicLeadForm;
