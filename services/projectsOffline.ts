/**
 * Projects Service dengan Offline Support
 */

import { supabase } from '../lib/supabaseClient';
import { syncManager } from './syncManager';
import { offlineStorage } from './offlineStorage';
import type { Project } from '../types';

const TABLE_NAME = 'projects';
const CACHE_KEY = 'projects_list';
const CACHE_TTL_MINUTES = 30;

export async function listProjectsOffline(): Promise<Project[]> {
  try {
    if (!navigator.onLine) {
      console.log('[ProjectsOffline] Offline, using cached data');
      const cached = await offlineStorage.getCachedData<Project[]>(CACHE_KEY);
      return cached || [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await offlineStorage.cacheData(CACHE_KEY, data, CACHE_TTL_MINUTES);
    return data || [];
  } catch (error) {
    console.error('[ProjectsOffline] Error fetching projects:', error);
    const cached = await offlineStorage.getCachedData<Project[]>(CACHE_KEY);
    return cached || [];
  }
}

export async function createProjectOffline(project: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
  const newProject: Project = {
    ...project,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  } as Project;

  try {
    if (!navigator.onLine) {
      console.log('[ProjectsOffline] Offline, queueing insert');
      await syncManager.queueInsert(TABLE_NAME, newProject);
      await updateCacheOptimistically('add', newProject);
      return newProject;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(newProject)
      .select()
      .single();

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
    return data;
  } catch (error) {
    console.error('[ProjectsOffline] Error creating project:', error);
    await syncManager.queueInsert(TABLE_NAME, newProject);
    await updateCacheOptimistically('add', newProject);
    return newProject;
  }
}

export async function updateProjectOffline(id: string, updates: Partial<Project>): Promise<Project> {
  const updatedProject = { id, ...updates };

  try {
    if (!navigator.onLine) {
      console.log('[ProjectsOffline] Offline, queueing update');
      await syncManager.queueUpdate(TABLE_NAME, updatedProject);
      await updateCacheOptimistically('update', updatedProject);
      return updatedProject as Project;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
    return data;
  } catch (error) {
    console.error('[ProjectsOffline] Error updating project:', error);
    await syncManager.queueUpdate(TABLE_NAME, updatedProject);
    await updateCacheOptimistically('update', updatedProject);
    return updatedProject as Project;
  }
}

export async function deleteProjectOffline(id: string): Promise<void> {
  try {
    if (!navigator.onLine) {
      console.log('[ProjectsOffline] Offline, queueing delete');
      await syncManager.queueDelete(TABLE_NAME, id);
      await updateCacheOptimistically('delete', { id });
      return;
    }

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
  } catch (error) {
    console.error('[ProjectsOffline] Error deleting project:', error);
    await syncManager.queueDelete(TABLE_NAME, id);
    await updateCacheOptimistically('delete', { id });
  }
}

export async function getProjectOffline(id: string): Promise<Project | null> {
  try {
    const cached = await offlineStorage.getCachedData<Project[]>(CACHE_KEY);
    if (cached) {
      const found = cached.find(p => p.id === id);
      if (found) return found;
    }

    if (!navigator.onLine) {
      console.log('[ProjectsOffline] Offline, project not in cache');
      return null;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[ProjectsOffline] Error getting project:', error);
    return null;
  }
}

async function updateCacheOptimistically(action: 'add' | 'update' | 'delete', item: any): Promise<void> {
  const cached = await offlineStorage.getCachedData<Project[]>(CACHE_KEY);
  if (!cached) return;

  let updated: Project[];
  switch (action) {
    case 'add':
      updated = [item, ...cached];
      break;
    case 'update':
      updated = cached.map(p => p.id === item.id ? { ...p, ...item } : p);
      break;
    case 'delete':
      updated = cached.filter(p => p.id !== item.id);
      break;
  }

  await offlineStorage.cacheData(CACHE_KEY, updated, CACHE_TTL_MINUTES);
}
