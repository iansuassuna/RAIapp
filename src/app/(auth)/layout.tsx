import { Logo } from "@/components/brand/logo";

/** Layout das telas públicas: painel da marca (desktop) + área do formulário. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Painel da marca — só desktop */}
      <aside className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-circuit absolute inset-0" aria-hidden />
        <div className="absolute -left-24 top-1/3 size-96 rounded-full bg-accent-500/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 right-0 size-96 rounded-full bg-iris-500/20 blur-3xl" aria-hidden />

        <Logo tone="light" size="sm" className="relative" />

        <div className="relative max-w-md space-y-5">
          <p className="inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-accent-300 ring-1 ring-white/10">
            Robótica · Automação · Inovação
          </p>
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-white">
            Sua trajetória no RAITec, <span className="text-gradient-accent">em um só lugar.</span>
          </h2>
          <p className="text-brand-200">
            Registre capacitações, cursos e visitas, acompanhe seu desempenho e veja sua evolução no time.
          </p>
        </div>

        <p className="relative text-xs text-brand-300">© {new Date().getFullYear()} RAITec · UFC</p>
      </aside>

      {/* Formulário */}
      <main className="flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        <Logo className="mb-10 lg:hidden" />
        {children}
      </main>
    </div>
  );
}
