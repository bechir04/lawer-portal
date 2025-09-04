import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/hooks/use-socket';

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type Message = {
  id: string;
  content: string;
  sender: User;
  receiver: User;
  conversationId: string;
  createdAt: string;
  readAt: string | null;
  seen: boolean;
};

type Conversation = {
  id: string;
  user1: User;
  user2: User;
  lastMessage?: Message;
  unreadCount: number;
};

export const useConversations = () => {
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data);
      
      // Select the first conversation if none is selected
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for the selected conversation
  const fetchMessages = async (conversationId: string) => {
    if (!conversationId) return;
    
    try {
      const response = await fetch(`/api/messages?conversationId=${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    }
  };

  // Send a new message
  const sendMessage = async (content: string, conversationId: string) => {
    if (!content.trim() || !conversationId || !socket || !session?.user?.id) return;
    
    // Find the conversation to get the receiver ID
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // Determine the receiver (the other user in the conversation)
    const receiverId = conversation.user1.id === session.user.id 
      ? conversation.user2.id 
      : conversation.user1.id;
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          conversationId,
          receiverId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // The message will be added to the UI via the socket event
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  };

  // Handle new incoming messages via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
      
      // Update the last message in the conversations list
      setConversations(prev =>
        prev.map(conv =>
          conv.id === message.conversationId
            ? { ...conv, lastMessage: message, unreadCount: conv.unreadCount + 1 }
            : conv
        )
      );

      // If the new message belongs to the currently selected conversation, update it
      if (selectedConversation?.id === message.conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, lastMessage: message } : null);
      }
    };

    socket.on('receive_message', handleNewMessage);

    return () => {
      socket.off('receive_message', handleNewMessage);
    };
  }, [socket]);

  // Join the conversation room when selected conversation changes
  useEffect(() => {
    if (!socket || !selectedConversation) return;

    // Join the conversation room
    socket.emit('join_conversation', selectedConversation.id);
    
    // Fetch messages for the selected conversation
    fetchMessages(selectedConversation.id);

    return () => {
      // Leave the conversation room when component unmounts or conversation changes
      socket.emit('leave_conversation', selectedConversation.id);
    };
  }, [selectedConversation?.id, socket]);

  // Initial data fetch
  useEffect(() => {
    if (session) {
      fetchConversations();
    }
  }, [session]);

  return {
    conversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    loading,
    error,
    sendMessage,
    isConnected,
    currentUser: session?.user || null,
  };
};
