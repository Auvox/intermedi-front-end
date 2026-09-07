import { useEffect } from "react";

/**
 * Hook que observa elementos com a classe `.reveal` e adiciona
 * a classe `.visible` quando entram no viewport.
 */
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12 }
    );

    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
