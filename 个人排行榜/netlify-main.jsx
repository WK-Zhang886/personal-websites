import React from "react";
import { createRoot } from "react-dom/client";

import "./app/globals.css";
import TierApp from "./components/TierApp.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TierApp />
  </React.StrictMode>,
);
