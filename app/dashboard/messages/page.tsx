"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Send, Search, MessageSquare, Users, Clock, Paperclip, AlertCircle, Loader2 } from "lucide-react"
import { useConversations } from "@/hooks/useConversations"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "next-auth/react"
import { CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

// No mock data needed - using real data from the backend

export default function MessagesPage() {
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [showClientList, setShowClientList] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()
  
  const {
    conversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    loading,
    error,
    sendMessage: sendMessageHandler,
    isConnected,
    currentUser,
  } = useConversations() as {
    conversations: any[]
    selectedConversation: any
    setSelectedConversation: (conv: any) => void
    messages: any[]
    loading: boolean
    error: { message: string } | null
    sendMessage: (content: string, conversationId: string) => Promise<void>
    isConnected: boolean
    currentUser: any
  }

  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conv: any) => {
    const otherUser = 
      conv.user1.id === currentUser?.id ? conv.user2 : conv.user1;
    return otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch clients when dialog opens
  useEffect(() => {
    if (showClientList && clients.length === 0) {
      fetchClients()
    }
  }, [showClientList, clients.length])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    
    try {
      await sendMessageHandler(newMessage, selectedConversation.id);
      setNewMessage("");
      
      // Scroll to bottom after sending a message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error("Failed to send message:", err);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const fetchClients = async () => {
    try {
      setLoadingClients(true)
      const response = await fetch('/api/dashboard/clients')
      if (!response.ok) throw new Error('Failed to fetch clients')
      const data = await response.json()
      setClients(data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  const startConversationWithClient = async (clientId: string) => {
    try {
      // Create a new conversation by sending a message
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Hello! I\'m reaching out to discuss your case.',
          receiverId: clientId,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to start conversation')
      
      setShowClientList(false)
      // Refresh conversations to show the new one
      window.location.reload()
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground text-lg">Communicate with your clients in real-time.</p>
        </div>
        <Button onClick={() => setShowClientList(true)}>
          <Users className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : conversations.length}
            </div>
            <p className="text-xs text-muted-foreground">Active chats</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <Badge className="bg-red-100 text-red-800 border-red-200">
              {loading ? 0 : conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0)}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : conversations.length}
            </div>
            <p className="text-xs text-muted-foreground">Currently messaging</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection</CardTitle>
            <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isConnected ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">Chat status</p>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading && !conversations.length ? (
              <div className="space-y-4 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div>
                  {filteredConversations.map((conversation) => {
                    const otherUser = 
                      conversation.user1.id === currentUser?.id 
                        ? conversation.user2 
                        : conversation.user1;
                    const lastMessage = conversation.lastMessage;
                    
                    return (
                      <div key={conversation.id}>
                        <div
                          className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedConversation?.id === conversation.id ? "bg-muted" : ""
                          }`}
                          onClick={() => setSelectedConversation(conversation)}
                        >
                          <Avatar>
                            <AvatarImage src={otherUser.image || ''} alt={otherUser.name || ''} />
                            <AvatarFallback>
                              {otherUser.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{otherUser.name || 'Unknown User'}</p>
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {lastMessage?.content || 'No messages yet'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {lastMessage && lastMessage.createdAt ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true }) : ''}
                            </p>
                          </div>
                        </div>
                        <Separator />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {loading ? (
            <div className="flex h-[600px] flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Loading messages...</p>
            </div>
          ) : error ? (
            <div className="flex h-[600px] flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <h3 className="mt-4 text-lg font-medium">Error loading messages</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {error.message || 'Failed to load messages. Please try again.'}
              </p>
            </div>
          ) : selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage 
                      src={selectedConversation.user1.id === currentUser?.id 
                        ? selectedConversation.user2.image || ''
                        : selectedConversation.user1.image || ''} 
                      alt={selectedConversation.user1.id === currentUser?.id 
                        ? selectedConversation.user2.name || 'User'
                        : selectedConversation.user1.name || 'User'}
                    />
                    <AvatarFallback>
                      {selectedConversation.user1.id === currentUser?.id 
                        ? selectedConversation.user2.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'
                        : selectedConversation.user1.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>
                      {selectedConversation.user1.id === currentUser?.id 
                        ? selectedConversation.user2.name || 'Unknown User'
                        : selectedConversation.user1.name || 'Unknown User'}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {isConnected ? 'Online' : 'Offline'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-[500px] p-6">
                  <div className="space-y-6">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                        <p>No messages yet</p>
                        <p className="text-sm">Send a message to start the conversation</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isCurrentUser = message.sender?.id === currentUser?.id;
                        const sender = isCurrentUser 
                          ? currentUser 
                          : (selectedConversation.user1.id === currentUser?.id 
                              ? selectedConversation.user2 
                              : selectedConversation.user1);
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            {!isCurrentUser && (
                              <Avatar className="h-8 w-8 mr-2 mt-1">
                                <AvatarImage src={sender?.image || ''} alt={sender?.name || ''} />
                                <AvatarFallback>
                                  {sender?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                isCurrentUser
                                  ? 'bg-primary text-primary-foreground rounded-br-none'
                                  : 'bg-muted rounded-bl-none'
                              }`}
                            >
                              {!isCurrentUser && (
                                <p className="font-medium text-xs text-muted-foreground mb-1">
                                  {sender?.name || 'Unknown User'}
                                </p>
                              )}
                              <p>{message.content}</p>
                              <p
                                className={`text-xs mt-1 text-right ${
                                  isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}
                              >
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="border-t p-4">
                <div className="relative">
                  <Textarea
                    placeholder="Type a message..."
                    className="min-h-[60px] resize-none pr-12"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={!isConnected}
                  />
                  <Button
                    size="icon"
                    className="absolute right-2 bottom-2 h-8 w-8"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !isConnected}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  {!isConnected && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span>Connecting to chat...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-[600px] flex-col items-center justify-center p-6 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No conversation selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {conversations.length === 0 
                  ? "You don't have any conversations yet. Start a conversation with a client below."
                  : "Choose a conversation from the list to start messaging"
                }
              </p>
              {conversations.length === 0 && (
                <Button 
                  className="mt-4" 
                  onClick={() => setShowClientList(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Start New Conversation
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Client List Dialog */}
      <Dialog open={showClientList} onOpenChange={setShowClientList}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>
              Select a client to start a conversation with.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingClients ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : clients.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => startConversationWithClient(client.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={client.image || ''} alt={client.name || ''} />
                        <AvatarFallback>
                          {client.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.name || 'Unnamed Client'}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Start Chat
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No clients found</h3>
                <p className="text-muted-foreground">You don't have any clients assigned yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
