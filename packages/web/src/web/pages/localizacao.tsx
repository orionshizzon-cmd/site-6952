import { MapPin, MessageCircle, Instagram, Clock, Navigation } from "lucide-react";
import { BRAND, HORARIOS, whatsappLink } from "../lib/constants";
import { Seo, LOCAL_BUSINESS_LD } from "../components/seo";

function LocalizacaoPage() {
  const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(
    BRAND.mapsQuery,
  )}&output=embed`;
  const mapsDirections = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    BRAND.mapsQuery,
  )}`;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12">
      <Seo
        title="Localização e Contato | Rafa Laser Imperatriz"
        description="Entre em contato com a Rafa Laser em Imperatriz-MA e solicite seu orçamento de gravação e presentes personalizados."
        path="/localizacao"
        jsonLd={LOCAL_BUSINESS_LD}
      />
      <p className="overline text-gold">Onde estamos</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold sm:text-5xl">Localização e contato</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Venha nos visitar em {BRAND.city} ou fale com a gente pelo WhatsApp. Atendemos Imperatriz
        e região. Ficaremos felizes em atender você.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Informações */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
                <MapPin className="h-5 w-5 text-gold-deep" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Endereço</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {BRAND.address}
                  <br />
                  {BRAND.city}
                  <br />
                  CEP {BRAND.cep}
                </p>
                <a
                  href={mapsDirections}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep hover:underline"
                >
                  <Navigation className="h-4 w-4" /> Traçar rota
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
                <Clock className="h-5 w-5 text-gold-deep" />
              </div>
              <div className="w-full">
                <h3 className="font-display text-lg font-semibold">Horário de atendimento</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {HORARIOS.map((h) => (
                    <li key={h.dia} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{h.dia}</span>
                      <span className="font-semibold">{h.horas}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={whatsappLink("Olá! Vim pelo site da Rafa Laser e gostaria de um orçamento.")}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-whats px-5 py-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="h-5 w-5" /> {BRAND.whatsappDisplay}
            </a>
            <a
              href={BRAND.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-foreground px-5 py-4 text-sm font-bold transition-colors hover:bg-foreground hover:text-background"
            >
              <Instagram className="h-5 w-5" /> @{BRAND.instagram}
            </a>
          </div>
        </div>

        {/* Mapa */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <iframe
            title="Mapa Rafa Laser"
            src={mapsEmbed}
            className="h-[380px] w-full lg:h-full"
            style={{ border: 0, minHeight: 380 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>

      {/* Faixa de atendimento */}
      <section className="mt-10 overflow-hidden rounded-3xl bg-ink px-6 py-10 text-center text-white sm:px-10">
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
          Prefere resolver pelo WhatsApp?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
          Envie o modelo, a arte e a quantidade que você precisa. Respondemos com o orçamento e o
          prazo de produção. Retirada no local em {BRAND.city} ou combinamos a entrega.
        </p>
        <a
          href={whatsappLink("Olá! Vim pelo site da Rafa Laser e gostaria de um orçamento.")}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-whats px-7 py-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
        </a>
      </section>
    </div>
  );
}

export default LocalizacaoPage;
