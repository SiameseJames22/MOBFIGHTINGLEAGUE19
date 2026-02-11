import { $, escapeHtml, fetchMatches, fetchTeamsMap, ADMIN, db, addNotification, applyResultToTable } from "../app.js";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export async function renderPage({ user } = {}){
  const teams = await fetchTeamsMap();
  const matches = await fetchMatches(["live","scheduled","final"]);
  const isAdmin = user && user.uid === ADMIN.uid;

  const liveList = matches.filter(m=>m.status==="live" || m.status==="scheduled");
  const finalList = matches.filter(m=>m.status==="final");

  $("page").innerHTML = `
    <div class="row">
      <h2 style="margin-right:auto;">Live Matches</h2>
      <span class="pill small">${isAdmin ? "Admin controls enabled" : "Viewer"}</span>
    </div>

    ${isAdmin ? `
      <div class="card" style="margin:10px 0;">
        <h3>Create match</h3>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label>Home team</label>
            <select id="homeTeam">
              ${Array.from(teams.values()).map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Away team</label>
            <select id="awayTeam">
              ${Array.from(teams.values()).map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="row" style="margin-top:10px;">
          <button class="btn primary" id="createMatchBtn">Create (scheduled)</button>
          <span class="muted small">Then Mark LIVE when it starts.</span>
        </div>
      </div>
    ` : `<div class="muted small">To edit scores, sign in as admin.</div>`}

    <h3>Happening now</h3>
    <div class="stack">
      ${liveList.length ? liveList.map(m => matchCard(m, teams, isAdmin)).join("") : `<div class="muted">No live/scheduled matches.</div>`}
    </div>

    <div class="hr"></div>

    <h3>Finished</h3>
    <div class="stack">
      ${finalList.length ? finalList.map(m => finalCard(m, teams)).join("") : `<div class="muted">No finished matches yet.</div>`}
    </div>
  `;

  if (!isAdmin) return;

  $("createMatchBtn").onclick = async () => {
    const homeTeamId = $("homeTeam").value;
    const awayTeamId = $("awayTeam").value;
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return alert("Pick two different teams.");
    await addDoc(collection(db,"matches"), {
      homeTeamId, awayTeamId, homeScore:0, awayScore:0,
      status:"scheduled", createdAt: serverTimestamp()
    });
    await addNotification("New match scheduled.");
    await renderPage({ user });
  };

  document.querySelectorAll("button[data-live]").forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.getAttribute("data-live");
      await updateDoc(doc(db,"matches",id), { status:"live", startedAt: serverTimestamp() });
      await addNotification("Match is LIVE now.");
      await renderPage({ user });
    };
  });

  document.querySelectorAll("button[data-update]").forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.getAttribute("data-update");
      const hs = Number(document.querySelector(`input[data-hs="${id}"]`).value || 0);
      const as = Number(document.querySelector(`input[data-as="${id}"]`).value || 0);

      const msnap = await getDoc(doc(db,"matches",id));
      const m = msnap.data();

      await updateDoc(doc(db,"matches",id), { homeScore:hs, awayScore:as });

      const home = teams.get(m.homeTeamId)?.name || "Home";
      const away = teams.get(m.awayTeamId)?.name || "Away";
      await addNotification(`${home} Scored against ${away}, the score is now [${hs}-${as}]`);
      await renderPage({ user });
    };
  });

  document.querySelectorAll("button[data-end]").forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.getAttribute("data-end");
      const hs = Number(document.querySelector(`input[data-hs="${id}"]`).value || 0);
      const as = Number(document.querySelector(`input[data-as="${id}"]`).value || 0);

      const msnap = await getDoc(doc(db,"matches",id));
      const m = msnap.data();

      await updateDoc(doc(db,"matches",id), { status:"final", homeScore:hs, awayScore:as, endedAt: serverTimestamp() });
      await applyResultToTable(m.homeTeamId, m.awayTeamId, hs, as);

      const home = teams.get(m.homeTeamId)?.name || "Home";
      const away = teams.get(m.awayTeamId)?.name || "Away";
      const msg =
        hs > as ? `GAME OVER! ${home} Won Against ${away} [${hs}-${as}]` :
        hs < as ? `GAME OVER! ${home} Lost Against ${away} [${hs}-${as}]` :
                  `GAME OVER! ${home} Drew With ${away} [${hs}-${as}]`;
      await addNotification(msg);
      await renderPage({ user });
    };
  });
}

function matchCard(m, teams, isAdmin){
  const home = teams.get(m.homeTeamId)?.name || "Home";
  const away = teams.get(m.awayTeamId)?.name || "Away";
  const hs = m.homeScore ?? 0, as = m.awayScore ?? 0;
  return `
    <div class="card">
      <div class="row">
        <strong>${escapeHtml(home)}</strong><span class="muted">vs</span><strong>${escapeHtml(away)}</strong>
        <span class="right tag">${String(m.status||"").toUpperCase()}</span>
      </div>
      <div style="font-size:28px;margin-top:6px;"><strong>${hs}-${as}</strong></div>

      ${isAdmin ? `
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
          <div><label>Home score</label><input type="number" min="0" value="${hs}" data-hs="${m.id}"></div>
          <div><label>Away score</label><input type="number" min="0" value="${as}" data-as="${m.id}"></div>
        </div>
        <div class="row" style="margin-top:10px;">
          <button class="btn" data-live="${m.id}">Start match (LIVE)</button>
          <button class="btn primary" data-update="${m.id}">Update score</button>
          <button class="btn danger" data-end="${m.id}">End match</button>
        </div>
      ` : ``}

      <div class="muted small" style="margin-top:8px;">Match ID: <span class="mono">${escapeHtml(m.id)}</span></div>
    </div>
  `;
}

function finalCard(m, teams){
  const home = teams.get(m.homeTeamId)?.name || "Home";
  const away = teams.get(m.awayTeamId)?.name || "Away";
  const hs = m.homeScore ?? 0, as = m.awayScore ?? 0;
  return `
    <div class="card">
      <div class="row">
        <strong>${escapeHtml(home)}</strong><span class="muted">vs</span><strong>${escapeHtml(away)}</strong>
        <span class="right tag">FINAL</span>
      </div>
      <div style="font-size:24px;margin-top:6px;"><strong>${hs}-${as}</strong></div>
      <div class="muted small">Match ID: <span class="mono">${escapeHtml(m.id)}</span></div>
    </div>
  `;
}
