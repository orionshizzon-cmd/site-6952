export type EngravingFont = {id:string;name:string;category:string;style:string;file:string|null;warning:string};
const allEngravingFonts: EngravingFont[] = [
  {
    "id": "montserrat",
    "name": "Montserrat",
    "category": "Modernas",
    "style": "Modernas",
    "file": "montserrat.ttf",
    "warning": ""
  },
  {
    "id": "poppins",
    "name": "Poppins",
    "category": "Modernas",
    "style": "Modernas",
    "file": "poppins.ttf",
    "warning": ""
  },
  {
    "id": "inter",
    "name": "Inter",
    "category": "Modernas",
    "style": "Modernas",
    "file": "inter.ttf",
    "warning": ""
  },
  {
    "id": "raleway",
    "name": "Raleway",
    "category": "Modernas",
    "style": "Modernas",
    "file": "raleway.ttf",
    "warning": ""
  },
  {
    "id": "roboto",
    "name": "Roboto",
    "category": "Modernas",
    "style": "Modernas",
    "file": "roboto.ttf",
    "warning": ""
  },
  {
    "id": "opensans",
    "name": "Open Sans",
    "category": "Modernas",
    "style": "Modernas",
    "file": "opensans.ttf",
    "warning": ""
  },
  {
    "id": "lato",
    "name": "Lato",
    "category": "Modernas",
    "style": "Modernas",
    "file": "lato.ttf",
    "warning": ""
  },
  {
    "id": "nunito",
    "name": "Nunito",
    "category": "Modernas",
    "style": "Modernas",
    "file": "nunito.ttf",
    "warning": ""
  },
  {
    "id": "rubik",
    "name": "Rubik",
    "category": "Modernas",
    "style": "Modernas",
    "file": "rubik.ttf",
    "warning": ""
  },
  {
    "id": "oswald",
    "name": "Oswald",
    "category": "Modernas",
    "style": "Modernas",
    "file": "oswald.ttf",
    "warning": ""
  },
  {
    "id": "playfairdisplay",
    "name": "Playfair Display",
    "category": "Elegantes e clássicas",
    "style": "Elegantes e clássicas",
    "file": "playfairdisplay.ttf",
    "warning": ""
  },
  {
    "id": "cinzel",
    "name": "Cinzel",
    "category": "Elegantes e clássicas",
    "style": "Elegantes e clássicas",
    "file": "cinzel.ttf",
    "warning": ""
  },
  {
    "id": "cormorantgaramond",
    "name": "Cormorant Garamond",
    "category": "Elegantes e clássicas",
    "style": "Elegantes e clássicas",
    "file": "cormorantgaramond.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "librebaskerville",
    "name": "Libre Baskerville",
    "category": "Elegantes e clássicas",
    "style": "Elegantes e clássicas",
    "file": "librebaskerville.ttf",
    "warning": ""
  },
  {
    "id": "merriweather",
    "name": "Merriweather",
    "category": "Elegantes e clássicas",
    "style": "Elegantes e clássicas",
    "file": "merriweather.ttf",
    "warning": ""
  },
  {
    "id": "bodonimoda",
    "name": "Bodoni Moda",
    "category": "Elegantes e clássicas",
    "style": "Elegantes e clássicas",
    "file": "bodonimoda.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "prata",
    "name": "Prata",
    "category": "Elegantes e clássicas",
    "style": "Elegantes e clássicas",
    "file": "prata.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "abrilfatface",
    "name": "Abril Fatface",
    "category": "Elegantes e clássicas",
    "style": "Elegantes e clássicas",
    "file": "abrilfatface.ttf",
    "warning": ""
  },
  {
    "id": "greatvibes",
    "name": "Great Vibes",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "greatvibes.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "alexbrush",
    "name": "Alex Brush",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "alexbrush.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "allura",
    "name": "Allura",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "allura.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "parisienne",
    "name": "Parisienne",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "parisienne.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "sacramento",
    "name": "Sacramento",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "sacramento.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "dancingscript",
    "name": "Dancing Script",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "dancingscript.ttf",
    "warning": "Letras conectadas: confira a largura e o acabamento antes de gravar."
  },
  {
    "id": "pacifico",
    "name": "Pacifico",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "pacifico.ttf",
    "warning": "Letras conectadas: confira a largura e o acabamento antes de gravar."
  },
  {
    "id": "lobster",
    "name": "Lobster",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "lobster.ttf",
    "warning": "Letras conectadas: confira a largura e o acabamento antes de gravar."
  },
  {
    "id": "satisfy",
    "name": "Satisfy",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "satisfy.ttf",
    "warning": "Letras conectadas: confira a largura e o acabamento antes de gravar."
  },
  {
    "id": "caveat",
    "name": "Caveat",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "caveat.ttf",
    "warning": "Letras conectadas: confira a largura e o acabamento antes de gravar."
  },
  {
    "id": "kalam",
    "name": "Kalam",
    "category": "Cursivas e caligráficas",
    "style": "Cursivas e caligráficas",
    "file": "kalam.ttf",
    "warning": "Letras conectadas: confira a largura e o acabamento antes de gravar."
  },
  {
    "id": "bebasneue",
    "name": "Bebas Neue",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "bebasneue.ttf",
    "warning": ""
  },
  {
    "id": "anton",
    "name": "Anton",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "anton.ttf",
    "warning": ""
  },
  {
    "id": "bangers",
    "name": "Bangers",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "bangers.ttf",
    "warning": ""
  },
  {
    "id": "blackopsone",
    "name": "Black Ops One",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "blackopsone.ttf",
    "warning": ""
  },
  {
    "id": "russoone",
    "name": "Russo One",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "russoone.ttf",
    "warning": ""
  },
  {
    "id": "orbitron",
    "name": "Orbitron",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "orbitron.ttf",
    "warning": ""
  },
  {
    "id": "audiowide",
    "name": "Audiowide",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "audiowide.ttf",
    "warning": ""
  },
  {
    "id": "permanentmarker",
    "name": "Permanent Marker",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "permanentmarker.ttf",
    "warning": ""
  },
  {
    "id": "specialelite",
    "name": "Special Elite",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "specialelite.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "rye",
    "name": "Rye",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "rye.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
  {
    "id": "frederickathegreat",
    "name": "Fredericka the Great",
    "category": "Fortes e decorativas",
    "style": "Fortes e decorativas",
    "file": "frederickathegreat.ttf",
    "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
  },
{
  "id": "arimo",
  "name": "Arimo",
  "category": "Modernas",
  "style": "Modernas",
  "file": "arimo.ttf",
  "warning": ""
},
{
  "id": "pinyonscript",
  "name": "Pinyon Script",
  "category": "Cursivas e caligráficas",
  "style": "Cursivas e caligráficas",
  "file": "pinyonscript.ttf",
  "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
},
{
  "id": "italianno",
  "name": "Italianno",
  "category": "Cursivas e caligráficas",
  "style": "Cursivas e caligráficas",
  "file": "italianno.ttf",
  "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
},
{
  "id": "tangerine",
  "name": "Tangerine",
  "category": "Cursivas e caligráficas",
  "style": "Cursivas e caligráficas",
  "file": "tangerine.ttf",
  "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
},
{
  "id": "beaurivage",
  "name": "Beau Rivage",
  "category": "Cursivas e caligráficas",
  "style": "Cursivas e caligráficas",
  "file": "beaurivage.ttf",
  "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
},
{
  "id": "luxuriousscript",
  "name": "Luxurious Script",
  "category": "Cursivas e caligráficas",
  "style": "Cursivas e caligráficas",
  "file": "luxuriousscript.ttf",
  "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
},
{
  "id": "imperialscript",
  "name": "Imperial Script",
  "category": "Cursivas e caligráficas",
  "style": "Cursivas e caligráficas",
  "file": "imperialscript.ttf",
  "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
},
{
  "id": "kaushanscript",
  "name": "Kaushan Script",
  "category": "Cursivas e caligráficas",
  "style": "Cursivas e caligráficas",
  "file": "kaushanscript.ttf",
  "warning": ""
},
{
  "id": "yellowtail",
  "name": "Yellowtail",
  "category": "Cursivas e caligráficas",
  "style": "Cursivas e caligráficas",
  "file": "yellowtail.ttf",
  "warning": ""
},
{
  "id": "marckscript",
  "name": "Marck Script",
  "category": "Cursivas e caligráficas",
  "style": "Cursivas e caligráficas",
  "file": "marckscript.ttf",
  "warning": ""
},
{
  "id": "berkshireswash",
  "name": "Berkshire Swash",
  "category": "Fortes e decorativas",
  "style": "Fortes e decorativas",
  "file": "berkshireswash.ttf",
  "warning": ""
},
{
  "id": "rocksalt",
  "name": "Rock Salt",
  "category": "Fortes e decorativas",
  "style": "Fortes e decorativas",
  "file": "rocksalt.ttf",
  "warning": "Traços finos ou detalhes delicados: teste a legibilidade em peças pequenas."
}
];
// Retired choices remain resolvable for existing orders and SVG exports.
const retiredFontIds = new Set(["montserrat", "poppins", "inter", "raleway", "roboto", "opensans", "lato", "nunito", "rubik", "oswald"]);
export const engravingFonts = allEngravingFonts.filter(font => !retiredFontIds.has(font.id));
export const legacyArial: EngravingFont = {id:"arial",name:"Arial",category:"Legada",style:"Clássica",file:null,warning:"Arial requer arquivo licenciado. Exportação indisponível."};
export const findEngravingFont = (id:string) => allEngravingFonts.find(f=>f.id===id) ?? (id==="arial"?legacyArial:undefined);
export const engravingCategories = ["Modernas", "Elegantes e clássicas", "Cursivas e caligráficas", "Fortes e decorativas"];
export const engravingStatuses = ["Pendente", "Aguardando gravação", "Em produção", "Concluído"] as const;
export const engravingFamily = (id:string) => id==="arial" ? "Arial, sans-serif" : `RL-${id}`;
export const orderLabel = (n:number|null|undefined,code:string) => n ? `RL-${String(n).padStart(4,"0")}` : code;
