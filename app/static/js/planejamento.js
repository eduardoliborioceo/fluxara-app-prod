(function () {
  var MESES = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

  var now = new Date();
  var year  = now.getFullYear();
  var month = now.getMonth();

  function updateMesLabel() {
    document.getElementById('mesLabel').textContent = MESES[month] + ' ' + year;
  }

  document.getElementById('btnMesAnterior').addEventListener('click', function () {
    month--;
    if (month < 0) { month = 11; year--; }
    updateMesLabel();
    loadOrcamentos();
  });

  document.getElementById('btnMesPosterior').addEventListener('click', function () {
    month++;
    if (month > 11) { month = 0; year++; }
    updateMesLabel();
    loadOrcamentos();
  });

  updateMesLabel();

  function formatMoney(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var modalBackdrop = document.getElementById('planModal');
  var modalTitle    = document.getElementById('planModalTitle');
  var modalInput    = document.getElementById('planModalInput');
  var modalSave     = document.getElementById('planModalSave');
  var modalCancel   = document.getElementById('planModalCancel');
  var modalRemove   = document.getElementById('planModalRemove');
  var editCatId     = null;
  var editOrcId     = null;

  function openModal(catId, catNome, orcId, orcValor) {
    editCatId = catId;
    editOrcId = orcId || null;
    modalTitle.textContent = 'Orçamento: ' + catNome;
    modalInput.value = orcValor > 0 ? parseFloat(orcValor).toFixed(2) : '';
    modalRemove.style.display = orcId ? '' : 'none';
    modalBackdrop.classList.add('open');
    setTimeout(function () { modalInput.focus(); }, 100);
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
    editCatId = null;
    editOrcId = null;
  }

  modalCancel.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', function (e) { if (e.target === this) closeModal(); });

  modalSave.addEventListener('click', async function () {
    if (!editCatId) return;
    var valor = parseFloat(modalInput.value.replace(',', '.')) || 0;
    var mes = month + 1;
    this.disabled = true;
    try {
      var r = await fetch('/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria_id: editCatId, mes: mes, ano: year, valor: valor }),
      });
      if (r.ok) { closeModal(); loadOrcamentos(); }
    } catch (e) {}
    finally { this.disabled = false; }
  });

  modalRemove.addEventListener('click', async function () {
    if (!editOrcId) return;
    this.disabled = true;
    try {
      var r = await fetch('/api/orcamentos/' + editOrcId, { method: 'DELETE' });
      if (r.ok) { closeModal(); loadOrcamentos(); }
    } catch (e) {}
    finally { this.disabled = false; }
  });

  function hexToRgba(hex, alpha) {
    if (!hex || hex[0] !== '#') return null;
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function renderCatItem(item) {
    var gasto = parseFloat(item.gasto_real || 0);
    var orc   = parseFloat(item.orcamento_valor || 0);
    var isDespesa = item.tipo === 'despesa';
    var iconCls = isDespesa ? 'plan-cat-icon--despesa' : 'plan-cat-icon--receita';
    var gastoCls = isDespesa ? 'plan-cat-gasto--despesa' : 'plan-cat-gasto--receita';
    var cor = item.categoria_cor || null;
    var iconStyle = cor
      ? ' style="background:' + hexToRgba(cor, 0.13) + ';color:' + cor + ';"'
      : '';
    var pct = orc > 0 ? Math.min(gasto / orc * 100, 999) : 0;
    var barCls, pctCls;
    if (isDespesa) {
      barCls = pct >= 100 ? 'plan-cat-bar--over' : (pct >= 80 ? 'plan-cat-bar--alert' : 'plan-cat-bar--ok');
      pctCls = pct >= 100 ? 'plan-cat-pct--over' : (pct >= 80 ? 'plan-cat-pct--alert' : '');
    } else {
      barCls = 'plan-cat-bar--receita';
      pctCls = '';
    }
    var barWidth = orc > 0 ? Math.min(pct, 100).toFixed(1) + '%' : '0%';
    var orcText = orc > 0
      ? '<span class="plan-cat-sep">/</span><span class="plan-cat-orc">' + formatMoney(orc) + '</span>'
      : '<span class="plan-cat-orc-vazio">Definir meta</span>';
    var pctText = orc > 0 ? '<div class="plan-cat-pct ' + pctCls + '">' + Math.round(pct) + '%</div>' : '';
    var barHtml = orc > 0
      ? '<div class="plan-cat-bar-wrap"><div class="plan-cat-bar ' + barCls + '" style="width:' + barWidth + '"></div></div>'
      : '';

    return '<div class="plan-cat-item"'
      + ' data-cat-id="' + item.categoria_id + '"'
      + ' data-orc-id="' + (item.orcamento_id || '') + '"'
      + ' data-orc-valor="' + orc + '"'
      + ' data-cat-nome="' + esc(item.categoria_nome) + '">'
      + '<div class="plan-cat-icon ' + iconCls + '"' + iconStyle + '><i class="bi ' + esc(item.categoria_icone || 'bi-tag') + '"></i></div>'
      + '<div class="plan-cat-body">'
      +   '<div class="plan-cat-name">' + esc(item.categoria_nome) + '</div>'
      +   '<div class="plan-cat-values">'
      +     '<span class="plan-cat-gasto ' + gastoCls + '">' + formatMoney(gasto) + '</span>'
      +     orcText
      +   '</div>'
      +   barHtml
      + '</div>'
      + '<div class="plan-cat-right">' + pctText + '</div>'
      + '</div>';
  }

  async function loadOrcamentos() {
    var mes = month + 1;
    var despesaList = document.getElementById('planDespesaList');
    var receitaList = document.getElementById('planReceitaList');
    var loading = '<div class="text-center py-4 text-muted small"><div class="spinner-border spinner-border-sm me-2"></div>Carregando...</div>';
    despesaList.innerHTML = loading;
    receitaList.innerHTML = loading;

    try {
      var r = await fetch('/api/orcamentos?mes=' + mes + '&ano=' + year);
      var data = await r.json();
      if (!Array.isArray(data)) throw new Error();

      var despesas = data.filter(function (d) { return d.tipo === 'despesa'; });
      var receitas = data.filter(function (d) { return d.tipo === 'receita'; });

      despesaList.innerHTML = despesas.length
        ? '<div class="plan-cat-list">' + despesas.map(renderCatItem).join('') + '</div>'
        : '<div class="text-center py-3 text-muted small">Nenhuma categoria de despesa cadastrada</div>';

      receitaList.innerHTML = receitas.length
        ? '<div class="plan-cat-list">' + receitas.map(renderCatItem).join('') + '</div>'
        : '<div class="text-center py-3 text-muted small">Nenhuma categoria de receita cadastrada</div>';

      document.querySelectorAll('.plan-cat-item').forEach(function (el) {
        el.addEventListener('click', function () {
          openModal(
            parseInt(this.dataset.catId),
            this.dataset.catNome,
            this.dataset.orcId ? parseInt(this.dataset.orcId) : null,
            parseFloat(this.dataset.orcValor) || 0
          );
        });
      });

      var totalOrcDespesa = despesas.reduce(function (s, d) { return s + parseFloat(d.orcamento_valor || 0); }, 0);
      var totalGastoDespesa = despesas.reduce(function (s, d) { return s + parseFloat(d.gasto_real || 0); }, 0);
      var totalOrcReceita = receitas.reduce(function (s, d) { return s + parseFloat(d.orcamento_valor || 0); }, 0);
      var totalGastoReceita = receitas.reduce(function (s, d) { return s + parseFloat(d.gasto_real || 0); }, 0);
      var saldo = totalGastoReceita - totalGastoDespesa;

      document.getElementById('planSumOrcado').textContent = formatMoney(totalOrcDespesa);
      document.getElementById('planSumGasto').textContent  = formatMoney(totalGastoDespesa);
      var saldoEl = document.getElementById('planSumSaldo');
      saldoEl.textContent = formatMoney(saldo);
      saldoEl.className = 'plan-summary-value ' + (saldo >= 0 ? 'pos' : 'neg');
    } catch (e) {
      despesaList.innerHTML = receitaList.innerHTML =
        '<div class="text-center py-3 text-muted small">Erro ao carregar.</div>';
    }
  }

  document.getElementById('btnCopiarMesAnterior').addEventListener('click', async function () {
    var btn = this;
    btn.disabled = true;
    var original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Copiando...';
    try {
      var r = await fetch('/api/orcamentos/copiar-mes-anterior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: month + 1, ano: year }),
      });
      var data = await r.json();
      if (r.ok) {
        if (data.copiados > 0) {
          loadOrcamentos();
        } else {
          btn.innerHTML = '<i class="bi bi-info-circle me-1"></i>Nenhuma meta no mês anterior';
          setTimeout(function () { btn.innerHTML = original; btn.disabled = false; }, 2500);
          return;
        }
      }
    } catch (e) {}
    btn.innerHTML = original;
    btn.disabled = false;
  });

  loadOrcamentos();
})();
