import { z } from "zod";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { generateText } from "ai";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import type { StudioImage, StudioImageDTO, StudioUser } from "../database/schema";
import { s3, signGetUrl } from "../lib/s3";
import { gateway } from "../agent/gateway";
import {
  hasUnlimitedCredits,
  hashPassword,
  issueStudioToken,
  studioBase,
  verifyPassword,
} from "../lib/studio-auth";

// ---------- helpers ----------

function publicUser(user: StudioUser) {
  const { passwordHash: _drop, ...rest } = user;
  return rest;
}

async function serializeImage(img: StudioImage): Promise<StudioImageDTO> {
  return { ...img, url: await signGetUrl(img.key) };
}

/** Garante que o projeto existe e pertence ao usuário (proprietário vê todos). */
async function ownedProject(user: StudioUser, projectId: number) {
  const [project] = await db
    .select()
    .from(schema.studioProjects)
    .where(eq(schema.studioProjects.id, projectId));
  if (!project) throw new ORPCError("NOT_FOUND", { message: "Projeto não encontrado." });
  if (project.userId !== user.id && user.role !== "owner") {
    throw new ORPCError("FORBIDDEN", { message: "Este projeto não é seu." });
  }
  return project;
}

async function fetchImageBytes(key: string): Promise<{ data: Uint8Array; mediaType: string }> {
  const res = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  const body = res.Body as { transformToByteArray: () => Promise<Uint8Array> };
  return { data: await body.transformToByteArray(), mediaType: res.ContentType || "image/png" };
}

const STATUSES = [
  "Em criação",
  "Aguardando aprovação",
  "Pronto para gravar",
  "Finalizado",
] as const;

/** Nome reservado do espaço de trabalho rápido (um por usuário). */
export const QUICK_PROJECT_NAME = "Área rápida";

/** Custo em créditos de um comando escrito à mão na caixa de comando. */
export const CUSTOM_COMMAND_CREDITS = 2;

const projectInput = z.object({
  name: z.string().min(1),
  clientName: z.string().optional().nullable(),
  product: z.string().optional().nullable(),
  productModel: z.string().optional().nullable(),
  productColor: z.string().optional().nullable(),
  widthMm: z.number().int().min(1).max(2000),
  heightMm: z.number().int().min(1).max(2000),
  engravingType: z.enum(["frontal", "lateral", "360"]),
  notes: z.string().optional().nullable(),
  status: z.enum(STATUSES).optional(),
});

// ---------- rotas ----------

