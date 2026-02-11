import { $, escapeHtml, fetchTeams } from "../app.js";

export async function renderPage(){
  const teams = await fetchTeams();
  $("page").innerHTML = `
    <div class="row">
      <h2 style="margin-right:auto;">League Table</h2>
      <span class="pill small">Premier League style</span>
    </div>
    <div class="muted small" style="margin-bottom:10px;">
      Standings zones are coming next: Champion • Mob Royale Qualifiers • Mob Royale Playoffs • Normal • Relegation
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th>
          <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>
        ${teams.map((t,i)=>`
          <tr>
            <td>${i+1}</td>
            <td>${escapeHtml(t.name)}</td>
            <td>${t.played||0}</td>
            <td>${t.won||0}</td>
            <td>${t.drawn||0}</td>
            <td>${t.lost||0}</td>
            <td>${t.gf||0}</td>
            <td>${t.ga||0}</td>
            <td>${t.gd ?? ((t.gf||0)-(t.ga||0))}</td>
            <td><strong>${t.points||0}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="muted small" style="margin-top:10px;">Sorting: Points → GD → GF → Name</div>
  `;
}
