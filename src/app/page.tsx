import Link from "next/link";

const steps = [
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
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-lg tracking-tight text-slate-900">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white text-sm font-bold">
              S
            </span>
            Scheduler
          </span>
          <Link
            href="/admin/login"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            Admin login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* soft gradient backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/70 via-white to-white"
          />
          <div className="max-w-3xl mx-auto px-6 text-center pt-24 pb-20">
            <span className="badge-brand mb-5">No account required</span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl text-balance">
              Book a Property Inspection
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 max-w-xl mx-auto">
              Select your community, choose an available date and time, and
              confirm your booking in under two minutes.
            </p>
            <Link href="/schedule" className="btn-primary mt-8 px-6 py-3 text-base">
              Schedule an Inspection
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="card p-6">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700 font-bold text-sm ring-1 ring-brand-100">
                  {step}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Scheduler. All rights reserved.
      </footer>
    </div>
  );
}
