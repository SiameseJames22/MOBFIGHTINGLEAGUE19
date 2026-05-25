import { $, escapeHtml, fetchTeams, getSeasonInfo, db } from "../app.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Tracks active view state: "royale" | "playoffs" | "champions_cup"
let activeView = "royale";

function july10(seasonYear){
  return new Date(Date.UTC(seasonYear, 6, 10, 0, 0, 0)); // July = 6
}

export async function renderPage({ user } = {}){
  const teams = await fetchTeams(); // Sorted by points
  const { seasonYear } = getSeasonInfo(new Date());

  // Handle Mob Royale Data
  const top4 = teams.slice(0, 4);
  const sref = doc(db, "settings", "mobRoyale");
  const ssnap = await getDoc(sref);
  const data = ssnap.exists() ? ssnap.data() : {};
  const wildcards = Array.isArray(data.wildcards) ? data.wildcards : [];

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

  // 1. SELECTOR DROPDOWN UI
  const viewSelectorHtml = `
    <div class="row" style="gap:10px; margin-bottom:16px; width:100%;">
      <label for="royaleViewSelect" style="font-weight:600;">Tournament View:</label>
      <select id="royaleViewSelect" style="max-width:250px;">
        <option value="royale" ${activeView === "royale" ? "selected" : ""}>Mob Royale Slots</option>
        <option value="playoffs" ${activeView === "playoffs" ? "selected" : ""}>Mob Royale Playoffs (5th-8th)</option>
        <option value="champions_cup" ${activeView === "champions_cup" ? "selected" : ""}>🏆 Mob Champions Cup</option>
      </select>
    </div>
  `;

  let contentHtml = "";

  // 2. RENDER SELECTED TOURNAMENT VIEW
  if (activeView === "royale") {
    contentHtml = `
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

  } else if (activeView === "playoffs") {
    // Playoffs Pool consists of positions 5, 6, 7, and 8 from live standings
    const playoffContenders = teams.slice(4, 8);

    contentHtml = `
      <div class="row">
        <h2 style="margin-right:auto;">Mob Royale Playoffs</h2>
        <span class="pill small">Positions 5–8</span>
      </div>

      <div class="banner" style="margin:10px 0; background:rgba(74, 163, 255, 0.12); border-color:var(--accent);">
        <strong>PLAYOFF SEMI-FINALS</strong>
        <div class="muted small">Teams battle head-to-head. Admin selects 2 winners to advance to Mob Royale slots.</div>
      </div>

      <div class="grid" style="grid-template-columns:1fr; gap:12px; margin-top:14px;">
        <div class="card">
          <div class="tag" style="margin-bottom:8px;">Matchup A</div>
          <div class="row" style="justify-content:space-between; font-size:16px;">
            <span><strong>${playoffContenders[0] ? escapeHtml(playoffContenders[0].name) : "5th Position"}</strong> (5th)</span>
            <span class="muted">vs</span>
            <span><strong>${playoffContenders[3] ? escapeHtml(playoffContenders[3].name) : "8th Position"}</strong> (8th)</span>
          </div>
        </div>

        <div class="card">
          <div class="tag" style="margin-bottom:8px;">Matchup B</div>
          <div class="row" style="justify-content:space-between; font-size:16px;">
            <span><strong>${playoffContenders[1] ? escapeHtml(playoffContenders[1].name) : "6th Position"}</strong> (6th)</span>
            <span class="muted">vs</span>
            <span><strong>${playoffContenders[2] ? escapeHtml(playoffContenders[2].name) : "7th Position"}</strong> (7th)</span>
          </div>
        </div>
      </div>
    `;

  } else if (activeView === "champions_cup") {
    // Fake Champions Cup: Group stage distribution layout using live elite mobs 
    const groupAMobs = teams.slice(4, 8);
    const groupBMobs = teams.slice(8, 12);

    const renderGroupTable = (groupName, groupTeams) => `
      <div class="card" style="margin-top:10px;">
        <h3 style="color:var(--accent); border-bottom:1px solid rgba(255,255,255,.08); padding-bottom:6px;">${groupName}</h3>
        <table>
          <thead>
            <tr><th>#</th><th>Team</th><th>P</th><th>GD</th><th>Pts</th></tr>
          </thead>
          <tbody>
            ${[0, 1, 2, 3].map(idx => {
              const t = groupTeams[idx];
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${t ? escapeHtml(t.name) : `Qualified Mob ${idx+1}`}</strong></td>
                  <td>0</td>
                  <td>0</td>
                  <td><strong>0</strong></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    contentHtml = `
      <div class="row">
        <h2 style="margin-right:auto;">🏆 Mob Champions Cup</h2>
        <span class="pill small">Group Stage</span>
      </div>

      <div class="banner" style="margin:10px 0; background:rgba(61, 255, 139, 0.12); border-color:var(--ok);">
        <strong>THE ELITE CHAMPIONS TOURNAMENT</strong>
        <div class="muted small">The highest-seeded eligible creatures across divisions qualify into group tracking.</div>
      </div>

      <div class="grid" style="grid-template-columns:1fr; gap:14px; margin-top:10px;">
        ${renderGroupTable("Group A", groupAMobs)}
        ${renderGroupTable("Group B", groupBMobs)}
      </div>
    `;
  }

  // Combine drop selector structure with template layout canvas injection
  $("page").innerHTML = viewSelectorHtml + contentHtml;

  // Track dynamic events to handle seamless dropdown changing actions
  document.getElementById("royaleViewSelect").addEventListener("change", (e) => {
    activeView = e.target.value;
    renderPage({ user });
  });
}
