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
        OR: [
          { user1Id: session.user.id },
          { user2Id: session.user.id },
        ],
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

    // Format the response with proper unread count
    const formattedConversations = await Promise.all(
      conversations.map(async (conv: Conversation) => {
        // Determine the other user in the conversation
        const isUser1 = conv.user1Id === session.user.id;
        const otherUser = isUser1 ? conv.user2 : conv.user1;
        
        // Get unread message count for this conversation
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: session.user.id,
            seen: false,
          },
        });
        
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
          // The other user in the conversation
          user: otherUser,
          lastMessage: conv.messages[0] || null,
          unreadCount: unreadCount,
          createdAt: conv.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
