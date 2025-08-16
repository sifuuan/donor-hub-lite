import { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, Mail, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMembersStore } from '@/store/membersStore';
import { searchMembers } from '@/utils/searchUtils';
import { Member, SearchResult } from '@/types';

interface GlobalSearchProps {
  onMemberSelect?: (member: Member) => void;
  onQuickAction?: (action: 'payment' | 'message', member: Member) => void;
}

export function GlobalSearch({ onMemberSelect, onQuickAction }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const { members } = useMembersStore();

  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchMembers(members, query);
      setResults(searchResults);
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, members]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selectedMember = results[selectedIndex]?.member;
          if (selectedMember) {
            handleMemberSelect(selectedMember);
          }
        } else if (e.key === 'Escape') {
          setIsOpen(false);
          inputRef.current?.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleMemberSelect = (member: Member) => {
    setQuery('');
    setIsOpen(false);
    onMemberSelect?.(member);
  };

  const handleQuickAction = (action: 'payment' | 'message', member: Member) => {
    setQuery('');
    setIsOpen(false);
    onQuickAction?.(action, member);
  };

  const highlightText = (text: string, matches: string[]) => {
    if (!matches.length) return text;
    
    let highlighted = text;
    matches.forEach(match => {
      const regex = new RegExp(`(${match})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  return (
    <div className="relative w-96">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search members... (Press / to focus)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={(e) => {
            // Delay hiding to allow clicks on results
            setTimeout(() => {
              if (!resultsRef.current?.contains(e.relatedTarget as Node)) {
                setIsOpen(false);
              }
            }, 200);
          }}
          className="pl-10"
        />
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute top-full mt-1 w-full z-50 max-h-96 overflow-auto shadow-lg">
          <CardContent className="p-0" ref={resultsRef}>
            {results.map((result, index) => (
              <div
                key={result.member.id}
                className={`p-3 border-b border-border last:border-b-0 cursor-pointer transition-colors ${
                  index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleMemberSelect(result.member)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">
                        {highlightText(result.member.full_name, result.matches)}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{highlightText(result.member.phone_number, result.matches)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{highlightText(result.member.email, result.matches)}</span>
                      </div>
                      
                      {result.member.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{highlightText(result.member.location, result.matches)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAction('payment', result.member);
                      }}
                      className="h-8 px-2 text-xs"
                    >
                      Payment
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAction('message', result.member);
                      }}
                      className="h-8 px-2 text-xs"
                    >
                      Message
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isOpen && query && results.length === 0 && (
        <Card className="absolute top-full mt-1 w-full z-50 shadow-lg">
          <CardContent className="p-4 text-center text-muted-foreground">
            No members found for "{query}"
          </CardContent>
        </Card>
      )}
    </div>
  );
}