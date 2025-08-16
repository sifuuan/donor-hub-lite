import { useState } from 'react';
import { Search, Plus, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSettingsStore } from '@/store/settingsStore';
import { GlobalSearch } from '@/components/GlobalSearch';
import { MemberForm } from '@/components/members/MemberForm';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { MessageForm } from '@/components/messages/MessageForm';
import { Member } from '@/types';

export function TopBar() {
  const { settings, toggleTheme } = useSettingsStore();
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const handleMemberSelect = (member: Member) => {
    // Could navigate to member profile or open details
    console.log('Selected member:', member);
  };

  const handleQuickAction = (action: 'payment' | 'message', member: Member) => {
    setSelectedMember(member);
    if (action === 'payment') {
      setShowPaymentForm(true);
    } else {
      setShowMessageForm(true);
    }
  };

  return (
    <>
      <header className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <GlobalSearch
              onMemberSelect={handleMemberSelect}
              onQuickAction={handleQuickAction}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMemberForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
            >
              {settings?.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <MemberForm
        open={showMemberForm}
        onOpenChange={setShowMemberForm}
      />

      <PaymentForm
        open={showPaymentForm}
        onOpenChange={setShowPaymentForm}
        preselectedMember={selectedMember || undefined}
      />

      <MessageForm
        open={showMessageForm}
        onOpenChange={setShowMessageForm}
        preselectedMember={selectedMember || undefined}
      />
    </>
  );
}