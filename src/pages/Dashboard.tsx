import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { useMembersStore } from '@/store/membersStore';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getMonthlyExpectedIncome, getMonthlyCollected, formatCurrency } from '@/utils/dateUtils';

export function Dashboard() {
  const { members } = useMembersStore();
  const { payments } = usePaymentsStore();
  const { settings } = useSettingsStore();

  const activeMembers = members.filter(m => m.active).length;
  const expectedIncome = getMonthlyExpectedIncome(members);
  const collectedIncome = getMonthlyCollected(payments);
  const unpaidCount = payments.filter(p => p.status === 'unpaid').length;
  const overdueCount = payments.filter(p => p.status === 'overdue').length;

  const stats = [
    {
      title: 'Active Members',
      value: activeMembers.toString(),
      icon: Users,
      description: 'Currently enrolled members',
    },
    {
      title: 'Expected Monthly Income',
      value: formatCurrency(expectedIncome, settings?.default_currency),
      icon: TrendingUp,
      description: 'Based on member frequencies',
    },
    {
      title: 'Collected This Month',
      value: formatCurrency(collectedIncome, settings?.default_currency),
      icon: DollarSign,
      description: `${expectedIncome > 0 ? ((collectedIncome / expectedIncome) * 100).toFixed(1) : 0}% collection rate`,
    },
    {
      title: 'Overdue Payments',
      value: (unpaidCount + overdueCount).toString(),
      icon: AlertCircle,
      description: `${overdueCount} overdue, ${unpaidCount} unpaid`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Hope Foundation membership management system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest member and payment activities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity feed will be implemented with detailed member interactions.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Quick action buttons for adding members, logging payments, and sending messages.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}