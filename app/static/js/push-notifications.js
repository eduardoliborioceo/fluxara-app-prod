(async function () {
  if (
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) return;

  const vapidMeta = document.querySelector('meta[name="vapid-key"]');
  if (!vapidMeta || !vapidMeta.content) return;

  const vapidKey = vapidMeta.content;
  const STORAGE_KEY = "fluxara_vapid_key";

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  async function sendSubscriptionToServer(sub) {
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
  }

  async function unsubscribeFromServer(endpoint) {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  }

  async function createSubscription(reg) {
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    await sendSubscriptionToServer(sub);
    localStorage.setItem(STORAGE_KEY, vapidKey);
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const storedKey = localStorage.getItem(STORAGE_KEY);
  const keyChanged = storedKey !== vapidKey;

  if (existing && keyChanged) {
    await unsubscribeFromServer(existing.endpoint);
    await existing.unsubscribe().catch(() => {});
  }

  if (!existing || keyChanged) {
    if (Notification.permission === "granted") {
      await createSubscription(reg).catch(() => {});
      return;
    }

    if (Notification.permission === "default") {
      setTimeout(async () => {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          await createSubscription(reg).catch(() => {});
        }
      }, 4000);
    }
    return;
  }

  await sendSubscriptionToServer(existing).catch(() => {});
})();
