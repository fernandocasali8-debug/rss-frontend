import React from 'react';
import { ArrowRight, CheckCircle2, Shield, Sparkles } from 'lucide-react';

const features = [
  {
    title: 'Curadoria inteligente',
    desc: 'Linhas do tempo personalizadas, filtros e salvamentos para equipes editoriais.',
    icon: Sparkles
  },
  {
    title: 'Operacao confiavel',
    desc: 'Monitoramento, alertas e dashboards com indicadores de saude dos feeds.',
    icon: Shield
  },
  {
    title: 'Automacao pratica',
    desc: 'Regras, integracoes e resumos diarios para acelerar o workflow.',
    icon: CheckCircle2
  }
];

const tiers = [
  {
    name: 'Starter',
    price: 'R$ 99',
    note: 'por mes',
    items: ['Ate 10 feeds', 'Resumo diario', 'Alertas basicos', '1 usuario']
  },
  {
    name: 'Pro',
    price: 'R$ 299',
    note: 'por mes',
    items: ['Ate 50 feeds', 'Tendencias e influenciadores', 'Automacao basica', '3 usuarios']
  },
  {
    name: 'Business',
    price: 'R$ 799',
    note: 'por mes',
    items: ['Ate 200 feeds', 'Integracoes Telegram/WhatsApp', 'IA com limites', '10 usuarios']
  }
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={{
        fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
        backgroundImage:
          'radial-gradient(circle at 15% 10%, rgba(249,115,22,0.22), transparent 45%), radial-gradient(circle at 80% 20%, rgba(14,165,233,0.18), transparent 42%), linear-gradient(180deg, #0b1220 0%, #05070d 100%)'
      }}
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold">
            RSS
          </div>
          <div>
            <div className="text-sm font-semibold">Leitor RSS</div>
            <div className="text-xs text-white/60">Monitoramento editorial</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a className="text-white/70 transition hover:text-white" href="/admin">
            Area admin
          </a>
          <a className="text-white/70 transition hover:text-white" href="/team">
            Area de times
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-white/20"
            href="/app"
          >
            Entrar no app
            <ArrowRight size={16} />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">
              Produto
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-5xl">
              Inteligencia editorial para equipes que precisam de velocidade.
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/70">
              Centralize feeds, automatize resumos e tenha visibilidade completa do
              que importa no seu ecossistema de conteudo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90"
                href="/app"
              >
                Comecar agora
                <ArrowRight size={16} />
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href="#planos"
              >
                Ver planos
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <div className="text-sm uppercase tracking-[0.3em] text-white/50">Highlights</div>
            <div className="mt-4 space-y-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{feature.title}</div>
                      <div className="text-xs text-white/70">{feature.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Icon size={20} />
                </div>
                <div className="mt-4 text-lg font-semibold">{feature.title}</div>
                <div className="mt-2 text-sm text-white/70">{feature.desc}</div>
              </div>
            );
          })}
        </section>

        <section id="planos" className="mt-20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">Planos</div>
              <h2 className="mt-2 text-3xl font-semibold">Precificacao clara por nivel</h2>
            </div>
            <a
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              href="/app"
            >
              Testar agora
              <ArrowRight size={16} />
            </a>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div key={tier.name} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm uppercase tracking-[0.3em] text-white/60">{tier.name}</div>
                <div className="mt-4 text-3xl font-semibold">{tier.price}</div>
                <div className="text-xs text-white/60">{tier.note}</div>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {tier.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-orange-300" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
                  href="/app"
                >
                  Selecionar plano
                  <ArrowRight size={16} />
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">Demo</div>
              <h3 className="mt-2 text-2xl font-semibold">Veja o produto em funcionamento</h3>
              <p className="mt-2 text-sm text-white/70">
                Acesse o painel e explore as automacoes, dashboards e alertas.
              </p>
            </div>
            <a
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90"
              href="/app"
            >
              Entrar no painel
              <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
