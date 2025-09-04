"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Calendar,
  FileText,
  CreditCard,
  User,
  BarChart3,
  Crown,
  Video,
} from "lucide-react"

export function ClientSidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      name: "dashboard",
      href: "/client",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "cases",
      href: "/client/cases",
      label: "My Cases",
      icon: Briefcase,
    },
    {
      name: "video-calls",
      href: "/client/video-calls",
      label: "Video Calls",
      icon: Video,
    },
    {
      name: "messages",
      href: "/client/messages",
      label: "Messages",
      icon: MessageSquare,
    },
    {
      name: "appointments",
      href: "/client/appointments",
      label: "Appointments",
      icon: Calendar,
    },
    {
      name: "documents",
      href: "/client/documents",
      label: "Documents",
      icon: FileText,
    },
    {
      name: "payments",
      href: "/client/payments",
      label: "Payments",
      icon: CreditCard,
    },
    {
      name: "profile",
      href: "/client/profile",
      label: "Profile",
      icon: User,
    },
  ]

  return (
    <aside className="hidden lg:flex flex-col w-72 gradient-sidebar formal-shadow border-r border-gray-200">
      <div className="flex items-center h-16 lg:h-20 px-4 lg:px-6 border-b border-gray-200">
        <Link href="/client" className="flex items-center gap-2 lg:gap-3 font-bold text-lg lg:text-xl text-black">
          <div className="h-8 w-8 lg:h-10 lg:w-10 gradient-button rounded-lg flex items-center justify-center formal-shadow">
            <User className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
          </div>
          <span className="hidden sm:block">Client Portal</span>
        </Link>
      </div>
      <nav className="flex-1 p-2 lg:p-4 space-y-1 lg:space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 lg:gap-3 rounded-xl px-3 lg:px-4 py-2 lg:py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "gradient-button text-white formal-shadow"
                  : "text-gray-700 hover:gradient-button-outline hover:formal-shadow",
              )}
            >
              <item.icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
