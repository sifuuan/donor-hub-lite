import { get, set, del, clear } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { DataProvider } from './DataProvider';
import { Member, Payment, Message, User, Settings } from '@/types';

class LocalDataProvider implements DataProvider {
  private async getCollection<T>(key: string): Promise<T[]> {
    return (await get(key)) || [];
  }

  private async setCollection<T>(key: string, data: T[]): Promise<void> {
    await set(key, data);
  }

  // Members
  async getMembers(): Promise<Member[]> {
    return this.getCollection<Member>('members');
  }

  async getMember(id: string): Promise<Member | null> {
    const members = await this.getMembers();
    return members.find(m => m.id === id) || null;
  }

  async createMember(memberData: Omit<Member, 'id' | 'created_at'>): Promise<Member> {
    const members = await this.getMembers();
    const member: Member = {
      ...memberData,
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    members.push(member);
    await this.setCollection('members', members);
    return member;
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    const members = await this.getMembers();
    const index = members.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Member not found');
    
    members[index] = { ...members[index], ...updates };
    await this.setCollection('members', members);
    return members[index];
  }

  async deleteMember(id: string): Promise<void> {
    const members = await this.getMembers();
    const filtered = members.filter(m => m.id !== id);
    await this.setCollection('members', filtered);
    
    // Also delete related payments and messages
    const payments = await this.getPayments();
    const messages = await this.getMessages();
    await this.setCollection('payments', payments.filter(p => p.member_id !== id));
    await this.setCollection('messages', messages.filter(m => m.member_id !== id));
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return this.getCollection<Payment>('payments');
  }

  async getPaymentsByMember(memberId: string): Promise<Payment[]> {
    const payments = await this.getPayments();
    return payments.filter(p => p.member_id === memberId);
  }

  async createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
    const payments = await this.getPayments();
    const payment: Payment = {
      ...paymentData,
      id: uuidv4()
    };
    payments.push(payment);
    await this.setCollection('payments', payments);
    return payment;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const payments = await this.getPayments();
    const index = payments.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Payment not found');
    
    payments[index] = { ...payments[index], ...updates };
    await this.setCollection('payments', payments);
    return payments[index];
  }

  async deletePayment(id: string): Promise<void> {
    const payments = await this.getPayments();
    const filtered = payments.filter(p => p.id !== id);
    await this.setCollection('payments', filtered);
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    return this.getCollection<Message>('messages');
  }

  async getMessagesByMember(memberId: string): Promise<Message[]> {
    const messages = await this.getMessages();
    return messages.filter(m => m.member_id === memberId);
  }

  async createMessage(messageData: Omit<Message, 'id'>): Promise<Message> {
    const messages = await this.getMessages();
    const message: Message = {
      ...messageData,
      id: uuidv4()
    };
    messages.push(message);
    await this.setCollection('messages', messages);
    return message;
  }

  async deleteMessage(id: string): Promise<void> {
    const messages = await this.getMessages();
    const filtered = messages.filter(m => m.id !== id);
    await this.setCollection('messages', filtered);
  }

  // Auth
  async login(email: string, password: string): Promise<User | null> {
    // Simple hardcoded auth for demo
    const users = [
      { id: '1', email: 'admin@example.com', password: 'admin123', role: 'admin' as const },
      { id: '2', email: 'staff@example.com', password: 'staff123', role: 'staff' as const }
    ];
    
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      await set('currentUser', userWithoutPassword);
      return userWithoutPassword;
    }
    return null;
  }

  async getCurrentUser(): Promise<User | null> {
    return (await get('currentUser')) || null;
  }

  async logout(): Promise<void> {
    await del('currentUser');
  }

  // Settings
  async getSettings(): Promise<Settings> {
    const defaultSettings: Settings = {
      org_name: 'Hope Foundation',
      org_address: 'Addis Ababa, Ethiopia',
      default_currency: 'ETB',
      from_email: 'admin@hopefoundation.org',
      reminder_window_days: 3,
      default_payment_amount: 500,
      theme: 'light',
      primary_color: '#3B82F6'
    };
    
    return (await get('settings')) || defaultSettings;
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const settings = await this.getSettings();
    const newSettings = { ...settings, ...updates };
    await set('settings', newSettings);
    return newSettings;
  }

  // Data management
  async exportData(): Promise<string> {
    const data = {
      members: await this.getMembers(),
      payments: await this.getPayments(),
      messages: await this.getMessages(),
      settings: await this.getSettings(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.members) await this.setCollection('members', data.members);
      if (data.payments) await this.setCollection('payments', data.payments);
      if (data.messages) await this.setCollection('messages', data.messages);
      if (data.settings) await set('settings', data.settings);
    } catch (error) {
      throw new Error('Invalid data format');
    }
  }

  async clearData(): Promise<void> {
    await clear();
  }
}

export const localDataProvider = new LocalDataProvider();