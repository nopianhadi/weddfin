# 📊 StatCard dengan Modal Detail - Panduan Penggunaan

## ✨ Fitur Baru

Setiap **StatCard** sekarang dapat diklik untuk menampilkan **modal detail** dengan deskripsi lengkap dan konten tambahan!

---

## 🎯 Cara Menggunakan

### 1. **StatCard dengan Description**

```tsx
<StatCard 
    icon={<DollarSignIcon className="w-6 h-6" />} 
    title="Total Saldo" 
    value={formatCurrency(summary.totalBalance)} 
    subtitle="Saldo semua kartu & kas" 
    colorVariant="blue"
    description="Deskripsi detail tentang total saldo..."
    onClick={() => setActiveModal('balance')}
/>
```

### 2. **StatCardModal untuk Detail**

```tsx
<StatCardModal
    isOpen={activeModal === 'balance'}
    onClose={() => setActiveModal(null)}
    icon={<DollarSignIcon className="w-6 h-6" />}
    title="Total Saldo"
    value={formatCurrency(summary.totalBalance)}
    subtitle="Saldo semua kartu & kas"
    colorVariant="blue"
    description="Deskripsi lengkap dengan line breaks..."
>
    {/* Konten tambahan seperti list, chart, dll */}
    <div className="space-y-3">
        {cards.map(card => (
            <div key={card.id} className="p-3 bg-brand-bg rounded-lg">
                <p>{card.bankName}</p>
                <p>{formatCurrency(card.balance)}</p>
            </div>
        ))}
    </div>
</StatCardModal>
```

---

## 📋 Props StatCard

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | ReactNode | ✅ | Icon untuk card |
| `title` | string | ✅ | Judul card |
| `value` | string | ✅ | Nilai utama (angka/text) |
| `subtitle` | string | ❌ | Subtitle di bawah title |
| `colorVariant` | string | ❌ | 'blue', 'orange', 'purple', 'pink', 'green', 'default' |
| `description` | string | ❌ | **BARU!** Deskripsi untuk modal |
| `onClick` | function | ❌ | **BARU!** Handler ketika card diklik |
| `change` | string | ❌ | Perubahan (contoh: "+12%") |
| `changeType` | string | ❌ | 'increase' atau 'decrease' |

---

## 📋 Props StatCardModal

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | boolean | ✅ | Status modal terbuka/tutup |
| `onClose` | function | ✅ | Handler untuk tutup modal |
| `icon` | ReactNode | ✅ | Icon untuk header modal |
| `title` | string | ✅ | Judul modal |
| `value` | string | ✅ | Nilai utama di header |
| `subtitle` | string | ❌ | Subtitle di header |
| `colorVariant` | string | ❌ | Warna tema modal |
| `description` | string | ❌ | Deskripsi detail (support line breaks dengan \n) |
| `children` | ReactNode | ❌ | Konten tambahan (list, chart, dll) |

---

## 🎨 Color Variants

- **blue** - Untuk data keuangan/saldo
- **purple** - Untuk proyek
- **green** - Untuk klien/success metrics
- **orange** - Untuk tim/freelancer
- **pink** - Untuk pembayaran/urgent
- **default** - Warna standar

---

## 💡 Contoh Implementasi

### Dashboard.tsx (Sudah Diterapkan)

```tsx
// 1. Import
import StatCard from './StatCard';
import StatCardModal from './StatCardModal';

// 2. State untuk modal
const [activeModal, setActiveModal] = useState<string | null>(null);

// 3. StatCard dengan onClick
<StatCard 
    icon={<DollarSignIcon className="w-6 h-6" />} 
    title="Total Saldo" 
    value={formatCurrency(summary.totalBalance)} 
    subtitle="Saldo semua kartu & kas" 
    colorVariant="blue"
    description="Total saldo mencakup semua kartu..."
    onClick={() => setActiveModal('balance')}
/>

// 4. Modal untuk detail
<StatCardModal
    isOpen={activeModal === 'balance'}
    onClose={() => setActiveModal(null)}
    icon={<DollarSignIcon className="w-6 h-6" />}
    title="Total Saldo"
    value={formatCurrency(summary.totalBalance)}
    subtitle="Saldo semua kartu & kas"
    colorVariant="blue"
    description="Total saldo mencakup semua kartu..."
>
    {/* List kartu */}
    <div className="space-y-3">
        {cards.map(card => (
            <div key={card.id} className="p-3 bg-brand-bg rounded-lg">
                <p>{card.bankName}</p>
                <p>{formatCurrency(card.balance)}</p>
            </div>
        ))}
    </div>
</StatCardModal>
```

