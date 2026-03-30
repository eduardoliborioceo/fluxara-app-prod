(function () {
  var log = document.getElementById('diagLog');
  var browserPanel = document.getElementById('browserPanel');
  var statusPanel = document.getElementById('statusPanel');
  var sendOutput = document.getElementById('sendOutput');

  function ts() {
    return new Date().toLocaleTimeString('pt-BR');
  }

  function appendLog(msg, level) {
    if (!log) return;
    var colors = { ok: '#4ade80', err: '#f87171', warn: '#facc15', info: '#93c5fd', dim: '#6b7280' };
    var color = colors[level] || colors.info;
    log.innerHTML += '<span style="color:' + colors.dim + '">[' + ts() + ']</span> <span style="color:' + color + '">' + escHtml(msg) + '</span>\n';
    log.scrollTop = log.scrollHeight;
  }

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function badge(ok, text) {
    return '<span class="badge ' + (ok ? 'bg-success' : 'bg-danger') + ' me-1">' + text + '</span>';
  }

  function row(label, content) {
    return '<div class="d-flex align-items-start py-2 border-bottom"><span class="text-muted me-3" style="min-width:160px;font-size:.82rem">' + label + '</span><span class="fw-semibold small">' + content + '</span></div>';
  }

  function getVapidKey() {
    var m = document.querySelector('meta[name="vapid-key"]');
    return m ? m.content : '';
  }

  function urlBase64ToUint8Array(b64) {
    var pad = '='.repeat((4 - (b64.length % 4)) % 4);
    var base = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from([].slice.call(atob(base)).map(function(c) { return c.charCodeAt(0); }));
  }

  async function loadStatus() {
    appendLog('Verificando inscrições no servidor...', 'info');
    try {
      var r = await fetch('/api/push/status');
      var d = await r.json();
      var html = '';
      html += row('VAPID configurado', badge(d.vapid_configured, d.vapid_configured ? 'SIM' : 'NÃO'));
      html += row('Inscrições salvas', '<strong>' + d.subscriptions_saved + '</strong>');
      if (d.endpoints && d.endpoints.length > 0) {
        d.endpoints.forEach(function(ep, i) {
          html += row('Endpoint #' + (i + 1), '<small class="font-monospace text-muted">' + escHtml(ep) + '</small>');
        });
      }
      statusPanel.innerHTML = html || '<p class="text-muted p-3 mb-0">Nenhuma inscrição encontrada.</p>';
      appendLog('Status: vapid=' + d.vapid_configured + ', inscrições=' + d.subscriptions_saved, d.vapid_configured ? 'ok' : 'warn');
    } catch (e) {
      statusPanel.innerHTML = '<div class="alert alert-danger m-3">Erro ao verificar status.</div>';
      appendLog('Erro: ' + e.message, 'err');
    }
  }

  async function runBrowserDiag() {
    appendLog('=== Diagnóstico do navegador ===', 'info');
    var html = '';

    var hasNotif = 'Notification' in window;
    var hasSW = 'serviceWorker' in navigator;
    var hasPush = 'PushManager' in window;

    html += row('API de Notificações', badge(hasNotif, hasNotif ? 'SUPORTADA' : 'NÃO SUPORTADA'));
    html += row('Service Worker', badge(hasSW, hasSW ? 'SUPORTADO' : 'NÃO SUPORTADO'));
    html += row('PushManager', badge(hasPush, hasPush ? 'SUPORTADO' : 'NÃO SUPORTADO'));
    appendLog('APIs: Notification=' + hasNotif + ', SW=' + hasSW + ', Push=' + hasPush, hasNotif && hasSW && hasPush ? 'ok' : 'err');

    if (!hasNotif || !hasSW || !hasPush) {
      browserPanel.innerHTML = html + '<div class="alert alert-danger m-3">Seu navegador não suporta push notifications.</div>';
      return;
    }

    var perm = Notification.permission;
    var permOk = perm === 'granted';
    html += row('Permissão', badge(permOk, perm.toUpperCase()));
    if (perm === 'denied') {
      html += row('', '<span class="text-danger small">Acesse as configurações do site e libere as notificações manualmente.</span>');
    }
    appendLog('Permissão: ' + perm, permOk ? 'ok' : 'warn');

    var vapidKey = getVapidKey();
    html += row('Chave VAPID', vapidKey
      ? badge(true, 'PRESENTE') + ' <small class="text-muted">' + vapidKey.length + ' chars</small>'
      : badge(false, 'AUSENTE') + ' <span class="text-danger small">Configure no painel do administrador</span>');

    try {
      var regs = await navigator.serviceWorker.getRegistrations();
      html += row('Service Workers', '<strong>' + regs.length + '</strong> registrado(s)');
      regs.forEach(function(reg) {
        var state = reg.active ? reg.active.state : reg.installing ? 'installing' : 'sem worker';
        appendLog('SW scope=' + reg.scope + ' state=' + state, reg.active ? 'ok' : 'warn');
      });
    } catch (e) {
      html += row('Service Workers', badge(false, 'ERRO') + ' ' + escHtml(e.message));
    }

    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();

      if (sub) {
        html += row('Subscription push', badge(true, 'ATIVA') + ' <small class="font-monospace text-muted">' + sub.endpoint.slice(0, 60) + '...</small>');
        appendLog('Subscription ativa: ' + sub.endpoint.slice(0, 60) + '...', 'ok');
      } else {
        html += row('Subscription push', badge(false, 'AUSENTE'));
        appendLog('Nenhuma subscription no navegador.', 'warn');

        if (permOk && vapidKey) {
          appendLog('Tentando criar subscription automaticamente...', 'info');
          try {
            var key = urlBase64ToUint8Array(vapidKey);
            var newSub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
            var resp = await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newSub.toJSON()),
            });
            var result = await resp.json();
            if (result.ok) {
              html += row('', badge(true, 'Subscription criada!'));
              appendLog('Subscription criada automaticamente!', 'ok');
            } else {
              html += row('', badge(false, 'Falha ao salvar') + ' <small>' + JSON.stringify(result) + '</small>');
              appendLog('Falha ao salvar: ' + JSON.stringify(result), 'err');
            }
          } catch (e2) {
            html += row('', badge(false, 'Erro') + ' <small>' + escHtml(e2.message) + '</small>');
            appendLog('Erro ao criar subscription: ' + e2.message, 'err');
          }
        } else if (!permOk) {
          appendLog('Permissão não concedida — clique em "Diagnosticar" novamente para solicitar.', 'warn');
          if (Notification.permission === 'default') {
            appendLog('Solicitando permissão...', 'info');
            var p = await Notification.requestPermission();
            appendLog('Permissão: ' + p, p === 'granted' ? 'ok' : 'warn');
            if (p === 'granted') runBrowserDiag();
            return;
          }
        }
      }
    } catch (e) {
      html += row('Subscription push', badge(false, 'ERRO') + ' ' + escHtml(e.message));
      appendLog('Erro: ' + e.message, 'err');
    }

    browserPanel.innerHTML = html;
    appendLog('=== Diagnóstico concluído ===', 'ok');
  }

  async function resetSubscription() {
    appendLog('=== Resetando subscription ===', 'warn');
    try {
      var reg = await navigator.serviceWorker.ready;
      var existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        appendLog('Subscription removida.', 'ok');
      } else {
        appendLog('Nenhuma subscription ativa.', 'warn');
      }
      await runBrowserDiag();
      await loadStatus();
    } catch (e) {
      appendLog('Erro no reset: ' + e.message, 'err');
    }
  }

  async function sendTestNotification() {
    sendOutput.classList.remove('d-none');
    sendOutput.textContent = 'Enviando...';
    appendLog('Enviando notificação de teste...', 'info');
    try {
      var r = await fetch('/api/push/test', { method: 'POST' });
      var d = await r.json();
      sendOutput.textContent = JSON.stringify(d, null, 2);
      if (d.ok) {
        sendOutput.style.color = '#4ade80';
        appendLog('Notificação enviada com sucesso!', 'ok');
      } else if (d.reason === 'no_subscription') {
        sendOutput.style.color = '#facc15';
        appendLog('Nenhuma subscription encontrada. Execute o diagnóstico primeiro.', 'warn');
      } else {
        sendOutput.style.color = '#f87171';
        appendLog('Falha: ' + JSON.stringify(d.errors || d), 'err');
      }
    } catch (e) {
      sendOutput.textContent = 'Erro: ' + e.message;
      sendOutput.style.color = '#f87171';
      appendLog('Erro: ' + e.message, 'err');
    }
  }

  document.getElementById('btnBrowserDiag')?.addEventListener('click', runBrowserDiag);
  document.getElementById('btnResetSub')?.addEventListener('click', resetSubscription);
  document.getElementById('btnRefreshStatus')?.addEventListener('click', loadStatus);
  document.getElementById('btnSendMe')?.addEventListener('click', sendTestNotification);
  document.getElementById('btnClearLog')?.addEventListener('click', function() { if (log) log.textContent = ''; });

  loadStatus();
  runBrowserDiag();
})();
