(function () {
  var TIPO_LABELS = {
    reclamacao: 'Reclamação', sugestao: 'Sugestão', elogio: 'Elogio',
    denuncia: 'Denúncia', solicitacao: 'Solicitação',
  };
  var STATUS_LABELS = { pendente: 'Pendente', lido: 'Lido', resolvido: 'Resolvido' };

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ===== TABS =====
  var tabs = document.querySelectorAll('.sup-tab');
  var panels = { ouvidoria: document.getElementById('panelOuvidoria'), chat: document.getElementById('panelChat') };
  var activeTab = 'ouvidoria';

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeTab = this.dataset.tab;
      tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === activeTab); });
      Object.keys(panels).forEach(function (k) {
        panels[k].style.display = k === activeTab ? '' : 'none';
      });
      if (activeTab === 'chat' && !chatLoaded) { loadChat(); chatLoaded = true; }
    });
  });

  // ===== OUVIDORIA =====
  function renderTickets(list) {
    var el = document.getElementById('ouvidoriaHistorico');
    if (!list.length) {
      el.innerHTML = '<div class="sup-empty"><i class="bi bi-inbox"></i>Nenhum envio ainda.</div>';
      return;
    }
    el.innerHTML = list.map(function (t) {
      var tipoLabel = TIPO_LABELS[t.tipo] || t.tipo;
      var statusLabel = STATUS_LABELS[t.status] || t.status;
      var statusCls = t.status !== 'pendente' ? 'sup-ticket-status--' + t.status : '';
      var respostaHtml = '';
      if (t.resposta) {
        respostaHtml = '<div class="sup-ticket-resposta">'
          + '<div class="sup-ticket-resposta-label"><i class="bi bi-reply-fill me-1"></i>Resposta do suporte</div>'
          + '<div class="sup-ticket-resposta-msg">' + esc(t.resposta) + '</div>'
          + '<div class="sup-ticket-resposta-date">' + formatDate(t.respondido_em) + '</div>'
          + '</div>';
      }
      return '<div class="sup-ticket">'
        + '<div class="sup-ticket-head">'
        + '<span class="sup-ticket-tipo sup-ticket-tipo--' + esc(t.tipo) + '">' + esc(tipoLabel) + '</span>'
        + '<span class="sup-ticket-date">' + formatDate(t.criado_em) + '</span>'
        + '</div>'
        + '<div class="sup-ticket-msg">' + esc(t.mensagem) + '</div>'
        + respostaHtml
        + '<span class="sup-ticket-status ' + statusCls + '">' + esc(statusLabel) + '</span>'
        + '</div>';
    }).join('');
  }

  async function loadTickets() {
    try {
      var r = await fetch('/api/suporte/ouvidoria');
      var data = await r.json();
      renderTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      document.getElementById('ouvidoriaHistorico').innerHTML =
        '<div class="sup-empty"><i class="bi bi-exclamation-circle"></i>Erro ao carregar histórico.</div>';
    }
  }

  document.getElementById('btnEnviarOuvidoria').addEventListener('click', async function () {
    var tipo = (document.querySelector('input[name="ouvidoriaTipo"]:checked') || {}).value;
    var mensagem = document.getElementById('ouvidoriaMensagem').value.trim();
    var fb = document.getElementById('ouvidoriaFeedback');
    fb.style.display = 'none';
    if (!tipo) { fb.className = 'sup-feedback err'; fb.textContent = 'Selecione o tipo de mensagem.'; fb.style.display = ''; return; }
    if (!mensagem) { fb.className = 'sup-feedback err'; fb.textContent = 'Escreva sua mensagem.'; fb.style.display = ''; return; }
    var btn = this;
    btn.disabled = true;
    try {
      var r = await fetch('/api/suporte/ouvidoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: tipo, mensagem: mensagem }),
      });
      if (r.ok) {
        fb.className = 'sup-feedback ok';
        fb.textContent = 'Mensagem enviada com sucesso. Nossa equipe vai analisá-la em breve.';
        fb.style.display = '';
        document.getElementById('ouvidoriaMensagem').value = '';
        document.querySelector('input[name="ouvidoriaTipo"]:checked').checked = false;
        loadTickets();
      } else {
        var err = await r.json();
        fb.className = 'sup-feedback err';
        fb.textContent = err.error || 'Erro ao enviar.';
        fb.style.display = '';
      }
    } catch (e) {
      fb.className = 'sup-feedback err'; fb.textContent = 'Erro de conexão.'; fb.style.display = '';
    }
    finally { btn.disabled = false; }
  });

  loadTickets();

  // ===== CHAT =====
  var chatLoaded = false;
  var lastId = 0;
  var pollTimer = null;

  function renderBubble(msg) {
    var isMine = msg.remetente === 'user';
    var cls = isMine ? 'sup-bubble--user' : 'sup-bubble--especialista';
    var who = isMine ? 'Você' : 'Especialista';
    return '<div class="sup-bubble ' + cls + '">'
      + esc(msg.mensagem)
      + '<div class="sup-bubble-meta">' + who + ' · ' + formatDate(msg.criado_em) + '</div>'
      + '</div>';
  }

  function appendMessages(msgs) {
    var container = document.getElementById('chatMessages');
    if (!msgs.length) return;
    msgs.forEach(function (m) {
      var div = document.createElement('div');
      div.innerHTML = renderBubble(m);
      container.appendChild(div.firstChild);
      if (m.id > lastId) lastId = m.id;
    });
    container.scrollTop = container.scrollHeight;
  }

  async function loadChat() {
    var container = document.getElementById('chatMessages');
    try {
      var r = await fetch('/api/suporte/chat?after_id=0');
      var data = await r.json();
      container.innerHTML = '';
      if (!Array.isArray(data) || !data.length) {
        container.innerHTML = '<div class="sup-empty"><i class="bi bi-chat-dots"></i>Nenhuma mensagem ainda.<br>Diga olá para o especialista!</div>';
      } else {
        appendMessages(data);
      }
    } catch (e) {
      container.innerHTML = '<div class="sup-empty"><i class="bi bi-exclamation-circle"></i>Erro ao carregar chat.</div>';
    }
    startPolling();
  }

  async function pollNewMessages() {
    if (activeTab !== 'chat') return;
    try {
      var r = await fetch('/api/suporte/chat?after_id=' + lastId);
      var data = await r.json();
      if (Array.isArray(data) && data.length) appendMessages(data);
    } catch (e) {}
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(pollNewMessages, 4000);
  }

  var chatInput = document.getElementById('chatInput');
  var btnChat = document.getElementById('btnEnviarChat');

  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      btnChat.click();
    }
  });

  chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  btnChat.addEventListener('click', async function () {
    var mensagem = chatInput.value.trim();
    if (!mensagem) return;
    btnChat.disabled = true;
    chatInput.value = '';
    chatInput.style.height = 'auto';
    try {
      var r = await fetch('/api/suporte/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: mensagem }),
      });
      if (r.ok) {
        var msg = await r.json();
        var container = document.getElementById('chatMessages');
        if (container.querySelector('.sup-empty')) container.innerHTML = '';
        appendMessages([msg]);
      }
    } catch (e) {}
    finally { btnChat.disabled = false; chatInput.focus(); }
  });
})();
