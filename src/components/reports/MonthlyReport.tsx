import { useState, useMemo } from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useMembersStore } from '@/store/membersStore';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCurrency, formatDate, getMonthlyExpectedIncome, getMonthlyCollected } from '@/utils/dateUtils';
import { exportMonthlyReportPDF, exportMonthlyReportCSV } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function MonthlyReport() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { members } = useMembersStore();
  const { payments } = usePaymentsStore();
  const { settings } = useSettingsStore();

  const reportData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const reportDate = new Date(year, month - 1, 1);
    
    const activeMembers = members.filter(m => m.active);
    const expectedIncome = getMonthlyExpectedIncome(activeMembers);
    const collected = getMonthlyCollected(payments, reportDate);
    
    // Group by frequency
    const frequencyStats = activeMembers.reduce((acc, member) => {
      const freq = member.payment_frequency;
      if (!acc[freq]) {
        acc[freq] = { count: 0, expectedAmount: 0 };
      }
      acc[freq].count++;
      
      // Calculate monthly equivalent
      const multiplier = freq === 'monthly' ? 1 : 
                        freq === 'three_months' ? 1/3 :
                        freq === 'six_months' ? 1/6 : 1/12;
      acc[freq].expectedAmount += member.payment_amount * multiplier;
      
      return acc;
    }, {} as Record<string, { count: number; expectedAmount: number }>);

    // Group by location
    const locationStats = activeMembers.reduce((acc, member) => {
      const location = member.location || 'Unknown';
      if (!acc[location]) {
        acc[location] = { count: 0, expectedAmount: 0 };
      }
      acc[location].count++;
      
      const multiplier = member.payment_frequency === 'monthly' ? 1 : 
                        member.payment_frequency === 'three_months' ? 1/3 :
                        member.payment_frequency === 'six_months' ? 1/6 : 1/12;
      acc[location].expectedAmount += member.payment_amount * multiplier;
      
      return acc;
    }, {} as Record<string, { count: number; expectedAmount: number }>);

    // Members who haven't paid this month
    const paidMemberIds = new Set(
      payments
        .filter(p => {
          const paymentDate = new Date(p.payment_date);
          return p.status === 'paid' && 
                 paymentDate.getFullYear() === year && 
                 paymentDate.getMonth() === month - 1;
        })
        .map(p => p.member_id)
    );

    const unpaidMembers = activeMembers.filter(member => !paidMemberIds.has(member.id));

    return {
      period: `${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      totalMembers: activeMembers.length,
      expectedIncome,
      collected,
      collectionRate: expectedIncome > 0 ? (collected / expectedIncome) * 100 : 0,
      frequencyStats,
      locationStats,
      unpaidMembers
    };
  }, [selectedMonth, members, payments]);

  const frequencyChartData = Object.entries(reportData.frequencyStats).map(([freq, data]) => ({
    frequency: freq.replace('_', ' '),
    count: data.count,
    amount: data.expectedAmount
  }));

  const locationChartData = Object.entries(reportData.locationStats).map(([location, data]) => ({
    location,
    count: data.count,
    amount: data.expectedAmount
  }));

  const handleExportPDF = async () => {
    try {
      await exportMonthlyReportPDF(reportData, settings);
      toast({
        title: 'PDF exported',
        description: 'Monthly report has been downloaded.'
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export PDF report.',
        variant: 'destructive'
      });
    }
  };

  const handleExportCSV = () => {
    try {
      exportMonthlyReportCSV(reportData);
      toast({
        title: 'CSV exported',
        description: 'Monthly report has been downloaded.'
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export CSV report.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Monthly Report</h1>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <FileText className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.expectedIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.collected)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.collectionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Members by Payment Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={frequencyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="frequency" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={locationChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ location, count }) => `${location}: ${count}`}
                >
                  {locationChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Frequency Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Monthly Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(reportData.frequencyStats).map(([freq, data]) => (
                  <TableRow key={freq}>
                    <TableCell className="capitalize">{freq.replace('_', ' ')}</TableCell>
                    <TableCell>{data.count}</TableCell>
                    <TableCell>{formatCurrency(data.expectedAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Monthly Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(reportData.locationStats).map(([location, data]) => (
                  <TableRow key={location}>
                    <TableCell>{location}</TableCell>
                    <TableCell>{data.count}</TableCell>
                    <TableCell>{formatCurrency(data.expectedAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Members */}
      {reportData.unpaidMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Members Who Haven't Paid This Month ({reportData.unpaidMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.unpaidMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.full_name}</TableCell>
                    <TableCell>{member.phone_number}</TableCell>
                    <TableCell>{formatCurrency(member.payment_amount)}</TableCell>
                    <TableCell className="capitalize">{member.payment_frequency.replace('_', ' ')}</TableCell>
                    <TableCell>{member.location || 'Unknown'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}