export const studio = {
  // ===== Autenticação =====
  login: base
    .input(z.object({ email: z.string().min(3), password: z.string().min(1) }))
    .handler(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const [user] = await db
        .select()
        .from(schema.studioUsers)
        .where(eq(schema.studioUsers.email, email));
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new ORPCError("UNAUTHORIZED", { message: "E-mail ou senha inválidos." });
      }
      if (user.blocked) {
        throw new ORPCError("FORBIDDEN", { message: "Seu acesso está bloqueado." });
      }
      await db
        .update(schema.studioUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(schema.studioUsers.id, user.id));
      return { token: issueStudioToken(user.id), user: publicUser(user) };
    }),

  me: studioBase.handler(async ({ context }) => publicUser(context.studioUser)),

  changePassword: studioBase
    .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(4) }))
    .handler(async ({ input, context }) => {
      if (!verifyPassword(input.currentPassword, context.studioUser.passwordHash)) {
        throw new ORPCError("BAD_REQUEST", { message: "Senha atual incorreta." });
      }
      await db
        .update(schema.studioUsers)
        .set({ passwordHash: hashPassword(input.newPassword) })
        .where(eq(schema.studioUsers.id, context.studioUser.id));
      return { ok: true as const };
    }),

  // ===== Catálogo auxiliar (medidas, produtos, estilos) =====
  options: studioBase.handler(async ({ context }) => {
    const isOwner = context.studioUser.role === "owner";
    const [sizes, products, styles] = await Promise.all([
      db.select().from(schema.studioSizes).orderBy(asc(schema.studioSizes.sortOrder)),
      db.select().from(schema.studioProducts).orderBy(asc(schema.studioProducts.sortOrder)),
      db.select().from(schema.studioStyles).orderBy(asc(schema.studioStyles.sortOrder)),
    ]);
    return {
      sizes,
      products,
      // O prompt completo só vai para o navegador do proprietário.
      styles: styles
        .filter((s) => s.active)
        .map((s) => ({
          slug: s.slug,
          name: s.name,
          description: s.description,
          credits: s.credits,
          multiImage: s.multiImage,
          prompt: isOwner ? s.prompt : null,
        })),
      customCommandCredits: CUSTOM_COMMAND_CREDITS,
      statuses: STATUSES,
      aiConfigured: Boolean(process.env.AI_GATEWAY_API_KEY && process.env.AI_GATEWAY_BASE_URL),
    };
  }),

  // ===== Projetos =====
  projects: studioBase.handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(schema.studioProjects)
      .where(eq(schema.studioProjects.userId, context.studioUser.id))
      .orderBy(desc(schema.studioProjects.updatedAt));
    const counts = await db
      .select({
        projectId: schema.studioImages.projectId,
        total: sql<number>`count(*)`,
      })
      .from(schema.studioImages)
      .where(eq(schema.studioImages.userId, context.studioUser.id))
      .groupBy(schema.studioImages.projectId);
    const countMap = new Map(counts.map((c) => [c.projectId, Number(c.total)]));

    // Miniatura: última imagem de cada projeto
    const thumbs = await db
      .select()
      .from(schema.studioImages)
      .where(eq(schema.studioImages.userId, context.studioUser.id))
      .orderBy(desc(schema.studioImages.id));
    const thumbMap = new Map<number, string>();
    for (const t of thumbs) if (!thumbMap.has(t.projectId)) thumbMap.set(t.projectId, t.key);

    return Promise.all(
      rows.map(async (p) => ({
        ...p,
        imageCount: countMap.get(p.id) ?? 0,
        thumbUrl: thumbMap.has(p.id) ? await signGetUrl(thumbMap.get(p.id)!) : null,
      })),
    );
  }),

  project: studioBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input, context }) => {
      const project = await ownedProject(context.studioUser, input.id);
      const images = await db
        .select()
        .from(schema.studioImages)
        .where(eq(schema.studioImages.projectId, project.id))
        .orderBy(asc(schema.studioImages.id));
      return { ...project, images: await Promise.all(images.map(serializeImage)) };
    }),

  /**
   * Área rápida: devolve (criando na primeira vez) o espaço de trabalho pessoal
   * do usuário, para editar imagens sem precisar criar um projeto.
   */
  quickProject: studioBase.handler(async ({ context }) => {
    const [existing] = await db
      .select()
      .from(schema.studioProjects)
      .where(
        and(
          eq(schema.studioProjects.userId, context.studioUser.id),
          eq(schema.studioProjects.name, QUICK_PROJECT_NAME),
        ),
      );
    const project =
      existing ??
      (
        await db
          .insert(schema.studioProjects)
          .values({
            userId: context.studioUser.id,
            name: QUICK_PROJECT_NAME,
            widthMm: 290,
            heightMm: 125,
            engravingType: "frontal",
            status: "Em criação",
            updatedAt: new Date(),
          })
          .returning()
      )[0]!;

    const images = await db
      .select()
      .from(schema.studioImages)
      .where(eq(schema.studioImages.projectId, project.id))
      .orderBy(asc(schema.studioImages.id));
    return { ...project, images: await Promise.all(images.map(serializeImage)) };
  }),

  createProject: studioBase.input(projectInput).handler(async ({ input, context }) => {
    const [created] = await db
      .insert(schema.studioProjects)
      .values({
        ...input,
        status: input.status ?? "Em criação",
        userId: context.studioUser.id,
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }),

  updateProject: studioBase
    .input(projectInput.partial().extend({ id: z.number().int() }))
    .handler(async ({ input, context }) => {
      const { id, ...rest } = input;
      await ownedProject(context.studioUser, id);
      const [updated] = await db
        .update(schema.studioProjects)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(schema.studioProjects.id, id))
        .returning();
      return updated;
    }),

  duplicateProject: studioBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input, context }) => {
      const project = await ownedProject(context.studioUser, input.id);
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = project;
      const [copy] = await db
        .insert(schema.studioProjects)
        .values({
          ...rest,
          userId: context.studioUser.id,
          name: `${project.name} (cópia)`,
          status: "Em criação",
          updatedAt: new Date(),
        })
        .returning();
      // Copia as referências de imagem (mesmos arquivos no storage)
      const images = await db
        .select()
        .from(schema.studioImages)
        .where(eq(schema.studioImages.projectId, project.id));
      if (images.length > 0) {
        await db.insert(schema.studioImages).values(
          images.map((img) => ({
            projectId: copy.id,
            userId: context.studioUser.id,
            key: img.key,
            kind: img.kind,
            styleSlug: img.styleSlug,
            styleName: img.styleName,
            creditsUsed: 0,
          })),
        );
      }
      return copy;
    }),

  deleteProject: studioBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input, context }) => {
      const project = await ownedProject(context.studioUser, input.id);
      await db.delete(schema.studioImages).where(eq(schema.studioImages.projectId, project.id));
      await db.delete(schema.studioProjects).where(eq(schema.studioProjects.id, project.id));
      return { ok: true as const };
    }),

  // ===== Imagens =====
  /** URL assinada para o navegador enviar o arquivo direto ao storage. */
  presignUpload: studioBase
    .input(z.object({ filename: z.string(), contentType: z.string() }))
    .handler(async ({ input, context }) => {
      const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `studio/${context.studioUser.id}/${Date.now()}-${safe}`;
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          ContentType: input.contentType,
        }),
        { expiresIn: 600 },
      );
      return { uploadUrl, key };
    }),

  addImage: studioBase
    .input(z.object({ projectId: z.number().int(), key: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      await ownedProject(context.studioUser, input.projectId);
      // Só aceita chaves da própria pasta do usuário
      if (!input.key.startsWith(`studio/${context.studioUser.id}/`)) {
        throw new ORPCError("FORBIDDEN", { message: "Arquivo inválido." });
      }
      const [created] = await db
        .insert(schema.studioImages)
        .values({
          projectId: input.projectId,
          userId: context.studioUser.id,
          key: input.key,
          kind: "upload",
        })
        .returning();
      await db
        .update(schema.studioProjects)
        .set({ updatedAt: new Date() })
        .where(eq(schema.studioProjects.id, input.projectId));
      return serializeImage(created);
    }),

  deleteImage: studioBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input, context }) => {
      const [img] = await db
        .select()
        .from(schema.studioImages)
        .where(eq(schema.studioImages.id, input.id));
      if (!img) throw new ORPCError("NOT_FOUND", { message: "Imagem não encontrada." });
      if (img.userId !== context.studioUser.id && context.studioUser.role !== "owner") {
        throw new ORPCError("FORBIDDEN", { message: "Esta imagem não é sua." });
      }
      await db.delete(schema.studioImages).where(eq(schema.studioImages.id, img.id));
      // Remove do storage se nenhum outro registro usa a mesma chave
      const [still] = await db
        .select({ total: sql<number>`count(*)` })
        .from(schema.studioImages)
        .where(eq(schema.studioImages.key, img.key));
      if (Number(still?.total ?? 0) === 0) {
        try {
          await s3.send(
            new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: img.key }),
          );
        } catch {
          /* arquivo já removido */
        }
      }
      return { ok: true as const };
    }),

  // ===== Processamento por IA =====
  generate: studioBase
    .input(
      z.object({
        projectId: z.number().int(),
        /** Estilo pronto. Pode vir vazio quando o usuário escreve o comando na mão. */
        styleSlug: z.string().min(1).optional().nullable(),
        /** Comando livre digitado na caixa de comando do Studio. */
        customPrompt: z.string().max(4000).optional().nullable(),
        imageIds: z.array(z.number().int()).min(1),
      }),
    )
    .handler(async ({ input, context }) => {
      const user = context.studioUser;
      const project = await ownedProject(user, input.projectId);
      const custom = (input.customPrompt ?? "").trim();
      if (!input.styleSlug && custom.length < 5) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Escreva o comando para a IA (pelo menos algumas palavras).",
        });
      }

      if (!process.env.AI_GATEWAY_API_KEY || !process.env.AI_GATEWAY_BASE_URL) {
        throw new ORPCError("SERVICE_UNAVAILABLE", {
          message:
            "A integração de IA não está configurada no servidor. O proprietário precisa definir AI_GATEWAY_BASE_URL e AI_GATEWAY_API_KEY.",
        });
      }

      let style: typeof schema.studioStyles.$inferSelect | undefined;
      if (input.styleSlug) {
        [style] = await db
          .select()
          .from(schema.studioStyles)
          .where(eq(schema.studioStyles.slug, input.styleSlug));
        if (!style || !style.active) {
          throw new ORPCError("NOT_FOUND", { message: "Estilo não encontrado." });
        }
      }

      // Comando livre (sem estilo) custa CUSTOM_COMMAND_CREDITS
      const cost = style ? style.credits : CUSTOM_COMMAND_CREDITS;
      const styleName = style ? style.name : "Comando livre";
      const styleSlug = style ? style.slug : "comando-livre";
      const allowMulti = style ? style.multiImage : true;

      const unlimited = hasUnlimitedCredits(user);
      if (!unlimited && user.credits < cost) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Créditos insuficientes. Este comando custa ${cost} crédito(s) e você tem ${user.credits}.`,
        });
      }

      // Carrega só imagens do próprio usuário e do projeto
      const rows = await db
        .select()
        .from(schema.studioImages)
        .where(
          and(
            eq(schema.studioImages.projectId, project.id),
            eq(schema.studioImages.userId, project.userId),
          ),
        );
      const selected = rows.filter((r) => input.imageIds.includes(r.id));
      if (selected.length === 0) {
        throw new ORPCError("BAD_REQUEST", { message: "Selecione ao menos uma imagem." });
      }
      if (!allowMulti && selected.length > 1) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Este estilo trabalha com uma imagem por vez.",
        });
      }

      const images = await Promise.all(selected.map((s) => fetchImageBytes(s.key)));

      // Monta o comando final. O prompt guardado no estilo nunca sai do servidor
      // para usuários beta: o texto extra deles entra como ajuste.
      let finalPrompt: string;
      if (style && custom) {
        finalPrompt =
          user.role === "owner"
            ? custom
            : `${style.prompt}\n\nAjustes pedidos pelo usuário (respeite-os): ${custom}`;
      } else if (style) {
        finalPrompt = style.prompt;
      } else {
        finalPrompt = custom;
      }

      const sizeHint = `Mantenha exatamente o mesmo enquadramento, proporção e formato da imagem enviada: não recorte, não gire, não adicione bordas nem barras, e mantenha o assunto na mesma posição. Gere em altíssima resolução, no mínimo 4K (lado maior com 3840 px ou mais), com bordas nítidas, traços limpos e sem compressão visível. A peça de destino tem ${project.widthMm}mm por ${project.heightMm}mm — use apenas como referência de nitidez, sem alterar a proporção da foto.`;

      let file;
      try {
        const result = await generateText({
          model: gateway("google/gemini-3-pro-image"),
          providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: `${finalPrompt}\n\n${sizeHint}` },
                ...images.map((img) => ({
                  type: "file" as const,
                  data: img.data,
                  mediaType: img.mediaType,
                })),
              ],
            },
          ],
        });
        file = result.files?.find((f) => f.mediaType?.startsWith("image/"));
      } catch {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Falha ao falar com o serviço de IA. Tente novamente.",
        });
      }

      if (!file) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "A IA não retornou uma imagem. Tente novamente.",
        });
      }

      const key = `studio/${user.id}/gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: Buffer.from(file.uint8Array),
          ContentType: file.mediaType || "image/png",
        }),
      );

      // Debita crédito só depois do sucesso
      let balanceAfter: number | null = null;
      if (!unlimited) {
        balanceAfter = Math.max(0, user.credits - cost);
        await db
          .update(schema.studioUsers)
          .set({ credits: balanceAfter, creditsUsed: user.creditsUsed + cost })
          .where(eq(schema.studioUsers.id, user.id));
      }
      await db.insert(schema.studioCreditLog).values({
        userId: user.id,
        projectId: project.id,
        styleSlug,
        amount: unlimited ? 0 : cost,
        balanceAfter,
        note: unlimited ? `Proprietário (ilimitado) · ${styleName}` : styleName,
      });

      const [created] = await db
        .insert(schema.studioImages)
        .values({
          projectId: project.id,
          userId: user.id,
          key,
          kind: "generated",
          styleSlug,
          styleName,
          creditsUsed: unlimited ? 0 : cost,
          sourceImageId: selected[0]?.id ?? null,
        })
        .returning();

      await db
        .update(schema.studioProjects)
        .set({ updatedAt: new Date() })
        .where(eq(schema.studioProjects.id, project.id));

      return {
        image: await serializeImage(created),
        creditsLeft: unlimited ? null : balanceAfter,
      };
    }),

  // ===== Feedback =====
  sendFeedback: studioBase
    .input(
      z.object({
        feature: z.string().optional().nullable(),
        problem: z.string().optional().nullable(),
        suggestion: z.string().optional().nullable(),
        imageKey: z.string().optional().nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!input.problem?.trim() && !input.suggestion?.trim()) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Descreva o problema ou envie uma sugestão.",
        });
      }
      await db.insert(schema.studioFeedback).values({
        userId: context.studioUser.id,
        userName: context.studioUser.name,
        feature: input.feature ?? null,
        problem: input.problem ?? null,
        suggestion: input.suggestion ?? null,
        imageKey: input.imageKey ?? null,
      });
      return { ok: true as const };
    }),
};
