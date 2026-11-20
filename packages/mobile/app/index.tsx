import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/components/auth-provider";
import { Badge, Card, Header, IconButton, Overline, Screen } from "@/components/ui";
import { useAdminProducts } from "@/queries/products";
import { useAdminOrders } from "@/queries/orders";

type Entry = {
  href: string;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Ferramentas que ainda serão trazidas para o app (próxima etapa). */
  soon?: boolean;
};

// Mesmas abas do painel do site, agrupadas para caber bem na tela do celular.
const GROUPS: { label: string; items: Entry[] }[] = [
  {
    label: "Vitrine",
    items: [
      {
        href: "/produtos",
        title: "Produtos",
        text: "Criar, editar, preço, estoque e fotos",
        icon: "cube-outline",
      },
      {
        href: "/categorias",
        title: "Categorias",
        text: "Criar, renomear e excluir",
        icon: "pricetags-outline",
      },
      {
        href: "/banners",
        title: "Banners",
        text: "Destaques do topo da home",
        icon: "megaphone-outline",
      },
      {
        href: "/secoes",
        title: "Seções da home",
        text: "Blocos de produtos por categoria",
        icon: "grid-outline",
      },
    ],
  },
  {
    label: "Pedidos",
    items: [
      {
        href: "/pedidos",
        title: "Pedidos",
        text: "Em aberto, status e WhatsApp",
        icon: "clipboard-outline",
      },
      {
        href: "/pedidos-concluidos",
        title: "Concluídos",
        text: "Histórico de pedidos fechados",
        icon: "checkmark-done-outline",
      },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      {
        href: "/pecas-reais",
        title: "Peças reais",
        text: "Portfólio de trabalhos entregues",
        icon: "images-outline",
      },
      {
        href: "/fotogravacao",
        title: "Fotogravação",
        text: "Passos do processo na home",
        icon: "camera-outline",
      },
      {
        href: "/depoimentos",
        title: "Depoimentos",
        text: "Avaliações de clientes",
        icon: "chatbubble-ellipses-outline",
      },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      {
        href: "/vetorizacao",
        title: "Vetorização",
        text: "Arte composta e gravura por IA",
        icon: "color-wand-outline",
        soon: true,
      },
      {
        href: "/importar",
        title: "Importar anúncio",
        text: "Mercado Livre e Shopee por link",
        icon: "link-outline",
      },
      {
        href: "/catalogos",
        title: "Analisar catálogos",
        text: "Catálogos de fornecedor com IA",
        icon: "document-text-outline",
        soon: true,
      },
      {
        href: "/ofertas",
        title: "Caçador de ofertas",
        text: "Oportunidades e margem de revenda",
        icon: "trending-up-outline",
        soon: true,
      },
      {
        href: "/meus-dados",
        title: "Meus dados",
        text: "Emitente usado nos recibos",
        icon: "business-outline",
        soon: true,
      },
    ],
  },
];

export default function HubScreen() {
  const colors = useColors();
  const { signOut } = useAuth();
  const products = useAdminProducts();
  const orders = useAdminOrders();

  const productCount = products.data?.length ?? 0;
  const inactive = products.data?.filter((p) => !p.active).length ?? 0;
  const openOrders =
    orders.data?.filter(
      (o) => !["Entregue", "Cancelado", "Finalizado"].includes(o.status),
    ).length ?? 0;

  return (
    <Screen>
      <Header
        title="Painel Rafa Laser"
        subtitle="Administração pelo celular"
        right={<IconButton icon="log-out-outline" onPress={signOut} color={colors.destructive} />}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 46, gap: 22 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Card style={{ flex: 1, gap: 4 }} onPress={() => router.push("/produtos")}>
            <Overline>Produtos</Overline>
            <Text style={{ fontFamily: Fonts.display, fontSize: 26, color: colors.foreground }}>
              {products.isLoading ? "—" : productCount}
            </Text>
            <Text style={{ fontFamily: Fonts.sans, fontSize: 11.5, color: colors.mutedForeground }}>
              {inactive > 0 ? `${inactive} inativo(s)` : "todos ativos"}
            </Text>
          </Card>
          <Card style={{ flex: 1, gap: 4 }} onPress={() => router.push("/pedidos")}>
            <Overline>Pedidos abertos</Overline>
            <Text style={{ fontFamily: Fonts.display, fontSize: 26, color: colors.foreground }}>
              {orders.isLoading ? "—" : openOrders}
            </Text>
            <Text style={{ fontFamily: Fonts.sans, fontSize: 11.5, color: colors.mutedForeground }}>
              aguardando atendimento
            </Text>
          </Card>
        </View>

        {GROUPS.map((group) => (
          <View key={group.label} style={{ gap: 10 }}>
            <Overline>{group.label}</Overline>
            {group.items.map((item) => (
              <Card
                key={item.href}
                onPress={item.soon ? undefined : () => router.push(item.href as never)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 13,
                  opacity: item.soon ? 0.55 : 1,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    backgroundColor: colors.secondary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.soon ? colors.mutedForeground : colors.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontFamily: Fonts.semibold, fontSize: 15, color: colors.foreground }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: Fonts.sans,
                      fontSize: 12,
                      color: colors.mutedForeground,
                      marginTop: 1,
                    }}
                  >
                    {item.text}
                  </Text>
                </View>
                {item.soon ? <Badge label="Em breve" /> : null}
                {item.href === "/pedidos" && openOrders > 0 ? (
                  <Badge label={String(openOrders)} tone="gold" />
                ) : null}
                {item.soon ? null : (
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                )}
              </Card>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
