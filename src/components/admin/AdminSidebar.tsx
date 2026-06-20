"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const nav = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "⊞" },
  { label: "Bookings", href: "/admin/bookings", icon: "📋" },
  { label: "Calendar", href: "/admin/calendar", icon: "📅" },
  { label: "Communities", href: "/admin/communities", icon: "🏘" },
  { label: "Alerts", href: "/admin/alerts", icon: "🔔" },
  { label: "Reports", href: "/admin/reports", icon: "📊" },
  { label: "Settings", href: "/admin/settings", icon: "⚙" },
];

export default function AdminSidebar({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <span className="font-bold text-gray-900 text-base">Scheduler</span>
        <span className="ml-2 text-xs text-gray-400">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ label, href, icon }) => {
          const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              ].join(" ")}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-800 truncate">{user.name}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="mt-3 w-full text-left text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
