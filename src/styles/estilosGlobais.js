// Todo o CSS das telas, carregado de uma vez e nesta ordem.
// As telas são baixadas sob demanda (router/telas.js), mas o CSS não: a ordem
// da cascata precisa ser sempre esta, venha a pessoa pela página inicial ou
// direto por um link do painel. LandingPage.css tem regras globais (:root,
// reset, html, body) das quais as telas internas dependem.
// Os imports de CSS dentro dos componentes continuam lá (servem de
// documentação e não duplicam nada: cada arquivo entra uma vez só).
// CSS das telas que já eram sob demanda (operação 3D, desempenho, simulação)
// fica de fora: chega com a própria tela, como antes.
import "./mapSection.css";
import "./accessibility.css";
import "./LandingPage.css";
import "./keywordRibbon.css";
import "./whySection.css";
import "./howSection.css";
import "./partnerAudience.css";
import "./footer.css";
import "../landing-premium/jornada/jornada.css";
import "../landing-premium/secoes.css";
import "./managerSidebar.css";
import "./remedios.css";
import "./rastreio.css";
import "./chamados.css";
import "./perfil.css";
import "./boasVindas.css";
import "./preparos.css";
import "./manager.css";
import "./managerRefresh.css";
import "./employee.css";
import "./employeeMedicines.css";
import "./admin.css";
import "./adminDashboard.css";
import "./auth.css";
import "./directory.css";
import "./personaTheme.css";
import "./motion.css";
