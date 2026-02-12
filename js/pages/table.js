import { $, escapeHtml, fetchTeams } from "../app.js";

function zoneForPos(pos, total){
  // 16 teams default:
  // 1 Champion
  // 2-4 Mob Royale Qualifiers
  // 5-8 Mob Royale Playoffs
  // 9-13 Normal
  // 14-16 Relegation
  if (pos === 1) return { key:"champ", label:"Champion" };
  if (pos >= 2 && pos <= 4) return { key:"qual", label:"Mob Royale Qualifier" };
  if (pos >= 5 && pos <= 8) return { key:"play", label:"Mob Royale Playoff" };
  if (pos >= 19) return { key:"rel", label:"Relegation" };
  return { key:"norm", label:"Normal" };
}

export async function renderPage(){
  const teams = await fetchTeams();
  const total = teams.length || 16;

  $("page").innerHTML = `
    <div class="row">
      <h2 style="margin-right:auto;">League Table</h2>
      <span class="pill small">Champion • Qualifiers • Playoffs • Normal • Relegation</span>
    </div>

    <div class="stack" style="margin:10px 0;">
      <div class="row" style="gap:8px;flex-wrap:wrap;">
        <span class="tag">🏆 Champion (1st)</span>
        <span class="tag">✅ Mob Royale Qualifiers (2–4)</span>
        <span class="tag">🎯 Mob Royale Playoffs (5–8)</span>
        <span class="tag">— Normal (9–13)</span>
        <span class="tag">⬇ Relegation (14–16)</span>
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
        ${teams.map((t,i)=>{
          const pos = i+1;
          const z = zoneForPos(pos,total);
          const zoneTag =
            z.key==="champ" ? "🏆 Champion" :
            z.key==="qual" ? "✅ Qualifier" :
            z.key==="play" ? "🎯 Playoff" :
            z.key==="rel" ? "⬇ Relegation" : "— Normal";
          return `
            <tr>
              <td>${pos}</td>
              <td><strong>${escapeHtml(t.name)}</strong></td>
              <td><span class="tag">${zoneTag}</span></td>
              <td>${t.played||0}</td>
              <td>${t.won||0}</td>
              <td>${t.drawn||0}</td>
              <td>${t.lost||0}</td>
              <td>${t.gf||0}</td>
              <td>${t.ga||0}</td>
              <td>${t.gd ?? ((t.gf||0)-(t.ga||0))}</td>
              <td><strong>${t.points||0}</strong></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}
