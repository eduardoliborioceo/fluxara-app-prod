(function () {
  var MESES = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

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
    bet365:      { cor: '#116B14', letra: 'B', corLetra: '#fff' },
    riachuelo:   { cor: '#C41E3A', letra: 'R', corLetra: '#fff' },
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

  var now = new Date();
  var year  = now.getFullYear();
  var month = now.getMonth();

  function updateMesLabel() {
    document.getElementById('mesLabel').textContent = MESES[month] + ' ' + year;
  }

  function isFuturoMes() {
    return year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
  }

  document.getElementById('btnMesAnterior').addEventListener('click', function () {
    month--;
    if (month < 0) { month = 11; year--; }
    updateMesLabel();
    loadVisaoGeral();
    loadContas();
    loadCartoes();
    loadDespesasPorConta();
    loadDespesasPorCategoria();
  });

  document.getElementById('btnMesPosterior').addEventListener('click', function () {
    month++;
    if (month > 11) { month = 0; year++; }
    updateMesLabel();
    loadVisaoGeral();
    loadContas();
    loadCartoes();
    loadDespesasPorConta();
    loadDespesasPorCategoria();
  });

  updateMesLabel();

  var fabBtn  = document.getElementById('fabBtn');
  var fabMenu = document.getElementById('fabMenu');

  fabBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var isOpen = fabMenu.classList.contains('open');
    fabMenu.classList.toggle('open', !isOpen);
    fabBtn.classList.toggle('open', !isOpen);
  });

  document.addEventListener('click', function () {
    fabMenu.classList.remove('open');
    fabBtn.classList.remove('open');
  });

  fabMenu.addEventListener('click', function (e) { e.stopPropagation(); });

  function formatMoney(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function buildLogoHtml(inst, size) {
    size = size || 42;
    if (inst && inst.svg) {
      return '<div class="conta-logo" style="background:#f8fafc;width:' + size + 'px;height:' + size + 'px">'
        + '<img src="/static/images/bank-icons-logos-svg/' + esc(inst.svg) + '" alt="" style="width:65%;height:65%;object-fit:contain"></div>';
    }
    var bg = (inst && inst.cor) || '#64748b';
    var fg = (inst && inst.corLetra) || '#fff';
    var iconSize = Math.round(size * 0.5) + 'px';
    if (inst && inst.icone) {
      return '<div class="conta-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px">'
        + '<i class="bi ' + inst.icone + '" style="font-size:' + iconSize + '"></i></div>';
    }
    var letra = (inst && inst.letra) || '?';
    return '<div class="conta-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px">' + letra + '</div>';
  }

  function buildBandeiraLogo(b, size) {
    size = size || 42;
    if (b && b.svg) {
      return '<div class="cartao-bandeira" style="background:#f8fafc;width:' + size + 'px;height:' + size + 'px;border-radius:10px">'
        + '<img src="/static/images/bank-icons-logos-svg/' + esc(b.svg) + '" alt="" style="width:65%;height:65%;object-fit:contain"></div>';
    }
    var bg = (b && b.cor) || '#6c757d';
    var fg = (b && b.corLetra) || '#fff';
    var nome = (b && b.nome) || 'Cartão';
    return '<div class="cartao-bandeira" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px;font-size:.6rem;font-weight:700">' + esc(nome) + '</div>';
  }

  async function loadContas() {
    try {
      var mes = month + 1;
      var url = '/api/contas';
      if (isFuturoMes()) url += '?mes=' + mes + '&ano=' + year;
      var r = await fetch(url);
      var data = await r.json();
      var contasCache = Array.isArray(data) ? data : [];
      var body = document.getElementById('contasBody');
      var totalEl = document.getElementById('totalContas');
      if (!contasCache.length) {
        body.innerHTML = '<div class="text-center py-3 text-muted small">'
          + '<i class="bi bi-wallet2 d-block mb-1" style="font-size:1.8rem;opacity:.3"></i>'
          + 'Nenhuma conta cadastrada</div>';
        totalEl.textContent = 'R$ 0,00';
        return;
      }
      var total = 0;
      var mes = month + 1;
      var isFuturo = isFuturoMes();
      body.innerHTML = contasCache.map(function (c) {
        var saldoAtual = parseFloat(c.saldo_atual != null ? c.saldo_atual : c.saldo_inicial) || 0;
        var saldoPrevisto = parseFloat(c.saldo_previsto != null ? c.saldo_previsto : saldoAtual);
        total += saldoAtual;
        var inst = INSTITUICOES[c.instituicao] || INSTITUICOES.outro;
        var logoHtml = buildLogoHtml(inst, 42);
        var saldoClass = saldoAtual < 0 ? 'color:#dc3545' : '';
        var previstoDiff = !isFuturo && Math.abs(saldoPrevisto - saldoAtual) > 0.01;
        var saldoLabel = isFuturo ? '<div class="conta-saldo-previsto" style="color:#0d6efd">Projeção</div>' : '';
        var saldoPrevEl = previstoDiff
          ? '<div class="conta-saldo-previsto">Previsto: ' + formatMoney(saldoPrevisto) + '</div>'
          : saldoLabel;
        var finalidadeTag = c.finalidade
          ? '<span class="conta-finalidade-tag">' + esc(c.finalidade) + '</span>'
          : '';
        return '<div class="conta-item" data-id="' + c.id + '" data-mes="' + mes + '" data-ano="' + year + '">'
          + logoHtml
          + '<div class="conta-info">'
          +   '<div class="conta-nome">' + esc(c.nome) + finalidadeTag + '</div>'
          +   '<div class="conta-previsto">' + esc(c.tipo_nome || 'Conta') + '</div>'
          + '</div>'
          + '<div>'
          +   '<div class="conta-saldo" style="' + saldoClass + '">' + formatMoney(saldoAtual) + '</div>'
          +   saldoPrevEl
          + '</div>'
          + '</div>';
      }).join('');
      totalEl.textContent = formatMoney(total);
      body.querySelectorAll('.conta-item').forEach(function (el) {
        el.addEventListener('click', function () {
          var id = this.dataset.id;
          var m  = this.dataset.mes;
          var a  = this.dataset.ano;
          window.location.href = '/conta/' + id + '/extrato?mes=' + m + '&ano=' + a;
        });
      });
    } catch (e) {
      document.getElementById('contasBody').innerHTML =
        '<div class="text-center py-2 text-muted small">Erro ao carregar contas.</div>';
    }
  }

  async function loadCartoes() {
    try {
      var mes = month + 1;
      var r = await fetch('/api/cartoes?mes=' + mes + '&ano=' + year);
      var data = await r.json();
      var body = document.getElementById('cartoesBody');
      var totalEl = document.getElementById('totalCartoes');
      if (!Array.isArray(data) || !data.length) {
        body.innerHTML = '<div class="text-center py-3 text-muted small">'
          + '<i class="bi bi-credit-card d-block mb-1" style="font-size:1.8rem;opacity:.3"></i>'
          + 'Nenhum cartão cadastrado</div>';
        totalEl.textContent = 'R$ 0,00';
        return;
      }
      var totalDisp = 0;
      var faturaLabel = isFuturoMes() ? 'Fatura prevista' : 'Fatura aberta';
      var cardsHtml = data.map(function (c) {
        var limDisp = parseFloat(c.limite_disponivel != null ? c.limite_disponivel : c.limite) || 0;
        var fatAtual = parseFloat(c.fatura_atual || 0);
        if (limDisp > 0) totalDisp += limDisp;
        var b = BANDEIRAS[c.bandeira] || BANDEIRAS.outro;
        var bandeiraHtml = buildBandeiraLogo(b, 30);
        var contaInst = c.conta_instituicao ? c.conta_instituicao.toLowerCase() : null;
        var contaBanco = contaInst && INSTITUICOES[contaInst] ? INSTITUICOES[contaInst] : (contaInst ? INSTITUICOES.outro : null);
        var contaLogoHtml = contaBanco ? buildLogoHtml(contaBanco, 30) : '';
        var fechaInfo = 'Fecha dia ' + c.dia_fechamento + ' · Vence dia ' + c.dia_vencimento;
        return '<div class="cartao-card" data-id="' + c.id + '" data-mes="' + mes + '" data-ano="' + year + '">'
          + '<div class="cartao-card-header">'
          +   '<div class="cartao-logos">'
          +     (contaLogoHtml ? contaLogoHtml : '')
          +     bandeiraHtml
          +   '</div>'
          +   '<div class="cartao-card-nome">' + esc(c.nome) + '</div>'
          +   '<i class="bi bi-chevron-right cartao-card-chevron"></i>'
          + '</div>'
          + '<div class="cartao-card-fatura-label">' + faturaLabel + '</div>'
          + '<div class="cartao-card-fatura-valor">' + formatMoney(fatAtual) + '</div>'
          + '<div class="cartao-card-fecha">' + esc(fechaInfo) + '</div>'
          + '<div class="cartao-card-divider"></div>'
          + '<div class="cartao-card-limite-row">'
          +   '<span class="cartao-card-limite-label">Limite disponível</span>'
          +   '<span class="cartao-card-limite-valor">' + formatMoney(limDisp) + '</span>'
          + '</div>'
          + '</div>';
      }).join('');
      totalEl.textContent = formatMoney(totalDisp);

      if (data.length === 1) {
        body.innerHTML = cardsHtml;
        body.querySelector('.cartao-card').addEventListener('click', function () {
          window.location.href = '/cartao/' + this.dataset.id + '/extrato?mes=' + this.dataset.mes + '&ano=' + this.dataset.ano;
        });
        return;
      }

      var useDots = data.length <= 7;
      var indicatorHtml = useDots
        ? '<div class="cartoes-dots" id="cartoesDots">'
            + data.map(function (_, i) { return '<span class="cartoes-dot' + (i === 0 ? ' active' : '') + '"></span>'; }).join('')
            + '</div>'
        : '<span class="cartoes-counter" id="cartoesCounter">1 / ' + data.length + '</span>';

      body.innerHTML = '<div class="cartoes-carousel-wrapper">'
        + '<div class="cartoes-slides" id="cartoesSlidesInner">' + cardsHtml + '</div>'
        + '</div>'
        + '<div class="cartoes-carousel-nav">'
        + '<button type="button" class="cartoes-nav-btn" id="cartoesPrev" disabled><i class="bi bi-chevron-left"></i></button>'
        + indicatorHtml
        + '<button type="button" class="cartoes-nav-btn" id="cartoesNext"><i class="bi bi-chevron-right"></i></button>'
        + '</div>';

      var slides = document.getElementById('cartoesSlidesInner');
      var prevBtn = document.getElementById('cartoesPrev');
      var nextBtn = document.getElementById('cartoesNext');
      var total = data.length;
      var current = 0;
      var isSwiping = false;

      function goTo(idx) {
        current = idx;
        slides.style.transform = 'translateX(-' + (100 * current) + '%)';
        prevBtn.disabled = current === 0;
        nextBtn.disabled = current === total - 1;
        if (useDots) {
          document.querySelectorAll('#cartoesDots .cartoes-dot').forEach(function (d, i) {
            d.classList.toggle('active', i === current);
          });
        } else {
          document.getElementById('cartoesCounter').textContent = (current + 1) + ' / ' + total;
        }
      }

      function navPrev() { if (current > 0) goTo(current - 1); }
      function navNext() { if (current < total - 1) goTo(current + 1); }

      prevBtn.addEventListener('touchend', function (e) { e.preventDefault(); navPrev(); }, { passive: false });
      prevBtn.addEventListener('click', navPrev);
      nextBtn.addEventListener('touchend', function (e) { e.preventDefault(); navNext(); }, { passive: false });
      nextBtn.addEventListener('click', navNext);

      if (useDots) {
        document.querySelectorAll('#cartoesDots .cartoes-dot').forEach(function (d, i) {
          d.addEventListener('click', function () { goTo(i); });
        });
      }

      var touchStartX = 0;
      slides.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        isSwiping = false;
      }, { passive: true });
      slides.addEventListener('touchmove', function (e) {
        if (Math.abs(e.touches[0].clientX - touchStartX) > 8) isSwiping = true;
      }, { passive: true });
      slides.addEventListener('touchend', function (e) {
        var diff = touchStartX - e.changedTouches[0].clientX;
        if (isSwiping && Math.abs(diff) > 40) {
          if (diff > 0 && current < total - 1) goTo(current + 1);
          else if (diff < 0 && current > 0) goTo(current - 1);
        }
      });

      body.querySelectorAll('.cartao-card').forEach(function (el) {
        el.addEventListener('click', function () {
          if (isSwiping) return;
          window.location.href = '/cartao/' + this.dataset.id + '/extrato?mes=' + this.dataset.mes + '&ano=' + this.dataset.ano;
        });
      });

      goTo(0);
    } catch (e) {
      document.getElementById('cartoesBody').innerHTML =
        '<div class="text-center py-2 text-muted small">Erro ao carregar cartões.</div>';
    }
  }

  async function loadVisaoGeral() {
    try {
      var mes = month + 1;
      var r = await fetch('/api/resumo/visao-geral?mes=' + mes + '&ano=' + year);
      var data = await r.json();
      var receitas = parseFloat(data.receitas || 0);
      var despesas = parseFloat(data.despesas_conta || 0) + parseFloat(data.despesas_cartao || 0);
      var resultado = receitas - despesas;
      document.getElementById('totalReceitas').textContent = formatMoney(receitas);
      document.getElementById('totalDespesas').textContent = formatMoney(despesas);
      var resEl = document.getElementById('totalResultado');
      resEl.textContent = formatMoney(resultado);
      resEl.style.color = resultado >= 0 ? '#0d6efd' : '#dc3545';
    } catch (e) {}
  }

  var MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  function parseProjecaoDate(str) {
    return new Date(String(str).substring(0, 10) + 'T12:00:00');
  }

  async function loadProjecao() {
    var body = document.getElementById('projecaoBody');
    try {
      var r = await fetch('/api/resumo/projecao-saldo');
      var data = await r.json();
      var saldoAtual = parseFloat(data.saldo_atual || 0);
      var eventos = Array.isArray(data.eventos) ? data.eventos : [];

      if (!eventos.length) {
        body.innerHTML = '<div class="projecao-vazio">'
          + '<i class="bi bi-calendar-check d-block mb-1" style="font-size:1.6rem;opacity:.3"></i>'
          + 'Sem lançamentos pendentes nos próximos 60 dias</div>';
        var hj = document.getElementById('projecaoHoje');
        if (hj) hj.textContent = formatMoney(saldoAtual);
        return;
      }

      var hj = document.getElementById('projecaoHoje');
      if (hj) hj.textContent = formatMoney(saldoAtual);

      var grupos = {};
      eventos.forEach(function (ev) {
        var d = ev.data;
        if (!grupos[d]) grupos[d] = [];
        grupos[d].push(ev);
      });

      var html = '';
      var currentMesSep = null;
      Object.keys(grupos).sort().forEach(function (dataStr) {
        var evs = grupos[dataStr];
        var dt = parseProjecaoDate(dataStr);
        var mesSepKey = dt.getFullYear() * 100 + dt.getMonth();
        if (mesSepKey !== currentMesSep) {
          currentMesSep = mesSepKey;
          html += '<div class="projecao-mes-sep">==== ' + MESES[dt.getMonth()] + ' ' + dt.getFullYear() + ' ====</div>';
        }
        var label = dt.getDate() + ' ' + MESES_ABREV[dt.getMonth()] + ' ' + dt.getFullYear();
        var saldoDia = parseFloat(evs[evs.length - 1].saldo_acumulado);
        var temReceita = evs.some(function (e) { return e.tipo === 'receita'; });
        var temDespesa = evs.some(function (e) { return e.tipo === 'despesa'; });
        var dotClass = (temReceita && temDespesa) ? 'misto' : (temReceita ? 'receita' : 'despesa');
        var saldoClass = saldoDia >= 0 ? 'projecao-dia-saldo--pos' : 'projecao-dia-saldo--neg';

        html += '<div class="projecao-dia">'
          + '<div class="projecao-dia-linha">'
          +   '<div class="projecao-dia-dot projecao-dia-dot--' + dotClass + '"></div>'
          +   '<div class="projecao-dia-vert"></div>'
          + '</div>'
          + '<div class="projecao-dia-conteudo">'
          +   '<div class="projecao-dia-header">'
          +     '<span class="projecao-dia-data">' + esc(label) + '</span>'
          +     '<span class="projecao-dia-saldo ' + saldoClass + '">' + formatMoney(saldoDia) + '</span>'
          +   '</div>';

        evs.forEach(function (ev) {
          var prefix = ev.tipo === 'receita' ? '+ ' : '− ';
          html += '<div class="projecao-tx">'
            + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">'
            + esc(ev.descricao || 'Sem descrição') + '</span>'
            + '<span class="projecao-tx-valor projecao-tx-valor--' + ev.tipo + '">'
            + prefix + formatMoney(ev.valor) + '</span>'
            + '</div>';
        });

        html += '</div></div>';
      });

      body.innerHTML = '<div class="projecao-timeline">' + html + '</div>';
    } catch (e) {
      body.innerHTML = '<div class="projecao-vazio">Erro ao carregar projeção.</div>';
    }
  }

  var CARDS_ORDER_KEY      = 'fluxara_cards_order';
  var CARD_VISIBILITY_KEY  = 'fluxara_cards_visibility';

  function loadVisibility() {
    try { return JSON.parse(localStorage.getItem(CARD_VISIBILITY_KEY)) || {}; } catch (e) { return {}; }
  }

  function applyCardVisibility() {
    var vis = loadVisibility();
    document.querySelectorAll('#cardsContainer [data-card-id]').forEach(function (el) {
      el.classList.toggle('card-hidden', vis[el.dataset.cardId] === false);
    });
  }

  function applyCardOrder() {
    var container = document.getElementById('cardsContainer');
    if (!container) return;
    var saved = localStorage.getItem(CARDS_ORDER_KEY);
    if (!saved) return;
    try {
      var order = JSON.parse(saved);
      order.forEach(function (id) {
        var el = container.querySelector('[data-card-id="' + id + '"]');
        if (el) container.appendChild(el);
      });
    } catch (e) {}
  }

  function initDragDrop() {
    var container = document.getElementById('cardsContainer');
    if (!container) return;
    var dragSrc = null;

    function saveOrder() {
      var order = Array.from(container.querySelectorAll('[data-card-id]')).map(function (el) {
        return el.dataset.cardId;
      });
      localStorage.setItem(CARDS_ORDER_KEY, JSON.stringify(order));
    }

    function clearDropIndicators() {
      container.querySelectorAll('[data-card-id]').forEach(function (c) {
        c.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    }

    container.querySelectorAll('[data-card-id]').forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        dragSrc = this;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(function () { dragSrc && dragSrc.classList.add('drag-dragging'); }, 0);
      });

      card.addEventListener('dragend', function () {
        this.classList.remove('drag-dragging');
        clearDropIndicators();
        saveOrder();
        dragSrc = null;
      });

      card.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (!dragSrc || dragSrc === this) return;
        clearDropIndicators();
        var rect = this.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          this.classList.add('drag-over-top');
        } else {
          this.classList.add('drag-over-bottom');
        }
      });

      card.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!dragSrc || dragSrc === this) return;
        var rect = this.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          container.insertBefore(dragSrc, this);
        } else {
          container.insertBefore(dragSrc, this.nextSibling);
        }
      });
    });

    var touchSrc = null;
    var touchClone = null;
    var touchOffX = 0;
    var touchOffY = 0;

    container.querySelectorAll('.card-drag-handle').forEach(function (handle) {
      handle.addEventListener('touchstart', function (e) {
        touchSrc = this.closest('[data-card-id]');
        var touch = e.touches[0];
        var rect = touchSrc.getBoundingClientRect();
        touchOffX = touch.clientX - rect.left;
        touchOffY = touch.clientY - rect.top;
        touchClone = touchSrc.cloneNode(true);
        touchClone.style.cssText = 'position:fixed;z-index:9999;width:' + rect.width + 'px;opacity:.75;pointer-events:none;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.2);';
        touchClone.style.left = (touch.clientX - touchOffX) + 'px';
        touchClone.style.top  = (touch.clientY - touchOffY) + 'px';
        document.body.appendChild(touchClone);
        touchSrc.style.opacity = '0.35';
      }, { passive: true });
    });

    document.addEventListener('touchmove', function (e) {
      if (!touchSrc || !touchClone) return;
      var touch = e.touches[0];
      touchClone.style.left = (touch.clientX - touchOffX) + 'px';
      touchClone.style.top  = (touch.clientY - touchOffY) + 'px';
      touchClone.style.display = 'none';
      var el = document.elementFromPoint(touch.clientX, touch.clientY);
      touchClone.style.display = '';
      var target = el && el.closest('[data-card-id]');
      clearDropIndicators();
      if (target && target !== touchSrc) {
        var rect = target.getBoundingClientRect();
        if (touch.clientY < rect.top + rect.height / 2) {
          target.classList.add('drag-over-top');
        } else {
          target.classList.add('drag-over-bottom');
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', function () {
      if (!touchSrc) return;
      if (touchClone) { document.body.removeChild(touchClone); touchClone = null; }
      touchSrc.style.opacity = '';
      container.querySelectorAll('[data-card-id]').forEach(function (c) {
        if (c !== touchSrc) {
          if (c.classList.contains('drag-over-top')) {
            container.insertBefore(touchSrc, c);
          } else if (c.classList.contains('drag-over-bottom')) {
            container.insertBefore(touchSrc, c.nextSibling);
          }
        }
      });
      clearDropIndicators();
      saveOrder();
      touchSrc = null;
    });
  }

  async function loadDebitos() {
    var body    = document.getElementById('debitosBody');
    var totalEl = document.getElementById('totalDebitos');
    if (!body) return;
    try {
      var r = await fetch('/api/resumo/debitos-vencidos');
      var data = await r.json();
      if (!Array.isArray(data) || !data.length) {
        body.innerHTML = '<div class="text-center py-3 text-muted small">'
          + '<i class="bi bi-check-circle d-block mb-1" style="font-size:1.8rem;opacity:.3;color:#198754"></i>'
          + 'Nenhum débito vencido</div>';
        if (totalEl) totalEl.textContent = 'R$ 0,00';
        return;
      }
      var total = data.reduce(function(acc, d) { return acc + d.valor; }, 0);
      if (totalEl) totalEl.textContent = formatMoney(total);
      var html = data.map(function(d) {
        var atraso = d.dias_atraso > 0
          ? '<span class="debito-atraso">' + d.dias_atraso + 'd atraso</span>'
          : '<span class="debito-atraso debito-atraso--hoje">hoje</span>';
        var dataFmt = d.data_vencimento
          ? (function(s) { var p = s.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; })(d.data_vencimento)
          : '';
        return '<div class="debito-item">'
          + '<div class="debito-desc">' + esc(d.descricao || 'Sem descrição') + '</div>'
          + '<div class="debito-meta">'
          +   '<span class="debito-conta">' + esc(d.conta_nome) + '</span>'
          +   '<span class="debito-data">' + dataFmt + '</span>'
          +   atraso
          + '</div>'
          + '<div class="debito-valor">' + formatMoney(d.valor) + '</div>'
          + '</div>';
      }).join('');
      body.innerHTML = html;
    } catch (e) {
      body.innerHTML = '<div class="text-center py-2 text-muted small">Erro ao carregar débitos.</div>';
    }
  }

  async function loadDespesasPorConta() {
    var body  = document.getElementById('despesasContaBody');
    var total = document.getElementById('totalDespesasConta');
    try {
      var mes = month + 1;
      var r = await fetch('/api/resumo/despesas-por-conta?mes=' + mes + '&ano=' + year);
      var data = await r.json();
      if (!Array.isArray(data) || !data.length) {
        body.innerHTML = '<div class="text-center py-3 text-muted small">'
          + '<i class="bi bi-pie-chart d-block mb-1" style="font-size:1.8rem;opacity:.3"></i>'
          + 'Nenhuma despesa neste mês</div>';
        total.textContent = 'R$ 0,00';
        return;
      }
      var grand = data.reduce(function (s, c) { return s + parseFloat(c.total_despesas || 0); }, 0);
      total.textContent = formatMoney(grand);
      body.innerHTML = data.map(function (c) {
        var val  = parseFloat(c.total_despesas || 0);
        var pct  = grand > 0 ? Math.round((val / grand) * 100) : 0;
        var inst = INSTITUICOES[c.instituicao] || INSTITUICOES.outro;
        var logoHtml = buildLogoHtml(inst, 36);
        return '<div class="desp-conta-row">'
          + logoHtml
          + '<div class="desp-conta-info">'
          +   '<div class="desp-conta-nome">' + esc(c.nome) + '</div>'
          +   '<div class="desp-conta-bar-wrap">'
          +     '<div class="desp-conta-bar" style="width:' + pct + '%"></div>'
          +   '</div>'
          + '</div>'
          + '<div class="desp-conta-right">'
          +   '<div class="desp-conta-valor">' + formatMoney(val) + '</div>'
          +   '<div class="desp-conta-pct">' + pct + '%</div>'
          + '</div>'
          + '</div>';
      }).join('');
    } catch (e) {
      body.innerHTML = '<div class="text-center py-2 text-muted small">Erro ao carregar.</div>';
    }
  }

  async function loadDespesasPorCategoria() {
    var body    = document.getElementById('despesasCatBody');
    var totalEl = document.getElementById('totalDespesasCat');
    try {
      var mes = month + 1;
      var r   = await fetch('/api/resumo/despesas-por-categoria?mes=' + mes + '&ano=' + year);
      var data = await r.json();
      if (!Array.isArray(data) || !data.length) {
        body.innerHTML = '<div class="text-center py-3 text-muted small">'
          + '<i class="bi bi-tags d-block mb-1" style="font-size:1.8rem;opacity:.3"></i>'
          + 'Nenhuma despesa neste mês</div>';
        totalEl.textContent = 'R$ 0,00';
        return;
      }

      var grand = data.reduce(function (s, c) { return s + parseFloat(c.total || 0); }, 0);
      totalEl.textContent = formatMoney(grand);

      var COLORS = ['#0d6efd','#dc3545','#fd7e14','#198754','#6f42c1','#20c997','#e83e8c','#ffc107'];
      var top5 = data.slice(0, 5);
      var rest = data.slice(5);

      var conicStops = [];
      var acc = 0;
      data.forEach(function (c, i) {
        var pct   = grand > 0 ? parseFloat(c.total || 0) / grand * 100 : 0;
        var color = COLORS[i % COLORS.length];
        conicStops.push(color + ' ' + acc.toFixed(2) + '% ' + (acc + pct).toFixed(2) + '%');
        acc += pct;
      });
      var gradient = 'conic-gradient(' + conicStops.join(', ') + ')';

      function buildRow(c, i) {
        var val   = parseFloat(c.total || 0);
        var pct   = grand > 0 ? Math.round(val / grand * 100) : 0;
        var color = COLORS[i % COLORS.length];
        return '<div class="desp-cat-row">'
          + '<span class="desp-cat-dot" style="background:' + color + '"></span>'
          + '<div class="desp-cat-info">'
          +   '<div class="desp-cat-nome">' + esc(c.categoria_nome) + '</div>'
          +   '<div class="desp-cat-bar-wrap"><div class="desp-cat-bar" style="width:' + pct + '%;background:' + color + '"></div></div>'
          + '</div>'
          + '<div class="desp-cat-right">'
          +   '<div class="desp-cat-valor">' + formatMoney(val) + '</div>'
          +   '<div class="desp-cat-pct">' + pct + '%</div>'
          + '</div>'
          + '</div>';
      }

      var top5Html = top5.map(buildRow).join('');
      var restHtml = rest.map(function (c, i) { return buildRow(c, i + 5); }).join('');
      var moreLabel = rest.length + ' ' + (rest.length === 1 ? 'categoria' : 'categorias');

      body.innerHTML = '<div class="desp-cat-layout">'
        + '<div class="desp-cat-chart-wrap"><div class="desp-cat-pie" style="background:' + gradient + '"></div></div>'
        + '<div class="desp-cat-list">' + top5Html + '</div>'
        + '</div>'
        + (rest.length
            ? '<div class="desp-cat-extras" id="despCatExtras">' + restHtml + '</div>'
              + '<button type="button" class="desp-cat-expand-btn" id="despCatExpandBtn">'
              + 'Ver mais ' + moreLabel + ' <i class="bi bi-chevron-down"></i></button>'
            : '');

      if (rest.length) {
        var btn     = document.getElementById('despCatExpandBtn');
        var extras  = document.getElementById('despCatExtras');
        var expanded = false;
        btn.addEventListener('click', function () {
          expanded = !expanded;
          extras.style.display = expanded ? 'block' : 'none';
          btn.innerHTML = expanded
            ? 'Recolher <i class="bi bi-chevron-up"></i>'
            : 'Ver mais ' + moreLabel + ' <i class="bi bi-chevron-down"></i>';
        });
      }
    } catch (e) {
      body.innerHTML = '<div class="text-center py-2 text-muted small">Erro ao carregar.</div>';
    }
  }

  // ── Ocultar / mostrar valores ───────────────────────────────────────────────
  var VALORES_HIDDEN_KEY = 'fluxara_valores_ocultos';
  var cardsContainer = document.getElementById('cardsContainer');
  var btnToggle      = document.getElementById('btnToggleValores');
  var iconToggle     = document.getElementById('iconToggleValores');

  function setValoresOcultos(hidden) {
    cardsContainer.classList.toggle('valores-ocultos', hidden);
    iconToggle.className = hidden ? 'bi bi-eye-slash' : 'bi bi-eye';
    btnToggle.title      = hidden ? 'Mostrar valores' : 'Ocultar valores';
    localStorage.setItem(VALORES_HIDDEN_KEY, hidden ? '1' : '0');
  }

  if (localStorage.getItem(VALORES_HIDDEN_KEY) === '1') setValoresOcultos(true);

  btnToggle.addEventListener('click', function () {
    setValoresOcultos(!cardsContainer.classList.contains('valores-ocultos'));
  });

  // ── Card Débitos ─────────────────────────────────────────────────────────────
  async function loadDebitos() {
    var body    = document.getElementById('debitosBody');
    var totalEl = document.getElementById('totalDebitos');
    if (!body) return;
    try {
      var r    = await fetch('/api/resumo/debitos');
      var data = await r.json();

      if (totalEl) totalEl.textContent = formatMoney(data.total_pendente || 0);

      var vencidos = data.vencidos || [];

      if (!vencidos.length) {
        body.innerHTML = '<div class="debito-vazio">'
          + '<i class="bi bi-check-circle text-success" style="font-size:1.8rem;opacity:.6;display:block;margin-bottom:8px"></i>'
          + '<span>Nenhum débito vencido</span>'
          + '</div>';
        if (totalEl) totalEl.textContent = formatMoney(0);
        return;
      }

      var totalVencidos = vencidos.reduce(function(s, it) { return s + parseFloat(it.valor || 0); }, 0);
      if (totalEl) totalEl.textContent = formatMoney(totalVencidos);

      var rows = vencidos.map(function (it) {
        var dt = it.vencimento
          ? new Date(it.vencimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : '—';
        var diasAtraso = it.dias_atraso ? ' <span class="debito-row-atraso">+' + it.dias_atraso + 'd</span>' : '';
        return '<div class="debito-row">'
          + '<div class="debito-row-info">'
          +   '<span class="debito-row-desc">' + esc(it.descricao) + '</span>'
          +   '<span class="debito-row-cat">' + esc(it.categoria) + '</span>'
          + '</div>'
          + '<div class="debito-row-right">'
          +   '<span class="debito-row-valor">' + formatMoney(it.valor) + '</span>'
          +   '<span class="debito-row-data">' + dt + diasAtraso + '</span>'
          + '</div>'
          + '</div>';
      }).join('');

      body.innerHTML = rows;

    } catch (e) {
      body.innerHTML = '<div class="text-center py-2 text-muted small">Erro ao carregar débitos.</div>';
    }
  }

  // ── Gerenciar tela inicial ───────────────────────────────────────────────────
  var CARD_META = {
    'diretriz':       { nome: 'Regra dos 10%',          icone: 'bi-piggy-bank-fill', cor: '#16a34a' },
    'contas':         { nome: 'Contas',                 icone: 'bi-wallet2',         cor: '#0d6efd' },
    'visao':          { nome: 'Visão Geral',             icone: 'bi-bar-chart-line',  cor: '#0d6efd' },
    'cartoes':        { nome: 'Cartões de Crédito',      icone: 'bi-credit-card',     cor: '#0d6efd' },
    'projecao':       { nome: 'Projeção de Saldo',       icone: 'bi-graph-up-arrow',  cor: '#0d6efd' },
    'despesas-conta': { nome: 'Despesas por Conta',      icone: 'bi-pie-chart',       cor: '#dc3545' },
    'despesas-cat':   { nome: 'Despesas por Categoria',  icone: 'bi-tags',            cor: '#f59e0b' },
    'debitos':        { nome: 'Débitos Vencidos',        icone: 'bi-exclamation-circle', cor: '#dc3545' },
    'assistente':     { nome: 'Assistente Flux',         icone: 'bi-stars',           cor: '#6366f1' },
  };

  function initGerenciar() {
    var overlay  = document.getElementById('gerenciarOverlay');
    var sheet    = document.getElementById('gerenciarSheet');
    var list     = document.getElementById('gerenciarList');
    var saveBtn  = document.getElementById('gerenciarSave');
    var openBtn  = document.getElementById('abrirGerenciar');
    var closeBtn = document.getElementById('gerenciarClose');
    if (!overlay || !list || !saveBtn || !openBtn) return;

    var gerDragSrc   = null;
    var gerTouchItem = null;
    var gerTouchClone = null;
    var gerTouchOffY  = 0;

    function clearGerOver() {
      list.querySelectorAll('.gerenciar-item').forEach(function (i) {
        i.classList.remove('ger-over-top', 'ger-over-bottom');
      });
    }

    function buildList(order) {
      var vis = loadVisibility();
      list.innerHTML = '';
      order.forEach(function (id) {
        var meta = CARD_META[id];
        if (!meta) return;
        var visible = vis[id] !== false;
        var item = document.createElement('div');
        item.className      = 'gerenciar-item' + (visible ? '' : ' gerenciar-item--hidden');
        item.dataset.cardId = id;
        item.dataset.visible = visible ? '1' : '0';
        item.draggable      = true;
        item.innerHTML = '<div class="gerenciar-item-left">'
          + '<div class="gerenciar-item-icon" style="color:' + meta.cor + '"><i class="bi ' + meta.icone + '"></i></div>'
          + '<span class="gerenciar-item-nome">' + meta.nome + '</span>'
          + '</div>'
          + '<div class="gerenciar-item-actions">'
          + '<button type="button" class="gerenciar-vis-btn" title="' + (visible ? 'Ocultar' : 'Mostrar') + '">'
          + '<i class="bi ' + (visible ? 'bi-eye' : 'bi-eye-slash') + '"></i>'
          + '</button>'
          + '<i class="bi bi-grip-vertical gerenciar-item-handle"></i>'
          + '</div>';
        list.appendChild(item);
      });

      list.querySelectorAll('.gerenciar-vis-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var item = btn.closest('[data-card-id]');
          var nowVisible = item.dataset.visible !== '0';
          var next = !nowVisible;
          item.dataset.visible = next ? '1' : '0';
          item.classList.toggle('gerenciar-item--hidden', !next);
          btn.title = next ? 'Ocultar' : 'Mostrar';
          btn.querySelector('i').className = 'bi ' + (next ? 'bi-eye' : 'bi-eye-slash');
        });
      });
    }

    function getCurrentOrder() {
      return Array.from(cardsContainer.querySelectorAll('[data-card-id]')).map(function (el) {
        return el.dataset.cardId;
      });
    }

    // Desktop drag (delegated to list element)
    list.addEventListener('dragstart', function (e) {
      var item = e.target.closest('.gerenciar-item');
      if (!item) return;
      gerDragSrc = item;
      setTimeout(function () { gerDragSrc && (gerDragSrc.style.opacity = '0.4'); }, 0);
    });
    list.addEventListener('dragend', function () {
      if (gerDragSrc) gerDragSrc.style.opacity = '';
      clearGerOver();
      gerDragSrc = null;
    });
    list.addEventListener('dragover', function (e) {
      e.preventDefault();
      var item = e.target.closest('.gerenciar-item');
      if (!item || !gerDragSrc || item === gerDragSrc) return;
      clearGerOver();
      var rect = item.getBoundingClientRect();
      item.classList.add(e.clientY < rect.top + rect.height / 2 ? 'ger-over-top' : 'ger-over-bottom');
    });
    list.addEventListener('drop', function (e) {
      e.preventDefault();
      var item = e.target.closest('.gerenciar-item');
      if (!item || !gerDragSrc || item === gerDragSrc) return;
      var rect = item.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) list.insertBefore(gerDragSrc, item);
      else list.insertBefore(gerDragSrc, item.nextSibling);
      clearGerOver();
    });

    // Touch drag (non-passive to allow preventDefault on scroll)
    list.addEventListener('touchstart', function (e) {
      var handle = e.target.closest('.gerenciar-item-handle');
      if (!handle) return;
      gerTouchItem = handle.closest('.gerenciar-item');
      var touch = e.touches[0];
      var rect  = gerTouchItem.getBoundingClientRect();
      gerTouchOffY  = touch.clientY - rect.top;
      gerTouchClone = gerTouchItem.cloneNode(true);
      gerTouchClone.style.cssText = 'position:fixed;z-index:9999;left:' + rect.left + 'px;width:'
        + rect.width + 'px;top:' + (touch.clientY - gerTouchOffY)
        + 'px;opacity:.85;pointer-events:none;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);background:var(--card,#fff);';
      document.body.appendChild(gerTouchClone);
      gerTouchItem.style.opacity = '0.3';
    }, { passive: true });

    list.addEventListener('touchmove', function (e) {
      if (!gerTouchItem) return;
      e.preventDefault();
      var touch  = e.touches[0];
      gerTouchClone.style.top = (touch.clientY - gerTouchOffY) + 'px';
      gerTouchClone.style.display = 'none';
      var el = document.elementFromPoint(touch.clientX, touch.clientY);
      gerTouchClone.style.display = '';
      var target = el && el.closest('.gerenciar-item');
      clearGerOver();
      if (target && target !== gerTouchItem) {
        var rect = target.getBoundingClientRect();
        target.classList.add(touch.clientY < rect.top + rect.height / 2 ? 'ger-over-top' : 'ger-over-bottom');
      }
    }, { passive: false });

    list.addEventListener('touchend', function () {
      if (!gerTouchItem) return;
      if (gerTouchClone) { gerTouchClone.parentNode.removeChild(gerTouchClone); gerTouchClone = null; }
      gerTouchItem.style.opacity = '';
      var overTop = list.querySelector('.ger-over-top');
      var overBot = list.querySelector('.ger-over-bottom');
      if (overTop)      list.insertBefore(gerTouchItem, overTop);
      else if (overBot) list.insertBefore(gerTouchItem, overBot.nextSibling);
      clearGerOver();
      gerTouchItem = null;
    });

    function openModal() {
      buildList(getCurrentOrder());
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

    saveBtn.addEventListener('click', function () {
      var newOrder = [];
      var newVis   = {};
      list.querySelectorAll('[data-card-id]').forEach(function (el) {
        newOrder.push(el.dataset.cardId);
        newVis[el.dataset.cardId] = el.dataset.visible !== '0';
      });
      localStorage.setItem(CARDS_ORDER_KEY, JSON.stringify(newOrder));
      localStorage.setItem(CARD_VISIBILITY_KEY, JSON.stringify(newVis));
      newOrder.forEach(function (id) {
        var el = cardsContainer.querySelector('[data-card-id="' + id + '"]');
        if (el) cardsContainer.appendChild(el);
      });
      Object.keys(newVis).forEach(function (id) {
        var el = cardsContainer.querySelector('[data-card-id="' + id + '"]');
        if (el) el.classList.toggle('card-hidden', !newVis[id]);
      });
      var orig = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> Salvo!';
      saveBtn.disabled  = true;
      setTimeout(function () { saveBtn.innerHTML = orig; saveBtn.disabled = false; closeModal(); }, 800);
    });
  }

  // ── Assistente Flux ─────────────────────────────────────────────────────────
  function fluxLoading(body, msg) {
    body.innerHTML = '<div class="flux-loading">'
      + '<div class="flux-dots"><span></span><span></span><span></span></div>'
      + '<span>' + esc(msg || 'Analisando suas finanças...') + '</span>'
      + '</div>';
  }

  function renderPlanejamento(data) {
    var periodos = data.periodos || [];
    if (!periodos.length) {
      return '<div class="quin-empty-state">'
        + '<i class="bi bi-layout-split"></i>'
        + '<p>Nenhum recebimento agendado nos próximos 60 dias.</p>'
        + '<span>Cadastre suas receitas futuras para ver o planejamento por recebimento.</span>'
        + '</div>';
    }
    var html = '<div class="quin-wrapper">';
    periodos.forEach(function (p) {
      var isSaldo = p.tipo === 'saldo';
      var sobraPos = p.sobra >= 0;
      html += '<div class="quin-period ' + (isSaldo ? 'quin-saldo' : 'quin-receita') + '">';
      html += '<div class="quin-header">'
        + '<div class="quin-icon"><i class="bi ' + (isSaldo ? 'bi-wallet2' : 'bi-arrow-down-circle-fill') + '"></i></div>'
        + '<div class="quin-header-info">'
        + '<div class="quin-label">' + esc(p.label) + '</div>'
        + '<div class="quin-disponivel">' + formatMoney(p.disponivel) + '</div>'
        + ((!isSaldo && p.receita && p.receita.descricao) ? '<div class="quin-origem">' + esc(p.receita.descricao) + '</div>' : '')
        + '</div></div>';
      if (p.despesas && p.despesas.length) {
        html += '<div class="quin-despesas">';
        p.despesas.forEach(function (d) {
          html += '<div class="quin-desp-row">'
            + '<span class="quin-desp-data">' + esc(d.data) + '</span>'
            + '<span class="quin-desp-desc">' + esc(d.descricao) + '</span>'
            + '<span class="quin-desp-val">-' + formatMoney(d.valor) + '</span>'
            + '</div>';
        });
        html += '</div>';
      } else {
        html += '<div class="quin-empty">Nenhuma despesa neste período</div>';
      }
      html += '<div class="quin-footer">'
        + '<span>Sobra estimada</span>'
        + '<span class="quin-sobra ' + (sobraPos ? 'quin-pos' : 'quin-neg') + '">' + formatMoney(p.sobra) + '</span>'
        + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function loadAssistente(periodo) {
    var body = document.getElementById('fluxBody');
    if (!body) return;

    document.querySelectorAll('.flux-period-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.periodo === periodo);
    });

    if (periodo === 'divisao') {
      fluxLoading(body, 'Calculando planejamento...');
      fetch('/api/assistente/planejamento')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.error) {
            body.innerHTML = '<div class="flux-error">' + esc(data.error) + '</div>';
            return;
          }
          body.innerHTML = renderPlanejamento(data);
        })
        .catch(function () {
          body.innerHTML = '<div class="flux-error">Não foi possível carregar o planejamento.</div>';
        });
      return;
    }

    fluxLoading(body);
    fetch('/api/assistente/analise?periodo=' + encodeURIComponent(periodo))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          body.innerHTML = '<div class="flux-error">' + esc(data.error) + '</div>';
          return;
        }
        body.innerHTML = '<div class="flux-text">' + esc(data.analise) + '</div>';
      })
      .catch(function () {
        body.innerHTML = '<div class="flux-error">Não foi possível carregar a análise.</div>';
      });
  }

  document.querySelectorAll('.flux-period-btn[data-periodo]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      loadAssistente(btn.dataset.periodo);
    });
  });

  (function initFluxoMensal() {
    var btnFluxo = document.getElementById('btnFluxoMensal');
    if (!btnFluxo) return;
    var modalEl = document.getElementById('modalFluxoMensal');
    if (!modalEl) return;

    function _getModal() {
      return bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    }

    function fmtBRL(v) {
      var n = parseFloat(v) || 0;
      return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function renderFluxo(data) {
      var body = document.getElementById('fluxoMensalBody');
      if (!data || !data.meses || !data.meses.length) {
        body.innerHTML = '<div class="text-center py-4 text-muted" style="font-size:.875rem;">Nenhum dado encontrado.</div>';
        return;
      }
      var cartaoIds = Object.keys(data.cartoes_nomes);
      var hasCartoes = cartaoIds.length > 0;

      var headerCols = '<th class="fm-th fm-th-mes">Mês</th>'
        + '<th class="fm-th fm-th-saldo">Saldo</th>'
        + '<th class="fm-th">Despesas</th>'
        + '<th class="fm-th fm-th-cartoes">Cartões</th>';
      if (hasCartoes) {
        cartaoIds.forEach(function (cid) {
          headerCols += '<th class="fm-th fm-th-card">' + esc(data.cartoes_nomes[cid]) + '</th>';
        });
      }

      var rows = data.meses.map(function (m) {
        var saldoPos = m.saldo >= 0;
        var cartoes = parseFloat(m.cartoes_total) || 0;
        var cardCols = '';
        if (hasCartoes) {
          cartaoIds.forEach(function (cid) {
            var v = parseFloat((m.cartoes || {})[cid]) || 0;
            cardCols += '<td class="fm-td fm-td-card">'
              + (v > 0 ? '<span class="fm-val-cartao">' + fmtBRL(v) + '</span>' : '<span class="fm-val-zero">—</span>')
              + '</td>';
          });
        }
        return '<tr>'
          + '<td class="fm-td fm-td-mes">' + esc(m.label) + '</td>'
          + '<td class="fm-td fm-td-saldo ' + (saldoPos ? 'fm-pos' : 'fm-neg') + '">'
            + fmtBRL(m.saldo) + '</td>'
          + '<td class="fm-td">' + (m.despesas > 0 ? fmtBRL(m.despesas) : '<span class="fm-val-zero">—</span>') + '</td>'
          + '<td class="fm-td fm-td-cartoes">'
            + (cartoes > 0 ? '<span class="fm-val-cartao">' + fmtBRL(cartoes) + '</span>' : '<span class="fm-val-zero">—</span>')
            + '</td>'
          + cardCols
          + '</tr>';
      }).join('');

      body.innerHTML = '<div class="fm-scroll-wrap">'
        + '<table class="fm-table">'
        + '<thead><tr>' + headerCols + '</tr></thead>'
        + '<tbody>' + rows + '</tbody>'
        + '</table>'
        + '</div>'
        + '<div class="fm-legenda">'
        + '<span class="fm-leg-item"><span class="fm-dot fm-dot-pos"></span>Saldo positivo</span>'
        + '<span class="fm-leg-item"><span class="fm-dot fm-dot-neg"></span>Saldo negativo</span>'
        + '<span class="fm-leg-item"><span class="fm-dot fm-dot-cartao"></span>Cartões/Emp.</span>'
        + '</div>';
    }

    var loaded = false;
    btnFluxo.addEventListener('click', function () {
      _getModal().show();
      if (loaded) return;
      loaded = true;
      fetch('/api/fluxo-mensal?meses=24')
        .then(function (r) { return r.json(); })
        .then(function (data) { renderFluxo(data); })
        .catch(function () {
          var body = document.getElementById('fluxoMensalBody');
          if (body) body.innerHTML = '<div class="text-center py-4 text-muted" style="font-size:.875rem;">Erro ao carregar dados.</div>';
        });
    });

    modalEl.addEventListener('hidden.bs.modal', function () {
      loaded = false;
    });
  })();

  applyCardOrder();
  applyCardVisibility();
  initGerenciar();
  loadContas();
  loadCartoes();
  loadVisaoGeral();
  loadProjecao();
  loadDebitos();
  loadDespesasPorConta();
  loadDespesasPorCategoria();
  loadDebitos();
  loadAssistente('semana');
  loadDiretrizDezPct();

  window._resumoInst = INSTITUICOES;
  window._resumoBuildLogo = buildLogoHtml;
})();

