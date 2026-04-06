from app.repositories import surebet_repository as repo


def list_alavancagens(user_id: int) -> list:
    return [dict(r) for r in repo.list_alavancagens(user_id)]


def create_alavancagem(user_id: int, nome: str, aposta_inicial,
                       odd, num_rodadas) -> dict:
    aposta_inicial = float(aposta_inicial)
    odd = float(odd)
    num_rodadas = int(num_rodadas)
    if aposta_inicial <= 0:
        raise ValueError("Aposta inicial inválida")
    if odd <= 1:
        raise ValueError("Odd deve ser maior que 1")
    if not (2 <= num_rodadas <= 10):
        raise ValueError("Número de rodadas deve ser entre 2 e 10")
    nome = (nome or "").strip() or "Alavancagem"
    return dict(repo.create_alavancagem(user_id, nome, aposta_inicial, odd, num_rodadas))


def update_rodada(alavancagem_id: int, user_id: int, rodada_atual: int) -> dict:
    rodada_atual = int(rodada_atual)
    if rodada_atual < 0:
        raise ValueError("Rodada inválida")
    row = repo.update_rodada(alavancagem_id, user_id, rodada_atual)
    if not row:
        raise ValueError("Alavancagem não encontrada")
    return dict(row)


def delete_alavancagem(alavancagem_id: int, user_id: int):
    repo.delete_alavancagem(alavancagem_id, user_id)
