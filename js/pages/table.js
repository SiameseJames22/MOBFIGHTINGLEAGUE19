import { $, escapeHtml, fetchTeams } from "../app.js";

// Track active tier (1 = Mob League, 2 = Mob Championship, 3 = Mob League One)
let activeTier = 1;

// Generated placeholder teams for Tier 2: Mob Championship (24 Teams)
const championshipTeams = [
  "Wither Skeleton FC", "Piglin Brute United", "Evoker City", "Vindicator Athletic",
  "Blaze Rovers", "Ghast Rangers", "Endermite FC", "Magma Cube Albion",
  "Cave Spider Town", "Husk United", "Stray City", "Drowned Athletic",
  "Phantom Rovers", "Shulker Rangers", "Hoglin FC", "Zoglin United",
  "Ravager City", "Pillager Athletic", "Witch Rovers", "Guardian Rangers",
  "Elder Guardian FC", "Slime United", "Silverfish City", "Creaking Athletic"
].map(name => ({ name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }));

// Generated placeholder teams for Tier 3: Mob League One (24 Teams)
const leagueOneTeams = [
  "Zombie Pigman FC", "Iron Golem United", "Snow Golem City", "Enderman Athletic",
  "Creeper Rovers", "Zombie Rangers", "Skeleton FC", "Spider United",
  "Wolf City", "Ocelot Athletic", "Polar Bear Rovers", "Panda Rangers",
  "Llama FC", "Goat United", "Fox City", "Bee Athletic",
  "Strider Rovers", "Frog Rangers", "Axolotl FC", "Glow Squid United",
  "Dolphin City", "Turtle Athletic", "Chicken Rovers", "Cow Rangers"
].map(name => ({ name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }));

function zoneForPos(pos, total, tier) {
  // Tier 1: Mob League (20 Teams)
  if (tier === 1) {
    if (pos === 1) return { key: "champ", label: "🏆 Champion" };
    if (pos >= 2 && pos <= 4) return { key: "qual", label: "✅ Qualifier" };
    if (pos >= 5 && pos <= 8) return { key: "play", label: "🎯 Playoff" };
    if (pos >= 18) return { key: "rel", label: "⬇ Relegation" };
    return { key: "norm", label: "— Normal" };
  }
  
  // Tier 2: Mob Championship (24 Teams)
  if (tier === 2) {
    if (pos >= 1 && pos <= 3) return { key: "prom", label: "⬆ Promotion" };
    if (pos >= 4 && pos <= 6) return { key: "play", label: "🎯 Promo Playoff" };
    if (pos >= 22) return { key: "rel", label: "⬇ Relegation" };
    return { key: "norm", label: "— Normal" };
  }

  // Tier 3: Mob League One (24 Teams)
  if (tier === 3) {
    if (pos >= 1 && pos <= 3) return { key: "prom", label: "⬆ Promotion" };
    if (pos >= 4 && pos <= 6) return { key: "play", label: "🎯 Promo Playoff" };
    return { key: "norm", label: "— Normal" };
  }

  return { key: "norm", label: "— Normal" };
}

export async function renderPage() {
  // Fetch all live teams from your Firebase database
  const dbTeams = await fetchTeams();
  
  let currentTeams = [];
  let tierName = "";
  let legendHtml = "";

  if (activeTier === 1) {
    // TIER 1: Pull teams that are explicitly set to division 1, OR don't have a division key yet (your original 20 teams)
    currentTeams = dbTeams.filter(t => t.division === 1 || t.division === "1" || !t.division);
    tierName = "Mob League";
    legendHtml = `
      <span class="tag">🏆 Champion (1st)</span>
      <span class="tag">✅ Mob Royale Qualifiers (2–4)</span>
      <span class="tag">🎯 Mob Royale Playoffs (5–8)</span>
      <span class="tag">— Normal (9–17)</span>
      <span class="tag">⬇ Relegation (18–20)</span>
    `;
  } else if (activeTier === 2) {
    // TIER 2: Pull from database if any team has division === 2. If none exist yet, display the generated 24 Championship mobs!
    const dbTier2 = dbTeams.filter(t => t.division === 2 || t.division === "2");
    currentTeams = dbTier2.length > 0 ? dbTier2 : championshipTeams;
    tierName = "Mob Championship";
    legendHtml = `
      <span class="tag">⬆ Promotion to Mob League (1st–3rd)</span>
      <span class="tag">🎯 Promotion Playoffs (4th–6th)</span>
      <span class="tag">— Normal (7th–21st)</span>
      <span class="tag">⬇ Relegation to League One (22nd–24th)</span>
    `;
  } else {
    // TIER 3: Pull from database if division === 3. If empty, fall back to our generated 24 League One mobs!
    const dbTier3 = dbTeams.filter(t => t.division === 3 || t.division === "3");
    currentTeams = dbTier3.length > 0 ? dbTier3 : leagueOneTeams;
    tierName = "Mob League One";
    legendHtml = `
      <span class="tag">⬆ Promotion to Championship (1st–3rd)</span>
      <span class="tag">🎯 Promotion Playoffs (4th–6th)</span>
      <span class="tag">— Normal (7th–24th)</span>
    `;
  }

  const total = currentTeams.length;

  const navHtml = `
    <div class="row" style="gap: 8px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,.08); padding-bottom: 12px; width: 100%;">
      <button class="btn ${activeTier === 1 ? 'primary' : ''}" id="btnTier1">Mob League</button>
      <button class="btn ${activeTier === 2 ? 'primary' : ''}" id="btnTier2">Mob Championship</button>
      <button class="btn ${activeTier === 3 ? 'primary' : ''}" id="btnTier3">Mob League One</button>
    </div>
  `;

  $("page").innerHTML = `
    ${navHtml}

    <div class="row">
      <h2 style="margin-right:auto;">${tierName} Table</h2>
      <span class="pill small">Teams: ${total}</span>
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
        ${currentTeams.map((t, i) => {
          const pos = i + 1;
          const z = zoneForPos(pos, total, activeTier);
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

  document.getElementById("btnTier1").addEventListener("click", () => { activeTier = 1; renderPage(); });
  document.getElementById("btnTier2").addEventListener("click", () => { activeTier = 2; renderPage(); });
  document.getElementById("btnTier3").addEventListener("click", () => { activeTier = 3; renderPage(); });
}
