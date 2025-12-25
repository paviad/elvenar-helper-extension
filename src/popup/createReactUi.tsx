import React from "react";
import { createRoot } from "react-dom/client";
import { PopupMain } from "./PopupMain";

export function createReactUi() {
  const root = createRoot(document.getElementById("root") as HTMLElement);
  root.render(<PopupMain />);
}
