// Versão experimental premium da landing (branch feature/landing-page-premium).
// Tudo dela vive em src/landing-premium/; a versão anterior continua na main
// e os componentes dela (components/layout/*) seguem no repositório.
// LandingPage.css continua importado aqui porque as regras globais dele
// (:root, reset, html, body) também valem para as telas internas.
import "../styles/LandingPage.css";

export { default } from "../landing-premium/LandingPremium";
