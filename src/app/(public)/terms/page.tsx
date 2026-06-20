import Link from "next/link";

export const metadata = { title: "Terms of Use – Scheduler" };

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">Terms of Use</h1>
        <p className="mt-2 text-gray-400 text-xs">Last updated: {new Date().getFullYear()}</p>

        {/* NOTE: Placeholder copy — replace with reviewed legal text before launch. */}
        <div className="mt-6 space-y-4">
          <p className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800 text-xs">
            This is placeholder copy and must be replaced with reviewed legal text before launch.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">Acceptance of Terms</h2>
          <p>
            By using this scheduling service, you agree to these Terms of Use. If you do not
            agree, please do not use the service.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">Use of the Service</h2>
          <p>
            You agree to provide accurate information when submitting a booking and to use the
            service only for legitimate inspection scheduling. You are responsible for managing
            or cancelling your booking within the window provided.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">Bookings and Cancellations</h2>
          <p>
            Availability is shown in real time and is not guaranteed until your booking is
            confirmed. Cancellation and rescheduling are subject to the window configured by
            each community administrator.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">Limitation of Liability</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind. We are not
            liable for any indirect or consequential damages arising from use of the service.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6">Contact</h2>
          <p>
            Questions about these terms? Reach us via our{" "}
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
