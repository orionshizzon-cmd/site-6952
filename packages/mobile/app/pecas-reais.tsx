import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { errorMessage } from "@/lib/format";
import type { PortfolioItem } from "@/lib/types";
import { PickButtons, Thumb } from "@/components/media-picker";
import {
  Badge,
  Button,
  Card,
  ConfirmRow,
  Empty,
  ErrorNote,
  Field,
  Header,
  IconButton,
  Loading,
  Screen,
  SectionTitle,
  SuccessNote,
  SwitchRow,
  useFlash,
} from "@/components/ui";
import {
  useAdminPortfolio,
  useDeletePortfolioItem,
  useReorderPortfolio,
  useSavePortfolioItem,
} from "@/queries/portfolio";

export default function PortfolioScreen() {
  const colors = useColors();
  const portfolio = useAdminPortfolio();
  const remove = useDeletePortfolioItem();
  const reorder = useReorderPortfolio();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  const list = portfolio.data ?? [];
  const nextOrder = list.length ? Math.max(...list.map((p) => p.sortOrder)) + 1 : 0;

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const ids = list.map((p) => p.id);
    const a = ids[index];
    ids[index] = ids[target];
    ids[target] = a;
    try {
      await reorder.mutateAsync(ids);
    } catch (e) {
      setError(errorMessage(e, "Não foi possível reordenar."));
    }
  }

  return (
    <Screen>
      <Header
        back
        title="Peças reais"
        subtitle={`${list.length} trabalhos no portfólio`}
        right={
          editing === null ? (
            <IconButton icon="add" color={colors.gold} onPress={() => setEditing("new")} />
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 46, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <SuccessNote message={flash} />
        <ErrorNote message={error} />

        {editing === "new" ? (
          <PortfolioForm
            item={null}
            nextOrder={nextOrder}
            onDone={(msg) => {
              setEditing(null);
              if (msg) setFlash(msg);
            }}
          />
        ) : null}

        {portfolio.isLoading ? (
          <Loading />
        ) : list.length === 0 && editing === null ? (
          <Empty
            icon="images-outline"
            title="Nenhuma peça"
            text="Toque no + e envie a foto de um trabalho entregue."
          />
        ) : (
          list.map((p, i) =>
            editing === p.id ? (
              <PortfolioForm
                key={p.id}
                item={p}
                nextOrder={nextOrder}
                onDone={(msg) => {
                  setEditing(null);
                  if (msg) setFlash(msg);
                }}
              />
            ) : (
              <Card key={p.id} style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Image
                    source={{ uri: p.url }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      backgroundColor: colors.secondary,
                    }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text
                      style={{
                        fontFamily: Fonts.semibold,
                        fontSize: 14.5,
                        color: colors.foreground,
                      }}
                      numberOfLines={2}
                    >
                      {p.label}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      <Badge
                        label={p.active ? "Visível" : "Oculta"}
                        tone={p.active ? "success" : "danger"}
                      />
                      <Badge label={`#${i + 1}`} />
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                  <IconButton
                    icon="arrow-up"
                    loading={reorder.isPending}
                    onPress={() => move(i, -1)}
                  />
                  <IconButton
                    icon="arrow-down"
                    loading={reorder.isPending}
                    onPress={() => move(i, 1)}
                  />
                  <IconButton
                    icon="create-outline"
                    onPress={() => {
                      setError(null);
                      setEditing(p.id);
                    }}
                  />
                  <IconButton
                    icon="trash-outline"
                    color={colors.destructive}
                    onPress={() => setConfirmId(p.id)}
                  />
                </View>
                {confirmId === p.id ? (
                  <ConfirmRow
                    question={`Excluir a peça "${p.label}"?`}
                    confirmLabel="Excluir"
                    loading={remove.isPending}
                    onCancel={() => setConfirmId(null)}
                    onConfirm={async () => {
                      try {
                        await remove.mutateAsync(p.id);
                        setFlash("Peça excluída.");
                      } catch (e) {
                        setError(errorMessage(e, "Não foi possível excluir."));
                      }
                      setConfirmId(null);
                    }}
                  />
                ) : null}
              </Card>
            ),
          )
        )}
      </ScrollView>
    </Screen>
  );
}

function PortfolioForm({
  item,
  nextOrder,
  onDone,
}: {
  item: PortfolioItem | null;
  nextOrder: number;
  onDone: (message?: string) => void;
}) {
  const colors = useColors();
  const save = useSavePortfolioItem();
  const [image, setImage] = useState<{ key: string; url: string } | null>(
    item ? { key: item.imageKey, url: item.url } : null,
  );
  const [label, setLabel] = useState(item?.label ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(item?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!image) {
      setError("Envie a foto da peça.");
      return;
    }
    if (!label.trim()) {
      setError("Informe a legenda da peça.");
      return;
    }
    try {
      await save.mutateAsync({
        id: item?.id,
        image: image.key,
        label: label.trim(),
        sortOrder: Number(sortOrder) || 0,
        active,
      });
      onDone(item ? "Peça atualizada." : "Peça adicionada.");
    } catch (e) {
      setError(errorMessage(e, "Não foi possível salvar a peça."));
    }
  }

  return (
    <Card style={{ gap: 14, borderColor: colors.gold }}>
      <SectionTitle>{item ? "Editar peça" : "Nova peça real"}</SectionTitle>
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: Fonts.semibold, fontSize: 12.5, color: colors.foreground }}>
          Foto <Text style={{ color: colors.gold }}>*</Text>
        </Text>
        {image ? (
          <Thumb url={image.url} size={96} onRemove={() => setImage(null)} />
        ) : (
          <PickButtons
            onUploaded={(files) => {
              const first = files[0];
              if (first) setImage({ key: first.key, url: first.url });
            }}
          />
        )}
      </View>
      <Field
        required
        label="Legenda"
        value={label}
        onChangeText={setLabel}
        placeholder="Ex.: Garrafas e copos"
      />
      <Field
        label="Ordem"
        value={sortOrder}
        onChangeText={setSortOrder}
        keyboardType="numeric"
        help="Menor número aparece primeiro."
      />
      <SwitchRow label="Visível no site" value={active} onValueChange={setActive} />

      <ErrorNote message={error} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label="Salvar"
          variant="gold"
          icon="checkmark"
          loading={save.isPending}
          onPress={submit}
          style={{ flex: 1 }}
        />
        <Button label="Cancelar" variant="outline" onPress={() => onDone()} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}
