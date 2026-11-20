import { createGateway } from "ai";

// AI Gateway self-hospedado (protocolo v3). Usado para geração de imagens.
export const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});
