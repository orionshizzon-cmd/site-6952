import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { errorMessage } from "@/lib/format";
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
} from "@/components/ui";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
} from "@/queries/categories";
import { useAdminProducts } from "@/queries/products";

export default function CategoriesScreen() {
  const colors = useColors();
  const categories = useCategories();
  const products = useAdminProducts();
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const remove = useDeleteCategory();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = categories.data ?? [];
  const countByCat = (name: string) =>
    (products.data ?? []).filter((p) => p.category === name).length;

  async function handleCreate() {
    setError(null);
    const name = newName.trim();
    if (!name) return;
    try {
      await create.mutateAsync(name);
      setNewName("");
    } catch (e) {
      setError(errorMessage(e, "Não foi possível criar. Talvez a categoria já exista."));
    }
  }

  async function handleRename(id: number) {
    setError(null);
    const name = editValue.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    try {
      await rename.mutateAsync({ id, name });
      setEditingId(null);
    } catch (e) {
      setError(errorMessage(e, "Não foi possível renomear. Verifique se o nome já existe."));
    }
  }

  return (
    <Screen>
      <Header back title="Categorias" subtitle={`${list.length} cadastradas`} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 46, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 10 }}>
          <Field
            label="Nova categoria"
            value={newName}
            onChangeText={setNewName}
            placeholder="Ex.: Chaveiros"
          />
          <Button
            label="Adicionar"
            icon="add"
            variant="gold"
            loading={create.isPending}
            onPress={handleCreate}
          />
        </Card>

        <ErrorNote message={error} />

        {categories.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty
            icon="pricetags-outline"
            title="Nenhuma categoria"
            text="Crie a primeira no campo acima."
          />
        ) : (
          list.map((c) => (
            <Card key={c.id} style={{ gap: 10 }}>
              {editingId === c.id ? (
                <>
                  <Field label="Novo nome" value={editValue} onChangeText={setEditValue} />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button
                      label="Salvar"
                      variant="gold"
                      loading={rename.isPending}
                      onPress={() => handleRename(c.id)}
                      style={{ flex: 1, paddingVertical: 10 }}
                    />
                    <Button
                      label="Cancelar"
                      variant="outline"
                      onPress={() => setEditingId(null)}
                      style={{ flex: 1, paddingVertical: 10 }}
                    />
                  </View>
                </>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{ fontFamily: Fonts.semibold, fontSize: 14.5, color: colors.foreground }}
                    >
                      {c.name}
                    </Text>
                    <Badge label={`${countByCat(c.name)} produto(s)`} />
                  </View>
                  <IconButton
                    icon="create-outline"
                    onPress={() => {
                      setEditingId(c.id);
                      setEditValue(c.name);
                      setError(null);
                    }}
                  />
                  <IconButton
                    icon="trash-outline"
                    color={colors.destructive}
                    onPress={() => setConfirmId(c.id)}
                  />
                </View>
              )}

              {confirmId === c.id ? (
                <ConfirmRow
                  question={
                    countByCat(c.name) > 0
                      ? `Excluir "${c.name}"? ${countByCat(c.name)} produto(s) vão para "Sem categoria".`
                      : `Excluir a categoria "${c.name}"?`
                  }
                  confirmLabel="Excluir"
                  loading={remove.isPending}
                  onCancel={() => setConfirmId(null)}
                  onConfirm={async () => {
                    try {
                      await remove.mutateAsync(c.id);
                    } catch (e) {
                      setError(errorMessage(e, "Não foi possível excluir."));
                    }
                    setConfirmId(null);
                  }}
                />
              ) : null}
            </Card>
          ))
        )}

        <Text
          style={{ fontFamily: Fonts.sans, fontSize: 11.5, color: colors.mutedForeground }}
        >
          Renomear atualiza todos os produtos da categoria. Excluir move os produtos para "Sem
          categoria".
        </Text>
      </ScrollView>
    </Screen>
  );
}
