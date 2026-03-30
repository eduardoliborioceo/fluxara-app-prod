(function () {
  const log = document.getElementById('diagLog');
  const serverPanel = document.getElementById('serverPanel');
  const browserPanel = document.getElementById('browserPanel');
  const sendOutput = document.getElementById('sendOutput');

  function ts() {
    return new Date().toLocaleTimeString('pt-BR');
  }

  function appendLog(msg, level) {
    if (!log) return;
    const colors = { ok: '#4ade80', err: '#f87171', warn: '#facc15', info: '#93c5fd', dim: '#6b7280' };
    const color = colors[level] || colors.info;
    log.innerHTML += `<span style="color:${colors.dim}">[${ts()}]</span> <span style="color:${color}">${escHtml(msg)}</span>\n`;
    log.scrollTop = log.scrollHeight;
  }

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function badge(ok, text) {
    const cls = ok ? 'bg-success' : 'bg-danger';
    return `<span class="badge ${cls} me-1">${text}</span>`;
  }

  function row(label, content) {
    return `<div class="d-flex align-items-start py-2 border-bottom"><span class="text-muted me-3" style="min-width:180px;font-size:.82rem">${label}</span><span class="fw-semibold small">${content}</span></div>`;
  }

  function getVapidKey() {
    const m = document.querySelector('meta[name="vapid-key"]');
    return m ? m.content : '';
  }

  function urlBase64ToUint8Array(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const base = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from([...atob(base)].map(c => c.charCodeAt(0)));
  }

  async function loadServerStatus() {
    appendLog('Consultando /api/push/debug ...', 'info');
    try {
      const r = await fetch('/api/push/debug');
      if (r.status === 403) {
        serverPanel.innerHTML = '<div class="alert alert-danger m-3">Acesso negado — somente admins.</div>';
        appendLog('Acesso negado ao endpoint debug.', 'err');
        return null;
      }
      const d = await r.json();

      let html = '';
      html += row('Ambiente', `<code>${d.environment}</code>`);
      html += row('VAPID_PUBLIC_KEY', d.vapid_public_key_present
        ? badge(true, 'PRESENTE') + `<small class="text-muted">${d.vapid_public_key_length} chars | ${d.vapid_public_key_preview}</small>`
        : badge(false, 'AUSENTE') + ' <span class="text-danger small">Configure no Railway</span>');
      html += row('VAPID_PRIVATE_KEY', d.vapid_private_key_present
        ? badge(true, 'PRESENTE') + `<small class="text-muted">${d.vapid_private_key_length} chars</small>`
        : badge(false, 'AUSENTE') + ' <span class="text-danger small">Configure no Railway</span>');
      html += row('VAPID_CLAIMS_SUB', d.vapid_claims_sub
        ? badge(true, 'OK') + ` <code class="small">${d.vapid_claims_sub}</code>`
        : badge(false, 'AUSENTE'));
      html += row('Subscriptions no banco', `<strong>${d.total_subscriptions}</strong>`);

      if (d.subscriptions && d.subscriptions.length > 0) {
        d.subscriptions.forEach((s, i) => {
          html += row(`Sub #${i + 1}`, `<small class="font-monospace text-muted">${s.endpoint_preview}</small>`);
        });
      }

      serverPanel.innerHTML = html;

      appendLog(`Servidor: PUBLIC_KEY=${d.vapid_public_key_present}, PRIVATE_KEY=${d.vapid_private_key_present}, subs=${d.total_subscriptions}`, d.vapid_public_key_present && d.vapid_private_key_present ? 'ok' : 'warn');
      return d;
    } catch (e) {
      serverPanel.innerHTML = `<div class="alert alert-danger m-3">Erro ao consultar servidor: ${escHtml(e.message)}</div>`;
      appendLog('Erro ao consultar servidor: ' + e.message, 'err');
      return null;
    }
  }

  async function runBrowserDiag() {
    appendLog('=== Iniciando diagnóstico do browser ===', 'info');
    let html = '';

    const hasNotif = 'Notification' in window;
    const hasSW = 'serviceWorker' in navigator;
    const hasPush = 'PushManager' in window;

    html += row('Notification API', badge(hasNotif, hasNotif ? 'SUPORTADA' : 'NÃO SUPORTADA'));
    html += row('Service Worker', badge(hasSW, hasSW ? 'SUPORTADO' : 'NÃO SUPORTADO'));
    html += row('PushManager', badge(hasPush, hasPush ? 'SUPORTADO' : 'NÃO SUPORTADO'));

    appendLog(`APIs: Notification=${hasNotif}, SW=${hasSW}, Push=${hasPush}`, hasNotif && hasSW && hasPush ? 'ok' : 'err');

    if (!hasNotif || !hasSW || !hasPush) {
      browserPanel.innerHTML = html + '<div class="alert alert-danger m-3">Browser não suporta Push Notifications.</div>';
      return;
    }

    const perm = Notification.permission;
    const permOk = perm === 'granted';
    html += row('Permissão', badge(permOk, perm.toUpperCase()));
    if (perm === 'denied') html += row('', '<span class="text-danger small">Vá em Configurações do site e libere manualmente.</span>');
    appendLog('Permissão: ' + perm, permOk ? 'ok' : 'warn');

    const vapidKey = getVapidKey();
    html += row('VAPID key na página', vapidKey
      ? badge(true, 'PRESENTE') + ` <small class="text-muted">${vapidKey.length} chars</small>`
      : badge(false, 'AUSENTE') + ' <span class="text-danger small">Variável não chegou na meta tag</span>');
    appendLog('VAPID key na página: ' + (vapidKey ? vapidKey.length + ' chars' : 'AUSENTE'), vapidKey ? 'ok' : 'err');

    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      html += row('Service Workers', `<strong>${regs.length}</strong> registrado(s)`);
      regs.forEach(r => {
        const state = r.active ? r.active.state : r.installing ? 'installing' : 'sem worker';
        html += row('', `<small class="font-monospace text-muted">${r.scope} | ${state}</small>`);
        appendLog(`SW scope=${r.scope} state=${state}`, r.active ? 'ok' : 'warn');
      });
    } catch (e) {
      html += row('Service Workers', badge(false, 'ERRO') + ' ' + escHtml(e.message));
      appendLog('Erro ao listar SWs: ' + e.message, 'err');
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        html += row('Subscription push', badge(true, 'EXISTE') + ` <small class="font-monospace text-muted">${sub.endpoint.slice(0, 60)}...</small>`);
        appendLog('Subscription: ' + sub.endpoint.slice(0, 60) + '...', 'ok');
      } else {
        html += row('Subscription push', badge(false, 'AUSENTE'));
        appendLog('Nenhuma subscription no browser.', 'warn');

        if (permOk && vapidKey) {
          appendLog('Permissão OK + VAPID presente — tentando criar subscription...', 'info');
          try {
            const key = urlBase64ToUint8Array(vapidKey);
            const newSub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
            const resp = await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newSub.toJSON()),
            });
            const result = await resp.json();
            if (result.ok) {
              html += row('', badge(true, 'Subscription criada e salva!'));
              appendLog('Subscription criada automaticamente!', 'ok');
            } else {
              html += row('', badge(false, 'Falha ao salvar') + ' <small>' + JSON.stringify(result) + '</small>');
              appendLog('Falha ao salvar subscription: ' + JSON.stringify(result), 'err');
            }
          } catch (e2) {
            html += row('', badge(false, 'Erro ao criar') + ` <small>${escHtml(e2.message)}</small>`);
            appendLog('Erro ao criar subscription: ' + e2.message, 'err');
          }
        } else if (!permOk) {
          appendLog('Permissão não concedida — solicite ao usuário.', 'warn');
        } else {
          appendLog('VAPID key ausente — configure no Railway.', 'err');
        }
      }
    } catch (e) {
      html += row('Subscription push', badge(false, 'ERRO') + ' ' + escHtml(e.message));
      appendLog('Erro ao verificar subscription: ' + e.message, 'err');
    }

    browserPanel.innerHTML = html;
    appendLog('=== Diagnóstico concluído ===', 'ok');
  }

  async function requestPermissionAndSubscribe() {
    appendLog('Solicitando permissão de notificação...', 'info');
    const perm = await Notification.requestPermission();
    appendLog('Permissão: ' + perm, perm === 'granted' ? 'ok' : 'warn');
    if (perm === 'granted') {
      await runBrowserDiag();
    }
  }

  async function resetSubscription() {
    appendLog('=== Resetando subscription ===', 'warn');
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        appendLog('Desinscrevendo do servidor...', 'info');
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        appendLog('Desinscrevendo do browser...', 'info');
        await existing.unsubscribe();
        appendLog('Subscription removida.', 'ok');
      } else {
        appendLog('Nenhuma subscription ativa no browser.', 'warn');
      }

      localStorage.removeItem('fluxara_vapid_key');
      appendLog('Cache local limpo.', 'ok');

      const vapidKey = getVapidKey();
      if (vapidKey && Notification.permission === 'granted') {
        appendLog('Recriando subscription com VAPID atual...', 'info');
        const key = urlBase64ToUint8Array(vapidKey);
        const newSub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const resp = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSub.toJSON()),
        });
        const result = await resp.json();
        appendLog(result.ok ? 'Nova subscription criada e salva!' : 'Erro ao salvar: ' + JSON.stringify(result), result.ok ? 'ok' : 'err');
      } else if (!vapidKey) {
        appendLog('VAPID key ausente — configure no Railway antes de recriar.', 'err');
      }

      await runBrowserDiag();
    } catch (e) {
      appendLog('Erro no reset: ' + e.message, 'err');
    }
  }

  async function sendNotification(toAll) {
    const title = document.getElementById('notifTitle').value.trim() || 'Fluxara';
    const body = document.getElementById('notifBody').value.trim() || 'Teste';
    const url = document.getElementById('notifUrl').value.trim() || '/';

    const endpoint = toAll ? '/api/push/send-to-all' : '/api/push/test';
    const payload = toAll ? { title, body, url } : null;

    sendOutput.classList.remove('d-none');
    sendOutput.textContent = 'Enviando...';

    appendLog(`Enviando notificação "${title}" → ${toAll ? 'todos' : 'somente eu'}`, 'info');

    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : null,
      });
      const d = await r.json();
      sendOutput.textContent = JSON.stringify(d, null, 2);

      if (d.ok) {
        appendLog(`Envio OK. Enviadas: ${d.sent ?? '?'} / Total: ${d.total ?? '?'}`, 'ok');
      } else if (d.reason === 'no_subscription') {
        appendLog('Nenhuma subscription encontrada. Execute o diagnóstico primeiro.', 'warn');
      } else {
        appendLog('Falha no envio: ' + JSON.stringify(d.errors || d), 'err');
      }
    } catch (e) {
      sendOutput.textContent = 'Erro: ' + e.message;
      appendLog('Erro ao enviar: ' + e.message, 'err');
    }
  }

  async function clearAllSubscriptions() {
    if (!confirm('Apagar TODAS as subscriptions do banco? Isso remove todos os usuários do push. Confirmar?')) return;

    appendLog('=== Limpando todas as subscriptions do banco ===', 'warn');
    try {
      const r = await fetch('/api/push/clear-all', { method: 'POST' });
      const d = await r.json();
      if (d.ok) {
        appendLog(`${d.deleted} subscription(s) removida(s) do banco.`, 'ok');
      } else {
        appendLog('Erro ao limpar: ' + JSON.stringify(d), 'err');
      }
      await loadServerStatus();
    } catch (e) {
      appendLog('Erro: ' + e.message, 'err');
    }
  }

  document.getElementById('btnRefreshServer')?.addEventListener('click', loadServerStatus);
  document.getElementById('btnClearAllSubs')?.addEventListener('click', clearAllSubscriptions);
  document.getElementById('btnBrowserDiag')?.addEventListener('click', runBrowserDiag);
  document.getElementById('btnResetSub')?.addEventListener('click', resetSubscription);
  document.getElementById('btnSendMe')?.addEventListener('click', () => sendNotification(false));
  document.getElementById('btnSendAll')?.addEventListener('click', () => sendNotification(true));
  document.getElementById('btnClearLog')?.addEventListener('click', () => { if (log) log.textContent = ''; });

  loadServerStatus();
  runBrowserDiag();
})();
