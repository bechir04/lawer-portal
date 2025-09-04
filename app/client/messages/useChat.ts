import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/hooks/use-socket';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  content: string;
  timestamp: string;
  isClient: boolean;
}

export interface Conversation {
  id: string;
  lawyer: {
    online: any;
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  lastMessage: string;
  timestamp: string;
  unread: number;
  online?: boolean;
}

function useChat() {
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const pageSize = 20;

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data);
      
      // If no conversation is selected, select the first one
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [selectedConversation]);

  // Fetch messages for the selected conversation
  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!selectedConversation) return;
    
    if (!loadMore) {
      pageRef.current = 1;
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const response = await fetch(`/api/messages/${selectedConversation.id}?page=${pageRef.current}&limit=${pageSize}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const { messages: newMessages, hasMore: more } = await response.json();
      
      setMessages(prev => loadMore ? [...prev, ...newMessages] : newMessages);
      setHasMore(more);
      
      if (loadMore) {
        pageRef.current += 1;
      }
      
      return newMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages. Please try again.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [selectedConversation, toast]);

  // Send a new message
  const sendMessage = useCallback(async (content: string) => {
    if (!selectedConversation || !content.trim() || isSending) return;
    
    setIsSending(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: content.trim(),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      const newMessage = await response.json();
      
      // Optimistically update the UI
      setMessages(prev => [...prev, newMessage]);
      
      // Update the conversation's last message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                lastMessage: newMessage.content,
                timestamp: newMessage.timestamp,
              }
            : conv
        )
      );
      
      // Emit the message via WebSocket
      if (socket) {
        socket.emit('send_message', {
          conversationId: selectedConversation.id,
          senderId: session?.user?.id,
          content: newMessage.content,
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    } finally {
      setIsSending(false);
    }
  }, [selectedConversation, isSending, socket, session?.user?.id]);

  // Handle incoming messages via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data: any) => {
      const { conversationId, content, senderId, timestamp, message } = data;
      
      // If we have the full message object, use it
      if (message) {
        const formattedMessage = {
          id: message.id,
          sender: {
            id: message.sender.id,
            name: message.sender.name || 'Unknown User',
            email: message.sender.email,
            image: message.sender.image,
          },
          content: message.content,
          timestamp: message.timestamp || new Date().toISOString(),
          isClient: message.sender.id === session?.user?.id,
        };

        // Update messages if it's for the current conversation
        if (selectedConversation?.id === conversationId) {
          setMessages(prev => [formattedMessage, ...prev]);
        }

        // Update the conversation's last message
        updateConversationLastMessage(conversationId, message.content, timestamp, message.sender);
      } else {
        // Fallback to basic message handling if full message object isn't available
        if (selectedConversation?.id === conversationId) {
          setMessages(prev => [
            ...prev,
            {
              id: `temp-${Date.now()}`,
              sender: {
                id: senderId,
                name: 'User',
                email: '',
                image: null,
              },
              content,
              timestamp,
              isClient: senderId === session?.user?.id,
            },
          ]);
        }
        
        // Update the conversation's last message
        updateConversationLastMessage(conversationId, content, timestamp, { id: senderId });
      }
    };

    const updateConversationLastMessage = (
      conversationId: string, 
      content: string, 
      timestamp: string, 
      sender: { id: string; name?: string | null }
    ) => {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessage: `${sender.id === session?.user?.id ? 'You: ' : ''}${content}`,
                timestamp,
                unread: conv.id === selectedConversation?.id ? 0 : (conv.unread || 0) + 1,
              }
            : conv
        )
      );
    };

    socket.on('newMessage', handleReceiveMessage);
    socket.on('receive_message', handleReceiveMessage);
    
    return () => {
      socket.off('newMessage', handleReceiveMessage);
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, selectedConversation, session?.user?.id]);

  // Join the conversation room when selected
  useEffect(() => {
    if (!socket || !selectedConversation) return;
    
    // Join the conversation room
    socket.emit('join_conversation', selectedConversation.id);
    
    // Mark messages as read
    const markAsRead = async () => {
      try {
        await fetch(`/api/messages/${selectedConversation.id}/read`, {
          method: 'POST',
        });
        
        setConversations(prev =>
          prev.map(conv =>
            conv.id === selectedConversation.id ? { ...conv, unread: 0 } : conv
          )
        );
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };
    
    if (selectedConversation.unread > 0) {
      markAsRead();
    }
  }, [socket, selectedConversation]);

  // Initial data fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when selected conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
    }
  }, [selectedConversation, fetchMessages]);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv =>
    conv.lawyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  // Load more messages when scrolling up
  const loadMoreMessages = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    await fetchMessages(true);
  }, [fetchMessages, hasMore, isLoading, isLoadingMore]);

  return {
    conversations: filteredConversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    isLoading,
    isSending,
    sendMessage,
    searchTerm,
    setSearchTerm,
    isConnected,
    loadMoreMessages,
    hasMore,
    isLoadingMore,
  };
}

export default useChat;
