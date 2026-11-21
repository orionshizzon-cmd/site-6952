# Cadastro de produtos Rafa Laser pelo ChatGPT

Um GPT privado pode chamar `POST /api/chatgpt/products` para cadastrar um novo rascunho com pelo menos uma foto. A API usa as tabelas existentes no Turso e grava fotos novas no Tigris com nomes exclusivos. O preço é um inteiro em centavos de real. Use `null` para “Sob consulta”. A categoria é opcional e, quando informada, precisa existir.

Cada criação retorna `id`, `slug` e `active: false`. O painel administrativo exibe o rascunho. Se o slug já existir, a API retorna `409` antes de buscar fotos. Alterações de produtos continuam disponíveis pelo painel administrativo.

## Primeiro teste controlado

1. Antes de autorizar a publicação, confirme que o ambiente de destino tem `ADMIN_SESSION_SECRET` ou `BETTER_AUTH_SECRET` configurado. Verifique o login administrativo, o catálogo ativo, o fluxo de pedidos e a visualização das fotos existentes. A integração reutiliza o esquema atual e dispensa migração.
2. Gere uma credencial exclusiva com `openssl rand -hex 32`. Após autorização, salve-a no ambiente da API como `CHATGPT_PRODUCTS_TOKEN`. A rota fica desativada sem esse token ou sem um segredo de sessão administrativa configurado. Para desativá-la, remova o token da integração.
3. Importe [chatgpt-products.openapi.json](chatgpt-products.openapi.json) nas Actions de um GPT com visibilidade **Somente eu**. Troque `servers` pela URL HTTPS autorizada e use **API Key** do tipo **Bearer** com a mesma credencial. Peça ao GPT que confirme o slug e os dados com o operador antes de criar.
4. Anexe uma foto própria de teste. Use um slug exclusivo, como `teste-chatgpt-copo-01`. Confirme a gravação e verifique o retorno `201` com `active: false`, a foto no painel e a ausência do produto na vitrine. Repetir o mesmo slug deve retornar `409`. A antiga rota de atualização deve retornar `404`.

A API aceita até quatro fotos estáticas JPEG, PNG ou WebP de 8 MiB e 25 megapixels cada. A primeira é a capa. A API baixa somente links HTTPS de `files.oaiusercontent.com`, sem seguir redirecionamentos, e regrava as imagens em WebP sem metadados. Se a gravação do produto falhar depois do upload, pode sobrar um arquivo no prefixo `catalog/chatgpt/`. Preserve os arquivos referenciados ao fazer limpeza. [Formato dos anexos do ChatGPT](https://platform.openai.com/docs/actions/sending-files)
