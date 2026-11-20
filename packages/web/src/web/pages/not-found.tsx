import { Link } from "wouter";
import { Home, MessageCircle } from "lucide-react";
import { Seo } from "../components/seo";
import { whatsappLink } from "../lib/constants";

function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-5 py-24 text-center">
      <Seo
        title="Página não encontrada | Rafa Laser"
        description="A página que você procura não existe. Volte ao início ou fale com a Rafa Laser pelo WhatsApp."
      />
      <p className="overline text-gold">Erro 404</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold sm:text-5xl">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        O endereço acessado não existe ou foi movido. Continue navegando pelos nossos produtos
        personalizados.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
        >
          <Home className="h-4 w-4" /> Voltar ao início
        </Link>
        <a
          href={whatsappLink(
            "Olá! Vim pelo site da Rafa Laser e gostaria de um orçamento.",
          )}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-foreground px-6 py-3.5 text-sm font-bold transition-colors hover:bg-foreground hover:text-background"
        >
          <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}

export default NotFoundPage;
