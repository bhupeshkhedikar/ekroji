import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminPanel from "./components/AdminPanel";
import ResultsPage from "./components/ResultsPage";
import VotePage from "./components/VotePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VotePage />} />
        <Route path="/vote" element={<AdminPanel />} />
        <Route path="/results/:id" element={<ResultsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
