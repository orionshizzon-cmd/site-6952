import { useMemo, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  ConfirmRow,
  Empty,
  Header,
  IconButton,
  Loading,
  Overline,
  Screen,
  SearchBar,
} from "@/components/ui";
import { useAdminProducts, useDeleteProduct, usePatchProduct } from "@/queries/products";
import { useCategories } from "@/queries/categories";

export default function ProductsScreen() {
  const colors = useColors();
  const products = useAdminProducts();
  const categories = useCategories();
  const del = useDeleteProduct();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("__all__");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const list = products.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((p) => {
      const byCat = category === "__all__" || p.category === category;
      const byTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.shortDescription ?? "").toLowerCase().includes(term);
      return byCat && byTerm;
    });
  }, [list, search, category]);

  const catOptions = [
    { value: "__all__", label: `Todas (${list.length})` },
    ...(categories.data ?? []).map((c) => ({
      value: c.name,
      label: `${c.name} (${list.filter((p) => p.category === c.name).length})`,
    })),
  ];

  return (
    <Screen>
      <Header
        back
        title="Produtos"
        subtitle={`${list.length} no catálogo`}
        right={
          <IconButton
            icon="add"
            color={colors.gold}
            onPress={() => router.push("/produto/novo")}
          />
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar produto..." />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 12 }}
      >
        {catOptions.map((opt) => {
          const active = opt.value === category;
          return (
            <Button
              key={opt.value}
              label={opt.label}
              variant={active ? "primary" : "outline"}
              onPress={() => setCategory(opt.value)}
              style={{ paddingVertical: 8, paddingHorizontal: 14 }}
            />
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 46, gap: 12 }}>
        {products.isLoading ? (
          <Loading label="Carregando catálogo..." />
        ) : filtered.length === 0 ? (
          <Empty
            title="Nenhum produto aqui"
            text={
              list.length === 0
                ? "Toque no + para cadastrar o primeiro produto."
                : "Nenhum produto com esse filtro."
            }
          />
        ) : (
          filtered.map((p) => (
            <Card key={p.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Image
                  source={{ uri: p.image }}
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 14,
                    backgroundColor: colors.secondary,
                  }}
                  resizeMode="cover"
                />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    numberOfLines={2}
                    style={{ fontFamily: Fonts.semibold, fontSize: 14.5, color: colors.foreground }}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={{ fontFamily: Fonts.sans, fontSize: 11.5, color: colors.mutedForeground }}
                  >
                    {p.category}
                  </Text>
                  <Text style={{ fontFamily: Fonts.display, fontSize: 15, color: colors.goldDeep }}>
                    {money(p.price)}
                  </Text>
                </View>
                <View style={{ gap: 6 }}>
                  <IconButton
                    icon="create-outline"
                    onPress={() => router.push(`/produto/${p.id}`)}
                  />
                  <IconButton
                    icon="trash-outline"
                    color={colors.destructive}
                    onPress={() => setConfirmId(p.id)}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {p.featured ? <Badge label="Destaque" tone="gold" /> : null}
                <Badge label={p.active ? "Ativo" : "Inativo"} tone={p.active ? "success" : "danger"} />
                {!p.customizable ? <Badge label="Sem personalização" /> : null}
                <StockBadge product={p} />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: 10,
                }}
              >
                <QuickToggle product={p} field="active" />
                <QuickToggle product={p} field="featured" />
                <StockStepper product={p} />
              </View>

              {confirmId === p.id ? (
                <ConfirmRow
                  question={`Excluir "${p.name}"? Essa ação não pode ser desfeita.`}
                  confirmLabel="Excluir"
                  loading={del.isPending}
                  onCancel={() => setConfirmId(null)}
                  onConfirm={async () => {
                    await del.mutateAsync(p.id);
                    setConfirmId(null);
                  }}
                />
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function StockBadge({ product }: { product: Product }) {
  if (product.stock === null || product.stock === undefined) {
    return <Badge label="Sob encomenda" />;
  }
  if (product.stock === 0) return <Badge label="Esgotado" tone="danger" />;
  return (
    <Badge
      label={`${product.stock} em estoque`}
      tone={product.stock <= 3 ? "warning" : "success"}
    />
  );
}

/** Liga/desliga "ativo" e "destaque" direto na lista. */
function QuickToggle({ product, field }: { product: Product; field: "active" | "featured" }) {
  const colors = useColors();
  const patch = usePatchProduct();
  const on = Boolean(product[field]);
  const label = field === "active" ? (on ? "Visível" : "Oculto") : "Destaque";
  const icon: keyof typeof Ionicons.glyphMap =
    field === "active" ? (on ? "eye-outline" : "eye-off-outline") : on ? "star" : "star-outline";
  const tint = field === "active" ? (on ? colors.success : colors.mutedForeground) : on ? colors.gold : colors.mutedForeground;

  return (
    <Card
      onPress={() => patch.mutate({ id: product.id, [field]: !on })}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 11,
        borderRadius: 999,
        opacity: patch.isPending ? 0.5 : 1,
      }}
    >
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={{ fontFamily: Fonts.semibold, fontSize: 11.5, color: tint }}>{label}</Text>
    </Card>
  );
}

/** Ajuste rápido de estoque (só quando o produto controla estoque). */
function StockStepper({ product }: { product: Product }) {
  const colors = useColors();
  const patch = usePatchProduct();
  const stock = product.stock;
  if (stock === null || stock === undefined) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" }}>
      <IconButton
        icon="remove"
        size={28}
        onPress={() => patch.mutate({ id: product.id, stock: Math.max(0, stock - 1) })}
      />
      <Text
        style={{
          fontFamily: Fonts.display,
          fontSize: 13.5,
          minWidth: 24,
          textAlign: "center",
          color: colors.foreground,
        }}
      >
        {stock}
      </Text>
      <IconButton
        icon="add"
        size={28}
        onPress={() => patch.mutate({ id: product.id, stock: stock + 1 })}
      />
    </View>
  );
}
