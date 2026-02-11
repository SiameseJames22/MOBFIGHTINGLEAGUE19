import { $, escapeHtml, fetchTeams, slug, ADMIN, addNotification, db } from "../app.js";
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
      <div class="banner"><strong>Access denied.</strong><div class="muted small">Only the admin can edit.</div></div>
      <div class="muted small" style="margin-top:10px;">Your UID: <span class="mono">${escapeHtml(user?.uid || "—")}</span></div>
    `;
    return;
  }

  const teams = await fetchTeams();
  const teamOptions = teams.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");

  // load current mobRoyale settings
  const sref = doc(db,"settings","mobRoyale");
  const ssnap = await getDoc(sref);
  const sdata = ssnap.exists() ? ssnap.data() : {};
  const wildcards = Array.isArray(sdata.wildcards) ? sdata.wildcards : ["",""];

  $("page").innerHTML = `
    <h2>Admin</h2>
    <div class="muted small">Signed in as: <span class="mono">${escapeHtml(user.email || user.uid)}</span></div>

    <div class="hr"></div>

    <div class="card">
      <h3>Bulk add teams</h3>
      <div class="muted small">One team per line.</div>
      <textarea id="bulkTeams" style="width:100%;margin-top:8px;min-height:110px;"></textarea>
      <div class="row" style="margin-top:10px;">
        <button class="btn primary" id="bulkAddBtn">Add / Update teams</button>
        <span class="muted small" id="bulkMsg"></span>
      </div>
    </div>

    <div style="height:12px"></div>

    <div class="card">
      <h3>Mob Royale setup</h3>
      <div class="muted small">Top 4 are automatic. Choose 2 playoff picks.</div>

      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
        <div>
          <label>Playoff Pick #1</label>
          <select id="wc1">
            <option value="">TBD</option>
            ${teamOptions}
          </select>
        </div>
        <div>
          <label>Playoff Pick #2</label>
          <select id="wc2">
            <option value="">TBD</option>
            ${teamOptions}
          </select>
        </div>
      </div>

      <div class="row" style="margin-top:10px;">
        <button class="btn primary" id="saveRoyaleBtn">Save Mob Royale picks</button>
        <span class="muted small" id="royaleMsg"></span>
      </div>
    </div>

    <div style="height:12px"></div>

    <div class="card">
      <h3>Trophies & Rivals editor</h3>
      <div class="muted small">Set trophy count + rivals (comma separated names).</div>
      <div class="hr"></div>
      <div id="trophyList" class="stack"></div>
    </div>

    <div style="height:12px"></div>

    <div class="card">
      <h3>Current teams</h3>
      <div id="teamList" class="stack"></div>
    </div>
  `;

  // fill defaults + current royale picks
  $("bulkTeams").value = DEFAULT_TEAMS;
  $("wc1").value = wildcards[0] || "";
  $("wc2").value = wildcards[1] || "";

  $("saveRoyaleBtn").onclick = async () => {
    const a = $("wc1").value;
    const b = $("wc2").value;
    if (a && b && a === b) return alert("Pick two different teams (or leave one TBD).");

    await setDoc(doc(db,"settings","mobRoyale"), { wildcards: [a||"", b||""] }, { merge:true });
    await addNotification("Mob Royale playoff picks updated.");
    $("royaleMsg").textContent = "Saved.";
  };

  // Bulk add
  $("bulkAddBtn").onclick = async () => {
    $("bulkMsg").textContent = "Working…";
    const lines = $("bulkTeams").value.split("\n").map(s=>s.trim()).filter(Boolean);
    for (const name of lines) {
      const id = slug(name);
      await setDoc(doc(db,"teams",id), {
        name,
        played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0,
        trophies: 0,
        rivals: [],
        createdAt: serverTimestamp()
      }, { merge:true });
    }
    await addNotification(`Teams updated (${lines.length}).`);
    $("bulkMsg").textContent = `Added/updated ${lines.length} teams.`;
    await renderPage({ user });
  };

  // Team list (remove)
  const renderTeams = () => {
    const list = $("teamList");
    list.innerHTML = "";
    teams.forEach(t=>{
      const div = document.createElement("div");
      div.className = "row";
      div.innerHTML = `
        <div style="flex:1"><strong>${escapeHtml(t.name)}</strong></div>
        <span class="tag">Pts ${t.points||0}</span>
        <button class="btn" data-del="${t.id}" style="border-color:rgba(255,74,74,.35);color:#ffb3b3;">Remove</button>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll("button[data-del]").forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute("data-del");
        await deleteDoc(doc(db,"teams",id));
        await addNotification("Team removed.");
        await renderPage({ user });
      };
    });
  };
  renderTeams();

  // Trophy + rivals editor list
  const trophyList = $("trophyList");
  trophyList.innerHTML = "";
  teams
    .slice()
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
    .forEach(t=>{
      const row = document.createElement("div");
      row.className = "card";
      row.style.padding = "12px";
      const rivalsStr = Array.isArray(t.rivals) ? t.rivals.join(", ") : "";
      row.innerHTML = `
        <div class="row">
          <strong>${escapeHtml(t.name)}</strong>
          <span class="right tag">ID: ${escapeHtml(t.id)}</span>
        </div>

        <div class="grid" style="grid-template-columns:160px 1fr;gap:10px;margin-top:10px;">
          <div>
            <label>Trophies</label>
            <input type="number" min="0" value="${Number(t.trophies||0)}" data-trophy="${t.id}">
          </div>
          <div>
            <label>Rivals (comma separated)</label>
            <input value="${escapeHtml(rivalsStr)}" data-rivals="${t.id}">
          </div>
        </div>

        <div class="row" style="margin-top:10px;">
          <button class="btn primary" data-save="${t.id}">Save</button>
          <span class="muted small" id="msg-${t.id}"></span>
        </div>
      `;
      trophyList.appendChild(row);
    });

  trophyList.querySelectorAll("button[data-save]").forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.getAttribute("data-save");
      const trophies = Number(trophyList.querySelector(`input[data-trophy="${id}"]`).value || 0);
      const rivalsRaw = trophyList.querySelector(`input[data-rivals="${id}"]`).value || "";
      const rivals = rivalsRaw.split(",").map(s=>s.trim()).filter(Boolean);

      await updateDoc(doc(db,"teams",id), { trophies, rivals });
      await addNotification(`Updated trophies/rivals for ${teams.find(t=>t.id===id)?.name || "team"}.`);
      const msg = document.getElementById(`msg-${id}`);
      if (msg) msg.textContent = "Saved.";
    };
  });
}
