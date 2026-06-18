(function () {
  var tipo = document.getElementById('lancamentoTipo').textContent.trim();
  var efetivado = true;
  var categoriasData = [];
  var hoje = new Date();
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  var dataHoje = hoje.getFullYear() + '-' + pad(hoje.getMonth() + 1) + '-' + pad(hoje.getDate());

  var parcelaInicial = 1;
  var parcelasTotal = 2;
  var calculoTipo = 'parcela';
  var parcelaConfirmada = false;

  function showSaveToast() {
    var toast = document.getElementById('lancSaveToast');
    if (!toast) return;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2000);
  }

  var allUserTags = [];
  var selectedTags = [];
  var selectedTagColor = '#6366f1';
  var TAG_COLORS = [
    '#6366f1', '#0d6efd', '#198754', '#dc3545', '#fd7e14',
    '#f59e0b', '#0891b2', '#7c3aed', '#db2777', '#64748b',
  ];

  function hexToAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function renderTagsSection() {
    var selEl = document.getElementById('lancTagsSelected');
    var exEl  = document.getElementById('lancTagsExisting');
    if (!selEl) return;

    selEl.innerHTML = selectedTags.map(function (t) {
      return '<button type="button" class="lanc-tag-pill lanc-tag-pill--remove" data-tag-id="' + t.id + '"'
        + ' style="background:' + hexToAlpha(t.cor, 0.14) + ';color:' + t.cor + '">'
        + esc(t.nome) + '</button>';
    }).join('');

    selEl.querySelectorAll('.lanc-tag-pill--remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(this.dataset.tagId);
        selectedTags = selectedTags.filter(function (t) { return t.id !== id; });
        renderTagsSection();
      });
    });

    var available = allUserTags.filter(function (t) {
      return !selectedTags.some(function (s) { return s.id === t.id; });
    });

    if (available.length) {
      exEl.innerHTML = '<span class="lanc-tags-existing-label">Adicionar tag</span>'
        + available.map(function (t) {
            return '<button type="button" class="lanc-tag-pill" data-tag-id="' + t.id + '" data-tag-nome="' + esc(t.nome) + '" data-tag-cor="' + esc(t.cor) + '"'
              + ' style="background:' + hexToAlpha(t.cor, 0.14) + ';color:' + t.cor + '">'
              + esc(t.nome) + '</button>';
          }).join('');
      exEl.querySelectorAll('.lanc-tag-pill').forEach(function (btn) {
        btn.addEventListener('click', function () {
          selectedTags.push({ id: parseInt(this.dataset.tagId), nome: this.dataset.tagNome, cor: this.dataset.tagCor });
          renderTagsSection();
        });
      });
    } else {
      exEl.innerHTML = '';
    }
  }

  function buildTagColorPicker() {
    var container = document.getElementById('lancTagColors');
    if (!container || container.children.length) return;
    TAG_COLORS.forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lanc-tag-color-dot' + (c === selectedTagColor ? ' selected' : '');
      btn.style.background = c;
      btn.dataset.color = c;
      btn.addEventListener('click', function () {
        selectedTagColor = c;
        container.querySelectorAll('.lanc-tag-color-dot').forEach(function (d) { d.classList.remove('selected'); });
        this.classList.add('selected');
      });
      container.appendChild(btn);
    });
  }

  async function adicionarTag() {
    var input = document.getElementById('lancTagInput');
    if (!input) return;
    var nome = input.value.trim();
    if (!nome) return;

    var existing = allUserTags.find(function (t) { return t.nome.toLowerCase() === nome.toLowerCase(); });
    if (existing) {
      if (!selectedTags.some(function (s) { return s.id === existing.id; })) {
        selectedTags.push(existing);
        renderTagsSection();
      }
      input.value = '';
      return;
    }

    try {
      var r = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, cor: selectedTagColor }),
      });
      if (!r.ok) return;
      var tag = await r.json();
      if (!allUserTags.some(function (t) { return t.id === tag.id; })) {
        allUserTags.push(tag);
      }
      if (!selectedTags.some(function (s) { return s.id === tag.id; })) {
        selectedTags.push(tag);
      }
      input.value = '';
      renderTagsSection();
    } catch (err) {}
  }

  async function loadTags() {
    try {
      var r = await fetch('/api/tags');
      var data = await r.json();
      allUserTags = Array.isArray(data) ? data : [];
    } catch (e) { allUserTags = []; }
    buildTagColorPicker();
    renderTagsSection();

    var input = document.getElementById('lancTagInput');
    if (!input) return;

    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      adicionarTag();
    });

    var addBtn = document.getElementById('lancTagAddBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        adicionarTag();
      });
    }
  }

  var MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  var INSTITUICOES = {
    nubank:      { cor: '#8A05BE', letra: 'N', svg: 'nubank.svg' },
    itau:        { cor: '#EC7000', letra: 'I', svg: 'itau.svg' },
    bradesco:    { cor: '#CC092F', letra: 'B', svg: 'bradesco.svg' },
    bb:          { cor: '#F9D600', letra: 'B', corLetra: '#000', svg: 'banco-do-brasil.svg' },
    caixa:       { cor: '#006CA8', letra: 'C', svg: 'caixa.svg' },
    'caixa-tem': { cor: '#006CA8', letra: 'C', svg: 'caixa-tem.svg' },
    santander:   { cor: '#EC0000', letra: 'S', svg: 'santander.svg' },
    inter:       { cor: '#FF7A00', letra: 'I', svg: 'inter.svg' },
    c6:          { cor: '#242424', letra: 'C', svg: 'c6.svg' },
    picpay:      { cor: '#11C76F', letra: 'P', svg: 'picpay.svg' },
    mercadopago: { cor: '#009EE3', letra: 'M', svg: 'mercado-pago.svg' },
    xp:          { cor: '#000000', letra: 'X', svg: 'xp.svg' },
    btg:         { cor: '#003399', letra: 'B', svg: 'btg-pactual.svg' },
    sicoob:      { cor: '#007A3D', letra: 'S' },
    sicredi:     { cor: '#006633', letra: 'S', svg: 'sicredi.svg' },
    neon:        { cor: '#00CFFF', letra: 'N', corLetra: '#000', svg: 'neon.svg' },
    next:        { cor: '#00CC99', letra: 'N', corLetra: '#000', svg: 'next.svg' },
    wise:        { cor: '#9FE870', letra: 'W', corLetra: '#000' },
    paypal:      { cor: '#003087', letra: 'P', svg: 'paypal.svg' },
    iti:         { cor: '#FF6600', letra: 'i', svg: 'iti.svg' },
    will:        { cor: '#FFCC00', letra: 'W', corLetra: '#000', svg: 'will-bank.svg' },
    bs2:         { cor: '#0066CC', letra: 'B' },
    original:    { cor: '#00A650', letra: 'O', svg: 'original.svg' },
    sofisa:      { cor: '#E2001A', letra: 'S', svg: 'sofisa.svg' },
    banrisul:    { cor: '#005CA9', letra: 'B', svg: 'banrisul.svg' },
    bv:          { cor: '#004B8D', letra: 'B', svg: 'bv.svg' },
    bmg:         { cor: '#E30613', letra: 'B', svg: 'bmg.svg' },
    pan:         { cor: '#FFD100', letra: 'P', corLetra: '#000', svg: 'pan.svg' },
    daycoval:    { cor: '#005A9E', letra: 'D', svg: 'daycoval.svg' },
    mercantil:   { cor: '#004A9F', letra: 'M', svg: 'mercantil.svg' },
    digio:       { cor: '#0077CC', letra: 'D', svg: 'digio.svg' },
    stone:       { cor: '#00A868', letra: 'S', svg: 'stone.svg' },
    pagseguro:   { cor: '#FFC72C', letra: 'P', corLetra: '#000', svg: 'pagseguro.svg' },
    'nu-invest': { cor: '#8A05BE', letra: 'N', svg: 'nu-invest.svg' },
    nomad:       { cor: '#1A1A2E', letra: 'N', svg: 'nomad.svg' },
    zrobank:     { cor: '#0055B8', letra: 'Z', svg: 'zrobank.svg' },
    n26:         { cor: '#000000', letra: 'N', svg: 'n26.svg' },
    warren:      { cor: '#4C12A1', letra: 'W', svg: 'warren.svg' },
    toro:        { cor: '#FF6B00', letra: 'T', svg: 'toro.svg' },
    clear:       { cor: '#00C4B3', letra: 'C', svg: 'clear.svg' },
    rico:        { cor: '#00B386', letra: 'R', svg: 'rico.svg' },
    genial:      { cor: '#FF6600', letra: 'G', svg: 'genial-investimentos.svg' },
    avenue:      { cor: '#0033A0', letra: 'A', svg: 'avenue.svg' },
    ame:         { cor: '#FF0064', letra: 'A', svg: 'ame.svg' },
    amazon:      { cor: '#FF9900', letra: 'A', corLetra: '#000', svg: 'amazon.svg' },
    magalu:      { cor: '#0086FF', letra: 'M', svg: 'magalu.svg' },
    samsung:     { cor: '#1428A0', letra: 'S', svg: 'samsung.svg' },
    infinitepay: { cor: '#00BCD4', letra: 'I', svg: 'infinitepay.svg' },
    ton:         { cor: '#00C853', letra: 'T', svg: 'ton.svg' },
    fitbank:     { cor: '#1A237E', letra: 'F', svg: 'fitbank.svg' },
    cora:        { cor: '#FF4C8B', letra: 'C', svg: 'cora.svg' },
    dm:          { cor: '#004B87', letra: 'D', svg: 'dm.svg' },
    flash:       { cor: '#F24E1E', letra: 'F', svg: 'flash.svg' },
    caju:        { cor: '#FF6B35', letra: 'C', svg: 'caju.svg' },
    binance:     { cor: '#F3BA2F', letra: 'B', corLetra: '#000', svg: 'binance.svg' },
    metamask:    { cor: '#E2761B', letra: 'M', svg: 'metamask.svg' },
    bitybank:    { cor: '#0066FF', letra: 'B', svg: 'bitybank.svg' },
    outro:       { cor: '#64748b', icone: 'bi-wallet2', corLetra: '#fff' },
  };

  var BANDEIRAS = {
    visa:       { nome: 'Visa',       cor: '#1A1F71', svg: 'visa.svg' },
    mastercard: { nome: 'Mastercard', cor: '#EB001B', svg: 'mastercard.svg' },
    elo:        { nome: 'Elo',        cor: '#FFD700', corLetra: '#000' },
    amex:       { nome: 'Amex',       cor: '#2E77BC', svg: 'amex.svg' },
    hipercard:  { nome: 'Hipercard',  cor: '#B22222', svg: 'hipercard.svg' },
    outro:      { nome: 'Outro',      cor: '#6c757d' },
  };

  function buildBandeiraLogoHtml(b, size) {
    size = size || 36;
    if (b && b.svg) {
      return '<div class="conta-picker-logo" style="background:#f8fafc;width:' + size + 'px;height:' + size + 'px">'
        + '<img src="/static/images/bank-icons-logos-svg/' + esc(b.svg) + '" alt="" style="width:65%;height:65%;object-fit:contain"></div>';
    }
    var bg = (b && b.cor) || '#6c757d';
    var fg = (b && b.corLetra) || '#fff';
    var nome = (b && b.nome) || 'Cartão';
    return '<div class="conta-picker-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px;font-size:.6rem;font-weight:700">' + esc(nome) + '</div>';
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatMoney(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function buildLogoHtml(inst, size) {
    size = size || 36;
    if (inst && inst.svg) {
      return '<div class="conta-picker-logo" style="background:#f8fafc;width:' + size + 'px;height:' + size + 'px">'
        + '<img src="/static/images/bank-icons-logos-svg/' + esc(inst.svg) + '" alt="" style="width:65%;height:65%;object-fit:contain"></div>';
    }
    var bg = (inst && inst.cor) || '#64748b';
    var fg = (inst && inst.corLetra) || '#fff';
    var iconSize = Math.round(size * 0.5) + 'px';
    if (inst && inst.icone) {
      return '<div class="conta-picker-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px">'
        + '<i class="bi ' + inst.icone + '" style="font-size:' + iconSize + '"></i></div>';
    }
    var letra = (inst && inst.letra) || '?';
    return '<div class="conta-picker-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px">' + letra + '</div>';
  }

  function calcularFatura(cartao) {
    var diaFechamento = parseInt(cartao.dia_fechamento) || 1;
    var diaHoje = hoje.getDate();
    var mesHoje = hoje.getMonth() + 1;
    var anoHoje = hoje.getFullYear();
    var faturaMes, faturaAno;
    if (diaHoje <= diaFechamento) {
      faturaMes = mesHoje;
      faturaAno = anoHoje;
    } else {
      var m = mesHoje + 1;
      var y = anoHoje;
      if (m > 12) { m = 1; y++; }
      faturaMes = m;
      faturaAno = y;
    }
    return { mes: faturaMes, ano: faturaAno };
  }

  function atualizarFaturaDisplay(cartao) {
    var fatura = calcularFatura(cartao);
    document.getElementById('lFaturaMes').value = fatura.mes;
    document.getElementById('lFaturaAno').value = fatura.ano;
    var nomeMes = MESES_PT[fatura.mes - 1];
    var display = document.getElementById('faturaDisplay');
    if (display) {
      display.innerHTML = '<i class="bi bi-calendar-check me-1"></i>'
        + '<strong>' + nomeMes + '/' + fatura.ano + '</strong>'
        + ' &nbsp;·&nbsp; fecha dia ' + cartao.dia_fechamento
        + ', vence dia ' + cartao.dia_vencimento;
      display.style.color = 'var(--text, #212529)';
    }
  }

  if (document.getElementById('lData')) {
    document.getElementById('lData').value = dataHoje;
  }

  if (document.getElementById('btnEfetivado')) {
    function setStatus(val) {
      efetivado = val;
      document.getElementById('lEfetivado').value = String(val);
      document.getElementById('btnEfetivado').className = 'status-btn' + (val ? ' active-efetivado' : '');
      document.getElementById('btnPendente').className = 'status-btn' + (!val ? ' active-pendente' : '');
    }
    document.getElementById('btnEfetivado').addEventListener('click', function () { setStatus(true); });
    document.getElementById('btnPendente').addEventListener('click', function () { setStatus(false); });
  }

  var recModo = document.getElementById('lRecorrenciaModo');
  recModo.addEventListener('change', function () {
    var modo = this.value;
    document.getElementById('divFixaPeriodicidade').classList.toggle('d-none', modo !== 'fixa');
    document.getElementById('divParcelaResumo').classList.toggle('d-none', modo !== 'parcela');
    if (modo === 'parcela') {
      parcelaConfirmada = false;
      abrirRecSheet();
    }
  });

  document.getElementById('btnEditarParcela').addEventListener('click', function () {
    abrirRecSheet();
  });

  function abrirRecSheet() {
    document.getElementById('recOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    atualizarPreview();
  }

  function fecharRecSheet() {
    document.getElementById('recOverlay').classList.remove('open');
    document.body.style.overflow = '';
    if (!parcelaConfirmada) {
      recModo.value = 'nao_recorrente';
      document.getElementById('divParcelaResumo').classList.add('d-none');
    }
  }

  document.getElementById('recSheetClose').addEventListener('click', fecharRecSheet);
  document.getElementById('recOverlay').addEventListener('click', function (e) {
    if (e.target === this) fecharRecSheet();
  });

  function makeCounter(btnMinus, btnPlus, valEl, getVal, setVal, min) {
    document.getElementById(btnMinus).addEventListener('click', function () {
      var v = getVal();
      if (v > (min || 1)) { setVal(v - 1); atualizarPreview(); }
    });
    document.getElementById(btnPlus).addEventListener('click', function () {
      setVal(getVal() + 1);
      atualizarPreview();
    });
  }

  makeCounter('btnPInicialMinus', 'btnPInicialPlus', 'valPInicial',
    function () { return parcelaInicial; },
    function (v) { parcelaInicial = v; document.getElementById('valPInicial').textContent = v; });

  makeCounter('btnQuantMinus', 'btnQuantPlus', 'valQuant',
    function () { return parcelasTotal; },
    function (v) { parcelasTotal = v; document.getElementById('valQuant').textContent = v; },
    2);

  document.getElementById('lPeriodicidade').addEventListener('change', atualizarPreview);

  document.getElementById('btnCalcTotal').addEventListener('click', function () {
    calculoTipo = 'total';
    this.classList.add('active-efetivado');
    document.getElementById('btnCalcParcela').classList.remove('active-efetivado');
    document.getElementById('lCalculoTipo').value = 'total';
    atualizarPreview();
  });

  document.getElementById('btnCalcParcela').addEventListener('click', function () {
    calculoTipo = 'parcela';
    this.classList.add('active-efetivado');
    document.getElementById('btnCalcTotal').classList.remove('active-efetivado');
    document.getElementById('lCalculoTipo').value = 'parcela';
    atualizarPreview();
  });

  function atualizarPreview() {
    var valor = parseFloat(document.getElementById('lValor').value) || 0;
    var preview = document.getElementById('recPreview');
    if (!valor) { preview.classList.remove('visible'); return; }
    var total = parcelaInicial + parcelasTotal - 1;
    var valorParcela = calculoTipo === 'total'
      ? Math.round(valor / parcelasTotal * 100) / 100
      : valor;
    var per = document.getElementById('lPeriodicidade').value;
    var perLabel = { mensal: 'mensais', semanal: 'semanais', diario: 'diárias', trimestral: 'trimestrais', anual: 'anuais' }[per] || per;
    preview.innerHTML = '<strong>' + parcelasTotal + 'x</strong> de <strong>' + formatMoney(valorParcela)
      + '</strong> ' + perLabel + ' (parcelas ' + parcelaInicial + ' a ' + total + ')';
    preview.classList.add('visible');
    document.getElementById('lblParcelaResumo').textContent = parcelasTotal + 'x de ' + formatMoney(valorParcela) + ' ' + perLabel;
  }

  document.getElementById('lValor').addEventListener('input', function () {
    if (recModo.value === 'parcela') atualizarPreview();
  });

  document.getElementById('btnRecConfirmar').addEventListener('click', function () {
    parcelaConfirmada = true;
    atualizarPreview();
    document.getElementById('recOverlay').classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('divParcelaResumo').classList.remove('d-none');
  });

  function buildContaPicker(pickerId, triggerEl, selectedEl, dropdownEl, hiddenInput, items, renderItem, onSelect) {
    dropdownEl.innerHTML = items.map(function (item) {
      return renderItem(item, false);
    }).join('');

    dropdownEl.querySelectorAll('.conta-picker-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = this.dataset.id;
        hiddenInput.value = id;
        var found = items.find(function (x) { return String(x.id) === String(id); });
        if (found) {
          selectedEl.innerHTML = renderItem(found, true);
          if (onSelect) onSelect(found);
        }
        document.getElementById(pickerId).classList.remove('open');
      });
    });

    triggerEl.addEventListener('click', function (e) {
      e.stopPropagation();
      var picker = document.getElementById(pickerId);
      picker.classList.toggle('open');
      if (picker.classList.contains('open')) {
        var rect = triggerEl.getBoundingClientRect();
        var bottomNavEl = document.querySelector('.bottom-nav');
        var bottomNavH = bottomNavEl ? bottomNavEl.getBoundingClientRect().height : 0;
        var available = window.innerHeight - rect.bottom - bottomNavH - 8;
        dropdownEl.style.maxHeight = Math.max(available, 120) + 'px';
      }
    });

    document.addEventListener('click', function () {
      document.getElementById(pickerId).classList.remove('open');
    });

    document.getElementById(pickerId).addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  var contasItems = [];
  var cartoesItems = [];

  function preselectConta(id) {
    var found = contasItems.find(function (x) { return String(x.id) === String(id); });
    if (!found) return;
    var inst = INSTITUICOES[found.instituicao] || INSTITUICOES.outro;
    var logo = buildLogoHtml(inst, 32);
    document.getElementById('lConta').value = id;
    document.getElementById('contaPickerSelected').innerHTML =
      logo + '<span class="conta-picker-nome">' + esc(found.nome) + '</span>';
  }

  function preselectCartao(id) {
    var found = cartoesItems.find(function (x) { return String(x.id) === String(id); });
    if (!found) return;
    var b = BANDEIRAS[found.bandeira] || BANDEIRAS.outro;
    var logo = buildBandeiraLogoHtml(b, 32);
    document.getElementById('lCartao').value = id;
    document.getElementById('cartaoPickerSelected').innerHTML =
      logo + '<span class="conta-picker-nome">' + esc(found.nome) + '</span>';
    atualizarFaturaDisplay(found);
  }

  async function loadContas() {
    var pickerEl = document.getElementById('contaPicker');
    if (!pickerEl) return;
    try {
      var r = await fetch('/api/contas');
      var data = await r.json();
      if (!Array.isArray(data) || !data.length) return;
      contasItems = data;

      function renderConta(c, compact) {
        var inst = INSTITUICOES[c.instituicao] || INSTITUICOES.outro;
        var logo = buildLogoHtml(inst, compact ? 32 : 36);
        if (compact) {
          return logo + '<span class="conta-picker-nome">' + esc(c.nome) + '</span>';
        }
        return '<div class="conta-picker-item" data-id="' + c.id + '">'
          + logo + '<span class="conta-picker-nome">' + esc(c.nome) + '</span></div>';
      }

      buildContaPicker(
        'contaPicker',
        document.getElementById('contaPickerTrigger'),
        document.getElementById('contaPickerSelected'),
        document.getElementById('contaPickerDropdown'),
        document.getElementById('lConta'),
        data,
        renderConta,
        null
      );
    } catch (e) {}
  }

  async function loadCartoes() {
    var pickerEl = document.getElementById('cartaoPicker');
    if (!pickerEl) return;
    try {
      var r = await fetch('/api/cartoes');
      var cartoes = await r.json();
      if (!Array.isArray(cartoes) || !cartoes.length) return;
      cartoesItems = cartoes;

      function renderCartao(c, compact) {
        var b = BANDEIRAS[c.bandeira] || BANDEIRAS.outro;
        var size = compact ? 32 : 36;
        var logo = buildBandeiraLogoHtml(b, size);
        if (compact) {
          return logo + '<span class="conta-picker-nome">' + esc(c.nome) + '</span>';
        }
        return '<div class="conta-picker-item" data-id="' + c.id + '">'
          + logo + '<span class="conta-picker-nome">' + esc(c.nome) + '</span></div>';
      }

      buildContaPicker(
        'cartaoPicker',
        document.getElementById('cartaoPickerTrigger'),
        document.getElementById('cartaoPickerSelected'),
        document.getElementById('cartaoPickerDropdown'),
        document.getElementById('lCartao'),
        cartoes,
        renderCartao,
        function (cartao) { atualizarFaturaDisplay(cartao); }
      );

      if (cartoes.length === 1) {
        preselectCartao(cartoes[0].id);
      }
    } catch (e) {}
  }

  function onCategoriaChange(catId) {
    var cat = categoriasData.find(function (c) { return c.id === catId; });
    var sec = document.getElementById('secSubcategoria');
    var sel2 = document.getElementById('lSubcategoria');
    if (cat && cat.subcategorias && cat.subcategorias.length) {
      sel2.innerHTML = '<option value="">Selecionar subcategoria...</option>' +
        cat.subcategorias.map(function (s) {
          return '<option value="' + s.id + '">' + esc(s.nome) + '</option>';
        }).join('');
      sec.style.display = '';
    } else {
      sec.style.display = 'none';
    }
  }

  function preselectCategoria(id) {
    var found = categoriasData.find(function (c) { return String(c.id) === String(id); });
    if (!found) return;
    var color = found.cor_fundo || '#64748b';
    var iconHtml = '<div class="conta-picker-logo" style="background:' + color + '20;color:' + color + '">'
      + '<i class="bi ' + found.icone + '"></i></div>';
    document.getElementById('lCategoria').value = id;
    document.getElementById('categoriaPickerSelected').innerHTML =
      iconHtml + '<span class="conta-picker-nome">' + esc(found.nome) + '</span>';
    onCategoriaChange(found.id);
  }

  async function loadCategorias() {
    var tipoCat = tipo === 'receita' ? 'receita' : 'despesa';
    try {
      var r = await fetch('/api/config/categorias?tipo=' + tipoCat);
      categoriasData = await r.json();

      function renderCategoria(c, compact) {
        var color = c.cor_fundo || '#64748b';
        var iconHtml = '<div class="conta-picker-logo" style="background:' + color + '20;color:' + color + '">'
          + '<i class="bi ' + c.icone + '"></i></div>';
        if (compact) {
          return iconHtml + '<span class="conta-picker-nome">' + esc(c.nome) + '</span>';
        }
        return '<div class="conta-picker-item" data-id="' + c.id + '">'
          + iconHtml + '<span class="conta-picker-nome">' + esc(c.nome) + '</span></div>';
      }

      buildContaPicker(
        'categoriaPicker',
        document.getElementById('categoriaPickerTrigger'),
        document.getElementById('categoriaPickerSelected'),
        document.getElementById('categoriaPickerDropdown'),
        document.getElementById('lCategoria'),
        categoriasData,
        renderCategoria,
        function (cat) { onCategoriaChange(cat.id); }
      );
    } catch (e) {}
  }

  function resetForm() {
    document.getElementById('lDescricao').value = '';
    document.getElementById('lValor').value = '';
    document.getElementById('lCategoria').value = '';
    document.getElementById('categoriaPickerSelected').innerHTML = '<span class="text-muted">Selecionar categoria...</span>';
    document.getElementById('secSubcategoria').style.display = 'none';
    recModo.value = 'nao_recorrente';
    document.getElementById('divFixaPeriodicidade').classList.add('d-none');
    document.getElementById('divParcelaResumo').classList.add('d-none');
    parcelaInicial = 1; parcelasTotal = 2; parcelaConfirmada = false;
    if (document.getElementById('lData')) {
      document.getElementById('lData').value = dataHoje;
    }
    if (document.getElementById('lConta')) {
      document.getElementById('lConta').value = '';
      document.getElementById('contaPickerSelected').innerHTML = '<span class="text-muted">Selecionar conta...</span>';
    }
    if (document.getElementById('lCartao')) {
      document.getElementById('lCartao').value = '';
      document.getElementById('cartaoPickerSelected').innerHTML = '<span class="text-muted">Selecionar cartão...</span>';
      document.getElementById('lFaturaMes').value = '';
      document.getElementById('lFaturaAno').value = '';
      var display = document.getElementById('faturaDisplay');
      if (display) {
        display.innerHTML = 'Selecione um cartão para calcular automaticamente';
        display.style.color = '';
      }
    }
    if (document.getElementById('btnEfetivado')) {
      efetivado = true;
      document.getElementById('lEfetivado').value = 'true';
      document.getElementById('btnEfetivado').className = 'status-btn active-efetivado';
      document.getElementById('btnPendente').className = 'status-btn';
    }
    selectedTags = [];
    var tagInput = document.getElementById('lancTagInput');
    if (tagInput) tagInput.value = '';
    renderTagsSection();
  }

  document.getElementById('btnSalvar').addEventListener('click', async function () {
    var valor = parseFloat(document.getElementById('lValor').value);
    if (!valor || valor <= 0) return;
    var modo = recModo.value;
    var body = {
      tipo: tipo,
      descricao: document.getElementById('lDescricao').value.trim(),
      valor: valor,
      recorrencia_modo: modo,
      categoria_id: document.getElementById('lCategoria').value || null,
    };
    var subSec = document.getElementById('secSubcategoria');
    if (subSec.style.display !== 'none' && document.getElementById('lSubcategoria')) {
      body.subcategoria_id = document.getElementById('lSubcategoria').value || null;
    }
    if (modo === 'parcela') {
      body.parcelas_total = parcelasTotal;
      body.parcela_inicial = parcelaInicial;
      body.periodicidade = document.getElementById('lPeriodicidade').value;
      body.calculo_tipo = document.getElementById('lCalculoTipo').value;
    } else if (modo === 'fixa') {
      body.periodicidade = document.getElementById('lPeriodicidadeFixa').value;
    }
    if (tipo === 'despesa_cartao') {
      body.cartao_id = document.getElementById('lCartao').value || null;
      var fm = parseInt(document.getElementById('lFaturaMes').value);
      var fa = parseInt(document.getElementById('lFaturaAno').value);
      if (fm && fa) { body.fatura_mes = fm; body.fatura_ano = fa; }
    } else {
      body.efetivado = efetivado;
      body.data_vencimento = document.getElementById('lData').value || null;
      body.conta_id = document.getElementById('lConta').value || null;
    }
    var btn = this;
    btn.disabled = true;
    try {
      var r = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        var created = await r.json();
        if (created && created.id && selectedTags.length) {
          await fetch('/api/lancamentos/' + created.id + '/tags', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag_ids: selectedTags.map(function (t) { return t.id; }) }),
          }).catch(function () {});
        }
        showSaveToast();
        resetForm();
      }
    } catch (e) {}
    finally { btn.disabled = false; }
  });

  // ===== AUTOCOMPLETE DESCRIÇÃO =====
  var sugDropdown = document.getElementById('sugDropdown');
  var sugTimer = null;
  var sugVisible = false;

  function closeSug() {
    sugDropdown.innerHTML = '';
    sugDropdown.classList.remove('open');
    sugVisible = false;
  }

  function applySugestao(item) {
    document.getElementById('lDescricao').value = item.descricao;
    if (item.valor) document.getElementById('lValor').value = parseFloat(item.valor).toFixed(2);
    if (item.categoria_id) {
      preselectCategoria(item.categoria_id);
      if (item.subcategoria_id) {
        setTimeout(function () {
          var sel2 = document.getElementById('lSubcategoria');
          if (sel2) sel2.value = item.subcategoria_id;
        }, 50);
      }
    }
    if (tipo === 'despesa_cartao') {
      if (item.cartao_id) preselectCartao(item.cartao_id);
    } else {
      if (item.conta_id) preselectConta(item.conta_id);
    }
    closeSug();
    document.getElementById('lValor').focus();
  }

  function renderSug(items) {
    if (!items.length) { closeSug(); return; }
    sugDropdown.innerHTML = items.map(function (item) {
      var catLabel = item.categoria_nome ? '<span class="sug-cat">' + esc(item.categoria_nome) + '</span>' : '';
      var valor = item.valor ? '<span class="sug-valor">R$ ' + parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>' : '';
      return '<div class="sug-item" tabindex="0">'
        + '<div class="sug-desc">' + esc(item.descricao) + '</div>'
        + '<div class="sug-meta">' + catLabel + valor + '</div>'
        + '</div>';
    }).join('');
    sugDropdown.querySelectorAll('.sug-item').forEach(function (el, idx) {
      el.addEventListener('mousedown', function (e) {
        e.preventDefault();
        applySugestao(items[idx]);
      });
    });
    sugDropdown.classList.add('open');
    sugVisible = true;
  }

  document.getElementById('lDescricao').addEventListener('input', function () {
    clearTimeout(sugTimer);
    var q = this.value.trim();
    if (q.length < 2) { closeSug(); return; }
    var self = this;
    sugTimer = setTimeout(async function () {
      try {
        var r = await fetch('/api/lancamentos/sugestoes?q=' + encodeURIComponent(q) + '&tipo=' + encodeURIComponent(tipo));
        var data = await r.json();
        if (document.getElementById('lDescricao') === document.activeElement) {
          renderSug(Array.isArray(data) ? data : []);
        }
      } catch (e) {}
    }, 250);
  });

  document.getElementById('lDescricao').addEventListener('blur', function () {
    setTimeout(closeSug, 180);
  });

  if (tipo === 'despesa_cartao') {
    loadCartoes();
  } else {
    loadContas();
  }
  loadCategorias();
  loadTags();
})();
