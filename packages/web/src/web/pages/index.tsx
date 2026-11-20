import { useState } from "react";
import { Link } from "wouter";
import { motion } from "motion/react";
import {
  Sparkles,
  MessageCircle,
  ArrowRight,
  MapPin,
  ShieldCheck,
  Star,
  Quote,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Gift,
  Zap,
  Gem,
} from "lucide-react";
import { useProducts } from "../queries/products";
import { useCategories } from "../queries/categories";
import { usePortfolio } from "../queries/portfolio";
import { usePhotoSteps } from "../queries/photo-steps";
import { useTestimonials } from "../queries/testimonials";
import { useBanners } from "../queries/banners";
import { useSections } from "../queries/sections";
import { useLightbox } from "../components/lightbox";
import { ProductCard } from "../components/product-card";
import { CustomizeModal } from "../components/customize-modal";
import { Seo, LOCAL_BUSINESS_LD } from "../components/seo";
import { BRAND, whatsappLink } from "../lib/constants";
import type { ProductDTO, BannerDTO } from "../../api/database/schema";

const HERO_WHATS =
  "Olá! Vim pelo site da Rafa Laser e quero conhecer os produtos personalizados disponíveis.";

// Ordem preferida das categorias na vitrine "Compre por categoria".
const CATEGORY_ORDER = [
  "Garrafas térmicas",
  "Copos personalizados",
  "Chaveiros com fotogravação",
  "Fotogravação",
  "Kits Churrasco",
  "Canivetes personalizados",
  "Presentes",
  "Empresas",
];

// Fallback usado só enquanto o portfólio do admin não carrega / está vazio.
const PORTFOLIO_FALLBACK = [
  { image: "/images/prod-copos.png", label: "Garrafas e copos" },
  { image: "/images/prod-canetas.png", label: "Canetas gravadas" },
  { image: "/images/prod-pettag.png", label: "Pet tags e chaveiros" },
  { image: "/images/prod-aneis.png", label: "Anéis e alianças" },
  { image: "/images/prod-relogio.png", label: "Relógios" },
  { image: "/images/prod-placas.png", label: "Placas e homenagens" },
];

const STEPS = [
  { n: 1, title: "Escolha o produto", text: "Garrafa, copo, chaveiro, kit ou o seu próprio item." },
  { n: 2, title: "Envie foto ou nome", text: "Manda a foto, o nome ou a frase que vai na gravação." },
  { n: 3, title: "Criamos a arte", text: "Tratamos a imagem e preparamos o arquivo de gravação." },
  { n: 4, title: "Gravamos a laser", text: "Gravação permanente feita na nossa fiber laser." },
  { n: 5, title: "Você recebe", text: "Retirada em Imperatriz-MA ou envio para todo o Brasil." },
];

const PHOTO_STEPS_FALLBACK = [
  {
    image: "/images/step-foto-1.png",
    label: "1. Foto original",
    text: "Você envia a foto pelo WhatsApp.",
  },
  {
    image: "/images/step-foto-2.png",
    label: "2. Tratamento",
    text: "Ajustamos contraste e detalhes para o laser.",
  },
  {
    image: "/images/step-foto-3.png",
    label: "3. Gravação a laser",
    text: "A fiber laser grava ponto por ponto.",
  },
  {
    image: "/images/step-foto-4.png",
    label: "4. Produto pronto",
    text: "Gravação permanente, com acabamento premium.",
  },
];

