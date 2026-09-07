import { useRef, useEffect } from "react";

export function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Ativa o container pai
          el.classList.add("visible");

          // Busca e ativa TODOS os elementos com a classe 'reveal' lá dentro
          const children = el.querySelectorAll(".reveal");
          children.forEach((child) => {
            child.classList.add("visible");
          });

          obs.disconnect();
        }
      },
      {
        threshold: 0, // 0 significa: encostou 1 pixel na tela, ele já dispara
        rootMargin: "0px 0px -50px 0px", // Dispara um pouquinho antes de aparecer totalmente
      }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}
