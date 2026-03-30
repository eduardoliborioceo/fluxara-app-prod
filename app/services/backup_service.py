import os
import gzip
import hashlib
import secrets
import subprocess
from datetime import datetime
from pathlib import Path

from app.repositories import backup_repository as repo

BACKUP_BASE = Path('/tmp/backups')

_scheduler = None


def _get_encryption_key() -> bytes | None:
    raw = os.getenv('BACKUP_ENCRYPTION_KEY', '')
    if not raw:
        return None
    encoded = raw.encode('utf-8')
    return encoded[:32].ljust(32, b'\x00')


def _compute_checksum(path: Path) -> str:
    sha256 = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def _encrypt_file(src: Path, dst: Path, key: bytes):
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend

    iv = secrets.token_bytes(16)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()

    with open(src, 'rb') as fin, open(dst, 'wb') as fout:
        fout.write(iv)
        while True:
            chunk = fin.read(65536)
            if not chunk:
                break
            padding_len = 16 - (len(chunk) % 16)
            chunk += bytes([padding_len] * padding_len)
            fout.write(encryptor.update(chunk))
        fout.write(encryptor.finalize())


def run_backup(frequencia: str = 'daily') -> dict:
    if repo.get_running_backup():
        raise RuntimeError('Backup já em execução')

    config = repo.get_config()
    db_url = (config.get('db_url') if config else None) or os.getenv('DATABASE_URL', '')
    if not db_url:
        raise RuntimeError('DATABASE_URL não configurada')

    retencao_dias = int(config.get('retencao_dias', 30)) if config else 30
    log_id = repo.create_log(frequencia)
    started = datetime.utcnow()

    try:
        subdir = BACKUP_BASE / frequencia
        subdir.mkdir(parents=True, exist_ok=True)

        ts = started.strftime('%Y-%m-%d_%H-%M')
        filepath = subdir / f'backup_{ts}.sql.gz'

        result = subprocess.run(
            ['pg_dump', db_url],
            capture_output=True,
            timeout=300,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode(errors='replace')[:500])

        with gzip.open(filepath, 'wb') as gz:
            gz.write(result.stdout)

        key = _get_encryption_key()
        if key:
            enc_path = filepath.with_suffix('.gz.enc')
            _encrypt_file(filepath, enc_path, key)
            filepath.unlink()
            filepath = enc_path

        checksum = _compute_checksum(filepath)
        size = filepath.stat().st_size
        duration = (datetime.utcnow() - started).total_seconds()

        _cleanup_old_files(subdir, retencao_dias)
        repo.cleanup_old_logs(retencao_dias)
        repo.update_log(log_id, 'success', str(filepath), size, duration, checksum, None)

        return {'ok': True, 'arquivo': str(filepath), 'checksum': checksum, 'tamanho': size}

    except Exception as e:
        duration = (datetime.utcnow() - started).total_seconds()
        repo.update_log(log_id, 'failed', None, None, duration, None, str(e))
        raise


def _cleanup_old_files(subdir: Path, retencao_dias: int):
    if not subdir.exists():
        return
    cutoff = datetime.utcnow().timestamp() - retencao_dias * 86400
    for f in sorted(subdir.iterdir()):
        if f.is_file() and f.stat().st_mtime < cutoff:
            f.unlink()


def get_backup_path(arquivo: str) -> Path | None:
    path = Path(arquivo)
    if path.exists() and path.is_relative_to(BACKUP_BASE):
        return path
    return None


def init_scheduler(app):
    global _scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except ImportError:
        return

    _scheduler = BackgroundScheduler(timezone='UTC')

    with app.app_context():
        _apply_schedule(app)

    if not _scheduler.running:
        _scheduler.start()


def reschedule(app):
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.remove_all_jobs()
    with app.app_context():
        _apply_schedule(app)


def _apply_schedule(app):
    global _scheduler
    if _scheduler is None:
        return

    try:
        config = repo.get_config()
    except Exception:
        return

    if not config or not config.get('ativo'):
        return

    frequencia = config['frequencia']
    hora = int(config['hora'])
    minuto = int(config['minuto'])

    def _run_with_context(freq):
        with app.app_context():
            try:
                run_backup(freq)
            except Exception:
                pass

    if frequencia == 'daily':
        _scheduler.add_job(_run_with_context, 'cron', args=['daily'],
                           hour=hora, minute=minuto, id='backup_job')
    elif frequencia == 'weekly':
        _scheduler.add_job(_run_with_context, 'cron', args=['weekly'],
                           day_of_week='mon', hour=hora, minute=minuto, id='backup_job')
    elif frequencia == 'monthly':
        _scheduler.add_job(_run_with_context, 'cron', args=['monthly'],
                           day=1, hour=hora, minute=minuto, id='backup_job')
    elif frequencia == 'bimonthly':
        _scheduler.add_job(_run_with_context, 'cron', args=['bimonthly'],
                           month='1,3,5,7,9,11', day=1, hour=hora, minute=minuto, id='backup_job')
    elif frequencia == 'yearly':
        _scheduler.add_job(_run_with_context, 'cron', args=['yearly'],
                           month=1, day=1, hour=hora, minute=minuto, id='backup_job')
