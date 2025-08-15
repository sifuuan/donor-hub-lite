import { create } from 'zustand';
import { Member } from '@/types';
import { localDataProvider } from '@/data/localDataProvider';

interface MembersState {
  members: Member[];
  isLoading: boolean;
  searchTerm: string;
  selectedMember: Member | null;
  
  // Actions
  fetchMembers: () => Promise<void>;
  createMember: (member: Omit<Member, 'id' | 'created_at'>) => Promise<Member>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  setSelectedMember: (member: Member | null) => void;
  setSearchTerm: (term: string) => void;
  importMembers: (members: Member[]) => Promise<void>;
}

export const useMembersStore = create<MembersState>((set, get) => ({
  members: [],
  isLoading: false,
  searchTerm: '',
  selectedMember: null,

  fetchMembers: async () => {
    set({ isLoading: true });
    try {
      const members = await localDataProvider.getMembers();
      set({ members, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch members:', error);
    }
  },

  createMember: async (memberData) => {
    const member = await localDataProvider.createMember(memberData);
    const { members } = get();
    set({ members: [...members, member] });
    return member;
  },

  updateMember: async (id, updates) => {
    const updatedMember = await localDataProvider.updateMember(id, updates);
    const { members } = get();
    set({ 
      members: members.map(m => m.id === id ? updatedMember : m),
      selectedMember: get().selectedMember?.id === id ? updatedMember : get().selectedMember
    });
  },

  deleteMember: async (id) => {
    await localDataProvider.deleteMember(id);
    const { members } = get();
    set({ 
      members: members.filter(m => m.id !== id),
      selectedMember: get().selectedMember?.id === id ? null : get().selectedMember
    });
  },

  setSelectedMember: (member) => {
    set({ selectedMember: member });
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
  },

  importMembers: async (newMembers) => {
    const promises = newMembers.map(member => 
      localDataProvider.createMember(member)
    );
    const createdMembers = await Promise.all(promises);
    const { members } = get();
    set({ members: [...members, ...createdMembers] });
  }
}));