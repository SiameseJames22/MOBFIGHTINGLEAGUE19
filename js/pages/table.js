import { $, escapeHtml, fetchTeams } from "../app.js";

// Track the active division state
let activeDivision = 1;

function zoneForPos(pos, total, division) {
  // DIVISION 1 RULES
  if (division === 1) {
    if (pos === 1) return { key: "champ", label: "🏆 Champion" };
    if (pos >= 2 && pos <= 4) return { key: "qual", label: "✅ Qualifier" };
    if (pos >= 5 && pos <= 8) return { key: "play", label: "🎯 Playoff" };
    if (pos >= 14 && pos <= 16) return { key: "rel", label: "⬇ Relegation" };
    return { key: "norm", label: "— Normal" };
  }
  
  // DIVISION 2 RULES
  if (division === 2) {
    if (pos >= 1 && pos <= 3) return { key: "prom", label: "⬆ Promotion" };
    if (pos >= 4 && pos <= 6) return { key: "play", label: "🎯 Promotion Playoff" };
    if (pos >= 14 && pos <= 16) return { key: "rel", label: "⬇ Relegation" };
    return { key: "norm", label: "— Normal" };
  }

  // DIVISION 3 RULES
  if (division === 3) {
    if (pos >= 1 && pos <= 3) return { key: "prom", label: "⬆ Promotion" };
    if (pos >= 4 && pos <= 6) return { key: "play", label: "🎯 Promotion Playoff" };
    return { key: "norm", label: "— Normal" };
  }

  return { key: "norm", label: "— Normal" };
}

export async function renderPage() {
  const allTeams = await fetchTeams();

  // Filter teams for the active division.
  // Fallback: If your team objects don't have a '.division' key yet, 
  // this splits your massive list into groups of 16 for testing!
  const filteredTeams = allTeams.filter(t => {
    if (t.division !== undefined) {
      return Number(t.division) === activeDivision;
    }
    // Fallback logic split:
    if (activeDivision === 1) return allTeams.indexOf(t) < 16;
    if (activeDivision === 2) return allTeams.indexOf(t) >= 16 && allTeams.indexOf(t) < 32;
    return allTeams.indexOf(t) >= 32;
  });

  const total = filteredTeams.length || 16;

  // Build the Division Navigation Bar with CSS styling matching your design
  const navHtml = `
    <div class="row" style="gap: 8px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,.08); padding-bottom: 12px; width: 100%;">
      <button class="btn ${activeDivision === 1 ? 'primary' : ''}" id="btnDiv1">Division 1</button>
      <button class="btn ${activeDivision === 2 ? 'primary' : ''}" id="btnDiv2">Division 2</button>
      <button class="btn ${activeDivision === 3 ? 'primary' : ''}" id="btnDiv3">Division 3</button>
    </div>
  `;

  // Build key indicator legends based on the active division
  let legendHtml = '';
  if (activeDivision === 1) {
    legendHtml = `
      <span class="tag">🏆 Champion (1st)</span>
      <span class="tag">✅ Mob Royale Qualifiers (2–4)</span>
      <span class="tag">🎯 Mob Royale Playoffs (5–8)</span>
      <span class="tag">— Normal (9–13)</span>
      <span class="tag">⬇ Relegation (14–16)</span>
    `;
  } else if (activeDivision === 2) {
    legendHtml = `
      <span class="tag">⬆ Promotion (1st–3rd)</span>
      <span class="tag">🎯 Promotion Playoffs (4th–6th)</span>
      <span class="tag">— Normal (7th–13th)</span>
      <span class="tag">⬇ Relegation (14th–16)</span>
    `;
  } else {
    legendHtml = `
      <span class="tag">⬆ Promotion (1st–3rd)</span>
      <span class="tag">🎯 Promotion Playoffs (4th–6th)</span>
      <span class="tag">— Normal (7th+)</span>
    `;
  }

  $("page").innerHTML = `
    ${navHtml}

    <div class="row">
      <h2 style="margin-right:auto;">Division ${activeDivision} Table</h2>
    </div>

    <div class="stack" style="margin:10px 0;">
      <div class="row" style="gap:8px;flex-wrap:wrap;">
        ${legendHtml}
      </div>
      <div class="muted small">Sorting: Points → GD → GF → Name</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th><th>Team</th><th>Zone</th><th>P</th><th>W</th><th>D</th><th>L</th>
          <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>
        ${filteredTeams.map((t, i) => {
          const pos = i + 1;
          const z = zoneForPos(pos, total, activeDivision);
          return `
            <tr>
              <td>${pos}</td>
              <td><strong>${escapeHtml(t.name)}</strong></td>
              <td><span class="tag">${z.label}</span></td>
              <td>${t.played || 0}</td>
              <td>${t.won || 0}</td>
              <td>${t.drawn || 0}</td>
              <td>${t.lost || 0}</td>
              <td>${t.gf || 0}</td>
              <td>${t.ga || 0}</td>
              <td>${t.gd ?? ((t.gf || 0) - (t.ga || 0))}</td>
              <td><strong>${t.points || 0}</strong></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  // Attach dynamic event listeners to toggle between divisions smoothly
  document.getElementById("btnDiv1").addEventListener("click", () => { activeDivision = 1; renderPage(); });
  document.getElementById("btnDiv2").addEventListener("click", () => { activeDivision = 2; renderPage(); });
  document.getElementById("btnDiv3").addEventListener("click", () => { activeDivision = 3; renderPage(); });
}
