import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "../types/cart";

const STORAGE_KEY = "rafa-laser-cart";

type CartContextValue = {
  items: CartItem[];
  count: number;
  addItem: (item: CartItem) => void;
  updateItem: (key: string, patch: Partial<CartItem>) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function load(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      addItem: (item) => setItems((prev) => [...prev, item]),
      updateItem: (key, patch) =>
        setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i))),
      removeItem: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
      clear: () => setItems([]),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider");
  return ctx;
}
