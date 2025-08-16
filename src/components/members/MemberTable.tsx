import { useState, useMemo } from 'react';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  DollarSign, 
  MessageSquare, 
  Phone, 
  Mail,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMembersStore } from '@/store/membersStore';
import { usePaymentsStore } from '@/store/paymentsStore';
import { Member } from '@/types';
import { formatCurrency, formatDate, getPaymentStatus, getNextDueDate, getLastPaymentDate } from '@/utils/dateUtils';
import { searchMembers } from '@/utils/searchUtils';

interface MemberTableProps {
  onEditMember: (member: Member) => void;
  onDeleteMember: (member: Member) => void;
  onAddPayment: (member: Member) => void;
  onSendMessage: (member: Member) => void;
}

export function MemberTable({ onEditMember, onDeleteMember, onAddPayment, onSendMessage }: MemberTableProps) {
  const { members } = useMembersStore();
  const { payments } = usePaymentsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const uniqueLocations = useMemo(() => {
    const locations = members
      .map(m => m.location)
      .filter((location): location is string => Boolean(location))
      .filter((location, index, arr) => arr.indexOf(location) === index);
    return ['all', ...locations];
  }, [members]);

  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Search filter
    if (searchTerm) {
      const searchResults = searchMembers(members, searchTerm);
      filtered = searchResults.map(result => result.member);
    }

    // Frequency filter
    if (frequencyFilter !== 'all') {
      filtered = filtered.filter(m => m.payment_frequency === frequencyFilter);
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(m => m.location === locationFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => {
        if (statusFilter === 'active') return m.active;
        if (statusFilter === 'inactive') return !m.active;
        
        const memberPayments = payments.filter(p => p.member_id === m.id);
        const paymentStatus = getPaymentStatus(m, memberPayments);
        
        if (statusFilter === 'current') return paymentStatus === 'current';
        if (statusFilter === 'due_soon') return paymentStatus === 'due_soon';
        if (statusFilter === 'overdue') return paymentStatus === 'overdue';
        
        return true;
      });
    }

    return filtered;
  }, [members, payments, searchTerm, frequencyFilter, statusFilter, locationFilter]);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMembers, currentPage]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

  const getStatusBadge = (member: Member) => {
    if (!member.active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    const memberPayments = payments.filter(p => p.member_id === member.id);
    const status = getPaymentStatus(member, memberPayments);
    
    switch (status) {
      case 'current':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Current
          </Badge>
        );
      case 'due_soon':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Due Soon
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getNextDue = (member: Member) => {
    const memberPayments = payments.filter(p => p.member_id === member.id);
    const lastPayment = getLastPaymentDate(memberPayments);
    const nextDue = getNextDueDate(member, lastPayment);
    return formatDate(nextDue);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members ({filteredMembers.length})</CardTitle>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-sm"
          />
          
          <div className="flex gap-2">
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="three_months">3 Months</SelectItem>
                <SelectItem value="six_months">6 Months</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="due_soon">Due Soon</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {uniqueLocations.map(location => (
                  <SelectItem key={location} value={location}>
                    {location === 'all' ? 'All Locations' : location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{member.full_name}</div>
                    <div className="text-sm text-muted-foreground">{member.location}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-3 h-3" />
                      {member.phone_number}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {formatCurrency(member.payment_amount)}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {member.payment_frequency.replace('_', ' ')}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {getNextDue(member)}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(member)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditMember(member)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAddPayment(member)}>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Add Payment
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSendMessage(member)}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDeleteMember(member)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {filteredMembers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No members found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}