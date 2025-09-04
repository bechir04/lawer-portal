"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Video,
  MessageSquare,
  Settings,
  Scale,
  BarChart3,
  Calendar,
  FileText,
  DollarSign,
  CreditCard,
} from "lucide-react"

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      name: "Clients",
      href: "/dashboard/clients",
      icon: Users,
    },
    {
      name: "Cases",
      href: "/dashboard/cases",
      icon: Briefcase,
    },
    {
      name: "Pricing",
      href: "/dashboard/pricing",
      icon: DollarSign,
    },
    {
      name: "Appointments",
      href: "/dashboard/appointments",
      icon: Calendar,
    },
    {
      name: "Video Calls",
      href: "/dashboard/video-calls",
      icon: Video,
    },
    {
      name: "Messages",
      href: "/dashboard/messages",
      icon: MessageSquare,
    },
    {
      name: "Documents",
      href: "/dashboard/documents",
      icon: FileText,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      <aside 
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-72 gradient-sidebar formal-shadow border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
      >
        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="lg:hidden absolute right-2 top-2 rounded-md p-1 text-gray-500 hover:bg-gray-100 focus:outline-none"
          aria-label="Close menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-2 lg:gap-3 rounded-xl px-3 lg:px-4 py-2 lg:py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "gradient-button text-white formal-shadow"
                  : "text-gray-700 hover:gradient-button-outline hover:formal-shadow",
              )}
            >
              <item.icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-2 lg:p-4 border-t border-gray-200">
        <div className="flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg gradient-card formal-shadow">
          <div className="h-6 w-6 lg:h-8 lg:w-8 gradient-button rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
            <p className="text-xs text-gray-500 truncate">Administrator</p>
          </div>
        </div>
      </div>
      </aside>
    </>
  )
}
