import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { localDataProvider } from '@/data/localDataProvider';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const user = await localDataProvider.login(email, password);
          if (user) {
            set({ user, isLoading: false });
            return true;
          } else {
            set({ isLoading: false });
            return false;
          }
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        await localDataProvider.logout();
        set({ user: null });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await localDataProvider.getCurrentUser();
          set({ user, isLoading: false });
        } catch (error) {
          set({ user: null, isLoading: false });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);