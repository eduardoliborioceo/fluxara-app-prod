const avatarInput = document.getElementById('avatarInput');
const cropImage = document.getElementById('cropImage');
const confirmCropBtn = document.getElementById('confirmCrop');
const removeAvatarBtn = document.getElementById('removeAvatarBtn');
const avatarDisplay = document.getElementById('avatarDisplay');
const cropModal = new bootstrap.Modal(document.getElementById('cropModal'));

let cropper = null;

avatarInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    cropImage.src = ev.target.result;
    cropModal.show();
  };
  reader.readAsDataURL(file);
  avatarInput.value = '';
});

document.getElementById('cropModal').addEventListener('shown.bs.modal', () => {
  if (cropper) cropper.destroy();
  cropper = new Cropper(cropImage, {
    aspectRatio: 1,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 0.8,
    restore: false,
    guides: false,
    center: false,
    highlight: false,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false,
  });
});

document.getElementById('cropModal').addEventListener('hidden.bs.modal', () => {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
});

document.getElementById('rotateCCW').addEventListener('click', () => cropper?.rotate(-90));
document.getElementById('rotateCW').addEventListener('click', () => cropper?.rotate(90));
document.getElementById('zoomIn').addEventListener('click', () => cropper?.zoom(0.1));
document.getElementById('zoomOut').addEventListener('click', () => cropper?.zoom(-0.1));

confirmCropBtn.addEventListener('click', () => {
  if (!cropper) return;

  confirmCropBtn.disabled = true;
  confirmCropBtn.textContent = 'Salvando...';

  cropper.getCroppedCanvas({ width: 400, height: 400 }).toBlob((blob) => {
    const formData = new FormData();
    formData.append('avatar', blob, 'avatar.png');

    fetch('/auth/avatar', { method: 'POST', body: formData })
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          avatarDisplay.src = data.url + '?t=' + Date.now();
          avatarDisplay.classList.remove('d-none');
          document.getElementById('avatarPlaceholder')?.classList.add('d-none');
          if (removeAvatarBtn) removeAvatarBtn.classList.remove('d-none');
        } else {
          alert(data.error || 'Erro ao salvar imagem');
        }
      })
      .catch(() => alert('Erro ao enviar imagem'))
      .finally(() => {
        confirmCropBtn.disabled = false;
        confirmCropBtn.textContent = 'Confirmar';
        cropModal.hide();
      });
  }, 'image/png');
});

if (removeAvatarBtn) {
  removeAvatarBtn.addEventListener('click', () => {
    if (!confirm('Remover foto de perfil?')) return;

    fetch('/auth/avatar/remove', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          avatarDisplay.src = '';
          avatarDisplay.classList.add('d-none');
          const placeholder = document.getElementById('avatarPlaceholder');
          if (placeholder) placeholder.classList.remove('d-none');
          removeAvatarBtn.classList.add('d-none');
        }
      })
      .catch(() => alert('Erro ao remover foto'));
  });
}
