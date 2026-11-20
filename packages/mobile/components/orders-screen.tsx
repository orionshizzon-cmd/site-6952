import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { dateTime, money } from "@/lib/format";
import { CLOSED_STATUSES, ORDER_STATUSES, type Order, type OrderItem, type OrderStatus } from "@/lib/types";
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
} from "./ui";
import { useAdminOrders, useDeleteOrders, useUpdateOrderStatus } from "@/queries/orders";

function statusTone(status: string): "neutral" | "gold" | "success" | "danger" | "warning" {
  if (status === "Cancelado" || status === "Recusado") return "danger";
  if (status === "Entregue" || status === "Finalizado") return "success";
  if (status === "Em produção" || status === "Aguardando entrada") return "warning";
  if (status === "Aprovado") return "gold";
  return "neutral";
}

function orientationLabel(v: string): string {
  if (!v) return "";
  const map: Record<string, string> = {
    horizontal: "Horizontal",
    vertical: "Vertical",
    diagonal: "Diagonal",
    circular: "Circular",
  };
  return map[v] ?? v;
}

function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** Tela de pedidos — a mesma lista do painel do site, em aberto ou concluídos. */
export function OrdersScreen({ closed = false }: { closed?: boolean }) {
  const colors = useColors();
  const orders = useAdminOrders();
  const removeOrders = useDeleteOrders();
  const [selected, setSelected] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);

  const all = orders.data ?? [];
  const list = all.filter((o) =>
    closed ? CLOSED_STATUSES.includes(o.status) : !CLOSED_STATUSES.includes(o.status),
  );
  const visibleIds = list.map((o) => o.id);
  const marked = selected.filter((id) => visibleIds.includes(id));

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Screen>
      <Header
        back
        title={closed ? "Pedidos concluídos" : "Pedidos"}
        subtitle={`${list.length} ${closed ? "no histórico" : "em andamento"}`}
        right={
          <IconButton
            icon="refresh"
            loading={orders.isFetching}
            onPress={() => orders.refetch()}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 46, gap: 14 }}>
        {list.length > 0 ? (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Button
                label={marked.length === visibleIds.length ? "Limpar seleção" : "Selecionar todos"}
                variant="outline"
                onPress={() =>
                  setSelected(marked.length === visibleIds.length ? [] : visibleIds)
                }
                style={{ paddingVertical: 8, paddingHorizontal: 12 }}
              />
              <Text
                style={{ fontFamily: Fonts.sans, fontSize: 12, color: colors.mutedForeground, flex: 1 }}
              >
                {marked.length > 0 ? `${marked.length} selecionado(s)` : "Nenhum selecionado"}
              </Text>
              {marked.length > 0 ? (
                <IconButton
                  icon="trash-outline"
                  color={colors.destructive}
                  onPress={() => setConfirming(true)}
                />
              ) : null}
            </View>
            {confirming ? (
              <ConfirmRow
                question={
                  marked.length === 1
                    ? "Excluir este pedido da lista? Não pode ser desfeito."
                    : `Excluir ${marked.length} pedidos da lista? Não pode ser desfeito.`
                }
                confirmLabel="Excluir"
                loading={removeOrders.isPending}
                onCancel={() => setConfirming(false)}
                onConfirm={async () => {
                  await removeOrders.mutateAsync(marked);
                  setSelected([]);
                  setConfirming(false);
                }}
              />
            ) : null}
          </Card>
        ) : null}

        {orders.isLoading ? (
          <Loading label="Carregando pedidos..." />
        ) : list.length === 0 ? (
          <Empty
            icon="clipboard-outline"
            title={closed ? "Nenhum pedido concluído" : "Nenhum pedido em andamento"}
            text={
              closed
                ? "Pedidos finalizados, entregues ou cancelados aparecem aqui."
                : "Os pedidos feitos no site aparecem aqui na hora."
            }
          />
        ) : (
          list.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={selected.includes(order.id)}
              onToggle={() => toggle(order.id)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function OrderCard({
  order,
  selected,
  onToggle,
}: {
  order: Order;
  selected: boolean;
  onToggle: () => void;
}) {
  const colors = useColors();
  const updateStatus = useUpdateOrderStatus();
  const [open, setOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <Card style={{ gap: 12, borderColor: selected ? colors.destructive : colors.border }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={onToggle} hitSlop={8} style={{ paddingTop: 2 }}>
          <Ionicons
            name={selected ? "checkbox" : "square-outline"}
            size={21}
            color={selected ? colors.destructive : colors.mutedForeground}
          />
        </Pressable>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: Fonts.display, fontSize: 15.5, color: colors.foreground }}>
            {order.code}
          </Text>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 12.5, color: colors.mutedForeground }}>
            {order.customerName} · {order.customerPhone}
          </Text>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: colors.mutedForeground }}>
            {dateTime(order.createdAt)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={{ fontFamily: Fonts.display, fontSize: 16, color: colors.goldDeep }}>
            {money(order.total)}
          </Text>
          <Badge label={order.status} tone={statusTone(order.status)} />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={statusOpen ? "Fechar status" : "Mudar status"}
          icon="swap-vertical"
          variant="outline"
          onPress={() => setStatusOpen((v) => !v)}
          style={{ flex: 1, paddingVertical: 9 }}
        />
        <Button
          label="WhatsApp"
          icon="logo-whatsapp"
          variant="outline"
          onPress={() =>
            Linking.openURL(
              `https://wa.me/${phoneDigits(order.customerPhone)}?text=${encodeURIComponent(
                `Olá ${order.customerName}! Sobre o seu pedido ${order.code} na Rafa Laser:`,
              )}`,
            )
          }
          style={{ flex: 1, paddingVertical: 9 }}
        />
      </View>

      {statusOpen ? (
        <View style={{ gap: 8 }}>
          <Overline>Fase do pedido</Overline>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            {ORDER_STATUSES.map((s) => {
              const on = s === order.status;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    updateStatus.mutate({ id: order.id, status: s as OrderStatus });
                    setStatusOpen(false);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: on ? colors.gold : colors.border,
                    backgroundColor: on ? colors.gold : "transparent",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.semibold,
                      fontSize: 11.5,
                      color: on ? colors.accentForeground : colors.mutedForeground,
                    }}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 10,
        }}
      >
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
        <Text style={{ fontFamily: Fonts.semibold, fontSize: 12.5, color: colors.mutedForeground }}>
          {open ? "Ocultar itens" : `Ver itens (${order.items.length})`}
        </Text>
      </Pressable>

      {open ? (
        <View style={{ gap: 10 }}>
          {order.items.map((item, i) => (
            <ItemRow key={`${order.id}-${i}`} item={item} />
          ))}
          {order.note ? (
            <View
              style={{
                borderRadius: 12,
                backgroundColor: colors.secondary,
                padding: 10,
              }}
            >
              <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: colors.mutedForeground }}>
                <Text style={{ fontFamily: Fonts.semibold }}>Observações do pedido: </Text>
                {order.note}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  const colors = useColors();
  const rows: { label: string; value: string }[] = [];
  if (item.color) rows.push({ label: "Cor", value: item.color });
  if (item.engravingText) rows.push({ label: "Texto", value: item.engravingText });
  if (item.engravingFont) rows.push({ label: "Fonte", value: item.engravingFont });
  if (item.engravingOrientation)
    rows.push({ label: "Sentido", value: orientationLabel(item.engravingOrientation) });
  if (item.notes) rows.push({ label: "Obs.", value: item.notes });

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 11,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Text
          style={{ fontFamily: Fonts.medium, fontSize: 13.5, color: colors.foreground, flex: 1 }}
        >
          {item.quantity}× {item.productName}
        </Text>
        <Text style={{ fontFamily: Fonts.semibold, fontSize: 13, color: colors.goldDeep }}>
          {money(item.unitPrice)}
        </Text>
      </View>

      {rows.map((r) => (
        <Text
          key={r.label}
          style={{ fontFamily: Fonts.sans, fontSize: 12, color: colors.mutedForeground }}
        >
          <Text style={{ fontFamily: Fonts.semibold, color: colors.foreground }}>{r.label}: </Text>
          {r.value}
        </Text>
      ))}

      {item.imageUrl || item.engravingVectorUrl ? (
        <View style={{ flexDirection: "row", gap: 12, paddingTop: 2 }}>
          {item.imageUrl ? (
            <Pressable
              onPress={() => Linking.openURL(item.imageUrl as string)}
              style={{ alignItems: "center", gap: 4 }}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.secondary,
                }}
                resizeMode="cover"
              />
              <Text style={{ fontFamily: Fonts.semibold, fontSize: 10.5, color: colors.goldDeep }}>
                Foto/logo
              </Text>
            </Pressable>
          ) : null}
          {item.engravingVectorUrl ? (
            <Pressable
              onPress={() => Linking.openURL(item.engravingVectorUrl as string)}
              style={{ alignItems: "center", gap: 4 }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="color-wand-outline" size={22} color={colors.ink} />
              </View>
              <Text style={{ fontFamily: Fonts.semibold, fontSize: 10.5, color: colors.goldDeep }}>
                Vetor (SVG)
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