// ============================================================
//  DIRETRIZ 10%
// ============================================================

var _diretrizContas    = [];
var _diretrizPendente  = null;
var _diretrizDismissed = new Set();
var _diretrizItems     = new Map();
var _diretrizBodyBound = false;

function _fmtMoeda(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _fmtData(iso) {
  if (!iso) return '';
  var p = String(iso).split('T')[0].split('-');
  if (p.length < 3) return iso;
  return p[2] + '/' + p[1] + '/' + p[0];
}

async function loadDiretrizDezPct() {
  if (!_diretrizBodyBound) {
    var body = document.getElementById('diretrizBody');
    if (body) {
      body.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.dataset.action;
        var id = parseInt(btn.dataset.id, 10);
        if (action === 'guardar') {
          diretrizGuardei(btn, id, parseFloat(btn.dataset.valor));
        } else if (action === 'transferir') {
          diretrizTransferir(id);
        } else if (action === 'ignorar') {
          diretrizIgnorar(id);
        }
      });
      _diretrizBodyBound = true;
    }
  }
  try {
    var resp = await fetch('/api/diretrizes/dez-pct/pendentes');
    if (!resp.ok) return;
    var pendentes = await resp.json();
    var visiveis = pendentes.filter(function(p) { return !_diretrizDismissed.has(p.id); });
    _renderDiretrizCard(visiveis);
  } catch (e) { /* silencioso */ }
}

