# Rafa Laser — Design System

Marca: **Rafa Laser** (Rafart Stores) — gravação a laser e presentes personalizados em Imperatriz-MA.
Slogan: "Personalizando momentos, criando memórias."
Idioma: 100% Português do Brasil (pt-BR). Moeda R$, datas DD/MM/AAAA, fuso America/Fortaleza.

## Conceito
Premium, tecnológico, preciso, acabamento profissional. Página **clara** (fundo claro) com tipografia
forte em preto, detalhes em **dourado metálico** e verde do WhatsApp apenas nos CTAs de contato.
Logo da marca aparece como marca d'água **girando lentamente no próprio eixo** em todas as páginas.

## Cores (CSS vars)
- `--background`: #F6F5F2 (off-white quente, claro)
- `--surface`: #FFFFFF (cartões)
- `--foreground`: #0E0E0F (quase preto)
- `--muted-foreground`: #6B6B6E (cinza)
- `--line`: #E4E2DC (bordas)
- `--gold`: #C9A24B (dourado metálico — CTA principal, destaques)
- `--gold-soft`: #E7CE8F (dourado claro para gradientes)
- `--ink`: #141416 (seções escuras de contraste)
- `--whats`: #25D366 (verde WhatsApp)
- Vermelho escuro alternativo de marca: #7A1F23 (usar com moderação em detalhes)

Gradiente dourado de texto: `linear-gradient(90deg,#B8863B,#E7CE8F,#B8863B)`.

## Tipografia
- Display / títulos: **Sora** (700/600) — geométrica, moderna, premium.
- Corpo / UI: **Manrope** (400/500/600).
- Títulos grandes com letter-spacing levemente negativo; labels em caixa alta com tracking amplo.
- Números/preços não usados (fluxo de orçamento) — usar "Sob consulta".

## Layout
- Container máx. 1200px, respiros generosos.
- Header fixo translúcido (blur) com logo à esquerda, navegação central, ícone do carrinho com badge à direita.
- Seções alternando fundo claro e uma seção escura (--ink) para contraste e destaque da máquina fiber laser.
- Cards de produto: fundo branco, borda sutil, cantos suaves (radius 16px), imagem 1:1, hover eleva e realça borda dourada.

## Marca d'água (logo girando)
- `/images/logo-black.png` posicionado central, grande, opacidade ~0.04–0.06, `animation: spin 60s linear infinite`.
- Fica atrás do conteúdo (z-index negativo / pointer-events none), presente em todas as páginas via Layout.

## Motion
- Revelação de entrada com stagger (Motion / framer-motion) no hero e nas grades.
- Hover suave (translateY -4px) nos cards e botões.
- Respeitar prefers-reduced-motion.

## Componentes-chave
- Botão primário: fundo dourado, texto quase preto; secundário: contorno preto.
- Botão WhatsApp: verde --whats com ícone.
- Badge de status de pedido (pt-BR): Aguardando resposta, Em produção, Finalizado, etc.
- Modal de personalização: cor (swatches), texto de gravação, fonte da gravação, upload de foto/logo, quantidade, observações.

## Páginas
1. `/` Início — hero, destaques, categorias, máquina fiber laser, como funciona, CTA.
2. `/produtos` — catálogo com filtro por categoria + personalização/adição ao carrinho.
3. `/localizacao` — endereço, mapa, horários, WhatsApp, Instagram @rafart.itz.
4. `/carrinho` — carrinho de orçamento + envio do pedido por WhatsApp (e registro no sistema).

## Contatos
- WhatsApp: (99) 99155-3836 → link wa.me/5599991553836
- Instagram: @rafart.itz → https://instagram.com/rafart.itz
- Endereço: Rua Principal, 173, Parque Vitória, Imperatriz - MA

## Personalização inteligente
- Integrar `/personalizar` e `/admin/personalizacoes` sem reconstruir o catálogo ou carrinho. Atualização aprovada: fila direta, não fluxo de leitura de códigos.
- Branco, preto, grafite #252525 e dourado #D4AF37; UI Manrope e títulos Sora.
- Quatro etapas com editor e prévia vetorial em colunas assimétricas; pilha única no celular.
- Prévia em preto/branco sem textura simulada; sete fontes OFL locais com os mesmos caminhos na exportação.
- Arial do dispositivo explicitamente sem exportação independente até receber arquivo licenciado.
- Produção: foco no leitor, identificador legível, tabela compacta, exportação manual com dimensões em mm.
- QR e Code 128 sempre pretos sobre branco, preservando margens de leitura.
- Novo fluxo: Nome → Fonte → Conferir → Enviado. QR somente para abrir a página pública; pedidos sem códigos de barras na UI.
- Biblioteca de 52 fontes com licenças OFL/Apache para uso comercial, peso regular estático, filtros em chips, busca e favoritas locais.
- Ampliação aprovada: Arimo, Berkshire Swash, Pinyon Script, Italianno, Tangerine, Beau Rivage, Luxurious Script, Imperial Script, Kaushan Script, Yellowtail, Marck Script e Rock Salt. Usar os nomes reais; Arimo é alternativa à Arial, sem substituição silenciosa em pedidos antigos.
- Central com indicadores, fila cronológica, estados visuais e download individual/ZIP sem redigitação.
- Prévia e SVG usam o mesmo layout com substituições/posicionamento OpenType; avisar traços delicados.
- Configuração de produção com largura máxima, escala, centralização, margem e presets persistentes por produto.
- A biblioteca abre em “Estilos diferentes”: 12 opções contrastantes, sem a sequência de fontes básicas sem serifa. As 52 opções permanecem em “Todas”; busca pesquisa o catálogo completo. Great Vibes é a seleção inicial.

## Revisão da seleção de fontes
- A biblioteca agora abre em “Todas”, primeira aba, com 42 opções disponíveis.
- Montserrat, Poppins, Inter, Raleway, Roboto, Open Sans, Lato, Nunito, Rubik e Oswald foram retiradas da seleção de novos pedidos. Arquivos e resolução por ID permanecem para preservar prévias e SVGs de pedidos antigos.

## Referência na peça — etapa Confira
- Modelos genéricos ilustrativos de garrafa térmica e copo térmico, com a mesma prévia vetorial da fonte escolhida.
- Horizontal ou vertical: vertical gira o nome inteiro em 90°, sem empilhar letras.
- Escolhas salvas no pedido e exibidas no acompanhamento e na central como referência de produção.
- Dimensões e posição finais são conferidas pela equipe; o SVG permanece separado, sem rotação automática.
- Pedidos anteriores sem referência mantêm seus dados e mostram indicação explícita na fila.

## Vídeos promocionais nos banners
- Upload e troca de vídeos na aba Banners do admin, reutilizando storage e galeria existentes.
- Vídeos da home reproduzem automaticamente, sem som e em loop, com controles disponíveis para pausar.
- Manter enquadramento integral dos produtos e banners antigos; não substituir mídia real por IA sem aprovação.
- Roteiro IA aprovado: 8 segundos, garrafa azul, chaveiro com foto, canivete fechado e composição final; geração bloqueada por exigência de plano pago.
