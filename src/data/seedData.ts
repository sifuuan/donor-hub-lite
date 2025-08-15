import { localDataProvider } from './localDataProvider';
import { Member, Payment, Message } from '@/types';

export async function seedData() {
  // Check if data already exists
  const existingMembers = await localDataProvider.getMembers();
  if (existingMembers.length > 0) return;

  // Generate 40 realistic members
  const locations = ['Addis Ababa', 'Bahir Dar', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Jimma', 'Gondar', 'Adama'];
  const frequencies: Array<'monthly' | 'three_months' | 'six_months' | 'yearly'> = ['monthly', 'three_months', 'six_months', 'yearly'];
  const methods: Array<'bank' | 'cash' | 'branch'> = ['bank', 'cash', 'branch'];
  const contacts: Array<'email' | 'sms' | 'both'> = ['email', 'sms', 'both'];

  const firstNames = ['Abebe', 'Almaz', 'Bekele', 'Desta', 'Emebet', 'Fasil', 'Genet', 'Hailu', 'Aster', 'Kebede', 'Lemlem', 'Mulatu', 'Netsanet', 'Olana', 'Rahel', 'Selamawit', 'Tadesse', 'Tigist', 'Wolde', 'Yonas'];
  const lastNames = ['Alemu', 'Bekele', 'Desta', 'Girma', 'Haile', 'Kebede', 'Lemma', 'Mekonnen', 'Negash', 'Tadesse', 'Tesfaye', 'Worku', 'Yilma', 'Zenebe', 'Abebe', 'Shiferaw', 'Gebremedhin', 'Woldemichael', 'Assefa', 'Mulugeta'];

  const members: Omit<Member, 'id' | 'created_at'>[] = [];
  
  for (let i = 0; i < 40; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;
    
    const member: Omit<Member, 'id' | 'created_at'> = {
      full_name: fullName,
      phone_number: `+251-9-${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      alt_phone_number: Math.random() > 0.6 ? `+251-9-${String(Math.floor(Math.random() * 90000000) + 10000000)}` : undefined,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      address: Math.random() > 0.3 ? `${Math.floor(Math.random() * 999) + 1} ${lastName} Street` : undefined,
      location: locations[Math.floor(Math.random() * locations.length)],
      payment_amount: [200, 300, 500, 750, 1000, 1500, 2000][Math.floor(Math.random() * 7)],
      payment_frequency: frequencies[Math.floor(Math.random() * frequencies.length)],
      payment_start_date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      payment_method: methods[Math.floor(Math.random() * methods.length)],
      preferred_contact: contacts[Math.floor(Math.random() * contacts.length)],
      active: Math.random() > 0.1, // 90% active
    };
    
    members.push(member);
  }

  // Create members and collect their IDs
  const createdMembers = [];
  for (const memberData of members) {
    const member = await localDataProvider.createMember(memberData);
    createdMembers.push(member);
  }

  // Generate payments for members
  const payments: Omit<Payment, 'id'>[] = [];
  
  for (const member of createdMembers) {
    const paymentCount = Math.floor(Math.random() * 6) + 1; // 1-6 payments per member
    
    for (let i = 0; i < paymentCount; i++) {
      const baseDate = new Date(member.payment_start_date);
      let paymentDate = new Date(baseDate);
      
      // Add intervals based on frequency
      switch (member.payment_frequency) {
        case 'monthly':
          paymentDate.setMonth(baseDate.getMonth() + i);
          break;
        case 'three_months':
          paymentDate.setMonth(baseDate.getMonth() + (i * 3));
          break;
        case 'six_months':
          paymentDate.setMonth(baseDate.getMonth() + (i * 6));
          break;
        case 'yearly':
          paymentDate.setFullYear(baseDate.getFullYear() + i);
          break;
      }

      // Don't create future payments beyond next month
      if (paymentDate > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) continue;

      const statuses: Array<'paid' | 'unpaid' | 'overdue'> = ['paid', 'paid', 'paid', 'unpaid', 'overdue'];
      const status = paymentDate < new Date() ? statuses[Math.floor(Math.random() * statuses.length)] : 'unpaid';

      const payment: Omit<Payment, 'id'> = {
        member_id: member.id,
        amount: member.payment_amount + (Math.random() > 0.8 ? Math.floor(Math.random() * 100) - 50 : 0), // Some variation
        payment_date: paymentDate.toISOString(),
        payment_method: member.payment_method,
        status,
        notes: Math.random() > 0.7 ? ['Bank transfer confirmed', 'Cash payment received', 'Paid at branch office', 'Late payment'][Math.floor(Math.random() * 4)] : undefined
      };
      
      payments.push(payment);
    }
  }

  // Create payments
  for (const paymentData of payments) {
    await localDataProvider.createPayment(paymentData);
  }

  // Generate some messages
  const messages: Omit<Message, 'id'>[] = [];
  const messageTypes: Array<'reminder' | 'thank_you' | 'announcement'> = ['reminder', 'thank_you', 'announcement'];
  
  // Some individual messages
  for (let i = 0; i < 15; i++) {
    const member = createdMembers[Math.floor(Math.random() * createdMembers.length)];
    const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    
    let subject = '';
    let content = '';
    
    switch (messageType) {
      case 'reminder':
        subject = 'Payment Reminder';
        content = `Dear ${member.full_name}, your membership contribution of ${member.payment_amount} ETB is due soon. Thank you for your continued support.`;
        break;
      case 'thank_you':
        subject = 'Thank You';
        content = `Dear ${member.full_name}, thank you for your recent contribution of ${member.payment_amount} ETB. Your support makes a difference.`;
        break;
      case 'announcement':
        subject = 'Foundation Update';
        content = `Dear ${member.full_name}, we have exciting updates to share about our recent projects and achievements.`;
        break;
    }

    const message: Omit<Message, 'id'> = {
      member_id: member.id,
      message_type: messageType,
      message_subject: subject,
      message_content: content,
      sent_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      channel: 'email'
    };
    
    messages.push(message);
  }

  // Some bulk announcement messages
  for (let i = 0; i < 3; i++) {
    const message: Omit<Message, 'id'> = {
      member_id: undefined, // Bulk message
      message_type: 'announcement',
      message_subject: ['Monthly Newsletter', 'Year-end Update', 'New Project Launch'][i],
      message_content: 'This is a bulk announcement sent to all active members about important foundation updates.',
      sent_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(), // Last 60 days
      channel: 'email'
    };
    
    messages.push(message);
  }

  // Create messages
  for (const messageData of messages) {
    await localDataProvider.createMessage(messageData);
  }

  console.log('Seed data created successfully!');
}