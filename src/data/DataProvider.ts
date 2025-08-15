import { Member, Payment, Message, User, Settings } from '@/types';

export interface DataProvider {
  // Members
  getMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | null>;
  createMember(member: Omit<Member, 'id' | 'created_at'>): Promise<Member>;
  updateMember(id: string, updates: Partial<Member>): Promise<Member>;
  deleteMember(id: string): Promise<void>;
  
  // Payments
  getPayments(): Promise<Payment[]>;
  getPaymentsByMember(memberId: string): Promise<Payment[]>;
  createPayment(payment: Omit<Payment, 'id'>): Promise<Payment>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment>;
  deletePayment(id: string): Promise<void>;
  
  // Messages
  getMessages(): Promise<Message[]>;
  getMessagesByMember(memberId: string): Promise<Message[]>;
  createMessage(message: Omit<Message, 'id'>): Promise<Message>;
  deleteMessage(id: string): Promise<void>;
  
  // Auth
  login(email: string, password: string): Promise<User | null>;
  getCurrentUser(): Promise<User | null>;
  logout(): Promise<void>;
  
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<Settings>): Promise<Settings>;
  
  // Data management
  exportData(): Promise<string>; // JSON string
  importData(data: string): Promise<void>;
  clearData(): Promise<void>;
}