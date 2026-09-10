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
  const [activeSection, setActiveSection] = useState("#inicio");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll(
      '#inicio, #catalogo, #como-funciona, #parceiros, #mapa',
    ));
    let frame;
    const updateNavigation = () => {
      frame = undefined;
      setScrolled(window.scrollY > 20);
      const navBottom = document.querySelector('.lp-nav')?.getBoundingClientRect().bottom ?? 100;
      const marker = Math.min(window.innerHeight * 0.45, navBottom + 100);
      let current = '#inicio';
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= marker) current = `#${section.id}`;
      }
      setActiveSection(current);
    };
    const scheduleUpdate = () => {
      if (frame === undefined) frame = requestAnimationFrame(updateNavigation);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    sections.forEach((section) => observer.observe(section));
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('hashchange', scheduleUpdate);
    scheduleUpdate();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('hashchange', scheduleUpdate);
    };
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
