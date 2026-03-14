import { Link } from "react-router-dom"
import {
  Camera,
  QrCode,
  ShieldCheck,
  Images,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Upload,
  Smartphone,
  LayoutDashboard,
} from "lucide-react"
import logo from "../assets/logo.png"

const whatsappUrl =
  "https://wa.me/5579999448383?text=Olá!%20Quero%20saber%20mais%20sobre%20a%20Galeria%20Interativa%20L'Amour."

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

const photographerPlans = [
  {
    name: "Essencial",
    description:
      "Ideal para fotógrafos que querem começar a oferecer a galeria interativa em poucos eventos por mês.",
    items: [
      "Direito a uma quantidade inicial de eventos mensais",
      "QR Code individual por evento",
      "Upload de fotos e vídeos pelos convidados",
      "Galeria organizada e responsiva",
      "Suporte operacional para ativação dos eventos",
    ],
  },
  {
    name: "Premium",
    description:
      "Para quem atende com mais frequência e quer uma operação mais robusta do que o plano Essencial.",
    items: [
      "Tudo do plano Essencial",
      "Quantidade maior de eventos mensais",
      "Mais flexibilidade de configuração por evento",
      "Galerias com experiência visual mais completa",
      "Melhor opção para quem deseja escalar o serviço",
    ],
    featured: true,
  },
  {
    name: "Profissional",
    description:
      "Pensado para fotógrafos parceiros que querem mais autonomia e recursos avançados.",
    items: [
      "Tudo dos planos anteriores",
      "Quantidade ainda maior de eventos mensais",
      "Liberação do modo de edição",
      "Mais controle sobre a operação dos eventos",
      "Estrutura ideal para fluxo profissional contínuo",
    ],
  },
]

const directClientSteps = [
  {
    icon: LayoutDashboard,
    title: "1. A L’Amour configura tudo",
    description:
      "Você contrata o serviço e a equipe L’Amour cria o seu evento com as configurações ideais para a sua festa.",
  },
  {
    icon: QrCode,
    title: "2. O QR Code é disponibilizado",
    description:
      "No dia do evento, os convidados recebem acesso ao QR Code nas mesas ou em pontos estratégicos da festa.",
  },
  {
    icon: Smartphone,
    title: "3. Os convidados acessam pelo celular",
    description:
      "Basta apontar a câmera, abrir o link e entrar na página de envio da galeria interativa.",
  },
  {
    icon: Upload,
    title: "4. Fotos e vídeos são enviados",
    description:
      "Cada convidado pode compartilhar seus próprios registros, mostrando a festa por vários olhares diferentes.",
  },
  {
    icon: Images,
    title: "5. Tudo fica organizado em uma galeria",
    description:
      "Ao final, os anfitriões recebem uma galeria moderna e especial com momentos espontâneos da celebração.",
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-900">
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.16),transparent_22%),radial-gradient(circle_at_left,rgba(255,255,255,0.06),transparent_18%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.12),transparent_22%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-medium text-yellow-200">
              <Sparkles className="h-4 w-4" />
              Galeria L'Amour
            </div>

            <div className="mt-8">
              <div className="inline-flex rounded-[36px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:p-6">
                <div className="rounded-[30px] border border-white/10 bg-white px-8 py-6 shadow-lg sm:px-10 sm:py-8">
                  <img
                    src={logo}
                    alt="L'Amour Galeria"
                    className="h-32 w-auto object-contain sm:h-40 lg:h-52"
                  />
                </div>
              </div>
            </div>

            <h1 className="mt-10 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              A festa pelos olhos dos convidados.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              Receba fotos e vídeos por QR Code, personalize a experiência de cada evento e organize tudo em uma galeria bonita, moderna e fácil de compartilhar.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-medium text-slate-900 shadow-sm transition hover:opacity-90"
              >
                Entrar no painel
              </Link>

              <a
                href="#planos"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/30 px-5 py-3 font-medium text-white-900 transition hover:bg-white/50"
              >
                Ver planos
              </a>
            </div>

            <div className="mt-10 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
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

          <div className="mx-auto mt-14 grid max-w-5xl gap-4 self-center lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur">
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
                <p className="mt-4 text-sm font-medium text-yellow-700">Página de upload</p>
                <h3 className="mt-2 text-2xl font-bold">Envie seus registros</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Compartilhe fotos e vídeos desse momento especial com poucos toques no celular.
                </p>
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Área de seleção de arquivo + botão de envio
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
                <p className="text-sm font-medium text-yellow-200">Painel do anfitrião</p>
                <p className="mt-2 text-lg font-semibold text-white">Controle total</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Acompanhe uploads, aprove conteúdos e mantenha a galeria organizada.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
                <p className="text-sm font-medium text-yellow-200">Galeria final</p>
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
          <p className="text-sm font-medium text-yellow-400">Por que usar</p>
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
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
              <p className="text-sm font-medium text-yellow-400">Como funciona para o cliente</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                A Galeria Interativa L’Amour passo a passo
              </h2>
              <p className="mt-4 max-w-lg text-white/70">
                Para o cliente direto, a L’Amour cuida da configuração e entrega uma experiência simples, bonita e prática para o evento.
              </p>
            </div>

            <div className="space-y-4">
              {directClientSteps.map((step) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.title}
                    className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-900">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        {step.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-yellow-400">Planos para fotógrafos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Estruture sua operação por quantidade de eventos
          </h2>
          <p className="mt-4 text-white/70">
            Os planos são voltados para fotógrafos parceiros. A ativação dos eventos e as alterações de configuração são feitas pela equipe L’Amour. Para contratar, solicite atendimento pelo WhatsApp.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {photographerPlans.map((plan) => (
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
                  <p
                    className={`mt-2 text-sm ${
                      plan.featured ? "text-slate-600" : "text-white/70"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>
                {plan.featured && (
                  <span className="rounded-full bg-yellow-600 px-3 py-1 text-xs font-semibold text-white">
                    Mais procurado
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      className={`mt-0.5 h-5 w-5 ${
                        plan.featured ? "text-yellow-600" : "text-yellow-300"
                      }`}
                    />
                    <p
                      className={`text-sm ${
                        plan.featured ? "text-slate-700" : "text-white/80"
                      }`}
                    >
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              <a
  href={whatsappUrl}
  target="_blank"
  rel="noreferrer"
  className={`mt-8 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${
    plan.featured
      ? "bg-emerald-500 text-white hover:bg-emerald-400"
      : "bg-emerald-500 text-white hover:bg-emerald-400"
  }`}
>
  Falar no WhatsApp
</a>
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
            <p className="mt-5 text-sm font-medium text-yellow-300">Pronto para atender</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Ofereça uma experiência premium para festas e eventos
            </h2>
            <p className="mt-4 max-w-2xl text-white/75">
              Seja para cliente direto ou fotógrafo parceiro, a Galeria Interativa L’Amour transforma os registros dos convidados em uma experiência moderna, bonita e cheia de memória afetiva.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
  to="/login"
  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-semibold !text-slate-900 shadow-sm transition hover:bg-gray-100"
>
  Entrar no painel
</Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-emerald-500 px-5 py-3 font-medium text-white transition hover:bg-emerald-400"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl transition hover:scale-105 hover:bg-emerald-400"
        aria-label="Falar no WhatsApp"
        title="Falar no WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </main>
  )
}