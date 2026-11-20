import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Independent of catalog orders: customer-supplied engraving text.
export const personalizations = sqliteTable("personalizations", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  requestKey: text("request_key").notNull().unique(),
  name: text("name").notNull(),
  fontId: text("font_id").notNull(),
  fontName: text("font_name").notNull(),
  status: text("status").notNull().default("Pendente"),
  maxWidthMm: integer("max_width_mm").notNull().default(80),
  orderNumber: integer("order_number"),
  marginMm: integer("margin_mm").notNull().default(0),
  scalePct: integer("scale_pct").notNull().default(100),
  profile: text("profile").notNull().default("Personalizado"),
  referenceProduct: text("reference_product"),
  referenceOrientation: text("reference_orientation"),
  updatedAt: text("updated_at"),
  createdAt: text("created_at").notNull(),
});

export const personalizationNumbers = sqliteTable("personalization_numbers", {
  id: integer("id").primaryKey({autoIncrement:true}),
  code: text("code").notNull().unique(),
});
export const personalizationPresets = sqliteTable("personalization_presets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  maxWidthMm: integer("max_width_mm").notNull(),
  marginMm: integer("margin_mm").notNull(),
  scalePct: integer("scale_pct").notNull(),
});

export type ProductMedia = { type: "image" | "video"; key: string };

