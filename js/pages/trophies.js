import { $, escapeHtml, fetchTeams } from "../app.js";

export async function renderPage(){
  const teams = await fetchTeams();

  // show by trophies then name
  const sorted = [...teams].sort((a,b)=>
    (Number(b.trophies||0) - Number(a.trophies||0)) ||
    String(a.name||"").localeCompare(String(b.name||""))
  );

  $("page").innerHTML = `
    <div class="row">
      <h2 style="margin-right:auto;">Trophies & Rivals</h2>
      <span class="pill small">Admin edits in Admin tab</span>
    </div>

    <table style="margin-top:10px;">
      <thead>
        <tr>
          <th>Team</th>
          <th>Trophies</th>
          <th>Rivals</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(t=>{
          const rivals = Array.isArray(t.rivals) ? t.rivals : [];
          return `
            <tr>
              <td><strong>${escapeHtml(t.name)}</strong></td>
              <td>${Number(t.trophies||0)}</td>
              <td>${rivals.length ? rivals.map(r=>`<span class="tag">${escapeHtml(r)}</span>`).join(" ") : `<span class="muted">—</span>`}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}