---

## 🚀 Cara Menerapkan di Halaman Lain

### 1. Projects.tsx

```tsx
<StatCard 
    icon={<FolderKanbanIcon className="w-6 h-6"/>} 
    title="Nilai Proyek Aktif" 
    value={formatCurrency(stats.totalActiveValue)} 
    subtitle="Total nilai proyek berjalan" 
    colorVariant="blue"
    description="Nilai total dari semua proyek yang sedang aktif..."
    onClick={() => setActiveStatModal('value')}
/>

<StatCardModal
    isOpen={activeStatModal === 'value'}
    onClose={() => setActiveStatModal(null)}
    icon={<FolderKanbanIcon className="w-6 h-6"/>}
    title="Nilai Proyek Aktif"
    value={formatCurrency(stats.totalActiveValue)}
    colorVariant="blue"
    description="Nilai total dari semua proyek yang sedang aktif..."
>
    {/* List proyek */}
</StatCardModal>
```

### 2. Finance.tsx

```tsx
<StatCard 
    icon={<CreditCardIcon className="w-6 h-6" />} 
    title="Total Utang Kartu Kredit" 
    value={formatCurrency(Math.abs(cardStats.creditDebt))} 
    subtitle="Saldo negatif kartu kredit" 
    colorVariant="pink"
    description="Total utang dari semua kartu kredit Anda..."
    onClick={() => setActiveStatModal('debt')}
/>
```

### 3. Clients.tsx

```tsx
<StatCard 
    icon={<UsersIcon className="w-6 h-6"/>} 
    title="Total Klien" 
    value={clientStats.totalClients.toString()} 
    subtitle="Semua klien terdaftar" 
    colorVariant="blue"
    description="Total klien yang terdaftar dalam sistem..."
    onClick={() => setActiveStatModal('total')}
/>
```

---

## ✅ Sudah Diterapkan di:

- ✅ **Dashboard.tsx** - 4 StatCard dengan modal detail
  - Total Saldo
  - Proyek Aktif
  - Klien Aktif
  - Total Freelancer

---

## 📝 Tips

1. **Description dengan Line Breaks**: Gunakan `\n` untuk line breaks
   ```tsx
   description="Baris 1\n\nBaris 2\n• Bullet point"
   ```

2. **Konten Dinamis**: Gunakan template literals untuk data dinamis
   ```tsx
   description={`Total: ${total}\nAktif: ${active}`}
   ```

3. **Children untuk List**: Gunakan children untuk menampilkan list detail
   ```tsx
   <StatCardModal ...>
       <div className="space-y-3">
           {items.map(item => <div>...</div>)}
       </div>
   </StatCardModal>
   ```

4. **Navigasi dari Modal**: Tambahkan onClick pada item untuk navigasi
   ```tsx
   <div onClick={() => { 
       setActiveModal(null); 
       handleNavigation(ViewType.PROJECTS); 
   }}>
   ```

---

## 🎉 Hasil

Sekarang setiap StatCard dapat diklik untuk menampilkan:
- ✅ Icon dan value yang lebih besar
- ✅ Deskripsi detail lengkap
- ✅ List/chart/konten tambahan
- ✅ Animasi smooth
- ✅ Design konsisten dengan tema

**User experience lebih baik dengan informasi yang lebih lengkap!** 🚀
