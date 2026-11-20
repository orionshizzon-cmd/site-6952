export type CartItem = {
  key: string; // identificador único da configuração
  productId: number;
  slug: string;
  name: string;
  category: string;
  image: string;
  color: string;
  engravingText: string;
  engravingFont: string;
  engravingOrientation: "horizontal" | "vertical";
  unitPrice?: number | null; // preço unitário em centavos
  engravingVectorUrl?: string | null; // SVG vetorizado do nome na fonte escolhida
  imageUrl?: string | null; // foto/logo enviada pelo cliente
  imageName?: string | null;
  quantity: number;
  notes?: string;
};
