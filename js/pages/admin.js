import { $, escapeHtml, fetchTeams, slug, ADMIN, addNotification, db } from "../app.js";
import { deleteDoc, doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const DEFAULT_TEAMS = `Chickens
Cows
Creepers
Endermens
Endermites
Feesh
Foxes
Iron Golems
Ocelots
Pillagers
Pigs
Skeletons
Snowmen
Villagers
Wolves
Zombies`;

export async function renderPage({ user } = {}){
  const isAdmin = user && user.uid === ADMIN.uid;

  if (!isAdmin) {
    $("page").innerHTML = `
      <h2>Admin</h2>
      <div class="banner"><strong>Access denied.</strong><div class="muted small">Only the admin account can edit teams, matches, scores, and clips.</div></div>
      <div style="height:10px"></div>
      <div class="muted small">Your UID: <span class="mono">${escapeHtml(user?.uid || "—")}</span></div>
      <div class="muted small">If you're the admin: paste your UID into <span class="mono">ADMIN_UID</span> in <span class="mono">js/config.js</span>.</div>
    `;
    return;
  }

  $("page").innerHTML = `
    <h2>Admin</h2>
    <div class="muted small">Signed in as: <span class="mono">${escapeHtml(user.email || user.uid)}</span></div>

    <div class="hr"></div>

    <div class="card">
      <h3>Bulk add teams</h3>
      <div class="muted small">Paste one team per line.</div>
      <div style="height:8px"></div>
      <textarea id="bulkTeams"></textarea>
      <div class="row" style="margin-top:10px;">
        <button class="btn primary" id="bulkAddBtn">Add / Update teams</button>
        <span class="muted small" id="bulkMsg"></span>
      </div>
    </div>

    <div style="height:12px"></div>

    <div class="card">
      <h3>Add single team</h3>
      <div class="row">
        <div style="flex:1">
          <label>Team name</label>
          <input id="teamName" placeholder="e.g. Iron Golems">
        </div>
        <div style="align-self:end">
          <button class="btn primary" id="addTeamBtn">Add</button>
        </div>
      </div>
    </div>

    <div style="height:12px"></div>

    <div class="card">
      <h3>Current teams</h3>
      <div class="stack" id="teamList"></div>
    </div>
  `;

  $("bulkTeams").value = DEFAULT_TEAMS;

  const renderTeams = async () => {
    const fresh = await fetchTeams();
    const list = $("teamList");
    list.innerHTML = "";
    fresh.forEach(t=>{
      const div = document.createElement("div");
      div.className = "row";
      div.innerHTML = `
        <div style="flex:1"><strong>${escapeHtml(t.name)}</strong></div>
        <span class="tag">Pts ${t.points||0}</span>
        <button class="btn danger" data-del="${t.id}">Remove</button>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll("button[data-del]").forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute("data-del");
        await deleteDoc(doc(db,"teams",id));
        await addNotification("Team removed.");
        await renderTeams();
      };
    });
  };

  await renderTeams();

  $("addTeamBtn").onclick = async () => {
    const name = $("teamName").value.trim();
    if (!name) return;
    const id = slug(name);
    await setDoc(doc(db,"teams",id), {
      name, played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0,
      createdAt: serverTimestamp()
    }, { merge:true });
    $("teamName").value = "";
    await addNotification(`Team added: ${name}`);
    await renderTeams();
  };

  $("bulkAddBtn").onclick = async () => {
    $("bulkMsg").textContent = "Working…";
    const lines = $("bulkTeams").value.split("\n").map(s=>s.trim()).filter(Boolean);
    for (const name of lines) {
      const id = slug(name);
      await setDoc(doc(db,"teams",id), {
        name, played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0,
        createdAt: serverTimestamp()
      }, { merge:true });
    }
    await addNotification(`Bulk teams updated (${lines.length}).`);
    $("bulkMsg").textContent = `Added/updated ${lines.length} teams.`;
    await renderTeams();
  };
}
