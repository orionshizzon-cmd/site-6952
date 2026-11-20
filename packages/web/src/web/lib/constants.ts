// Contatos e constantes da marca Rafa Laser
export const BRAND = {
  name: "Rafa Laser",
  company: "Rafart Stores",
  slogan: "Personalizando momentos, criando memórias.",
  city: "Imperatriz - MA",
  whatsappNumber: "5599991553836",
  whatsappDisplay: "(99) 99155-3836",
  instagram: "rafa.laser",
  instagramUrl: "https://instagram.com/rafa.laser",
  address: "Rua Principal, 173, Parque Vitória",
  cep: "65915-784",
  addressFull: "Rua Principal, 173, Parque Vitória, Imperatriz - MA, CEP 65915-784",
  mapsQuery: "Rua Principal, 173, Parque Vitória, Imperatriz - MA, 65915-784",
};

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${BRAND.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Fontes de gravação disponíveis para o cliente escolher.
// family = font-family CSS (carregada via Google Fonts no index.html) usada no preview.
// ttf = arquivo TrueType (fontsource) usado para gerar o vetor (contornos) do nome.
export type EngravingFont = {
  label: string;
  family: string;
  ttf: string;
  category: "Serifada" | "Sem serifa" | "Manuscrita" | "Decorativa" | "Máquina de escrever";
};

const FS = (id: string, style = "normal", weight = "400") =>
  `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/latin-${weight}-${style}.ttf`;

export const ENGRAVING_FONTS: EngravingFont[] = [
  { label: "Playfair Display", family: "'Playfair Display', serif", ttf: FS("playfair-display"), category: "Serifada" },
  { label: "Cormorant Garamond", family: "'Cormorant Garamond', serif", ttf: FS("cormorant-garamond"), category: "Serifada" },
  { label: "EB Garamond", family: "'EB Garamond', serif", ttf: FS("eb-garamond"), category: "Serifada" },
  { label: "Marcellus", family: "'Marcellus', serif", ttf: FS("marcellus"), category: "Serifada" },
  { label: "Cinzel", family: "'Cinzel', serif", ttf: FS("cinzel"), category: "Decorativa" },
  { label: "Cinzel Decorative", family: "'Cinzel Decorative', serif", ttf: FS("cinzel-decorative"), category: "Decorativa" },
  { label: "Montserrat", family: "'Montserrat', sans-serif", ttf: FS("montserrat"), category: "Sem serifa" },
  { label: "Poppins", family: "'Poppins', sans-serif", ttf: FS("poppins"), category: "Sem serifa" },
  { label: "Josefin Sans", family: "'Josefin Sans', sans-serif", ttf: FS("josefin-sans"), category: "Sem serifa" },
  { label: "Oswald", family: "'Oswald', sans-serif", ttf: FS("oswald"), category: "Sem serifa" },
  { label: "Bebas Neue", family: "'Bebas Neue', sans-serif", ttf: FS("bebas-neue"), category: "Sem serifa" },
  { label: "Great Vibes", family: "'Great Vibes', cursive", ttf: FS("great-vibes"), category: "Manuscrita" },
  { label: "Dancing Script", family: "'Dancing Script', cursive", ttf: FS("dancing-script"), category: "Manuscrita" },
  { label: "Sacramento", family: "'Sacramento', cursive", ttf: FS("sacramento"), category: "Manuscrita" },
  { label: "Allura", family: "'Allura', cursive", ttf: FS("allura"), category: "Manuscrita" },
  { label: "Parisienne", family: "'Parisienne', cursive", ttf: FS("parisienne"), category: "Manuscrita" },
  { label: "Pinyon Script", family: "'Pinyon Script', cursive", ttf: FS("pinyon-script"), category: "Manuscrita" },
  { label: "Alex Brush", family: "'Alex Brush', cursive", ttf: FS("alex-brush"), category: "Manuscrita" },
  { label: "Tangerine", family: "'Tangerine', cursive", ttf: FS("tangerine"), category: "Manuscrita" },
  { label: "Italianno", family: "'Italianno', cursive", ttf: FS("italianno"), category: "Manuscrita" },
  { label: "Yellowtail", family: "'Yellowtail', cursive", ttf: FS("yellowtail"), category: "Manuscrita" },
  { label: "Pacifico", family: "'Pacifico', cursive", ttf: FS("pacifico"), category: "Manuscrita" },
  { label: "Satisfy", family: "'Satisfy', cursive", ttf: FS("satisfy"), category: "Manuscrita" },
  { label: "Lobster", family: "'Lobster', cursive", ttf: FS("lobster"), category: "Decorativa" },
  { label: "Special Elite", family: "'Special Elite', monospace", ttf: FS("special-elite"), category: "Máquina de escrever" },
  { label: "Courier Prime", family: "'Courier Prime', monospace", ttf: FS("courier-prime"), category: "Máquina de escrever" },
];

export const ENGRAVING_ORIENTATIONS = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
] as const;

export const HORARIOS = [
  { dia: "Segunda a Sexta", horas: "08h00 às 18h00" },
  { dia: "Sábado", horas: "08h00 às 12h00" },
  { dia: "Domingo", horas: "Fechado" },
];
