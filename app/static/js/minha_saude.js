(function () {
  'use strict';

  /* ========== TIMEZONE DETECTION ========== */
  (function () {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        document.cookie = 'user_tz=' + encodeURIComponent(tz) + '; path=/; max-age=31536000; SameSite=Lax';
      }
    } catch (e) {}
  })();

  /* ========== TABS ========== */
  var _produtosCarregados = false;
  var _calCarregado = false;
  var _exerciciosCatCarregados = false;

  document.querySelectorAll('.saude-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.saude-tab-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      var tab = btn.dataset.tab;
      document.getElementById('tab-hoje').style.display       = tab === 'hoje'       ? '' : 'none';
      document.getElementById('tab-historico').style.display  = tab === 'historico'  ? '' : 'none';
      document.getElementById('tab-perfil').style.display     = tab === 'perfil'     ? '' : 'none';
      document.getElementById('tab-produtos').style.display   = tab === 'produtos'   ? '' : 'none';
      document.getElementById('tab-exercicios').style.display = tab === 'exercicios' ? '' : 'none';
      if (tab === 'produtos' && !_produtosCarregados) {
        carregarProdutos();
      }
      if (tab === 'historico' && !_calCarregado) {
        carregarCalendario(_calAno, _calMes);
      }
      if (tab === 'exercicios' && !_exerciciosCatCarregados) {
        carregarExerciciosCatalogo();
      }
    });
  });

  /* ========== TIMEZONE HELPER ========== */
  function formatLocalTime(utcStr) {
    var s = (utcStr && !utcStr.endsWith('Z') && !utcStr.includes('+')) ? utcStr + 'Z' : utcStr;
    var dt = new Date(s);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  document.querySelectorAll('[data-utc]').forEach(function (el) {
    el.textContent = formatLocalTime(el.dataset.utc);
  });

  /* ========== TIMEZONE: corrige status das refeições com hora local ========== */
  function atualizarStatusRefeicoes() {
    var agora = new Date();
    var minAtual = agora.getHours() * 60 + agora.getMinutes();

    document.querySelectorAll('.saude-meal-item').forEach(function (item) {
      if (item.dataset.registrado === 'true') return;

      var inicio = item.dataset.inicio || '';
      var fim = item.dataset.fim || '';
      if (!inicio || !fim) return;

      var partsIni = inicio.split(':');
      var partsFim = fim.split(':');
      var minIni = parseInt(partsIni[0], 10) * 60 + parseInt(partsIni[1], 10);
      var minFim = parseInt(partsFim[0], 10) * 60 + parseInt(partsFim[1], 10);

      var dot = item.querySelector('.saude-meal-dot');
      var timeEl = item.querySelector('.saude-meal-time');
      if (!dot || !timeEl) return;

      var baseText = inicio + ' \u2013 ' + fim;
      dot.className = 'saude-meal-dot';
      timeEl.className = 'saude-meal-time';

      if (minAtual >= minIni && minAtual <= minFim) {
        dot.classList.add('saude-meal-dot--agora');
        timeEl.classList.add('saude-meal-time--agora');
        timeEl.textContent = baseText + ' \u00b7 Agora';
      } else if (minAtual < minIni) {
        dot.classList.add('saude-meal-dot--pendente');
        timeEl.textContent = baseText;
      } else {
        dot.classList.add('saude-meal-dot--passado');
        timeEl.textContent = baseText;
      }
    });
  }

  atualizarStatusRefeicoes();

  /* ========== ACORDEI ========== */
  var btnAcordei = document.getElementById('btnAcordei');
  if (btnAcordei) {
    btnAcordei.addEventListener('click', function () {
      btnAcordei.disabled = true;
      fetch('/api/saude/acordei', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.hora_acordou) {
            document.getElementById('acordeiInfo').innerHTML =
              'Hoje às <span class="saude-acordei-time">' + formatLocalTime(data.hora_acordou) + '</span>';
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
      var item = document.createElement('div');
      item.className = 'saude-water-registro';
      item.id = 'agua-' + registro.id;
      item.innerHTML =
        '<span class="saude-water-registro-ml">' + registro.quantidade_ml + ' ml</span>' +
        '<span class="saude-water-registro-hora">' + formatLocalTime(registro.registrado_em) + '</span>' +
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
  var _produtoSelecionado = null;
  var _porcaoManualAtual = 1;
  var _buscaTimer = null;

  window.abrirModalRefeicao = function (tipo, label) {
    document.getElementById('modalTipoRefeicao').value = tipo;
    document.getElementById('modalRefeicaoTitulo').textContent = 'Registrar — ' + label;
    limparModalRefeicao();
    document.getElementById('modalRefeicao').style.display = 'flex';
  };

  window.fecharModalRefeicao = function (evt) {
    if (!evt || evt.target === document.getElementById('modalRefeicao')) {
      document.getElementById('modalRefeicao').style.display = 'none';
    }
  };

  function limparModalRefeicao() {
    document.getElementById('buscaProduto').value = '';
    document.getElementById('produtoDropdown').style.display = 'none';
    document.getElementById('produtoSelecionadoWrap').style.display = 'none';
    _produtoSelecionado = null;
    _porcaoManualAtual = 1;
    document.getElementById('descricaoManual').value = '';
    document.getElementById('caloriasManual').value = '';
    document.getElementById('proteinasManual').value = '';
    document.getElementById('carbosManual').value = '';
    document.getElementById('gordurasManual').value = '';
  }

  /* ========== BUSCA DE PRODUTO (modo manual) ========== */
  window.buscarProdutos = function (q) {
    clearTimeout(_buscaTimer);
    var dropdown = document.getElementById('produtoDropdown');
    if (!q || q.length < 2) { dropdown.style.display = 'none'; return; }
    _buscaTimer = setTimeout(function () {
      fetch('/api/saude/produtos?q=' + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (lista) {
          dropdown.innerHTML = '';
          if (!lista.length) {
            dropdown.innerHTML = '<div class="saude-produto-empty">Nenhum produto encontrado</div>';
          } else {
            lista.forEach(function (p) {
              var opt = document.createElement('div');
              opt.className = 'saude-produto-option';
              var porcaoInfo = p.porcao_descricao || (p.porcao_g ? p.porcao_g + 'g' : '');
              opt.innerHTML =
                '<div class="saude-produto-option-nome">' + p.nome +
                (p.marca ? ' <span style="font-weight:400;color:var(--text-muted)">· ' + p.marca + '</span>' : '') +
                '</div>' +
                '<div class="saude-produto-option-info">' +
                (p.calorias_por_porcao ? p.calorias_por_porcao + ' kcal' : '') +
                (porcaoInfo ? ' · ' + porcaoInfo : '') +
                '</div>';
              opt.onclick = function () { selecionarProduto(p); };
              dropdown.appendChild(opt);
            });
          }
          dropdown.style.display = '';
        }).catch(function () { dropdown.style.display = 'none'; });
    }, 300);
  };

  function selecionarProduto(produto) {
    _produtoSelecionado = produto;
    _porcaoManualAtual = 1;
    document.getElementById('buscaProduto').value = produto.nome;
    document.getElementById('produtoDropdown').style.display = 'none';

    var info = document.getElementById('produtoSelecionadoInfo');
    var porcaoLabel = produto.porcao_descricao || (produto.porcao_g ? produto.porcao_g + 'g' : '?');
    info.innerHTML =
      '<div class="saude-ai-result-title">' + produto.nome + '</div>' +
      '<div class="saude-ai-result-row"><span class="saude-ai-result-key">Por porção (' + porcaoLabel + ')</span>' +
      '<span class="saude-ai-result-val">' + (produto.calorias_por_porcao || '—') + ' kcal</span></div>';
    document.getElementById('produtoSelecionadoWrap').style.display = '';

    // Configura os botões de porção do manual
    document.querySelectorAll('#porcaoManualSteps .saude-porcao-btn').forEach(function (btn) {
      btn.classList.toggle('active', parseFloat(btn.dataset.porcao) === _porcaoManualAtual);
      btn.onclick = function () {
        _porcaoManualAtual = parseFloat(this.dataset.porcao);
        document.querySelectorAll('#porcaoManualSteps .saude-porcao-btn').forEach(function (b) {
          b.classList.toggle('active', parseFloat(b.dataset.porcao) === _porcaoManualAtual);
        });
        preencherCamposProduto(produto, _porcaoManualAtual);
      };
    });
    preencherCamposProduto(produto, _porcaoManualAtual);
  }

  function preencherCamposProduto(produto, porcao) {
    document.getElementById('descricaoManual').value = produto.nome + ' (' + porcao + ' porção' + (porcao !== 1 ? 'ões' : '') + ')';
    document.getElementById('caloriasManual').value = Math.round((produto.calorias_por_porcao || 0) * porcao) || '';
    document.getElementById('proteinasManual').value = produto.proteinas_g ? (produto.proteinas_g * porcao).toFixed(1) : '';
    document.getElementById('carbosManual').value = produto.carboidratos_g ? (produto.carboidratos_g * porcao).toFixed(1) : '';
    document.getElementById('gordurasManual').value = produto.gorduras_totais_g ? (produto.gorduras_totais_g * porcao).toFixed(1) : '';
  }

  window.limparProdutoSelecionado = function () {
    _produtoSelecionado = null;
    document.getElementById('buscaProduto').value = '';
    document.getElementById('produtoSelecionadoWrap').style.display = 'none';
    document.getElementById('descricaoManual').value = '';
    document.getElementById('caloriasManual').value = '';
    document.getElementById('proteinasManual').value = '';
    document.getElementById('carbosManual').value = '';
    document.getElementById('gordurasManual').value = '';
  };

  // Fecha dropdown ao clicar fora
  document.addEventListener('click', function (e) {
    var wrap = document.querySelector('.saude-produto-search-wrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('produtoDropdown').style.display = 'none';
    }
  });

  window.salvarRefeicao = function () {
    var tipo = document.getElementById('modalTipoRefeicao').value;
    var payload = {
      tipo_refeicao: tipo,
      fonte: 'manual',
      descricao: document.getElementById('descricaoManual').value.trim(),
      calorias: parseInt(document.getElementById('caloriasManual').value, 10) || 0,
      proteinas_g: parseFloat(document.getElementById('proteinasManual').value) || null,
      carboidratos_g: parseFloat(document.getElementById('carbosManual').value) || null,
      gorduras_g: parseFloat(document.getElementById('gordurasManual').value) || null,
    };

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
            var diasEst = mc.dias_estimados ? ' · ~' + mc.dias_estimados + ' dias' : '';
            var texto = mc.modo === 'perda' ? 'Déficit de ' + diff + ' kcal para perda de peso' + diasEst
                      : mc.modo === 'ganho' ? 'Superávit de ' + diff + ' kcal para ganho de peso' + diasEst
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

  /* ========== PRODUTOS ========== */
  var _todosProdutos = [];

  function carregarProdutos() {
    fetch('/api/saude/produtos')
      .then(function (r) { return r.json(); })
      .then(function (lista) {
        _todosProdutos = lista;
        _produtosCarregados = true;
        renderizarProdutos(lista);
      })
      .catch(function () {});
  }

  window.carregarProdutos = carregarProdutos;

  function renderizarProdutos(lista) {
    var container = document.getElementById('produtoLista');
    if (!container) return;
    if (!lista.length) {
      container.innerHTML =
        '<div class="saude-produto-lista-vazio">' +
        '<i class="bi bi-box-seam" style="font-size:1.6rem;color:var(--text-muted)"></i>' +
        '<div>Nenhum produto cadastrado</div>' +
        '<div style="font-size:.78rem">Adicione produtos para usá-los ao lançar refeições</div>' +
        '</div>';
      return;
    }
    container.innerHTML = lista.map(function (p) {
      var porcaoTexto = '';
      if (p.porcao_descricao) porcaoTexto = p.porcao_descricao;
      else if (p.porcao_g) porcaoTexto = p.porcao_g + 'g';
      var macros = [];
      if (p.proteinas_g) macros.push(p.proteinas_g + 'g prot');
      if (p.carboidratos_g) macros.push(p.carboidratos_g + 'g carb');
      if (p.gorduras_totais_g) macros.push(p.gorduras_totais_g + 'g gord');
      return '<div class="saude-produto-item" id="prod-' + p.id + '">' +
        '<div class="saude-produto-item-info">' +
        '<div class="saude-produto-item-nome">' + escapeHtml(p.nome) +
        (p.marca ? '<span class="saude-produto-item-marca"> · ' + escapeHtml(p.marca) + '</span>' : '') +
        '</div>' +
        '<div class="saude-produto-item-meta">' +
        (p.calorias_por_porcao ? '<strong>' + p.calorias_por_porcao + ' kcal</strong>' : '') +
        (porcaoTexto ? ' · ' + escapeHtml(porcaoTexto) : '') +
        (macros.length ? '<span class="saude-produto-item-macros"> · ' + macros.join(' / ') + '</span>' : '') +
        '</div>' +
        '</div>' +
        '<button class="saude-produto-item-del" onclick="deletarProduto(' + p.id + ')" title="Remover">' +
        '<i class="bi bi-trash"></i></button>' +
        '</div>';
    }).join('');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function normalizarBusca(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  window.filtrarProdutosTab = function (q) {
    var qNorm = normalizarBusca(q.trim());
    var filtrado = qNorm.length < 1
      ? _todosProdutos
      : _todosProdutos.filter(function (p) {
          var haystack = normalizarBusca(p.nome + ' ' + (p.marca || ''));
          return haystack.indexOf(qNorm) !== -1;
        });
    renderizarProdutos(filtrado);
  };

  window.abrirModalProduto = function () {
    document.getElementById('prodNome').value = '';
    document.getElementById('prodMarca').value = '';
    document.getElementById('prodPorcaoDesc').value = '';
    document.getElementById('prodPorcaoG').value = '';
    document.getElementById('prodCalorias').value = '';
    document.getElementById('prodProteinas').value = '';
    document.getElementById('prodCarbos').value = '';
    document.getElementById('prodGorduras').value = '';
    document.getElementById('modalProduto').style.display = 'flex';
    setTimeout(function () { document.getElementById('prodNome').focus(); }, 100);
  };

  window.fecharModalProduto = function (evt) {
    if (!evt || evt.target === document.getElementById('modalProduto')) {
      document.getElementById('modalProduto').style.display = 'none';
    }
  };

  window.salvarProdutoManual = function () {
    var nome = (document.getElementById('prodNome').value || '').trim();
    var calorias = document.getElementById('prodCalorias').value;
    if (!nome) { alert('Nome é obrigatório'); return; }
    if (!calorias) { alert('Calorias por porção são obrigatórias'); return; }

    var btn = document.getElementById('btnSalvarProduto');
    btn.disabled = true;

    var payload = {
      nome: nome,
      marca: (document.getElementById('prodMarca').value || '').trim() || null,
      porcao_descricao: (document.getElementById('prodPorcaoDesc').value || '').trim() || null,
      porcao_g: parseFloat(document.getElementById('prodPorcaoG').value) || null,
      calorias_por_porcao: parseInt(calorias, 10),
      proteinas_g: parseFloat(document.getElementById('prodProteinas').value) || null,
      carboidratos_g: parseFloat(document.getElementById('prodCarbos').value) || null,
      gorduras_g: parseFloat(document.getElementById('prodGorduras').value) || null,
    };

    fetch('/api/saude/produto/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (data.error) { alert(data.error); return; }
        document.getElementById('modalProduto').style.display = 'none';
        _todosProdutos.unshift(data);
        var filtro = document.getElementById('filtroProdutos');
        renderizarProdutos(filtro && filtro.value.trim() ? _todosProdutos.filter(function (p) {
          return (p.nome + ' ' + (p.marca || '')).toLowerCase().indexOf(filtro.value.trim().toLowerCase()) !== -1;
        }) : _todosProdutos);
      })
      .catch(function () {
        btn.disabled = false;
        alert('Erro ao salvar. Tente novamente.');
      });
  };

  window.deletarProduto = function (id) {
    fetch('/api/saude/produto/' + id, { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        _todosProdutos = _todosProdutos.filter(function (p) { return p.id !== id; });
        var el = document.getElementById('prod-' + id);
        if (el) el.remove();
        if (!_todosProdutos.length) renderizarProdutos([]);
      });
  };

  window.importarPadrao = function (btn) {
    btn.disabled = true;
    fetch('/api/saude/produtos/padrao', { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (data.inseridos === 0) {
          alert('Todos os alimentos padrão já estão na sua base.');
        } else {
          carregarProdutos();
        }
      })
      .catch(function () {
        btn.disabled = false;
        alert('Erro ao importar. Tente novamente.');
      });
  };

  /* ========== CALENDÁRIO ========== */
  var _calAno = new Date().getFullYear();
  var _calMes = new Date().getMonth() + 1;
  var _calDiaSelecionado = null;

  var _mesesPt = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var _diasSemana = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  var _mesesNomes = ['janeiro','fevereiro','março','abril','maio','junho',
                     'julho','agosto','setembro','outubro','novembro','dezembro'];

  function carregarCalendario(ano, mes) {
    _calAno = ano;
    _calMes = mes;
    var titulo = document.getElementById('calTitulo');
    if (titulo) titulo.textContent = _mesesPt[mes - 1] + ' ' + ano;
    var grid = document.getElementById('calendarioGrid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-muted);font-size:.82rem">Carregando...</div>';
    var detalhe = document.getElementById('calDiaDetalhe');
    if (detalhe) detalhe.style.display = 'none';

    fetch('/api/saude/historico/calendario?ano=' + ano + '&mes=' + mes)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderizarCalendarioGrid(data);
        _calCarregado = true;
      })
      .catch(function () {
        if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-muted)">Erro ao carregar</div>';
      });
  }

  function renderizarCalendarioGrid(data) {
    var hoje = new Date();
    var hojeStr = hoje.getFullYear() + '-' +
                  String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
                  String(hoje.getDate()).padStart(2, '0');

    var lookup = {};
    data.dias.forEach(function (d) { lookup[d.data] = d; });

    var headers = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    var html = headers.map(function (h) {
      return '<div class="saude-cal-header">' + h + '</div>';
    }).join('');

    var offset = data.dias.length > 0 ? (data.dias[0].dia_semana - 1) : 0;
    for (var i = 0; i < offset; i++) {
      html += '<div class="saude-cal-day saude-cal-day--empty"></div>';
    }

    data.dias.forEach(function (d) {
      var isHoje = d.data === hojeStr;
      var isSel  = d.data === _calDiaSelecionado;
      var classes = 'saude-cal-day';
      if (isHoje) classes += ' saude-cal-day--hoje';
      if (isSel)  classes += ' saude-cal-day--selecionado';

      var dot = '';
      if (d.tem_refeicao) {
        dot = '<div class="saude-cal-dot saude-cal-dot--refeicao"></div>';
      } else if (d.agua_total_ml > 0) {
        dot = '<div class="saude-cal-dot saude-cal-dot--agua"></div>';
      }

      html += '<div class="' + classes + '" data-data="' + d.data + '" onclick="selecionarDia(\'' + d.data + '\')">' +
              '<span class="saude-cal-num">' + d.dia + '</span>' +
              dot + '</div>';
    });

    var grid = document.getElementById('calendarioGrid');
    if (grid) grid.innerHTML = html;
  }

  window.calMesAnterior = function () {
    var mes = _calMes - 1;
    var ano = _calAno;
    if (mes < 1) { mes = 12; ano--; }
    if (ano < 2020) return;
    carregarCalendario(ano, mes);
  };

  window.calMesProximo = function () {
    var hoje = new Date();
    if (_calAno > hoje.getFullYear() ||
        (_calAno === hoje.getFullYear() && _calMes >= hoje.getMonth() + 1)) return;
    var mes = _calMes + 1;
    var ano = _calAno;
    if (mes > 12) { mes = 1; ano++; }
    carregarCalendario(ano, mes);
  };

  window.selecionarDia = function (dataStr) {
    _calDiaSelecionado = dataStr;

    document.querySelectorAll('.saude-cal-day').forEach(function (el) {
      el.classList.remove('saude-cal-day--selecionado');
      if (el.dataset.data === dataStr) el.classList.add('saude-cal-day--selecionado');
    });

    var detalhe  = document.getElementById('calDiaDetalhe');
    var conteudo = document.getElementById('calDiaDetalheConteudo');
    var label    = document.getElementById('calDiaDetalheLabel');
    if (!detalhe) return;
    detalhe.style.display = '';
    conteudo.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.82rem">Carregando...</div>';

    var partes = dataStr.split('-');
    var dt = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
    label.textContent = _diasSemana[dt.getDay()] + ', ' + dt.getDate() + ' de ' +
                        _mesesNomes[dt.getMonth()] + ' de ' + dt.getFullYear();

    fetch('/api/saude/historico/dia?data=' + dataStr)
      .then(function (r) { return r.json(); })
      .then(function (data) { renderizarDiaDetalhe(data); })
      .catch(function () {
        conteudo.innerHTML = '<div class="saude-dia-empty">Erro ao carregar dados</div>';
      });
  };

  function renderizarDiaDetalhe(data) {
    var html = '';

    if (!data.refeicoes_agrupadas || !data.refeicoes_agrupadas.length) {
      html += '<div class="saude-dia-empty">' +
              '<i class="bi bi-calendar-x" style="font-size:1.4rem;display:block;margin-bottom:6px;opacity:.4"></i>' +
              'Nenhuma refeição registrada neste dia</div>';
    } else {
      data.refeicoes_agrupadas.forEach(function (grupo) {
        html += '<div class="saude-dia-refeicao-group">';
        html += '<div class="saude-dia-refeicao-tipo">' + escapeHtml(grupo.label) +
                (grupo.calorias_total ? ' · ' + grupo.calorias_total + ' kcal' : '') + '</div>';
        grupo.registros.forEach(function (r) {
          html += '<div class="saude-dia-refeicao-item">' +
                  '<span>' + escapeHtml(r.descricao || 'Refeição') + '</span>' +
                  '<span style="font-weight:700;color:#16a34a;white-space:nowrap;flex-shrink:0">' +
                  (r.calorias ? r.calorias + ' kcal' : '') + '</span></div>';
        });
        html += '</div>';
      });

      html += '<div style="font-size:.85rem;font-weight:800;color:var(--text);margin-top:4px">Total: ' + data.calorias_dia + ' kcal</div>';

      var m = data.macros;
      if (m && (m.proteinas_g || m.carboidratos_g || m.gorduras_g)) {
        html += '<div class="saude-dia-macros-row">' +
                '<div class="saude-dia-macro"><div class="saude-dia-macro-val">' + (m.proteinas_g || 0) + 'g</div><div class="saude-dia-macro-label">Proteínas</div></div>' +
                '<div class="saude-dia-macro"><div class="saude-dia-macro-val">' + (m.carboidratos_g || 0) + 'g</div><div class="saude-dia-macro-label">Carbos</div></div>' +
                '<div class="saude-dia-macro"><div class="saude-dia-macro-val">' + (m.gorduras_g || 0) + 'g</div><div class="saude-dia-macro-label">Gorduras</div></div>' +
                '</div>';
      }
    }

    html += '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">' +
            '<div style="font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Água</div>';
    if (data.agua && data.agua.total_ml > 0) {
      var aguaLabel = data.agua.total_ml >= 1000
        ? (data.agua.total_ml / 1000).toFixed(1) + ' L'
        : data.agua.total_ml + ' ml';
      html += '<div style="font-size:1rem;font-weight:800;color:#2563eb">' + aguaLabel + '</div>';
    } else {
      html += '<div style="color:var(--text-muted);font-size:.82rem">Não registrado</div>';
    }
    html += '</div>';

    var conteudo = document.getElementById('calDiaDetalheConteudo');
    if (conteudo) conteudo.innerHTML = html;
  }

  /* ========== EXERCÍCIOS ========== */
  var _exTipoIcons = {
    cardio:        'bi-person-running',
    musculacao:    'bi-trophy',
    flexibilidade: 'bi-arrow-repeat',
    esporte:       'bi-bicycle',
    outro:         'bi-activity',
  };
  var _exTipoLabels = {
    cardio: 'Cardio', musculacao: 'Musculação',
    flexibilidade: 'Flexibilidade', esporte: 'Esporte', outro: 'Outro',
  };
  var _exIntLabels = { leve: 'Leve', moderado: 'Moderado', intenso: 'Intenso' };

  window.abrirModalExercicio = function () {
    document.getElementById('exTipo').value = 'cardio';
    document.getElementById('exNome').value = '';
    document.getElementById('exDuracao').value = '';
    document.getElementById('exCalorias').value = '';
    document.getElementById('exIntensidade').value = '';
    document.getElementById('exObservacao').value = '';
    document.getElementById('modalExercicio').style.display = 'flex';
    setTimeout(function () { document.getElementById('exNome').focus(); }, 100);
  };

  window.fecharModalExercicio = function (evt) {
    if (!evt || evt.target === document.getElementById('modalExercicio')) {
      document.getElementById('modalExercicio').style.display = 'none';
    }
  };

  window.salvarExercicio = function () {
    var tipo = document.getElementById('exTipo').value;
    var nome = document.getElementById('exNome').value.trim();
    var duracao = document.getElementById('exDuracao').value || null;
    var calorias = document.getElementById('exCalorias').value || null;
    var intensidade = document.getElementById('exIntensidade').value || null;
    var obs = document.getElementById('exObservacao').value.trim() || null;

    if (!nome) { alert('Informe o nome do exercício'); return; }

    var btn = document.getElementById('btnSalvarExercicio');
    btn.disabled = true;

    fetch('/api/saude/exercicio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: tipo, nome: nome,
        duracao_min: duracao ? parseInt(duracao, 10) : null,
        calorias_gasto: calorias ? parseInt(calorias, 10) : null,
        intensidade: intensidade,
        observacao: obs,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (data.error) { alert(data.error); return; }
        document.getElementById('modalExercicio').style.display = 'none';
        adicionarExercicioUI(data);
      })
      .catch(function () { btn.disabled = false; alert('Erro ao salvar'); });
  };

  function adicionarExercicioUI(ex) {
    var empty = document.getElementById('exercicioEmpty');
    if (empty) empty.style.display = 'none';

    var duracao = ex.duracao_min || 0;
    var cals = ex.calorias_gasto || 0;
    _EX_COUNT++;
    _EX_MIN_TOTAL += duracao;
    _EX_KCAL_TOTAL += cals;

    var meta = _exTipoLabels[ex.tipo] || ex.tipo;
    if (duracao) meta += ' · ' + duracao + 'min';
    if (ex.intensidade) meta += ' · ' + (_exIntLabels[ex.intensidade] || ex.intensidade);
    if (cals) meta += ' · ' + cals + ' kcal';

    var item = document.createElement('div');
    item.className = 'saude-exercicio-item';
    item.id = 'ex-' + ex.id;
    item.dataset.duracao = duracao;
    item.dataset.calorias = cals;
    item.innerHTML =
      '<div class="saude-exercicio-icon saude-exercicio-icon--' + ex.tipo + '">' +
      '<i class="bi ' + (_exTipoIcons[ex.tipo] || 'bi-activity') + '"></i></div>' +
      '<div class="saude-exercicio-info">' +
      '<div class="saude-exercicio-nome">' + ex.nome + '</div>' +
      '<div class="saude-exercicio-meta">' + meta + '</div></div>' +
      '<button class="saude-exercicio-del" onclick="deletarExercicio(' + ex.id + ')" title="Remover">' +
      '<i class="bi bi-x"></i></button>';

    var list = document.getElementById('exercicioList');
    list.insertBefore(item, list.querySelector('.saude-exercicio-empty') || null);

    atualizarResumoExercicio();
  }

  window.deletarExercicio = function (id) {
    fetch('/api/saude/exercicio/' + id, { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        var el = document.getElementById('ex-' + id);
        if (el) {
          _EX_MIN_TOTAL -= parseInt(el.dataset.duracao || '0', 10);
          _EX_KCAL_TOTAL -= parseInt(el.dataset.calorias || '0', 10);
          _EX_COUNT = Math.max(0, _EX_COUNT - 1);
          el.remove();
        }
        if (_EX_COUNT === 0) {
          var empty = document.getElementById('exercicioEmpty');
          if (empty) empty.style.display = '';
        }
        atualizarResumoExercicio();
      });
  };

  function atualizarResumoExercicio() {
    var resumo = document.getElementById('exercicioResumo');
    if (!resumo) return;
    if (_EX_COUNT === 0) {
      resumo.textContent = 'Nenhum exercício registrado hoje';
      return;
    }
    var txt = _EX_COUNT + ' exercício(s)';
    if (_EX_MIN_TOTAL > 0) txt += ' · ' + _EX_MIN_TOTAL + 'min';
    if (_EX_KCAL_TOTAL > 0) txt += ' · ' + _EX_KCAL_TOTAL + ' kcal';
    resumo.textContent = txt;
  }

  /* ========== CATÁLOGO DE EXERCÍCIOS — BUSCA NO MODAL ========== */
  var _buscaExTimer = null;

  window.buscarExerciciosCatalogo = function (query) {
    clearTimeout(_buscaExTimer);
    var dropdown = document.getElementById('exercicioDropdown');
    if (!query || query.length < 2) { dropdown.style.display = 'none'; return; }
    _buscaExTimer = setTimeout(function () {
      fetch('/api/saude/exercicios/catalogo/buscar?q=' + encodeURIComponent(query))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.length) { dropdown.style.display = 'none'; return; }
          var html = '';
          data.forEach(function (ex) {
            var meta = _exTipoLabels[ex.tipo] || ex.tipo;
            if (ex.grupo_muscular) meta += ' · ' + ex.grupo_muscular;
            html += '<div class="saude-produto-dropdown-item" onclick="selecionarExercicioCatalogo(' + JSON.stringify(ex).replace(/"/g, '&quot;') + ')">' +
              '<strong>' + escHtmlEx(ex.nome) + '</strong>' +
              '<span style="font-size:.75rem;color:var(--text-muted);margin-left:6px">' + escHtmlEx(meta) + '</span>' +
              '</div>';
          });
          dropdown.innerHTML = html;
          dropdown.style.display = '';
        })
        .catch(function () { dropdown.style.display = 'none'; });
    }, 280);
  };

  window.selecionarExercicioCatalogo = function (ex) {
    document.getElementById('exNome').value = ex.nome;
    document.getElementById('exTipo').value = ex.tipo || 'outro';
    if (ex.duracao_padrao) document.getElementById('exDuracao').value = ex.duracao_padrao;
    if (ex.calorias_est)   document.getElementById('exCalorias').value = ex.calorias_est;
    document.getElementById('buscaExercicio').value = ex.nome;
    document.getElementById('exercicioDropdown').style.display = 'none';
  };

  document.addEventListener('click', function (e) {
    var drop = document.getElementById('exercicioDropdown');
    var wrap = document.querySelector('.saude-produto-search-wrap');
    if (drop && wrap && !wrap.contains(e.target)) {
      drop.style.display = 'none';
    }
  });

  /* ========== CATÁLOGO DE EXERCÍCIOS — TAB ========== */
  var _todosCatExercicios = [];

  function carregarExerciciosCatalogo() {
    fetch('/api/saude/exercicios/catalogo')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _exerciciosCatCarregados = true;
        _todosCatExercicios = data;
        renderizarCatalogoExercicios(data);
      })
      .catch(function () {});
  }

  function renderizarCatalogoExercicios(lista) {
    var container = document.getElementById('exercicioLista');
    if (!lista || lista.length === 0) {
      container.innerHTML =
        '<div class="saude-produto-lista-vazio">' +
        '<i class="bi bi-activity" style="font-size:1.6rem;color:var(--text-muted)"></i>' +
        '<div>Nenhum exercício no catálogo</div>' +
        '<div style="font-size:.78rem">Importe os padrões ou adicione exercícios personalizados</div>' +
        '</div>';
      return;
    }

    var grupos = {};
    lista.forEach(function (ex) {
      var chave = ex.grupo_muscular || (_exTipoLabels[ex.tipo] || ex.tipo);
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(ex);
    });

    var html = '';
    Object.keys(grupos).sort().forEach(function (grupo) {
      html += '<div class="saude-ex-cat-grupo"><div class="saude-ex-cat-grupo-titulo">' + escHtmlEx(grupo) + '</div>';
      grupos[grupo].forEach(function (ex) {
        var meta = [];
        if (ex.duracao_padrao) meta.push(ex.duracao_padrao + 'min');
        if (ex.calorias_est)   meta.push('~' + ex.calorias_est + ' kcal');
        html += '<div class="saude-produto-item" id="cat-ex-' + ex.id + '">' +
          '<div class="saude-produto-item-info">' +
          '<div class="saude-produto-item-nome">' + escHtmlEx(ex.nome) + '</div>' +
          '<div class="saude-produto-item-meta">' + escHtmlEx(_exTipoLabels[ex.tipo] || ex.tipo) +
          (meta.length ? ' · ' + meta.join(' · ') : '') + '</div>' +
          '</div>' +
          '<button class="saude-produto-item-del" onclick="deletarExCatalogo(' + ex.id + ')" title="Remover"><i class="bi bi-trash3"></i></button>' +
          '</div>';
      });
      html += '</div>';
    });
    container.innerHTML = html;
  }

  window.filtrarExerciciosTab = function (query) {
    if (!query) { renderizarCatalogoExercicios(_todosCatExercicios); return; }
    var q = query.toLowerCase();
    var filtrado = _todosCatExercicios.filter(function (ex) {
      return ex.nome.toLowerCase().includes(q) ||
        (ex.grupo_muscular || '').toLowerCase().includes(q) ||
        (_exTipoLabels[ex.tipo] || '').toLowerCase().includes(q);
    });
    renderizarCatalogoExercicios(filtrado);
  };

  window.importarExerciciosPadrao = function (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass"></i> Importando...';
    fetch('/api/saude/exercicios/catalogo/importar', { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-cloud-download"></i> Importar padrão';
        _exerciciosCatCarregados = false;
        carregarExerciciosCatalogo();
      })
      .catch(function () {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-cloud-download"></i> Importar padrão';
      });
  };

  window.deletarExCatalogo = function (id) {
    fetch('/api/saude/exercicios/catalogo/' + id, { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        _todosCatExercicios = _todosCatExercicios.filter(function (e) { return e.id !== id; });
        var el = document.getElementById('cat-ex-' + id);
        if (el) el.remove();
        var filtro = document.getElementById('filtroExercicios');
        if (filtro && filtro.value) filtrarExerciciosTab(filtro.value);
      });
  };

  /* ========== MODAL NOVO EXERCÍCIO CATÁLOGO ========== */
  window.abrirModalNovoExCatalogo = function () {
    document.getElementById('catExNome').value = '';
    document.getElementById('catExTipo').value = 'musculacao';
    document.getElementById('catExGrupo').value = '';
    document.getElementById('catExDuracao').value = '';
    document.getElementById('catExCalorias').value = '';
    document.getElementById('modalNovoExCatalogo').style.display = 'flex';
    setTimeout(function () { document.getElementById('catExNome').focus(); }, 100);
  };

  window.fecharModalNovoExCatalogo = function (evt) {
    if (!evt || evt.target === document.getElementById('modalNovoExCatalogo')) {
      document.getElementById('modalNovoExCatalogo').style.display = 'none';
    }
  };

  window.salvarNovoExCatalogo = function () {
    var nome = document.getElementById('catExNome').value.trim();
    if (!nome) { alert('Informe o nome do exercício'); return; }
    var btn = document.getElementById('btnSalvarExCatalogo');
    btn.disabled = true;
    fetch('/api/saude/exercicios/catalogo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome,
        tipo: document.getElementById('catExTipo').value,
        grupo_muscular: document.getElementById('catExGrupo').value.trim() || null,
        duracao_padrao: document.getElementById('catExDuracao').value ? parseInt(document.getElementById('catExDuracao').value, 10) : null,
        calorias_est:   document.getElementById('catExCalorias').value ? parseInt(document.getElementById('catExCalorias').value, 10) : null,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (data.error) { alert(data.error); return; }
        document.getElementById('modalNovoExCatalogo').style.display = 'none';
        _todosCatExercicios.push(data);
        renderizarCatalogoExercicios(_todosCatExercicios);
      })
      .catch(function () { btn.disabled = false; alert('Erro ao salvar'); });
  };

  function escHtmlEx(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
