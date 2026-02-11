import { $, escapeHtml, fetchTeams, db, storage, ADMIN, addNotification } from "../app.js";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getDownloadURL, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

export async function renderPage({ user } = {}){
  const isAdmin = user && user.uid === ADMIN.uid;

  const teams = await fetchTeams();
  const teamsMap = new Map(teams.map(t=>[t.id,t.name]));

  const clipsSnap = await getDocs(query(collection(db,"clips"), orderBy("createdAt","desc")));
  const clips = clipsSnap.docs.map(d=>({id:d.id, ...d.data()}));

  $("page").innerHTML = `
    <div class="row">
      <h2 style="margin-right:auto;">Clips</h2>
      <span class="pill small">${isAdmin ? "Upload enabled" : "Browse"}</span>
    </div>

    ${isAdmin ? `
      <div class="card" style="margin:10px 0;">
        <h3>Upload clip (admin)</h3>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label>Team category</label>
            <select id="clipTeam">
              ${teams.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Match ID (optional)</label>
            <input id="clipMatchId" placeholder="Paste matchId or leave blank">
          </div>
        </div>
        <div style="height:10px"></div>
        <label>Clip title</label>
        <input id="clipTitle" placeholder="e.g. Best KO of the night">
        <div style="height:10px"></div>
        <label>Video file</label>
        <input id="clipFile" type="file" accept="video/*">
        <div class="row" style="margin-top:10px;">
          <button class="btn primary" id="uploadClipBtn">Upload</button>
          <span class="muted small" id="uploadStatus"></span>
        </div>
      </div>
    ` : `<div class="muted small">To upload clips, sign in as admin.</div>`}

    <div class="stack" style="margin:10px 0;">
      <label>Filter by team</label>
      <select id="clipTeamFilter">
        <option value="">All teams</option>
        ${teams.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("")}
      </select>
    </div>

    <div id="clipList" class="stack"></div>
  `;

  const renderClips = () => {
    const filter = $("clipTeamFilter").value;
    const filtered = filter ? clips.filter(c=>c.teamId===filter) : clips;
    const container = $("clipList");
    container.innerHTML = filtered.length ? "" : `<div class="muted">No clips yet.</div>`;
    filtered.forEach(c=>{
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div class="row">
          <strong>${escapeHtml(c.title || "Untitled clip")}</strong>
          <span class="right tag">${escapeHtml(teamsMap.get(c.teamId) || "Team")}</span>
        </div>
        <div class="muted small" style="margin:6px 0 10px 0;">
          ${c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : ""}
          ${c.matchId ? ` • Match: <span class="mono">${escapeHtml(c.matchId)}</span>` : ""}
        </div>
        ${c.videoUrl ? `<video controls style="width:100%;border-radius:14px;border:1px solid rgba(255,255,255,.10)"><source src="${c.videoUrl}"></video>` : `<div class="muted">No video URL</div>`}
      `;
      container.appendChild(div);
    });
  };

  $("clipTeamFilter").onchange = renderClips;
  renderClips();

  if (isAdmin) {
    $("uploadClipBtn").onclick = async () => {
      const file = $("clipFile").files?.[0];
      if (!file) return alert("Pick a video file first.");

      $("uploadStatus").textContent = "Uploading…";

      const teamId = $("clipTeam").value;
      const matchId = $("clipMatchId").value.trim();
      const title = $("clipTitle").value.trim() || "Clip";

      const path = `clips/${Date.now()}_${file.name.replace(/\s+/g,"_")}`;
      const r = ref(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);

      await addDoc(collection(db,"clips"), {
        teamId, matchId: matchId || "", title, videoUrl: url,
        createdAt: serverTimestamp()
      });

      $("uploadStatus").textContent = "Uploaded!";
      $("clipFile").value = "";
      $("clipTitle").value = "";
      $("clipMatchId").value = "";

      await addNotification(`New clip uploaded: ${title}`);
      await renderPage({ user });
    };
  }
}
