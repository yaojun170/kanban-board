import { createClient } from '@supabase/supabase-js';
import { createSupabaseTaskRepository, type TaskRepository } from './taskRepository';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const canUseSupabase = import.meta.env.MODE !== 'test' && Boolean(supabaseUrl && supabasePublishableKey);

export const isSupabaseConfigured = canUseSupabase;
export const supabase = canUseSupabase ? createClient(supabaseUrl as string, supabasePublishableKey as string) : null;

export function createDefaultTaskRepository(fallbackRepository: TaskRepository): TaskRepository {
  if (!supabase) {
    return fallbackRepository;
  }

  return createSupabaseTaskRepository(supabase);
}
