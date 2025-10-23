/**
 * Clients Service dengan Offline Support
 * Contoh implementasi CRUD dengan offline-first approach
 */

import { supabase } from '../lib/supabaseClient';
import { syncManager } from './syncManager';
import { offlineStorage } from './offlineStorage';
import type { Client } from '../types';

const TABLE_NAME = 'clients';
const CACHE_KEY = 'clients_list';
const CACHE_TTL_MINUTES = 30;

/**
 * List clients dengan offline support
 * - Jika online: fetch dari Supabase dan cache hasilnya
 * - Jika offline: gunakan data dari cache
 */
export async function listClientsOffline(): Promise<Client[]> {
  try {
    // Cek apakah online
    if (!navigator.onLine) {
      console.log('[ClientsOffline] Offline, using cached data');
      const cached = await offlineStorage.getCachedData<Client[]>(CACHE_KEY);
      return cached || [];
    }

    // Fetch dari Supabase
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Cache hasil
    await offlineStorage.cacheData(CACHE_KEY, data, CACHE_TTL_MINUTES);
    
    return data || [];
  } catch (error) {
    console.error('[ClientsOffline] Error fetching clients:', error);
    
    // Fallback ke cache jika ada error
    const cached = await offlineStorage.getCachedData<Client[]>(CACHE_KEY);
    return cached || [];
  }
}

/**
 * Create client dengan offline support
 * - Jika online: langsung insert ke Supabase
 * - Jika offline: queue operasi untuk sync nanti
 */
export async function createClientOffline(client: Omit<Client, 'id' | 'created_at'>): Promise<Client> {
  const newClient: Client = {
    ...client,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  } as Client;

  try {
    if (!navigator.onLine) {
      console.log('[ClientsOffline] Offline, queueing insert');
      await syncManager.queueInsert(TABLE_NAME, newClient);
      
      // Update cache optimistically
      const cached = await offlineStorage.getCachedData<Client[]>(CACHE_KEY);
      if (cached) {
        await offlineStorage.cacheData(CACHE_KEY, [newClient, ...cached], CACHE_TTL_MINUTES);
      }
      
      return newClient;
    }

    // Insert ke Supabase
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(newClient)
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    await offlineStorage.removeCachedData(CACHE_KEY);
    
    return data;
  } catch (error) {
    console.error('[ClientsOffline] Error creating client:', error);
    
    // Queue untuk sync nanti
    await syncManager.queueInsert(TABLE_NAME, newClient);
    
    // Update cache optimistically
    const cached = await offlineStorage.getCachedData<Client[]>(CACHE_KEY);
    if (cached) {
      await offlineStorage.cacheData(CACHE_KEY, [newClient, ...cached], CACHE_TTL_MINUTES);
    }
    
    return newClient;
  }
}

/**
 * Update client dengan offline support
 */
export async function updateClientOffline(id: string, updates: Partial<Client>): Promise<Client> {
  const updatedClient = { id, ...updates };

  try {
    if (!navigator.onLine) {
      console.log('[ClientsOffline] Offline, queueing update');
      await syncManager.queueUpdate(TABLE_NAME, updatedClient);
      
      // Update cache optimistically
      const cached = await offlineStorage.getCachedData<Client[]>(CACHE_KEY);
      if (cached) {
        const updated = cached.map(c => c.id === id ? { ...c, ...updates } : c);
        await offlineStorage.cacheData(CACHE_KEY, updated, CACHE_TTL_MINUTES);
      }
      
      return updatedClient as Client;
    }

    // Update di Supabase
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    await offlineStorage.removeCachedData(CACHE_KEY);
    
    return data;
  } catch (error) {
    console.error('[ClientsOffline] Error updating client:', error);
    
    // Queue untuk sync nanti
    await syncManager.queueUpdate(TABLE_NAME, updatedClient);
    
    // Update cache optimistically
    const cached = await offlineStorage.getCachedData<Client[]>(CACHE_KEY);
    if (cached) {
      const updated = cached.map(c => c.id === id ? { ...c, ...updates } : c);
      await offlineStorage.cacheData(CACHE_KEY, updated, CACHE_TTL_MINUTES);
    }
    
    return updatedClient as Client;
  }
}

/**
 * Delete client dengan offline support
 */
export async function deleteClientOffline(id: string): Promise<void> {
  try {
    if (!navigator.onLine) {
      console.log('[ClientsOffline] Offline, queueing delete');
      await syncManager.queueDelete(TABLE_NAME, id);
      
      // Update cache optimistically
      const cached = await offlineStorage.getCachedData<Client[]>(CACHE_KEY);
      if (cached) {
        const filtered = cached.filter(c => c.id !== id);
        await offlineStorage.cacheData(CACHE_KEY, filtered, CACHE_TTL_MINUTES);
      }
      
      return;
    }

    // Delete dari Supabase
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Invalidate cache
    await offlineStorage.removeCachedData(CACHE_KEY);
  } catch (error) {
    console.error('[ClientsOffline] Error deleting client:', error);
    
    // Queue untuk sync nanti
    await syncManager.queueDelete(TABLE_NAME, id);
    
    // Update cache optimistically
    const cached = await offlineStorage.getCachedData<Client[]>(CACHE_KEY);
    if (cached) {
      const filtered = cached.filter(c => c.id !== id);
      await offlineStorage.cacheData(CACHE_KEY, filtered, CACHE_TTL_MINUTES);
    }
  }
}

/**
 * Get single client dengan offline support
 */
export async function getClientOffline(id: string): Promise<Client | null> {
  try {
    // Cek cache dulu
    const cached = await offlineStorage.getCachedData<Client[]>(CACHE_KEY);
    if (cached) {
      const found = cached.find(c => c.id === id);
      if (found) return found;
    }

    if (!navigator.onLine) {
      console.log('[ClientsOffline] Offline, client not in cache');
      return null;
    }

    // Fetch dari Supabase
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('[ClientsOffline] Error getting client:', error);
    return null;
  }
}
