import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useMessagesStore } from '@/store/messagesStore';
import { useMembersStore } from '@/store/membersStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Member, Payment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/dateUtils';

const paymentSchema = z.object({
  member_id: z.string().min(1, 'Please select a member'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['bank', 'cash', 'branch']),
  status: z.enum(['paid', 'unpaid', 'overdue']),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  payment?: Payment;
  preselectedMember?: Member;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PaymentForm({ payment, preselectedMember, open = false, onOpenChange, onSuccess }: PaymentFormProps) {
  const { createPayment, updatePayment } = usePaymentsStore();
  const { createMessage } = useMessagesStore();
  const { members } = useMembersStore();
  const { settings } = useSettingsStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank',
      status: 'paid',
    },
  });

  const watchedMemberId = watch('member_id');

  useEffect(() => {
    if (preselectedMember) {
      setValue('member_id', preselectedMember.id);
      setValue('amount', preselectedMember.payment_amount);
      setSelectedMember(preselectedMember);
    }
  }, [preselectedMember, setValue]);

  useEffect(() => {
    if (payment) {
      // Populate form with existing payment data
      Object.keys(payment).forEach((key) => {
        const value = payment[key as keyof Payment];
        if (key === 'payment_date' && typeof value === 'string') {
          setValue(key, value.split('T')[0]); // Convert to YYYY-MM-DD format
        } else {
          setValue(key as keyof PaymentFormData, value as any);
        }
      });
      
      const member = members.find(m => m.id === payment.member_id);
      setSelectedMember(member || null);
    } else {
      reset({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank',
        status: 'paid',
        amount: preselectedMember?.payment_amount || settings?.default_payment_amount || 500,
        member_id: preselectedMember?.id || '',
      });
    }
  }, [payment, setValue, reset, members, preselectedMember, settings]);

  useEffect(() => {
    if (watchedMemberId && !preselectedMember) {
      const member = members.find(m => m.id === watchedMemberId);
      if (member) {
        setSelectedMember(member);
        setValue('amount', member.payment_amount);
      }
    }
  }, [watchedMemberId, members, setValue, preselectedMember]);

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    
    try {
      if (payment) {
        await updatePayment(payment.id, data);
        toast({
          title: 'Payment Updated',
          description: 'Payment has been updated successfully.',
        });
      } else {
        await createPayment(data as Omit<Payment, 'id'>);
        
        // Create thank you message if payment is marked as paid
        if (data.status === 'paid' && selectedMember) {
          await createMessage({
            member_id: selectedMember.id,
            message_type: 'thank_you',
            message_subject: 'Thank You for Your Contribution',
            message_content: `Thank you for your contribution of ${formatCurrency(data.amount, settings?.default_currency)} on ${new Date(data.payment_date).toLocaleDateString()}.`,
            sent_at: new Date().toISOString(),
            channel: 'email',
          });
        }
        
        toast({
          title: 'Payment Logged',
          description: `Payment of ${formatCurrency(data.amount, settings?.default_currency)} has been logged successfully.`,
        });
      }

      onOpenChange?.(false);
      onSuccess?.();
      reset();
      setSelectedMember(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(watch('member_id')?.toLowerCase() || '') ||
    m.phone_number.includes(watch('member_id') || '') ||
    m.email.toLowerCase().includes(watch('member_id')?.toLowerCase() || '')
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {payment ? 'Edit Payment' : 'Log Payment'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!preselectedMember && (
            <div className="space-y-2">
              <Label htmlFor="member_id">Member *</Label>
              <Select
                value={watch('member_id')}
                onValueChange={(value) => setValue('member_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div>
                        <div className="font-medium">{member.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.phone_number} • {member.email}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.member_id && (
                <p className="text-sm text-destructive">{errors.member_id.message}</p>
              )}
            </div>
          )}

          {selectedMember && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{selectedMember.full_name}</div>
              <div className="text-sm text-muted-foreground">
                {selectedMember.phone_number} • {selectedMember.email}
              </div>
              <div className="text-sm text-muted-foreground">
                Expected: {formatCurrency(selectedMember.payment_amount, settings?.default_currency)}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              placeholder="Enter payment amount"
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date *</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date')}
            />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{errors.payment_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method *</Label>
            <Select
              value={watch('payment_method')}
              onValueChange={(value) => setValue('payment_method', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="branch">Branch Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : payment ? 'Update Payment' : 'Log Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}