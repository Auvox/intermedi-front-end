import { useRef } from "react";
import AccessibilityMenu from "./AccessibilityMenu";
import useAccessibility from "../../hooks/useAccessibility";

export default function AccessibleArea({ children }) {
  const rootRef = useRef(null);
  const { preferences, toggle, reset } = useAccessibility(rootRef);
  const classes = Object.keys(preferences)
    .filter(key => preferences[key])
    .map(key => `a11y-${key}`);

  return (
    <div ref={rootRef} className={["persona-accessibility", ...classes].join(" ")}>
      {children}
      <AccessibilityMenu preferences={preferences} onChange={toggle} onReset={reset} />
    </div>
  );
}
