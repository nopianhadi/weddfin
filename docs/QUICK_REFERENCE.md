# 🚀 Quick Reference - UI/UX Components

## 📋 Component Cheat Sheet

### Phase 1: Basic Components

#### ProjectCard
```typescript
<ProjectCard
  project={project}
  client={client}
  projectStatusConfig={config}
  onStatusChange={(id, status) => {}}
  onViewDetails={(p) => {}}
  onEdit={(p) => {}}
  onSendMessage={(p) => {}}
  onViewInvoice={(p) => {}}
/>
```

#### ClientCard
```typescript
<ClientCard
  client={client}
  projects={projects}
  onViewDetails={(c) => {}}
  onSendMessage={(c) => {}}
  onViewInvoice={(c) => {}}
  onSendReminder={(c) => {}}
/>
```

#### CollapsibleSection
```typescript
<CollapsibleSection
  title="Section Title"
  defaultExpanded={true}
  status="valid"
  statusText="All good"
  icon={<Icon />}
>
  {children}
</CollapsibleSection>
```

#### BatchPayment
```typescript
<BatchPayment
  payments={unpaidPayments}
  cards={cards}
  pockets={pockets}
  onBatchPay={async (ids, cardId, pocketId) => {}}
  showNotification={(msg) => {}}
/>
```

#### ProgressTracker
```typescript
<ProgressTracker
  project={project}
  statusConfig={statusConfig}
/>
```

#### QuickStatusModal
```typescript
<QuickStatusModal
  isOpen={isOpen}
  onClose={() => {}}
  project={project}
  statusConfig={statusConfig}
  onStatusChange={async (id, status, notify) => {}}
  showNotification={(msg) => {}}
/>
```

---

### Phase 2 & 3: Advanced Components

#### BottomSheet
```typescript
<BottomSheet
  isOpen={isOpen}
  onClose={() => {}}
  title="Title"
  snapPoints={[50, 90]}
  defaultSnap={0}
>
  {children}
</BottomSheet>
```

#### SwipeableCard
```typescript
<SwipeableCard
  leftActions={[
    SwipeActions.favorite(() => {}),
    SwipeActions.complete(() => {})
  ]}
  rightActions={[
    SwipeActions.edit(() => {}),
    SwipeActions.delete(() => {})
  ]}
>
  {children}
</SwipeableCard>
```

**Preset Actions:**
- `SwipeActions.edit(callback)`
- `SwipeActions.delete(callback)`
- `SwipeActions.share(callback)`
- `SwipeActions.favorite(callback)`
- `SwipeActions.complete(callback)`

#### CommunicationHub
```typescript
<CommunicationHub
  client={client}
  projects={projects}
  onSendMessage={(msg, channel) => {}}
  showNotification={(msg) => {}}
/>
```

**Templates:**
- payment_reminder
- progress_update
- schedule_confirmation
- thank_you
- delivery_notification

#### PullToRefresh
```typescript
<PullToRefresh
  onRefresh={async () => {
    await loadData();
  }}
  threshold={80}
  disabled={false}
>
  {children}
</PullToRefresh>
```

#### FloatingActionButton
```typescript
<FloatingActionButton
  position="bottom-right"
  mainIcon={<PlusIcon />}
  actions={[
    {
      id: 'add',
      label: 'Add',
      icon: <Icon />,
      color: '#8b5cf6',
      onClick: () => {}
    }
  ]}
/>
```

---

## 🎨 Common Patterns

### Pattern 1: Mobile-Optimized List
```typescript
<PullToRefresh onRefresh={loadData}>
  <div className="space-y-4">
    {items.map(item => (
      <SwipeableCard
        key={item.id}
        leftActions={[SwipeActions.favorite(() => {})]}
        rightActions={[
          SwipeActions.edit(() => {}),
          SwipeActions.delete(() => {})
        ]}
      >
        <ItemCard item={item} />
      </SwipeableCard>
    ))}
  </div>
</PullToRefresh>
```

### Pattern 2: Bottom Sheet Form
```typescript
<BottomSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Edit Item"
  snapPoints={[50, 90]}
>
  <form onSubmit={handleSubmit}>
    <CollapsibleSection title="Basic Info" defaultExpanded>
      {/* fields */}
    </CollapsibleSection>
    <CollapsibleSection title="Advanced">
      {/* fields */}
    </CollapsibleSection>
  </form>
</BottomSheet>
```

### Pattern 3: Quick Actions with FAB
```typescript
<div className="relative">
  {/* Main content */}
  
  <FloatingActionButton
    actions={[
      {
        id: 'add',
        label: 'Add Project',
        icon: <FolderIcon />,
        onClick: () => setModalOpen(true)
      },
      {
        id: 'filter',
        label: 'Filter',
        icon: <FilterIcon />,
        onClick: () => setFilterOpen(true)
      }
    ]}
  />
</div>
```

