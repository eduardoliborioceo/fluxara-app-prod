(function () {
  'use strict';

  /* ========== TABS ========== */
  document.querySelectorAll('.saude-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.saude-tab-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      var tab = btn.dataset.tab;
      document.getElementById('tab-hoje').style.display = tab === 'hoje' ? '' : 'none';
      document.getElementById('tab-perfil').style.display = tab === 'perfil' ? '' : 'none';
    });
  });

  /* ========== ACORDEI ========== */
  var btnAcordei = document.getElementById('btnAcordei');
  if (btnAcordei) {
    btnAcordei.addEventListener('click', function () {
      btnAcordei.disabled = true;
      fetch('/api/saude/acordei', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.hora_acordou) {
            var dt = new Date(data.hora_acordou);
            var hh = String(dt.getHours()).padStart(2, '0');
            var mm = String(dt.getMinutes()).padStart(2, '0');
            document.getElementById('acordeiInfo').innerHTML =
              'Hoje às <span class="saude-acordei-time">' + hh + ':' + mm + '</span>';
          }
          btnAcordei.innerHTML = '<i class="bi bi-sunrise"></i> Acordei registrado';
        })
        .catch(function () {
          btnAcordei.disabled = false;
        });
    });
  }

  /* ========== ÁGUA ========== */
  window.registrarAgua = function (ml) {
    fetch('/api/saude/agua', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantidade_ml: ml }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        _AGUA_TOTAL_ML = data.total_ml;
        atualizarAguaUI(data.total_ml, data.registro);
      });
  };

  window.abrirModalAgua = function () {
    document.getElementById('aguaCustom').value = '';
    document.getElementById('modalAgua').style.display = 'flex';
    setTimeout(function () { document.getElementById('aguaCustom').focus(); }, 100);
  };

  window.fecharModalAgua = function (evt) {
    if (!evt || evt.target === document.getElementById('modalAgua')) {
      document.getElementById('modalAgua').style.display = 'none';
    }
  };

  window.salvarAguaCustom = function () {
    var ml = parseInt(document.getElementById('aguaCustom').value, 10);
    if (!ml || ml < 50) { alert('Insira uma quantidade válida (mín 50 ml)'); return; }
    registrarAgua(ml);
    document.getElementById('modalAgua').style.display = 'none';
  };

  window.deletarAgua = function (id) {
    fetch('/api/saude/agua/' + id, { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        var el = document.getElementById('agua-' + id);
        if (el) el.remove();
        _AGUA_TOTAL_ML = data.total_ml;
        atualizarAguaBarraTotal(data.total_ml);
      });
  };

  function atualizarAguaUI(totalMl, registro) {
    atualizarAguaBarraTotal(totalMl);
    if (registro) {
      var dt = new Date(registro.registrado_em);
      var hh = String(dt.getHours()).padStart(2, '0');
      var mm = String(dt.getMinutes()).padStart(2, '0');
      var item = document.createElement('div');
      item.className = 'saude-water-registro';
      item.id = 'agua-' + registro.id;
      item.innerHTML =
        '<span class="saude-water-registro-ml">' + registro.quantidade_ml + ' ml</span>' +
        '<span class="saude-water-registro-hora">' + hh + ':' + mm + '</span>' +
        '<button class="saude-water-del" onclick="deletarAgua(' + registro.id + ')" title="Remover"><i class="bi bi-x"></i></button>';
      var list = document.getElementById('waterList');
      list.insertBefore(item, list.firstChild);
    }
  }

  function atualizarAguaBarraTotal(totalMl) {
    var pct = Math.min(100, Math.round((totalMl / _AGUA_META_ML) * 100));
    document.getElementById('waterFill').style.width = pct + '%';
    var label = totalMl >= 1000 ? (totalMl / 1000).toFixed(1) + ' L' : totalMl + ' ml';
    document.getElementById('waterTotal').textContent = label;
    document.getElementById('stat-agua').textContent = label;
  }

  /* ========== REFEIÇÕES ========== */
  var _fonteAtual = 'manual';
  var _embalagemData = null;
  var _pratoData = null;
  var _porcaoAtual = 0.5;

  window.abrirModalRefeicao = function (tipo, label) {
    document.getElementById('modalTipoRefeicao').value = tipo;
    document.getElementById('modalRefeicaoTitulo').textContent = 'Registrar — ' + label;
    _fonteAtual = 'manual';
    _embalagemData = null;
    _pratoData = null;
    _porcaoAtual = 0.5;
    limparModalRefeicao();
    document.getElementById('modalRefeicao').style.display = 'flex';
  };

  window.fecharModalRefeicao = function (evt) {
    if (!evt || evt.target === document.getElementById('modalRefeicao')) {
      document.getElementById('modalRefeicao').style.display = 'none';
    }
  };

  function limparModalRefeicao() {
    document.getElementById('descricaoManual').value = '';
    document.getElementById('caloriasManual').value = '';
    document.getElementById('proteinasManual').value = '';
    document.getElementById('carbosManual').value = '';
    document.getElementById('gordurasManual').value = '';
    document.getElementById('fotoEmbalagem').value = '';
    document.getElementById('fotoPrato').value = '';
    document.getElementById('btnAnalisarEmbalagem').style.display = 'none';
    document.getElementById('btnAnalisarPrato').style.display = 'none';
    document.getElementById('resultadoEmbalagem').style.display = 'none';
    document.getElementById('resultadoPrato').style.display = 'none';
    document.getElementById('previewAreaEmbalagem').innerHTML =
      '<div class="saude-photo-area-icon"><i class="bi bi-upc-scan"></i></div>' +
      '<div class="saude-photo-area-text">Toque para tirar foto ou selecionar arquivo</div>';
    document.getElementById('previewAreaPrato').innerHTML =
      '<div class="saude-photo-area-icon"><i class="bi bi-camera"></i></div>' +
      '<div class="saude-photo-area-text">Toque para tirar foto ou selecionar arquivo</div>';
    mostrarFonte('manual');
    document.querySelectorAll('.saude-source-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.fonte === 'manual');
    });
  }

  window.selecionarFonte = function (btn) {
    document.querySelectorAll('.saude-source-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    _fonteAtual = btn.dataset.fonte;
    mostrarFonte(_fonteAtual);
  };

  function mostrarFonte(fonte) {
    ['manual', 'foto_produto', 'foto_prato'].forEach(function (f) {
      var el = document.getElementById('fonte-' + f);
      if (el) el.style.display = f === fonte ? '' : 'none';
    });
  }

  window.previewFotoEmbalagem = function (input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var url = URL.createObjectURL(file);
    document.getElementById('previewAreaEmbalagem').innerHTML =
      '<img src="' + url + '" class="saude-photo-preview" alt="Preview">';
    document.getElementById('btnAnalisarEmbalagem').style.display = 'flex';
  };

  window.previewFotoPrato = function (input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var url = URL.createObjectURL(file);
    document.getElementById('previewAreaPrato').innerHTML =
      '<img src="' + url + '" class="saude-photo-preview" alt="Preview">';
    document.getElementById('btnAnalisarPrato').style.display = 'flex';
  };

  window.analisarEmbalagem = function () {
    var fileInput = document.getElementById('fotoEmbalagem');
    if (!fileInput.files || !fileInput.files[0]) { alert('Selecione uma foto'); return; }

    var spinner = document.getElementById('spinnerEmbalagem');
    var btn = document.getElementById('btnAnalisarEmbalagem');
    spinner.style.display = 'inline-block';
    btn.disabled = true;

    var formData = new FormData();
    formData.append('foto', fileInput.files[0]);

    fetch('/api/saude/analisar-embalagem', { method: 'POST', body: formData })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        spinner.style.display = 'none';
        btn.disabled = false;
        if (data.error) { alert(data.error); return; }
        _embalagemData = data;
        _porcaoAtual = 0.5;
        exibirResultadoEmbalagem(data);
      })
      .catch(function () {
        spinner.style.display = 'none';
        btn.disabled = false;
        alert('Erro ao analisar imagem. Tente novamente.');
      });
  };

  function exibirResultadoEmbalagem(data) {
    document.getElementById('produtoNome').textContent = data.produto_nome || 'Produto';
    document.getElementById('embPorcao').textContent = (data.porcao_g || '—') + ' g';
    document.getElementById('embCalorias').textContent = (data.calorias_por_porcao || '—') + ' kcal';
    document.getElementById('embProteinas').textContent = (data.proteinas_g || '—') + ' g';
    document.getElementById('embCarbos').textContent = (data.carboidratos_g || '—') + ' g';
    document.getElementById('embGorduras').textContent = (data.gorduras_totais_g || '—') + ' g';
    document.getElementById('resultadoEmbalagem').style.display = '';

    document.querySelectorAll('#porcaoSteps .saude-porcao-btn').forEach(function (btn) {
      btn.classList.toggle('active', parseFloat(btn.dataset.porcao) === _porcaoAtual);
      btn.onclick = function () {
        _porcaoAtual = parseFloat(this.dataset.porcao);
        document.querySelectorAll('#porcaoSteps .saude-porcao-btn').forEach(function (b) {
          b.classList.toggle('active', parseFloat(b.dataset.porcao) === _porcaoAtual);
        });
      };
    });
  }

  window.analisarPrato = function () {
    var fileInput = document.getElementById('fotoPrato');
    if (!fileInput.files || !fileInput.files[0]) { alert('Selecione uma foto'); return; }

    var spinner = document.getElementById('spinnerPrato');
    var btn = document.getElementById('btnAnalisarPrato');
    spinner.style.display = 'inline-block';
    btn.disabled = true;

    var formData = new FormData();
    formData.append('foto', fileInput.files[0]);

    fetch('/api/saude/analisar-prato', { method: 'POST', body: formData })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        spinner.style.display = 'none';
        btn.disabled = false;
        if (data.error) { alert(data.error); return; }
        _pratoData = data;
        exibirResultadoPrato(data);
      })
      .catch(function () {
        spinner.style.display = 'none';
        btn.disabled = false;
        alert('Erro ao analisar imagem. Tente novamente.');
      });
  };

  function exibirResultadoPrato(data) {
    document.getElementById('pratoDescricao').textContent = data.descricao || '';
    document.getElementById('pratoCalorias').textContent = (data.calorias_totais_estimadas || '—') + ' kcal';
    var conf = { alto: 'Alta', medio: 'Média', baixo: 'Baixa' };
    document.getElementById('pratoConfianca').textContent = conf[data.nivel_confianca] || data.nivel_confianca || '';

    var itensHtml = '';
    if (data.itens && data.itens.length) {
      data.itens.forEach(function (item) {
        itensHtml +=
          '<div class="saude-ai-result-row">' +
          '<span class="saude-ai-result-key">' + (item.nome || '') + ' (' + (item.quantidade_estimada || '') + ')</span>' +
          '<span class="saude-ai-result-val">' + (item.calorias_estimadas || '—') + ' kcal</span>' +
          '</div>';
      });
    }
    document.getElementById('pratoItens').innerHTML = itensHtml;
    document.getElementById('caloriasAjustePrato').value = data.calorias_totais_estimadas || '';
    document.getElementById('resultadoPrato').style.display = '';
  }

  window.salvarRefeicao = function () {
    var tipo = document.getElementById('modalTipoRefeicao').value;
    var payload = { tipo_refeicao: tipo, fonte: _fonteAtual };

    if (_fonteAtual === 'manual') {
      payload.descricao = document.getElementById('descricaoManual').value.trim();
      payload.calorias = parseInt(document.getElementById('caloriasManual').value, 10) || 0;
      payload.proteinas_g = parseFloat(document.getElementById('proteinasManual').value) || null;
      payload.carboidratos_g = parseFloat(document.getElementById('carbosManual').value) || null;
      payload.gorduras_g = parseFloat(document.getElementById('gordurasManual').value) || null;
    } else if (_fonteAtual === 'foto_produto' && _embalagemData) {
      var p = _porcaoAtual;
      payload.descricao = (_embalagemData.produto_nome || 'Produto') + ' (' + p + ' porção)';
      payload.calorias = Math.round((_embalagemData.calorias_por_porcao || 0) * p);
      payload.proteinas_g = _embalagemData.proteinas_g ? _embalagemData.proteinas_g * p : null;
      payload.carboidratos_g = _embalagemData.carboidratos_g ? _embalagemData.carboidratos_g * p : null;
      payload.gorduras_g = _embalagemData.gorduras_totais_g ? _embalagemData.gorduras_totais_g * p : null;
    } else if (_fonteAtual === 'foto_prato' && _pratoData) {
      var calAjuste = parseInt(document.getElementById('caloriasAjustePrato').value, 10);
      payload.descricao = _pratoData.descricao || 'Prato fotografado';
      payload.calorias = calAjuste || _pratoData.calorias_totais_estimadas || 0;
      payload.proteinas_g = _pratoData.proteinas_g_estimadas || null;
      payload.carboidratos_g = _pratoData.carboidratos_g_estimados || null;
      payload.gorduras_g = _pratoData.gorduras_g_estimadas || null;
    } else {
      alert('Preencha os dados ou analise a foto antes de salvar.');
      return;
    }

    var btn = document.getElementById('btnSalvarRefeicao');
    btn.disabled = true;

    fetch('/api/saude/refeicao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (data.error) { alert(data.error); return; }
        document.getElementById('modalRefeicao').style.display = 'none';
        adicionarEntradaRefeicao(data);
      })
      .catch(function () {
        btn.disabled = false;
        alert('Erro ao salvar. Tente novamente.');
      });
  };

  function adicionarEntradaRefeicao(refeicao) {
    var entries = document.getElementById('entries-' + refeicao.tipo_refeicao);
    if (entries) {
      var entry = document.createElement('div');
      entry.className = 'saude-meal-entry';
      entry.id = 'entry-' + refeicao.id;
      entry.innerHTML =
        '<span class="saude-meal-entry-desc">' + (refeicao.descricao || 'Refeição registrada') + '</span>' +
        '<span class="saude-meal-entry-cal">' + (refeicao.calorias ? refeicao.calorias + ' kcal' : '') + '</span>' +
        '<button class="saude-meal-entry-del" onclick="deletarRefeicao(event,' + refeicao.id + ',\'' + refeicao.tipo_refeicao + '\')" title="Remover"><i class="bi bi-x"></i></button>';
      entries.appendChild(entry);
    }
    recalcularCaloriasTipo(refeicao.tipo_refeicao);
    recalcularCaloriasDia();
    atualizarDotStatus(refeicao.tipo_refeicao, 'registrado');
  }

  window.deletarRefeicao = function (evt, id, tipo) {
    evt.stopPropagation();
    fetch('/api/saude/refeicao/' + id, { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        var el = document.getElementById('entry-' + id);
        if (el) el.remove();
        recalcularCaloriasTipo(tipo);
        recalcularCaloriasDia();
      });
  };

  function recalcularCaloriasTipo(tipo) {
    var entries = document.getElementById('entries-' + tipo);
    if (!entries) return;
    var total = 0;
    entries.querySelectorAll('.saude-meal-entry-cal').forEach(function (el) {
      var text = el.textContent.replace(/[^\d]/g, '');
      if (text) total += parseInt(text, 10);
    });
    var calEl = document.getElementById('cal-' + tipo);
    if (calEl) {
      calEl.textContent = total ? total + ' kcal' : '';
      calEl.className = 'saude-meal-cal' + (total ? ' saude-meal-cal--registrado' : '');
    }
  }

  function recalcularCaloriasDia() {
    var total = 0;
    document.querySelectorAll('.saude-meal-entry-cal').forEach(function (el) {
      var text = el.textContent.replace(/[^\d]/g, '');
      if (text) total += parseInt(text, 10);
    });
    _KCAL_HOJE = total;
    document.getElementById('stat-calorias').textContent = total;
    atualizarBarraCalorias(total);
  }

  function atualizarBarraCalorias(total) {
    var fill = document.getElementById('calFill');
    var prog = document.getElementById('stat-cal-prog');
    if (!fill || !_KCAL_META) return;
    var pct = Math.min(100, Math.round((total / _KCAL_META) * 100));
    fill.style.width = pct + '%';
    if (pct >= 100) {
      fill.classList.add('saude-cal-fill--over');
    } else {
      fill.classList.remove('saude-cal-fill--over');
    }
    if (prog) prog.textContent = total;
  }

  function atualizarDotStatus(tipo, status) {
    var item = document.querySelector('[data-tipo="' + tipo + '"] .saude-meal-dot');
    if (item) {
      item.className = 'saude-meal-dot saude-meal-dot--' + status;
    }
  }

  /* ========== PERFIL ========== */
  window.salvarPerfil = function () {
    var altura = document.getElementById('inputAltura').value;
    var peso = document.getElementById('inputPeso').value;
    var pesoMeta = document.getElementById('inputPesoMeta').value;

    fetch('/api/saude/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        altura_cm: altura ? parseFloat(altura) : null,
        peso_atual_kg: peso ? parseFloat(peso) : null,
        peso_meta_kg: pesoMeta ? parseFloat(pesoMeta) : null,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }

        var imc = data.imc;
        var imcResult = document.getElementById('imcResult');
        if (imc && imc.valor) {
          document.getElementById('imcValor').textContent = imc.valor;
          document.getElementById('imcValor').className = 'saude-imc-value saude-imc-value--' + (imc.cor || 'success');
          document.getElementById('imcCat').textContent = imc.categoria || '';
          document.getElementById('metaAguaTexto').textContent = (data.meta_agua_ml || 2000) + ' ml/dia';
          imcResult.style.display = '';
          document.getElementById('stat-imc').textContent = imc.valor;
          _AGUA_META_ML = data.meta_agua_ml || 2000;
          atualizarAguaBarraTotal(_AGUA_TOTAL_ML);
        } else {
          imcResult.style.display = 'none';
          document.getElementById('stat-imc').textContent = '—';
        }

        if (data.meta_kcal) {
          _KCAL_META = data.meta_kcal;
          var cardMeta = document.getElementById('cardCaloriaMeta');
          if (cardMeta) cardMeta.style.display = '';
          var metaTexto = document.getElementById('metaKcalTexto');
          if (metaTexto) metaTexto.textContent = data.meta_kcal + ' kcal';
          atualizarBarraCalorias(_KCAL_HOJE);
          var mc = data.meta_calorias;
          var modoEl = document.getElementById('calModoTexto');
          if (modoEl && mc) {
            var icone = mc.modo === 'perda' ? 'bi-arrow-down-circle text-warning'
                      : mc.modo === 'ganho' ? 'bi-arrow-up-circle text-success'
                      : 'bi-check-circle text-success';
            var diff = mc.modo === 'perda' ? (mc.manutencao_kcal - mc.meta_kcal)
                     : mc.modo === 'ganho' ? (mc.meta_kcal - mc.manutencao_kcal)
                     : 0;
            var semanas = mc.semanas_estimadas ? ' · ~' + mc.semanas_estimadas + ' semanas' : '';
            var texto = mc.modo === 'perda' ? 'Déficit de ' + diff + ' kcal para perda de peso' + semanas
                      : mc.modo === 'ganho' ? 'Superávit de ' + diff + ' kcal para ganho de peso' + semanas
                      : 'Manutenção do peso atual';
            modoEl.innerHTML = '<i class="bi ' + icone + '"></i> ' + texto;
            modoEl.style.display = '';
          }
        }

        if (peso) {
          var list = document.getElementById('pesoList');
          var hoje = new Date();
          var dataStr = String(hoje.getDate()).padStart(2, '0') + '/' +
                        String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear();
          var item = document.createElement('div');
          item.className = 'saude-peso-item';
          item.innerHTML =
            '<span class="saude-peso-item-kg">' + parseFloat(peso).toFixed(1) + ' kg</span>' +
            '<span class="saude-peso-item-data">' + dataStr + '</span>';
          if (list.firstChild) {
            list.insertBefore(item, list.firstChild);
          } else {
            list.innerHTML = '';
            list.appendChild(item);
          }
        }
      })
      .catch(function () {
        alert('Erro ao salvar. Tente novamente.');
      });
  };

})();
