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
