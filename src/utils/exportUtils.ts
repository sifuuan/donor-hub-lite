import Papa from 'papaparse';
import jsPDF from 'jspdf';
import { Member, Payment, Message, Settings } from '@/types';
import { formatCurrency, formatDate, getMonthlyExpectedIncome, getMonthlyCollected } from './dateUtils';

export function exportMembersToCSV(members: Member[]): string {
  const csvData = members.map(member => ({
    'Full Name': member.full_name,
    'Phone Number': member.phone_number,
    'Alt Phone': member.alt_phone_number || '',
    'Email': member.email,
    'Address': member.address || '',
    'Location': member.location || '',
    'Payment Amount': member.payment_amount,
    'Frequency': member.payment_frequency,
    'Start Date': member.payment_start_date,
    'Payment Method': member.payment_method,
    'Preferred Contact': member.preferred_contact,
    'Active': member.active ? 'Yes' : 'No',
    'Created At': formatDate(member.created_at)
  }));

  return Papa.unparse(csvData);
}

export function exportPaymentsToCSV(payments: Payment[], members: Member[]): string {
  const memberMap = new Map(members.map(m => [m.id, m.full_name]));
  
  const csvData = payments.map(payment => ({
    'Member Name': memberMap.get(payment.member_id) || 'Unknown',
    'Amount': payment.amount,
    'Payment Date': formatDate(payment.payment_date),
    'Payment Method': payment.payment_method,
    'Status': payment.status,
    'Notes': payment.notes || ''
  }));

  return Papa.unparse(csvData);
}

export function parseMembersFromCSV(csvString: string): Partial<Member>[] {
  const result = Papa.parse(csvString, { header: true, skipEmptyLines: true });
  
  return result.data.map((row: any) => ({
    full_name: row['Full Name'] || row['full_name'] || '',
    phone_number: row['Phone Number'] || row['phone_number'] || '',
    alt_phone_number: row['Alt Phone'] || row['alt_phone_number'] || undefined,
    email: row['Email'] || row['email'] || '',
    address: row['Address'] || row['address'] || undefined,
    location: row['Location'] || row['location'] || undefined,
    payment_amount: Number(row['Payment Amount'] || row['payment_amount']) || 0,
    payment_frequency: (row['Frequency'] || row['payment_frequency'] || 'monthly') as any,
    payment_start_date: row['Start Date'] || row['payment_start_date'] || new Date().toISOString().split('T')[0],
    payment_method: (row['Payment Method'] || row['payment_method'] || 'bank') as any,
    preferred_contact: (row['Preferred Contact'] || row['preferred_contact'] || 'email') as any,
    active: (row['Active'] || row['active'] || 'Yes').toLowerCase() === 'yes'
  }));
}

