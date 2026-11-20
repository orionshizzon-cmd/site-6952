import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Loader2,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Package,
  ClipboardList,
  Image as ImageIcon,
  Film,
  Star,
  Eye,
  EyeOff,
  Tags,
  Check,
  Download,
  Wand2,
  Boxes,
  Minus,
  AlertTriangle,
  Megaphone,
  Camera,
  CheckCircle2,
  Gift,
  MessageSquareQuote,
  FileText,
  Building2,
  Save,
  Sparkles,
  Bot,
  Target,
  Link2,
} from "lucide-react";
import type { ProductDTO, Order } from "../../api/database/schema";
import { UNCATEGORIZED } from "../../api/database/schema";
import { client, getAdminToken, setAdminToken } from "../lib/api";
import { useAdminProducts, useSaveProduct, useDeleteProduct, useUpdateStock } from "../queries/products";
import {
  useCategories,
  useCreateCategory,
  useRenameCategory,
  useDeleteCategory,
} from "../queries/categories";
import { useAdminOrders, useUpdateOrderStatus, useDeleteOrders } from "../queries/orders";
import { useVectorize } from "../queries/vectorize";
import { useIssuer, useSaveIssuer } from "../queries/issuer";
import { OrderReceiptModal } from "../components/order-receipt";
import { uploadFileReturnKey } from "../lib/upload";
import { formatBRL, parseToCents, centsToInput } from "../lib/money";
import {
  BannersTab,
  PortfolioTab,
  TestimonialsTab,
  SectionsTab,
  PhotoStepsTab,
} from "./admin-content";
import { CatalogAiTab } from "./admin-catalog";
import { ImportListingTab } from "./admin-import";
import { DealHunterTab } from "./admin-deal-hunter";
import { ENGRAVING_FONTS } from "../lib/constants";

// Link de download do arquivo TTF da fonte escolhida pelo cliente
function fontTtf(label: string): string | null {
  return ENGRAVING_FONTS.find((f) => f.label === label)?.ttf ?? null;
}
function orientationLabel(v: string): string {
  return v === "vertical" ? "Vertical" : "Horizontal";
}

const STATUSES = [
  "Aguardando resposta",
  "Aprovado",
  "Recusado",
  "Aguardando entrada",
  "Em produção",
  "Finalizado",
  "Entregue",
  "Cancelado",
] as const;

type Media = { type: "image" | "video"; url: string; key: string };
type ColorItem = { name: string; hex: string };

