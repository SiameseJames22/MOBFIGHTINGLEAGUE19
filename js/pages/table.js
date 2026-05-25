import { $, escapeHtml, fetchTeams } from "../app.js";

// Track active tier (1 = Mob League, 2 = Mob Championship, 3 = Mob League One)
let activeTier = 1;

// Tier 2: Mob Championship (24 completely unique mobs - no duplicates from your live 21)
const championshipTeams = [
  "Elder Guardians", "Evokers", "Vindicators", "Blazes", 
  "Ghasts", "Hoglins", "Zoglins", "Ravagers", 
  "Witches", "Magma Cubes", "Cave Spiders", "Husks", 
  "Strays", "Phantoms", "Shulkers", "Silverfish", 
  "The Creaking", "Piglin Brutes", "Vexes", "Guardians",
  "Mooshrooms", "Striders", "Allays", "Sniffers"
].map((name, i) => ({ 
  name, 
  played: 10, 
  won: 8 - Math.floor(i/4), 
  drawn: Math.floor(i/8), 
  lost: Math.floor(i/4), 
  gf: 32 - (i*1), 
  ga: 10 + (i*1), 
  points: 24 - (i*1)
}));

// Tier 3: Mob League One (24 completely unique mobs - no duplicates from your live 21)
const leagueOneTeams = [
  "Zombie Villagers", "Glow Squids", "Dolphins", "Sea Turtles", 
  "Frogs", "Punas", "Polar Bears", "Ocelots", 
  "Llamas", "Trader Llamas", "Goats", "Bats", 
  "Parrots", "Donkeys", "Mules", "Camels", 
  "Armadillos", "Breezes", "Bogged Skeletons", "Cats",
  "Puffers", "Salmon City", "Cod United", "Bees"
].map((name, i) => ({ 
  name, 
  played: 10, 
  won: 7 - Math.floor(i/4), 
  drawn: Math.floor(i/6), 
  lost: Math.floor(i/4), 
  gf: 28 - (i*1), 
  ga: 12 + (i*1), 
  points: 22 - (i*1)
}));

function zoneForPos(pos, total, tier) {
  if (tier === 1) {
    if (pos === 1) return { key: "champ", label: "🏆 Champion" };
    if (pos >= 2 && pos <= 4) return { key: "qual", label: "✅ Qualifier" };
    if (pos >= 5 && pos <= 8) return { key: "play", label: "🎯 Playoff" };
    if (pos >= 18) return { key: "rel", label: "⬇ Relegation" };
    return { key: "norm", label: "— Normal" };
  }
  
  if (tier === 2) {
    if (pos >= 1 && pos <= 3) return { key: "prom", label: "⬆ Promotion" };
    if (pos >= 4 && pos <= 6) return { key: "play", label: "🎯 Promo Playoff" };
    if (pos >= 22) return { key: "rel", label: "⬇ Relegation" };
    return { key: "norm", label: "— Normal" };
  }

  if (tier === 3) {
    if (pos >= 1 && pos <= 3) return { key: "prom", label: "⬆ Promotion" };
    if (pos >= 4 && pos <= 6) return { key: "play", label: "🎯 Promo Playoff" };
    return { key: "norm", label: "— Normal" };
  }

  return { key: "norm", label: "— Normal" };
}

export async function renderPage() {
  const dbTeams = await fetchTeams();
  
  let currentTeams = [];
  let tierName = "";
  let legendHtml = "";

  if (activeTier === 1) {
    currentTeams = dbTeams.filter(t => t.division === 1 || t.division === "1" || !t.division);
    tierName = "Mob League";
    legendHtml = `
      <span class="tag">🏆 Champion (1st)</span>
      <span class="tag">✅ Mob Royale Qualifiers (2–4)</span>
      <span class="tag">🎯 Mob Royale Playoffs (5–8)</span>
      <span class="tag">— Normal (9–17)</span>
      <span class="tag">⬇ Relegation (18–21)</span>
    `;
  } else if (activeTier === 2) {
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
          const computedGD = t.gd ?? ((t.gf || 0) - (t.ga || 0));
          
          // Build out the contextual tracking strings to push straight to the team page URL params!
          const teamUrlParams = new URLSearchParams({
            name: t.name,
            rank: pos,
            tier: tierName,
            zone: z.label,
            gf: t.gf || 0,
            ga: t.ga || 0,
            pts: t.points || 0
          }).toString();

          return `
            <tr>
              <td>${pos}</td>
              <td>
                <a href="./team.html?${teamUrlParams}" class="link" style="font-weight: bold; text-decoration: none; color: white;">
                  ${escapeHtml(t.name)}
                </a>
              </td>
              <td><span class="tag">${z.label}</span></td>
              <td>${t.played || 0}</td>
              <td>${t.won || 0}</td>
              <td>${t.drawn || 0}</td>
              <td>${t.lost || 0}</td>
              <td>${t.gf || 0}</td>
              <td>${t.ga || 0}</td>
              <td>${computedGD}</td>
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
