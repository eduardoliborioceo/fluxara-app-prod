document.querySelectorAll(".photo-slot").forEach((slot) => {
  const input = slot.querySelector(".photo-file-input");
  const position = parseInt(slot.dataset.position, 10);

  slot.addEventListener("click", (e) => {
    if (e.target.closest(".photo-remove-btn")) return;
    input.click();
  });

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);
    formData.append("position", position);

    slot.classList.add("photo-slot--uploading");

    fetch("/auth/profile-photos", { method: "POST", body: formData })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
          return;
        }

        const img = document.createElement("img");
        img.src = data.url + "?t=" + Date.now();
        img.alt = "Foto " + (position + 1);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "photo-remove-btn";
        removeBtn.title = "Remover foto";
        removeBtn.innerHTML = '<i class="bi bi-x"></i>';

        const placeholder = slot.querySelector(".photo-placeholder");
        if (placeholder) placeholder.remove();

        slot.insertBefore(img, input);
        slot.insertBefore(removeBtn, input);

        attachRemove(slot, removeBtn);
      })
      .catch(() => alert("Erro ao enviar foto"))
      .finally(() => {
        slot.classList.remove("photo-slot--uploading");
        input.value = "";
      });
  });

  const existingRemoveBtn = slot.querySelector(".photo-remove-btn");
  if (existingRemoveBtn) {
    attachRemove(slot, existingRemoveBtn);
  }
});

function attachRemove(slot, btn) {
  const photoId = slot.dataset.photoId;
  if (!photoId) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();

    fetch(`/auth/profile-photos/${photoId}`, { method: "DELETE" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          alert("Erro ao remover foto");
          return;
        }

        const img = slot.querySelector("img");
        if (img) img.remove();
        btn.remove();

        const placeholder = document.createElement("div");
        placeholder.className = "photo-placeholder";
        placeholder.innerHTML = '<i class="bi bi-plus-lg"></i>';

        const input = slot.querySelector(".photo-file-input");
        slot.insertBefore(placeholder, input);

        slot.dataset.photoId = "";
      })
      .catch(() => alert("Erro ao remover foto"));
  });
}