function _renderDiretrizCard(items) {
  var card = document.getElementById('diretrizCard');
  var body = document.getElementById('diretrizBody');
  if (!card || !body) return;

  if (!items || items.length === 0) {
    card.style.display = 'none';
    return;
  }

  _diretrizItems.clear();
  body.innerHTML = items.map(function(item) {
    _diretrizItems.set(item.id, item);
    return [
      '<div class="diretriz-item" id="diretriz-item-' + item.id + '">',
      '  <div class="diretriz-item-top">',
      '    <div class="diretriz-item-info">',
      '      <div class="diretriz-item-desc">' + _escHtml(item.descricao || 'Receita') + '</div>',
      '      <div class="diretriz-item-meta">',
      '        Recebido: ' + _fmtMoeda(item.valor),
      item.data_vencimento ? ' · ' + _fmtData(item.data_vencimento) : '',
      item.conta_nome ? ' · ' + _escHtml(item.conta_nome) : '',
      '      </div>',
      '    </div>',
      '    <div class="diretriz-valor-dez">',
      '      ' + _fmtMoeda(item.valor_dez_pct),
      '      <small>10% a guardar</small>',
      '    </div>',
      '  </div>',
      '  <div class="diretriz-item-actions">',
      '    <button class="diretriz-btn diretriz-btn--guardar" data-action="guardar" data-id="' + item.id + '" data-valor="' + item.valor_dez_pct + '">',
      '      <i class="bi bi-check-circle"></i> Já guardei',
      '    </button>',
      '    <button class="diretriz-btn diretriz-btn--transferir" data-action="transferir" data-id="' + item.id + '">',
      '      <i class="bi bi-arrow-left-right"></i> Transferir',
      '    </button>',
      '    <button class="diretriz-btn diretriz-btn--ignorar" data-action="ignorar" data-id="' + item.id + '">',
      '      Agora não',
      '    </button>',
      '  </div>',
      '</div>',
    ].join('');
  }).join('');

  card.style.display = '';
}

