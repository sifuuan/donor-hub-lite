import { create } from 'zustand';
import { Payment } from '@/types';
import { localDataProvider } from '@/data/localDataProvider';

interface PaymentsState {
  payments: Payment[];
  isLoading: boolean;
  
  // Actions
  fetchPayments: () => Promise<void>;
  createPayment: (payment: Omit<Payment, 'id'>) => Promise<Payment>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  getPaymentsByMember: (memberId: string) => Payment[];
}

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  payments: [],
  isLoading: false,

  fetchPayments: async () => {
    set({ isLoading: true });
    try {
      const payments = await localDataProvider.getPayments();
      set({ payments, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch payments:', error);
    }
  },

  createPayment: async (paymentData) => {
    const payment = await localDataProvider.createPayment(paymentData);
    const { payments } = get();
    set({ payments: [...payments, payment] });
    return payment;
  },

  updatePayment: async (id, updates) => {
    const updatedPayment = await localDataProvider.updatePayment(id, updates);
    const { payments } = get();
    set({ payments: payments.map(p => p.id === id ? updatedPayment : p) });
  },

  deletePayment: async (id) => {
    await localDataProvider.deletePayment(id);
    const { payments } = get();
    set({ payments: payments.filter(p => p.id !== id) });
  },

  getPaymentsByMember: (memberId) => {
    const { payments } = get();
    return payments.filter(p => p.member_id === memberId);
  }
}));