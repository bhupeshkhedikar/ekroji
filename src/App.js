import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminPanel from "./components/AdminPanel";
import ResultsPage from "./components/ResultsPage";
import VotePage from "./components/VotePage";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

function App() {
   const [visitors, setVisitors] = useState(0);

  useEffect(() => {
    const ref = doc(db, "analytics", "visitorCount");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setVisitors(snap.data().count);
      }
    });

    return () => unsub();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<VotePage />} />
        <Route path="/vote" element={<AdminPanel />} />
        <Route path="/results/:id" element={<ResultsPage />} />
      </Routes>
<p
  style={{
    padding: "14px 22px",
    fontSize: "10px",
    fontWeight: "700",
    color: "white",
    background: "linear-gradient(135deg, #2ecc71, #27ae60)",
    borderRadius: "14px",
    width: "fit-content",
    boxShadow: "0 0 12px rgba(46, 204, 113, 0.7)",
    animation: "glowPulse 2.2s infinite ease-in-out",
    margin: "0 auto"
  }}
>
  Total Visitors: {visitors}
</p>


<style>
{`
@keyframes glowPulse {
  0% { box-shadow: 0 0 10px rgba(46, 204, 113, 0.4); }
  50% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.9); }
  100% { box-shadow: 0 0 10px rgba(46, 204, 113, 0.4); }
}
`}
</style>

    </Router>

    
  );
}

export default App;
