import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React from "react";
import Dashboard from "./routes/Dashboard/Dashboard";
import Session from "./routes/Session/Session";
import Analyse from "./routes/Analyse/Analyse";
import Synk from "./routes/Synk/Synk";

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const path = location.pathname;

  let layoutClass = "";
  if (path.startsWith("/analyse")) {
    layoutClass = "wide-layout";
  } else if (path === "/" || path.startsWith("/synk")) {
    layoutClass = "medium-layout";
  }

  return (
    <div className={`app-container ${layoutClass}`}>
      {children}
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <LayoutWrapper>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/snapshot/:id" element={<Session />} />
          <Route path="/analyse" element={<Analyse />} />
          <Route path="/synk" element={<Synk />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LayoutWrapper>
    </HashRouter>
  );
}

export default App;
