// ============================================================
//  NAVEGAÇÃO DE TABS
// ============================================================

function calcTab(tab) {
  const panels = ["rescisao", "liquido", "decimo", "ferias"];
  const btns   = { rescisao: "tabBtnRescisao", liquido: "tabBtnLiquido", decimo: "tabBtnDecimo", ferias: "tabBtnFerias" };

  panels.forEach(p => {
    const el = document.getElementById("tab" + p.charAt(0).toUpperCase() + p.slice(1));
    if (el) el.style.display = p === tab ? "" : "none";
  });

  Object.entries(btns).forEach(([key, id]) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle("calc-tab--active", key === tab);
  });
}

// ============================================================
//  PRÉ-PREENCHIMENTO COM DADOS PESSOAIS
//  Salário base FGTS (excluindo provisão do empréstimo)
//  FGTS total = disponível (2.987,88) + bloqueado (2.261,15)
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  var rescSal  = document.getElementById("rescSalario");
  var rescFgts = document.getElementById("rescFgts");
  var rescBlq  = document.getElementById("rescFgtsBloqueado");
  if (rescSal && !rescSal.value) {
    rescSal.value  = "2157.98";
    if (rescFgts) rescFgts.value = "5249.03";
    if (rescBlq)  rescBlq.value  = "2261.15";
  }
});

// ============================================================
//  HELPERS
// ============================================================

