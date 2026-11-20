# Rafa Laser — Fase 2 do RAFA CATALOG AI

App: /home/user/rafa-laser · dev tmux `dev` porta 4200 · deliver: website /home/user/rafa-laser :4200

## Escopo aprovado pelo usuário
- Busca automática de preço (Mercado Livre, Shopee, Amazon) — por produto, sob demanda
- Alertas de oportunidade (produto muito abaixo do mercado)
- Cadastro de fornecedor: estoque, frete, prazo
- NÃO fazer: busca em massa, reconferência semanal automática
- Quando a busca falhar, a tela precisa avisar; preço manual continua

## Decisão técnica
Scraping direto é bloqueado (ML 403, Amazon 503, Shopee 403, lista.ML "suspicious-traffic").
Solução: `perplexity/sonar` via AI Gateway — `generateObject` TESTADO E FUNCIONANDO
(devolveu anúncios reais do ML com link e preço). Probe já apagado.

## Progresso
- [x] schema.ts: coluna `source` em catalog_market_prices, tabela `catalog_suppliers`,
      tipo `CatalogSupplier`, `isOpportunity`/`opportunityPct` em `CatalogMath`
- [x] catalog-math.ts: calcula oportunidade em `computeMath` (>= +100% sobre custo real)
      e bônus no `scoreProduct`
- [x] catalog-search.ts (NOVO): `searchMarketPrices(product)` → {results, notFoundStores, note, error}
      nunca lança; normaliza nome de loja; preços em REAIS (converter p/ centavos na rota)
- [x] catalog.ts: helper `refreshMarketAggregates(productId)` extraído + usado no addMarketPrice
- [x] catalog.ts: procedures `searchPrices`, `opportunities`, `suppliers`, `saveSupplier`, `deleteSupplier`
- [x] addMarketPrice grava `source: "manual"`
- [x] MIGRAÇÃO no banco (APLICADA, script apagado) (db:push quebrado — usar script temp `packages/web/mig-x.ts`
      rodado de /home/user/rafa-laser com `bun run packages/web/mig-x.ts`, DEPOIS APAGAR):
      ALTER TABLE catalog_market_prices ADD COLUMN source text NOT NULL DEFAULT 'manual';
      CREATE TABLE catalog_suppliers (...)
- [x] queries/catalog.ts: useSearchPrices, useOpportunities, useSuppliers, useSaveSupplier, useDeleteSupplier
- [x] admin-catalog.tsx: botão "Buscar preços na internet" no ProductModal (spinner + erro claro),
      badge auto/manual, aba "Oportunidades", aba "Fornecedores"
- [x] Remover aviso de rodapé que diz que a busca automática ficou p/ fase 2
- [x] typecheck → build → testar no navegador (PDF teste, buscar preços, mobile 390x844)
- [x] LIMPAR dados de teste do banco → deliver

## Avisos ao entregar
- Busca usa IA com acesso à web (Perplexity Sonar) porque as lojas bloqueiam acesso direto;
  pode falhar/vir incompleta e nesses casos a tela avisa e o manual continua.
- Cada busca consome créditos do AI Gateway (uma por produto, sob demanda).

## Pendências conhecidas (pré-existentes, já comunicadas 2x)
- `bun run lint`: 2 erros em arquivos não tocados (api/routes/issuer.ts, mobile/app/_layout.tsx)
- `bun run db:push` quebrado: SQLITE_UNKNOWN no such index studio_styles_slug_unique

## Depois da Fase 2 do Catalog: Fase 2 do Studio (editor de imagem + mockup 360°)
Aviso a remover no fim de packages/web/src/web/pages/studio-project.tsx

## Fase 2 do Catalog AI — CONCLUÍDA E VERIFICADA (2026-09-09)
- searchPrices testado no produto 299 (Balança de cozinha 10kg, catálogo Btop):
  3 anúncios reais gravados (2 Mercado Livre + 1 Shopee), Amazon sem resultado e avisada na tela.
  Nota recalculada de 84 -> 71 (mercado mostrou que o preço do fornecedor está acima do máx. recomendado).
- suppliers CRUD testado por curl e o fornecedor de teste foi APAGADO (tabela vazia).
- opportunities responde OK (0 no momento — nenhum produto com mercado >= 2x o custo real).
- UI conferida no navegador: 7 abas, badge AUTOMÁTICO/MANUAL, aba Fornecedores, mobile 390x844.
- ATENÇÃO: catálogo id 5 "Alex acessório" está preso em "analisando" (upload anterior do usuário).
