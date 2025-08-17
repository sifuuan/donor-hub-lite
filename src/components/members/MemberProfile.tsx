import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, CreditCard, Send, Edit, UserX, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useMembersStore } from '@/store/membersStore';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useMessagesStore } from '@/store/messagesStore';
import { Member, Payment } from '@/types';
import { formatCurrency, formatDate, getNextDueDate, getLastPaymentDate, getPaymentStatus } from '@/utils/dateUtils';
import { PaymentForm } from '../payments/PaymentForm';
import { MessageForm } from '../messages/MessageForm';
import { MemberForm } from './MemberForm';
import { useToast } from '@/hooks/use-toast';

export function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { members, updateMember } = useMembersStore();
  const { payments, getPaymentsByMember } = usePaymentsStore();
  const { createMessage } = useMessagesStore();
  
  const [member, setMember] = useState<Member | null>(null);
  const [memberPayments, setMemberPayments] = useState<Payment[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (id) {
      const foundMember = members.find(m => m.id === id);
      setMember(foundMember || null);
      
      if (foundMember) {
        const memberPayments = getPaymentsByMember(foundMember.id);
        setMemberPayments(memberPayments.sort((a, b) => 
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        ));
      }
    }
  }, [id, members, payments]);

  if (!member) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Member not found</h2>
          <Button onClick={() => navigate('/members')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Members
          </Button>
        </div>
      </div>
    );
  }

  const lastPaymentDate = getLastPaymentDate(memberPayments);
  const nextDueDate = getNextDueDate(member, lastPaymentDate);
  const paymentStatus = getPaymentStatus(member, memberPayments);

  const handleToggleActive = async () => {
    try {
      await updateMember(member.id, { active: !member.active });
      toast({
        title: member.active ? 'Member deactivated' : 'Member activated',
        description: `${member.full_name} has been ${member.active ? 'deactivated' : 'activated'}.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update member status.',
        variant: 'destructive'
      });
    }
  };

  const handleSendReminder = async () => {
    try {
      await createMessage({
        member_id: member.id,
        message_type: 'reminder',
        message_subject: 'Payment Reminder',
        message_content: `Dear ${member.full_name}, your membership contribution of ${formatCurrency(member.payment_amount)} is due on ${formatDate(nextDueDate)}. Please make your payment to continue supporting our cause.`,
        sent_at: new Date().toISOString(),
        channel: 'email'
      });
      
      toast({
        title: 'Reminder sent',
        description: `Payment reminder sent to ${member.full_name}.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reminder.',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'current':
        return <Badge variant="default" className="bg-green-100 text-green-800">Current</Badge>;
      case 'due_soon':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Due Soon</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/members')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Members
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{member.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge()}
              <Badge variant={member.active ? 'default' : 'secondary'}>
                {member.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
            <DialogTrigger asChild>
              <Button>
                <CreditCard className="mr-2 h-4 w-4" />
                Log Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <PaymentForm 
                preselectedMember={member}
                onSuccess={() => setShowPaymentForm(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showMessageForm} onOpenChange={setShowMessageForm}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <MessageForm 
                preselectedMember={member}
                onSuccess={() => setShowMessageForm(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <MemberForm 
                member={member}
              />
            </DialogContent>
          </Dialog>

          <Button 
            variant={member.active ? "destructive" : "default"}
            onClick={handleToggleActive}
          >
            {member.active ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{member.phone_number}</span>
              </div>
              {member.alt_phone_number && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{member.alt_phone_number}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{member.email}</span>
              </div>
              {member.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{member.location}</span>
                </div>
              )}
              {member.address && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Address</h4>
                  <p className="text-sm text-muted-foreground">{member.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="font-medium">Amount</label>
                <p className="text-lg">{formatCurrency(member.payment_amount)}</p>
              </div>
              <div>
                <label className="font-medium">Frequency</label>
                <p className="capitalize">{member.payment_frequency.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="font-medium">Payment Method</label>
                <p className="capitalize">{member.payment_method}</p>
              </div>
              <div>
                <label className="font-medium">Start Date</label>
                <p>{formatDate(member.payment_start_date)}</p>
              </div>
              <div>
                <label className="font-medium">Next Due Date</label>
                <p>{formatDate(nextDueDate)}</p>
              </div>
              <div>
                <label className="font-medium">Preferred Contact</label>
                <p className="capitalize">{member.preferred_contact}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment History</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSendReminder}
                disabled={paymentStatus === 'current'}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Reminder
              </Button>
            </CardHeader>
            <CardContent>
              {memberPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No payments recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {memberPayments.map((payment, index) => (
                    <div key={payment.id}>
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{formatCurrency(payment.amount)}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(payment.payment_date)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm capitalize">{payment.payment_method}</span>
                            <Badge 
                              variant={payment.status === 'paid' ? 'default' : 'destructive'}
                              className="w-fit"
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                        {payment.notes && (
                          <div className="text-sm text-muted-foreground max-w-xs">
                            {payment.notes}
                          </div>
                        )}
                      </div>
                      {index < memberPayments.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}