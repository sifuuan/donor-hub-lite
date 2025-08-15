import Fuse from 'fuse.js';
import { Member, SearchResult } from '@/types';

const fuseOptions = {
  keys: [
    { name: 'full_name', weight: 0.3 },
    { name: 'phone_number', weight: 0.25 },
    { name: 'alt_phone_number', weight: 0.2 },
    { name: 'email', weight: 0.15 },
    { name: 'location', weight: 0.1 }
  ],
  threshold: 0.4,
  includeMatches: true,
  includeScore: true,
  minMatchCharLength: 2
};

export function searchMembers(members: Member[], query: string): SearchResult[] {
  if (!query.trim()) return [];
  
  const fuse = new Fuse(members, fuseOptions);
  const results = fuse.search(query);
  
  return results.map(result => ({
    member: result.item,
    matches: result.matches?.map(match => match.key || '') || []
  }));
}

export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
}

export function filterMembers(
  members: Member[], 
  filters: {
    frequency?: string;
    method?: string;
    location?: string;
    active?: boolean;
    search?: string;
  }
): Member[] {
  return members.filter(member => {
    if (filters.frequency && member.payment_frequency !== filters.frequency) return false;
    if (filters.method && member.payment_method !== filters.method) return false;
    if (filters.location && member.location !== filters.location) return false;
    if (filters.active !== undefined && member.active !== filters.active) return false;
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        member.full_name.toLowerCase().includes(searchTerm) ||
        member.phone_number.toLowerCase().includes(searchTerm) ||
        member.alt_phone_number?.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm) ||
        member.location?.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });
}