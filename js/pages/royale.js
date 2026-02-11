import { $, escapeHtml, fetchTeams, getSeasonInfo, db } from "../app.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function july10(seasonYear){
  return new Date(Date.UTC(seasonYear, 6, 10, 0, 0, 0)); // July = 6
}

export async function renderPage({ user } = {}){
  const teams = await fetchTeams(); // already sorted by points
  const { seasonYear } = getSeasonInfo(new Date());

  // Top 4 auto
  const top4 = teams.slice(0, 4);

  // Wildcards from settings
  const sref = doc(db, "settings", "mobRoyale");
  const ssnap = await getDoc(sref);
  const data = ssnap.exists() ? ssnap.data() : {};
  const wildcards = Array.isArray(data.wildcards) ? data.wildcards : []; // [teamId, teamId]

  const map = new Map(teams.map(t=>[t.id,t]));
  const wcTeams = wildcards.map(id => map.get(id)).filter(Boolean);

  const slots = [
    { label: "Auto #1", team: top4[0] },
    { label: "Auto #2", team: top4[1] },
    { label: "Auto #3", team: top4[2] },
    { label: "Auto #4", team: top4[3] },
    { label: "Playoff Pick #1", team: wcTeams[0] || null },
    { label: "Playoff Pick #2", team: wcTeams[1] || null },
  ];

  const startDate = july10(seasonYear);
  const startText = startDate.toLocaleDateString(undefined, { day:"2-digit", month:"long", year:"numeric" });

  $("page").innerHTML = `
    <div class="row">
      <h2 style="margin-right:auto;">Mob Royale</h2>
      <span class="pill small">6 Slots</span>
    </div>

    <div class="banner" style="margin:10px 0;">
      <strong>ROYALE STARTS ON ${escapeHtml(startText.toUpperCase())}</strong>
      <div class="muted small">Top 4 qualify automatically. 2 extra are chosen from Playoffs by admin.</div>
    </div>

    <div class="grid" style="grid-template-columns:1fr;gap:10px;">
      ${slots.map((s,i)=>`
        <div class="card">
          <div class="row">
            <strong>Slot ${i+1}</strong>
            <span class="right tag">${escapeHtml(s.label)}</span>
          </div>
          <div style="font-size:20px;margin-top:6px;">
            ${s.team ? `<strong>${escapeHtml(s.team.name)}</strong>` : `<span class="muted">TBD</span>`}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}
