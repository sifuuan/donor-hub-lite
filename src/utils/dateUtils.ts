import { addMonths, addYears, format, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';
import { Member, Payment } from '@/types';

export function getNextDueDate(member: Member, lastPaymentDate?: string): Date {
  const startDate = lastPaymentDate ? parseISO(lastPaymentDate) : parseISO(member.payment_start_date);
  
  switch (member.payment_frequency) {
    case 'monthly':
      return addMonths(startDate, 1);
    case 'three_months':
      return addMonths(startDate, 3);
    case 'six_months':
      return addMonths(startDate, 6);
    case 'yearly':
      return addYears(startDate, 1);
    default:
      return addMonths(startDate, 1);
  }
}

export function getLastPaymentDate(payments: Payment[]): string | undefined {
  if (payments.length === 0) return undefined;
  
  const sortedPayments = payments
    .filter(p => p.status === 'paid')
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  
  return sortedPayments[0]?.payment_date;
}

export function getPaymentStatus(member: Member, payments: Payment[], reminderDays: number = 3): 'current' | 'due_soon' | 'overdue' {
  const lastPayment = getLastPaymentDate(payments);
  const nextDue = getNextDueDate(member, lastPayment);
  const today = new Date();
  const daysDiff = differenceInDays(nextDue, today);
  
  if (daysDiff < 0) return 'overdue';
  if (daysDiff <= reminderDays) return 'due_soon';
  return 'current';
}

export function isDue(member: Member, payments: Payment[], reminderDays: number = 3): boolean {
  const status = getPaymentStatus(member, payments, reminderDays);
  return status === 'due_soon' || status === 'overdue';
}

export function formatCurrency(amount: number, currency: string = 'ETB'): string {
  return `${amount.toLocaleString()} ${currency}`;
}

export function formatDate(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

export function getMonthlyExpectedIncome(members: Member[]): number {
  return members
    .filter(m => m.active)
    .reduce((total, member) => {
      switch (member.payment_frequency) {
        case 'monthly':
          return total + member.payment_amount;
        case 'three_months':
          return total + (member.payment_amount / 3);
        case 'six_months':
          return total + (member.payment_amount / 6);
        case 'yearly':
          return total + (member.payment_amount / 12);
        default:
          return total;
      }
    }, 0);
}

export function getMonthlyCollected(payments: Payment[], month?: Date): number {
  const targetMonth = month || new Date();
  const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
  
  return payments
    .filter(p => {
      const paymentDate = parseISO(p.payment_date);
      return p.status === 'paid' && 
             isAfter(paymentDate, startOfMonth) && 
             isBefore(paymentDate, endOfMonth);
    })
    .reduce((total, payment) => total + payment.amount, 0);
}