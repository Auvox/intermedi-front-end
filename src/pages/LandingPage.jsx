import { useState, useEffect } from "react";
import "../styles/LandingPage.css";

import Nav from "../components/layout/Nav";
import MobileMenu from "../components/layout/MobileMenu";
import HeroSection from "../components/layout/HeroSection";
import KeywordRibbon from "../components/layout/KeywordRibbon";
import WhySection from "../components/layout/WhySection";
import HowSection from "../components/layout/HowSection";
import PartnersSection from "../components/layout/PartnersSection";
import Footer from "../components/layout/Footer";
import MapSection from "../components/sections/MapSection.jsx";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(() => window.location.hash || "#inicio");

  useEffect(() => {
    const onHashChange = () => setActiveSection(window.location.hash || "#inicio");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lp-root">

      {/* ══════════ NAV ══════════ */}
      <Nav scrolled={scrolled} menuOpen={menuOpen} setMenuOpen={setMenuOpen} activeSection={activeSection} />

      {/* ══════════ MOBILE MENU ══════════ */}
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} activeSection={activeSection} />

      {/* ══════════ HERO ══════════ */}
      <HeroSection />
      <KeywordRibbon />

      {/* ══════════ WHY ══════════ */}
      <WhySection />

      {/* ══════════ HOW IT WORKS ══════════ */}
      <HowSection />

      {/* ══════════ PARTNERS ══════════ */}
      <PartnersSection />

      {/* ══════════ MAP ══════════ */}
      <MapSection />
      
      {/* ══════════ FOOTER ══════════ */}
      <Footer />

    </div>
  );
}
