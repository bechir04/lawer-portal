import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';
const handlers = {
  // GET /api/notifications - Get notifications for current user
  async GET(request: NextRequest) {
    try {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const { searchParams } = new URL(request.url)
      const unreadOnly = searchParams.get("unread") === "true"
      const limit = Number.parseInt(searchParams.get("limit") || "20")

      const where: any = { }
      if (unreadOnly) {
        where.isRead = false
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      })
console.log(notifications)
      return NextResponse.json(notifications)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },

  // PUT /api/notifications/[id]/read - Mark notification as read
  async PUT(request: NextRequest) {
    try {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const { searchParams } = new URL(request.url)
      const notificationId = searchParams.get("id")

      if (!notificationId) {
        return NextResponse.json({ error: "Notification ID is required" }, { status: 400 })
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId, userId: session.user.id },
        data: { isRead: true },
      })

      return NextResponse.json(updatedNotification)
    } catch (error) {
      console.error("Error updating notification:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },

  // PATCH /api/notifications/mark-all-read - Mark all notifications as read
  async PATCH(request: NextRequest) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      await prisma.notification.updateMany({
        where: { 
          userId: session.user.id, 
          isRead: false
        },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
};

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export default handlers;
