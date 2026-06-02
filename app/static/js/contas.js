(function () {
  const INSTITUICOES = [
    { slug: 'nubank',       nome: 'Nubank',              cor: '#8A05BE', letra: 'N', svg: 'nubank.svg' },
    { slug: 'itau',         nome: 'Itaú',                cor: '#EC7000', letra: 'I', svg: 'itau.svg' },
    { slug: 'bradesco',     nome: 'Bradesco',            cor: '#CC092F', letra: 'B', svg: 'bradesco.svg' },
    { slug: 'bb',           nome: 'Banco do Brasil',     cor: '#F9D600', letra: 'B', corLetra: '#000', svg: 'banco-do-brasil.svg' },
    { slug: 'caixa',        nome: 'Caixa Econômica',     cor: '#006CA8', letra: 'C', svg: 'caixa.svg' },
    { slug: 'caixa-tem',    nome: 'Caixa Tem',           cor: '#006CA8', letra: 'C', svg: 'caixa-tem.svg' },
    { slug: 'santander',    nome: 'Santander',           cor: '#EC0000', letra: 'S', svg: 'santander.svg' },
    { slug: 'inter',        nome: 'Inter',               cor: '#FF7A00', letra: 'I', svg: 'inter.svg' },
    { slug: 'c6',           nome: 'C6 Bank',             cor: '#242424', letra: 'C', svg: 'c6.svg' },
    { slug: 'picpay',       nome: 'PicPay',              cor: '#11C76F', letra: 'P', svg: 'picpay.svg' },
    { slug: 'mercadopago',  nome: 'Mercado Pago',        cor: '#009EE3', letra: 'M', svg: 'mercado-pago.svg' },
    { slug: 'xp',           nome: 'XP Investimentos',    cor: '#000000', letra: 'X', svg: 'xp.svg' },
    { slug: 'btg',          nome: 'BTG Pactual',         cor: '#003399', letra: 'B', svg: 'btg-pactual.svg' },
    { slug: 'sicoob',       nome: 'Sicoob',              cor: '#007A3D', letra: 'S' },
    { slug: 'sicredi',      nome: 'Sicredi',             cor: '#006633', letra: 'S', svg: 'sicredi.svg' },
    { slug: 'neon',         nome: 'Neon',                cor: '#00CFFF', letra: 'N', corLetra: '#000', svg: 'neon.svg' },
    { slug: 'next',         nome: 'Next',                cor: '#00CC99', letra: 'N', corLetra: '#000', svg: 'next.svg' },
    { slug: 'wise',         nome: 'Wise',                cor: '#9FE870', letra: 'W', corLetra: '#000' },
    { slug: 'paypal',       nome: 'PayPal',              cor: '#003087', letra: 'P', svg: 'paypal.svg' },
    { slug: 'iti',          nome: 'iti (Itaú)',           cor: '#FF6600', letra: 'i', svg: 'iti.svg' },
    { slug: 'will',         nome: 'Will Bank',           cor: '#FFCC00', letra: 'W', corLetra: '#000', svg: 'will-bank.svg' },
    { slug: 'bs2',          nome: 'BS2',                 cor: '#0066CC', letra: 'B' },
    { slug: 'original',     nome: 'Banco Original',      cor: '#00A650', letra: 'O', svg: 'original.svg' },
    { slug: 'sofisa',       nome: 'Sofisa Direto',       cor: '#E2001A', letra: 'S', svg: 'sofisa.svg' },
    { slug: 'banrisul',     nome: 'Banrisul',            cor: '#005CA9', letra: 'B', svg: 'banrisul.svg' },
    { slug: 'bv',           nome: 'BV',                  cor: '#004B8D', letra: 'B', svg: 'bv.svg' },
    { slug: 'bmg',          nome: 'Banco BMG',           cor: '#E30613', letra: 'B', svg: 'bmg.svg' },
    { slug: 'pan',          nome: 'Banco Pan',           cor: '#FFD100', letra: 'P', corLetra: '#000', svg: 'pan.svg' },
    { slug: 'daycoval',     nome: 'Daycoval',            cor: '#005A9E', letra: 'D', svg: 'daycoval.svg' },
    { slug: 'mercantil',    nome: 'Mercantil',           cor: '#004A9F', letra: 'M', svg: 'mercantil.svg' },
    { slug: 'digio',        nome: 'Digio',               cor: '#0077CC', letra: 'D', svg: 'digio.svg' },
    { slug: 'stone',        nome: 'Stone',               cor: '#00A868', letra: 'S', svg: 'stone.svg' },
    { slug: 'pagseguro',    nome: 'PagSeguro',           cor: '#FFC72C', letra: 'P', corLetra: '#000', svg: 'pagseguro.svg' },
    { slug: 'nu-invest',    nome: 'Nu Invest',           cor: '#8A05BE', letra: 'N', svg: 'nu-invest.svg' },
    { slug: 'nomad',        nome: 'Nomad',               cor: '#1A1A2E', letra: 'N', svg: 'nomad.svg' },
    { slug: 'zrobank',      nome: 'ZRO Bank',            cor: '#0055B8', letra: 'Z', svg: 'zrobank.svg' },
    { slug: 'n26',          nome: 'N26',                 cor: '#000000', letra: 'N', svg: 'n26.svg' },
    { slug: 'warren',       nome: 'Warren',              cor: '#4C12A1', letra: 'W', svg: 'warren.svg' },
    { slug: 'toro',         nome: 'Toro',                cor: '#FF6B00', letra: 'T', svg: 'toro.svg' },
    { slug: 'clear',        nome: 'Clear',               cor: '#00C4B3', letra: 'C', svg: 'clear.svg' },
    { slug: 'rico',         nome: 'Rico',                cor: '#00B386', letra: 'R', svg: 'rico.svg' },
    { slug: 'genial',       nome: 'Genial Investimentos', cor: '#FF6600', letra: 'G', svg: 'genial-investimentos.svg' },
    { slug: 'avenue',       nome: 'Avenue',              cor: '#0033A0', letra: 'A', svg: 'avenue.svg' },
    { slug: 'ame',          nome: 'Ame Digital',         cor: '#FF0064', letra: 'A', svg: 'ame.svg' },
    { slug: 'amazon',       nome: 'Amazon Pay',          cor: '#FF9900', letra: 'A', corLetra: '#000', svg: 'amazon.svg' },
    { slug: 'magalu',       nome: 'Magalu',              cor: '#0086FF', letra: 'M', svg: 'magalu.svg' },
    { slug: 'samsung',      nome: 'Samsung Pay',         cor: '#1428A0', letra: 'S', svg: 'samsung.svg' },
    { slug: 'infinitepay',  nome: 'InfinitePay',         cor: '#00BCD4', letra: 'I', svg: 'infinitepay.svg' },
    { slug: 'ton',          nome: 'Ton',                 cor: '#00C853', letra: 'T', svg: 'ton.svg' },
    { slug: 'fitbank',      nome: 'FitBank',             cor: '#1A237E', letra: 'F', svg: 'fitbank.svg' },
    { slug: 'cora',         nome: 'Cora',                cor: '#FF4C8B', letra: 'C', svg: 'cora.svg' },
    { slug: 'dm',           nome: 'DM Financeira',       cor: '#004B87', letra: 'D', svg: 'dm.svg' },
    { slug: 'flash',        nome: 'Flash',               cor: '#F24E1E', letra: 'F', svg: 'flash.svg' },
    { slug: 'caju',         nome: 'Caju',                cor: '#FF6B35', letra: 'C', svg: 'caju.svg' },
    { slug: 'binance',      nome: 'Binance',             cor: '#F3BA2F', letra: 'B', corLetra: '#000', svg: 'binance.svg' },
    { slug: 'metamask',     nome: 'MetaMask',            cor: '#E2761B', letra: 'M', svg: 'metamask.svg' },
    { slug: 'bitybank',     nome: 'Bitybank',            cor: '#0066FF', letra: 'B', svg: 'bitybank.svg' },
    { slug: 'outro',        nome: 'Outro',               cor: '#64748b', icone: 'bi-wallet2', corLetra: '#fff' },
  ];

  const instMap = {};
  INSTITUICOES.forEach(i => { instMap[i.slug] = i; });

  let categoriasContas = [];
  let instSelecionada = 'outro';

  const modalEl = document.getElementById('modalConta');
  const modal = new bootstrap.Modal(modalEl);

  async function loadCategorias() {
    const r = await fetch('/api/config/categorias?tipo=conta');
    const data = await r.json();
    categoriasContas = Array.isArray(data) ? data : [];
    renderCategoriaSelect(null);
  }

  function renderCategoriaSelect(selecionadoId) {
    const sel = document.getElementById('contaCategoria');
    sel.innerHTML = '<option value="">Selecionar tipo...</option>' +
      categoriasContas.map(c =>
        `<option value="${c.id}" ${String(c.id) === String(selecionadoId) ? 'selected' : ''}>${esc(c.nome)}</option>`
      ).join('');
  }

  async function loadContas() {
    try {
      const r = await fetch('/api/contas');
      const data = await r.json();
      document.getElementById('contasLoading').classList.add('d-none');
      if (!Array.isArray(data) || !data.length) {
        document.getElementById('contasVazio').classList.remove('d-none');
        document.getElementById('contasList').classList.add('d-none');
        return;
      }
      document.getElementById('contasVazio').classList.add('d-none');
      document.getElementById('contasList').classList.remove('d-none');
      renderContas(data);
    } catch {
      document.getElementById('contasLoading').innerHTML =
        '<div class="alert alert-danger m-3">Erro ao carregar contas.</div>';
    }
  }

  function renderContas(contas) {
    document.getElementById('contasItens').innerHTML = contas.map(c => {
      const inst = instMap[c.instituicao] || instMap['outro'];
      const saldo = formatMoney(parseFloat(c.saldo_inicial) || 0);
      const logoHtml = inst.svg
        ? `<div class="conta-logo-circle" style="background:#f8fafc"><img src="/static/images/bank-icons-logos-svg/${inst.svg}" alt="${esc(inst.nome)}" style="width:65%;height:65%;object-fit:contain"></div>`
        : inst.icone
          ? `<div class="conta-logo-circle" style="background:${inst.cor};color:${inst.corLetra || '#fff'}"><i class="bi ${inst.icone}" style="font-size:1.1rem"></i></div>`
          : `<div class="conta-logo-circle" style="background:${inst.cor};color:${inst.corLetra || '#fff'}">${inst.letra}</div>`;
      return `<div class="conta-row" onclick="abrirEditarConta(${c.id})">
        ${logoHtml}
        <div class="conta-info">
          <div class="conta-tipo">${esc(c.tipo_nome || 'Conta')}</div>
          <div class="conta-nome-texto">${esc(c.nome)}</div>
        </div>
        <div class="conta-saldo-valor">${saldo}</div>
        <i class="bi bi-chevron-right conta-chevron"></i>
      </div>`;
    }).join('');
  }

  function instLogoHtml(inst, cls) {
    if (inst && inst.svg) {
      return `<div class="${cls}" style="background:#f8fafc"><img src="/static/images/bank-icons-logos-svg/${esc(inst.svg)}" alt="${esc(inst.nome)}" style="width:70%;height:70%;object-fit:contain"></div>`;
    }
    if (inst && inst.icone) {
      return `<div class="${cls}" style="background:${inst.cor};color:${inst.corLetra || '#fff'}"><i class="bi ${inst.icone}" style="font-size:1rem"></i></div>`;
    }
    return `<div class="${cls}" style="background:${inst.cor};color:${inst.corLetra || '#fff'}">${inst.letra}</div>`;
  }

  function buildInstDropdown(filtro) {
    const f = (filtro || '').toLowerCase();
    const lista = INSTITUICOES.filter(i =>
      !f || i.nome.toLowerCase().includes(f) || i.slug.includes(f)
    );
    document.getElementById('instList').innerHTML = lista.map(i =>
      `<div class="inst-opt ${i.slug === instSelecionada ? 'selected' : ''}" data-slug="${i.slug}">
        ${instLogoHtml(i, 'inst-logo-mini')}
        ${esc(i.nome)}
      </div>`
    ).join('');
    document.querySelectorAll('.inst-opt').forEach(el => {
      el.addEventListener('click', () => selectInst(el.dataset.slug));
    });
  }

  function applyInstToPreview(inst) {
    const logoEl = document.getElementById('instLogoMini');
    if (inst && inst.svg) {
      logoEl.style.background = '#f8fafc';
      logoEl.style.color = '';
      logoEl.innerHTML = `<img src="/static/images/bank-icons-logos-svg/${esc(inst.svg)}" alt="${esc(inst.nome)}" style="width:70%;height:70%;object-fit:contain">`;
    } else if (inst && inst.icone) {
      logoEl.style.background = inst.cor;
      logoEl.style.color = inst.corLetra || '#fff';
      logoEl.innerHTML = `<i class="bi ${inst.icone}" style="font-size:1rem"></i>`;
    } else {
      logoEl.style.background = inst ? inst.cor : '#64748b';
      logoEl.style.color = (inst && inst.corLetra) || '#fff';
      logoEl.textContent = inst ? inst.letra : '?';
    }
  }

  function selectInst(slug) {
    instSelecionada = slug;
    document.getElementById('contaInstituicao').value = slug;
    const inst = instMap[slug] || instMap['outro'];
    applyInstToPreview(inst);
    document.getElementById('instNomeLabel').textContent = inst.nome;
    document.getElementById('instDropdown').classList.add('d-none');
    document.getElementById('instSearch').value = '';
  }

  document.getElementById('instPreview').addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.getElementById('instDropdown');
    const isOpen = !dd.classList.contains('d-none');
    if (isOpen) {
      dd.classList.add('d-none');
    } else {
      buildInstDropdown('');
      dd.classList.remove('d-none');
      document.getElementById('instSearch').focus();
    }
  });

  document.getElementById('instSearch').addEventListener('input', (e) => {
    buildInstDropdown(e.target.value);
  });

  document.addEventListener('click', () => {
    document.getElementById('instDropdown').classList.add('d-none');
  });

  document.getElementById('instDropdown').addEventListener('click', e => e.stopPropagation());

  function abrirNovaConta() {
    document.getElementById('contaEditId').value = '';
    document.getElementById('contaNome').value = '';
    document.getElementById('contaSaldo').value = '';
    document.getElementById('modalContaTitulo').textContent = 'Nova Conta';
    document.getElementById('btnDeletarConta').classList.add('d-none');
    selectInst('outro');
    renderCategoriaSelect(null);
    modal.show();
  }

  window.abrirEditarConta = function (id) {
    fetch('/api/contas').then(r => r.json()).then(contas => {
      const c = contas.find(x => x.id === id);
      if (!c) return;
      document.getElementById('contaEditId').value = c.id;
      document.getElementById('contaNome').value = c.nome;
      document.getElementById('contaSaldo').value = formatDecimal(parseFloat(c.saldo_inicial) || 0);
      document.getElementById('modalContaTitulo').textContent = 'Editar Conta';
      document.getElementById('btnDeletarConta').classList.remove('d-none');
      selectInst(c.instituicao || 'outro');
      renderCategoriaSelect(c.categoria_id);
      modal.show();
    });
  };

  document.getElementById('btnNovaContaFab').addEventListener('click', abrirNovaConta);

  document.getElementById('btnSalvarConta').addEventListener('click', async () => {
    const id = document.getElementById('contaEditId').value;
    const nome = document.getElementById('contaNome').value.trim();
    const instituicao = document.getElementById('contaInstituicao').value;
    const categoria_id = document.getElementById('contaCategoria').value || null;
    const saldo_inicial = document.getElementById('contaSaldo').value;

    if (!nome) {
      document.getElementById('contaNome').focus();
      return;
    }

    const url = id ? `/api/contas/${id}` : '/api/contas';
    const method = id ? 'PUT' : 'POST';

    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, instituicao, categoria_id, saldo_inicial }),
    });

    if (r.ok) {
      modal.hide();
      loadContas();
    }
  });

  document.getElementById('btnDeletarConta').addEventListener('click', async () => {
    const id = document.getElementById('contaEditId').value;
    if (!id || !confirm('Excluir esta conta?')) return;
    await fetch(`/api/contas/${id}`, { method: 'DELETE' });
    modal.hide();
    loadContas();
  });

  function formatMoney(v) {
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDecimal(v) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  loadCategorias();
  loadContas();
})();
