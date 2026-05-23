// ============================================================
//  TABS
// ============================================================

const _PANELS  = { recomendacoes: "panelRecomendacoes", jogos: "panelJogos", tabelas: "panelTabelas" };
const _TABBTNS = { recomendacoes: "tabBtnRec", jogos: "tabBtnJogos", tabelas: "tabBtnTab" };

function apostasTab(tab) {
  Object.keys(_PANELS).forEach(t => {
    document.getElementById(_PANELS[t]).style.display  = t === tab ? "block" : "none";
    document.getElementById(_TABBTNS[t]).classList.toggle("apostas-tab--active", t === tab);
  });
  localStorage.setItem("apostas_tab", tab);

  const bar = document.getElementById("leagueControlBar");
  if (bar) bar.style.display = (tab === "jogos" || tab === "tabelas") ? "block" : "none";

  if ((tab === "jogos" || tab === "tabelas") && !window._leaguesLoaded) {
    loadLeagues();
  } else if (window._leaguesLoaded && window._activeLeague) {
    if (tab === "jogos") loadJogos(window._activeLeague);
    if (tab === "tabelas") loadTabela(window._activeLeague);
  }
}

// ============================================================
//  INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("apostas_tab") || "recomendacoes";
  apostasTab(saved);
  loadTips();
});

function pad(n) { return String(n).padStart(2, "0"); }

// ============================================================
//  LEAGUE SELECTOR (shared between Jogos + Tabelas)
// ============================================================

window._leaguesLoaded  = false;
window._activeLeague   = null;

