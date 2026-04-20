(function () {
  var efetivado = true;
  var hoje = new Date();
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  var dataHoje = hoje.getFullYear() + '-' + pad(hoje.getMonth() + 1) + '-' + pad(hoje.getDate());

  var parcelaInicial = 1;
  var parcelasTotal = 2;
  var calculoTipo = 'parcela';
  var parcelaConfirmada = false;

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
    outro:       { cor: '#6c757d', letra: 'O' },
  };

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
    var bg = (inst && inst.cor) || '#6c757d';
    var fg = (inst && inst.corLetra) || '#fff';
    var letra = (inst && inst.letra) || 'O';
    return '<div class="conta-picker-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px">' + letra + '</div>';
  }

  document.getElementById('tData').value = dataHoje;

  function setStatus(val) {
    efetivado = val;
    document.getElementById('tEfetivado').value = String(val);
    document.getElementById('btnEfetivado').className = 'status-btn' + (val ? ' active-efetivado' : '');
    document.getElementById('btnPendente').className = 'status-btn' + (!val ? ' active-pendente' : '');
  }

  document.getElementById('btnEfetivado').addEventListener('click', function () { setStatus(true); });
  document.getElementById('btnPendente').addEventListener('click', function () { setStatus(false); });

  var recModo = document.getElementById('tRecorrenciaModo');
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

  document.getElementById('tPeriodicidade').addEventListener('change', atualizarPreview);

  document.getElementById('btnCalcTotal').addEventListener('click', function () {
    calculoTipo = 'total';
    this.classList.add('active-efetivado');
    document.getElementById('btnCalcParcela').classList.remove('active-efetivado');
    document.getElementById('tCalculoTipo').value = 'total';
    atualizarPreview();
  });

  document.getElementById('btnCalcParcela').addEventListener('click', function () {
    calculoTipo = 'parcela';
    this.classList.add('active-efetivado');
    document.getElementById('btnCalcTotal').classList.remove('active-efetivado');
    document.getElementById('tCalculoTipo').value = 'parcela';
    atualizarPreview();
  });

  function atualizarPreview() {
    var valor = parseFloat(document.getElementById('tValor').value) || 0;
    var preview = document.getElementById('recPreview');
    if (!valor) { preview.classList.remove('visible'); return; }
    var total = parcelaInicial + parcelasTotal - 1;
    var valorParcela = calculoTipo === 'total'
      ? Math.round(valor / parcelasTotal * 100) / 100
      : valor;
    var per = document.getElementById('tPeriodicidade').value;
    var perLabel = { mensal: 'mensais', semanal: 'semanais', diario: 'diárias', trimestral: 'trimestrais', anual: 'anuais' }[per] || per;
    preview.innerHTML = '<strong>' + parcelasTotal + 'x</strong> de <strong>' + formatMoney(valorParcela)
      + '</strong> ' + perLabel + ' (parcelas ' + parcelaInicial + ' a ' + total + ')';
    preview.classList.add('visible');
    document.getElementById('lblParcelaResumo').textContent = parcelasTotal + 'x de ' + formatMoney(valorParcela) + ' ' + perLabel;
  }

  document.getElementById('tValor').addEventListener('input', function () {
    if (recModo.value === 'parcela') atualizarPreview();
  });

  document.getElementById('btnRecConfirmar').addEventListener('click', function () {
    parcelaConfirmada = true;
    atualizarPreview();
    document.getElementById('recOverlay').classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('divParcelaResumo').classList.remove('d-none');
  });

  function buildContaPicker(pickerId, triggerEl, selectedEl, dropdownEl, hiddenInput, items) {
    function renderItem(c, compact) {
      var inst = INSTITUICOES[c.instituicao] || INSTITUICOES.outro;
      var logo = buildLogoHtml(inst, compact ? 32 : 36);
      if (compact) {
        return logo + '<span class="conta-picker-nome">' + esc(c.nome) + '</span>';
      }
      return '<div class="conta-picker-item" data-id="' + c.id + '">'
        + logo + '<span class="conta-picker-nome">' + esc(c.nome) + '</span></div>';
    }

    dropdownEl.innerHTML = items.map(function (c) { return renderItem(c, false); }).join('');
    dropdownEl.querySelectorAll('.conta-picker-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = this.dataset.id;
        hiddenInput.value = id;
        var found = items.find(function (x) { return String(x.id) === String(id); });
        if (found) selectedEl.innerHTML = renderItem(found, true);
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

  async function loadContas() {
    try {
      var r = await fetch('/api/contas');
      var data = await r.json();
      if (!Array.isArray(data) || !data.length) return;
      buildContaPicker(
        'contaOrigemPicker',
        document.getElementById('contaOrigemTrigger'),
        document.getElementById('contaOrigemSelected'),
        document.getElementById('contaOrigemDropdown'),
        document.getElementById('tContaOrigem'),
        data
      );
      buildContaPicker(
        'contaDestinoPicker',
        document.getElementById('contaDestinoTrigger'),
        document.getElementById('contaDestinoSelected'),
        document.getElementById('contaDestinoDropdown'),
        document.getElementById('tContaDestino'),
        data
      );
    } catch (e) {}
  }

  function resetForm() {
    document.getElementById('tDescricao').value = '';
    document.getElementById('tValor').value = '';
    document.getElementById('tData').value = dataHoje;
    document.getElementById('tContaOrigem').value = '';
    document.getElementById('tContaDestino').value = '';
    document.getElementById('contaOrigemSelected').innerHTML = '<span class="text-muted">Selecionar conta...</span>';
    document.getElementById('contaDestinoSelected').innerHTML = '<span class="text-muted">Selecionar conta...</span>';
    recModo.value = 'nao_recorrente';
    document.getElementById('divFixaPeriodicidade').classList.add('d-none');
    document.getElementById('divParcelaResumo').classList.add('d-none');
    parcelaInicial = 1; parcelasTotal = 2; parcelaConfirmada = false;
    setStatus(true);
  }

  document.getElementById('btnSalvar').addEventListener('click', async function () {
    var valor = parseFloat(document.getElementById('tValor').value);
    var origem = document.getElementById('tContaOrigem').value;
    var destino = document.getElementById('tContaDestino').value;
    if (!valor || valor <= 0 || !origem || !destino) return;
    if (origem === destino) {
      alert('Conta origem e destino não podem ser iguais.');
      return;
    }
    var modo = recModo.value;
    var body = {
      descricao: document.getElementById('tDescricao').value.trim(),
      valor: valor,
      data_vencimento: document.getElementById('tData').value || null,
      efetivado: efetivado,
      recorrencia_modo: modo,
      conta_origem_id: parseInt(origem),
      conta_destino_id: parseInt(destino),
    };
    if (modo === 'parcela') {
      body.parcelas_total = parcelasTotal;
      body.parcela_inicial = parcelaInicial;
      body.periodicidade = document.getElementById('tPeriodicidade').value;
      body.calculo_tipo = document.getElementById('tCalculoTipo').value;
    } else if (modo === 'fixa') {
      body.periodicidade = document.getElementById('tPeriodicidadeFixa').value;
    }
    var btn = this;
    btn.disabled = true;
    try {
      var r = await fetch('/api/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) { resetForm(); }
    } catch (e) {}
    finally { btn.disabled = false; }
  });

  loadContas();
})();