function _fmt(val) {
  return "R$ " + Math.max(0, val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _row(label, val, modifier) {
  return `<div class="calc-result-row${modifier ? " calc-result-row--" + modifier : ""}">
    <span class="calc-result-row-label">${label}</span>
    <span class="calc-result-row-val">${_fmt(val)}</span>
  </div>`;
}

function _rowText(label, text, modifier) {
  return `<div class="calc-result-row${modifier ? " calc-result-row--" + modifier : ""}">
    <span class="calc-result-row-label">${label}</span>
    <span class="calc-result-row-val">${text}</span>
  </div>`;
}

// ── INSS 2024 (tabela progressiva) ──────────────────────────
function calcINSS(salarioBruto) {
  const faixas = [
    { ate: 1412.00, aliq: 0.075 },
    { ate: 2666.68, aliq: 0.09  },
    { ate: 4000.03, aliq: 0.12  },
    { ate: 7786.02, aliq: 0.14  },
  ];
  let inss = 0;
  let anterior = 0;
  for (const f of faixas) {
    if (salarioBruto <= anterior) break;
    const base = Math.min(salarioBruto, f.ate) - anterior;
    inss += base * f.aliq;
    anterior = f.ate;
    if (salarioBruto <= f.ate) break;
  }
  return Math.round(inss * 100) / 100;
}

// ── IRRF 2024 (sobre base = bruto - inss - deducao dependentes) ──
const DEDUCAO_DEPENDENTE = 189.59;

function calcIRRF(baseCalculo) {
  const faixas = [
    { ate: 2259.20, aliq: 0,     deducao: 0        },
    { ate: 2826.65, aliq: 0.075, deducao: 169.44   },
    { ate: 3751.05, aliq: 0.15,  deducao: 381.44   },
    { ate: 4664.68, aliq: 0.225, deducao: 662.77   },
    { ate: Infinity, aliq: 0.275, deducao: 896.00  },
  ];
  if (baseCalculo <= 0) return 0;
  for (const f of faixas) {
    if (baseCalculo <= f.ate) {
      const irrf = baseCalculo * f.aliq - f.deducao;
      return Math.max(0, Math.round(irrf * 100) / 100);
    }
  }
  return 0;
}

// ── Meses completos entre duas datas (com fração ≥ 15 dias conta) ──
function _mesesProporcionais(admissao, demissao) {
  let meses = 0;
  const d1 = new Date(admissao);
  const d2 = new Date(demissao);
  let cur = new Date(d1);
  cur.setDate(1);
  while (cur <= d2) {
    const fim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const inicio = cur <= d1 ? d1 : cur;
    const dias = Math.floor((Math.min(fim, d2) - inicio) / 86400000) + 1;
    if (dias >= 15) meses++;
    cur.setMonth(cur.getMonth() + 1);
  }
  return meses;
}

// ── Seguro-Desemprego (Lei 7.998/90 · Tabela 2024) ─────────
function _calcSeguro(salarioMedio, mesesTotal, requerimento) {
  const req = parseInt(requerimento) || 1;

  // Elegibilidade mínima por número de requerimento
  const minMeses = req === 1 ? 12 : req === 2 ? 9 : 6;
  if (mesesTotal < minMeses) {
    return { elegivel: false, minMeses: minMeses };
  }

  // Número de parcelas
  let parcelas;
  if (req === 1) {
    parcelas = mesesTotal < 24 ? 3 : mesesTotal < 36 ? 4 : 5;
  } else {
    parcelas = mesesTotal < 12 ? 3 : mesesTotal < 24 ? 4 : 5;
  }

  // Valor da parcela – faixas 2024 (MTE)
  const F1 = 2041.19;
  const F2 = 3401.97;
  let valorParcela;
  if (salarioMedio <= F1) {
    valorParcela = salarioMedio;
  } else if (salarioMedio <= F2) {
    valorParcela = F1 + 0.80 * (salarioMedio - F1);
  } else {
    valorParcela = F1 + 0.80 * (F2 - F1);
  }
  valorParcela = Math.round(valorParcela * 100) / 100;

  return {
    elegivel: true,
    parcelas: parcelas,
    valorParcela: valorParcela,
    total: Math.round(valorParcela * parcelas * 100) / 100,
  };
}

// ============================================================
//  CALCULADORA 1 — RESCISÃO
// ============================================================

function calcRescisao() {
  const salario    = parseFloat(document.getElementById("rescSalario").value)         || 0;
  const admStr     = document.getElementById("rescAdmissao").value;
  const demStr     = document.getElementById("rescDemissao").value;
  const aviso      = document.getElementById("rescAviso").value;
  const fgts       = parseFloat(document.getElementById("rescFgts").value)            || 0;
  const fgtsBloq   = parseFloat(document.getElementById("rescFgtsBloqueado").value)   || 0;
  const dias       = parseInt(document.getElementById("rescDias").value)              || 0;
  const req        = document.getElementById("rescRequerimento").value                || "1";

  const resultDiv  = document.getElementById("rescResultado");
  const itensDiv   = document.getElementById("rescItens");
  const totalEl    = document.getElementById("rescTotal");
  const seguroDiv  = document.getElementById("seguroResultado");

  if (salario <= 0 || !admStr || !demStr) {
    resultDiv.style.display = "none";
    if (seguroDiv) seguroDiv.style.display = "none";
    return;
  }

  const admissao = new Date(admStr + "T00:00:00");
  const demissao = new Date(demStr + "T00:00:00");
  if (demissao <= admissao) {
    resultDiv.style.display = "none";
    if (seguroDiv) seguroDiv.style.display = "none";
    return;
  }

  const mesesTotal  = _mesesProporcionais(admissao, demissao);
  const mesesFerias = _mesesProporcionais(
    new Date(admissao.getFullYear(), admissao.getMonth() + Math.floor(mesesTotal / 12) * 12, admissao.getDate()),
    demissao
  );
  const mesesDecimo = _mesesProporcionais(new Date(demissao.getFullYear(), 0, 1), demissao);

  const saldoSalario        = dias > 0 ? (salario / 30) * dias : 0;
  const aviso30             = salario;
  const feriasProporcionais = (salario / 12) * (mesesFerias || mesesTotal % 12 || mesesTotal);
  const tercoFerias         = feriasProporcionais / 3;
  const decimoProporcionais = (salario / 12) * (mesesDecimo || mesesTotal % 12 || Math.min(mesesTotal, 12));

  const fgtsDisponivel = Math.max(0, fgts - fgtsBloq);
  const multaFgts      = Math.round(fgts * 0.40 * 100) / 100;

  let total = saldoSalario + feriasProporcionais + tercoFerias + decimoProporcionais + multaFgts;
  if (fgts > 0) total += fgtsDisponivel;

  let html = _row("Saldo de salário (" + dias + " dias)", saldoSalario, "pos");
  html += _row("Férias proporcionais (" + Math.min(mesesFerias || mesesTotal, 12) + " meses)", feriasProporcionais, "pos");
  html += _row("1/3 sobre férias proporcionais", tercoFerias, "pos");
  html += _row("13º proporcional (" + Math.min(mesesDecimo || mesesTotal, 12) + " meses)", decimoProporcionais, "pos");

  if (aviso === "indenizado") {
    html += _row("Aviso prévio indenizado (30 dias)", aviso30, "pos");
    total += aviso30;
  } else if (aviso === "nao_cumprido") {
    html += _row("Desconto aviso prévio não cumprido", aviso30, "deduct");
    total -= aviso30;
  }

  if (fgts > 0) {
    if (fgtsBloq > 0) {
      html += _row("Saldo FGTS total na conta", fgts);
      html += _row("FGTS bloqueado (antecipações)", fgtsBloq, "deduct");
      html += _row("FGTS disponível para saque", fgtsDisponivel, "pos");
    } else {
      html += _row("Saldo do FGTS", fgts, "pos");
    }
    html += _row("Multa FGTS 40% (sobre saldo total)", multaFgts, "pos");
  }

  itensDiv.innerHTML = html;
  totalEl.textContent = _fmt(Math.max(0, total));
  resultDiv.style.display = "";

  // ── Seguro-Desemprego ────────────────────────────────────
  if (!seguroDiv) return;

  const seguro = _calcSeguro(salario, mesesTotal, req);

  if (seguro.elegivel) {
    seguroDiv.innerHTML =
      '<div class="calc-seguro-header"><i class="bi bi-shield-check"></i> Seguro-Desemprego</div>' +
      '<div class="calc-result-grid">' +
        _rowText("Número de parcelas", seguro.parcelas + "×") +
        _row("Valor por parcela (estimado)", seguro.valorParcela, "pos") +
      '</div>' +
      '<div class="calc-result-total">' +
        '<span>Total seguro-desemprego</span>' +
        '<span class="calc-result-total-val">' + _fmt(seguro.total) + '</span>' +
      '</div>' +
      '<p class="calc-disclaimer">Tabela 2024 (MTE). Calculado sobre o salário bruto informado como média dos últimos 3 meses. Solicite nas agências do SINE ou pelo portal gov.br.</p>';
  } else {
    seguroDiv.innerHTML =
      '<div class="calc-seguro-header"><i class="bi bi-shield-x"></i> Seguro-Desemprego</div>' +
      '<div class="calc-seguro-inelegivel">Tempo insuficiente: necessário mínimo de ' + seguro.minMeses + ' meses trabalhados para o ' + req + 'º requerimento.</div>' +
      '<p class="calc-disclaimer">Prazos conforme Lei 7.998/90: 1º pedido ≥ 12 meses · 2º pedido ≥ 9 meses · 3º pedido ou mais ≥ 6 meses.</p>';
  }

  seguroDiv.style.display = "";
}

// ============================================================
//  CALCULADORA 2 — SALÁRIO LÍQUIDO
// ============================================================

function calcLiquido() {
  const salario     = parseFloat(document.getElementById("liqSalario").value)     || 0;
  const dependentes = parseInt(document.getElementById("liqDependentes").value)   || 0;
  const outros      = parseFloat(document.getElementById("liqOutros").value)      || 0;

  const resultDiv = document.getElementById("liqResultado");
  const itensDiv  = document.getElementById("liqItens");
  const totalEl   = document.getElementById("liqTotal");

  if (salario <= 0) { resultDiv.style.display = "none"; return; }

  const inss        = calcINSS(salario);
  const deducaoDep  = dependentes * DEDUCAO_DEPENDENTE;
  const baseIRRF    = Math.max(0, salario - inss - deducaoDep);
  const irrf        = calcIRRF(baseIRRF);
  const liquido     = salario - inss - irrf - outros;

  let html = _row("Salário Bruto", salario);
  html += _row("INSS (" + ((inss / salario) * 100).toFixed(1) + "%)", inss, "deduct");
  if (dependentes > 0) html += _row("Dedução dependentes (" + dependentes + "× R$ 189,59)", deducaoDep);
  html += _row("IRRF", irrf, irrf > 0 ? "deduct" : "");
  if (outros > 0) html += _row("Outros descontos", outros, "deduct");

  itensDiv.innerHTML = html;
  totalEl.textContent = _fmt(liquido);
  resultDiv.style.display = "";
}

// ============================================================
//  CALCULADORA 3 — 13º SALÁRIO
// ============================================================

function calcDecimo() {
  const salario      = parseFloat(document.getElementById("decSalario").value)      || 0;
  const meses        = Math.min(12, Math.max(1, parseInt(document.getElementById("decMeses").value) || 12));
  const adiantamento = parseFloat(document.getElementById("decAdiantamento").value) || 0;
  const dependentes  = parseInt(document.getElementById("decDependentes").value)    || 0;

  const resultDiv = document.getElementById("decResultado");
  const itensDiv  = document.getElementById("decItens");
  const totalEl   = document.getElementById("decTotal");

  if (salario <= 0) { resultDiv.style.display = "none"; return; }

  const decBruto    = (salario / 12) * meses;
  const primeira    = decBruto / 2;
  const segunda     = decBruto / 2;

  const inss        = calcINSS(decBruto);
  const deducaoDep  = dependentes * DEDUCAO_DEPENDENTE;
  const baseIRRF    = Math.max(0, decBruto - inss - deducaoDep);
  const irrf        = calcIRRF(baseIRRF);

  const segundaLiquida = segunda - inss - irrf;
  const totalLiquido   = primeira + segundaLiquida - adiantamento;

  let html = _row("13º bruto total (" + meses + " meses)", decBruto);
  html += _row("1ª parcela (bruta, sem IRRF)", primeira, "pos");
  html += _row("INSS sobre 13º bruto", inss, "deduct");
  html += _row("IRRF sobre 2ª parcela", irrf, irrf > 0 ? "deduct" : "");
  html += _row("2ª parcela líquida", segundaLiquida, "pos");
  if (adiantamento > 0) html += _row("Adiantamento já recebido", adiantamento, "deduct");

  itensDiv.innerHTML = html;
  totalEl.textContent = _fmt(totalLiquido);
  resultDiv.style.display = "";
}

// ============================================================
//  CALCULADORA 4 — FÉRIAS
// ============================================================

function calcFerias() {
  const salario     = parseFloat(document.getElementById("ferSalario").value)     || 0;
  const dias        = Math.min(30, Math.max(5, parseInt(document.getElementById("ferDias").value) || 30));
  const vendidos    = parseInt(document.getElementById("ferVendidos").value)       || 0;
  const dependentes = parseInt(document.getElementById("ferDependentes").value)   || 0;

  const resultDiv = document.getElementById("ferResultado");
  const itensDiv  = document.getElementById("ferItens");
  const totalEl   = document.getElementById("ferTotal");

  if (salario <= 0) { resultDiv.style.display = "none"; return; }

  const diasGozados   = dias - vendidos;
  const remFerias     = (salario / 30) * diasGozados;
  const terco         = remFerias / 3;
  const abono         = vendidos > 0 ? (salario / 30) * vendidos + (salario / 30) * vendidos / 3 : 0;

  const baseFeriasINSS = remFerias + terco;
  const inss           = calcINSS(baseFeriasINSS);
  const deducaoDep     = dependentes * DEDUCAO_DEPENDENTE;
  const baseIRRF       = Math.max(0, baseFeriasINSS - inss - deducaoDep);
  const irrf           = calcIRRF(baseIRRF);

  const totalLiquido = remFerias + terco + abono - inss - irrf;

  let html = "";
  html += _row("Remuneração de férias (" + diasGozados + " dias)", remFerias, "pos");
  html += _row("1/3 constitucional", terco, "pos");
  if (vendidos > 0) html += _row("Abono pecuniário (" + vendidos + " dias + 1/3)", abono, "pos");
  html += _row("INSS sobre férias", inss, "deduct");
  html += _row("IRRF sobre férias", irrf, irrf > 0 ? "deduct" : "");

  itensDiv.innerHTML = html;
  totalEl.textContent = _fmt(totalLiquido);
  resultDiv.style.display = "";
}
