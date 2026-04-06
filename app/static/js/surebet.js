(function () {
  var numOutcomes = 2;
  var LABELS = ['A', 'B', 'C', 'D', 'E'];

  function fmt(v) {
    return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(v) {
    return (v >= 0 ? '+' : '') + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  function buildOddsInputs() {
    var container = document.getElementById('sbOddsContainer');
    container.innerHTML = '';
    for (var i = 0; i < numOutcomes; i++) {
      var label = LABELS[i];
      var div = document.createElement('div');
      div.className = 'surebet-odd-row';
      div.innerHTML =
        '<span class="surebet-odd-label">Odd ' + label + '</span>'
        + '<div class="surebet-odd-input-wrap">'
        +   '<input type="number" class="surebet-odd-input" id="sbOdd' + i + '" '
        +          'placeholder="ex: 2.50" step="0.01" min="1.01">'
        + '</div>';
      container.appendChild(div);
    }
    container.querySelectorAll('.surebet-odd-input').forEach(function (inp) {
      inp.addEventListener('input', calculate);
    });
  }

  function calculate() {
    var total = parseFloat(document.getElementById('sbTotal').value) || 0;
    var resultCard = document.getElementById('sbResultCard');
    var resultHeader = document.getElementById('sbResultHeader');
    var resultIcon = document.getElementById('sbResultIcon');
    var resultTitle = document.getElementById('sbResultTitle');
    var resultBody = document.getElementById('sbResultBody');

    if (total <= 0) {
      resultTitle.textContent = 'Informe o total a apostar.';
      resultBody.style.display = 'none';
      resultCard.className = 'surebet-card surebet-result-card';
      return;
    }

    var odds = [];
    for (var i = 0; i < numOutcomes; i++) {
      var v = parseFloat(document.getElementById('sbOdd' + i).value);
      if (!v || v <= 1) {
        resultTitle.textContent = 'Preencha todas as odds (mínimo 1.01).';
        resultBody.style.display = 'none';
        resultCard.className = 'surebet-card surebet-result-card';
        return;
      }
      odds.push(v);
    }

    var invSum = odds.reduce(function (acc, o) { return acc + 1 / o; }, 0);
    var retorno = total / invSum;
    var lucro = retorno - total;
    var margem = (1 - invSum) * 100;
    var isSurebet = invSum < 1;

    var stakesHtml = odds.map(function (o, i) {
      var stake = total * (1 / o) / invSum;
      return '<div class="surebet-stake-row">'
        + '<span class="surebet-stake-label">Apostar em ' + LABELS[i] + ' (odd ' + o.toFixed(2) + ')</span>'
        + '<span class="surebet-stake-value">' + fmt(stake) + '</span>'
        + '</div>';
    }).join('');

    document.getElementById('sbStakes').innerHTML = stakesHtml;
    document.getElementById('sbRetorno').textContent = fmt(retorno);
    document.getElementById('sbLucro').textContent = fmt(lucro);
    document.getElementById('sbLucro').className = 'surebet-result-value ' + (lucro >= 0 ? 'surebet-lucro--pos' : 'surebet-lucro--neg');
    document.getElementById('sbMargem').textContent = fmtPct(margem);
    document.getElementById('sbMargem').style.color = isSurebet ? '#16a34a' : '#dc3545';

    if (isSurebet) {
      resultCard.className = 'surebet-card surebet-result-card surebet-result-card--ok';
      resultIcon.className = 'bi bi-check-circle-fill';
      resultTitle.textContent = 'Surebet confirmada — lucro garantido!';
    } else {
      resultCard.className = 'surebet-card surebet-result-card surebet-result-card--no';
      resultIcon.className = 'bi bi-exclamation-triangle-fill';
      resultTitle.textContent = 'Não é surebet — sem lucro garantido.';
    }

    resultBody.style.display = '';
  }

  document.getElementById('sbOutcomesToggle').addEventListener('click', function (e) {
    var btn = e.target.closest('.surebet-outcome-btn');
    if (!btn) return;
    document.querySelectorAll('.surebet-outcome-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    numOutcomes = parseInt(btn.dataset.n);
    buildOddsInputs();
    calculate();
  });

  document.getElementById('sbTotal').addEventListener('input', calculate);

  buildOddsInputs();
})();

/* =============================================
   ALAVANCAGEM
============================================= */
(function () {
  var alvRounds = [];
  var alvRodadaAtual = 0;

  function fmtAlv(v) {
    return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function buildRounds(inicial, odd, n) {
    var rounds = [];
    var aposta = parseFloat(inicial);
    for (var i = 0; i < n; i++) {
      var retorno = aposta * parseFloat(odd);
      var guardar = aposta;
      var proximo = retorno - parseFloat(inicial);
      rounds.push({
        num: i + 1,
        aposta: aposta,
        retorno: retorno,
        guardar: guardar,
      });
      aposta = proximo;
    }
    return rounds;
  }

  function renderRounds() {
    var container = document.getElementById('alvRoundsTable');
    if (!container) return;
    var html = '';
    alvRounds.forEach(function (r, i) {
      var status = i < alvRodadaAtual ? 'passado' : (i === alvRodadaAtual ? 'ativa' : 'futura');
      var rowCls = status === 'passado' ? ' alv-round-row--passado' : '';
      var badgeCls = status === 'ativa' ? ' alv-round-badge--ativa' : (status === 'passado' ? ' alv-round-badge--certo' : '');
      var badgeContent = status === 'passado'
        ? '<i class="bi bi-check-lg"></i>'
        : (status === 'ativa' ? r.num : r.num);
      html += '<div class="alv-round-row' + rowCls + '">'
        + '<div class="alv-round-badge' + badgeCls + '">' + badgeContent + '</div>'
        + '<div class="alv-round-info">'
        +   '<div class="alv-round-title">Rodada ' + r.num + ' — Apostar ' + fmtAlv(r.aposta) + '</div>'
        +   '<div class="alv-round-sub">Guardar: ' + fmtAlv(r.guardar) + '</div>'
        + '</div>'
        + '<div class="alv-round-right">'
        +   '<div class="alv-round-retorno">' + fmtAlv(r.retorno) + '</div>'
        +   '<div class="alv-round-guardar">se ganhar</div>'
        + '</div>'
        + '</div>';
    });
    container.innerHTML = html;

    var totalGuardado = alvRounds.slice(0, alvRodadaAtual).reduce(function (s, r) { return s + r.guardar; }, 0);
    var rodadaObj = alvRounds[alvRodadaAtual] || null;
    var summary = document.getElementById('alvSummary');
    summary.innerHTML = ''
      + '<div class="alv-summary-chip">'
      +   '<span class="alv-summary-chip-label">Rodada atual</span>'
      +   '<span class="alv-summary-chip-val">' + (alvRodadaAtual + 1) + ' / ' + alvRounds.length + '</span>'
      + '</div>'
      + (rodadaObj ? '<div class="alv-summary-chip">'
      +   '<span class="alv-summary-chip-label">Apostar agora</span>'
      +   '<span class="alv-summary-chip-val">' + fmtAlv(rodadaObj.aposta) + '</span>'
      + '</div>' : '')
      + '<div class="alv-summary-chip">'
      +   '<span class="alv-summary-chip-label">Guardado</span>'
      +   '<span class="alv-summary-chip-val alv-summary-chip-val--green">' + fmtAlv(totalGuardado) + '</span>'
      + '</div>';

    var btnCerto = document.getElementById('alvBtnCerto');
    if (btnCerto) btnCerto.disabled = alvRodadaAtual >= alvRounds.length - 1;
  }

  window.alvSimular = function () {
    var inicial = parseFloat(document.getElementById('alvInicial').value) || 0;
    var odd = parseFloat(document.getElementById('alvOdd').value) || 0;
    var n = parseInt(document.getElementById('alvRodadas').value, 10) || 0;
    if (inicial <= 0 || odd <= 1 || n < 1) { alert('Preencha valores válidos (aposta > 0, odd > 1, rodadas ≥ 1).'); return; }
    alvRounds = buildRounds(inicial, odd, n);
    alvRodadaAtual = 0;
    document.getElementById('alvResultCard').style.display = '';
    renderRounds();
  };

  window.alvDeuCerto = function () {
    if (alvRodadaAtual < alvRounds.length - 1) {
      alvRodadaAtual++;
      renderRounds();
    }
  };

  window.alvReiniciar = function () {
    alvRodadaAtual = 0;
    renderRounds();
  };
})();