export function generateMonthlyReportPDF(
  members: Member[], 
  payments: Payment[], 
  settings: Settings,
  month: Date = new Date()
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.text(settings.org_name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(12);
  doc.text(settings.org_address, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  doc.setFontSize(16);
  doc.text(`Monthly Report - ${formatDate(month, 'MMMM yyyy')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Statistics
  const activeMembers = members.filter(m => m.active).length;
  const expectedIncome = getMonthlyExpectedIncome(members);
  const collectedIncome = getMonthlyCollected(payments, month);
  const unpaidCount = payments.filter(p => p.status === 'unpaid').length;
  const overdueCount = payments.filter(p => p.status === 'overdue').length;

  doc.setFontSize(12);
  const stats = [
    `Active Members: ${activeMembers}`,
    `Expected Monthly Income: ${formatCurrency(expectedIncome, settings.default_currency)}`,
    `Collected This Month: ${formatCurrency(collectedIncome, settings.default_currency)}`,
    `Unpaid Payments: ${unpaidCount}`,
    `Overdue Payments: ${overdueCount}`,
    `Collection Rate: ${expectedIncome > 0 ? ((collectedIncome / expectedIncome) * 100).toFixed(1) : 0}%`
  ];

  stats.forEach(stat => {
    doc.text(stat, 20, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Breakdown by Frequency
  doc.setFontSize(14);
  doc.text('Breakdown by Payment Frequency', 20, yPosition);
  yPosition += 10;

  const frequencyStats = {
    monthly: members.filter(m => m.active && m.payment_frequency === 'monthly').length,
    three_months: members.filter(m => m.active && m.payment_frequency === 'three_months').length,
    six_months: members.filter(m => m.active && m.payment_frequency === 'six_months').length,
    yearly: members.filter(m => m.active && m.payment_frequency === 'yearly').length
  };

  Object.entries(frequencyStats).forEach(([freq, count]) => {
    doc.text(`${freq.replace('_', ' ')}: ${count} members`, 30, yPosition);
    yPosition += 6;
  });

  yPosition += 10;

  // Breakdown by Location
  doc.setFontSize(14);
  doc.text('Breakdown by Location', 20, yPosition);
  yPosition += 10;

  const locationStats = members
    .filter(m => m.active && m.location)
    .reduce((acc, member) => {
      acc[member.location!] = (acc[member.location!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  Object.entries(locationStats).forEach(([location, count]) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(`${location}: ${count} members`, 30, yPosition);
    yPosition += 6;
  });

  // Footer
  doc.setFontSize(10);
  doc.text(`Generated on ${formatDate(new Date())}`, 20, doc.internal.pageSize.height - 10);

  // Download
  doc.save(`monthly-report-${formatDate(month, 'yyyy-MM')}.pdf`);
}

export function downloadFile(content: string, filename: string, type: string = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportMonthlyReportPDF(
  members: Member[], 
  payments: Payment[], 
  settings: Settings,
  month: Date = new Date()
): void {
  return generateMonthlyReportPDF(members, payments, settings, month);
}

export function exportMonthlyReportCSV(
  members: Member[], 
  payments: Payment[], 
  settings: Settings,
  month: Date = new Date()
): string {
  const activeMembers = members.filter(m => m.active).length;
  const expectedIncome = getMonthlyExpectedIncome(members);
  const collectedIncome = getMonthlyCollected(payments, month);
  const unpaidCount = payments.filter(p => p.status === 'unpaid').length;
  const overdueCount = payments.filter(p => p.status === 'overdue').length;

  const csvData = [
    ['Monthly Report', formatDate(month, 'MMMM yyyy')],
    [''],
    ['Active Members', activeMembers],
    ['Expected Monthly Income', expectedIncome],
    ['Collected This Month', collectedIncome],
    ['Unpaid Payments', unpaidCount],
    ['Overdue Payments', overdueCount],
    ['Collection Rate (%)', expectedIncome > 0 ? ((collectedIncome / expectedIncome) * 100).toFixed(1) : 0]
  ];

  return Papa.unparse(csvData);
}

export function exportAnnualSummaryPDF(
  members: Member[], 
  payments: Payment[], 
  settings: Settings,
  year: number = new Date().getFullYear()
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.text(settings.org_name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(12);
  doc.text(settings.org_address, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  doc.setFontSize(16);
  doc.text(`Annual Summary - ${year}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Annual statistics
  const yearPayments = payments.filter(p => new Date(p.payment_date).getFullYear() === year);
  const totalCollected = yearPayments.reduce((sum, p) => sum + p.amount, 0);
  const activeMembers = members.filter(m => m.active).length;

  doc.setFontSize(12);
  const stats = [
    `Total Members: ${members.length}`,
    `Active Members: ${activeMembers}`,
    `Total Collected: ${formatCurrency(totalCollected, settings.default_currency)}`,
    `Total Payments: ${yearPayments.length}`
  ];

  stats.forEach(stat => {
    doc.text(stat, 20, yPosition);
    yPosition += 8;
  });

  // Footer
  doc.setFontSize(10);
  doc.text(`Generated on ${formatDate(new Date())}`, 20, doc.internal.pageSize.height - 10);

  doc.save(`annual-summary-${year}.pdf`);
}

export function exportAnnualSummaryCSV(
  members: Member[], 
  payments: Payment[], 
  settings: Settings,
  year: number = new Date().getFullYear()
): string {
  const yearPayments = payments.filter(p => new Date(p.payment_date).getFullYear() === year);
  const totalCollected = yearPayments.reduce((sum, p) => sum + p.amount, 0);
  const activeMembers = members.filter(m => m.active).length;

  const csvData = [
    ['Annual Summary', year],
    [''],
    ['Total Members', members.length],
    ['Active Members', activeMembers],
    ['Total Collected', totalCollected],
    ['Total Payments', yearPayments.length]
  ];

  return Papa.unparse(csvData);
}