import { db } from "./index";
import * as schema from "./schema";

const PRETO = { name: "Preto", hex: "#111111" };
const BRANCO = { name: "Branco", hex: "#F3F3F0" };
const PRATA = { name: "Prata", hex: "#C4C4C8" };
const INOX = { name: "Inox", hex: "#B8B8BC" };

// Categorias oficiais da Rafa Laser
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

// Produtos reais em destaque. image "" => placeholder "Foto em atualização".
const data: (typeof schema.products.$inferInsert)[] = [
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
    sortOrder: 3,
  },
];

async function seed() {
  const withMedia = data.map((p) => ({ ...p, media: [] }));
  await db.delete(schema.products);
  await db.insert(schema.products).values(withMedia);

  await db.delete(schema.categories);
  await db
    .insert(schema.categories)
    .values(CATEGORIES.map((name, i) => ({ name, sortOrder: i })));

  console.log(`Seed concluído: ${withMedia.length} produtos, ${CATEGORIES.length} categorias.`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
