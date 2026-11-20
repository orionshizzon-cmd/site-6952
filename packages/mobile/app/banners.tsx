import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { errorMessage } from "@/lib/format";
import type { Banner } from "@/lib/types";
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
import { useAdminBanners, useDeleteBanner, useSaveBanner } from "@/queries/banners";

type Media = { kind: "image" | "video"; key: string; url: string };

export default function BannersScreen() {
  const colors = useColors();
  const banners = useAdminBanners();
  const remove = useDeleteBanner();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  const list = banners.data ?? [];
  const nextOrder = list.length ? Math.max(...list.map((b) => b.sortOrder)) + 1 : 0;

  return (
    <Screen>
      <Header
        back
        title="Banners"
        subtitle={`${list.length} no topo da home`}
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
          <BannerForm
            banner={null}
            nextOrder={nextOrder}
            onDone={(msg) => {
              setEditing(null);
              if (msg) setFlash(msg);
            }}
          />
        ) : null}

        {banners.isLoading ? (
          <Loading />
        ) : list.length === 0 && editing === null ? (
          <Empty
            icon="megaphone-outline"
            title="Nenhum banner"
            text="Toque no + para criar o primeiro destaque da home."
          />
        ) : (
          list.map((b) =>
            editing === b.id ? (
              <BannerForm
                key={b.id}
                banner={b}
                nextOrder={nextOrder}
                onDone={(msg) => {
                  setEditing(null);
                  if (msg) setFlash(msg);
                }}
              />
            ) : (
              <Card key={b.id} style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {b.url ? (
                    <Image
                      source={{ uri: b.url }}
                      style={{
                        width: 78,
                        height: 58,
                        borderRadius: 10,
                        backgroundColor: colors.secondary,
                      }}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        fontFamily: Fonts.semibold,
                        fontSize: 14.5,
                        color: colors.foreground,
                      }}
                      numberOfLines={2}
                    >
                      {b.title}
                    </Text>
                    {b.text ? (
                      <Text
                        style={{
                          fontFamily: Fonts.sans,
                          fontSize: 12,
                          color: colors.mutedForeground,
                        }}
                        numberOfLines={2}
                      >
                        {b.text}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {b.badge ? <Badge label={b.badge} tone="gold" /> : null}
                      <Badge
                        label={b.active ? "Ativo" : "Oculto"}
                        tone={b.active ? "success" : "danger"}
                      />
                      <Badge label={`Ordem ${b.sortOrder}`} />
                      {b.mediaList.length > 1 ? (
                        <Badge label={`${b.mediaList.length} mídias`} />
                      ) : null}
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                  <IconButton
                    icon="create-outline"
                    onPress={() => {
                      setError(null);
                      setEditing(b.id);
                    }}
                  />
                  <IconButton
                    icon="trash-outline"
                    color={colors.destructive}
                    onPress={() => setConfirmId(b.id)}
                  />
                </View>
                {confirmId === b.id ? (
                  <ConfirmRow
                    question={`Excluir o banner "${b.title}"?`}
                    confirmLabel="Excluir"
                    loading={remove.isPending}
                    onCancel={() => setConfirmId(null)}
                    onConfirm={async () => {
                      try {
                        await remove.mutateAsync(b.id);
                        setFlash("Banner excluído.");
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

function BannerForm({
  banner,
  nextOrder,
  onDone,
}: {
  banner: Banner | null;
  nextOrder: number;
  onDone: (message?: string) => void;
}) {
  const colors = useColors();
  const save = useSaveBanner();
  const [cover, setCover] = useState<Media | null>(
    banner?.imageKey && banner.url
      ? { kind: "image", key: banner.imageKey, url: banner.url }
      : null,
  );
  const [extras, setExtras] = useState<Media[]>(
    (banner?.mediaList ?? [])
      .filter((m) => m.key !== banner?.imageKey)
      .map((m) => ({ kind: m.kind, key: m.key, url: m.url })),
  );
  const [badge, setBadge] = useState(banner?.badge ?? "Promoção");
  const [title, setTitle] = useState(banner?.title ?? "");
  const [text, setText] = useState(banner?.text ?? "");
  const [ctaLabel, setCtaLabel] = useState(banner?.ctaLabel ?? "Quero saber mais");
  const [ctaUrl, setCtaUrl] = useState(banner?.ctaUrl ?? "");
  const [whatsappMessage, setWhatsappMessage] = useState(banner?.whatsappMessage ?? "");
  const [sortOrder, setSortOrder] = useState(String(banner?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(banner?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function move(index: number, dir: -1 | 1) {
    setExtras((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const a = next[index];
      next[index] = next[target];
      next[target] = a;
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Informe o título do banner.");
      return;
    }
    const media = [
      ...(cover ? [{ kind: "image" as const, key: cover.key }] : []),
      ...extras.map((m) => ({ kind: m.kind, key: m.key })),
    ];
    try {
      await save.mutateAsync({
        id: banner?.id,
        image: cover?.key ?? null,
        media: media.length ? media : null,
        badge: badge.trim() || null,
        title: title.trim(),
        text: text.trim() || null,
        ctaLabel: ctaLabel.trim() || null,
        ctaUrl: ctaUrl.trim() || null,
        whatsappMessage: whatsappMessage.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        active,
      });
      onDone(banner ? "Banner atualizado." : "Banner criado.");
    } catch (e) {
      setError(errorMessage(e, "Não foi possível salvar o banner."));
    }
  }

  return (
    <Card style={{ gap: 14, borderColor: colors.gold }}>
      <SectionTitle>{banner ? "Editar banner" : "Novo banner"}</SectionTitle>

      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: Fonts.semibold, fontSize: 12.5, color: colors.foreground }}>
          Imagem principal
        </Text>
        {cover ? (
          <Thumb url={cover.url} size={96} onRemove={() => setCover(null)} />
        ) : (
          <PickButtons label="Galeria" onUploaded={(files) => setCover(files[0] ?? null)} />
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: Fonts.semibold, fontSize: 12.5, color: colors.foreground }}>
          Mais fotos e vídeos
        </Text>
        <Text style={{ fontFamily: Fonts.sans, fontSize: 11.5, color: colors.mutedForeground }}>
          Com mais de uma mídia o banner vira carrossel no site.
        </Text>
        {extras.map((m, i) => (
          <View key={m.key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Thumb
              url={m.url}
              kind={m.kind}
              size={58}
              onRemove={() => setExtras((prev) => prev.filter((x) => x.key !== m.key))}
            />
            <Text
              style={{
                flex: 1,
                fontFamily: Fonts.medium,
                fontSize: 12.5,
                color: colors.mutedForeground,
              }}
            >
              {m.kind === "video" ? "Vídeo" : "Foto"} {i + 1}
            </Text>
            <IconButton icon="arrow-up" size={30} onPress={() => move(i, -1)} />
            <IconButton icon="arrow-down" size={30} onPress={() => move(i, 1)} />
          </View>
        ))}
        <PickButtons
          multiple
          videos
          label="Adicionar mídias"
          onUploaded={(files) => setExtras((prev) => [...prev, ...files])}
        />
      </View>

      <Field label="Selo" value={badge} onChangeText={setBadge} placeholder="Ex.: Promoção" />
      <Field
        required
        label="Título"
        value={title}
        onChangeText={setTitle}
        placeholder="Ex.: Garrafas térmicas por R$ 60,00"
      />
      <Field label="Texto" value={text} onChangeText={setText} multiline lines={3} />
      <Field
        label="Texto do botão"
        value={ctaLabel}
        onChangeText={setCtaLabel}
        placeholder="Vazio = sem botão"
      />
      <Field
        label="Mensagem do WhatsApp"
        value={whatsappMessage}
        onChangeText={setWhatsappMessage}
        placeholder="Mensagem já preenchida ao clicar"
      />
      <Field
        label="Link do botão"
        value={ctaUrl}
        onChangeText={setCtaUrl}
        placeholder="Vazio = abre o WhatsApp"
        autoCapitalize="none"
      />
      <Field
        label="Ordem"
        value={sortOrder}
        onChangeText={setSortOrder}
        keyboardType="numeric"
        help="Menor número aparece primeiro."
      />
      <SwitchRow
        label="Banner ativo"
        help="Visível no site"
        value={active}
        onValueChange={setActive}
      />

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
        <Button
          label="Cancelar"
          variant="outline"
          onPress={() => onDone()}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
}
