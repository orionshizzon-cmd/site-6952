import { Route, Switch } from "wouter";
import Index from "./pages/index";
import ProdutosPage from "./pages/produtos";
import LocalizacaoPage from "./pages/localizacao";
import CarrinhoPage from "./pages/carrinho";
import AdminPage from "./pages/admin";
import AdminLoginPage from "./pages/admin-login";
import PersonalizarPage, { PersonalizationProductionFicha as PersonalizationFicha } from "./pages/personalizar-v2";
import AdminPersonalizationsPage from "./pages/admin-personalizacoes-v2";
import { Provider } from "./components/provider";
import { CartProvider } from "./components/cart-provider";
import { Layout } from "./components/layout";
import NotFoundPage from "./pages/not-found";
import StudioLoginPage from "./pages/studio-login";
import StudioPage from "./pages/studio";
import StudioProjectPage, { StudioNewProjectPage } from "./pages/studio-project";
import StudioProjectsPage from "./pages/studio-projects";
import StudioFeedbackPage from "./pages/studio-feedback";
import StudioOwnerPage from "./pages/studio-owner";
import { AgentFeedback } from "@runablehq/website-runtime";

/** Rafa Laser Studio (Beta) — área privada, fora do Layout do site público. */
function StudioRoutes() {
  return (
    <Switch>
      <Route path="/rafa" component={StudioPage} />
      <Route path="/rafa/login" component={StudioLoginPage} />
      <Route path="/rafa/novo" component={StudioNewProjectPage} />
      <Route path="/rafa/projeto/:id" component={StudioProjectPage} />
      <Route path="/rafa/projetos" component={StudioProjectsPage} />
      <Route path="/rafa/feedback" component={StudioFeedbackPage} />
      <Route path="/rafa/proprietario" component={StudioOwnerPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

/** Site público — nada aqui foi alterado. */
function SiteRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/produtos" component={ProdutosPage} />
        <Route path="/localizacao" component={LocalizacaoPage} />
        <Route path="/carrinho" component={CarrinhoPage} />
        <Route path="/admin/login" component={AdminLoginPage} />
        <Route path="/admin/personalizacoes" component={AdminPersonalizationsPage} />
        <Route path="/personalizar/ficha/:code">{params => <PersonalizationFicha code={params.code} />}</Route>
        <Route path="/personalizar" component={PersonalizarPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <Provider>
      <CartProvider>
        <Switch>
          <Route path="/rafa" component={StudioRoutes} />
          <Route path="/rafa/*" component={StudioRoutes} />
          <Route component={SiteRoutes} />
        </Switch>
        {/* Do not remove — off by default, activated by parent iframe via postMessage */}
        {import.meta.env.DEV && <AgentFeedback />}
      </CartProvider>
    </Provider>
  );
}

export default App;