### Pattern 4: Client Communication
```typescript
<BottomSheet
  isOpen={isCommunicationOpen}
  onClose={() => setIsCommunicationOpen(false)}
  title="Komunikasi"
  snapPoints={[70, 95]}
>
  <CommunicationHub
    client={client}
    projects={projects}
    onSendMessage={(msg, channel) => {
      if (channel === 'whatsapp') {
        window.open(`https://wa.me/${phone}?text=${msg}`);
      }
    }}
    showNotification={showNotification}
  />
</BottomSheet>
```

---

## 🎯 Quick Tips

### Tip 1: Responsive Rendering
```typescript
const isMobile = window.innerWidth < 640;

{isMobile ? (
  <BottomSheet {...props}>
    <Form />
  </BottomSheet>
) : (
  <Modal {...props}>
    <Form />
  </Modal>
)}
```

### Tip 2: Batch Operations
```typescript
<BatchPayment
  payments={payments.filter(p => p.status === 'Unpaid')}
  cards={cards}
  pockets={pockets}
  onBatchPay={async (ids, cardId, pocketId) => {
    for (const id of ids) {
      await processPayment(id, cardId, pocketId);
    }
  }}
  showNotification={showNotification}
/>
```

### Tip 3: Progress Tracking
```typescript
<ProgressTracker
  project={project}
  statusConfig={[
    { name: 'Dikonfirmasi', color: '#3b82f6' },
    { name: 'Editing', color: '#8b5cf6' },
    { name: 'Cetak', color: '#f97316' },
    { name: 'Dikirim', color: '#06b6d4' },
    { name: 'Selesai', color: '#10b981' }
  ]}
/>
```

### Tip 4: Quick Status Change
```typescript
<QuickStatusModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  project={project}
  statusConfig={statusConfig}
  onStatusChange={async (id, status, notifyClient) => {
    await updateProject(id, { status });
    if (notifyClient) {
      await sendNotification(id, status);
    }
  }}
  showNotification={showNotification}
/>
```

---

## 🔧 Common Customizations

### Custom Swipe Actions
```typescript
const customAction: SwipeAction = {
  id: 'archive',
  label: 'Archive',
  icon: <ArchiveIcon className="w-5 h-5" />,
  color: '#6366f1',
  bgColor: '#6366f120',
  onAction: () => handleArchive()
};

<SwipeableCard
  rightActions={[customAction]}
>
  {children}
</SwipeableCard>
```

### Custom FAB Actions
```typescript
const fabActions = [
  {
    id: 'add-project',
    label: 'Tambah Proyek',
    icon: <FolderKanbanIcon className="w-5 h-5" />,
    color: '#8b5cf6',
    onClick: () => setProjectModalOpen(true)
  },
  {
    id: 'add-client',
    label: 'Tambah Klien',
    icon: <UsersIcon className="w-5 h-5" />,
    color: '#3b82f6',
    onClick: () => setClientModalOpen(true)
  }
];
```

### Custom Message Template
```typescript
const customTemplate: MessageTemplate = {
  id: 'custom',
  title: 'Custom Message',
  category: 'custom',
  template: `Hello {clientName},
  
Your project {projectName} is ready!

Best regards,
{companyName}`,
  variables: ['clientName', 'projectName', 'companyName']
};
```

---

## 📊 Performance Optimization

### Lazy Loading
```typescript
const CommunicationHub = lazy(() => import('./CommunicationHub'));

<Suspense fallback={<Loading />}>
  <CommunicationHub {...props} />
</Suspense>
```

### Memoization
```typescript
const filteredProjects = useMemo(() => {
  return projects.filter(p => p.status !== 'Selesai');
}, [projects]);
```

### Debouncing
```typescript
const debouncedSearch = useMemo(
  () => debounce((value) => setSearch(value), 300),
  []
);
```

---

## 🐛 Troubleshooting

### Issue: Icons Not Found
```typescript
// Add to constants.tsx
export { 
  RefreshCwIcon,
  XIcon,
  // ... other icons
} from 'lucide-react';
```

### Issue: Bottom Sheet Not Closing
```typescript
// Make sure backdrop has onClick
<div 
  className="fixed inset-0 z-40" 
  onClick={onClose}
/>
```

### Issue: Swipe Not Working
```typescript
// Check threshold and touch events
<SwipeableCard
  threshold={80}  // Adjust if needed
  {...props}
/>
```

### Issue: Pull to Refresh Conflicts
```typescript
// Check scroll position
const scrollTop = containerRef.current?.scrollTop || 0;
if (scrollTop === 0) {
  // Allow pull to refresh
}
```

---

## 📚 Documentation Links

- **Full Guide**: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **Quick Start**: [QUICK_START_UIUX.md](QUICK_START_UIUX.md)
- **Phase 1**: [PHASE1_IMPLEMENTATION_COMPLETE.md](PHASE1_IMPLEMENTATION_COMPLETE.md)
- **Phase 2 & 3**: [PHASE2_3_IMPLEMENTATION_COMPLETE.md](PHASE2_3_IMPLEMENTATION_COMPLETE.md)
- **Final Summary**: [FINAL_IMPLEMENTATION_SUMMARY.md](FINAL_IMPLEMENTATION_SUMMARY.md)

---

**Last Updated**: 2025-10-23  
**Version**: 2.0.0  
**Status**: Production Ready
