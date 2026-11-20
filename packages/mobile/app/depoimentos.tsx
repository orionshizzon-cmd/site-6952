import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { errorMessage } from "@/lib/format";
import type { Testimonial } from "@/lib/types";
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
  useAdminTestimonials,
  useDeleteTestimonial,
  useSaveTestimonial,
} from "@/queries/testimonials";

/** Estrelas clicáveis (1 a 5) usadas no formulário. */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={26}
            color={n <= value ? colors.gold : colors.mutedForeground}
          />
        </Pressable>
      ))}
    </View>
  );
}

function Stars({ count }: { count: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= count ? "star" : "star-outline"}
          size={13}
          color={n <= count ? colors.gold : colors.mutedForeground}
        />
      ))}
    </View>
  );
}

export default function TestimonialsScreen() {
  const colors = useColors();
  const testimonials = useAdminTestimonials();
  const remove = useDeleteTestimonial();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  const list = testimonials.data ?? [];
  const nextOrder = list.length ? Math.max(...list.map((t) => t.sortOrder)) + 1 : 0;

  return (
    <Screen>
      <Header
        back
        title="Depoimentos"
        subtitle={`${list.length} avaliações de clientes`}
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
          <TestimonialForm
            item={null}
            nextOrder={nextOrder}
            onDone={(msg) => {
              setEditing(null);
              if (msg) setFlash(msg);
            }}
          />
        ) : null}

        {testimonials.isLoading ? (
          <Loading />
        ) : list.length === 0 && editing === null ? (
          <Empty
            icon="chatbubble-ellipses-outline"
            title="Nenhum depoimento"
            text="Toque no + para publicar a avaliação de um cliente."
          />
        ) : (
          list.map((t) =>
            editing === t.id ? (
              <TestimonialForm
                key={t.id}
                item={t}
                nextOrder={nextOrder}
                onDone={(msg) => {
                  setEditing(null);
                  if (msg) setFlash(msg);
                }}
              />
            ) : (
              <Card key={t.id} style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: Fonts.semibold,
                        fontSize: 14.5,
                        color: colors.foreground,
                      }}
                    >
                      {t.name}
                    </Text>
                    {t.city ? (
                      <Text
                        style={{
                          fontFamily: Fonts.sans,
                          fontSize: 11.5,
                          color: colors.mutedForeground,
                        }}
                      >
                        {t.city}
                      </Text>
                    ) : null}
                  </View>
                  <Stars count={t.rating} />
                </View>
                <Text
                  style={{ fontFamily: Fonts.sans, fontSize: 13, color: colors.mutedForeground }}
                >
                  “{t.text}”
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <Badge
                    label={t.active ? "Visível" : "Oculto"}
                    tone={t.active ? "success" : "danger"}
                  />
                  <Badge label={`Ordem ${t.sortOrder}`} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                  <IconButton
                    icon="create-outline"
                    onPress={() => {
                      setError(null);
                      setEditing(t.id);
                    }}
                  />
                  <IconButton
                    icon="trash-outline"
                    color={colors.destructive}
                    onPress={() => setConfirmId(t.id)}
                  />
                </View>
                {confirmId === t.id ? (
                  <ConfirmRow
                    question={`Excluir o depoimento de ${t.name}?`}
                    confirmLabel="Excluir"
                    loading={remove.isPending}
                    onCancel={() => setConfirmId(null)}
                    onConfirm={async () => {
                      try {
                        await remove.mutateAsync(t.id);
                        setFlash("Depoimento excluído.");
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

function TestimonialForm({
  item,
  nextOrder,
  onDone,
}: {
  item: Testimonial | null;
  nextOrder: number;
  onDone: (message?: string) => void;
}) {
  const colors = useColors();
  const save = useSaveTestimonial();
  const [name, setName] = useState(item?.name ?? "");
  const [city, setCity] = useState(item?.city ?? "");
  const [text, setText] = useState(item?.text ?? "");
  const [rating, setRating] = useState(item?.rating ?? 5);
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(item?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (!text.trim()) {
      setError("Escreva o depoimento.");
      return;
    }
    try {
      await save.mutateAsync({
        id: item?.id,
        name: name.trim(),
        city: city.trim() || null,
        text: text.trim(),
        rating,
        sortOrder: Number(sortOrder) || 0,
        active,
      });
      onDone(item ? "Depoimento atualizado." : "Depoimento publicado.");
    } catch (e) {
      setError(errorMessage(e, "Não foi possível salvar o depoimento."));
    }
  }

  return (
    <Card style={{ gap: 14, borderColor: colors.gold }}>
      <SectionTitle>{item ? "Editar depoimento" : "Novo depoimento"}</SectionTitle>
      <Field
        required
        label="Nome do cliente"
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Ana Souza"
      />
      <Field
        label="Cidade"
        value={city}
        onChangeText={setCity}
        placeholder="Ex.: Imperatriz - MA"
      />
      <Field
        required
        label="Depoimento"
        value={text}
        onChangeText={setText}
        multiline
        lines={4}
        placeholder="O que o cliente falou sobre a peça."
      />
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: Fonts.semibold, fontSize: 12.5, color: colors.foreground }}>
          Nota
        </Text>
        <StarPicker value={rating} onChange={setRating} />
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
