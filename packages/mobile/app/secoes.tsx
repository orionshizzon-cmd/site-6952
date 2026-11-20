import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { errorMessage } from "@/lib/format";
import type { HomeSection } from "@/lib/types";
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
  IconButton,
  Loading,
  Screen,
  SectionTitle,
  SuccessNote,
  SwitchRow,
  useFlash,
} from "@/components/ui";
import { useAdminSections, useDeleteSection, useSaveSection } from "@/queries/sections";
import { useCategories } from "@/queries/categories";

export default function SectionsScreen() {
  const colors = useColors();
  const sections = useAdminSections();
  const remove = useDeleteSection();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  const list = sections.data ?? [];
  const nextOrder = list.length ? Math.max(...list.map((s) => s.sortOrder)) + 1 : 0;

  return (
    <Screen>
      <Header
        back
        title="Seções da home"
        subtitle={`${list.length} blocos de produtos`}
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
          <SectionForm
            item={null}
            nextOrder={nextOrder}
            onDone={(msg) => {
              setEditing(null);
              if (msg) setFlash(msg);
            }}
          />
        ) : null}

        {sections.isLoading ? (
          <Loading />
        ) : list.length === 0 && editing === null ? (
          <Empty
            icon="grid-outline"
            title="Nenhuma seção"
            text="Crie blocos como “Dia dos Pais” para agrupar produtos na home."
          />
        ) : (
          list.map((s) =>
            editing === s.id ? (
              <SectionForm
                key={s.id}
                item={s}
                nextOrder={nextOrder}
                onDone={(msg) => {
                  setEditing(null);
                  if (msg) setFlash(msg);
                }}
              />
            ) : (
              <Card key={s.id} style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>{s.emoji ?? "🎁"}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        fontFamily: Fonts.semibold,
                        fontSize: 14.5,
                        color: colors.foreground,
                      }}
                      numberOfLines={2}
                    >
                      {s.title}
                    </Text>
                    {s.subtitle ? (
                      <Text
                        style={{
                          fontFamily: Fonts.sans,
                          fontSize: 12,
                          color: colors.mutedForeground,
                        }}
                        numberOfLines={2}
                      >
                        {s.subtitle}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      <Badge
                        label={s.categoryFilter ?? "Produtos em destaque"}
                        tone="gold"
                      />
                      <Badge
                        label={s.active ? "Visível" : "Oculta"}
                        tone={s.active ? "success" : "danger"}
                      />
                      <Badge label={`Ordem ${s.sortOrder}`} />
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                  <IconButton
                    icon="create-outline"
                    onPress={() => {
                      setError(null);
                      setEditing(s.id);
                    }}
                  />
                  <IconButton
                    icon="trash-outline"
                    color={colors.destructive}
                    onPress={() => setConfirmId(s.id)}
                  />
                </View>
                {confirmId === s.id ? (
                  <ConfirmRow
                    question={`Excluir a seção "${s.title}"? Os produtos não são apagados.`}
                    confirmLabel="Excluir"
                    loading={remove.isPending}
                    onCancel={() => setConfirmId(null)}
                    onConfirm={async () => {
                      try {
                        await remove.mutateAsync(s.id);
                        setFlash("Seção excluída.");
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

function SectionForm({
  item,
  nextOrder,
  onDone,
}: {
  item: HomeSection | null;
  nextOrder: number;
  onDone: (message?: string) => void;
}) {
  const colors = useColors();
  const save = useSaveSection();
  const categories = useCategories();
  const [emoji, setEmoji] = useState(item?.emoji ?? "🎁");
  const [title, setTitle] = useState(item?.title ?? "");
  const [subtitle, setSubtitle] = useState(item?.subtitle ?? "");
  const [categoryFilter, setCategoryFilter] = useState(item?.categoryFilter ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(item?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const options = [
    { value: "", label: "Produtos em destaque" },
    ...(categories.data ?? []).map((c) => ({ value: c.name, label: c.name })),
  ];

  async function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Informe o título da seção.");
      return;
    }
    try {
      await save.mutateAsync({
        id: item?.id,
        key: item?.key ?? "sazonal",
        emoji: emoji.trim() || null,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        categoryFilter: categoryFilter || null,
        sortOrder: Number(sortOrder) || 0,
        active,
      });
      onDone(item ? "Seção atualizada." : "Seção criada.");
    } catch (e) {
      setError(errorMessage(e, "Não foi possível salvar a seção."));
    }
  }

  return (
    <Card style={{ gap: 14, borderColor: colors.gold }}>
      <SectionTitle>{item ? "Editar seção" : "Nova seção"}</SectionTitle>
      <Field label="Emoji" value={emoji} onChangeText={setEmoji} placeholder="🎁" />
      <Field
        required
        label="Título"
        value={title}
        onChangeText={setTitle}
        placeholder="Ex.: Presentes para o Dia dos Pais"
      />
      <Field
        label="Subtítulo"
        value={subtitle}
        onChangeText={setSubtitle}
        multiline
        lines={2}
      />
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: Fonts.semibold, fontSize: 12.5, color: colors.foreground }}>
          Produtos da seção
        </Text>
        <Chips
          scroll={false}
          options={options}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
      </View>
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
