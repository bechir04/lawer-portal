"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Handshake,
  Video,
  MessageSquare,
  Settings,
  Scale,
  BarChart3,
  FileText,
} from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/dashboard/clients",
      icon: Users,
    },
    {
      href: "/dashboard/cases",
      icon: Briefcase,
    },
    {
      href: "/dashboard/services",
      icon: Handshake,
    },
    {
      href: "/dashboard/video-calls",
      icon: Video,
    },
    {
      href: "/dashboard/messages",
      icon: MessageSquare,
    },
    {
      href: "/dashboard/documents",
      icon: FileText,
    },
    {
      href: "/dashboard/settings",
      icon: Settings,
    },
  ]

  return (
    <aside className="hidden lg:flex flex-col w-72 gradient-sidebar formal-shadow border-r border-gray-200">
      <div className="flex items-center h-16 lg:h-20 px-4 lg:px-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2 lg:gap-3 font-bold text-lg lg:text-xl text-black">
          <div className="h-8 w-8 lg:h-10 lg:w-10 gradient-button rounded-lg flex items-center justify-center formal-shadow">
            <Scale className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
          </div>
          <span className="hidden sm:block">LegalPortal</span>
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
              <span className="truncate">{item.href}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-2 lg:p-4 border-t border-gray-200">
        <div className="flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg gradient-card formal-shadow">
          <div className="h-6 w-6 lg:h-8 lg:w-8 gradient-button rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs lg:text-sm font-medium truncate text-black">John Doe</p>
            <p className="text-xs text-gray-600 truncate">Senior Partner</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
