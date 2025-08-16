import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MemberTable } from '@/components/members/MemberTable';
import { MemberForm } from '@/components/members/MemberForm';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { MessageForm } from '@/components/messages/MessageForm';
import { Member } from '@/types';
import { useMembersStore } from '@/store/membersStore';
import { useToast } from '@/hooks/use-toast';

export function Members() {
  const { deleteMember } = useMembersStore();
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setShowMemberForm(true);
  };

  const handleDeleteMember = async (member: Member) => {
    if (confirm(`Are you sure you want to delete ${member.full_name}?`)) {
      try {
        await deleteMember(member.id);
        toast({
          title: 'Member Deleted',
          description: `${member.full_name} has been deleted successfully.`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete member.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleAddPayment = (member: Member) => {
    setSelectedMember(member);
    setShowPaymentForm(true);
  };

  const handleSendMessage = (member: Member) => {
    setSelectedMember(member);
    setShowMessageForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage your organization members</p>
        </div>
        <Button onClick={() => {
          setSelectedMember(null);
          setShowMemberForm(true);
        }}>
          Add Member
        </Button>
      </div>

      <MemberTable
        onEditMember={handleEditMember}
        onDeleteMember={handleDeleteMember}
        onAddPayment={handleAddPayment}
        onSendMessage={handleSendMessage}
      />

      <MemberForm
        member={selectedMember || undefined}
        open={showMemberForm}
        onOpenChange={(open) => {
          setShowMemberForm(open);
          if (!open) setSelectedMember(null);
        }}
      />

      <PaymentForm
        open={showPaymentForm}
        onOpenChange={(open) => {
          setShowPaymentForm(open);
          if (!open) setSelectedMember(null);
        }}
        preselectedMember={selectedMember || undefined}
      />

      <MessageForm
        open={showMessageForm}
        onOpenChange={(open) => {
          setShowMessageForm(open);
          if (!open) setSelectedMember(null);
        }}
        preselectedMember={selectedMember || undefined}
      />
    </div>
  );
}