function _escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function diretrizGuardei(btn, lancamentoId, valorDezPct) {
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    var resp = await fetch('/api/diretrizes/dez-pct/' + lancamentoId + '/acao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'investido', valor_dez_pct: valorDezPct }),
    });
    if (!resp.ok) {
      var j = await resp.json();
      alert(j.error || 'Erro ao registrar');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle"></i> Já guardei'; }
      return;
    }
    _removerItemDiretriz(lancamentoId);
  } catch (e) {
    alert('Erro de conexão');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle"></i> Já guardei'; }
  }
}

function diretrizIgnorar(lancamentoId) {
  _diretrizDismissed.add(lancamentoId);
  _removerItemDiretriz(lancamentoId);
}

function _removerItemDiretriz(lancamentoId) {
  var el = document.getElementById('diretriz-item-' + lancamentoId);
  if (el) el.remove();
  var body = document.getElementById('diretrizBody');
  var card = document.getElementById('diretrizCard');
  if (body && card && body.children.length === 0) {
    card.style.display = 'none';
  }
}

async function diretrizTransferir(id) {
  var item = _diretrizItems.get(id);
  if (!item) return;
  _diretrizPendente = item;

  var desc = document.getElementById('diretrizModalDesc');
  if (desc) {
    desc.textContent = 'Selecione as contas para distribuir '
      + _fmtMoeda(item.valor_dez_pct) + ' (10% de ' + _fmtMoeda(item.valor) + '). '
      + 'O valor será dividido igualmente entre as contas marcadas.';
  }

  if (_diretrizContas.length === 0) {
    try {
      var r = await fetch('/api/contas');
      if (r.ok) _diretrizContas = await r.json();
    } catch (e) { /* ignora */ }
  }

  var listEl = document.getElementById('diretrizContasList');
  if (listEl) {
    if (!_diretrizContas.length) {
      listEl.innerHTML = '<div style="padding:14px;text-align:center;color:var(--text-muted);font-size:.85rem">Nenhuma conta disponível</div>';
    } else {
      var instMap = window._resumoInst || {};
      var buildLogo = window._resumoBuildLogo || function() { return ''; };
      listEl.innerHTML = _diretrizContas.map(function(c) {
        var inst = instMap[c.instituicao] || instMap['outro'] || {};
        var logoHtml = buildLogo(inst, 32);
        var isOrigem = c.id === item.conta_id;
        var origemTag = isOrigem ? '<span class="dm-conta-check-origem">origem</span>' : '';
        return '<label class="dm-conta-check" data-id="' + c.id + '">'
          + '<input type="checkbox" value="' + c.id + '">'
          + logoHtml
          + '<div class="dm-conta-check-info">'
          +   '<div class="dm-conta-check-nome">' + _escHtml(c.nome) + '</div>'
          + '</div>'
          + origemTag
          + '<div class="dm-cb-box"></div>'
          + '</label>';
      }).join('');
      listEl.querySelectorAll('label.dm-conta-check').forEach(function(label) {
        label.addEventListener('click', function(e) {
          e.preventDefault();
          var cb = label.querySelector('input[type="checkbox"]');
          cb.checked = !cb.checked;
          label.classList.toggle('dm-checked', cb.checked);
          _updateDiretrizSplit();
        });
      });
    }
  }

  var summaryEl = document.getElementById('diretrizSplitSummary');
  if (summaryEl) summaryEl.style.display = 'none';

  var errEl = document.getElementById('diretrizModalError');
  if (errEl) errEl.style.display = 'none';

  document.getElementById('diretrizModalOverlay').style.display = 'flex';
}

