import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import "./ResultsPage.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const ResultsPage = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [votes, setVotes] = useState([]);
  const [allSurveys, setAllSurveys] = useState([]);

  useEffect(() => {
    if (!id) {
      const unsub = onSnapshot(collection(db, "surveys"), (snap) => {
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        data.sort(
          (a, b) =>
            (a.createdAt?.toDate?.() || 0) <
            (b.createdAt?.toDate?.() || 0)
              ? 1
              : -1
        );
        setAllSurveys(data);
      });
      return () => unsub();
    }

    const surveyRef = doc(db, "surveys", id);
    const unsubSurvey = onSnapshot(surveyRef, (snap) => {
      if (snap.exists()) setSurvey({ id: snap.id, ...snap.data() });
      else setSurvey(null);
    });

    const q = query(collection(db, "votes"), where("surveyId", "==", id));
    const unsubVotes = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setVotes(arr);
    });

    return () => {
      unsubSurvey();
      unsubVotes();
    };
  }, [id]);

  const chartData = useMemo(() => {
    if (!survey) return null;
    const labels = survey.options.map((o) => o.text);
    const counts = survey.options.map((o) => Number(o.votes || 0));
    const colors = [
      "#66bb6a",
      "#81c784",
      "#a5d6a7",
      "#4caf50",
      "#43a047",
      "#2e7d32",
      "#9ccc65",
      "#aed581",
    ];

    return {
      labels,
      datasets: [
        {
          label: "Votes",
          data: counts,
          backgroundColor: labels.map((_, i) => colors[i % colors.length]),
          borderRadius: 8,
        },
      ],
    };
  }, [survey]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed.y ?? ctx.parsed ?? 0;
              const total = survey
                ? survey.options.reduce((s, o) => s + Number(o.votes || 0), 0)
                : 0;
              const pct = total ? ((value / total) * 100).toFixed(1) : 0;
              return `${value} votes (${pct}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#333" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#333" },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
      },
    }),
    [survey]
  );

  if (!id)
    return (
      <div className="results-container">
        <h2>All Survey Results</h2>
        {allSurveys.length === 0 && <p>No surveys yet.</p>}
        {allSurveys.map((s) => (
          <div key={s.id} className="survey-card">
            <h4>{s.question}</h4>
            <div className="options">
              {s.options.map((o) => (
                <p key={o.id}>
                  {o.text}: <b>{o.votes || 0}</b> votes
                </p>
              ))}
            </div>
            <Link to={`/results/${s.id}`} className="view-link">
              View Chart →
            </Link>
          </div>
        ))}
      </div>
    );

  if (!survey) return <div className="results-container">Loading...</div>;

  const totalVotes =
    survey.options.reduce((s, o) => s + Number(o.votes || 0), 0) || 0;

  const votesByOption = survey.options.reduce((acc, opt) => {
    acc[opt.id] = [];
    return acc;
  }, {});
  votes.forEach((v) => {
    if (v.selectedOptionId && votesByOption[v.selectedOptionId]) {
      votesByOption[v.selectedOptionId].push(v);
    }
  });

  return (
    <div className="results-container">
      <h2>🌾 Survey Results</h2>
      <h3 className="question-title">{survey.question}</h3>

      {/* Chart Section */}
      <div className="chart-area">
        <div className="chart-wrapper">
          <div className="chart-canvas">
            {chartData && <Bar data={chartData} options={chartOptions} />}
          </div>
        </div>

        <div className="summary-cards">
          <div className="summary-card total">
            <div className="summary-text">Total Votes</div>
            <div className="summary-value">
              <span className="num">{totalVotes}</span>
            </div>
          </div>

          {survey.options.map((o) => {
            const count = Number(o.votes || 0);
            const pct = totalVotes ? ((count / totalVotes) * 100).toFixed(1) : 0;
            return (
              <div key={o.id} className="summary-card">
                <div className="summary-text">{o.text}</div>
                <div className="summary-value">
                  <span className="num">{count}</span>
                  <span className="pct">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Option-wise Tables */}
      <div className="options-list">
        {survey.options.map((option) => {
          const rows = votesByOption[option.id] || [];
          return (
            <section key={option.id} className="option-section">
              <h4 className="option-heading">
                Option: <span>{option.text}</span>{" "}
                <span className="opt-count">({option.votes || 0} votes)</span>
              </h4>

              {rows.length > 0 ? (
                <div className="table-wrapper">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>SR No</th>
                        <th>Farmer Name</th>
                        <th>Mobile Number</th>
                        <th>Voted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, index) => (
                        <tr key={r.id}>
                          <td>{index + 1}</td>
                          <td>{r.farmerName || r.name || "—"}</td>
                          <td>{r.mobile}</td>
                          <td>
                            {r.createdAt?.toDate
                              ? new Date(r.createdAt.toDate()).toLocaleString()
                              : r.createdAt
                              ? new Date(r.createdAt).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-votes">No votes yet for this option.</p>
              )}
            </section>
          );
        })}
      </div>

      <Link to="/results" className="back-link">
        ← Back to All Surveys
      </Link>
    </div>
  );
};

export default ResultsPage;
