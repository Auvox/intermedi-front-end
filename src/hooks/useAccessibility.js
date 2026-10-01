import { useEffect, useState } from "react";

const storageKey = "intermedi-accessibility";
const defaults = { contrast: false, links: false, text: false, spacing: false, motion: false, images: false, dyslexia: false, cursor: false };

export default function useAccessibility(rootRef) {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Object.fromEntries(Object.keys(defaults).map(key => [key, saved?.[key] === true]));
    } catch { return { ...defaults }; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch { /* Preferences still work when storage is unavailable. */ }
  }, [preferences]);

  useEffect(() => {
    const root = rootRef.current;
    if (!preferences.text || !root) return;
    let modified = [];
    let frame;
    const resizeText = () => {
      frame = undefined;
      root.classList.add("a11y-measuring");
      modified.forEach(element => element.style.removeProperty("--accessible-font-size"));
      modified = Array.from(root.querySelectorAll("*:not(.accessibility, .accessibility *)")).filter(element => element.matches("input, textarea, select") || Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()));
      const sizes = modified.map(element => parseFloat(getComputedStyle(element).fontSize) * 1.25);
      modified.forEach((element, index) => element.style.setProperty("--accessible-font-size", `${sizes[index]}px`));
      // Commit the new sizes before restoring transitions, including on resize.
      void root.offsetHeight;
      root.classList.remove("a11y-measuring");
    };
    const scheduleResize = () => {
      if (frame === undefined) frame = requestAnimationFrame(resizeText);
    };
    resizeText();
    const observer = new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.(".accessibility") && Array.from(record.addedNodes).some(node => node.textContent.trim()))) scheduleResize();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleResize);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleResize);
      modified.forEach(element => element.style.removeProperty("--accessible-font-size"));
      root.classList.remove("a11y-measuring");
    };
  }, [preferences.text, rootRef]);

  return { preferences, toggle: key => setPreferences(current => ({ ...current, [key]: !current[key] })), reset: () => setPreferences({ ...defaults }) };
}
