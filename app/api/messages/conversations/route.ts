import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Message {
  content: string;
  createdAt: Date;
}

interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  user1: User;
  user2: User;
  messages: Message[];
  createdAt: Date;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Initialize conversations array with proper typing
    let conversations: Conversation[];
    
    try {
      // Fetch conversations where the current user is either user1 or user2
      conversations = await prisma.conversation.findMany({
      where: {
        
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return new NextResponse('Error fetching conversations', { status: 500 });
    }

    // Format the response
    const formattedConversations = conversations.map((conv: Conversation) => {
      // Determine the other user in the conversation
      const isUser1 = conv.user1Id === session.user.id;
      const otherUser = isUser1 ? conv.user2 : conv.user1;
      const currentUser = isUser1 ? conv.user1 : conv.user2;
      
      return {
        id: conv.id,
        // Include both users in the response
        user1: {
          id: conv.user1.id,
          name: conv.user1.name || 'User',
          email: conv.user1.email,
          image: conv.user1.image,
        },
        user2: {
          id: conv.user2.id,
          name: conv.user2.name || 'User',
          email: conv.user2.email,
          image: conv.user2.image,
        },
        // For backward compatibility, include the other user as 'lawyer' and current user as 'client'
        lawyer: isUser1 ? {
          id: conv.user2.id,
          name: conv.user2.name || 'Lawyer',
          email: conv.user2.email,
          image: conv.user2.image,
        } : {
          id: conv.user1.id,
          name: conv.user1.name || 'Lawyer',
          email: conv.user1.email,
          image: conv.user1.image,
        },
        lastMessage: conv.messages[0]?.content || 'No messages yet',
        timestamp: conv.messages[0]?.createdAt.toISOString() || conv.createdAt.toISOString(),
        unread: 0, // You'll need to implement unread message count logic
        isUser1: isUser1,
      };
    });

    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
