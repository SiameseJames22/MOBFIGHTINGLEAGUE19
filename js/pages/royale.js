import { $, escapeHtml, fetchTeams, getSeasonInfo, db } from "../app.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Active tournament view state tracker
let activeView = "royale"; 

// Hardcoded Tier 2 + Tier 3 rosters to ensure ALL 69 clubs are represented in the World Mob Cup
const tier2Names = [
  "Elder Guardians", "Evokers", "Vindicators", "Blazes", "Ghasts", "Hoglins", "Zoglins", "Ravagers", 
  "Witches", "Magma Cubes", "Cave Spiders", "Husks", "Strays", "Phantoms", "Shulkers", "Silverfish", 
  "The Creaking", "Piglin Brutes", "Vexes", "Guardians", "Mooshrooms", "Striders", "Allays", "Sniffers"
];
const tier3Names = [
  "Zombie Villagers", "Glow Squids", "Dolphins", "Sea Turtles", "Frogs", "Punas", "Polar Bears", "Ocelots", 
  "Llamas", "Trader Llamas", "Goats", "Bats", "Parrots", "Donkeys", "Mules", "Camels", 
  "Armadillos", "Breezes", "Bogged Skeletons", "Cats", "Puffers", "Salmon City", "Cod United", "Bees"
];

function july10(seasonYear){
  return new Date(Date.UTC(seasonYear, 6, 10, 0, 0, 0));
}

