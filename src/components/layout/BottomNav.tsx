"use client"

import { cn } from "@/lib/utils"
import { 
  Home, 
  MessageCircle, 
  Target, 
  Calendar, 
  TrendingUp, 
  Smartphone,
  User 
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/", icon: Home, label: "Today" },
  { href: "/coach", icon: MessageCircle, label: "Coach" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/plans", icon: Calendar, label: "Plans" },
  { href: "/insights", icon: TrendingUp, label: "Insights" },
  { href: "/devices", icon: Smartphone, label: "Devices" },
  { href: "/profile", icon: User, label: "Profile" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1",
                isActive
                  ? "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}