import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useMembersStore } from '@/store/membersStore';
import { useMessagesStore } from '@/store/messagesStore';
import { formatCurrency, formatDate } from '@/utils/dateUtils';

export function Payments() {
  const { payments } = usePaymentsStore();
  const { members } = useMembersStore();
  const { createBulkReminders } = useMessagesStore();
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handleRunReminders = async () => {
    const dueMembers = members.filter(m => m.active);
    await createBulkReminders(dueMembers.map(m => m.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track and manage member payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunReminders}>
            Run Reminders
          </Button>
          <Button onClick={() => setShowPaymentForm(true)}>
            Log Payment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.slice(0, 10).map((payment) => {
                const member = members.find(m => m.id === payment.member_id);
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{member?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell className="capitalize">{payment.payment_method}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaymentForm
        open={showPaymentForm}
        onOpenChange={setShowPaymentForm}
      />
    </div>
  );
}