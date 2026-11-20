import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { centsToInput, dateTime, errorMessage, inputToCents, money } from "@/lib/format";
import type { ImportedListing } from "@/lib/types";
import { PickButtons } from "@/components/media-picker";
import {
  Badge,
  Button,
  Card,
  Chips,
  ConfirmRow,
  Empty,
  ErrorNote,
  Field,
  Header,
  Loading,
  Overline,
  Screen,
  SectionTitle,
  SuccessNote,
  SwitchRow,
  useFlash,
} from "@/components/ui";
import { useCategories } from "@/queries/categories";
import {
  useAddListingImage,
  useApproveListing,
  useImportListingUrl,
  useImportedListings,
  useRemoveListing,
  useRemoveListingImage,
  useRewriteListing,
  useUpdateListingDraft,
} from "@/queries/listing-import";

const STATUS: Record<string, { label: string; tone: "gold" | "success" | "danger" }> = {
  revisao: { label: "Conferir", tone: "gold" },
  aprovado: { label: "Aprovado", tone: "success" },
  erro: { label: "Falhou", tone: "danger" },
};

export default function ImportScreen() {
  const colors = useColors();
  const listings = useImportedListings();
  const importUrl = useImportListingUrl();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [showApproved, setShowApproved] = useState(false);
  const [flash, setFlash] = useFlash();

  const rows = listings.data ?? [];
  const pending = rows.filter((r) => r.status !== "aprovado");
  const done = rows.filter((r) => r.status === "aprovado");

  async function paste() {
    setError(null);
    try {
      const text = (await Clipboard.getStringAsync()).trim();
      if (!text) {
        setError("A área de transferência está vazia. Copie o link do anúncio primeiro.");
        return;
      }
      // O app do Mercado Livre/Shopee costuma copiar "texto + link" — pega só o link.
      const found = text.match(/https?:\/\/\S+/i);
      setUrl(found ? found[0] : text);
    } catch {
      setError("Não foi possível ler a área de transferência. Cole o link no campo.");
    }
  }

  async function runImport(value: string) {
    const link = value.trim().match(/https?:\/\/\S+/i)?.[0] ?? value.trim();
    setError(null);
    if (!/^https?:\/\//i.test(link)) {
      setError("Cole o link completo do anúncio, começando com https://");
      return;
    }
    try {
      const res = await importUrl.mutateAsync(link);
      setOpenId(res.listing.id);
      if (!res.ok) {
        setError(res.error ?? "Não foi possível copiar este anúncio.");
      } else {
        setUrl("");
        setFlash("Anúncio copiado. Confira os dados abaixo e aprove.");
      }
    } catch (e) {
      setError(errorMessage(e, "Falha ao copiar o anúncio."));
    }
  }

  return (
    <Screen>
      <Header
        back
        title="Importar anúncio"
        subtitle={
          pending.length ? `${pending.length} para conferir` : "Mercado Livre, Shopee e outros"
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="link" size={18} color={colors.gold} />
            <Text style={{ fontFamily: Fonts.display, fontSize: 16, color: colors.foreground }}>
              Copiar anúncio da internet
            </Text>
          </View>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 12.5, color: colors.mutedForeground }}>
            Cole o link de um anúncio (Mercado Livre, Shopee, Amazon, fornecedor...). A IA copia
            fotos, nome, descrição, ficha técnica e preço. Você confere e aprova — só então o
            produto entra no catálogo.
          </Text>
          <Field
            label="Link do anúncio"
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            autoCapitalize="none"
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              label="Colar"
              icon="clipboard-outline"
              variant="outline"
              onPress={paste}
              disabled={importUrl.isPending}
              style={{ flex: 1 }}
            />
            <Button
              label={importUrl.isPending ? "Copiando..." : "Copiar anúncio"}
              icon="download-outline"
              variant="gold"
              loading={importUrl.isPending}
              onPress={() => runImport(url)}
              style={{ flex: 1.6 }}
            />
          </View>
          {importUrl.isPending ? (
            <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: colors.mutedForeground }}>
              Lendo a página e baixando as fotos… leva de 10 a 40 segundos. Não feche esta tela.
            </Text>
          ) : null}
          <ErrorNote message={error} />
        </Card>

        <SuccessNote message={flash} />

        {listings.isLoading ? (
          <Loading label="Carregando rascunhos..." />
        ) : listings.isError ? (
          <ErrorNote message={errorMessage(listings.error, "Não foi possível carregar os rascunhos.")} />
        ) : pending.length === 0 ? (
          <Empty
            icon="link-outline"
            title="Nada para conferir"
            text="Cole o link de um anúncio acima para começar."
          />
        ) : (
          <>
            <Overline>Conferir e aprovar ({pending.length})</Overline>
            {pending.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                open={openId === l.id}
                onToggle={() => setOpenId(openId === l.id ? null : l.id)}
                onRetry={() => runImport(l.url)}
                retrying={importUrl.isPending}
                onMessage={setFlash}
              />
            ))}
          </>
        )}

        {done.length ? (
          <>
            <Button
              label={`${showApproved ? "Esconder" : "Ver"} aprovados (${done.length})`}
              icon="checkmark-done-outline"
              variant="outline"
              onPress={() => setShowApproved((v) => !v)}
            />
            {showApproved
              ? done.map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    open={openId === l.id}
                    onToggle={() => setOpenId(openId === l.id ? null : l.id)}
                    onMessage={setFlash}
                  />
                ))
              : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// ---------------- Card do rascunho (resumo + conferência expandida) ----------------
function ListingCard({
  listing,
  open,
  onToggle,
  onRetry,
  retrying,
  onMessage,
}: {
  listing: ImportedListing;
  open: boolean;
  onToggle: () => void;
  onRetry?: () => void;
  retrying?: boolean;
  onMessage: (msg: string) => void;
}) {
  const colors = useColors();
  const remove = useRemoveListing();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = STATUS[listing.status] ?? { label: listing.status, tone: "gold" as const };
  const cover = listing.images[listing.coverIndex] ?? listing.images[0];

  return (
    <Card style={{ gap: 12, borderColor: open ? colors.gold : colors.border }}>
      <Pressable onPress={onToggle} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        {cover ? (
          <Image
            source={{ uri: cover.url }}
            style={{ width: 62, height: 62, borderRadius: 12, backgroundColor: colors.secondary }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 12,
              backgroundColor: colors.secondary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={listing.status === "erro" ? "alert-circle-outline" : "image-outline"}
              size={22}
              color={listing.status === "erro" ? colors.destructive : colors.mutedForeground}
            />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{ fontFamily: Fonts.semibold, fontSize: 14.5, color: colors.foreground }}
            numberOfLines={2}
          >
            {listing.name || (listing.status === "erro" ? "Não foi possível copiar" : "Sem nome")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Badge label={status.label} tone={status.tone} />
            {listing.store ? <Badge label={listing.store} /> : null}
            {listing.price != null ? <Badge label={money(listing.price)} /> : null}
          </View>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: colors.mutedForeground }}>
            {dateTime(listing.createdAt)}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>

      {open ? (
        <>
          {listing.error ? <ErrorNote message={listing.error} /> : null}
          {listing.warnings.length ? (
            <View
              style={{
                gap: 4,
                padding: 10,
                borderRadius: 10,
                backgroundColor: colors.secondary,
              }}
            >
              {listing.warnings.map((w, i) => (
                <Text
                  key={i}
                  style={{ fontFamily: Fonts.sans, fontSize: 12, color: colors.warning }}
                >
                  ⚠ {w}
                </Text>
              ))}
            </View>
          ) : null}

          <Button
            label="Abrir anúncio original"
            icon="open-outline"
            variant="ghost"
            onPress={() => Linking.openURL(listing.url)}
            style={{ paddingVertical: 6 }}
          />

          {listing.status === "erro" ? (
            onRetry ? (
              <Button
                label="Tentar copiar de novo"
                icon="refresh"
                variant="outline"
                loading={retrying}
                onPress={onRetry}
              />
            ) : null
          ) : (
            <ReviewForm listing={listing} onMessage={onMessage} />
          )}

          <ErrorNote message={error} />
          {listing.status !== "aprovado" ? (
            confirm ? (
              <ConfirmRow
                question="Descartar este rascunho?"
                confirmLabel="Descartar"
                loading={remove.isPending}
                onCancel={() => setConfirm(false)}
                onConfirm={async () => {
                  try {
                    await remove.mutateAsync(listing.id);
                    onMessage("Rascunho descartado.");
                  } catch (e) {
                    setError(errorMessage(e, "Não foi possível descartar."));
                  }
                  setConfirm(false);
                }}
              />
            ) : (
              <Button
                label="Descartar rascunho"
                icon="trash-outline"
                variant="danger"
                onPress={() => setConfirm(true)}
              />
            )
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

// ---------------- Conferência: fotos, campos e aprovação ----------------
function ReviewForm({
  listing,
  onMessage,
}: {
  listing: ImportedListing;
  onMessage: (msg: string) => void;
}) {
  const colors = useColors();
  const categories = useCategories();
  const update = useUpdateListingDraft();
  const addImage = useAddListingImage();
  const removeImage = useRemoveListingImage();
  const approve = useApproveListing();
  const rewrite = useRewriteListing();

  const approved = listing.status === "aprovado";

  const [name, setName] = useState(listing.name);
  const [shortDescription, setShortDescription] = useState(listing.shortDescription);
  const [description, setDescription] = useState(listing.description);
  const [specs, setSpecs] = useState(listing.specs ?? "");
  const [category, setCategory] = useState(listing.category ?? "");
  const [brand, setBrand] = useState(listing.brand ?? "");
  const [model, setModel] = useState(listing.model ?? "");
  const [price, setPrice] = useState(centsToInput(listing.price));
  const [colorsText, setColorsText] = useState(listing.colorsText ?? "");
  const [variationsText, setVariationsText] = useState(listing.variationsText ?? "");
  const [stock, setStock] = useState(
    listing.sourceStock != null ? String(listing.sourceStock) : "",
  );
  const [active, setActive] = useState(true);
  const [customizable, setCustomizable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvedId, setApprovedId] = useState<number | null>(listing.productId ?? null);

  // Quando a IA reescreve o texto no servidor, traz o novo conteúdo para a tela.
  useEffect(() => {
    setName(listing.name);
    setShortDescription(listing.shortDescription);
    setDescription(listing.description);
    setSpecs(listing.specs ?? "");
  }, [listing.id, listing.name, listing.shortDescription, listing.description, listing.specs]);

  function draftPayload() {
    return {
      id: listing.id,
      name: name.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      category: category.trim() || null,
      brand: brand.trim() || null,
      price: inputToCents(price),
      specs: specs.trim() || null,
      colorsText: colorsText.trim() || null,
      model: model.trim() || null,
      variationsText: variationsText.trim() || null,
    };
  }

  function reset() {
    setError(null);
    setMessage(null);
  }

  async function onSave() {
    reset();
    try {
      await update.mutateAsync(draftPayload());
      setMessage("Alterações salvas no rascunho.");
    } catch (e) {
      setError(errorMessage(e, "Não foi possível salvar."));
    }
  }

  async function onRewrite() {
    reset();
    try {
      // Salva o que está na tela para a IA usar os dados já conferidos.
      await update.mutateAsync(draftPayload());
      await rewrite.mutateAsync(listing.id);
      setMessage("Anúncio reescrito no padrão Rafa Laser. Confira o texto antes de aprovar.");
    } catch (e) {
      setError(errorMessage(e, "Não foi possível gerar o anúncio."));
    }
  }

  async function onApprove() {
    reset();
    if (!name.trim()) {
      setError("O nome do produto é obrigatório.");
      return;
    }
    if (!listing.images.some((i) => i.selected)) {
      setError("Escolha pelo menos uma foto (ou envie uma) antes de aprovar.");
      return;
    }
    try {
      await update.mutateAsync(draftPayload());
      const res = await approve.mutateAsync({
        id: listing.id,
        active,
        customizable,
        featured,
        stock: stock.trim() === "" ? null : Math.max(0, Number(stock) || 0),
      });
      setApprovedId(res.productId);
      onMessage(
        active
          ? "Produto cadastrado e já visível no site."
          : "Produto cadastrado (oculto). Ative na aba Produtos quando quiser.",
      );
    } catch (e) {
      setError(errorMessage(e, "Não foi possível aprovar."));
    }
  }

  async function toggleSelected(index: number) {
    reset();
    const images = listing.images.map((img, i) => ({
      key: img.key,
      source: img.source,
      selected: i === index ? !img.selected : img.selected,
    }));
    try {
      await update.mutateAsync({ id: listing.id, images });
    } catch (e) {
      setError(errorMessage(e, "Não foi possível alterar a foto."));
    }
  }

  async function setCover(index: number) {
    reset();
    const images = listing.images.map((img, i) => ({
      key: img.key,
      source: img.source,
      selected: i === index ? true : img.selected,
    }));
    try {
      await update.mutateAsync({ id: listing.id, images, coverIndex: index });
    } catch (e) {
      setError(errorMessage(e, "Não foi possível definir a capa."));
    }
  }

  async function deleteImage(index: number) {
    reset();
    try {
      await removeImage.mutateAsync({ id: listing.id, index });
    } catch (e) {
      setError(errorMessage(e, "Não foi possível apagar a foto."));
    }
  }

  const selectedCount = listing.images.filter((i) => i.selected).length;
  const busy =
    update.isPending ||
    approve.isPending ||
    addImage.isPending ||
    removeImage.isPending ||
    rewrite.isPending;

  const categoryOptions = (categories.data ?? []).map((c) => ({ value: c.name, label: c.name }));

  return (
    <View style={{ gap: 14 }}>
      {/* ---------- Fotos ---------- */}
      <View style={{ gap: 10 }}>
        <SectionTitle>{`Fotos (${selectedCount} de ${listing.images.length} em uso)`}</SectionTitle>
        {listing.images.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {listing.images.map((img, i) => {
              const isCover = i === listing.coverIndex;
              return (
                <View
                  key={`${img.key}-${i}`}
                  style={{
                    width: 104,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: isCover
                      ? colors.gold
                      : img.selected
                        ? colors.success
                        : colors.border,
                    opacity: img.selected ? 1 : 0.5,
                    backgroundColor: colors.secondary,
                  }}
                >
                  <Image
                    source={{ uri: img.url }}
                    style={{ width: "100%", height: 100 }}
                    resizeMode="cover"
                  />
                  {isCover ? (
                    <View
                      style={{
                        position: "absolute",
                        top: 5,
                        left: 5,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: colors.gold,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: Fonts.semibold,
                          fontSize: 9.5,
                          color: colors.accentForeground,
                        }}
                      >
                        CAPA
                      </Text>
                    </View>
                  ) : null}
                  {!approved ? (
                    <View
                      style={{
                        flexDirection: "row",
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        backgroundColor: colors.card,
                      }}
                    >
                      <PhotoAction
                        icon={img.selected ? "checkmark-circle" : "ellipse-outline"}
                        color={img.selected ? colors.success : colors.mutedForeground}
                        onPress={() => toggleSelected(i)}
                        disabled={busy}
                      />
                      <PhotoAction
                        icon={isCover ? "star" : "star-outline"}
                        color={colors.gold}
                        onPress={() => setCover(i)}
                        disabled={busy}
                      />
                      <PhotoAction
                        icon="trash-outline"
                        color={colors.destructive}
                        onPress={() => deleteImage(i)}
                        disabled={busy}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={{ fontFamily: Fonts.sans, fontSize: 12.5, color: colors.mutedForeground }}>
            Nenhuma foto foi baixada do anúncio. Envie as fotos pela galeria ou câmera.
          </Text>
        )}
        {!approved ? (
          <>
            <Text style={{ fontFamily: Fonts.sans, fontSize: 11.5, color: colors.mutedForeground }}>
              ✓ usar/não usar · ★ definir capa · lixeira apaga
            </Text>
            <PickButtons
              multiple
              label="Adicionar fotos"
              onUploaded={async (files) => {
                reset();
                try {
                  for (const f of files) await addImage.mutateAsync({ id: listing.id, key: f.key });
                } catch (e) {
                  setError(errorMessage(e, "Falha ao anexar a foto."));
                }
              }}
            />
          </>
        ) : null}
      </View>

      {approved ? (
        <View style={{ gap: 10 }}>
          <SuccessNote
            message={`Produto já cadastrado no catálogo${approvedId ? ` (ID ${approvedId})` : ""}. Ajustes agora são feitos em Produtos.`}
          />
          {approvedId ? (
            <Button
              label="Abrir produto"
              icon="cube-outline"
              variant="outline"
              onPress={() => router.push(`/produto/${approvedId}` as never)}
            />
          ) : null}
        </View>
      ) : (
        <>
          {/* ---------- Texto do anúncio ---------- */}
          <SectionTitle>Dados do produto</SectionTitle>
          <Field label="Nome do produto" value={name} onChangeText={setName} required />
          <Field
            label="Descrição curta"
            help="Aparece no card do site (até 160 caracteres)."
            value={shortDescription}
            onChangeText={(v) => setShortDescription(v.slice(0, 160))}
          />
          <Field
            label="Descrição completa"
            value={description}
            onChangeText={setDescription}
            multiline
            lines={6}
          />
          <Field
            label="Ficha técnica"
            help="Uma informação por linha."
            value={specs}
            onChangeText={setSpecs}
            multiline
            lines={4}
            placeholder={"Material: aço inox\nCapacidade: 500 ml"}
          />

          <Button
            label={rewrite.isPending ? "Gerando com IA..." : "Gerar anúncio Rafa Laser"}
            icon="sparkles-outline"
            variant="outline"
            loading={rewrite.isPending}
            disabled={busy}
            onPress={onRewrite}
          />

          {/* ---------- Catálogo ---------- */}
          <SectionTitle>Catálogo</SectionTitle>
          <Field
            label="Categoria"
            help="Toque numa existente ou digite uma nova (é criada na aprovação)."
            value={category}
            onChangeText={setCategory}
            placeholder="Ex.: Garrafas térmicas"
          />
          {categoryOptions.length ? (
            <Chips scroll options={categoryOptions} value={category} onChange={setCategory} />
          ) : null}
          <Field
            label="Preço de venda no seu site (R$)"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0,00"
            help={`Preço no anúncio: ${money(listing.price)}${
              listing.originalPrice ? ` (de ${money(listing.originalPrice)})` : ""
            }. Vazio = "Sob consulta".`}
          />
          <Field
            label="Estoque"
            value={stock}
            onChangeText={(v) => setStock(v.replace(/\D/g, ""))}
            keyboardType="numeric"
            placeholder="Vazio = sob encomenda"
            help={
              listing.sourceStock != null
                ? `Estoque no anúncio de origem: ${listing.sourceStock}`
                : undefined
            }
          />
          <Field label="Marca" value={brand} onChangeText={setBrand} />
          <Field label="Modelo" value={model} onChangeText={setModel} />
          <Field
            label="Cores"
            help="Separadas por vírgula."
            value={colorsText}
            onChangeText={setColorsText}
            placeholder="Preto, Branco"
          />
          <Field
            label="Variações do anúncio de origem"
            help="Uma por linha (só para referência)."
            value={variationsText}
            onChangeText={setVariationsText}
            multiline
            lines={3}
          />
          {listing.seller ? (
            <Text style={{ fontFamily: Fonts.sans, fontSize: 11.5, color: colors.mutedForeground }}>
              Vendedor de origem: {listing.seller}
            </Text>
          ) : null}

          {/* ---------- Publicação ---------- */}
          <SectionTitle>Publicação</SectionTitle>
          <SwitchRow label="Publicar visível no site" value={active} onValueChange={setActive} />
          <SwitchRow
            label="Aceita personalização a laser"
            value={customizable}
            onValueChange={setCustomizable}
          />
          <SwitchRow label="Destacar na home" value={featured} onValueChange={setFeatured} />

          <SuccessNote message={message} />
          <ErrorNote message={error} />

          <Button
            label="Aprovar e cadastrar produto"
            icon="checkmark-circle-outline"
            variant="gold"
            loading={approve.isPending}
            disabled={busy}
            onPress={onApprove}
          />
          <Button
            label="Salvar rascunho"
            icon="save-outline"
            variant="outline"
            loading={update.isPending && !approve.isPending && !rewrite.isPending}
            disabled={busy}
            onPress={onSave}
          />
        </>
      )}
    </View>
  );
}

function PhotoAction({
  icon,
  color,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: "center",
        paddingVertical: 7,
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={17} color={color} />
    </Pressable>
  );
}
