import { inArray } from "drizzle-orm";
import { db } from "./index";
import * as schema from "./schema";

// Migração pontual: substitui o catálogo de demonstração pelo catálogo real
// da Rafa Laser, preservando pedidos existentes (que guardam snapshot dos itens).

const PRETO = { name: "Preto", hex: "#111111" };
const BRANCO = { name: "Branco", hex: "#F3F3F0" };
const PRATA = { name: "Prata", hex: "#C4C4C8" };
const INOX = { name: "Inox", hex: "#B8B8BC" };

// Categorias oficiais definidas pela Rafa Laser
const CATEGORIES = [
  "Garrafas térmicas",
  "Copos personalizados",
  "Canivetes personalizados",
  "Chaveiros com fotogravação",
  "Canetas personalizadas",
  "Pingentes e cordões",
  "Kits para presente",
  "Gravação em produto do cliente",
];

// Produtos de demonstração a remover (slugs do seed antigo)
const DEMO_SLUGS = [
  "garrafa-termica",
  "copo-termico",
  "caneta-metalica",
  "placa-comemorativa",
  "alianca-tungstenio",
  "anel-personalizado",
  "pet-tag",
  "dog-tag-militar",
  "porta-retrato",
  "estojo-presente",
  "isqueiro-metalico",
  "relogio-madeira",
];

// Produtos reais em destaque. image "" => placeholder "Foto em atualização".
const REAL_PRODUCTS: (typeof schema.products.$inferInsert)[] = [
  {
    slug: "garrafa-termica-800ml",
    name: "Garrafa térmica personalizada 800 ml",
    category: "Garrafas térmicas",
    shortDescription: "Garrafa térmica de 800 ml com personalização a laser inclusa.",
    description:
      "Garrafa térmica de 800 ml com personalização a laser inclusa. Personalize com nome, frase ou logotipo.",
    price: 6000,
    image: "/images/prod-copos.png",
    colors: [PRETO, BRANCO],
    featured: true,
    active: true,
    sortOrder: 1,
  },
  {
    slug: "garrafa-termica-600ml",
    name: "Garrafa térmica personalizada 600 ml",
    category: "Garrafas térmicas",
    shortDescription: "Garrafa térmica de 600 ml com personalização a laser inclusa.",
    description:
      "Garrafa térmica de 600 ml com personalização a laser inclusa. Ideal para academia, trabalho e presente.",
    price: 6000,
    image: "/images/prod-copos.png",
    colors: [PRETO, BRANCO],
    featured: true,
    active: true,
    sortOrder: 2,
  },
  {
    slug: "chaveiro-fotogravacao",
    name: "Chaveiro com fotogravação",
    category: "Chaveiros com fotogravação",
    shortDescription: "Chaveiro em aço com fotografia gravada a laser.",
    description:
      "Chaveiro em aço com fotografia gravada a laser. Um presente personalizado, resistente e cheio de significado.",
    price: 3500,
    image: "",
    colors: [INOX, PRETO, PRATA],
    featured: true,
    active: true,
    sortOrder: 3,
  },
];

async function run() {
  // 1. Remove produtos de demonstração + qualquer chaveiro antigo com erro de grafia
  await db.delete(schema.products).where(
    inArray(schema.products.slug, [
      ...DEMO_SLUGS,
      "chaveiro-com-fotogravaao",
      "chaveiro-com-fotogravacao",
    ]),
  );

  // 2. Insere/atualiza produtos reais (upsert por slug)
  for (const p of REAL_PRODUCTS) {
    await db
      .insert(schema.products)
      .values({ ...p, media: [] })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: {
          name: p.name,
          category: p.category,
          shortDescription: p.shortDescription,
          description: p.description,
          price: p.price,
          image: p.image,
          colors: p.colors,
          featured: p.featured,
          active: p.active,
          sortOrder: p.sortOrder,
        },
      });
  }

  // 3. Redefine categorias oficiais
  await db.delete(schema.categories);
  await db
    .insert(schema.categories)
    .values(CATEGORIES.map((name, i) => ({ name, sortOrder: i })));

  const total = await db.select().from(schema.products);
  console.log(
    `Catálogo migrado: ${total.length} produtos ativos, ${CATEGORIES.length} categorias.`,
  );
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
