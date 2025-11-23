import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment 
} from "firebase/firestore";
import "./VotePage.css";

const VotePage = () => {
  const [surveys, setSurveys] = useState([]);
  const [selected, setSelected] = useState(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [selectedOption, setSelectedOption] = useState("");

  const [voters, setVoters] = useState([]);
  const [search, setSearch] = useState("");

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editOption, setEditOption] = useState("");

  /* ---------------------------------------------
        AUTO-FILL DETAILS
  ---------------------------------------------- */

   useEffect(() => {
    const incrementVisitors = async () => {
      const ref = doc(db, "analytics", "visitorCount");

      try {
        await updateDoc(ref, {
          count: increment(1),
        });
      } catch (err) {
        console.log("Error updating visitor count:", err);
      }
    };

    incrementVisitors();
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem("farmerName");
    const savedMobile = localStorage.getItem("farmerMobile");

    if (savedName) setName(savedName);
    if (savedMobile) setMobile(savedMobile);
  }, []);

  /* ---------------------------------------------
        LOAD SURVEYS
  ---------------------------------------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "surveys"), (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));

      list.sort((a, b) =>
        (a.createdAt?.toDate?.() || 0) < (b.createdAt?.toDate?.() || 0) ? 1 : -1
      );

      setSurveys(list);
    });

    return () => unsub();
  }, []);

  /* ---------------------------------------------
        LOAD VOTERS FOR SELECTED SURVEY
  ---------------------------------------------- */
  useEffect(() => {
    if (!selected) return;

    const q1 = query(
      collection(db, "votes"),
      where("surveyId", "==", selected.id)
    );

    const unsub = onSnapshot(q1, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setVoters(arr);
    });

    return () => unsub();
  }, [selected]);

  /* ---------------------------------------------
        CHECK DUPLICATE VOTE
  ---------------------------------------------- */
  const hasVoted = async (surveyId, cleanName, mobile) => {
    const qCheck = query(
      collection(db, "votes"),
      where("surveyId", "==", surveyId),
      where("mobile", "==", mobile),
      where("cleanName", "==", cleanName)
    );

    const snap = await getDocs(qCheck);
    return !snap.empty;
  };

  /* ---------------------------------------------
        SUBMIT VOTE
  ---------------------------------------------- */
  const submitVote = async (e) => {
    e.preventDefault();

    if (!name || !mobile || !selectedOption)
      return alert("कृपया सर्व माहिती भरा!");

    if (!/^[6-9][0-9]{9}$/.test(mobile)) {
      return alert("कृपया योग्य 10 अंकी मोबाइल नंबर भरा (6–9 ने सुरू होणारा)");
    }

    const cleanName = name.trim().toLowerCase();

    if (await hasVoted(selected.id, cleanName, mobile))
      return alert("❌ हा व्यक्ती आधीच मतदान केले आहे!");

    await addDoc(collection(db, "votes"), {
      surveyId: selected.id,
      farmerName: name.trim(),
      cleanName,
      mobile,
      selectedOptionId: selectedOption,
      createdAt: serverTimestamp(),
    });

    const updatedOptions = selected.options.map((o) =>
      o.id === selectedOption ? { ...o, votes: (o.votes || 0) + 1 } : o
    );

    await updateDoc(doc(db, "surveys", selected.id), { options: updatedOptions });

    localStorage.setItem("farmerName", name.trim());
    localStorage.setItem("farmerMobile", mobile);

    alert("मत यशस्वीरित्या नोंदवले!");
    setSelected(null);
  };

  /* ---------------------------------------------
        SORT + FILTER VOTERS
  ---------------------------------------------- */
  const filteredVoters = voters
    .sort((a, b) => {
      const t1 = a.createdAt?.toDate?.() || 0;
      const t2 = b.createdAt?.toDate?.() || 0;
      return t2 - t1;
    })
    .filter((v) => {
      const term = search.toLowerCase();
      return (
        v.farmerName.toLowerCase().includes(term) ||
        v.mobile.includes(term)
      );
    });

  /* ---------------------------------------------
        START EDIT MODE
  ---------------------------------------------- */
  const startEdit = (v) => {
    setEditId(v.id);
    setEditName(v.farmerName);
    setEditMobile(v.mobile);
    setEditOption(v.selectedOptionId);
  };

  /* ---------------------------------------------
        SAVE EDITED VOTE
  ---------------------------------------------- */
  const saveEdit = async (vote) => {
    if (!editName || !editMobile || !editOption)
      return alert("कृपया सर्व माहिती भरा!");

    if (!/^[6-9][0-9]{9}$/.test(editMobile))
      return alert("योग्य 10 अंकी मोबाइल नंबर भरा!");

    const cleanName = editName.trim().toLowerCase();

    const duplicate = voters.find(
      (v) =>
        v.id !== vote.id &&
        v.mobile === editMobile &&
        v.cleanName === cleanName
    );

    if (duplicate)
      return alert("या नावाने व मोबाइल क्रमांकाने मत आधीच नोंदवले आहे!");

    const oldOpt = vote.selectedOptionId;
    const newOpt = editOption;

    const updatedOptions = selected.options.map((o) => {
      if (o.id === oldOpt && oldOpt !== newOpt)
        return { ...o, votes: (o.votes || 0) - 1 };

      if (o.id === newOpt && oldOpt !== newOpt)
        return { ...o, votes: (o.votes || 0) + 1 };

      return o;
    });

    await updateDoc(doc(db, "surveys", selected.id), { options: updatedOptions });

    await updateDoc(doc(db, "votes", vote.id), {
      farmerName: editName.trim(),
      cleanName,
      mobile: editMobile,
      selectedOptionId: newOpt,
    });

    setEditId(null);
    alert("मत यशस्वीरित्या अपडेट झाले!");
  };

  /* ---------------------------------------------
        DELETE VOTE
  ---------------------------------------------- */
  const deleteVote = async (vote) => {
    if (!window.confirm("हे मत कायमचे डिलिट करायचे आहे का?")) return;

    const optionId = vote.selectedOptionId;

    const updatedOptions = selected.options.map((o) =>
      o.id === optionId ? { ...o, votes: (o.votes || 0) - 1 } : o
    );

    await updateDoc(doc(db, "surveys", selected.id), { options: updatedOptions });

    await deleteDoc(doc(db, "votes", vote.id));

    alert("मत डिलिट झाले!");
  };

  return (
    <div className="vote-container">
      <h2>🌾 खेतीसाथी - एक गाव एक मजुरी-लाखोरी </h2>

      {/* SURVEY LIST */}
      {!selected ? (
        <div className="survey-list">
          {surveys.map((s) => {
            const total = s.options.reduce(
              (sum, o) => sum + (o.votes || 0),
              0
            );

            return (
              <div key={s.id} className="survey-card">
                <h4>{s.question}</h4>

                <div className="survey-bottom-row">
                  {s.isActive ? (
                    <button className="vote-now-btn" onClick={() => setSelected(s)}>
                      मतदान करा
                    </button>
                  ) : (
                    <span className="closed">बंद</span>
                  )}

                  <span className="voter-count">👥 {total} मते</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* VOTING FORM */}
          <form className="vote-form" onSubmit={submitVote}>
            <h3>{selected.question}</h3>
            <p className="total-votes-box">
              📊 <b>{voters.length}</b> एकूण मते
            </p>

            <input
              placeholder="पूर्ण नाव"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="tel"
              placeholder="मोबाइल नंबर (10 अंक)"
              value={mobile}
              maxLength={10}
              onChange={(e) => {
                const numeric = e.target.value.replace(/\D/g, "");
                setMobile(numeric);
              }}
            />

            <div className="options">
              {selected.options.map((o) => (
                <label key={o.id}>
                  <input
                    type="radio"
                    name="vote"
                    checked={selectedOption === o.id}
                    onChange={() => setSelectedOption(o.id)}
                  />
                  {o.text}
                </label>
              ))}
            </div>

            <div className="btn-row">
              <button className="submit-btn">मत नोंदवा</button>
              <button className="cancel-btn" onClick={() => setSelected(null)}>
                मागे जा
              </button>
            </div>
          </form>

          {/* SEARCH BAR */}
          <div className="search-box">
            <input
              placeholder="🔍 नाव किंवा मोबाइलने शोधा..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* VOTER LIST */}
          <div className="voter-list-box">
            <h3>🧑‍🌾 मतदान करणारे</h3>

            <table className="voter-table">
              <thead>
                <tr>
                  <th>क्र.</th>
                  <th>नाव</th>
                  <th>मोबाइल</th>
                  {/* <th>पर्याय</th>
                  <th>संपादित</th>
                  <th>डिलिट</th> */}
                </tr>
              </thead>

              <tbody>
                {filteredVoters.map((v, i) => (
                  <tr key={v.id}>
                    <td>{i + 1}</td>

                    {editId === v.id ? (
                      <>
                        <td>
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            value={editMobile}
                            maxLength={10}
                            onChange={(e) =>
                              setEditMobile(e.target.value.replace(/\D/g, ""))
                            }
                          />
                        </td>

                        <td>
                          {selected.options.map((opt) => (
                            <label key={opt.id} style={{ display: "block" }}>
                              <input
                                type="radio"
                                checked={editOption === opt.id}
                                onChange={() => setEditOption(opt.id)}
                              />
                              {opt.text}
                            </label>
                          ))}
                        </td>

                        <td>
                          <button className="submit-btn" onClick={() => saveEdit(v)}>
                            जतन करा
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => setEditId(null)}
                          >
                            रद्द करा
                          </button>
                        </td>

                        <td>—</td>
                      </>
                    ) : (
                      <>
                        <td>{v.farmerName}</td>
                        <td>{v.mobile}</td>

                        {/* <td>
                          {
                            selected.options.find(
                              (o) => o.id === v.selectedOptionId
                            )?.text
                          }
                        </td>

                        <td>
                          <button className="edit-btn" onClick={() => startEdit(v)}>
                            ✏ संपादित करा
                          </button>
                        </td>

                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => deleteVote(v)}
                          >
                            🗑 काढून टाका
                          </button>
                        </td> */}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default VotePage;
