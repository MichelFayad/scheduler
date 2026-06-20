import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight">Scheduler</span>
          <Link
            href="/admin/login"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Admin login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Book a Property Inspection
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-xl">
          Select your community, choose an available date and time, and confirm
          your booking in under two minutes — no account required.
        </p>
        <Link
          href="/schedule"
          className="mt-8 inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-base"
        >
          Schedule an Inspection →
        </Link>

        {/* How it works */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl w-full text-left">
          {[
            {
              step: "1",
              title: "Fill in your details",
              desc: "Select your community, enter your property address and describe the inspection you need.",
            },
            {
              step: "2",
              title: "Pick a date and time",
              desc: "Choose from available slots — fully booked times are automatically hidden.",
            },
            {
              step: "3",
              title: "Get instant confirmation",
              desc: "Receive a confirmation email with a link to cancel or reschedule if your plans change.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm">
                {step}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Scheduler. All rights reserved.
      </footer>
    </div>
  );
}