export async function renderPage({ user } = {}) {
  const dbTeams = await fetchTeams(); // Live Tier 1 Mobs (21 teams)
  const { seasonYear } = getSeasonInfo(new Date());

  // 1. ASSEMBLE ALL COMBINED 69 CLUBS FOR THE WORLD MOB CUP
  const t2Teams = tier2Names.map(name => ({ name, points: 0, gd: 0 }));
  const t3Teams = tier3Names.map(name => ({ name, points: 0, gd: 0 }));
  const all69Clubs = [...dbTeams.map(t => ({ name: t.name, points: t.points || 0, gd: t.gd || 0 })), ...t2Teams, ...t3Teams];

  // 2. MOB ROYALE SEEDING LOGIC
  const top4 = dbTeams.slice(0, 4);
  const sref = doc(db, "settings", "mobRoyale");
  const ssnap = await getDoc(sref);
  const data = ssnap.exists() ? ssnap.data() : {};
  const wildcards = Array.isArray(data.wildcards) ? data.wildcards : [];
  const map = new Map(dbTeams.map(t => [t.id, t]));
  const wcTeams = wildcards.map(id => map.get(id)).filter(Boolean);

  const slots = [
    { label: "Auto #1", team: top4[0] }, { label: "Auto #2", team: top4[1] },
    { label: "Auto #3", team: top4[2] }, { label: "Auto #4", team: top4[3] },
    { label: "Playoff Pick #1", team: wcTeams[0] || null }, { label: "Playoff Pick #2", team: wcTeams[1] || null },
  ];

  // 3. NAVIGATION BAR UI (Toggles between all 4 elite tournaments)
  const menuNavHtml = `
    <div class="row" style="gap: 8px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,.08); padding-bottom: 14px; flex-wrap: wrap; width: 100%;">
      <button class="btn ${activeView === 'royale' ? 'primary' : ''}" id="navRoyale">Mob Royale Slots</button>
      <button class="btn ${activeView === 'playoffs' ? 'primary' : ''}" id="navPlayoffs">Royale Playoffs (5th-8th)</button>
      <button class="btn ${activeView === 'champions_cup' ? 'primary' : ''}" id="navChampions">🏆 Mob Champions Cup</button>
      <button class="btn ${activeView === 'world_cup' ? 'primary' : ''}" id="navWorldCup" style="background: linear-gradient(135deg, #ffaa00, #ff5500); color: white; border: none;">🌎 WORLD MOB CUP</button>
    </div>
  `;

  let mainBodyHtml = "";

  // ================= VIEW: MOB ROYALE SLOTS =================
  if (activeView === "royale") {
    const startDate = july10(seasonYear);
    const startText = startDate.toLocaleDateString(undefined, { day:"2-digit", month:"long", year:"numeric" });
    mainBodyHtml = `
      <div class="row"><h2 style="margin-right:auto;">Mob Royale Bracket</h2><span class="pill small">6 Slots</span></div>
      <div class="banner" style="margin:10px 0;">
        <strong>ROYALE STARTS ON ${escapeHtml(startText.toUpperCase())}</strong>
        <div class="muted small">Top 4 qualify automatically. 2 extra are chosen from Playoffs by admin.</div>
      </div>
      <div class="grid" style="grid-template-columns:1fr;gap:10px;">
        ${slots.map((s,i)=>`
          <div class="card">
            <div class="row"><strong>Slot ${i+1}</strong><span class="right tag">${escapeHtml(s.label)}</span></div>
            <div style="font-size:20px;margin-top:6px;">
              ${s.team ? `<strong>${escapeHtml(s.team.name)}</strong>` : `<span class="muted">TBD</span>`}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // ================= VIEW: ROYALE PLAYOFFS =================
  else if (activeView === "playoffs") {
    const playoffContenders = dbTeams.slice(4, 8);
    mainBodyHtml = `
      <div class="row"><h2 style="margin-right:auto;">Mob Royale Playoffs</h2><span class="pill small">Positions 5–8</span></div>
      <div class="banner" style="margin:10px 0; background:rgba(74, 163, 255, 0.12); border-color:var(--accent);">
        <strong>PLAYOFF SEMI-FINALS MATCHUPS</strong>
      </div>
      <div class="grid" style="grid-template-columns:1fr; gap:12px;">
        <div class="card">
          <div class="tag" style="margin-bottom:8px;">Matchup A</div>
          <div class="row" style="justify-content:space-between; font-size:16px;">
            <span><strong>${playoffContenders[0] ? escapeHtml(playoffContenders[0].name) : "5th Pos"}</strong></span>
            <span class="muted">vs</span>
            <span><strong>${playoffContenders[3] ? escapeHtml(playoffContenders[3].name) : "8th Pos"}</strong></span>
          </div>
        </div>
        <div class="card">
          <div class="tag" style="margin-bottom:8px;">Matchup B</div>
          <div class="row" style="justify-content:space-between; font-size:16px;">
            <span><strong>${playoffContenders[1] ? escapeHtml(playoffContenders[1].name) : "6th Pos"}</strong></span>
            <span class="muted">vs</span>
            <span><strong>${playoffContenders[2] ? escapeHtml(playoffContenders[2].name) : "7th Pos"}</strong></span>
          </div>
        </div>
      </div>
    `;
  }

  // ================= VIEW: CHAMPIONS CUP =================
  else if (activeView === "champions_cup") {
    const renderGroup = (gName, groupTeams) => `
      <div class="card" style="margin-top:10px;">
        <h3 style="color:var(--accent); border-bottom:1px solid rgba(255,255,255,.08); padding-bottom:6px;">${gName}</h3>
        <table>
          <thead><tr><th>#</th><th>Team</th><th>P</th><th>Pts</th></tr></thead>
          <tbody>
            ${[0,1,2,3].map(idx => `
              <tr><td>${idx+1}</td><td><strong>${groupTeams[idx] ? escapeHtml(groupTeams[idx].name) : `Contender ${idx+1}`}</strong></td><td>0</td><td>0</td></tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    mainBodyHtml = `
      <div class="row"><h2 style="margin-right:auto;">🏆 Mob Champions Cup</h2><span class="pill small">Elite Group Phase</span></div>
      <div class="grid" style="grid-template-columns:1fr; gap:14px;">
        ${renderGroup("Group A", dbTeams.slice(4, 8))}
        ${renderGroup("Group B", dbTeams.slice(8, 12))}
      </div>
    `;
  }

  // ================= VIEW: WORLD MOB CUP (ALL 69 CLUBS) =================
  else if (activeView === "world_cup") {
    // Distribute all 69 clubs across 8 distinct Groups (approx 8-9 clubs per group)
    const totalGroups = 8;
    const groupLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const groupsData = Array.from({ length: totalGroups }, () => []);
    
    all69Clubs.forEach((club, index) => {
      groupsData[index % totalGroups].push(club);
    });

    // Extract group winners to form the knockout stage simulations
    const simulatedKnockoutTeams = groupLetters.map((letter, i) => {
      // Use highest sorting index or active database points to decide a simulated winner
      const sorted = [...groupsData[i]].sort((a,b) => b.points - a.points);
      return sorted[0]?.name || `Winner Group ${letter}`;
    });

    mainBodyHtml = `
      <div class="row">
        <h2 style="margin-right:auto; color:#ffaa00;">🌎 The Ultimate World Mob Cup</h2>
        <span class="pill small" style="background:#ff5500; color:#fff;">69 Clubs • 1 Champion</span>
      </div>

      <div class="banner" style="margin:10px 0; background:rgba(255, 170, 0, 0.1); border-color:#ffaa00;">
        <strong>THE GLOBAL SHOWDOWN</strong>
        <div class="muted small">Every single club across all three tiers competes in the group stage. Group leaders advance to the sudden death knockouts!</div>
      </div>

      <h2 style="margin-top:24px; border-bottom: 2px solid #ffaa00; padding-bottom:6px;">1. Group Stages</h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:16px; margin-top:12px;">
        ${groupLetters.map((letter, groupIdx) => `
          <div class="card" style="border-left: 3px solid #ffaa00;">
            <h3 style="color:#ffaa00; font-weight:bold;">Group ${letter}</h3>
            <table style="font-size:12px;">
              <thead><tr><th>#</th><th>Club</th><th>Pts</th></tr></thead>
              <tbody>
                ${groupsData[groupIdx].map((club, itemIdx) => `
                  <tr style="${itemIdx === 0 ? 'background:rgba(255,170,0,0.08); font-weight:bold;' : ''}">
                    <td>${itemIdx + 1}</td>
                    <td style="white-space:nowrap; max-width:160px; overflow:hidden; text-overflow:ellipsis;">
                      ${itemIdx === 0 ? '⭐ ' : ''}${escapeHtml(club.name)}
                    </td>
                    <td>${club.points + (12 - itemIdx)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `).join("")}
      </div>

      <h2 style="margin-top:34px; border-bottom: 2px solid #ff5500; padding-bottom:6px;">2. Sudden-Death Knockout Brackets</h2>
      <div class="grid" style="grid-template-columns: 1fr; gap:20px; margin-top:16px;">
        
        <div class="card" style="background:rgba(255,255,255,0.02);">
          <div class="tag" style="background:#ffaa00; color:black; font-weight:bold; margin-bottom:12px;">Quarter-Final Brackets</div>
          <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
            <div class="card alt" style="font-size:12px; padding:10px;">
              <strong>QF1:</strong> ${escapeHtml(simulatedKnockoutTeams[0])} <br><span class="muted">vs</span><br> <strong>${escapeHtml(simulatedKnockoutTeams[7])}</strong>
            </div>
            <div class="card alt" style="font-size:12px; padding:10px;">
              <strong>QF2:</strong> <strong>${escapeHtml(simulatedKnockoutTeams[1])}</strong> <br><span class="muted">vs</span><br> ${escapeHtml(simulatedKnockoutTeams[6])}
            </div>
            <div class="card alt" style="font-size:12px; padding:10px;">
              <strong>QF3:</strong> ${escapeHtml(simulatedKnockoutTeams[2])} <br><span class="muted">vs</span><br> <strong>${escapeHtml(simulatedKnockoutTeams[5])}</strong>
            </div>
            <div class="card alt" style="font-size:12px; padding:10px;">
              <strong>QF4:</strong> <strong>${escapeHtml(simulatedKnockoutTeams[3])}</strong> <br><span class="muted">vs</span><br> ${escapeHtml(simulatedKnockoutTeams[4])}
            </div>
          </div>
        </div>

        <div class="grid" style="grid-template-columns: 1fr; gap:16px;">
          <div class="card">
            <div class="tag" style="background:#ff5500; margin-bottom:10px;">Semi-Final Brackets</div>
            <div class="row" style="justify-content: space-around; flex-wrap:wrap; gap:15px; font-size:13px;">
              <div>${escapeHtml(simulatedKnockoutTeams[7])} vs <strong>${escapeHtml(simulatedKnockoutTeams[1])}</strong></div>
              <div class="muted">|</div>
              <div>${escapeHtml(simulatedKnockoutTeams[5])} vs <strong>${escapeHtml(simulatedKnockoutTeams[3])}</strong></div>
            </div>
          </div>

          <div class="card" style="text-align:center; background: radial-gradient(circle, #221a0f, #120d07); border: 2px solid #ffaa00; padding: 30px 20px;">
            <div style="font-size:36px; margin-bottom:8px;">🏆</div>
            <h3 style="color:#ffaa00; border:none; margin:0; font-size:16px; letter-spacing:1px;">GRAND FINALE</h3>
            <div style="font-size:22px; margin:14px 0; font-weight:800;">
              ${escapeHtml(simulatedKnockoutTeams[1])} <span style="color:#ff5500; font-size:16px; font-weight:normal;">vs</span> ${escapeHtml(simulatedKnockoutTeams[3])}
            </div>
            <div class="tag" style="background:#ffaa00; color:black; font-weight:bold; font-size:13px; padding:4px 14px;">
              🏆 FINAL WINNER: ${escapeHtml(simulatedKnockoutTeams[1]).toUpperCase()}
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // Render the constructed layout
  $("page").innerHTML = menuNavHtml + mainBodyHtml;

  // Setup Event Listeners for tournament selector buttons
  document.getElementById("navRoyale").onclick = () => { activeView = "royale"; renderPage({ user }); };
  document.getElementById("navPlayoffs").onclick = () => { activeView = "playoffs"; renderPage({ user }); };
  document.getElementById("navChampions").onclick = () => { activeView = "champions_cup"; renderPage({ user }); };
  document.getElementById("navWorldCup").onclick = () => { activeView = "world_cup"; renderPage({ user }); };
}
