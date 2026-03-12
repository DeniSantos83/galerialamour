import { Link } from "react-router-dom"
import {
  Camera,
  QrCode,
  ShieldCheck,
  Images,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import logo from "../assets/logo.png"

const features = [
  {
    icon: QrCode,
    title: "QR Code por evento",
    description:
      "Crie um link único para cada festa e permita que os convidados enviem fotos e vídeos direto do celular.",
  },
  {
    icon: Images,
    title: "Galeria bonita e organizada",
    description:
      "Exiba registros em uma galeria elegante, responsiva e pronta para valorizar o evento.",
  },
  {
    icon: ShieldCheck,
    title: "Moderação e controle",
    description:
      "Aprove, rejeite e exclua conteúdos antes de exibir tudo aos anfitriões ou convidados.",
  },
]

const steps = [
  "Crie o evento em poucos minutos",
  "Personalize com logo, capa, cores e instruções",
  "Compartilhe o QR Code nas mesas da festa",
  "Receba fotos e vídeos enviados pelos convidados",
  "Organize tudo em uma galeria moderna",
]

const plans = [
  {
    name: "Essencial",
    price: "R$ 49",
    description: "Ideal para testar o serviço em eventos menores.",
    items: [
      "1 evento",
      "QR Code do evento",
      "Upload de fotos e vídeos",
      "Galeria privada",
      "Personalização básica",
    ],
  },
  {
    name: "Premium",
    price: "R$ 99",
    description: "Melhor opção para casamentos, aniversários e formaturas.",
    items: [
      "Tudo do plano Essencial",
      "Logo e capa personalizadas",
      "Aprovação de uploads",
      "Galeria pública opcional",
      "Experiência visual premium",
    ],
    featured: true,
  },
  {
    name: "Profissional",
    price: "Sob consulta",
    description: "Para fotógrafos, produtoras e cerimonialistas.",
    items: [
      "Vários eventos",
      "Fluxo de trabalho profissional",
      "Marca branca no futuro",
      "Gestão centralizada",
      "Suporte para expansão comercial",
    ],
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-900">
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.16),transparent_22%),radial-gradient(circle_at_left,rgba(255,255,255,0.06),transparent_18%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.12),transparent_22%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-medium text-pink-200">
              <Sparkles className="h-4 w-4" />
              Galeria L'Amour
            </div>

            <div className="mt-6">
              <img
                src={logo}
                alt="L'Amour Galeria"
                className="h-24 w-auto object-contain sm:h-28"
              />
            </div>

            <h1 className="mt-8 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              A festa pelos olhos dos convidados.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
              Receba fotos e vídeos por QR Code, personalize a experiência de cada evento e organize tudo em uma galeria bonita, moderna e fácil de compartilhar.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-medium text-slate-900 shadow-sm transition hover:opacity-90"
              >
                Entrar no painel
              </Link>

              <a
                href="#planos"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/100 px-5 py-3 font-medium text-white transition hover:bg-white/15"
              >
                Ver planos
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold text-white">QR</p>
                <p className="mt-1 text-sm text-white/65">Upload rápido nas mesas</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold text-white">Fotos</p>
                <p className="mt-1 text-sm text-white/65">Registros espontâneos</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold text-white">Vídeos</p>
                <p className="mt-1 text-sm text-white/65">Momentos curtos e reais</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 self-center">
            <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 text-white shadow-xl backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Camera className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Exemplo de evento</p>
                  <h2 className="text-xl font-semibold">Casamento Deni & Fernanda</h2>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] bg-white p-5 text-slate-900">
                <img
                  src={logo}
                  alt="L'Amour Galeria"
                  className="h-14 w-auto object-contain"
                />
                <p className="mt-4 text-sm font-medium text-pink-600">Página de upload</p>
                <h3 className="mt-2 text-2xl font-bold">Envie seus registros</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Compartilhe fotos e vídeos desse momento especial com poucos toques no celular.
                </p>
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Área de seleção de arquivo + botão de envio
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
                <p className="text-sm font-medium text-pink-200">Painel do anfitrião</p>
                <p className="mt-2 text-lg font-semibold text-white">Controle total</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Acompanhe uploads, aprove conteúdos e mantenha a galeria organizada.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
                <p className="text-sm font-medium text-pink-200">Galeria final</p>
                <p className="mt-2 text-lg font-semibold text-white">Visual premium</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Uma experiência bonita para reviver a festa com os olhos dos convidados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-pink-400">Por que usar</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Uma forma moderna de transformar convidados em criadores de memória
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-pink-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  {feature.description}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/5">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-medium text-pink-400">Como funciona</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Do painel ao QR Code em poucos minutos
              </h2>
              <p className="mt-4 max-w-lg text-white/70">
                O processo foi pensado para ser simples para quem organiza e intuitivo para quem participa.
              </p>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900">
                    {index + 1}
                  </div>
                  <p className="pt-2 text-sm font-medium text-white/80">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-pink-400">Planos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Estruture a oferta e comece a vender
          </h2>
          <p className="mt-4 text-white/70">
            Você pode adaptar estes valores à sua realidade local e ao tipo de evento atendido.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[30px] p-6 shadow-sm ring-1 ${
                plan.featured
                  ? "bg-white text-slate-900 ring-white"
                  : "bg-white/5 text-white ring-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.featured ? "text-slate-600" : "text-white/70"}`}>
                    {plan.description}
                  </p>
                </div>
                {plan.featured && (
                  <span className="rounded-full bg-pink-600 px-3 py-1 text-xs font-semibold text-white">
                    Mais vendido
                  </span>
                )}
              </div>

              <p className="mt-6 text-3xl font-bold">{plan.price}</p>

              <div className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      className={`mt-0.5 h-5 w-5 ${plan.featured ? "text-pink-600" : "text-pink-300"}`}
                    />
                    <p className={`text-sm ${plan.featured ? "text-slate-700" : "text-white/80"}`}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-white backdrop-blur sm:p-10">
            <img
              src={logo}
              alt="L'Amour Galeria"
              className="h-16 w-auto object-contain"
            />
            <p className="mt-5 text-sm font-medium text-pink-300">Pronto para vender</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Comece a oferecer uma experiência premium para festas e eventos
            </h2>
            <p className="mt-4 max-w-2xl text-white/75">
              Use o painel para criar eventos, personalize a experiência e transforme isso em um serviço moderno para casamentos, aniversários, formaturas e eventos corporativos.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-medium text-slate-200"
              >
                Entrar no painel
              </Link>
              <a
                href="#planos"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-medium text-white hover:bg-white/15"
              >
                Ver planos novamente
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}