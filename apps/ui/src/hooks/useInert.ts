import { useEffect } from "react";

export function useInert(isActive: boolean) {
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;
    if (isActive) {
      root.setAttribute("inert", "");
    } else {
      root.removeAttribute("inert");
    }
    return () => root.removeAttribute("inert");
  }, [isActive]);
}
