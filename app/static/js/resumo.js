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
    outro:       { cor: '#6c757d', letra: 'O' },
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
  });

  document.getElementById('btnMesPosterior').addEventListener('click', function () {
    month++;
    if (month > 11) { month = 0; year++; }
    updateMesLabel();
    loadVisaoGeral();
    loadContas();
    loadCartoes();
    loadDespesasPorConta();
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
    var bg = (inst && inst.cor) || '#6c757d';
    var fg = (inst && inst.corLetra) || '#fff';
    var letra = (inst && inst.letra) || 'O';
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
        return '<div class="conta-item" data-id="' + c.id + '" data-mes="' + mes + '" data-ano="' + year + '">'
          + logoHtml
          + '<div class="conta-info">'
          +   '<div class="conta-nome">' + esc(c.nome) + '</div>'
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
      var mes = month + 1;
      var faturaLabel = isFuturoMes() ? 'Fatura prevista' : 'Fatura aberta';
      body.innerHTML = data.map(function (c) {
        var limDisp = parseFloat(c.limite_disponivel != null ? c.limite_disponivel : c.limite) || 0;
        var fatAtual = parseFloat(c.fatura_atual || 0);
        if (limDisp > 0) totalDisp += limDisp;
        var b = BANDEIRAS[c.bandeira] || BANDEIRAS.outro;
        var logoHtml = buildBandeiraLogo(b, 36);
        var fechaInfo = 'Fecha dia ' + c.dia_fechamento + ' · Vence dia ' + c.dia_vencimento;
        return '<div class="cartao-card" data-id="' + c.id + '" data-mes="' + mes + '" data-ano="' + year + '">'
          + '<div class="cartao-card-header">'
          +   logoHtml
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
      body.querySelectorAll('.cartao-card').forEach(function (el) {
        el.addEventListener('click', function () {
          var id = this.dataset.id;
          var m  = this.dataset.mes;
          var a  = this.dataset.ano;
          window.location.href = '/cartao/' + id + '/extrato?mes=' + m + '&ano=' + a;
        });
      });
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

  var CARDS_ORDER_KEY = 'fluxara_cards_order';

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

  if (window.innerWidth < 992) {
    applyCardOrder();
    initDragDrop();
  }
  loadContas();
  loadCartoes();
  loadVisaoGeral();
  loadProjecao();
  loadDespesasPorConta();
})();
