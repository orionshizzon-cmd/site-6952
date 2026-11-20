import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { errorMessage } from "@/lib/format";
import type { PhotoStep } from "@/lib/types";
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
import { useAdminPhotoSteps, useDeletePhotoStep, useSavePhotoStep } from "@/queries/photo-steps";

export default function PhotoStepsScreen() {
  const colors = useColors();
  const steps = useAdminPhotoSteps();
  const remove = useDeletePhotoStep();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  const list = steps.data ?? [];
  const nextOrder = list.length ? Math.max(...list.map((s) => s.sortOrder)) + 1 : 0;

  return (
    <Screen>
      <Header
        back
        title="Fotogravação"
        subtitle={`${list.length} etapas do processo`}
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
          <PhotoStepForm
            item={null}
            nextOrder={nextOrder}
            onDone={(msg) => {
              setEditing(null);
              if (msg) setFlash(msg);
            }}
          />
        ) : null}

        {steps.isLoading ? (
          <Loading />
        ) : list.length === 0 && editing === null ? (
          <Empty
            icon="camera-outline"
            title="Nenhuma etapa"
            text="Mostre na home o caminho da foto até a peça gravada."
          />
        ) : (
          list.map((s) =>
            editing === s.id ? (
              <PhotoStepForm
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
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Image
                    source={{ uri: s.url }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      backgroundColor: colors.secondary,
                    }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        fontFamily: Fonts.semibold,
                        fontSize: 14.5,
                        color: colors.foreground,
                      }}
                      numberOfLines={2}
                    >
                      {s.label}
                    </Text>
                    {s.text ? (
                      <Text
                        style={{
                          fontFamily: Fonts.sans,
                          fontSize: 12,
                          color: colors.mutedForeground,
                        }}
                        numberOfLines={3}
                      >
                        {s.text}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
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
                    question={`Excluir a etapa "${s.label}"?`}
                    confirmLabel="Excluir"
                    loading={remove.isPending}
                    onCancel={() => setConfirmId(null)}
                    onConfirm={async () => {
                      try {
                        await remove.mutateAsync(s.id);
                        setFlash("Etapa excluída.");
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

function PhotoStepForm({
  item,
  nextOrder,
  onDone,
}: {
  item: PhotoStep | null;
  nextOrder: number;
  onDone: (message?: string) => void;
}) {
  const colors = useColors();
  const save = useSavePhotoStep();
  const [image, setImage] = useState<{ key: string; url: string } | null>(
    item ? { key: item.imageKey, url: item.url } : null,
  );
  const [label, setLabel] = useState(item?.label ?? "");
  const [text, setText] = useState(item?.text ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(item?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!image) {
      setError("Envie a imagem da etapa.");
      return;
    }
    if (!label.trim()) {
      setError("Informe o título da etapa.");
      return;
    }
    try {
      await save.mutateAsync({
        id: item?.id,
        image: image.key,
        label: label.trim(),
        text: text.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        active,
      });
      onDone(item ? "Etapa atualizada." : "Etapa criada.");
    } catch (e) {
      setError(errorMessage(e, "Não foi possível salvar a etapa."));
    }
  }

  return (
    <Card style={{ gap: 14, borderColor: colors.gold }}>
      <SectionTitle>{item ? "Editar etapa" : "Nova etapa"}</SectionTitle>
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: Fonts.semibold, fontSize: 12.5, color: colors.foreground }}>
          Imagem <Text style={{ color: colors.gold }}>*</Text>
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
        label="Título da etapa"
        value={label}
        onChangeText={setLabel}
        placeholder="Ex.: 1. Foto original"
      />
      <Field
        label="Descrição"
        value={text}
        onChangeText={setText}
        multiline
        lines={2}
        placeholder="Ex.: Você envia a foto pelo WhatsApp."
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
