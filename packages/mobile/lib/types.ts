import type { client } from "./api";

/** Tipos derivados do contrato da API do site — nada duplicado à mão. */
export type Product = Awaited<ReturnType<typeof client.products.listAll>>[number];
export type ProductInput = Parameters<typeof client.products.create>[0];
export type Category = Awaited<ReturnType<typeof client.categories.list>>[number];
export type Order = Awaited<ReturnType<typeof client.orders.list>>[number];
export type OrderItem = Order["items"][number];
export type OrderStatus = Parameters<typeof client.orders.updateStatus>[0]["status"];
export type Banner = Awaited<ReturnType<typeof client.banners.listAll>>[number];
export type HomeSection = Awaited<ReturnType<typeof client.sections.listAll>>[number];
export type PortfolioItem = Awaited<ReturnType<typeof client.portfolio.listAll>>[number];
export type PhotoStep = Awaited<ReturnType<typeof client.photoSteps.listAll>>[number];
export type Testimonial = Awaited<ReturnType<typeof client.testimonials.listAll>>[number];
export type ImportedListing = Awaited<ReturnType<typeof client.listingImport.list>>[number];

/** Fases do pedido, na mesma ordem do painel do site. */
export const ORDER_STATUSES = [
  "Rascunho",
  "Enviado",
  "Aguardando resposta",
  "Aprovado",
  "Recusado",
  "Aguardando entrada",
  "Em produção",
  "Finalizado",
  "Entregue",
  "Cancelado",
] as const;

/** Status que tiram o pedido do fluxo ativo e mandam para "Concluídos". */
export const CLOSED_STATUSES: string[] = ["Finalizado", "Entregue", "Cancelado"];
