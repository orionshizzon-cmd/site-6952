import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { centsToInput, errorMessage, inputToCents } from "@/lib/format";
import type { UploadedFile } from "@/lib/media";
import type { Product } from "@/lib/types";
import { PickButtons, Thumb } from "@/components/media-picker";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Header,
  Loading,
  Overline,
  Screen,
  SectionTitle,
  SwitchRow,
} from "@/components/ui";
import { useAdminProducts, useSaveProduct } from "@/queries/products";
import { useCategories, useCreateCategory } from "@/queries/categories";

type MediaItem = { type: "image" | "video"; key: string; url: string };
type ColorItem = { name: string; hex: string };

const SWATCHES = [
  "#111111",
  "#FFFFFF",
  "#C0C0C0",
  "#C9A24B",
  "#B87333",
  "#8B5A2B",
  "#1E3A8A",
  "#B4242A",
  "#166534",
  "#7C3AED",
  "#EC4899",
  "#F59E0B",
];

export default function ProductFormScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === "novo";
  const products = useAdminProducts();
  const product = useMemo(
    () => (isNew ? null : (products.data ?? []).find((p) => String(p.id) === params.id) ?? null),
    [products.data, params.id, isNew],
  );

  if (!isNew && products.isLoading && !product) {
    return (
      <Screen>
        <Header back title="Editar produto" />
        <Loading label="Carregando produto..." />
      </Screen>
    );
  }

  if (!isNew && !product) {
    return (
      <Screen>
        <Header back title="Editar produto" />
        <View style={{ padding: 20 }}>
          <ErrorNote message="Produto não encontrado." />
        </View>
      </Screen>
    );
  }

  return <Form key={product?.id ?? "novo"} product={product} />;
}

