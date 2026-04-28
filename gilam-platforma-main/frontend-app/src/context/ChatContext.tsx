'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  isRead: boolean;
}

interface ChatContextType {
  socket: Socket | null;
  messages: Message[];
  conversations: any[];
  sendMessage: (recipientId: string, text: string) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
    const socketInstance = io(`${WS_BASE}/chat`, {
        query: { token },
        transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to real-time chat gateway');
    });

    socketInstance.on('newMessage', (message: Message) => {
      setMessages(prev => {
        // Dublikat oldini olish - xabar allaqachon mavjud bo'lsa qo'shmaymiz
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    // Operator o'zi yuborgan xabar qaytganda ham dublikat tekshiruvi
    socketInstance.on('messageSent', (message: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    const initSocket = () => {
      setSocket(socketInstance);
    };

    initSocket();

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const sendMessage = useCallback((recipientId: string, text: string) => {
    if (socket) {
      const companyId = localStorage.getItem('companyId') || '';
      socket.emit('sendMessage', { recipientId, text, companyId });
      // Xabar 'messageSent' event orqali qaytadi — callbackda qo'shmaymiz
    }
  }, [socket]);

  return (
    <ChatContext.Provider value={{ 
      socket, 
      messages, 
      conversations, 
      sendMessage, 
      activeConversationId, 
      setActiveConversationId 
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
