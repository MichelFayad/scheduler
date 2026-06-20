import { auth } from "@/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Let middleware handle the redirect for unauthenticated users,
  // but double-check here for the layout (excludes login page via middleware)
  if (!session && typeof window === "undefined") {
    // Only redirect if not the login page — middleware already handles this,
    // but the layout wraps all /admin/* routes including login
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {session && <AdminSidebar user={{ name: session.user.name ?? "", email: session.user.email ?? "", role: session.user.role }} />}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
