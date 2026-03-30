const diagOutput = document.getElementById('pushDiagOutput');
const diagBtn = document.getElementById('diagPushBtn');
const testBtn = document.getElementById('testPushBtn');
const resetBtn = document.getElementById('resetPushBtn');

function show(text) {
  if (!diagOutput) return;
  diagOutput.textContent = text;
  diagOutput.classList.remove('d-none');
}

function append(text) {
  if (!diagOutput) return;
  diagOutput.textContent += '\n' + text;
}

function getVapidKey() {
  const meta = document.querySelector('meta[name="vapid-key"]');
  return meta ? meta.content : '';
}

async function subscribeWithKey(reg, vapidKey) {
  const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
  const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
  const key = Uint8Array.from([...atob(b64)].map(c => c.charCodeAt(0)));
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.json();
}

if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    resetBtn.disabled = true;
    show('Resetando subscription...');

    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        append('  Desinscrevendo subscription atual no browser...');
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        append('  Browser desinscrito.');
      } else {
        append('  Nenhuma subscription ativa no browser.');
      }

      append('  Limpando banco...');
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: '' }),
      });

      const vapidKey = getVapidKey();
      if (!vapidKey) {
        append('  VAPID key ausente na página. Verifique Railway.');
      } else if (Notification.permission === 'granted') {
        append('  Criando nova subscription com VAPID atual...');
        const d = await subscribeWithKey(reg, vapidKey);
        if (d.ok) {
          append('  Nova subscription criada e salva!');
          append('\nPronto — clique em "Testar notificação".');
        } else {
          append('  Erro ao salvar: ' + JSON.stringify(d));
        }
      } else {
        append('  Permissão não concedida. Aceite a permissão primeiro.');
      }
    } catch (err) {
      append('\nERRO: ' + err.message);
    }

    resetBtn.disabled = false;
  });
}

if (diagBtn) {
  diagBtn.addEventListener('click', async () => {
    diagBtn.disabled = true;
    show('Iniciando diagnóstico...');

    try {
      append('\n[1] Suporte do navegador');
      append('  Notification: ' + ('Notification' in window ? 'OK' : 'NAO SUPORTADO'));
      append('  serviceWorker: ' + ('serviceWorker' in navigator ? 'OK' : 'NAO SUPORTADO'));
      append('  PushManager: ' + ('PushManager' in window ? 'OK' : 'NAO SUPORTADO'));

      append('\n[2] Permissão de notificação');
      const perm = 'Notification' in window ? Notification.permission : 'N/A';
      if (perm === 'granted') append('  CONCEDIDA');
      else if (perm === 'denied') append('  BLOQUEADA — vá em Configurações do site e libere manualmente');
      else append('  PENDENTE — permissão ainda não foi solicitada ou foi ignorada');

      append('\n[3] VAPID key na página');
      const vapidKey = getVapidKey();
      if (vapidKey) append('  Presente (' + vapidKey.length + ' caracteres)');
      else append('  AUSENTE — VAPID_PUBLIC_KEY não chegou na página');

      append('\n[4] Service Worker');
      const regs = await navigator.serviceWorker.getRegistrations();
      append('  Registrations: ' + regs.length);
      for (const r of regs) {
        const state = r.active ? r.active.state : r.installing ? 'installing' : 'sem worker';
        append('  - scope: ' + r.scope + ' | ' + state);
      }

      append('\n[5] Subscription push no browser');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        append('  EXISTE: ' + sub.endpoint.slice(0, 70) + '...');
      } else {
        append('  AUSENTE');
        if (perm === 'granted' && vapidKey) {
          append('  Tentando criar agora...');
          try {
            const d = await subscribeWithKey(reg, vapidKey);
            append(d.ok ? '  Criada e salva!' : '  Erro: ' + JSON.stringify(d));
          } catch (e2) {
            append('  Erro ao criar: ' + e2.message);
          }
        }
      }

      append('\n[6] Status no servidor');
      const resp = await fetch('/api/push/status');
      const data = await resp.json();
      append('  VAPID configurado: ' + (data.vapid_configured ? 'SIM' : 'NAO'));
      append('  Chave pública length: ' + data.vapid_public_key_length);
      append('  Subscriptions no banco: ' + data.subscriptions_saved);
      if (data.endpoints && data.endpoints.length) {
        data.endpoints.forEach(ep => append('  - ' + ep));
      }

      append('\n--- Concluído ---');
      if (sub) append('Se o teste der 403, clique em "Resetar subscription".');
    } catch (err) {
      append('\nERRO: ' + err.message);
    }

    diagBtn.disabled = false;
  });
}

if (testBtn) {
  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    show('Enviando push de teste...');
    try {
      const r = await fetch('/api/push/test', { method: 'POST' });
      const d = await r.json();
      if (d.ok) show('Push enviado. Verifique se a notificação apareceu.');
      else if (d.reason === 'no_subscription') show('Sem subscription. Clique em "Diagnosticar" primeiro.');
      else show('Resposta: ' + JSON.stringify(d) + '\n\nSe houver erro 403, clique em "Resetar subscription".');
    } catch (e) {
      show('Erro: ' + e.message);
    }
    testBtn.disabled = false;
  });
}
