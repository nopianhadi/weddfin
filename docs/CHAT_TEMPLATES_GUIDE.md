# 📱 Panduan Chat Templates dengan Offline Support

## 🎯 Overview

Sistem chat templates yang telah diperbaiki dengan fitur:
- ✅ Offline support dengan IndexedDB
- ✅ Auto-sync ke Supabase
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Custom templates per user
- ✅ Default templates fallback
- ✅ Variable replacement
- ✅ Template validation

## 📁 File yang Dibuat

```
services/
└── chatTemplatesOffline.ts    # Service dengan offline support

hooks/
└── useChatTemplates.ts         # React hook untuk templates

components/
└── ChatTemplateManager.tsx     # UI untuk manage templates

docs/
└── CHAT_TEMPLATES_GUIDE.md     # Dokumentasi ini
```

## 🚀 Cara Menggunakan

### 1. Gunakan Hook di Component

```tsx
import { useChatTemplates } from '../hooks/useChatTemplates';

function MyComponent({ userProfile }) {
  const {
    templates,
    loading,
    error,
    isOnline,
    updateTemplate,
    addTemplate,
    deleteTemplate,
    processTemplate,
  } = useChatTemplates(userProfile);

  // Your component logic
}
```

### 2. Load Templates

```tsx
// Templates akan auto-load saat component mount
// Priority: User custom templates > Default templates

useEffect(() => {
  console.log('Templates loaded:', templates);
}, [templates]);
```

### 3. Add New Template

