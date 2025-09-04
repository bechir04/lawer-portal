import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
declare const io: any;

const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  receiverId: z.string().min(1, "Receiver ID is required"),
  caseId: z.string().optional(),
  conversationId: z.string().optional(),
  type: z.enum(["TEXT", "FILE", "IMAGE", "SYSTEM"]).default("TEXT"),
})

// GET /api/messages - Get messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")
    const caseId = searchParams.get("caseId")
    const otherUserId = searchParams.get("userId")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const where: any = {
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    }

    if (conversationId) {
      where.conversationId = conversationId
    } else if (caseId) {
      where.caseId = caseId
    } else if (otherUserId) {
      where.OR = [
        { senderId: session.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: session.user.id },
      ]
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true },
        },
        case: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })

    await prisma.message.updateMany({
      where: {
        receiverId: session.user.id,
        readAt: null,
        ...(caseId && { caseId }),
        ...(otherUserId && { senderId: otherUserId }),
      },
      data: {
        readAt: new Date(),
        seen: true,
      },
    })

    return NextResponse.json(messages.reverse())
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/messages - Send a new message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = sendMessageSchema.parse(body)

    const receiver = await prisma.user.findUnique({
      where: { id: validatedData.receiverId },
    })

    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 })
    }

    if (validatedData.caseId) {
      const caseAccess = await prisma.case.findFirst({
        where: {
          id: validatedData.caseId,
        },
      })

      if (!caseAccess) {
        return NextResponse.json({ error: "Case not found or access denied" }, { status: 404 })
      }
    }

    let conversationId = validatedData.conversationId

    if (!conversationId) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            { user1Id: session.user.id, user2Id: validatedData.receiverId },
            { user1Id: validatedData.receiverId, user2Id: session.user.id },
          ],
        },
      })

      if (existingConversation) {
        conversationId = existingConversation.id
      } else {
        const newConversation = await prisma.conversation.create({
          data: {
            user1Id: session.user.id,
            user2Id: validatedData.receiverId,
          },
        })
        conversationId = newConversation.id
      }
    }

    const message = await prisma.message.create({
      data: {
        content: validatedData.content,
        senderId: session.user.id,
        receiverId: validatedData.receiverId,
        caseId: validatedData.caseId,
        conversationId,
        type: validatedData.type,
        seen: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true },
        },
        case: {
          select: { id: true, title: true },
        },
      },
    })

    await prisma.notification.create({
      data: {
        userId: validatedData.receiverId,
        title: "New Message",
        message: `You have a new message from ${session.user.name}`,
        type: "APPOINTMENT_UPDATED",
      },
    })

    io.to(conversationId).emit("receive_message", message);

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET /api/messages/conversations - Get list of conversations
export async function GET_CONVERSATIONS(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: session.user.id },
          { user2Id: session.user.id },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        user1: { select: { id: true, name: true, email: true, image: true } },
        user2: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = conv.user1Id === session.user.id ? conv.user2 : conv.user1
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: session.user.id,
            seen: false,
          },
        })
        return {
          user: otherUser,
          lastMessage: conv.messages[0],
          unreadCount,
          conversationId: conv.id,
        }
      })
    )

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