function _updateDiretrizSplit() {
  if (!_diretrizPendente) return;
  var checked = document.querySelectorAll('#diretrizContasList .dm-conta-check.dm-checked');
  var count = checked.length;
  var summaryEl = document.getElementById('diretrizSplitSummary');
  var textEl = document.getElementById('diretrizSplitText');
  if (!summaryEl || !textEl) return;

  if (count === 0) {
    summaryEl.style.display = 'none';
    return;
  }

  var perConta = _diretrizPendente.valor_dez_pct / count;
  var hasOrigem = false;
  checked.forEach(function(lbl) {
    if (parseInt(lbl.dataset.id, 10) === _diretrizPendente.conta_id) hasOrigem = true;
  });
  var transferCount = hasOrigem ? count - 1 : count;

  summaryEl.style.display = 'flex';
  summaryEl.style.flexDirection = 'column';
  summaryEl.style.alignItems = 'flex-start';
  textEl.innerHTML = count + (count === 1 ? ' conta' : ' contas') + ' &nbsp;·&nbsp; '
    + '<strong>' + _fmtMoeda(perConta) + ' por conta</strong>'
    + (hasOrigem && transferCount > 0
      ? '<span class="dm-split-origin-note">' + transferCount + ' transferência' + (transferCount > 1 ? 's' : '') + ' · ' + _fmtMoeda(perConta * transferCount) + ' total enviado</span>'
      : (hasOrigem && transferCount === 0
        ? '<span class="dm-split-origin-note">Valor fica na conta de origem</span>'
        : ''));
}