// ---------------- Guarda de autenticação ----------------
function AdminPage() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<"checking" | "ok">("checking");
  const [tab, setTab] = useState<
    | "produtos"
    | "pedidos"
    | "concluidos"
    | "banners"
    | "secoes"
    | "portfolio"
    | "fotogravacao"
    | "depoimentos"
    | "vetorizacao"
    | "emitente"
    | "catalogos"
  | "ofertas"
  | "importar"
  >("produtos");

  useEffect(() => {
    if (!getAdminToken()) {
      navigate("/admin/login");
      return;
    }
    client.admin
      .me()
      .then(() => setState("ok"))
      .catch(() => {
        setAdminToken(null);
        navigate("/admin/login");
      });
  }, [navigate]);

  if (state === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="overline text-gold">Administração</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Painel Rafa Laser</h1>
        </div>
        <button
          onClick={() => {
            setAdminToken(null);
            navigate("/admin/login");
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <a href="/admin/personalizacoes" className="inline-flex items-center gap-2 rounded-full border border-gold px-4 py-2 text-sm font-semibold text-gold">
          Central de personalizações
        </a>
        <button
          onClick={() => setTab("produtos")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "produtos" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <Package className="h-4 w-4" /> Produtos
        </button>
        <button
          onClick={() => setTab("pedidos")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "pedidos" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Pedidos
        </button>
        <button
          onClick={() => setTab("concluidos")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "concluidos" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" /> Concluídos
        </button>
        <button
          onClick={() => setTab("banners")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "banners" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <Megaphone className="h-4 w-4" /> Banners
        </button>
        <button
          onClick={() => setTab("secoes")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "secoes" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <Gift className="h-4 w-4" /> Seções
        </button>
        <button
          onClick={() => setTab("portfolio")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "portfolio" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <ImageIcon className="h-4 w-4" /> Peças reais
        </button>
        <button
          onClick={() => setTab("fotogravacao")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "fotogravacao" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <Camera className="h-4 w-4" /> Fotogravação
        </button>
        <button
          onClick={() => setTab("depoimentos")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "depoimentos" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <MessageSquareQuote className="h-4 w-4" /> Depoimentos
        </button>
        <button
          onClick={() => setTab("vetorizacao")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "vetorizacao" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <Wand2 className="h-4 w-4" /> Vetorização
        </button>
        <button
          onClick={() => setTab("emitente")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "emitente" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <Building2 className="h-4 w-4" /> Meus dados
        </button>
        <button
          onClick={() => setTab("catalogos")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "catalogos" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <Bot className="h-4 w-4" /> Analisar Catálogos
        </button>
        <button
          onClick={() => setTab("ofertas")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "ofertas" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <Target className="h-4 w-4" /> Caçador de Ofertas
        </button>
        <button
          onClick={() => setTab("importar")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "importar" ? "bg-foreground text-background" : "border border-border"
          }`}
        >
          <Link2 className="h-4 w-4" /> Importar Anúncio
        </button>
      </div>

      <div className="mt-8">
        {tab === "produtos" ? (
          <ProductsTab />
        ) : tab === "pedidos" ? (
          <OrdersTab />
        ) : tab === "concluidos" ? (
          <OrdersTab closed />
        ) : tab === "banners" ? (
          <BannersTab />
        ) : tab === "secoes" ? (
          <SectionsTab />
        ) : tab === "portfolio" ? (
          <PortfolioTab />
        ) : tab === "fotogravacao" ? (
          <PhotoStepsTab />
        ) : tab === "depoimentos" ? (
          <TestimonialsTab />
        ) : tab === "emitente" ? (
          <IssuerTab />
        ) : tab === "catalogos" ? (
          <CatalogAiTab />
        ) : tab === "ofertas" ? (
          <DealHunterTab />
        ) : tab === "importar" ? (
          <ImportListingTab />
        ) : (
          <VectorizeTab />
        )}
      </div>
    </div>
  );
}

// ---------------- Aba de produtos ----------------
function ProductsTab() {
  const products = useAdminProducts(true);
  const del = useDeleteProduct();
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const list = products.data ?? [];

  return (
    <div>
      <CategoriesPanel products={list} />

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">
          Produtos <span className="text-muted-foreground">({list.length})</span>
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>

      {products.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3"
            >
              <img src={p.image} alt={p.name} className="h-16 w-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{p.name}</h3>
                  {p.featured && <Star className="h-3.5 w-3.5 fill-gold text-gold" />}
                  {!p.active && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      inativo
                    </span>
                  )}
                  {!p.customizable && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      sem personalização
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{p.category}</p>
                <p className="mt-0.5 text-sm font-semibold text-gold-deep">{formatBRL(p.price)}</p>
                <StockControl product={p} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(p)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-gold"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir "${p.name}"?`)) del.mutate(p.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-destructive hover:text-destructive"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
              Nenhum produto ainda. Clique em "Novo produto".
            </p>
          )}
        </div>
      )}

      {(editing || creating) && (
        <ProductForm
          product={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

// ---------------- Gestão de categorias ----------------
function CategoriesPanel({ products }: { products: ProductDTO[] }) {
  const categories = useCategories();
  const createCat = useCreateCategory();
  const renameCat = useRenameCategory();
  const deleteCat = useDeleteCategory();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const list = categories.data ?? [];
  const countByCat = (name: string) => products.filter((p) => p.category === name).length;

  async function handleCreate() {
    setError(null);
    const name = newName.trim();
    if (!name) return;
    try {
      await createCat.mutateAsync(name);
      setNewName("");
    } catch {
      setError("Não foi possível criar. Talvez a categoria já exista.");
    }
  }

  async function handleRename(id: number) {
    const name = editValue.trim();
    if (!name) return setEditingId(null);
    try {
      await renameCat.mutateAsync({ id, name });
      setEditingId(null);
    } catch {
      setError("Não foi possível renomear. Verifique se o nome já existe.");
    }
  }

  async function handleDelete(id: number, name: string) {
    const n = countByCat(name);
    const msg =
      n > 0
        ? `Excluir "${name}"? ${n} produto(s) serão movidos para "${UNCATEGORIZED}".`
        : `Excluir a categoria "${name}"?`;
    if (confirm(msg)) await deleteCat.mutateAsync(id);
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <Tags className="h-5 w-5 text-gold" /> Categorias
          <span className="text-sm font-normal text-muted-foreground">({list.length})</span>
        </span>
        <span className="text-sm font-semibold text-gold-deep">
          {open ? "Ocultar" : "Gerenciar"}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          {/* Criar nova */}
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nova categoria (ex.: Chaveiros)"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <button
              onClick={handleCreate}
              disabled={createCat.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          {/* Lista */}
          <div className="mt-4 space-y-2">
            {list.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
              >
                {editingId === c.id ? (
                  <>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-gold"
                    />
                    <button
                      onClick={() => handleRename(c.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-green-600 hover:border-green-600"
                      aria-label="Salvar"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-destructive"
                      aria-label="Cancelar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {countByCat(c.name)} produto(s)
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditValue(c.name);
                        setError(null);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-gold"
                      aria-label="Renomear"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-destructive hover:text-destructive"
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
            {list.length === 0 && (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                Nenhuma categoria ainda. Crie a primeira acima.
              </p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Renomear atualiza todos os produtos da categoria. Excluir move os produtos para "
            {UNCATEGORIZED}".
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------- Formulário de produto ----------------
/** Selo + ajuste rápido de estoque na lista do admin. */
function StockControl({ product }: { product: ProductDTO }) {
  const updateStock = useUpdateStock();
  const stock = product.stock;

  if (stock === null || stock === undefined) {
    return (
      <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
        Sob encomenda (sem controle de estoque)
      </p>
    );
  }

  const tone =
    stock === 0
      ? "bg-destructive/10 text-destructive"
      : stock <= 3
        ? "bg-amber-500/15 text-amber-700"
        : "bg-whats/10 text-whats";

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}
      >
        {stock === 0 ? (
          <>
            <AlertTriangle className="h-3 w-3" /> Esgotado
          </>
        ) : (
          <>
            <Boxes className="h-3 w-3" /> {stock} em estoque
          </>
        )}
      </span>
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={updateStock.isPending || stock === 0}
          onClick={() => updateStock.mutate({ id: product.id, stock: Math.max(0, stock - 1) })}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-gold disabled:opacity-40"
          aria-label="Diminuir estoque"
        >
          <Minus className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={updateStock.isPending}
          onClick={() => updateStock.mutate({ id: product.id, stock: stock + 1 })}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-gold disabled:opacity-40"
          aria-label="Aumentar estoque"
        >
          <Plus className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}

function ProductForm({
  product,
  onClose,
}: {
  product: ProductDTO | null;
  onClose: () => void;
}) {
  const save = useSaveProduct();
  const categories = useCategories();
  const createCat = useCreateCategory();
  const catList = categories.data ?? [];
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [specs, setSpecs] = useState(product?.specs ?? "");
  const [priceInput, setPriceInput] = useState(centsToInput(product?.price));
  const [customizable, setCustomizable] = useState(product?.customizable ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [sortOrder, setSortOrder] = useState(product?.sortOrder ?? 0);
  const [imageKey, setImageKey] = useState(product?.imageKey ?? "");
  const [imagePreview, setImagePreview] = useState(product?.image ?? "");
  const [media, setMedia] = useState<Media[]>(product?.media ?? []);
  const [colors, setColors] = useState<ColorItem[]>(product?.colors ?? []);
  const [trackStock, setTrackStock] = useState(
    product?.stock !== null && product?.stock !== undefined,
  );
  const [stockInput, setStockInput] = useState(
    product?.stock !== null && product?.stock !== undefined ? String(product.stock) : "0",
  );
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Seleciona a primeira categoria por padrão em produtos novos
  useEffect(() => {
    if (!category && catList.length > 0) setCategory(catList[0].name);
  }, [catList, category]);

  async function handleAddCategory() {
    const clean = newCatName.trim();
    if (!clean) return;
    try {
      const created = await createCat.mutateAsync(clean);
      setCategory(created.name);
    } catch {
      // se já existe, apenas seleciona
      setCategory(clean);
    }
    setNewCatName("");
    setCreatingCat(false);
  }

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const { key, url } = await uploadFileReturnKey(file);
      setImageKey(key);
      setImagePreview(url);
    } catch {
      setError("Falha ao enviar a imagem de capa.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingMedia(true);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadFileReturnKey(f)));
      setMedia((prev) => [...prev, ...uploaded]);
    } catch {
      setError("Falha ao enviar mídia.");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError("Informe o nome do produto.");
    if (!shortDescription.trim()) return setError("Informe a descrição curta.");
    if (!description.trim()) return setError("Informe a descrição completa.");
    if (!imageKey) return setError("Envie uma imagem de capa.");

    try {
      await save.mutateAsync({
        ...(product ? { id: product.id } : {}),
        slug: product?.slug ?? name.trim(),
        name: name.trim(),
        category,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        specs: specs.trim() || null,
        price: parseToCents(priceInput),
        image: imageKey,
        media: media.map((m) => ({ type: m.type, key: m.key })),
        colors,
        stock: trackStock ? Math.max(0, Number(stockInput) || 0) : null,
        customizable,
        featured,
        active,
        sortOrder,
      });
      onClose();
    } catch {
      setError("Não foi possível salvar. Verifique os campos e tente novamente.");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-card sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-display text-lg font-bold">
            {product ? "Editar produto" : "Novo produto"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto p-6">
          {/* Capa */}
          <div>
            <label className="text-sm font-semibold">Imagem de capa *</label>
            <div className="mt-2 flex items-center gap-4">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Capa"
                  className="h-20 w-20 rounded-xl border border-border object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-input px-4 py-2.5 text-sm hover:border-gold">
                {uploadingCover ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {imagePreview ? "Trocar imagem" : "Enviar imagem"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCover}
                  disabled={uploadingCover}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Nome *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Categoria</label>
              {creatingCat ? (
                <div className="mt-1.5 flex gap-2">
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategory();
                      }
                      if (e.key === "Escape") setCreatingCat(false);
                    }}
                    placeholder="Nome da categoria"
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="flex h-[42px] w-10 items-center justify-center rounded-lg bg-foreground text-background"
                    aria-label="Criar categoria"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatingCat(false)}
                    className="flex h-[42px] w-10 items-center justify-center rounded-lg border border-border"
                    aria-label="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setCreatingCat(true);
                      return;
                    }
                    setCategory(e.target.value);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
                >
                  {catList.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {category && !catList.some((c) => c.name === category) && (
                    <option value={category}>{category}</option>
                  )}
                  <option value="__new__">➕ Criar nova categoria…</option>
                </select>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold">Preço (R$)</label>
              <input
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="Ex.: 79,90 (vazio = Sob consulta)"
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Ordem de exibição</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Estoque */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="text-sm font-semibold">Controle de estoque</label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ative para limitar as vendas às unidades disponíveis. Desativado, o produto fica
                  sempre disponível (sob encomenda).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrackStock((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                  trackStock ? "border-gold bg-accent text-gold-deep" : "border-border text-muted-foreground"
                }`}
              >
                <Boxes className="h-4 w-4" />
                {trackStock ? "Controlando estoque" : "Sem controle"}
              </button>
            </div>

            {trackStock && (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-sm font-semibold">Unidades em estoque</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setStockInput((v) => String(Math.max(0, (Number(v) || 0) - 1)))
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-input hover:border-gold"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={stockInput}
                      onChange={(e) => setStockInput(e.target.value)}
                      className="w-24 rounded-lg border border-input bg-background px-3 py-2.5 text-center text-sm outline-none focus:border-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setStockInput((v) => String(Math.max(0, (Number(v) || 0) + 1)))}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-input hover:border-gold"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="pb-2 text-xs text-muted-foreground">
                  {Number(stockInput) === 0
                    ? "Com 0 unidades o produto aparece como “Esgotado” e não pode ser comprado pelo site."
                    : `O site vai permitir vender no máximo ${Number(stockInput) || 0} unidade(s).`}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold">Descrição curta *</label>
            <input
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Descrição completa *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Características do produto</label>
            <textarea
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              rows={5}
              placeholder={"Material: aço inox 304\nCapacidade: 500 ml\nTampa: rosqueável com abridor\nGravação: laser permanente"}
              className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Uma característica por linha, no formato <strong>Nome: valor</strong>. As três
              primeiras aparecem no cartão da vitrine e todas na página do produto.
            </p>
          </div>

          {/* Cores */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Cores disponíveis</label>
              <button
                onClick={() => setColors((c) => [...c, { name: "", hex: "#111111" }])}
                className="inline-flex items-center gap-1 text-sm font-semibold text-gold-deep"
              >
                <Plus className="h-4 w-4" /> Adicionar cor
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) =>
                      setColors((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, hex: e.target.value } : x)),
                      )
                    }
                    className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
                  />
                  <input
                    value={c.name}
                    placeholder="Nome da cor (ex.: Preto)"
                    onChange={(e) =>
                      setColors((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                  <button
                    onClick={() => setColors((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Mídia (fotos e vídeos) */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Fotos e vídeos do produto</label>
              <label className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-gold-deep">
                {uploadingMedia ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Adicionar
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleMedia}
                  disabled={uploadingMedia}
                />
              </label>
            </div>
            {media.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {media.map((m, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
                    {m.type === "video" ? (
                      <video src={m.url} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-white">
                      {m.type === "video" ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                    </span>
                    <button
                      onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personalização */}
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Personalização (gravação a laser)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {customizable
                    ? "O cliente escolhe texto, fonte, orientação e pode enviar foto/logo."
                    : "Produto vendido sem gravação: o cliente só escolhe cor, quantidade e observações."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={customizable}
                aria-label="Ativar personalização"
                onClick={() => setCustomizable((c) => !c)}
                className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${
                  customizable ? "bg-gold" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    customizable ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold">
              <Sparkles className={`h-3.5 w-3.5 ${customizable ? "text-gold" : "text-muted-foreground"}`} />
              {customizable ? "Personalizável" : "Sem personalização"}
            </p>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFeatured((f) => !f)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                featured ? "border-gold bg-accent text-gold-deep" : "border-border"
              }`}
            >
              <Star className={`h-4 w-4 ${featured ? "fill-gold text-gold" : ""}`} /> Destaque
            </button>
            <button
              onClick={() => setActive((a) => !a)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                active ? "border-whats text-whats" : "border-border text-muted-foreground"
              }`}
            >
              {active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {active ? "Ativo (visível)" : "Inativo (oculto)"}
            </button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={save.isPending || uploadingCover || uploadingMedia}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          >
            {save.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Aba de pedidos ----------------
// Status que tiram o pedido do fluxo ativo e mandam para a aba "Concluídos".
const CLOSED_STATUSES: string[] = ["Finalizado", "Entregue", "Cancelado"];

function OrdersTab({ closed = false }: { closed?: boolean }) {
  const orders = useAdminOrders(true);
  const updateStatus = useUpdateOrderStatus();
  const removeOrders = useDeleteOrders();
  const issuer = useIssuer(true);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const all = orders.data ?? [];
  const list = all.filter((o) =>
    closed ? CLOSED_STATUSES.includes(o.status) : !CLOSED_STATUSES.includes(o.status),
  );

  const visibleIds = list.map((o) => o.id);
  const marked = selectedIds.filter((id) => visibleIds.includes(id));
  const allMarked = marked.length > 0 && marked.length === visibleIds.length;

  function toggle(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function deleteMarked() {
    if (marked.length === 0) return;
    const ok = confirm(
      marked.length === 1
        ? "Excluir este pedido da lista? Essa ação não pode ser desfeita."
        : `Excluir ${marked.length} pedidos da lista? Essa ação não pode ser desfeita.`,
    );
    if (!ok) return;
    await removeOrders.mutateAsync(marked);
    setSelectedIds([]);
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold">
        {closed ? "Pedidos concluídos" : "Pedidos em andamento"}{" "}
        <span className="text-muted-foreground">({list.length})</span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {closed
          ? "Finalizados, entregues e cancelados. Mudando o status de volta, o pedido volta para a aba “Pedidos”."
          : "Pedidos nas fases de atendimento e produção. Ao marcar como Finalizado, Entregue ou Cancelado, ele vai para a aba “Concluídos”."}
      </p>

      {list.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={allMarked}
              onChange={(e) => setSelectedIds(e.target.checked ? visibleIds : [])}
              className="h-4 w-4 accent-[var(--gold,#c9a227)]"
            />
            Selecionar todos
          </label>
          <span className="text-sm text-muted-foreground">
            {marked.length > 0 ? `${marked.length} selecionado(s)` : "Nenhum selecionado"}
          </span>
          <button
            onClick={deleteMarked}
            disabled={marked.length === 0 || removeOrders.isPending}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-destructive px-4 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {removeOrders.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Excluir selecionados
          </button>
        </div>
      )}

      {orders.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map((o) => (
            <div
              key={o.id}
              className={`rounded-2xl border bg-card p-4 transition-colors ${
                selectedIds.includes(o.id) ? "border-destructive/60" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(o.id)}
                    onChange={() => toggle(o.id)}
                    aria-label={`Selecionar pedido ${o.code}`}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--gold,#c9a227)]"
                  />
                  <div>
                  <p className="font-display font-bold">{o.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {o.customerName} · {o.customerPhone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString("pt-BR")}
                  </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-gold-deep">
                    {formatBRL(o.total)}
                  </p>
                  <select
                    value={o.status}
                    onChange={(e) =>
                      updateStatus.mutate({
                        id: o.id,
                        status: e.target.value as (typeof STATUSES)[number],
                      })
                    }
                    className="mt-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-gold"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
                {o.items.map((it, i) => {
                  const ttf = fontTtf(it.engravingFont);
                  return (
                    <div key={i} className="rounded-xl border border-border/70 bg-background/60 p-3">
                      <div className="flex justify-between gap-3 font-medium">
                        <span>
                          {it.quantity}× {it.productName}
                        </span>
                        <span className="shrink-0 text-gold-deep">{formatBRL(it.unitPrice)}</span>
                      </div>

                      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                        {it.color && (
                          <div className="flex gap-2">
                            <dt className="font-semibold text-foreground/70">Cor:</dt>
                            <dd>{it.color}</dd>
                          </div>
                        )}
                        {it.engravingText && (
                          <div className="flex gap-2">
                            <dt className="font-semibold text-foreground/70">Texto:</dt>
                            <dd className="italic">&ldquo;{it.engravingText}&rdquo;</dd>
                          </div>
                        )}
                        {it.engravingFont && (
                          <div className="flex gap-2">
                            <dt className="font-semibold text-foreground/70">Fonte:</dt>
                            <dd>
                              {it.engravingFont}
                              {ttf && (
                                <a
                                  href={ttf}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-2 inline-flex items-center gap-1 font-semibold text-gold-deep hover:underline"
                                >
                                  <Download className="h-3 w-3" /> .ttf
                                </a>
                              )}
                            </dd>
                          </div>
                        )}
                        {it.engravingOrientation && (
                          <div className="flex gap-2">
                            <dt className="font-semibold text-foreground/70">Sentido:</dt>
                            <dd>{orientationLabel(it.engravingOrientation)}</dd>
                          </div>
                        )}
                        {it.notes && (
                          <div className="flex gap-2 sm:col-span-2">
                            <dt className="font-semibold text-foreground/70">Obs. item:</dt>
                            <dd>{it.notes}</dd>
                          </div>
                        )}
                      </dl>

                      {(it.imageUrl || it.engravingVectorUrl) && (
                        <div className="mt-3 flex flex-wrap items-start gap-4">
                          {it.imageUrl && (
                            <div className="flex flex-col items-start gap-1">
                              <a href={it.imageUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={it.imageUrl}
                                  alt="Foto/logo do cliente"
                                  className="h-20 w-20 rounded-lg border border-border object-cover"
                                />
                              </a>
                              <a
                                href={it.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-gold-deep hover:underline"
                              >
                                <Download className="h-3 w-3" /> Foto/logo
                              </a>
                            </div>
                          )}
                          {it.engravingVectorUrl && (
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-white">
                                <img
                                  src={it.engravingVectorUrl}
                                  alt="Vetor da gravação"
                                  className="max-h-16 max-w-16"
                                />
                              </div>
                              <a
                                href={it.engravingVectorUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-gold-deep hover:underline"
                              >
                                <Download className="h-3 w-3" /> Vetor (SVG)
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {o.note && (
                <p className="mt-3 rounded-lg bg-background/60 p-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/70">Observações do pedido:</span>{" "}
                  {o.note}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                <button
                  onClick={() => setReceiptOrder(o)}
                  className="inline-flex items-center gap-2 rounded-full border border-gold px-4 py-2 text-xs font-bold text-gold-deep transition-colors hover:bg-gold hover:text-black"
                >
                  <FileText className="h-4 w-4" /> Gerar recibo / nota
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
              {closed ? "Nenhum pedido concluído ainda." : "Nenhum pedido em andamento."}
            </p>
          )}
        </div>
      )}

      {receiptOrder && (
        <OrderReceiptModal
          order={receiptOrder}
          issuer={issuer.data}
          loading={issuer.isLoading}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}

// ---------------- Aba: Meus dados (emitente do recibo) ----------------
const inputCls =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold";

function IssuerTab() {
  const issuer = useIssuer(true);
  const save = useSaveIssuer();
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    doc: "",
    address: "",
    phone: "",
    email: "",
    instagram: "",
    defaultDeadline: "",
    defaultTerms: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const d = issuer.data;
    if (!d) return;
    setForm({
      name: d.name ?? "",
      legalName: d.legalName ?? "",
      doc: d.doc ?? "",
      address: d.address ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
      instagram: d.instagram ?? "",
      defaultDeadline: d.defaultDeadline ?? "",
      defaultTerms: d.defaultTerms ?? "",
    });
  }, [issuer.data]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save.mutateAsync(form);
    setSaved(true);
  }

  const fields: { key: keyof typeof form; label: string; hint?: string }[] = [
    { key: "name", label: "Nome que aparece no recibo" },
    { key: "legalName", label: "Razão social / nome da empresa" },
    { key: "doc", label: "CNPJ ou CPF", hint: "Deixe vazio para não aparecer no recibo" },
    { key: "address", label: "Endereço completo" },
    { key: "phone", label: "Telefone / WhatsApp" },
    { key: "email", label: "E-mail" },
    { key: "instagram", label: "Instagram" },
  ];

  if (issuer.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Meus dados (emitente do recibo)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Esses dados aparecem no topo do recibo/pedido que você gera na aba Pedidos. É um documento
        próprio da loja — não substitui nota fiscal.
      </p>

      <form onSubmit={submit} className="mt-5 max-w-[720px] space-y-4">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm font-semibold">
            {f.label}
            <input
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              className={inputCls}
            />
            {f.hint && <span className="mt-1 block text-xs font-normal text-muted-foreground">{f.hint}</span>}
          </label>
        ))}
        <label className="block text-sm font-semibold">
          Prazo de entrega padrão
          <input
            value={form.defaultDeadline}
            onChange={(e) => set("defaultDeadline", e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-semibold">
          Observações / condições padrão
          <textarea
            value={form.defaultTerms}
            onChange={(e) => set("defaultTerms", e.target.value)}
            rows={3}
            className={inputCls}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar dados
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
              <Check className="h-4 w-4" /> Salvo
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------------- Aba: Vetorização (IA) ----------------
type VecMode = "compose" | "engrave";
type LocalImg = { id: string; file: File; preview: string };

function VectorizeTab() {
  const [mode, setMode] = useState<VecMode>("compose");
  const [imgs, setImgs] = useState<LocalImg[]>([]);
  const [phase, setPhase] = useState<"idle" | "uploading" | "generating">("idle");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vectorize = useVectorize();

  const busy = phase !== "idle";
  const maxImgs = mode === "engrave" ? 1 : 12;

  function addFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ id: `${f.name}-${Date.now()}-${Math.random()}`, file: f, preview: URL.createObjectURL(f) }));
    setImgs((prev) => {
      const merged = mode === "engrave" ? incoming.slice(-1) : [...prev, ...incoming];
      return merged.slice(0, maxImgs);
    });
    setResult(null);
    setError(null);
  }

  function removeImg(id: string) {
    setImgs((prev) => prev.filter((i) => i.id !== id));
  }

  function switchMode(m: VecMode) {
    setMode(m);
    setResult(null);
    setError(null);
    if (m === "engrave") setImgs((prev) => prev.slice(0, 1));
  }

  async function generate() {
    if (imgs.length === 0) return;
    setError(null);
    setResult(null);
    try {
      setPhase("uploading");
      const keys: string[] = [];
      for (const img of imgs) {
        const { key } = await uploadFileReturnKey(img.file);
        keys.push(key);
      }
      setPhase("generating");
      const res = await vectorize.mutateAsync({ mode, imageKeys: keys });
      setResult(res.url);
    } catch {
      setError("Não foi possível gerar a arte. Verifique as imagens e tente novamente.");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Vetorização de imagens</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Envie imagens e a IA gera a arte pronta para gravação, com fundo preto. Escolha o modo
        conforme o resultado desejado.
      </p>

      {/* Seleção de modo */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => switchMode("compose")}
          className={`rounded-2xl border p-4 text-left transition ${
            mode === "compose" ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"
          }`}
        >
          <p className="font-display font-bold">Arte combinada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Une várias imagens em uma arte artística e preenchida (290×125&nbsp;mm, fundo preto).
          </p>
        </button>
        <button
          onClick={() => switchMode("engrave")}
          className={`rounded-2xl border p-4 text-left transition ${
            mode === "engrave" ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"
          }`}
        >
          <p className="font-display font-bold">Gravura (engraving)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Transforma 1 foto em gravura hachurada em preto e branco, fundo preto, alta definição.
          </p>
        </button>
      </div>

      {/* Upload */}
      <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card px-4 py-10 text-center transition hover:border-gold">
        <Upload className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {mode === "engrave" ? "Selecionar 1 foto" : "Selecionar imagens"}
        </span>
        <span className="text-xs text-muted-foreground">
          {mode === "engrave"
            ? "A gravura usa uma única foto."
            : `Você pode enviar várias (até ${maxImgs}).`}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple={mode === "compose"}
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {/* Thumbnails */}
      {imgs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {imgs.map((img) => (
            <div key={img.id} className="relative">
              <img
                src={img.preview}
                alt=""
                className="h-24 w-24 rounded-lg border border-border object-cover"
              />
              {!busy && (
                <button
                  onClick={() => removeImg(img.id)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ação */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={generate}
          disabled={busy || imgs.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {phase === "uploading"
            ? "Enviando imagens…"
            : phase === "generating"
              ? "Gerando arte…"
              : "Gerar arte"}
        </button>
        {busy && (
          <span className="text-xs text-muted-foreground">
            Isso pode levar alguns segundos.
          </span>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Resultado */}
      {result && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold">Arte gerada</p>
            <a
              href={result}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Baixar arte
            </a>
          </div>
          <div className="mt-4 flex justify-center rounded-xl bg-black p-4">
            <img src={result} alt="Arte gerada pela IA" className="max-h-[420px] w-auto" />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
