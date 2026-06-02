'use strict';

(function () {
  function parseBRL(str) {
    return parseFloat((str || '0').replace(/\./g, '').replace(',', '.')) || 0;
  }

  function formatBRL(val) {
    return val.toFixed(2).replace('.', ',');
  }

  // ---- Cotação USD ----
  var _usdRate     = null;
  var _usdRateTime = 0;
  var _USD_CACHE_MS = 30 * 60 * 1000;

  var _BRL_TIPOS     = ['outro'];
  var _BRL_SPECIFIC  = ['dominio|Registro.br', 'dominio|Hostinger'];

  function isBrlService(value, tipo) {
    if (_BRL_TIPOS.indexOf(tipo) !== -1) return true;
    if (_BRL_SPECIFIC.indexOf(value) !== -1) return true;
    return false;
  }

  function getExchangeRate(cb) {
    var now = Date.now();
    if (_usdRate && (now - _usdRateTime) < _USD_CACHE_MS) { cb(_usdRate); return; }
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var rate = parseFloat(data.USDBRL && data.USDBRL.bid);
        if (rate > 0) { _usdRate = rate; _usdRateTime = Date.now(); }
        cb(_usdRate || 5.70);
      })
      .catch(function () { cb(_usdRate || 5.70); });
  }

  function setCurrency(row, currency) {
    var brlInput = row.querySelector('.dev-custo-valor-brl');
    var usdInput = row.querySelector('.dev-custo-valor-usd');
    var usdInfo  = row.querySelector('.dev-custo-usd-info');
    row.querySelectorAll('.dev-cur-btn').forEach(function (btn) {
      btn.classList.toggle('dev-cur-btn--active', btn.dataset.cur === currency);
    });
    if (currency === 'USD') {
      if (brlInput) brlInput.style.display = 'none';
      if (usdInput) { usdInput.style.display = ''; usdInput.focus(); }
      if (usdInfo)  usdInfo.style.display  = '';
      row.dataset.currency = 'USD';
      updateUsdConversion(row);
    } else {
      if (brlInput) brlInput.style.display = '';
      if (usdInput) usdInput.style.display = 'none';
      if (usdInfo)  usdInfo.style.display  = 'none';
      row.dataset.currency = 'BRL';
      updateTotals();
    }
  }

  function updateUsdConversion(row) {
    var usdInput    = row.querySelector('.dev-custo-valor-usd');
    var brlInput    = row.querySelector('.dev-custo-valor-brl');
    var convertedEl = row.querySelector('.dev-usd-converted');
    var rateEl      = row.querySelector('.dev-usd-rate-label');
    if (!usdInput || !brlInput) return;
    var usdVal = parseFloat((usdInput.value || '0').replace(',', '.')) || 0;
    getExchangeRate(function (rate) {
      var brl = usdVal * rate;
      brlInput.value = formatBRL(brl);
      if (convertedEl) convertedEl.textContent = '= R$ ' + formatBRL(brl);
      if (rateEl)      rateEl.textContent      = '1 US$ = R$ ' + formatBRL(rate);
      updateTotals();
    });
  }

  function calcMonthlyValue(valor, recorrencia, compartilhado) {
    var base = recorrencia === 'anual' ? valor / 12
             : recorrencia === 'unico' ? 0
             : valor;
    return base / Math.max(compartilhado, 1);
  }

  function updateRowEfetivo(row) {
    var valorInput = row.querySelector('.dev-custo-valor');
    var recorrenciaSelect = row.querySelector('.dev-custo-recorrencia');
    var compartilhadoInput = row.querySelector('.dev-custo-compartilhado');
    var efetivoEl = row.querySelector('.dev-custo-efetivo');
    if (!valorInput || !recorrenciaSelect || !efetivoEl) return;
    var valor = parseBRL(valorInput.value);
    var compartilhado = parseInt(compartilhadoInput?.value || '1') || 1;
    var mensal = calcMonthlyValue(valor, recorrenciaSelect.value, compartilhado);
    efetivoEl.textContent = 'R$ ' + formatBRL(mensal);
    var wrap = row.querySelector('.dev-custo-efetivo-wrap');
    if (wrap) wrap.style.display = compartilhado > 1 ? '' : 'none';
  }

  function updateTotals() {
    var rows = document.querySelectorAll('.dev-custo-row');
    var totalMensal = 0;
    rows.forEach(function (row) {
      var valorInput = row.querySelector('.dev-custo-valor');
      var recorrenciaSelect = row.querySelector('.dev-custo-recorrencia');
      var compartilhadoInput = row.querySelector('.dev-custo-compartilhado');
      if (!valorInput || !recorrenciaSelect) return;
      var compartilhado = parseInt(compartilhadoInput?.value || '1') || 1;
      totalMensal += calcMonthlyValue(parseBRL(valorInput.value), recorrenciaSelect.value, compartilhado);
      updateRowEfetivo(row);
    });
    var anual = totalMensal * 12;
    var elMensal = document.getElementById('devTotalMensal');
    var elAnual = document.getElementById('devTotalAnual');
    if (elMensal) elMensal.textContent = 'R$ ' + formatBRL(totalMensal);
    if (elAnual) elAnual.textContent = 'R$ ' + formatBRL(anual);
  }

  function updateNoCustosMsg() {
    var msg = document.getElementById('noCustosMsg');
    if (!msg) return;
    msg.style.display = document.querySelectorAll('.dev-custo-row').length === 0 ? 'block' : 'none';
  }

  function injectCustomTypes(select) {
    var customs = window.devCustomTypes || [];
    // Remove previously injected custom options
    select.querySelectorAll('option[data-custom]').forEach(function (o) { o.remove(); });
    if (!customs.length) return;
    customs.forEach(function (t) {
      var tipo = t.tipo || 'outro';
      var group = select.querySelector('optgroup[data-tipo="' + tipo + '"]');
      if (!group) group = select.querySelector('optgroup[data-tipo="outro"]');
      if (!group) return;
      var opt = document.createElement('option');
      opt.value = tipo + '|' + t.nome;
      opt.textContent = t.nome;
      opt.setAttribute('data-custom', '1');
      group.appendChild(opt);
    });
  }

  function bindRowEvents(row) {
    var servicoSelect = row.querySelector('.dev-custo-servico');
    var nomeInput = row.querySelector('.dev-custo-nome');
    var tipoHidden = row.querySelector('.dev-custo-tipo');
    var valorInput = row.querySelector('.dev-custo-valor');
    var recorrenciaSelect = row.querySelector('.dev-custo-recorrencia');
    var compartilhadoInput = row.querySelector('.dev-custo-compartilhado');
    var removeBtn = row.querySelector('.dev-custo-remove');

    var servicoKeyHidden = row.querySelector('.dev-custo-servico-key');

    if (servicoSelect) {
      injectCustomTypes(servicoSelect);
      servicoSelect.addEventListener('change', function () {
        var parts = (servicoSelect.value || '|').split('|');
        var tipo = parts[0] || 'outro';
        var nome = parts[1] || '';
        if (tipoHidden) tipoHidden.value = tipo;
        if (servicoKeyHidden) servicoKeyHidden.value = servicoSelect.value;
        if (nomeInput && nome) nomeInput.value = nome;
        setCurrency(row, isBrlService(servicoSelect.value, tipo) ? 'BRL' : 'USD');
      });
      var parts = (servicoSelect.value || '|').split('|');
      if (tipoHidden) tipoHidden.value = parts[0] || 'outro';
      if (nomeInput && parts[1] && !nomeInput.value) nomeInput.value = parts[1];
      if (servicoKeyHidden) servicoKeyHidden.value = servicoSelect.value;
    }

    // Currency toggle buttons
    row.querySelectorAll('.dev-cur-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setCurrency(row, btn.dataset.cur); });
    });

    // USD input → convert in real-time
    var usdInput = row.querySelector('.dev-custo-valor-usd');
    if (usdInput) usdInput.addEventListener('input', function () { updateUsdConversion(row); });

    if (valorInput) valorInput.addEventListener('input', updateTotals);
    if (recorrenciaSelect) recorrenciaSelect.addEventListener('change', updateTotals);
    if (compartilhadoInput) compartilhadoInput.addEventListener('input', updateTotals);

    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        row.remove();
        updateTotals();
        updateNoCustosMsg();
      });
    }

    updateRowEfetivo(row);
  }

  function setRowValues(row, data) {
    var servicoSelect = row.querySelector('.dev-custo-servico');
    var nomeInput = row.querySelector('.dev-custo-nome');
    var tipoHidden = row.querySelector('.dev-custo-tipo');
    var servicoKeyHidden = row.querySelector('.dev-custo-servico-key');
    var valorInput = row.querySelector('.dev-custo-valor');
    var recorrenciaSelect = row.querySelector('.dev-custo-recorrencia');
    var compartilhadoInput = row.querySelector('.dev-custo-compartilhado');

    var nome = data.nome || '';
    var tipo = data.tipo || 'outro';
    var compartilhado = data.compartilhado_entre || 1;

    if (nomeInput) nomeInput.value = nome;
    if (tipoHidden) tipoHidden.value = tipo;
    if (valorInput) valorInput.value = formatBRL(parseFloat(data.valor) || 0);
    if (recorrenciaSelect) recorrenciaSelect.value = data.recorrencia || 'mensal';
    if (compartilhadoInput) compartilhadoInput.value = compartilhado;

    if (servicoSelect) {
      var candidates = [tipo + '|' + nome, data.servico_key];
      var found = false;
      for (var ci = 0; ci < candidates.length && !found; ci++) {
        var matchValue = candidates[ci];
        if (!matchValue || matchValue === 'outro|') continue;
        for (var i = 0; i < servicoSelect.options.length; i++) {
          if (servicoSelect.options[i].value === matchValue) {
            servicoSelect.selectedIndex = i;
            found = true;
            break;
          }
        }
      }
      if (!found && nome) {
        var nomeLower = nome.toLowerCase();
        for (var i = 0; i < servicoSelect.options.length && !found; i++) {
          var optParts = servicoSelect.options[i].value.split('|');
          if (optParts.length > 1 && optParts[1] && optParts[0] === tipo && nomeLower.includes(optParts[1].toLowerCase())) {
            servicoSelect.selectedIndex = i;
            found = true;
          }
        }
        for (var i = 0; i < servicoSelect.options.length && !found; i++) {
          var optParts = servicoSelect.options[i].value.split('|');
          if (optParts.length > 1 && optParts[1] && nomeLower.includes(optParts[1].toLowerCase())) {
            servicoSelect.selectedIndex = i;
            found = true;
          }
        }
      }
      if (!found) servicoSelect.value = 'outro|';
      if (servicoKeyHidden) servicoKeyHidden.value = servicoSelect.value;
    }

    updateRowEfetivo(row);
  }

  function addCustoRow(data) {
    var template = document.getElementById('custosRowTemplate');
    var container = document.getElementById('custosContainer');
    if (!template || !container) return;

    var tmp = document.createElement('div');
    tmp.innerHTML = template.innerHTML;
    var row = tmp.firstElementChild;

    container.appendChild(row);
    bindRowEvents(row);

    if (data) setRowValues(row, data);

    updateNoCustosMsg();
    updateTotals();
  }

  window.devInit = function (existingCustos) {
    var addBtn = document.getElementById('btnAddCusto');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        addCustoRow(null);
      });
    }

    if (Array.isArray(existingCustos) && existingCustos.length > 0) {
      existingCustos.forEach(function (c) { addCustoRow(c); });
    } else {
      updateNoCustosMsg();
    }
  };
})();
