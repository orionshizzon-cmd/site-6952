# Cadastro de produtos Rafa Laser pelo ChatGPT

A integração usa um GPT privado com Actions. O cadastro usa a tabela `products` do Turso e o bucket Tigris já usados pelo painel. A capacidade, o material e as características entram na ficha técnica existente. O preço é um inteiro em centavos de real. Use `null` para “Sob consulta”.

- `POST /api/chatgpt/products` cria um rascunho com pelo menos uma foto. O slug deve ser único. Uma tentativa repetida com o mesmo slug retorna `409`.
- `POST /api/chatgpt/products/{slug}/update` aceita somente rascunhos e preserva os campos omitidos. Ao enviar fotos novas, a primeira substitui a capa e as demais substituem a galeria.
- Ambos retornam `id`, `slug` e `active: false`. O painel administrativo exibe os rascunhos e permite revisá-los.
- A categoria é opcional na criação. Use uma categoria existente ou deixe o produto em “Sem categoria”.

## Configuração em homologação

1. Use um ambiente HTTPS com banco Turso e bucket Tigris privado separados da produção. Configure as variáveis de banco e armazenamento já usadas pelo site. O painel requer `ADMIN_SESSION_SECRET` ou `BETTER_AUTH_SECRET` para assinar sessões.
2. Gere uma credencial com `openssl rand -hex 32` e salve-a como `CHATGPT_PRODUCTS_TOKEN` no ambiente da API. Sem a credencial configurada, as rotas ficam desativadas. Para revogar o acesso, remova ou substitua a credencial.
3. Importe [chatgpt-products.openapi.json](chatgpt-products.openapi.json) nas Actions de um GPT privado e troque o endereço em `servers` pela URL HTTPS de homologação. Selecione autenticação **API Key** do tipo **Bearer** e use a mesma credencial.
4. Nas instruções do GPT, peça que ele confirme o slug e os dados com o operador, peça fotos se faltarem na criação e envie somente os campos solicitados na atualização. Se um dado comercial estiver faltando, peça que o operador o informe. As duas Actions exigem confirmação do usuário antes de gravar.
5. Anexe uma foto JPEG, PNG ou WebP à conversa, informe os dados e confira no painel que o produto foi salvo como inativo. Teste uma alteração de preço ou material e confirme que a vitrine continua sem o produto.

A API baixa apenas links HTTPS de `files.oaiusercontent.com`, sem seguir redirecionamentos. Ela aceita até quatro fotos estáticas de 8 MiB e 25 megapixels cada. As imagens são regravadas em WebP sem metadados, com até 2.000 pixels por lado. Se a gravação do produto falhar depois de uma foto ser armazenada, a foto pode permanecer no bucket, com nome derivado do conteúdo. Ao fazer limpeza do armazenamento, preserve os arquivos referenciados no catálogo.

O formato dos anexos e o prazo de validade dos links são definidos pelo ChatGPT. [Documentação da OpenAI sobre envio de arquivos](https://platform.openai.com/docs/actions/sending-files)
