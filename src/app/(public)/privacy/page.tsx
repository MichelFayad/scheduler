import Link from "next/link";

export const metadata = { title: "Privacy Policy – Scheduler" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="font-semibold text-lg tracking-tight text-gray-900">
            Scheduler
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 text-sm text-gray-700 leading-relaxed">
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-gray-400 text-xs">Last updated: {new Date().getFullYear()}</p>

        {/* NOTE: Placeholder copy — replace with reviewed legal text before launch. */}
        <div className="mt-6 space-y-4">
          <p className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800 text-xs">
            This is placeholder copy and must be replaced with reviewed legal text before launch.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">Information We Collect</h2>
          <p>
            When you submit an inspection booking, we collect the information you provide:
            your name, email address, phone number (optional), property address, and the details
            of your requested inspection. We use this information solely to process and manage
            your booking.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">How We Use Your Information</h2>
          <p>
            Your details are used to confirm your booking, send you confirmation and reminder
            emails, allow you to manage your booking, and notify the relevant community
            administrators of scheduled inspections.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">Data Sharing</h2>
          <p>
            Booking details are shared with the administrators of the community you select.
            We do not sell your personal information to third parties.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">Data Retention</h2>
          <p>
            We retain booking records for as long as necessary to provide the service and to
            comply with legal obligations.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">Contact</h2>
          <p>
            For questions about this policy or your data, please reach us via our{" "}
            <Link href="/contact" className="text-blue-600 hover:underline">contact page</Link>.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-gray-600">Terms</Link>
      </footer>
    </div>
  );
}
