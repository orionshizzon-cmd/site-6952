import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ShoppingBag, MapPin, Instagram, MessageCircle } from "lucide-react";
import { useCart } from "./cart-provider";
import { BRAND, whatsappLink } from "../lib/constants";

const NAV = [
  { label: "Início", href: "/" },
  { label: "Produtos", href: "/produtos" },
  { label: "Personalizar", href: "/personalizar" },
  { label: "Localização", href: "/localizacao" },
];

function LuxuryBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Textura de luxo: produtos gravados a laser em line-art dourado sobre cream */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
        style={{ backgroundImage: "url('/images/bg-luxury.png')" }}
      />
      {/* Suaviza o centro para manter o conteúdo legível */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background/40" />
    </div>
  );
}

const SITE_WHATS_MSG =
  "Olá! Vim pelo site da Rafa Laser e quero conhecer os produtos personalizados disponíveis.";

// Botão flutuante do WhatsApp — presente em todas as páginas.
function FloatingWhatsApp() {
  return (
    <a
      href={whatsappLink(SITE_WHATS_MSG)}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="group fixed right-4 z-40 flex items-center gap-2 rounded-full bg-whats px-4 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 sm:right-6"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}

function LogoWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
    >
      <img
        src="/images/logo-black.png"
        alt=""
        className="logo-watermark w-[min(120vw,900px)] max-w-none opacity-[0.045]"
      />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:h-[72px]">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/images/logo-rafa-laser-nobg.png" alt="Rafa Laser" className="h-10 w-auto sm:h-11" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => {
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`text-sm font-semibold transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={whatsappLink("Olá! Vim pelo site da Rafa Laser e gostaria de um orçamento.")}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full bg-whats px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 sm:inline-flex"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>

          <Link
            to="/carrinho"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-gold"
            aria-label="Carrinho de orçamento"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-black">
                {count}
              </span>
            )}
          </Link>

          <button
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-[1200px] flex-col px-5 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className="py-3 text-base font-semibold text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={whatsappLink("Olá! Vim pelo site da Rafa Laser e gostaria de um orçamento.")}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-whats px-4 py-3 text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

function TopBar() {
  return (
    <div className="relative z-20 bg-ink text-white">
      <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-3 overflow-x-auto whitespace-nowrap px-5 py-2 text-[11px] font-semibold tracking-wide sm:gap-6 sm:text-xs">
        <span>🚚 Enviamos para todo Brasil</span>
        <span className="text-white/25">|</span>
        <span>⚡ Produção em Imperatriz-MA</span>
        <span className="text-white/25">|</span>
        <span>💳 Pix e Cartão</span>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mt-24 bg-ink text-white/80">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <img
            src="/images/logo-rafa-laser-nobg.png"
            alt="Rafa Laser"
            className="mb-4 h-14 w-auto brightness-0 invert"
          />
          <p className="max-w-xs text-sm leading-relaxed text-white/60">
            {BRAND.slogan} Gravação a laser de alta precisão em {BRAND.city}.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-gold">
            Contato
          </h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                href={whatsappLink("Olá! Vim pelo site da Rafa Laser e gostaria de um orçamento.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <MessageCircle className="h-4 w-4 text-whats" /> {BRAND.whatsappDisplay}
              </a>
            </li>
            <li>
              <a
                href={BRAND.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <Instagram className="h-4 w-4 text-gold" /> @{BRAND.instagram}
              </a>
            </li>
            <li className="inline-flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-gold" /> {BRAND.addressFull}
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-gold">
            Navegação
          </h4>
          <ul className="mt-4 space-y-3 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link to={n.href} className="hover:text-white">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/carrinho" className="hover:text-white">
                Carrinho
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1200px] px-5 py-5 text-xs text-white/40">
          © {new Date().getFullYear()} {BRAND.name} · {BRAND.company} · Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <LuxuryBackground />
      <LogoWatermark />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopBar />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <FloatingWhatsApp />
    </div>
  );
}
