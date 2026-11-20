import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { ping } from "./routes/ping";
import { chatgptProducts } from "./routes/chatgpt-products";
import { products } from "./routes/products";
import { categories } from "./routes/categories";
import { orders } from "./routes/orders";
import { upload } from "./routes/upload";
import { admin } from "./routes/admin";
import { vectorize } from "./routes/vectorize";
import { portfolio } from "./routes/portfolio";
import { testimonials } from "./routes/testimonials";
import { banners } from "./routes/banners";
import { sections } from "./routes/sections";
import { photoSteps } from "./routes/photo-steps";
import { issuerRoutes } from "./routes/issuer";
import { studio } from "./routes/studio";
import { studioOwner } from "./routes/studio-owner";
import { catalog } from "./routes/catalog";
import { dealHunter } from "./routes/deal-hunter";
import { listingImport } from "./routes/listing-import";
import { personalizationProduction } from "./routes/personalization-production";

// API features are oRPC procedures, one file per feature in ./routes/,
// composed into this router — typed end-to-end via the clients.
export const router = {
  ping,
  products,
  categories,
  orders,
  upload,
  admin,
  vectorize,
  portfolio,
  testimonials,
  banners,
  sections,
  photoSteps,
  issuer: issuerRoutes,
  studio,
  studioOwner,
  catalog,
  dealHunter,
  listingImport,
  personalizations: personalizationProduction,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);
app.route("/api/chatgpt/products", chatgptProducts);

export default app;
