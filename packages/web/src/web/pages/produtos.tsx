import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { PackageSearch } from "lucide-react";
import { useProducts } from "../queries/products";
import { useCategories } from "../queries/categories";
import { ProductCard } from "../components/product-card";
import { CustomizeModal } from "../components/customize-modal";
import { Seo } from "../components/seo";
import type { ProductDTO } from "../../api/database/schema";

function ProdutosPage() {
  const products = useProducts();
  const search = useSearch();
  const initialCat = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("categoria") ?? "Todos";
  }, [search]);

  const [category, setCategory] = useState<string>(initialCat);
  const [selected, setSelected] = useState<ProductDTO | null>(null);

  const list = products.data ?? [];
  const categories = useCategories();

  // Abas do catálogo: categorias gerenciadas que têm produtos + as que aparecem
  // nos produtos (inclui "Sem categoria"), na ordem definida pelo admin.
  const filterTabs = useMemo(() => {
    const withProducts = new Set(list.map((p) => p.category));
    const ordered = (categories.data ?? [])
      .map((c) => c.name)
      .filter((name) => withProducts.has(name));
    const extras = [...withProducts].filter((name) => !ordered.includes(name)).sort();
    return ["Todos", ...ordered, ...extras];
  }, [list, categories.data]);

  const filtered = category === "Todos" ? list : list.filter((p) => p.category === category);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12">
      <Seo
        title="Produtos Personalizados | Rafa Laser"
        description="Conheça garrafas, copos, canivetes, chaveiros e presentes personalizados pela Rafa Laser em Imperatriz-MA."
        path="/produtos"
      />
      <p className="overline text-gold">Catálogo</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold sm:text-5xl">Nossos produtos</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Escolha um produto, defina a cor e personalize a gravação. Adicione ao carrinho de
        orçamento e finalize pelo WhatsApp.
      </p>

      {/* Filtros */}
      <div className="mt-8 flex flex-wrap gap-2">
        {filterTabs.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              category === cat
                ? "border-gold bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grade */}
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[380px] animate-pulse rounded-2xl bg-secondary" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
            <PackageSearch className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum produto nesta categoria por enquanto.</p>
          </div>
        ) : (
          filtered.map((p) => <ProductCard key={p.id} product={p} onCustomize={setSelected} />)
        )}
      </div>

      {selected && <CustomizeModal product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default ProdutosPage;
