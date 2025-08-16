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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMessagesStore } from '@/store/messagesStore';
import { useMembersStore } from '@/store/membersStore';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Member } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, getNextDueDate, getLastPaymentDate, isDue } from '@/utils/dateUtils';

const messageSchema = z.object({
  message_type: z.enum(['reminder', 'thank_you', 'announcement']),
  message_subject: z.string().min(1, 'Subject is required'),
  message_content: z.string().min(1, 'Message content is required'),
  recipient_type: z.enum(['single', 'bulk', 'due_members']),
  member_id: z.string().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface MessageFormProps {
  preselectedMember?: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const messageTemplates = {
  reminder: {
    subject: 'Payment Reminder',
    content: 'Your membership contribution is due on {{due_date}}. Amount: {{payment_amount}}. Please make your payment to continue supporting our cause.',
  },
  thank_you: {
    subject: 'Thank You for Your Contribution',
    content: 'Thank you for your contribution of {{amount}} on {{date}}. Your support helps us continue our important work.',
  },
  announcement: {
    subject: 'Important Announcement',
    content: 'We have an important update to share with you...',
  },
};

export function MessageForm({ preselectedMember, open, onOpenChange }: MessageFormProps) {
  const { createMessage, createBulkReminders } = useMessagesStore();
  const { members } = useMembersStore();
  const { payments } = usePaymentsStore();
  const { settings } = useSettingsStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message_type: 'announcement',
      recipient_type: preselectedMember ? 'single' : 'bulk',
      member_id: preselectedMember?.id,
    },
  });

  const watchedType = watch('message_type');
  const watchedRecipientType = watch('recipient_type');
  const watchedMemberId = watch('member_id');
  const watchedContent = watch('message_content');

  useEffect(() => {
    if (preselectedMember) {
      setValue('recipient_type', 'single');
      setValue('member_id', preselectedMember.id);
    }
  }, [preselectedMember, setValue]);

  useEffect(() => {
    if (watchedType && messageTemplates[watchedType]) {
      const template = messageTemplates[watchedType];
      setValue('message_subject', template.subject);
      setValue('message_content', template.content);
    }
  }, [watchedType, setValue]);

  useEffect(() => {
    let targetMembers: Member[] = [];
    
    if (watchedRecipientType === 'single' && watchedMemberId) {
      const member = members.find(m => m.id === watchedMemberId);
      if (member) targetMembers = [member];
    } else if (watchedRecipientType === 'bulk') {
      targetMembers = members.filter(m => m.active);
    } else if (watchedRecipientType === 'due_members') {
      targetMembers = members.filter(m => {
        if (!m.active) return false;
        const memberPayments = payments.filter(p => p.member_id === m.id);
        return isDue(m, memberPayments, settings?.reminder_window_days || 3);
      });
    }
    
    setSelectedMembers(targetMembers);
  }, [watchedRecipientType, watchedMemberId, members, payments, settings]);

  useEffect(() => {
    if (selectedMembers.length > 0 && watchedContent) {
      const member = selectedMembers[0];
      const memberPayments = payments.filter(p => p.member_id === member.id);
      const lastPayment = getLastPaymentDate(memberPayments);
      const nextDue = getNextDueDate(member, lastPayment);
      
      let content = watchedContent;
      content = content.replace(/\{\{due_date\}\}/g, formatDate(nextDue));
      content = content.replace(/\{\{payment_amount\}\}/g, formatCurrency(member.payment_amount, settings?.default_currency));
      content = content.replace(/\{\{member_name\}\}/g, member.full_name);
      content = content.replace(/\{\{amount\}\}/g, formatCurrency(member.payment_amount, settings?.default_currency));
      content = content.replace(/\{\{date\}\}/g, formatDate(new Date()));
      
      setPreviewContent(content);
    }
  }, [watchedContent, selectedMembers, payments, settings]);

  const onSubmit = async (data: MessageFormData) => {
    setIsSubmitting(true);
    
    try {
      if (data.recipient_type === 'due_members') {
        // Use bulk reminder function
        const dueMembers = members.filter(m => {
          if (!m.active) return false;
          const memberPayments = payments.filter(p => p.member_id === m.id);
          return isDue(m, memberPayments, settings?.reminder_window_days || 3);
        });
        
        await createBulkReminders(dueMembers.map(m => m.id));
        
        toast({
          title: 'Reminders Sent',
          description: `Sent ${dueMembers.length} reminder messages to due members.`,
        });
      } else if (data.recipient_type === 'bulk') {
        // Send to all active members
        const activeMembers = members.filter(m => m.active);
        const promises = activeMembers.map(member =>
          createMessage({
            member_id: member.id,
            message_type: data.message_type,
            message_subject: data.message_subject,
            message_content: data.message_content,
            sent_at: new Date().toISOString(),
            channel: 'email',
          })
        );
        
        await Promise.all(promises);
        
        toast({
          title: 'Messages Sent',
          description: `Sent ${activeMembers.length} messages to all active members.`,
        });
      } else {
        // Single member
        await createMessage({
          member_id: data.member_id!,
          message_type: data.message_type,
          message_subject: data.message_subject,
          message_content: data.message_content,
          sent_at: new Date().toISOString(),
          channel: 'email',
        });
        
        toast({
          title: 'Message Sent',
          description: 'Message has been sent successfully.',
        });
      }

      onOpenChange(false);
      reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
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
          <DialogTitle>Send Message</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="message_type">Message Type *</Label>
              <Select
                value={watch('message_type')}
                onValueChange={(value) => setValue('message_type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reminder">Payment Reminder</SelectItem>
                  <SelectItem value="thank_you">Thank You</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!preselectedMember && (
              <div className="space-y-2">
                <Label htmlFor="recipient_type">Recipients *</Label>
                <Select
                  value={watch('recipient_type')}
                  onValueChange={(value) => setValue('recipient_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Member</SelectItem>
                    <SelectItem value="bulk">All Active Members</SelectItem>
                    <SelectItem value="due_members">Due Members Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {watchedRecipientType === 'single' && (
            <div className="space-y-2">
              <Label htmlFor="member_id">Member *</Label>
              <Select
                value={watch('member_id') || ''}
                onValueChange={(value) => setValue('member_id', value)}
                disabled={!!preselectedMember}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recipients ({selectedMembers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {watchedRecipientType === 'single' && selectedMembers.length > 0 && (
                  <div>{selectedMembers[0].full_name} ({selectedMembers[0].email})</div>
                )}
                {watchedRecipientType === 'bulk' && (
                  <div>All {selectedMembers.length} active members</div>
                )}
                {watchedRecipientType === 'due_members' && (
                  <div>{selectedMembers.length} members with due payments</div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="message_subject">Subject *</Label>
            <Input
              id="message_subject"
              {...register('message_subject')}
              placeholder="Enter message subject"
            />
            {errors.message_subject && (
              <p className="text-sm text-destructive">{errors.message_subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message_content">Message Content *</Label>
            <Textarea
              id="message_content"
              {...register('message_content')}
              placeholder="Enter your message..."
              rows={6}
            />
            <div className="text-xs text-muted-foreground">
              Available variables: {'{{due_date}}'}, {'{{payment_amount}}'}, {'{{member_name}}'}, {'{{amount}}'}, {'{{date}}'}
            </div>
            {errors.message_content && (
              <p className="text-sm text-destructive">{errors.message_content.message}</p>
            )}
          </div>

          {previewContent && selectedMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>To:</strong> {selectedMembers[0].full_name}</div>
                  <div><strong>Subject:</strong> {watch('message_subject')}</div>
                  <div className="pt-2 whitespace-pre-wrap">{previewContent}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedMembers.length === 0}>
              {isSubmitting ? 'Sending...' : `Send to ${selectedMembers.length} ${selectedMembers.length === 1 ? 'Member' : 'Members'}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}