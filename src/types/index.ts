export interface Member {
  id: string;
  full_name: string;
  phone_number: string;
  alt_phone_number?: string;
  email: string;
  address?: string;
  location?: string;
  payment_amount: number;
  payment_frequency: 'monthly' | 'three_months' | 'six_months' | 'yearly';
  payment_start_date: string; // YYYY-MM-DD
  payment_method: 'bank' | 'cash' | 'branch';
  preferred_contact: 'email' | 'sms' | 'both';
  active: boolean;
  created_at: string; // ISO
}

export interface Payment {
  id: string;
  member_id: string;
  amount: number;
  payment_date: string; // ISO
  payment_method: 'bank' | 'cash' | 'branch';
  status: 'paid' | 'unpaid' | 'overdue';
  notes?: string;
}

export interface Message {
  id: string;
  member_id?: string; // nullable for bulk messages
  message_type: 'reminder' | 'thank_you' | 'announcement';
  message_subject?: string;
  message_content: string;
  sent_at: string; // ISO
  channel: 'email';
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'staff';
}

export interface Settings {
  org_name: string;
  org_address: string;
  default_currency: string;
  from_email: string;
  reminder_window_days: number;
  default_payment_amount: number;
  theme: 'light' | 'dark';
  primary_color: string;
}

export interface SearchResult {
  member: Member;
  matches: string[];
}

export interface DashboardStats {
  activeMembers: number;
  expectedMonthlyIncome: number;
  collectedThisMonth: number;
  unpaidCount: number;
  overdueCount: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expected: number;
}