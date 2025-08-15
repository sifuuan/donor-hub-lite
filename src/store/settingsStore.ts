import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Settings } from '@/types';
import { localDataProvider } from '@/data/localDataProvider';

interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  
  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: null,
      isLoading: false,

      fetchSettings: async () => {
        set({ isLoading: true });
        try {
          const settings = await localDataProvider.getSettings();
          set({ settings, isLoading: false });
          
          // Apply theme to document
          if (settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to fetch settings:', error);
        }
      },

      updateSettings: async (updates) => {
        const updatedSettings = await localDataProvider.updateSettings(updates);
        set({ settings: updatedSettings });
        
        // Apply theme to document if theme was updated
        if (updates.theme) {
          if (updates.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },

      toggleTheme: async () => {
        const { settings } = get();
        if (settings) {
          const newTheme = settings.theme === 'light' ? 'dark' : 'light';
          await get().updateSettings({ theme: newTheme });
        }
      }
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ 
        settings: state.settings ? { theme: state.settings.theme } : null 
      }),
    }
  )
);