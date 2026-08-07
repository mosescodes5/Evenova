import { useEffect } from "react";
import { GLOBAL_CSS } from "./theme.js";

function StyleInjector() {
  useEffect(() => {
    if (document.getElementById("ev-global")) return;
    const el = document.createElement("style");
    el.id = "ev-global";
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}

export default StyleInjector;