function Form({ product }: { product: Product | null }) {
  const colors = useColors();
  const save = useSaveProduct();
  const categories = useCategories();
  const createCat = useCreateCategory();
  const catList = categories.data ?? [];

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [newCatName, setNewCatName] = useState("");
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [specs, setSpecs] = useState(product?.specs ?? "");
  const [priceInput, setPriceInput] = useState(centsToInput(product?.price));
  const [customizable, setCustomizable] = useState(product?.customizable ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [sortOrder, setSortOrder] = useState(String(product?.sortOrder ?? 0));
  const [imageKey, setImageKey] = useState(product?.imageKey ?? "");
  const [imagePreview, setImagePreview] = useState(product?.image ?? "");
  const [media, setMedia] = useState<MediaItem[]>(
    (product?.media ?? []).map((m) => ({ type: m.type, key: m.key, url: m.url })),
  );
  const [colorList, setColorList] = useState<ColorItem[]>(
    (product?.colors ?? []).map((c) => ({ name: c.name, hex: c.hex })),
  );
  const [trackStock, setTrackStock] = useState(product?.stock !== null && product?.stock !== undefined);
  const [stockInput, setStockInput] = useState(
    product?.stock !== null && product?.stock !== undefined ? String(product.stock) : "0",
  );
  const [error, setError] = useState<string | null>(null);

  const effectiveCategory = category || catList[0]?.name || "";

  async function addCategory() {
    const clean = newCatName.trim();
    if (!clean) return;
    try {
      const created = await createCat.mutateAsync(clean);
      setCategory(created.name);
    } catch {
      setCategory(clean);
    }
    setNewCatName("");
  }

  function onCover(files: UploadedFile[]) {
    const first = files.find((f) => f.kind === "image") ?? files[0];
    if (!first) return;
    setImageKey(first.key);
    setImagePreview(first.url);
  }

  function onMedia(files: UploadedFile[]) {
    setMedia((prev) => [...prev, ...files.map((f) => ({ type: f.kind, key: f.key, url: f.url }))]);
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError("Informe o nome do produto.");
    if (!effectiveCategory) return setError("Escolha ou crie uma categoria.");
    if (!shortDescription.trim()) return setError("Informe a descrição curta.");
    if (!description.trim()) return setError("Informe a descrição completa.");
    if (!imageKey) return setError("Envie uma imagem de capa.");

    try {
      await save.mutateAsync({
        ...(product ? { id: product.id } : {}),
        slug: product?.slug ?? name.trim(),
        name: name.trim(),
        category: effectiveCategory,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        specs: specs.trim() || null,
        price: inputToCents(priceInput),
        image: imageKey,
        media: media.map((m) => ({ type: m.type, key: m.key })),
        colors: colorList.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex })),
        stock: trackStock ? Math.max(0, Number(stockInput) || 0) : null,
        customizable,
        featured,
        active,
        sortOrder: Number(sortOrder) || 0,
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e, "Não foi possível salvar. Confira os campos."));
    }
  }

  return (
    <Screen>
      <Header
        back
        title={product ? "Editar produto" : "Novo produto"}
        subtitle={product ? product.name : "Cadastro completo"}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Capa */}
        <Card style={{ gap: 12 }}>
          <Overline>Imagem de capa *</Overline>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {imagePreview ? (
              <Thumb url={imagePreview} size={82} />
            ) : (
              <View
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="image-outline" size={24} color={colors.mutedForeground} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <PickButtons
                onUploaded={onCover}
                label={imagePreview ? "Trocar" : "Galeria"}
              />
            </View>
          </View>
        </Card>

        <Field label="Nome" value={name} onChangeText={setName} required placeholder="Ex.: Copo térmico 500 ml" />

        {/* Categoria */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: Fonts.semibold, fontSize: 12.5, color: colors.foreground }}>
            Categoria <Text style={{ color: colors.gold }}>*</Text>
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {catList.map((c) => {
              const on = c.name === effectiveCategory;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(c.name)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: on ? colors.foreground : colors.border,
                    backgroundColor: on ? colors.foreground : "transparent",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.semibold,
                      fontSize: 12.5,
                      color: on ? colors.background : colors.mutedForeground,
                    }}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Criar nova categoria"
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="Ex.: Chaveiros"
              />
            </View>
            <Button
              label="Criar"
              icon="add"
              variant="outline"
              loading={createCat.isPending}
              onPress={addCategory}
              style={{ paddingVertical: 12 }}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1.4 }}>
            <Field
              label="Preço (R$)"
              value={priceInput}
              onChangeText={setPriceInput}
              placeholder="79,90"
              keyboardType="decimal-pad"
              help="Vazio = Sob consulta"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Ordem"
              value={sortOrder}
              onChangeText={setSortOrder}
              keyboardType="numeric"
              help="Menor aparece antes"
            />
          </View>
        </View>

        {/* Estoque */}
        <Card style={{ gap: 4 }}>
          <SwitchRow
            label="Controlar estoque"
            help={
              trackStock
                ? "O site vende só as unidades disponíveis."
                : "Produto sempre disponível (sob encomenda)."
            }
            value={trackStock}
            onValueChange={setTrackStock}
          />
          {trackStock ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12 }}>
              <Button
                label="-"
                variant="outline"
                onPress={() => setStockInput(String(Math.max(0, (Number(stockInput) || 0) - 1)))}
                style={{ width: 52, paddingVertical: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Field
                  label="Unidades"
                  value={stockInput}
                  onChangeText={setStockInput}
                  keyboardType="numeric"
                />
              </View>
              <Button
                label="+"
                variant="outline"
                onPress={() => setStockInput(String(Math.max(0, (Number(stockInput) || 0) + 1)))}
                style={{ width: 52, paddingVertical: 10 }}
              />
            </View>
          ) : null}
        </Card>

        <Field
          label="Descrição curta"
          value={shortDescription}
          onChangeText={setShortDescription}
          required
          placeholder="Frase que aparece no cartão da vitrine"
        />
        <Field
          label="Descrição completa"
          value={description}
          onChangeText={setDescription}
          required
          multiline
          lines={5}
        />
        <Field
          label="Características do produto"
          value={specs}
          onChangeText={setSpecs}
          multiline
          lines={6}
          placeholder={"Material: aço inox 304\nCapacidade: 500 ml\nGravação: laser permanente"}
          help="Uma por linha, no formato Nome: valor."
        />

        {/* Cores */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <SectionTitle>Cores disponíveis</SectionTitle>
            <Button
              label="Adicionar"
              icon="add"
              variant="ghost"
              onPress={() => setColorList((prev) => [...prev, { name: "", hex: "#111111" }])}
              style={{ marginLeft: "auto", paddingVertical: 6, paddingHorizontal: 8 }}
            />
          </View>
          {colorList.map((c, i) => (
            <Card key={`color-${i}`} style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={`Cor ${i + 1}`}
                    value={c.name}
                    onChangeText={(v) =>
                      setColorList((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: v } : x)))
                    }
                    placeholder="Ex.: Preto"
                  />
                </View>
                <Button
                  label="Remover"
                  variant="danger"
                  onPress={() => setColorList((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{ paddingVertical: 11, paddingHorizontal: 12 }}
                />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SWATCHES.map((hex) => (
                  <Pressable
                    key={hex}
                    onPress={() =>
                      setColorList((prev) => prev.map((x, idx) => (idx === i ? { ...x, hex } : x)))
                    }
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: hex,
                      borderWidth: c.hex.toLowerCase() === hex.toLowerCase() ? 3 : 1,
                      borderColor:
                        c.hex.toLowerCase() === hex.toLowerCase() ? colors.gold : colors.border,
                    }}
                  />
                ))}
              </View>
              <Field
                label="Código da cor"
                value={c.hex}
                onChangeText={(v) =>
                  setColorList((prev) => prev.map((x, idx) => (idx === i ? { ...x, hex: v } : x)))
                }
                autoCapitalize="none"
                placeholder="#111111"
              />
            </Card>
          ))}
        </View>

        {/* Fotos e vídeos extras */}
        <View style={{ gap: 10 }}>
          <SectionTitle>Fotos e vídeos do produto</SectionTitle>
          <PickButtons onUploaded={onMedia} multiple videos label="Galeria" />
          {media.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 4 }}>
              {media.map((m, i) => (
                <Thumb
                  key={`${m.key}-${i}`}
                  url={m.url}
                  kind={m.type}
                  onRemove={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Flags */}
        <Card>
          <SwitchRow
            label="Personalização (gravação a laser)"
            help={
              customizable
                ? "O cliente escolhe texto, fonte e pode enviar foto/logo."
                : "Vendido sem gravação: só cor, quantidade e observações."
            }
            value={customizable}
            onValueChange={setCustomizable}
          />
          <SwitchRow
            label="Destaque na home"
            value={featured}
            onValueChange={setFeatured}
          />
          <SwitchRow
            label="Ativo (visível no site)"
            value={active}
            onValueChange={setActive}
          />
        </Card>

        <ErrorNote message={error} />

        <View style={{ flexDirection: "row", gap: 10, paddingTop: 4 }}>
          <Button
            label="Cancelar"
            variant="outline"
            onPress={() => router.back()}
            style={{ flex: 1 }}
          />
          <Button
            label="Salvar"
            variant="gold"
            icon="checkmark"
            loading={save.isPending}
            onPress={handleSave}
            style={{ flex: 1.3 }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