// Catálogo de produtos da Rafa Laser
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  // Características / ficha técnica. Uma por linha, no formato "Nome: valor".
  // Exibida em blocos na vitrine e na página do produto.
  specs: text("specs"),
  // Preço em centavos (BRL). Null = "Sob consulta".
  price: integer("price"),
  image: text("image").notNull(),
  // Mídia adicional (fotos e vídeos) enviada pelo admin.
  // JSON: [{ "type": "image" | "video", "key": "uploads/..." }]
  media: text("media", { mode: "json" })
    .$type<ProductMedia[]>()
    .notNull()
    .default([]),
  // JSON: [{ "name": "Preto", "hex": "#111111" }]
  colors: text("colors", { mode: "json" }).$type<{ name: string; hex: string }[]>().notNull(),
  // Controle de estoque. null = estoque não controlado (venda sob encomenda, sempre disponível).
  // 0 = esgotado. > 0 = unidades disponíveis para venda pelo site.
  stock: integer("stock"),
  // Personalização: quando false, o produto é vendido sem gravação
  // (sem texto, fonte, orientação ou upload de arte no carrinho).
  customizable: integer("customizable", { mode: "boolean" }).notNull().default(true),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Categorias de produtos (gerenciáveis pelo admin)
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Pedidos de orçamento enviados pelos clientes
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  note: text("note"),
  // JSON com os itens do carrinho e suas personalizações
  items: text("items", { mode: "json" }).$type<OrderItem[]>().notNull(),
  // Total do pedido em centavos (BRL)
  total: integer("total").notNull().default(0),
  status: text("status").notNull().default("Aguardando resposta"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Imagens do portfólio na home (gerenciáveis pelo admin)
export const portfolio = sqliteTable("portfolio", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Chave do objeto no storage (assinada na leitura)
  image: text("image").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Depoimentos de clientes (gerenciáveis pelo admin)
export const testimonials = sqliteTable("testimonials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  city: text("city"),
  text: text("text").notNull(),
  rating: integer("rating").notNull().default(5),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Banners editáveis da página inicial (promoções e avisos)
export const banners = sqliteTable("banners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Chave no storage ou caminho local (ex: /images/banner.jpg). Opcional.
  image: text("image"),
  // JSON com várias mídias: [{ kind: "image" | "video", key: string }]
  media: text("media"),
  badge: text("badge"),
  title: text("title").notNull(),
  text: text("text"),
  ctaLabel: text("cta_label"),
  // Link externo; quando vazio usamos o WhatsApp com `whatsappMessage`
  ctaUrl: text("cta_url"),
  whatsappMessage: text("whatsapp_message"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Seções sazonais/editáveis da home (ex.: Dia dos Pais)
export const homeSections = sqliteTable("home_sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  emoji: text("emoji"),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  // Categoria usada para escolher os produtos exibidos (null = destaques)
  categoryFilter: text("category_filter"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Etapas da seção "Veja como uma fotografia vira uma gravação" (editáveis no admin)
export const photoSteps = sqliteTable("photo_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  image: text("image").notNull(),
  label: text("label").notNull(),
  text: text("text"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// Dados do emitente usados no recibo/pedido impresso (linha única, id = 1)
export const issuer = sqliteTable("issuer", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("Rafa Laser"),
  legalName: text("legal_name"),
  doc: text("doc"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  instagram: text("instagram"),
  // Texto padrão de observações/prazo que já vem preenchido no recibo
  defaultTerms: text("default_terms"),
  defaultDeadline: text("default_deadline"),
});

export type OrderItem = {
  productId: number;
  productName: string;
  category: string;
  color: string;
  engravingText: string;
  engravingFont: string;
  engravingOrientation: string;
  engravingVectorUrl?: string | null;
  imageUrl?: string | null;
  unitPrice?: number | null; // centavos
  quantity: number;
  notes?: string;
};

export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Category = typeof categories.$inferSelect;

// Nome usado quando um produto fica sem categoria (após excluir a categoria)
export const UNCATEGORIZED = "Sem categoria";

// Produto serializado para o cliente: mídia e capa com URLs prontas para uso.
// `imageKey` e `media[].key` são as chaves brutas (usadas pelo admin ao editar).
export type ProductDTO = Omit<Product, "media"> & {
  imageKey: string;
  media: { type: "image" | "video"; url: string; key: string }[];
};

export type PortfolioItem = typeof portfolio.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;

/** Item de portfólio com URL de imagem pronta para uso. */
export type PortfolioDTO = PortfolioItem & { url: string; imageKey: string };

export type HomeSection = typeof homeSections.$inferSelect;
export type PhotoStep = typeof photoSteps.$inferSelect;
/** Etapa de fotogravação com URL pronta para uso. */
export type PhotoStepDTO = PhotoStep & { url: string; imageKey: string };
export type Banner = typeof banners.$inferSelect;
/** Banner com URL de imagem pronta para uso (null quando não tem imagem). */
export type BannerMedia = { kind: "image" | "video"; key: string };
export type BannerMediaDTO = BannerMedia & { url: string };
export type BannerDTO = Banner & {
  url: string | null;
  imageKey: string | null;
  /** Todas as mídias do banner (imagem legada + galeria), com URLs prontas. */
  mediaList: BannerMediaDTO[];
};

export type Issuer = typeof issuer.$inferSelect;

// ============================================================
// Rafa Laser Studio (área privada em /rafa) — Beta
// Tabelas isoladas com prefixo studio_ ; nada do site público usa isso.
// ============================================================

// Usuários do Studio: proprietário (acesso total) e usuários beta convidados.
export const studioUsers = sqliteTable("studio_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // scrypt: "<salt-hex>:<hash-hex>"
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("beta"), // "owner" | "beta"
  // Créditos disponíveis. Proprietário é ilimitado (ignora o saldo).
  credits: integer("credits").notNull().default(20),
  creditsUsed: integer("credits_used").notNull().default(0),
  blocked: integer("blocked", { mode: "boolean" }).notNull().default(false),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Projetos de arte. Sempre filtrados por userId no servidor.
export const studioProjects = sqliteTable("studio_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  clientName: text("client_name"),
  product: text("product"),
  productModel: text("product_model"),
  productColor: text("product_color"),
  widthMm: integer("width_mm").notNull().default(290),
  heightMm: integer("height_mm").notNull().default(125),
  engravingType: text("engraving_type").notNull().default("frontal"), // frontal | lateral | 360
  notes: text("notes"),
  status: text("status").notNull().default("Em criação"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Imagens de um projeto: enviadas pelo usuário ou geradas pela IA.
export const studioImages = sqliteTable("studio_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  key: text("key").notNull(),
  kind: text("kind").notNull().default("upload"), // upload | generated | edited
  // Estilo de IA usado (quando kind = generated)
  styleSlug: text("style_slug"),
  styleName: text("style_name"),
  creditsUsed: integer("credits_used").notNull().default(0),
  sourceImageId: integer("source_image_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Estilos de IA com prompts editáveis (somente pelo proprietário).
export const studioStyles = sqliteTable("studio_styles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  credits: integer("credits").notNull().default(2),
  // Estilo que aceita várias imagens de referência (arte composta / 360)
  multiImage: integer("multi_image", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Histórico de consumo de créditos.
export const studioCreditLog = sqliteTable("studio_credit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"),
  styleSlug: text("style_slug"),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after"),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Feedbacks da versão beta.
export const studioFeedback = sqliteTable("studio_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  userName: text("user_name"),
  feature: text("feature"),
  problem: text("problem"),
  suggestion: text("suggestion"),
  imageKey: text("image_key"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Medidas rápidas (mm) cadastráveis pelo proprietário.
export const studioSizes = sqliteTable("studio_sizes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label"),
  widthMm: integer("width_mm").notNull(),
  heightMm: integer("height_mm").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Produtos do Studio (lista usada no formulário de projeto).
export const studioProducts = sqliteTable("studio_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  models: text("models"), // lista separada por vírgula
  sortOrder: integer("sort_order").notNull().default(0),
});

// Modelos de mockup 360 (estrutura pronta para a fase 2).
export const studioMockups = sqliteTable("studio_mockups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("copo"),
  imageKey: text("image_key"),
  finish: text("finish").notNull().default("prata"), // prata | preta | branca
  sortOrder: integer("sort_order").notNull().default(0),
});

export type StudioUser = typeof studioUsers.$inferSelect;
export type StudioProject = typeof studioProjects.$inferSelect;
export type StudioImage = typeof studioImages.$inferSelect;
export type StudioStyle = typeof studioStyles.$inferSelect;
export type StudioFeedback = typeof studioFeedback.$inferSelect;
export type StudioSize = typeof studioSizes.$inferSelect;
export type StudioProduct = typeof studioProducts.$inferSelect;
export type StudioMockup = typeof studioMockups.$inferSelect;
export type StudioCreditLogEntry = typeof studioCreditLog.$inferSelect;

/** Usuário do Studio sem o hash da senha — o que vai para o navegador. */
export type StudioUserDTO = Omit<StudioUser, "passwordHash"> & { projectCount?: number };
/** Imagem do Studio com URL assinada pronta para exibir. */
export type StudioImageDTO = StudioImage & { url: string };
/** Projeto com imagens e contagem. */
export type StudioProjectDTO = StudioProject & { images: StudioImageDTO[] };

// ============================================================
// Rafa Catalog AI — análise de catálogos de fornecedores (admin)
// ============================================================

// Catálogo enviado pelo administrador (PDF, imagem, XLSX ou CSV)
export const catalogFiles = sqliteTable("catalog_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  supplier: text("supplier").notNull().default("Não informado no catálogo."),
  fileKey: text("file_key").notNull(),
  mimeType: text("mime_type").notNull(),
  pages: integer("pages").notNull().default(0),
  // pendente | analisando | pronto | erro
  status: text("status").notNull().default("pendente"),
  error: text("error"),
  productCount: integer("product_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  analyzedAt: integer("analyzed_at", { mode: "timestamp" }),
});

// Produtos extraídos de um catálogo
export const catalogProducts = sqliteTable("catalog_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  catalogId: integer("catalog_id").notNull(),
  code: text("code"),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  // Valores monetários em centavos (BRL). null = não informado no catálogo.
  unitPrice: integer("unit_price"),
  boxQty: integer("box_qty"),
  boxPrice: integer("box_price"),
  features: text("features"),
  specs: text("specs"),
  dimensions: text("dimensions"),
  colors: text("colors"),
  material: text("material"),
  brand: text("brand"),
  sourcePage: integer("source_page"),
  // excelente | bom | pouco | nao — classificação de personalização
  personalizable: text("personalizable").notNull().default("pouco"),
  laserNote: text("laser_note"),
  score: integer("score").notNull().default(0),
  // comprar | testar | nao — recomendação final
  recommendation: text("recommendation").notNull().default("testar"),
  reason: text("reason"),
  // Preço de mercado consolidado (centavos), preenchido na validação de preço
  marketMin: integer("market_min"),
  marketAvg: integer("market_avg"),
  marketMax: integer("market_max"),
  marketCheckedAt: integer("market_checked_at", { mode: "timestamp" }),
  isTest: integer("is_test", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Preços de mercado registrados para um produto do catálogo
export const catalogMarketPrices = sqliteTable("catalog_market_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  store: text("store").notNull(),
  productName: text("product_name"),
  price: integer("price").notNull(),
  promoPrice: integer("promo_price"),
  availability: text("availability"),
  shipping: text("shipping"),
  url: text("url"),
  // exato | equivalente | diferente
  matchType: text("match_type").notNull().default("equivalente"),
  // manual | auto — como o preço entrou no sistema
  source: text("source").notNull().default("manual"),
  searchedAt: integer("searched_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Dados operacionais por fornecedor (estoque, frete, prazo)
export const catalogSuppliers = sqliteTable("catalog_suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  freightNote: text("freight_note"),
  // Centavos
  freightCost: integer("freight_cost"),
  leadTimeDays: integer("lead_time_days"),
  // Centavos
  minOrderValue: integer("min_order_value"),
  stockNote: text("stock_note"),
  contact: text("contact"),
  notes: text("notes"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Configuração de custos e margem (linha única, id = 1)
export const catalogSettings = sqliteTable("catalog_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Percentuais inteiros (ex.: 12 = 12%)
  freightPct: integer("freight_pct").notNull().default(12),
  taxPct: integer("tax_pct").notNull().default(8),
  otherPct: integer("other_pct").notNull().default(3),
  // Centavos por unidade
  packagingCost: integer("packaging_cost").notNull().default(150),
  marginPct: integer("margin_pct").notNull().default(60),
  markupPct: integer("markup_pct").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type CatalogFile = typeof catalogFiles.$inferSelect;
export type CatalogProduct = typeof catalogProducts.$inferSelect;
export type CatalogMarketPrice = typeof catalogMarketPrices.$inferSelect;
export type CatalogSettings = typeof catalogSettings.$inferSelect;
export type CatalogSupplier = typeof catalogSuppliers.$inferSelect;

/** Cálculos derivados de custo/margem de um produto do catálogo. */
export type CatalogMath = {
  realUnitCost: number | null;
  suggestedPrice: number | null;
  grossProfit: number | null;
  marginPct: number | null;
  investment: number | null;
  potentialRevenue: number | null;
  potentialProfit: number | null;
  maxBuyPrice: number | null;
  marketVerdict: "abaixo" | "negociar" | "acima" | null;
  highInvestmentAlert: boolean;
  /** Verdadeiro quando o mercado paga bem mais do que o custo real. */
  isOpportunity: boolean;
  /** Quantos % o preço de mercado está acima do custo real. */
  opportunityPct: number | null;
};

/** Produto do catálogo com cálculos e fontes de preço. */
export type CatalogProductDTO = CatalogProduct & {
  math: CatalogMath;
  sources: CatalogMarketPrice[];
};

// ============================================================
// CAÇADOR DE OFERTAS — pesquisa de promoções para revenda
// ============================================================

// Configuração do módulo (linha única, id = 1)
export const dealSettings = sqliteTable("deal_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // JSON: lojas/fontes habilitadas na pesquisa
  enabledSources: text("enabled_sources", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => ["Mercado Livre", "Shopee", "Amazon"]),
  // Limite de resultados por pesquisa (controla custo de IA)
  maxResults: integer("max_results").notNull().default(12),
  // Custos adicionais — centavos
  defaultShipping: integer("default_shipping").notNull().default(0),
  packagingCost: integer("packaging_cost").notNull().default(150),
  // Percentuais inteiros sobre o preço de compra
  taxPct: integer("tax_pct").notNull().default(0),
  otherPct: integer("other_pct").notNull().default(0),
  // Margens dos três cenários de revenda
  quickMarginPct: integer("quick_margin_pct").notNull().default(30),
  normalMarginPct: integer("normal_margin_pct").notNull().default(55),
  premiumMarginPct: integer("premium_margin_pct").notNull().default(70),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Cada caçada feita pelo admin (histórico)
export const dealSearches = sqliteTable("deal_searches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  query: text("query").notNull(),
  category: text("category"),
  // Centavos
  maxBuyPrice: integer("max_buy_price"),
  quantity: integer("quantity").notNull().default(1),
  minMarginPct: integer("min_margin_pct"),
  // Centavos
  minSalePrice: integer("min_sale_price"),
  minDiscountPct: integer("min_discount_pct"),
  // JSON: lojas pesquisadas
  sources: text("sources", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
  sortBy: text("sort_by").notNull().default("oportunidade"),
  resultCount: integer("result_count").notNull().default(0),
  note: text("note"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Ofertas encontradas em uma caçada
export const dealOffers = sqliteTable("deal_offers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  searchId: integer("search_id").notNull(),
  productName: text("product_name").notNull(),
  brand: text("brand"),
  store: text("store").notNull(),
  imageUrl: text("image_url"),
  url: text("url"),
  category: text("category"),
  // Todos os valores monetários em centavos
  previousPrice: integer("previous_price"),
  currentPrice: integer("current_price").notNull(),
  discountPct: integer("discount_pct"),
  shippingCost: integer("shipping_cost"),
  shippingNote: text("shipping_note"),
  totalCost: integer("total_cost"),
  marketAvg: integer("market_avg"),
  suggestedPrice: integer("suggested_price"),
  estProfit: integer("est_profit"),
  estMarginPct: integer("est_margin_pct"),
  availability: text("availability"),
  quantityAvailable: integer("quantity_available"),
  sellerRating: text("seller_rating"),
  score: integer("score").notNull().default(0),
  // 0 | 1 — sinalizadores da análise
  insufficientData: integer("insufficient_data").notNull().default(0),
  fakeDiscount: integer("fake_discount").notNull().default(0),
  // JSON: avisos da análise
  warnings: text("warnings", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
  analysis: text("analysis"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Monitoramentos: "avise quando achar X abaixo de R$ Y"
export const dealAlerts = sqliteTable("deal_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  query: text("query").notNull(),
  category: text("category"),
  // Centavos
  maxPrice: integer("max_price"),
  minDiscountPct: integer("min_discount_pct"),
  minMarginPct: integer("min_margin_pct"),
  active: integer("active").notNull().default(1),
  lastTriggeredAt: integer("last_triggered_at", { mode: "timestamp" }),
  lastOfferId: integer("last_offer_id"),
  hits: integer("hits").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type DealSettings = typeof dealSettings.$inferSelect;
export type DealSearch = typeof dealSearches.$inferSelect;
export type DealOffer = typeof dealOffers.$inferSelect;
export type DealAlert = typeof dealAlerts.$inferSelect;

/** Os três cenários de revenda calculados para uma oferta. */
export type DealScenario = {
  key: "rapida" | "normal" | "premium";
  label: string;
  price: number;
  profit: number;
  marginPct: number;
};

/** Oferta com os cálculos de revenda prontos para a tela. */
export type DealOfferDTO = DealOffer & {
  scenarios: DealScenario[];
  realCost: number | null;
};

// ---------------- Importador de Anúncios ----------------
// Copia um anúncio de uma página da internet (foto + textos + preço),
// guarda como rascunho para o admin revisar e aprovar, e então vira produto.

/** Foto baixada do anúncio e guardada no storage. */
export type ImportedImage = {
  /** Chave no storage (assinada na leitura). */
  key: string;
  /** URL original de onde a foto veio (referência). */
  source: string | null;
  /** O admin pode desmarcar fotos que não quer usar. */
  selected: boolean;
};

export const importedListings = sqliteTable("imported_listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  store: text("store"),
  // "revisao" = aguardando conferência do admin | "aprovado" | "erro"
  status: text("status").notNull().default("revisao"),
  name: text("name").notNull().default(""),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  category: text("category"),
  brand: text("brand"),
  // Centavos (BRL)
  price: integer("price"),
  originalPrice: integer("original_price"),
  specs: text("specs"),
  colorsText: text("colors_text"),
  // Dados do formato único dos conectores oficiais (Mercado Livre / Shopee)
  marketplace: text("marketplace"),
  itemId: text("item_id"),
  model: text("model"),
  variationsText: text("variations_text"),
  sourceStock: integer("source_stock"),
  seller: text("seller"),
  // Log [IMPORT]/[API]/[RESULT] da importação
  diagnostics: text("diagnostics"),
  // JSON: ImportedImage[]
  images: text("images", { mode: "json" })
    .$type<ImportedImage[]>()
    .notNull()
    .$defaultFn(() => []),
  coverIndex: integer("cover_index").notNull().default(0),
  // JSON: avisos da extração (dados que não foram encontrados na página)
  warnings: text("warnings", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
  error: text("error"),
  // Produto criado quando o admin aprova
  productId: integer("product_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type ImportedListing = typeof importedListings.$inferSelect;

/** Rascunho importado com as fotos já em URLs prontas para exibir. */
export type ImportedListingDTO = Omit<ImportedListing, "images"> & {
  images: (ImportedImage & { url: string })[];
};
