import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "./AdminPanel.css";

const AdminPanel = () => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [surveys, setSurveys] = useState([]);
  const [editingSurvey, setEditingSurvey] = useState(null); // 🔥 NEW

  // Load Surveys (Live)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "surveys"), (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      arr.sort(
        (a, b) =>
          (a.createdAt?.toDate?.() || 0) <
          (b.createdAt?.toDate?.() || 0)
            ? 1
            : -1
      );
      setSurveys(arr);
    });
    return () => unsub();
  }, []);

  const addOption = () => setOptions([...options, ""]);
  const updateOption = (idx, val) =>
    setOptions(options.map((o, i) => (i === idx ? val : o)));
  const removeOption = (idx) =>
    setOptions(options.filter((_, i) => i !== idx));

  // CREATE survey
  const createSurvey = async (e) => {
    e.preventDefault();
    const trimmed = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || trimmed.length < 2)
      return alert("Enter a question and at least 2 options.");

    await addDoc(collection(db, "surveys"), {
      question: question.trim(),
      options: trimmed.map((text, i) => ({
        id: `opt_${Date.now()}_${i}`,
        text,
        votes: 0,
      })),
      isActive: true,
      createdAt: serverTimestamp(),
    });

    setQuestion("");
    setOptions(["", ""]);
    alert("✅ Survey created!");
  };

  // 🔥 EDIT SURVEY — Load data for editing
  const startEditing = (survey) => {
    setEditingSurvey(survey.id);
    setQuestion(survey.question);
    setOptions(survey.options.map((o) => o.text));
  };

  // 🔥 SAVE EDITED SURVEY
  const saveEdit = async () => {
    const trimmed = options.map((o) => o.trim()).filter(Boolean);

    if (!question.trim() || trimmed.length < 2)
      return alert("Enter question + at least 2 options");

    const updateData = {
      question: question.trim(),
      options: trimmed.map((text, i) => ({
        id: `opt_${editingSurvey}_${i}`,
        text,
        votes: 0, // ⚠ votes removed because options changed
      })),
    };

    await updateDoc(doc(db, "surveys", editingSurvey), updateData);

    alert("✏️ Survey updated successfully!");

    setEditingSurvey(null);
    setQuestion("");
    setOptions(["", ""]);
  };

  // CLOSE survey
  const closeSurvey = async (id) => {
    await updateDoc(doc(db, "surveys", id), { isActive: false });
  };

  // RE-OPEN survey
  const reopenSurvey = async (id) => {
    await updateDoc(doc(db, "surveys", id), { isActive: true });
    alert("🎉 Survey re-opened!");
  };

  // DELETE survey + votes
  const deleteSurvey = async (id) => {
    if (!window.confirm("Delete this survey permanently?")) return;

    const q1 = query(collection(db, "votes"), where("surveyId", "==", id));
    const snap = await getDocs(q1);

    const deletes = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletes);

    await deleteDoc(doc(db, "surveys", id));

    alert("🗑️ Survey deleted successfully!");
  };

  return (
    <div className="admin-container">
      <h2 className="page-title">🌾 Farmer Wage Opinion — Admin Panel</h2>

      {/* CREATE OR EDIT SURVEY */}
      <form className="survey-form" onSubmit={(e) => e.preventDefault()}>
        <h3>{editingSurvey ? "✏️ Edit Survey" : "Create New Survey"}</h3>

        <label>Question</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter survey question..."
        />

        <label>Options</label>
        {options.map((opt, i) => (
          <div key={i} className="option-row">
            <input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
            />
            {options.length > 2 && (
              <button className="remove-btn" onClick={() => removeOption(i)}>
                ✕
              </button>
            )}
          </div>
        ))}

        <div className="form-actions">
          <button className="add-btn" onClick={addOption}>
            ➕ Add Option
          </button>

          {editingSurvey ? (
            <>
              <button className="create-btn" onClick={saveEdit}>
                💾 Save Changes
              </button>
              <button
                className="delete-btn"
                onClick={() => {
                  setEditingSurvey(null);
                  setQuestion("");
                  setOptions(["", ""]);
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button className="create-btn" onClick={createSurvey}>
              🚀 Create Survey
            </button>
          )}
        </div>
      </form>

      {/* SURVEY LIST */}
      <h3 className="section-title">📊 Existing Surveys</h3>

      <div className="survey-list">
        {surveys.map((s) => {
          const totalVotes = s.options.reduce(
            (sum, o) => sum + Number(o.votes || 0),
            0
          );

          return (
            <div className="survey-card" key={s.id}>
              <div className="survey-header">
                <h4>{s.question}</h4>
                <span className={s.isActive ? "status active" : "status closed"}>
                  {s.isActive ? "Active" : "Closed"}
                </span>
              </div>

              <p className="vote-count">👥 {totalVotes} total voters</p>

              <div className="options">
                {s.options.map((o) => (
                  <p key={o.id}>
                    {o.text} — <b>{o.votes}</b>
                  </p>
                ))}
              </div>

              <div className="survey-actions">
                <Link to={`/results/${s.id}`} className="view-btn">
                  View Results
                </Link>

                <button
                  className="close-btn"
                  onClick={() =>
                    s.isActive ? closeSurvey(s.id) : reopenSurvey(s.id)
                  }
                >
                  {s.isActive ? "Close" : "Re-Open"}
                </button>

                <button className="edit-btn" onClick={() => startEditing(s)}>
                  Edit
                </button>

                <button className="delete-btn" onClick={() => deleteSurvey(s.id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPanel;
