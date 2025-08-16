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
import { Switch } from '@/components/ui/switch';
import { useMembersStore } from '@/store/membersStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Member } from '@/types';
import { useToast } from '@/hooks/use-toast';

const memberSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits'),
  alt_phone_number: z.string().optional(),
  email: z.string().email('Invalid email address'),
  address: z.string().optional(),
  location: z.string().optional(),
  payment_amount: z.number().min(1, 'Payment amount must be greater than 0'),
  payment_frequency: z.enum(['monthly', 'three_months', 'six_months', 'yearly']),
  payment_start_date: z.string().min(1, 'Start date is required'),
  payment_method: z.enum(['bank', 'cash', 'branch']),
  preferred_contact: z.enum(['email', 'sms', 'both']),
  active: z.boolean(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberFormProps {
  member?: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberForm({ member, open, onOpenChange }: MemberFormProps) {
  const { createMember, updateMember, members } = useMembersStore();
  const { settings } = useSettingsStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      payment_amount: settings?.default_payment_amount || 500,
      payment_frequency: 'monthly',
      payment_method: 'bank',
      preferred_contact: 'email',
      active: true,
      payment_start_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (member) {
      // Populate form with existing member data
      Object.keys(member).forEach((key) => {
        const value = member[key as keyof Member];
        if (key === 'payment_start_date' && typeof value === 'string') {
          setValue(key, value.split('T')[0]); // Convert to YYYY-MM-DD format
        } else {
          setValue(key as keyof MemberFormData, value as any);
        }
      });
    } else {
      reset({
        payment_amount: settings?.default_payment_amount || 500,
        payment_frequency: 'monthly',
        payment_method: 'bank',
        preferred_contact: 'email',
        active: true,
        payment_start_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [member, setValue, reset, settings]);

  const checkDuplicate = (email: string, phone: string, id?: string) => {
    return members.some(m => 
      m.id !== id && (m.email === email || m.phone_number === phone)
    );
  };

  const onSubmit = async (data: MemberFormData) => {
    setIsSubmitting(true);
    
    try {
      // Check for duplicates
      if (checkDuplicate(data.email, data.phone_number, member?.id)) {
        toast({
          title: 'Duplicate Member',
          description: 'A member with this email or phone number already exists.',
          variant: 'destructive',
        });
        return;
      }

      if (member) {
        await updateMember(member.id, data);
        toast({
          title: 'Member Updated',
          description: 'Member information has been updated successfully.',
        });
      } else {
        await createMember(data as Omit<Member, 'id' | 'created_at'>);
        toast({
          title: 'Member Added',
          description: 'New member has been added successfully.',
        });
      }

      onOpenChange(false);
      reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {member ? 'Edit Member' : 'Add New Member'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="Enter full name"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number *</Label>
              <Input
                id="phone_number"
                {...register('phone_number')}
                placeholder="Enter phone number"
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt_phone_number">Alternative Phone</Label>
              <Input
                id="alt_phone_number"
                {...register('alt_phone_number')}
                placeholder="Enter alternative phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="Enter location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_amount">Payment Amount *</Label>
              <Input
                id="payment_amount"
                type="number"
                step="0.01"
                {...register('payment_amount', { valueAsNumber: true })}
                placeholder="Enter payment amount"
              />
              {errors.payment_amount && (
                <p className="text-sm text-destructive">{errors.payment_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_frequency">Payment Frequency *</Label>
              <Select
                value={watch('payment_frequency')}
                onValueChange={(value) => setValue('payment_frequency', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="three_months">Every 3 Months</SelectItem>
                  <SelectItem value="six_months">Every 6 Months</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="payment_start_date">Payment Start Date *</Label>
              <Input
                id="payment_start_date"
                type="date"
                {...register('payment_start_date')}
              />
              {errors.payment_start_date && (
                <p className="text-sm text-destructive">{errors.payment_start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_contact">Preferred Contact *</Label>
              <Select
                value={watch('preferred_contact')}
                onValueChange={(value) => setValue('preferred_contact', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Enter full address"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={watch('active')}
              onCheckedChange={(checked) => setValue('active', checked)}
            />
            <Label htmlFor="active">Active Member</Label>
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
              {isSubmitting ? 'Saving...' : member ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}