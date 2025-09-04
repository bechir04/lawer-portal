import { Server as HTTPServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DefaultEventsMap } from "@socket.io/component-emitter";
import { Message, User } from "@prisma/client";

// Extend the Next.js response to include `io`
type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: IOServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>;
    };
  };
};

// Message type with sender relation
type MessageWithSender = Message & {
  sender: User;
};

// Main function to initialize socket
declare global {
  var io: IOServer | undefined; // This must be a `var` and not a `let / const`
}

let io: IOServer;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    io = new IOServer(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
    });
    global.io = io;
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("User connected", socket.id);

      socket.on("join_conversation", (conversationId: string) => {
        socket.join(conversationId);
      });

      socket.on(
        "new_message",
        async ({
          conversationId,
          content,
        }: {
          conversationId: string;
          content: string;
        }) => {
          const session = await getServerSession(req, res, authOptions);
          if (!session?.user?.email) return;

          const user = await prisma.user.findUnique({
            where: { email: session.user.email },
          });
          if (!user) return;

          // Get the conversation to determine the receiver
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { user1Id: true, user2Id: true }
          });

          if (!conversation) {
            console.error('Conversation not found');
            return;
          }

          // Determine the receiver (the other user in the conversation)
          const receiverId = conversation.user1Id === user.id ? conversation.user2Id : conversation.user1Id;

          const newMessage = await prisma.message.create({
            data: {
              conversationId,
              content,
              senderId: user.id,
              receiverId,
              type: 'TEXT',
            },
            include: {
              sender: true,
            },
          });

          io.to(conversationId).emit("receive_message", newMessage);
        }
      );
    });

    console.log("✅ Socket.IO initialized");
  }

  res.end();
}

export { io };
