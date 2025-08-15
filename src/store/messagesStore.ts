import { create } from 'zustand';
import { Message } from '@/types';
import { localDataProvider } from '@/data/localDataProvider';

interface MessagesState {
  messages: Message[];
  isLoading: boolean;
  
  // Actions
  fetchMessages: () => Promise<void>;
  createMessage: (message: Omit<Message, 'id'>) => Promise<Message>;
  deleteMessage: (id: string) => Promise<void>;
  getMessagesByMember: (memberId: string) => Message[];
  createBulkReminders: (memberIds: string[]) => Promise<Message[]>;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: [],
  isLoading: false,

  fetchMessages: async () => {
    set({ isLoading: true });
    try {
      const messages = await localDataProvider.getMessages();
      set({ messages, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch messages:', error);
    }
  },

  createMessage: async (messageData) => {
    const message = await localDataProvider.createMessage(messageData);
    const { messages } = get();
    set({ messages: [...messages, message] });
    return message;
  },

  deleteMessage: async (id) => {
    await localDataProvider.deleteMessage(id);
    const { messages } = get();
    set({ messages: messages.filter(m => m.id !== id) });
  },

  getMessagesByMember: (memberId) => {
    const { messages } = get();
    return messages.filter(m => m.member_id === memberId);
  },

  createBulkReminders: async (memberIds) => {
    const createdMessages: Message[] = [];
    
    for (const memberId of memberIds) {
      const messageData = {
        member_id: memberId,
        message_type: 'reminder' as const,
        message_subject: 'Payment Reminder',
        message_content: 'Your membership contribution is due soon. Please make your payment to continue supporting our cause.',
        sent_at: new Date().toISOString(),
        channel: 'email' as const
      };
      
      const message = await localDataProvider.createMessage(messageData);
      createdMessages.push(message);
    }
    
    const { messages } = get();
    set({ messages: [...messages, ...createdMessages] });
    return createdMessages;
  }
}));