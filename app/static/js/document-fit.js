(function () {
  "use strict";

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function applyDocumentFit() {
    const wrapper = document.querySelector(".document-mobile-wrapper");
    const canvas = document.querySelector(".document-desktop-canvas");

    if (!wrapper || !canvas) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (!isMobile) {
      canvas.style.removeProperty("--doc-scale");
      wrapper.style.removeProperty("height");
      return;
    }

    const availableWidth = wrapper.clientWidth || window.innerWidth;
    const baseWidth = canvas.scrollWidth || canvas.offsetWidth || 1024;
    const scale = clamp(availableWidth / baseWidth, 0.1, 1);

    canvas.style.setProperty("--doc-scale", String(scale));

    requestAnimationFrame(() => {
      const scaledHeight = Math.ceil(canvas.offsetHeight * scale);
      wrapper.style.height = scaledHeight + "px";
    });
  }

  let resizeTimer = null;

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyDocumentFit, 50);
  }

  document.addEventListener("DOMContentLoaded", applyDocumentFit);
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", applyDocumentFit);

  window.applyDocumentFit = applyDocumentFit;
})();