// Banner da home — conteúdo vindo do painel admin.
function HomeBanner({ banner, featured }: { banner: BannerDTO; featured: boolean }) {
  const lightbox = useLightbox();
  const media = banner.mediaList ?? [];
  const [slide, setSlide] = useState(0);
  const current = media[Math.min(slide, media.length - 1)];
  const photos = media.filter((m) => m.kind === "image");
  const href = banner.ctaUrl?.trim()
    ? banner.ctaUrl
    : whatsappLink(
        banner.whatsappMessage?.trim() ||
          `Olá! Vi no site: "${banner.title}" e quero saber mais.`,
      );

  return (
    <div className="overflow-hidden rounded-3xl border border-gold/50 bg-ink shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)]">
      <div className={current ? "grid sm:grid-cols-[1fr_1fr]" : ""}>
        {current && (
          <div className="relative aspect-square w-full bg-black sm:aspect-auto sm:h-full">
            {current.kind === "video" ? (
              <video
                key={current.key}
                src={current.url}
                controls
                autoPlay
                muted
                loop
                aria-label={`Vídeo promocional: ${banner.title}`}
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
              />
            ) : (
              <button
                type="button"
                onClick={() =>
                  lightbox.open(
                    photos.map((p) => ({ src: p.url, alt: banner.title })),
                    Math.max(
                      0,
                      photos.findIndex((p) => p.key === current.key),
                    ),
                  )
                }
                aria-label={`Ampliar imagem: ${banner.title}`}
                className="group/zoom h-full w-full cursor-zoom-in appearance-none border-0 bg-black p-0"
              >
                <img
                  src={current.url}
                  alt={banner.title}
                  className="h-full w-full object-contain"
                />
                <span className="pointer-events-none absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur sm:opacity-75">
                  <ZoomIn className="h-4 w-4" />
                </span>
              </button>
            )}

            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSlide((s) => (s - 1 + media.length) % media.length)}
                  aria-label="Mídia anterior"
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSlide((s) => (s + 1) % media.length)}
                  aria-label="Próxima mídia"
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-2 py-1.5 backdrop-blur">
                  {media.map((m, i) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setSlide(i)}
                      aria-label={`Ver mídia ${i + 1}`}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i === Math.min(slide, media.length - 1) ? "bg-gold" : "bg-white/45"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col justify-center gap-3 p-6 text-white sm:p-7">
          {banner.badge && (
            <span className="w-fit rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-black">
              {banner.badge}
            </span>
          )}
          <p
            className={`font-display font-extrabold leading-tight ${
              featured ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
            }`}
          >
            {banner.title}
          </p>
          {banner.text && <p className="text-sm leading-relaxed text-white/70">{banner.text}</p>}
          {banner.ctaLabel && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-whats px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" /> {banner.ctaLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Index() {
  const products = useProducts();
  const categories = useCategories();
  const portfolio = usePortfolio();
  const testimonials = useTestimonials();
  const banners = useBanners();
  const sections = useSections();
  const photoSteps = usePhotoSteps();
  const lightbox = useLightbox();
  const [selected, setSelected] = useState<ProductDTO | null>(null);

  const list = products.data ?? [];
  const featured = list.filter((p) => p.featured);
  const bestSellers = (featured.length ? featured : list).slice(0, 6);
  const bannerList = banners.data ?? [];
  const depoimentos = testimonials.data ?? [];
  const seasonalSections = (sections.data ?? []).filter((s) => s.active);

  const photoStepItems =
    photoSteps.data && photoSteps.data.length > 0
      ? photoSteps.data.map((s) => ({ image: s.url, label: s.label, text: s.text ?? "" }))
      : PHOTO_STEPS_FALLBACK;

  const portfolioItems =
    portfolio.data && portfolio.data.length > 0
      ? portfolio.data.map((p) => ({ image: p.url, label: p.label }))
      : PORTFOLIO_FALLBACK;

  // Categorias: usa as do banco, na ordem preferida, com o restante em seguida.
  const catNames = (categories.data ?? []).map((c) => c.name);
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => catNames.includes(c)),
    ...catNames.filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
  const showCats = orderedCats.length > 0 ? orderedCats : CATEGORY_ORDER;

  return (
    <div>
      <Seo
        title="Rafa Laser | Gravação a Laser em Imperatriz-MA"
        description="Presentes personalizados e gravação a laser em Imperatriz-MA. Garrafas, copos, canivetes, chaveiros, canetas e fotogravação. Solicite seu orçamento pelo WhatsApp."
        path="/"
        jsonLd={LOCAL_BUSINESS_LD}
      />

      {/* 1. BANNER PRINCIPAL (HERO) */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[1200px] px-5 pb-12 pt-12 sm:pb-16 sm:pt-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="overline text-gold"
          >
            {BRAND.city}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl"
          >
            Transforme momentos em{" "}
            <span className="text-gold-gradient">presentes únicos.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            Fotogravação e personalização a laser feitas especialmente para você.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              to="/produtos"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" /> Escolher meu presente
            </Link>
            <a
              href={whatsappLink(HERO_WHATS)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-whats px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" /> Pedir pelo WhatsApp
            </a>
          </motion.div>

          {/* Banners editáveis pelo admin (promoções e avisos) */}
          {bannerList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-10 grid max-w-4xl gap-4"
            >
              {bannerList.map((b, i) => (
                <HomeBanner key={b.id} banner={b} featured={i === 0} />
              ))}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-4"
          >
            {[
              { icon: Zap, label: "Alta precisão" },
              { icon: ShieldCheck, label: "Gravação permanente" },
              { icon: Gem, label: "Acabamento premium" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm font-semibold">
                <f.icon className="h-4 w-4 text-gold" />
                {f.label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 2. COMPRE POR CATEGORIA */}
      <section className="relative z-10 bg-secondary/50">
        <div className="mx-auto max-w-[1200px] px-5 py-12">
          <p className="overline text-gold">Compre por categoria</p>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            Escolha por onde começar
          </h2>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {showCats.map((c) => (
              <Link
                key={c}
                to={`/produtos?categoria=${encodeURIComponent(c)}`}
                className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-gold hover:text-gold-deep"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SEÇÕES SAZONAIS (editáveis no admin) */}
      {seasonalSections.map((sec) => {
        const items = sec.categoryFilter
          ? list.filter((p) => p.category === sec.categoryFilter).slice(0, 6)
          : bestSellers;
        if (items.length === 0) return null;
        return (
          <section key={sec.id} className="mx-auto max-w-[1200px] px-5 py-14">
            <p className="overline text-gold">Seleção especial</p>
            <h2 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold sm:text-4xl">
              {sec.emoji ? <span aria-hidden>{sec.emoji}</span> : <Gift className="h-7 w-7 text-gold" />}
              {sec.title}
            </h2>
            {sec.subtitle && (
              <p className="mt-3 max-w-2xl text-muted-foreground">{sec.subtitle}</p>
            )}

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} onCustomize={setSelected} />
              ))}
            </div>
          </section>
        );
      })}

      {/* 4. OS MAIS VENDIDOS */}
      <section className="mx-auto max-w-[1200px] px-5 py-14">
        <div className="flex items-end justify-between">
          <div>
            <p className="overline text-gold">Mais pedidos</p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Os mais vendidos da Rafa Laser
            </h2>
          </div>
          <Link
            to="/produtos"
            className="hidden items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            Ver tudo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[380px] animate-pulse rounded-2xl bg-secondary" />
              ))
            : bestSellers.map((p) => (
                <ProductCard key={p.id} product={p} onCustomize={setSelected} />
              ))}
        </div>
      </section>

      {/* 5. COMO FUNCIONA */}
      <section className="relative z-10 bg-ink text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-14">
          <p className="overline text-gold">Como funciona</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Do seu pedido à peça pronta
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: s.n * 0.04 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-display text-sm font-extrabold text-black">
                  {s.n}
                </span>
                <h3 className="mt-3 font-display text-base font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/60">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FOTOGRAFIA → GRAVAÇÃO */}
      <section className="mx-auto max-w-[1200px] px-5 py-14">
        <p className="overline text-gold">Fotogravação</p>
        <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
          Veja como uma fotografia vira uma gravação
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Da foto que você manda no WhatsApp até a peça gravada: cada etapa é feita com ajuste
          fino para preservar os detalhes do rosto.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {photoStepItems.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <button
                type="button"
                onClick={() =>
                  lightbox.open(
                    photoStepItems.map((s) => ({ src: s.image, alt: s.label })),
                    i,
                  )
                }
                aria-label={`Ampliar: ${step.label}`}
                className="group/zoom relative block aspect-square w-full cursor-zoom-in appearance-none border-0 bg-secondary p-0"
              >
                <img
                  src={step.image}
                  alt={step.label}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="pointer-events-none absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity group-hover/zoom:opacity-100">
                  <ZoomIn className="h-4 w-4" />
                </span>
              </button>
              <div className="p-4">
                <p className="font-display text-sm font-bold text-gold-deep">{step.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <a
          href={whatsappLink(
            "Olá! Quero fazer uma fotogravação. Posso enviar a foto por aqui?",
          )}
          target="_blank"
          rel="noreferrer"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-whats px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          <MessageCircle className="h-4 w-4" /> Enviar minha foto
        </a>
      </section>

      {/* 7. CLIENTES RAFA LASER */}
      <section className="relative z-10 bg-secondary/50">
        <div className="mx-auto max-w-[1200px] px-5 py-14">
          <p className="overline text-gold">Clientes Rafa Laser</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Peças reais, clientes reais
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Personalizações que já saíram da nossa produção — e o que os clientes falam sobre
            elas.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {portfolioItems.map((item, i) => (
              <motion.div
                key={`${item.label}-${i}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.05 }}
                className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() =>
                    lightbox.open(
                      portfolioItems.map((it) => ({
                        src: it.image,
                        alt: `Personalização Rafa Laser: ${it.label}`,
                      })),
                      i,
                    )
                  }
                  aria-label={`Ampliar foto: ${item.label}`}
                  className="absolute inset-0 h-full w-full cursor-zoom-in appearance-none border-0 bg-transparent p-0"
                >
                  <img
                    src={item.image}
                    alt={`Personalização Rafa Laser: ${item.label}`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="pointer-events-none absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    <ZoomIn className="h-4 w-4" />
                  </span>
                </button>
                <span className="pointer-events-none relative z-10 p-4 font-display text-sm font-semibold text-white">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>

          {depoimentos.length > 0 && (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {depoimentos.map((t, i) => (
                <motion.figure
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: (i % 3) * 0.05 }}
                  className="flex flex-col rounded-2xl border border-border bg-card p-6"
                >
                  <Quote className="h-6 w-6 text-gold/70" />
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    “{t.text}”
                  </blockquote>
                  <div className="mt-4 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star < t.rating ? "fill-gold text-gold" : "text-border"
                        }`}
                      />
                    ))}
                  </div>
                  <figcaption className="mt-2 font-display text-sm font-semibold">
                    {t.name}
                    {t.city ? (
                      <span className="font-sans font-normal text-muted-foreground">
                        {" "}
                        — {t.city}
                      </span>
                    ) : null}
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          )}

          <a
            href={BRAND.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-foreground px-6 py-3.5 text-sm font-bold transition-colors hover:border-gold hover:bg-gold hover:text-black"
          >
            <Instagram className="h-4 w-4" /> Ver mais no @{BRAND.instagram}
          </a>
        </div>
      </section>

      {/* 8. NOSSA HISTÓRIA */}
      <section className="relative z-10 overflow-hidden bg-ink text-white">
        {/* Foto da loja ao fundo, desfocada */}
        <img
          src="/images/loja-rafa-laser.jpg"
          alt="Loja Rafa Laser em Imperatriz-MA"
          loading="lazy"
          decoding="async"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-[5px] sm:blur-[8px]"
        />
        <div className="pointer-events-none absolute inset-0 bg-ink/35" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/10 to-ink/85" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 py-20 text-center sm:py-24"
        >
          <p className="overline text-gold">Nossa história</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Começou com um presente
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-white/75">
            Há quatro anos, nasceu em Imperatriz-MA a Rafart: uma empresa movida pela
            criatividade e pelo desejo de transformar presentes em lembranças especiais. Cada
            pedido que chegava era uma história — um aniversário, uma homenagem, uma despedida.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-white/75">
            Com muito trabalho, a marca cresceu, aperfeiçoou seus serviços e virou a Rafa Laser.
            Hoje somos especializados em fotogravação e gravação em 360°, e cada peça continua
            saindo daqui com o mesmo cuidado do primeiro pedido.
          </p>
          <p className="mt-7 border-t border-gold/40 pt-5 font-display text-lg font-semibold italic text-white">
            Rafa Laser — Personalizando momentos, criando memórias.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={whatsappLink(HERO_WHATS)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-whats px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" /> Falar com a gente
            </a>
            <Link
              to="/localizacao"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:border-gold hover:text-gold"
            >
              <MapPin className="h-4 w-4" /> Onde estamos
            </Link>
          </div>
        </motion.div>
      </section>

      {selected && <CustomizeModal product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default Index;