async function loadLeagues() {
  const sel = document.getElementById("leagueSelect");
  try {
    const resp = await fetch("/api/apostas/espn/leagues");
    const list = await resp.json();

    const byCategory = {};
    list.forEach(lg => {
      if (!byCategory[lg.category]) byCategory[lg.category] = [];
      byCategory[lg.category].push(lg);
    });

    sel.innerHTML = "";
    Object.entries(byCategory).forEach(([cat, items]) => {
      const grp = document.createElement("optgroup");
      grp.label = cat;
      items.forEach(lg => {
        const opt = document.createElement("option");
        opt.value = lg.slug;
        opt.textContent = lg.name;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });

    window._leaguesLoaded = true;

    const saved = localStorage.getItem("apostas_league") || list[0]?.slug;
    if (saved) {
      sel.value = saved;
      selectLeague(saved);
    }
  } catch {
    sel.innerHTML = '<option disabled selected>Erro ao carregar campeonatos</option>';
  }
}

function onLeagueSelectChange() {
  const sel = document.getElementById("leagueSelect");
  if (sel && sel.value) selectLeague(sel.value);
}

function selectLeague(slug) {
  window._activeLeague = slug;
  localStorage.setItem("apostas_league", slug);

  const sel = document.getElementById("leagueSelect");
  if (sel && sel.value !== slug) sel.value = slug;

  const currentTab = localStorage.getItem("apostas_tab") || "recomendacoes";
  if (currentTab === "jogos") loadJogos(slug);
  if (currentTab === "tabelas") loadTabela(slug);
}

// ============================================================
//  PRÓXIMOS JOGOS
// ============================================================

window._jogosData = null;

function reloadJogos() {
  if (window._activeLeague) loadJogos(window._activeLeague);
}

function applyJogosFilter() {
  if (!window._jogosData) return;

  const minDiff = parseInt(document.getElementById("jogosDiff")?.value || "0", 10);

  let matches = window._jogosData.matches;
  if (minDiff > 0) {
    matches = matches.filter(m => m.pos_diff != null && m.pos_diff >= minDiff);
  }

  if (matches.length === 0) {
    const total = window._jogosData.matches.length;
    const msg = minDiff > 0
      ? `Nenhum jogo com diferença ≥ ${minDiff} posições (${total} jogos no período sem esse filtro).`
      : "Nenhum jogo agendado para este período.";
    document.getElementById("jogosVazioMsg").textContent = msg;
    setJogosState("vazio");
    return;
  }

  renderJogosMatches(window._jogosData, matches);
  setJogosState("content");
}

async function loadJogos(slug) {
  const days = document.getElementById("jogosDays")?.value || 14;
  setJogosState("loading");

  try {
    const resp = await fetch(`/api/apostas/espn/fixtures/${encodeURIComponent(slug)}?days=${days}`);
    const json = await resp.json();
    if (!resp.ok) { setJogosState("erro", json.error); return; }

    window._jogosData = json;
    applyJogosFilter();
  } catch {
    setJogosState("erro", "Não foi possível conectar ao servidor.");
  }
}

function setJogosState(state, msg) {
  document.getElementById("jogosLoading").style.display = state === "loading" ? "flex"  : "none";
  document.getElementById("jogosContent").style.display = state === "content" ? "block" : "none";
  document.getElementById("jogosVazio").style.display   = state === "vazio"   ? "flex"  : "none";
  document.getElementById("jogosErro").style.display    = state === "erro"    ? "flex"  : "none";
  if (state === "erro" && msg) document.getElementById("jogosErroMsg").textContent = msg;
}

function renderJogosMatches(data, matches) {
  const content = document.getElementById("jogosContent");
  content.innerHTML = data.season
    ? `<div class="tabelas-season">${escHtml(data.season)}</div>`
    : "";

  const byDate = {};
  matches.forEach(m => {
    const dayKey = m.date_brt ? m.date_brt.slice(0, 10) : "?";
    if (!byDate[dayKey]) byDate[dayKey] = [];
    byDate[dayKey].push(m);
  });

  Object.entries(byDate).forEach(([day, dayMatches]) => {
    let html = `<div class="jogos-day-group">
      <div class="jogos-day-header">${formatDayLabel(day)}</div>`;
    dayMatches.forEach(m => { html += buildMatchRow(m); });
    html += `</div>`;
    content.innerHTML += html;
  });
}

function buildMatchRow(m) {
  const homePosHtml = m.home_pos ? `<span class="jogos-pos jogos-pos--${posTier(m.home_pos)}">#${m.home_pos}</span>` : "";
  const awayPosHtml = m.away_pos ? `<span class="jogos-pos jogos-pos--${posTier(m.away_pos)}">#${m.away_pos}</span>` : "";
  const diffHtml    = m.pos_diff != null ? buildJogosDiff(m.pos_diff) : "";

  const time  = m.date_brt ? m.date_brt.slice(11, 16) : "";
  const venue = m.venue    ? `<span class="jogos-venue">${escHtml(m.venue)}</span>` : "";

  let scoreHtml = "";
  if (m.state === "in") {
    scoreHtml = `<span class="jogos-score jogos-score--live">${escHtml(m.score_home)} – ${escHtml(m.score_away)}</span>`;
  } else if (m.state === "post") {
    scoreHtml = `<span class="jogos-score jogos-score--final">${escHtml(m.score_home)} – ${escHtml(m.score_away)}</span>`;
  } else {
    scoreHtml = `<span class="jogos-time">${escHtml(time)}</span>`;
  }

  return `
    <div class="jogos-match-row">
      <div class="jogos-team jogos-team--home">
        ${homePosHtml}
        <span class="jogos-team-name">${escHtml(m.home_name)}</span>
      </div>
      <div class="jogos-center">
        ${diffHtml}
        ${scoreHtml}
      </div>
      <div class="jogos-team jogos-team--away">
        <span class="jogos-team-name">${escHtml(m.away_name)}</span>
        ${awayPosHtml}
      </div>
      <div class="jogos-meta">${venue}</div>
    </div>
  `;
}

function buildJogosDiff(diff) {
  if (diff >= 10) return `<span class="jogos-diff jogos-diff--high">Δ${diff}</span>`;
  if (diff >= 5)  return `<span class="jogos-diff jogos-diff--mid">Δ${diff}</span>`;
  if (diff >= 2)  return `<span class="jogos-diff jogos-diff--low">Δ${diff}</span>`;
  return "";
}

function posTier(pos) {
  if (pos <= 4)  return "top";
  if (pos <= 10) return "mid";
  if (pos <= 16) return "low";
  return "rel";
}

function formatDayLabel(dayStr) {
  if (dayStr === "?") return "Data desconhecida";
  try {
    const [y, m, d] = dayStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const months   = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${weekdays[dt.getDay()]}, ${pad(d)} ${months[m - 1]}`;
  } catch {
    return dayStr;
  }
}

// ============================================================
//  TABELAS
// ============================================================

async function loadTabela(slug) {
  document.getElementById("tabelasContent").style.display = "none";
  document.getElementById("tabelasErro").style.display    = "none";
  document.getElementById("tabelasLoading").style.display = "flex";

  try {
    const resp = await fetch(`/api/apostas/espn/standings/${encodeURIComponent(slug)}`);
    const json = await resp.json();
    document.getElementById("tabelasLoading").style.display = "none";

    if (!resp.ok) { showTabelasErro(json.error); return; }
    if (!json.groups || json.groups.length === 0) {
      showTabelasErro("Tabela não disponível para este campeonato no momento.");
      return;
    }
    renderStandings(json);
  } catch {
    document.getElementById("tabelasLoading").style.display = "none";
    showTabelasErro("Erro de conexão.");
  }
}

function showTabelasErro(msg) {
  document.getElementById("tabelasErroMsg").textContent = msg || "Erro ao carregar tabela.";
  document.getElementById("tabelasErro").style.display = "flex";
}

function renderStandings(data) {
  const content = document.getElementById("tabelasContent");
  const isMulti = data.groups.length > 1;

  let html = `<div class="tabelas-season">${escHtml(data.season)}</div>`;

  data.groups.forEach(group => {
    if (isMulti && group.name) {
      html += `<div class="tabelas-group-name">${escHtml(group.name)}</div>`;
    }
    html += `
      <div class="tabelas-table-wrap">
        <table class="tabelas-table">
          <thead>
            <tr>
              <th class="tabelas-th tabelas-th--pos">#</th>
              <th class="tabelas-th tabelas-th--team">Time</th>
              <th class="tabelas-th tabelas-th--num" title="Jogos">J</th>
              <th class="tabelas-th tabelas-th--num" title="Vitórias">V</th>
              <th class="tabelas-th tabelas-th--num" title="Empates">E</th>
              <th class="tabelas-th tabelas-th--num" title="Derrotas">D</th>
              <th class="tabelas-th tabelas-th--num" title="Gols">Gols</th>
              <th class="tabelas-th tabelas-th--num" title="Saldo">SG</th>
              <th class="tabelas-th tabelas-th--pts">Pts</th>
            </tr>
          </thead>
          <tbody>
            ${group.rows.map(r => buildStandingsRow(r, group.rows.length)).join("")}
          </tbody>
        </table>
      </div>
    `;
  });

  content.innerHTML = html;
  content.style.display = "block";
}

function buildStandingsRow(r, total) {
  const posCls = posRowClass(r.position, total);
  const sgSign = r.goal_diff > 0 ? "+" : "";
  return `
    <tr class="tabelas-row ${posCls}">
      <td class="tabelas-td tabelas-td--pos"><span class="tabelas-pos">${r.position}</span></td>
      <td class="tabelas-td tabelas-td--team"><span class="tabelas-team-name">${escHtml(r.team_name)}</span></td>
      <td class="tabelas-td tabelas-td--num">${r.matches}</td>
      <td class="tabelas-td tabelas-td--num">${r.wins}</td>
      <td class="tabelas-td tabelas-td--num">${r.draws}</td>
      <td class="tabelas-td tabelas-td--num">${r.losses}</td>
      <td class="tabelas-td tabelas-td--num">${r.goals_for}:${r.goals_against}</td>
      <td class="tabelas-td tabelas-td--num">${sgSign}${r.goal_diff}</td>
      <td class="tabelas-td tabelas-td--pts"><strong>${r.points}</strong></td>
    </tr>
  `;
}

function posRowClass(pos, total) {
  if (pos <= 4)           return "tabelas-row--champions";
  if (pos <= 6)           return "tabelas-row--europa";
  if (pos > total - 4)    return "tabelas-row--relegation";
  return "";
}

// ============================================================
//  TIPS — load & render
// ============================================================

async function loadTips() {
  showTipsState("loading");
  try {
    const resp = await fetch("/api/apostas/tips");
    const json = await resp.json();
    if (!resp.ok) { showTipsState("erro", json.error); return; }
    renderTipsStats(json.stats);
    if (!json.tips || json.tips.length === 0) { showTipsState("vazio"); return; }
    renderTipsList(json.tips);
    showTipsState("list");
  } catch {
    showTipsState("erro", "Não foi possível conectar ao servidor.");
  }
}

function showTipsState(state, msg) {
  document.getElementById("tipsLoading").style.display  = state === "loading" ? "flex" : "none";
  document.getElementById("tipsList").style.display     = state === "list"    ? "block" : "none";
  document.getElementById("tipsVazio").style.display    = state === "vazio"   ? "flex"  : "none";
  document.getElementById("tipsErro").style.display     = state === "erro"    ? "flex"  : "none";
  if (state === "erro" && msg) document.getElementById("tipsErroMsg").textContent = msg;
}

function renderTipsStats(stats) {
  const taxa = stats.total > 0 ? `${stats.taxa_acerto}%` : "—";
  document.getElementById("statGreen").textContent   = stats.green;
  document.getElementById("statRed").textContent     = stats.red;
  document.getElementById("statTaxa").textContent    = taxa;
  document.getElementById("statPending").textContent = stats.pendente;
}

function renderTipsList(tips) {
  const isAdmin = window.APOSTAS_IS_ADMIN === true;
  document.getElementById("tipsList").innerHTML = tips.map(t => buildTipCard(t, isAdmin)).join("");
}

function buildTipCard(tip, isAdmin) {
  const statusBadge  = buildStatusBadge(tip.status);
  const adminActions = isAdmin ? buildTipAdminActions(tip) : "";
  const hasMultipla  = Array.isArray(tip.jogos) && tip.jogos.length > 0;

  const body = hasMultipla ? buildMultiplaBody(tip) : buildLegacyMeta(tip);
  const link = tip.link_aposta
    ? `<a href="${escHtml(tip.link_aposta)}" target="_blank" rel="noopener" class="tips-link-btn"><i class="bi bi-link-45deg"></i> Ver aposta</a>`
    : "";

  return `
    <div class="tips-card" id="tip-${tip.id}" data-status="${escHtml(tip.status)}">
      <div class="tips-card-header">
        ${statusBadge}
        <span class="tips-card-title">${escHtml(tip.titulo)}</span>
      </div>
      ${body}
      ${link}
      ${adminActions}
    </div>
  `;
}

function buildMultiplaBody(tip) {
  const jogosHtml = tip.jogos.map(j => {
    const data = j.data_partida ? `<span class="tips-jogo-data">${formatDate(j.data_partida)}</span>` : "";
    const camp = j.campeonato ? `<span class="tips-jogo-camp">${escHtml(j.campeonato)}</span>` : "";
    return `
      <div class="tips-multipla-jogo">
        <div class="tips-jogo-partida">${escHtml(j.partida)} ${camp} ${data}</div>
        <div class="tips-jogo-mercado">
          <i class="bi bi-tag-fill"></i>
          ${escHtml(j.mercado)}
          <span class="tips-jogo-odd">@ ${j.odd.toFixed(2)}</span>
        </div>
      </div>
    `;
  }).join("");

  const footer = [];
  if (tip.odd != null) footer.push(`<span><i class="bi bi-calculator"></i>Odd total: <strong>${tip.odd.toFixed(2)}</strong></span>`);
  if (tip.stake)       footer.push(`<span><i class="bi bi-coin"></i>${escHtml(tip.stake)}</span>`);

  return `
    <div class="tips-multipla-jogos">${jogosHtml}</div>
    ${footer.length ? `<div class="tips-card-meta tips-card-footer">${footer.join("")}</div>` : ""}
  `;
}

function buildLegacyMeta(tip) {
  const parts = [];
  if (tip.partida)      parts.push(`<span><i class="bi bi-shield-fill"></i>${escHtml(tip.partida)}</span>`);
  if (tip.campeonato)   parts.push(`<span><i class="bi bi-trophy-fill"></i>${escHtml(tip.campeonato)}</span>`);
  if (tip.odd != null)  parts.push(`<span><i class="bi bi-tag-fill"></i>Odd ${tip.odd.toFixed(2)}</span>`);
  if (tip.stake)        parts.push(`<span><i class="bi bi-coin"></i>${escHtml(tip.stake)}</span>`);
  if (tip.data_partida) parts.push(`<span><i class="bi bi-calendar3"></i>${formatDate(tip.data_partida)}</span>`);
  return parts.length ? `<div class="tips-card-meta">${parts.join("")}</div>` : "";
}

function buildStatusBadge(status) {
  const map = {
    green:    { cls: "tips-badge--green",   icon: "bi-check-circle-fill", label: "Green" },
    red:      { cls: "tips-badge--red",     icon: "bi-x-circle-fill",     label: "Red" },
    pendente: { cls: "tips-badge--pending", icon: "bi-clock-fill",        label: "Pendente" },
    void:     { cls: "tips-badge--void",    icon: "bi-dash-circle",       label: "Void" },
  };
  const s = map[status] || map.pendente;
  return `<span class="tips-badge ${s.cls}"><i class="bi ${s.icon}"></i>${s.label}</span>`;
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function buildTipAdminActions(tip) {
  const id = tip.id;
  return `
    <div class="tips-admin-actions">
      ${tip.status !== "green"    ? `<button class="tips-action-btn tips-action-btn--green"   onclick="setTipStatus(${id},'green')"    title="Green"><i class="bi bi-check-lg"></i></button>` : ""}
      ${tip.status !== "red"      ? `<button class="tips-action-btn tips-action-btn--red"     onclick="setTipStatus(${id},'red')"      title="Red"><i class="bi bi-x-lg"></i></button>` : ""}
      ${tip.status !== "pendente" ? `<button class="tips-action-btn tips-action-btn--pending" onclick="setTipStatus(${id},'pendente')" title="Pendente"><i class="bi bi-clock"></i></button>` : ""}
      ${tip.status !== "void"     ? `<button class="tips-action-btn tips-action-btn--void"    onclick="setTipStatus(${id},'void')"     title="Anular"><i class="bi bi-dash-lg"></i></button>` : ""}
      <button class="tips-action-btn tips-action-btn--delete" onclick="deleteTip(${id})" title="Excluir"><i class="bi bi-trash3"></i></button>
    </div>
  `;
}

// ============================================================
//  TIPS — admin actions
// ============================================================

async function setTipStatus(tipId, status) {
  try {
    const resp = await fetch(`/api/apostas/tips/${tipId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await resp.json();
    if (!resp.ok) { alert(json.error || "Erro ao atualizar status"); return; }
    await loadTips();
  } catch { alert("Erro de conexão"); }
}

async function deleteTip(tipId) {
  if (!confirm("Excluir esta recomendação?")) return;
  try {
    const resp = await fetch(`/api/apostas/tips/${tipId}`, { method: "DELETE" });
    const json = await resp.json();
    if (!resp.ok) { alert(json.error || "Erro ao excluir"); return; }
    await loadTips();
  } catch { alert("Erro de conexão"); }
}

// ============================================================
//  TIPS — modal (múltipla)
// ============================================================

const _MERCADOS = [
  { group: "Resultado Final",   options: ["Vitória Casa (1)", "Empate (X)", "Vitória Visitante (2)"] },
  { group: "Dupla Hipótese",    options: ["1X", "X2", "12"] },
  { group: "Total de Gols",     options: ["Over 0.5", "Over 1.5", "Over 2.5", "Over 3.5", "Over 4.5", "Under 0.5", "Under 1.5", "Under 2.5", "Under 3.5"] },
  { group: "Ambos Marcam",      options: ["Ambos Marcam - Sim", "Ambos Marcam - Não"] },
  { group: "Escanteios",        options: ["Escanteios Over 8.5", "Escanteios Over 9.5", "Escanteios Over 10.5", "Escanteios Under 8.5", "Escanteios Under 9.5"] },
  { group: "Cartões",           options: ["Cartões Over 3.5", "Cartões Over 4.5", "Cartões Over 5.5"] },
  { group: "1º Tempo",          options: ["Vitória Casa 1º Tempo", "Empate 1º Tempo", "Vitória Visitante 1º Tempo", "Over 0.5 no 1º Tempo", "Over 1.5 no 1º Tempo"] },
  { group: "Outro",             options: ["Outro (especificar)"] },
];

let _jogoCounter = 0;

function buildMercadoOptions() {
  return _MERCADOS.map(g => {
    const opts = g.options.map(o => `<option value="${escHtml(o)}">${escHtml(o)}</option>`).join("");
    return `<optgroup label="${escHtml(g.group)}">${opts}</optgroup>`;
  }).join("");
}

function addJogoRow() {
  const idx = _jogoCounter++;
  const mercadoOpts = buildMercadoOptions();
  const container = document.getElementById("tipJogosContainer");

  const row = document.createElement("div");
  row.className = "tips-jogo-row";
  row.id = `jogo-row-${idx}`;
  row.innerHTML = `
    <div class="tips-jogo-row-top">
      <span class="tips-jogo-num">Jogo ${container.children.length + 1}</span>
      <button type="button" class="tips-jogo-remove" onclick="removeJogoRow(${idx})" title="Remover jogo">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="tips-form-group">
      <label class="tips-form-label">Partida <span class="tips-required">*</span></label>
      <div class="jogo-partida-wrap">
        <input type="text" id="jogo-partida-${idx}" class="tips-form-input" placeholder="Ex: Flamengo x Palmeiras" maxlength="200">
        <button type="button" class="jogo-pick-btn" onclick="openMatchPicker(${idx})" title="Buscar nos próximos jogos">
          <i class="bi bi-calendar3"></i>
        </button>
      </div>
    </div>
    <div class="tips-form-row">
      <div class="tips-form-group">
        <label class="tips-form-label">Campeonato</label>
        <input type="text" id="jogo-campeonato-${idx}" class="tips-form-input" placeholder="Ex: Brasileirão" maxlength="100">
      </div>
      <div class="tips-form-group">
        <label class="tips-form-label">Data</label>
        <input type="date" id="jogo-data-${idx}" class="tips-form-input">
      </div>
    </div>
    <div class="tips-form-row">
      <div class="tips-form-group tips-form-group--flex2">
        <label class="tips-form-label">Mercado <span class="tips-required">*</span></label>
        <select id="jogo-mercado-${idx}" class="tips-form-input" onchange="onMercadoChange(${idx})">
          <option value="" disabled selected>Selecione...</option>
          ${mercadoOpts}
        </select>
      </div>
      <div class="tips-form-group tips-form-group--flex1">
        <label class="tips-form-label">Odd <span class="tips-required">*</span></label>
        <input type="number" id="jogo-odd-${idx}" class="tips-form-input" step="0.01" min="1.01" placeholder="1.85" oninput="calcOddTotal()">
      </div>
    </div>
    <div class="tips-form-group" id="jogo-outro-group-${idx}" style="display:none">
      <label class="tips-form-label">Especificar mercado <span class="tips-required">*</span></label>
      <input type="text" id="jogo-mercado-outro-${idx}" class="tips-form-input" placeholder="Ex: Handicap Asiático -0.5" maxlength="100">
    </div>
  `;

  container.appendChild(row);
  renumberJogos();
  calcOddTotal();
}

function removeJogoRow(idx) {
  const row = document.getElementById(`jogo-row-${idx}`);
  if (row) row.remove();
  renumberJogos();
  calcOddTotal();
}

function renumberJogos() {
  const rows = document.querySelectorAll("#tipJogosContainer .tips-jogo-row");
  rows.forEach((row, i) => {
    const num = row.querySelector(".tips-jogo-num");
    if (num) num.textContent = `Jogo ${i + 1}`;
  });
}

function onMercadoChange(idx) {
  const sel = document.getElementById(`jogo-mercado-${idx}`);
  const grp = document.getElementById(`jogo-outro-group-${idx}`);
  if (sel && grp) grp.style.display = sel.value === "Outro (especificar)" ? "block" : "none";
}

function calcOddTotal() {
  const rows = document.querySelectorAll("#tipJogosContainer .tips-jogo-row");
  let total = 1;
  let valid = rows.length > 0;

  rows.forEach(row => {
    const id = row.id.replace("jogo-row-", "");
    const val = parseFloat(document.getElementById(`jogo-odd-${id}`)?.value);
    if (!val || val <= 1) { valid = false; }
    else total *= val;
  });

  const el = document.getElementById("tipOddTotal");
  if (el) el.textContent = (valid && rows.length > 0) ? total.toFixed(2) : "—";
}

async function pasteLink() {
  const input = document.getElementById("tipLinkAposta");
  try {
    const text = await navigator.clipboard.readText();
    input.value = text.trim();
    input.focus();
  } catch {
    input.focus();
    document.execCommand("paste");
  }
}

function openTipModal() {
  document.getElementById("tipTitulo").value    = "";
  document.getElementById("tipStake").value     = "";
  document.getElementById("tipLinkAposta").value = "";
  document.getElementById("tipJogosContainer").innerHTML = "";
  document.getElementById("tipOddTotal").textContent = "—";
  _jogoCounter = 0;
  hideTipFormError();
  document.getElementById("tipModalOverlay").style.display = "flex";
  addJogoRow();
}

function closeTipModal() {
  document.getElementById("tipModalOverlay").style.display = "none";
}

function closeTipModalOverlay(e) {
  if (e.target === document.getElementById("tipModalOverlay")) closeTipModal();
}

function showTipFormError(msg) {
  const el = document.getElementById("tipFormError");
  el.textContent = msg;
  el.style.display = "block";
}

function hideTipFormError() {
  document.getElementById("tipFormError").style.display = "none";
}

async function submitTipForm() {
  hideTipFormError();

  const titulo     = document.getElementById("tipTitulo").value.trim();
  const stake      = document.getElementById("tipStake").value.trim();
  const linkAposta = document.getElementById("tipLinkAposta").value.trim();

  if (!titulo) { showTipFormError("Título é obrigatório"); return; }

  const rows = document.querySelectorAll("#tipJogosContainer .tips-jogo-row");
  if (rows.length === 0) { showTipFormError("Adicione pelo menos um jogo"); return; }

  const jogos = [];
  for (const row of rows) {
    const idx       = row.id.replace("jogo-row-", "");
    const partida   = (document.getElementById(`jogo-partida-${idx}`)?.value || "").trim();
    const campeonato = (document.getElementById(`jogo-campeonato-${idx}`)?.value || "").trim();
    const data      = document.getElementById(`jogo-data-${idx}`)?.value || "";
    const selVal    = document.getElementById(`jogo-mercado-${idx}`)?.value || "";
    const mercado   = selVal === "Outro (especificar)"
      ? (document.getElementById(`jogo-mercado-outro-${idx}`)?.value || "").trim()
      : selVal;
    const oddVal    = parseFloat(document.getElementById(`jogo-odd-${idx}`)?.value);

    if (!partida)        { showTipFormError(`Partida obrigatória`); return; }
    if (!mercado)        { showTipFormError(`Mercado obrigatório`); return; }
    if (!oddVal || oddVal <= 1) { showTipFormError(`Odd inválida (deve ser > 1.00)`); return; }

    jogos.push({ partida, campeonato, mercado, odd: oddVal, data_partida: data || null });
  }

  const btn = document.getElementById("tipSubmitBtn");
  btn.disabled = true;

  try {
    const resp = await fetch("/api/apostas/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, stake, link_aposta: linkAposta, jogos }),
    });
    const json = await resp.json();
    if (!resp.ok) { showTipFormError(json.error || "Erro ao criar recomendação"); return; }
    closeTipModal();
    await loadTips();
  } catch {
    showTipFormError("Erro de conexão");
  } finally {
    btn.disabled = false;
  }
}

// ============================================================
//  MATCH PICKER
// ============================================================

let _pickerJogoIdx      = null;
let _pickerLeaguesReady = false;

function openMatchPicker(jogoIdx) {
  _pickerJogoIdx = jogoIdx;
  document.getElementById("matchPickerOverlay").style.display = "flex";
  if (!_pickerLeaguesReady) {
    _loadPickerLeagues();
  } else {
    const sel = document.getElementById("pickerLeagueSelect");
    if (sel.value) _loadPickerMatches(sel.value);
  }
}

function closeMatchPicker() {
  document.getElementById("matchPickerOverlay").style.display = "none";
  _pickerJogoIdx = null;
}

function closeMatchPickerOverlay(e) {
  if (e.target === document.getElementById("matchPickerOverlay")) closeMatchPicker();
}

async function _loadPickerLeagues() {
  const sel = document.getElementById("pickerLeagueSelect");
  try {
    const resp = await fetch("/api/apostas/espn/leagues");
    const list = await resp.json();

    const byCategory = {};
    list.forEach(lg => {
      if (!byCategory[lg.category]) byCategory[lg.category] = [];
      byCategory[lg.category].push(lg);
    });

    sel.innerHTML = "";
    Object.entries(byCategory).forEach(([cat, items]) => {
      const grp = document.createElement("optgroup");
      grp.label = cat;
      items.forEach(lg => {
        const opt = document.createElement("option");
        opt.value = lg.slug;
        opt.textContent = lg.name;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });

    _pickerLeaguesReady = true;

    const defaultSlug = window._activeLeague || list[0]?.slug;
    if (defaultSlug) {
      sel.value = defaultSlug;
      _loadPickerMatches(defaultSlug);
    }
  } catch {
    sel.innerHTML = '<option disabled>Erro ao carregar campeonatos</option>';
  }
}

function onPickerLeagueChange() {
  const sel = document.getElementById("pickerLeagueSelect");
  if (sel.value) _loadPickerMatches(sel.value);
}

async function _loadPickerMatches(slug) {
  const listEl    = document.getElementById("pickerMatchList");
  const loadingEl = document.getElementById("pickerLoading");
  const emptyEl   = document.getElementById("pickerEmpty");

  listEl.innerHTML = "";
  emptyEl.style.display = "none";
  loadingEl.style.display = "flex";

  try {
    const resp = await fetch(`/api/apostas/espn/fixtures/${encodeURIComponent(slug)}?days=30`);
    const json = await resp.json();
    loadingEl.style.display = "none";

    const upcoming = (json.matches || []).filter(m => m.state === "pre" || m.state === "in");
    if (!resp.ok || upcoming.length === 0) {
      emptyEl.style.display = "flex";
      return;
    }

    const sel    = document.getElementById("pickerLeagueSelect");
    const season = json.season || sel.options[sel.selectedIndex]?.text || "";
    _renderPickerMatches(upcoming, season);
  } catch {
    loadingEl.style.display = "none";
    emptyEl.style.display = "flex";
  }
}

function _renderPickerMatches(matches, season) {
  const listEl = document.getElementById("pickerMatchList");

  const byDate = {};
  matches.forEach(m => {
    const dayKey = m.date_brt ? m.date_brt.slice(0, 10) : "?";
    if (!byDate[dayKey]) byDate[dayKey] = [];
    byDate[dayKey].push(m);
  });

  let html = "";
  Object.entries(byDate).forEach(([day, dayMatches]) => {
    html += `<div class="picker-day-group">
      <div class="picker-day-header">${formatDayLabel(day)}</div>`;
    dayMatches.forEach(m => {
      const time   = m.date_brt ? m.date_brt.slice(11, 16) : "";
      const partida = `${m.home_name} x ${m.away_name}`;
      const date   = m.date_brt ? m.date_brt.slice(0, 10) : "";
      const diff   = m.pos_diff != null && m.pos_diff >= 2 ? buildJogosDiff(m.pos_diff) : "";
      const homePosHtml = m.home_pos ? `<span class="picker-pos picker-pos--${posTier(m.home_pos)}">#${m.home_pos}</span>` : "";
      const awayPosHtml = m.away_pos ? `<span class="picker-pos picker-pos--${posTier(m.away_pos)}">#${m.away_pos}</span>` : "";
      html += `
        <div class="picker-match-row"
             data-partida="${escHtml(partida)}"
             data-season="${escHtml(season)}"
             data-date="${escHtml(date)}"
             onclick="_selectPickerMatch(this)">
          <div class="picker-match-teams">
            ${homePosHtml}
            <span class="picker-team picker-team--home">${escHtml(m.home_name)}</span>
            <span class="picker-vs">×</span>
            <span class="picker-team picker-team--away">${escHtml(m.away_name)}</span>
            ${awayPosHtml}
          </div>
          <div class="picker-match-meta">
            ${time ? `<span class="picker-time"><i class="bi bi-clock"></i>${time}</span>` : ""}
            ${diff}
          </div>
        </div>`;
    });
    html += `</div>`;
  });

  listEl.innerHTML = html;
}

function _selectPickerMatch(el) {
  if (_pickerJogoIdx === null) return;
  const idx     = _pickerJogoIdx;
  const partida = el.dataset.partida;
  const season  = el.dataset.season;
  const date    = el.dataset.date;

  const partidaEl = document.getElementById(`jogo-partida-${idx}`);
  const campEl    = document.getElementById(`jogo-campeonato-${idx}`);
  const dataEl    = document.getElementById(`jogo-data-${idx}`);

  if (partidaEl) partidaEl.value = partida;
  if (campEl)    campEl.value    = season;
  if (dataEl && date) dataEl.value = date;

  closeMatchPicker();
}

// ============================================================
//  HELPERS
// ============================================================

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
