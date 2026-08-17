import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2, Receipt, KeyRound, TrendingUp, FileText, Users,
  CheckCircle2, ArrowRight, MessageCircle, Mail, Home as HomeIcon,
} from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/59892971595?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20PropAdmin';
const EMAIL_URL = 'mailto:propadminok@gmail.com';

export const metadata: Metadata = {
  title: 'Programa de Gestión para Administradoras de Edificios',
  description:
    'Software para administradoras: gestión de edificios, gastos comunes, alquileres y liquidaciones a propietarios en un solo lugar. SaaS pensado para el mercado uruguayo. Probalo gratis.',
  keywords: [
    'programa de gestión de administradoras',
    'administradoras',
    'saas para gestión de edificios',
    'software administración de edificios',
    'sistema para administradoras de consorcios',
    'gestión de gastos comunes',
    'software para inmobiliarias',
    'gestión de alquileres',
  ],
  alternates: { canonical: '/home' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'es_UY',
    title: 'PropAdmin — Programa de Gestión para Administradoras de Edificios',
    description:
      'Gastos comunes, alquileres, liquidaciones a propietarios y cobros, todo en un mismo sistema. Hecho para administradoras.',
    url: '/home',
    siteName: 'PropAdmin',
  },
};

const FEATURES = [
  {
    icon: Building2,
    title: 'Multi-propiedad',
    text: 'Edificios, complejos y casas sueltas en un mismo panel, con estadísticas por unidad y por cartera.',
  },
  {
    icon: Receipt,
    title: 'Gastos comunes automáticos',
    text: 'Generá las expensas del mes distribuidas por coeficiente y calculá intereses por mora según la ley uruguaya (IPC + 1% mensual).',
  },
  {
    icon: KeyRound,
    title: 'Gestión de alquileres',
    text: 'Contratos, cobro a inquilinos y liquidación automática al propietario (comisión + deducciones) con PDF profesional.',
  },
  {
    icon: TrendingUp,
    title: 'Índices IPC al día',
    text: 'Cargá el IPC mensual del INE y el sistema calcula los recargos por mora sin que tengas que hacer una cuenta a mano.',
  },
  {
    icon: FileText,
    title: 'Reportes profesionales',
    text: 'Reportes de deuda, recibos, estados de cuenta y liquidaciones en PDF, listos para enviar a propietarios e inquilinos.',
  },
  {
    icon: Users,
    title: 'Residentes y comunicados',
    text: 'Propietarios, inquilinos, reservas de amenities, mantenimiento y comunicados, todo centralizado.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Cargá tus propiedades',
    text: 'Edificios, complejos o casas — con sus unidades, coeficientes y residentes.',
  },
  {
    n: '2',
    title: 'El sistema calcula por vos',
    text: 'Expensas, intereses por mora, comisiones de alquiler y liquidaciones se generan automáticamente cada mes.',
  },
  {
    n: '3',
    title: 'Enviá y cobrá',
    text: 'Mandá reportes y notificaciones por email, y llevá el registro de cada cobro y cada pago pendiente.',
  },
];

const PLANS = [
  {
    name: 'Básico',
    price: '$30',
    accent: 'border-gray-200',
    badge: '⭐',
    features: [
      'Hasta 5 edificios',
      'Soporte por email en 24/48hs',
      'Usuario admin + usuario normal',
    ],
  },
  {
    name: 'Estándar',
    price: '$70',
    accent: 'border-emerald-300 ring-2 ring-emerald-100',
    badge: '⭐⭐',
    highlighted: true,
    features: [
      'Hasta 13 edificios',
      '2 usuarios admin y hasta 7 usuarios normales',
      'Soporte prioritario dentro de las 3hs',
    ],
  },
  {
    name: 'Premium',
    price: '$130',
    accent: 'border-amber-300',
    badge: '⭐⭐⭐',
    features: [
      'Hasta 30 edificios',
      'Hasta 20 usuarios',
      'Soporte personalizado 24/7, prioritario dentro de la 1hs',
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'PropAdmin',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'Software de gestión para administradoras de edificios, propiedades y alquileres en Uruguay.',
            offers: PLANS.map((p) => ({
              '@type': 'Offer',
              name: `Plan ${p.name}`,
              price: p.price.replace('$', ''),
              priceCurrency: 'USD',
            })),
          }),
        }}
      />

      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold">PropAdmin</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#funcionalidades" className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
              Funcionalidades
            </a>
            <a href="#precios" className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
              Precios
            </a>
            <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors">
              Iniciar sesión
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900 text-white font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Contactanos
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <span className="inline-block text-xs font-semibold tracking-wide uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-5">
          Hecho para administradoras
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          El programa de gestión para administradoras de edificios y propiedades
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          Un SaaS para gestión de edificios, gastos comunes y alquileres: cargá tus propiedades y dejá que el
          sistema calcule expensas, intereses, comisiones y liquidaciones por vos.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-900 text-white font-medium px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Hablar por WhatsApp
          </a>
          <a
            href={EMAIL_URL}
            className="flex items-center gap-2 border border-gray-200 text-slate-700 font-medium px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Mail className="w-4 h-4" /> Escribir por mail
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
            Todo lo que necesita una administradora, en un solo sistema
          </h2>
          <p className="mt-3 text-slate-600 text-center max-w-xl mx-auto">
            Desde consorcios de edificios hasta carteras de alquiler de casas sueltas.
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-slate-700" />
                </div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Cómo funciona</h2>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STEPS.map(({ n, title, text }) => (
            <div key={n} className="text-center">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-semibold flex items-center justify-center mx-auto">
                {n}
              </div>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-white">Planes simples, sin sorpresas</h2>
          <p className="mt-3 text-slate-400 text-center max-w-xl mx-auto">
            Elegí el plan según la cantidad de edificios que administrás. Cambiá de plan cuando lo necesites.
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 bg-slate-800 p-6 flex flex-col ${plan.accent}`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wide bg-emerald-400 text-slate-900 px-2.5 py-1 rounded-full">
                    Más elegido
                  </span>
                )}
                <p className="text-center text-lg">{plan.badge}</p>
                <h3 className="mt-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Plan
                </h3>
                <p className="text-center text-xl font-bold text-white">{plan.name}</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-center">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400 text-sm"> /mes</span>
                </p>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex items-center justify-center gap-1.5 bg-white text-slate-900 font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Elegir plan {plan.name} <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto">
          <HomeIcon className="w-6 h-6 text-white" />
        </div>
        <h2 className="mt-6 text-2xl sm:text-3xl font-bold">
          Dejá de administrar tus edificios y alquileres en planillas de Excel
        </h2>
        <p className="mt-3 text-slate-600 max-w-xl mx-auto">
          Contanos cuántos edificios administrás y te ayudamos a arrancar.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-900 text-white font-medium px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> 092 971 595
          </a>
          <a
            href={EMAIL_URL}
            className="flex items-center gap-2 border border-gray-200 text-slate-700 font-medium px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Mail className="w-4 h-4" /> propadminok@gmail.com
          </a>
        </div>
      </section>

      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} PropAdmin — Software de gestión para administradoras, Uruguay.</p>
          <Link href="/login" className="hover:text-slate-700 transition-colors">
            Ya soy cliente — Iniciar sesión
          </Link>
        </div>
      </footer>
    </div>
  );
}