```tsx
const handleAddTemplate = async () => {
  try {
    await addTemplate({
      title: 'Welcome Message',
      template: 'Halo {clientName}, terima kasih telah memilih {companyName}!',
      category: 'Greeting',
    });
    
    showNotification('Template berhasil ditambahkan!');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 4. Update Template

```tsx
const handleUpdateTemplate = async (templateId: string) => {
  try {
    await updateTemplate(templateId, {
      title: 'Updated Title',
      template: 'Updated message...',
    });
    
    showNotification('Template berhasil diupdate!');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 5. Delete Template

```tsx
const handleDeleteTemplate = async (templateId: string) => {
  if (!confirm('Hapus template ini?')) return;
  
  try {
    await deleteTemplate(templateId);
    showNotification('Template berhasil dihapus!');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 6. Process Template dengan Variables

```tsx
const message = processTemplate(
  'Halo {clientName}, project {projectName} akan dilaksanakan pada {eventDate}',
  {
    clientName: 'John Doe',
    projectName: 'Wedding Photography',
    eventDate: '25 Desember 2024',
  }
);

// Result: "Halo John Doe, project Wedding Photography akan dilaksanakan pada 25 Desember 2024"
```

### 7. Reset to Default Templates

```tsx
const handleReset = async () => {
  if (!confirm('Reset ke template default?')) return;
  
  try {
    await resetToDefaults();
    showNotification('Template berhasil direset!');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 🎨 Menggunakan ChatTemplateManager Component

### Basic Usage

```tsx
import { ChatTemplateManager } from './components/ChatTemplateManager';

function SettingsPage({ userProfile, showNotification }) {
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  return (
    <>
      <button onClick={() => setShowTemplateManager(true)}>
        Kelola Chat Templates
      </button>

      {showTemplateManager && (
        <ChatTemplateManager
          userProfile={userProfile}
          onClose={() => setShowTemplateManager(false)}
          showNotification={showNotification}
        />
      )}
    </>
  );
}
```

## 📊 Template Structure

```typescript
interface ChatTemplate {
  id: string;              // Unique ID
  title: string;           // Template title
  template: string;        // Message template
  category?: string;       // Optional category
}
```

## 🔧 Available Variables

Variables yang bisa digunakan dalam template:

| Variable | Description | Example |
|----------|-------------|---------|
| `{clientName}` | Nama client | John Doe |
| `{projectName}` | Nama project | Wedding Photography |
| `{eventDate}` | Tanggal event | 25 Desember 2024 |
| `{location}` | Lokasi event | Bali |
| `{companyName}` | Nama perusahaan | Vena Pictures |
| `{portalLink}` | Link portal client | https://... |
| `{amount}` | Jumlah pembayaran | Rp 5.000.000 |

## 💡 Contoh Templates

### 1. Welcome Message

```
Halo {clientName}! 👋

Terima kasih telah memilih {companyName} untuk project {projectName}.

Kami sangat excited untuk bekerja sama dengan Anda!

Jika ada pertanyaan, jangan ragu untuk menghubungi kami.
```

### 2. Booking Confirmation

```
Halo {clientName},

Booking Anda untuk {projectName} telah dikonfirmasi! ✅

📅 Tanggal: {eventDate}
📍 Lokasi: {location}

Kami akan menghubungi Anda 3 hari sebelum acara untuk konfirmasi detail.

Terima kasih!
```

### 3. Payment Reminder

```
Halo {clientName},

Ini adalah pengingat pembayaran untuk project {projectName}.

💰 Jumlah: {amount}
📅 Jatuh tempo: {dueDate}

Silakan lakukan pembayaran melalui portal client:
{portalLink}

Terima kasih!
```

### 4. Follow-up Message

```
Halo {clientName},

Bagaimana kabar Anda? 😊

Kami ingin follow-up mengenai project {projectName}.

Apakah ada yang bisa kami bantu?

Silakan reply pesan ini atau hubungi kami kapan saja.
```

## 🎯 Best Practices

### 1. Gunakan Variable untuk Personalisasi

```tsx
// ❌ Bad - Hard-coded
const template = 'Halo John, terima kasih!';

// ✅ Good - Menggunakan variable
const template = 'Halo {clientName}, terima kasih!';
```

### 2. Kategorikan Templates

```tsx
// Gunakan category untuk organize templates
await addTemplate({
  title: 'Welcome Message',
  template: '...',
  category: 'Greeting', // Greeting, Reminder, Follow-up, dll
});
```

### 3. Validate Before Save

```tsx
const { valid, errors } = validateTemplate(template);

if (!valid) {
  showNotification(`Error: ${errors.join(', ')}`);
  return;
}

await addTemplate(template);
```

### 4. Handle Offline State

```tsx
const { isOnline } = useChatTemplates(userProfile);

if (!isOnline) {
  showNotification('Offline - Perubahan akan disinkronkan saat online');
}

await updateTemplate(id, updates);
```

### 5. Provide Fallback

```tsx
// Selalu provide fallback ke default templates
const templates = userProfile.chatTemplates?.length > 0
  ? userProfile.chatTemplates
  : CHAT_TEMPLATES;
```

## 🧪 Testing

### Test Offline Mode

1. Buka aplikasi
2. Set browser ke offline (DevTools → Network → Offline)
3. Tambah/edit/hapus template
4. Template tersimpan lokal
5. Set browser ke online
6. Template otomatis tersinkronisasi! ✨

### Test Variable Replacement

```tsx
const template = 'Halo {clientName}, project {projectName}';
const result = processTemplate(template, {
  clientName: 'John',
  projectName: 'Wedding',
});

console.log(result); // "Halo John, project Wedding"
```

### Test Validation

```tsx
const { valid, errors } = validateTemplate({
  id: 'test',
  title: '', // Empty title
  template: 'Test',
});

console.log(valid); // false
console.log(errors); // ["Title tidak boleh kosong"]
```

## 🔍 Debugging

### Check Templates in Cache

```javascript
// Browser console
const cached = await offlineStorage.getCachedData('chat_templates');
console.log('Cached templates:', cached);
```

### Check Pending Sync

```javascript
// Browser console
const ops = await offlineStorage.getPendingOperations();
const templateOps = ops.filter(op => op.table === 'profiles');
console.table(templateOps);
```

### Force Sync

```javascript
// Browser console
await syncManager.sync();
```

## 🐛 Troubleshooting

### Templates tidak muncul?

1. Cek user profile: `console.log(userProfile.chatTemplates)`
2. Cek cache: `await offlineStorage.getCachedData('chat_templates')`
3. Reload templates: `reload()`

### Templates tidak tersinkronisasi?

1. Cek koneksi: `console.log(navigator.onLine)`
2. Cek pending operations: `await offlineStorage.getPendingOperations()`
3. Force sync: `await syncManager.sync()`

### Variable tidak ter-replace?

1. Pastikan format variable benar: `{variableName}`
2. Pastikan variable ada di object: `{ variableName: 'value' }`
3. Cek hasil: `console.log(processTemplate(template, variables))`

## 📚 API Reference

### useChatTemplates Hook

```typescript
const {
  templates,           // ChatTemplate[] - List of templates
  loading,            // boolean - Loading state
  error,              // string | null - Error message
  isOnline,           // boolean - Online status
  updateTemplate,     // (id, updates) => Promise<ChatTemplate[]>
  addTemplate,        // (template) => Promise<ChatTemplate[]>
  deleteTemplate,     // (id) => Promise<ChatTemplate[]>
  resetToDefaults,    // () => Promise<ChatTemplate[]>
  getTemplateById,    // (id) => Promise<ChatTemplate | null>
  processTemplate,    // (template, variables) => string
  validateTemplate,   // (template) => { valid, errors }
  reload,             // () => Promise<void>
} = useChatTemplates(userProfile);
```

### Service Functions

```typescript
// Get templates
getChatTemplatesOffline(userProfile): Promise<ChatTemplate[]>

// Update template
updateChatTemplateOffline(userProfile, templateId, updates): Promise<ChatTemplate[]>

// Add template
addChatTemplateOffline(userProfile, newTemplate): Promise<ChatTemplate[]>

// Delete template
deleteChatTemplateOffline(userProfile, templateId): Promise<ChatTemplate[]>

// Reset to defaults
resetToDefaultTemplatesOffline(userProfile): Promise<ChatTemplate[]>

// Get by ID
getChatTemplateByIdOffline(userProfile, templateId): Promise<ChatTemplate | null>

// Process template
processTemplate(template, variables): string

// Validate template
validateTemplate(template): { valid: boolean, errors: string[] }
```

## 🎓 Migration Guide

### Dari Booking.tsx ke Hook

**Before:**
```tsx
const templates = (userProfile.chatTemplates && userProfile.chatTemplates.length > 0)
  ? userProfile.chatTemplates
  : CHAT_TEMPLATES;

const handleSave = async () => {
  const newTemplates = templates.map(t =>
    t.id === selectedTemplate ? { ...t, template: rawTemplate } : t
  );
  
  const saved = await upsertProfile({ 
    id: userProfile.id, 
    chatTemplates: newTemplates 
  });
  
  setProfile(saved);
};
```

**After:**
```tsx
const { templates, updateTemplate } = useChatTemplates(userProfile);

const handleSave = async () => {
  await updateTemplate(selectedTemplate, { template: rawTemplate });
  showNotification('Template berhasil disimpan!');
};
```

## 🚀 Next Steps

1. ✅ Implementasi hook di Booking.tsx
2. ✅ Implementasi hook di Clients.tsx
3. ✅ Implementasi hook di ChatModal.tsx
4. ✅ Tambahkan ChatTemplateManager ke Settings
5. ✅ Test offline mode
6. ✅ Monitor sync success rate

---

**Happy Templating! 📝**
