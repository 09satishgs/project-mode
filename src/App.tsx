import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./routes/Dashboard/Dashboard";
import Session from "./routes/Session/Session";
import Analyse from "./routes/Analyse/Analyse";

function App() {
  return (
    <div className="app-container">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/snapshot/:id" element={<Session />} />
          <Route path="/analyse" element={<Analyse />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;
