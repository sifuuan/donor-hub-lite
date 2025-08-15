import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useSettingsStore } from '@/store/settingsStore';
import { useMembersStore } from '@/store/membersStore';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useMessagesStore } from '@/store/messagesStore';
import { seedData } from '@/data/seedData';

export function DashboardLayout() {
  const { fetchSettings } = useSettingsStore();
  const { fetchMembers } = useMembersStore();
  const { fetchPayments } = usePaymentsStore();
  const { fetchMessages } = useMessagesStore();

  useEffect(() => {
    const initializeApp = async () => {
      // Seed data first time
      await seedData();
      
      // Fetch all data
      await Promise.all([
        fetchSettings(),
        fetchMembers(),
        fetchPayments(),
        fetchMessages(),
      ]);
    };

    initializeApp();
  }, [fetchSettings, fetchMembers, fetchPayments, fetchMessages]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 p-6 bg-muted/30">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}