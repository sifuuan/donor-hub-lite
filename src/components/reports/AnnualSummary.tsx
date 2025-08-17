import { useState, useMemo } from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useMembersStore } from '@/store/membersStore';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCurrency, getMonthlyCollected } from '@/utils/dateUtils';
import { exportAnnualSummaryPDF, exportAnnualSummaryCSV } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';

export function AnnualSummary() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { members } = useMembersStore();
  const { payments } = usePaymentsStore();
  const { settings } = useSettingsStore();

  const annualData = useMemo(() => {
    const year = parseInt(selectedYear);
    
    // Generate monthly data
    const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => {
      const month = new Date(year, monthIndex, 1);
      const collected = getMonthlyCollected(payments, month);
      
      return {
        month: month.toLocaleDateString('en-US', { month: 'short' }),
        collected,
        memberCount: members.filter(m => {
          const joinDate = new Date(m.created_at);
          return joinDate.getFullYear() <= year && 
                 joinDate.getMonth() <= monthIndex;
        }).length
      };
    });

    // Calculate totals
    const totalCollected = monthlyData.reduce((sum, month) => sum + month.collected, 0);
    const averageMonthly = totalCollected / 12;
    const peakMonth = monthlyData.reduce((max, month) => 
      month.collected > max.collected ? month : max
    );
    const lowestMonth = monthlyData.reduce((min, month) => 
      month.collected < min.collected ? month : min
    );

    // Member growth
    const startYearMembers = members.filter(m => 
      new Date(m.created_at).getFullYear() < year
    ).length;
    const endYearMembers = members.filter(m => 
      new Date(m.created_at).getFullYear() <= year
    ).length;
    const newMembers = endYearMembers - startYearMembers;

    return {
      year,
      monthlyData,
      totalCollected,
      averageMonthly,
      peakMonth,
      lowestMonth,
      startYearMembers,
      endYearMembers,
      newMembers,
      memberGrowthRate: startYearMembers > 0 ? ((newMembers / startYearMembers) * 100) : 0
    };
  }, [selectedYear, members, payments]);

  const handleExportPDF = async () => {
    try {
      await exportAnnualSummaryPDF(annualData, settings);
      toast({
        title: 'PDF exported',
        description: 'Annual summary has been downloaded.'
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
      exportAnnualSummaryCSV(annualData);
      toast({
        title: 'CSV exported',
        description: 'Annual summary has been downloaded.'
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
          <h1 className="text-2xl font-bold">Annual Summary</h1>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(annualData.totalCollected)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(annualData.averageMonthly)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{annualData.endYearMembers}</div>
            <div className="text-xs text-muted-foreground">
              +{annualData.newMembers} new members
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{annualData.memberGrowthRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Collections ({annualData.year})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={annualData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value as number), 'Collected']}
                />
                <Line 
                  type="monotone" 
                  dataKey="collected" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Growth ({annualData.year})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={annualData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="memberCount" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Best Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="font-medium">Peak Collection Month</label>
                <p className="text-lg">{annualData.peakMonth.month} - {formatCurrency(annualData.peakMonth.collected)}</p>
              </div>
              <div>
                <label className="font-medium">Total Annual Collection</label>
                <p className="text-lg">{formatCurrency(annualData.totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="font-medium">Lowest Collection Month</label>
                <p className="text-lg">{annualData.lowestMonth.month} - {formatCurrency(annualData.lowestMonth.collected)}</p>
              </div>
              <div>
                <label className="font-medium">Opportunity Gap</label>
                <p className="text-lg">{formatCurrency(annualData.peakMonth.collected - annualData.lowestMonth.collected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}