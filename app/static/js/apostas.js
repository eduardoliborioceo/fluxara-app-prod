document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("apostasDate");
  if (dateInput) {
    dateInput.value = todayISO();
  }
  apostasBuscar();
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function apostasBuscar() {
  const date = document.getElementById("apostasDate")?.value || todayISO();
  const minDiff = document.getElementById("apostasMinDiff")?.value || "5";

  setLoadingState(true);
  hideAll();
  document.getElementById("apostasLoading").style.display = "flex";

  try {
    const resp = await fetch(`/api/apostas/partidas?date=${encodeURIComponent(date)}&min_diff=${minDiff}`);
    const json = await resp.json();

    setLoadingState(false);
    document.getElementById("apostasLoading").style.display = "none";

    if (!resp.ok) {
      showError(json.error || "Erro ao buscar partidas.");
      return;
    }

    if (!json.matches || json.matches.length === 0) {
      showVazio(minDiff);
      return;
    }

    renderMatches(json.matches, json.total);
  } catch {
    setLoadingState(false);
    document.getElementById("apostasLoading").style.display = "none";
    showError("Não foi possível conectar ao servidor.");
  }
}

function setLoadingState(loading) {
  const btn = document.getElementById("apostasBtnBuscar");
  const icon = document.getElementById("apostasBuscarIcon");
  const label = document.getElementById("apostasBuscarLabel");
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    icon.className = "bi bi-hourglass-split";
    label.textContent = "Buscando...";
  } else {
    icon.className = "bi bi-search";
    label.textContent = "Buscar partidas";
  }
}

function hideAll() {
  ["apostasLoading", "apostasVazio", "apostasErro", "apostasResultado"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function showVazio(minDiff) {
  const el = document.getElementById("apostasVazio");
  const msg = document.getElementById("apostasVazioMsg");
  if (minDiff === "1") {
    msg.textContent = "Nenhuma partida com tabela de classificação disponível para este dia.";
  } else {
    msg.textContent = `Nenhuma partida com diferença de ≥ ${minDiff} posições encontrada para este dia.`;
  }
  el.style.display = "flex";
}

function showError(msg) {
  const el = document.getElementById("apostasErro");
  const msgEl = document.getElementById("apostasErroMsg");
  if (msgEl) msgEl.textContent = msg;
  if (el) el.style.display = "flex";
}

function renderMatches(matches, total) {
  const resultado = document.getElementById("apostasResultado");
  const totalEl = document.getElementById("apostasTotal");
  const lista = document.getElementById("apostasLista");

  totalEl.textContent = `${total} partida${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`;
  lista.innerHTML = matches.map(buildMatchCard).join("");
  resultado.style.display = "block";
}

function buildMatchCard(m) {
  const homePosBadge = buildPosBadge(m.home_pos);
  const awayPosBadge = buildPosBadge(m.away_pos);
  const diffBadge = buildDiffBadge(m.pos_diff);
  const footer = buildFooter(m);

  return `
    <div class="apostas-match-card">
      <div class="apostas-match-competition">
        <div class="apostas-competition-name">
          ${m.country ? `<span>${escHtml(m.country)}</span><span style="opacity:.4">·</span>` : ""}
          <span>${escHtml(m.tournament)}</span>
        </div>
        ${m.round ? `<span class="apostas-round-badge">R.${m.round}</span>` : ""}
      </div>
      <div class="apostas-match-body">
        <div class="apostas-match-row">
          <div class="apostas-team">
            ${homePosBadge}
            <span class="apostas-team-name">${escHtml(m.home_team)}</span>
          </div>
          <div class="apostas-diff-center">
            ${diffBadge}
            <span class="apostas-diff-label">posições</span>
          </div>
          <div class="apostas-team apostas-team--away">
            ${awayPosBadge}
            <span class="apostas-team-name">${escHtml(m.away_team)}</span>
          </div>
        </div>
      </div>
      ${footer}
    </div>
  `;
}

function buildPosBadge(pos) {
  const cls = posBadgeClass(pos);
  return `<span class="apostas-pos-badge ${cls}" title="Posição na tabela">#${pos}</span>`;
}

function posBadgeClass(pos) {
  if (pos === 1) return "apostas-pos-badge--1";
  if (pos <= 4) return "apostas-pos-badge--top";
  if (pos <= 8) return "apostas-pos-badge--mid";
  if (pos <= 14) return "apostas-pos-badge--low";
  return "apostas-pos-badge--rel";
}

function buildDiffBadge(diff) {
  let cls;
  if (diff >= 15) cls = "apostas-diff-badge--high";
  else if (diff >= 10) cls = "apostas-diff-badge--medium";
  else if (diff >= 5) cls = "apostas-diff-badge--low";
  else cls = "apostas-diff-badge--min";
  return `<span class="apostas-diff-badge ${cls}">Δ ${diff}</span>`;
}

function buildFooter(m) {
  const parts = [];

  if (m.start_timestamp) {
    const dt = new Date(m.start_timestamp * 1000);
    const hhmm = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    parts.push(`<span class="apostas-time">${hhmm}</span>`);
  }

  if (m.status_type === "inprogress") {
    parts.push(`<span class="apostas-status-badge apostas-status-badge--live">Ao vivo</span>`);
  } else if (m.status_type === "finished") {
    parts.push(`<span class="apostas-status-badge apostas-status-badge--ended">Encerrado</span>`);
  }

  if (parts.length === 0) return "";
  return `<div class="apostas-match-footer">${parts.join("")}</div>`;
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
