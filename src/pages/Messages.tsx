import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageForm } from '@/components/messages/MessageForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMessagesStore } from '@/store/messagesStore';
import { useMembersStore } from '@/store/membersStore';
import { formatDate } from '@/utils/dateUtils';

export function Messages() {
  const { messages } = useMessagesStore();
  const { members } = useMembersStore();
  const [showMessageForm, setShowMessageForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Member communication history</p>
        </div>
        <Button onClick={() => setShowMessageForm(true)}>
          Send Message
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sent Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.slice(0, 20).map((message) => {
                const member = message.member_id ? members.find(m => m.id === message.member_id) : null;
                return (
                  <TableRow key={message.id}>
                    <TableCell>{member?.full_name || 'All Members'}</TableCell>
                    <TableCell>{message.message_subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {message.message_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(message.sent_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MessageForm
        open={showMessageForm}
        onOpenChange={setShowMessageForm}
      />
    </div>
  );
}