function closeDiretrizModal(e) {
  if (e && e.target !== document.getElementById('diretrizModalOverlay')) return;
  document.getElementById('diretrizModalOverlay').style.display = 'none';
  _diretrizPendente = null;
}

function _dmShowError(errEl, msg) {
  if (!errEl) return;
  errEl.innerHTML = '<i class="bi bi-exclamation-circle"></i>' + msg;
  errEl.style.display = 'flex';
}

var _DM_CONFIRM_LABEL = '<i class="bi bi-check-lg"></i> Confirmar transferência';

async function confirmarTransferencia() {
  if (!_diretrizPendente) return;
  var errEl = document.getElementById('diretrizModalError');
  if (errEl) errEl.style.display = 'none';

  var checkedLabels = Array.from(document.querySelectorAll('#diretrizContasList .dm-conta-check.dm-checked'));
  if (checkedLabels.length === 0) {
    _dmShowError(errEl, 'Selecione ao menos uma conta');
    return;
  }

  var selectedIds = checkedLabels.map(function(lbl) { return parseInt(lbl.dataset.id, 10); });
  var nonOrigemIds = selectedIds.filter(function(cid) { return cid !== _diretrizPendente.conta_id; });

  if (nonOrigemIds.length === 0) {
    _dmShowError(errEl, 'Selecione ao menos uma conta diferente da conta de origem');
    return;
  }

  var perConta = _diretrizPendente.valor_dez_pct / selectedIds.length;
  var hoje = new Date().toISOString().split('T')[0];
  var descBase = 'Reserva 10% — ' + (_diretrizPendente.descricao || 'Receita');

  var btn = document.getElementById('diretrizConfirmarTransf');
  if (btn) { btn.disabled = true; btn.textContent = 'Aguarde...'; }

  try {
    for (var i = 0; i < nonOrigemIds.length; i++) {
      var trResp = await fetch('/api/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: descBase,
          valor: perConta,
          conta_origem_id: _diretrizPendente.conta_id,
          conta_destino_id: nonOrigemIds[i],
          data_vencimento: hoje,
          efetivado: true,
        }),
      });
      if (!trResp.ok) {
        var tj = await trResp.json();
        _dmShowError(errEl, tj.error || 'Erro na transferência');
        if (btn) { btn.disabled = false; btn.innerHTML = _DM_CONFIRM_LABEL; }
        return;
      }
    }

    await fetch('/api/diretrizes/dez-pct/' + _diretrizPendente.id + '/acao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'transferido',
        conta_destino_id: nonOrigemIds[0],
        valor_dez_pct: _diretrizPendente.valor_dez_pct,
      }),
    });

    document.getElementById('diretrizModalOverlay').style.display = 'none';
    _removerItemDiretriz(_diretrizPendente.id);
    _diretrizPendente = null;

    if (typeof loadContas === 'function') loadContas();
  } catch (e) {
    _dmShowError(errEl, 'Erro de conexão');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = _DM_CONFIRM_LABEL; }
  }
}
