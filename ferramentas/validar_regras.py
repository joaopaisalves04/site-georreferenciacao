"""Verifica dados/regras.json antes de publicar.

Confirma que:
  - todas as regras têm fonte, e que cada fonte existe na lista "fontes";
  - todos os {valores} usados existem em dados/config.json;
  - todas as condições "quando" usam perguntas e opções que existem;
  - os "fins" referidos pelas opções existem.

Uso:  python ferramentas/validar_regras.py
"""
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
regras = json.loads((RAIZ / "dados/regras.json").read_text(encoding="utf-8"))
config = json.loads((RAIZ / "dados/config.json").read_text(encoding="utf-8"))

erros = []
fontes = regras["fontes"]
valores = config["valores"]
perguntas = {p["id"]: p for p in regras["perguntas"]}
opcoes = {pid: {o["id"] for o in p.get("opcoes", [])} for pid, p in perguntas.items()}


def ver_textos(onde, obj):
    for campo in ("texto", "detalhe", "valor", "titulo"):
        for chave in re.findall(r"\{(\w+)\}", str(obj.get(campo, ""))):
            if chave not in valores:
                erros.append(f"{onde}: valor {{{chave}}} não existe em config.json")


def ver_regra(onde, r):
    if not r.get("fonte"):
        erros.append(f"{onde}: não tem fonte")
    for f in r.get("fonte", []):
        if f not in fontes:
            erros.append(f"{onde}: fonte '{f}' não existe em 'fontes'")
    for pid, cond in r.get("quando", {}).items():
        if pid not in perguntas:
            erros.append(f"{onde}: pergunta '{pid}' não existe")
            continue
        for tipo, lista in cond.items():
            if tipo not in ("em", "contem", "nao_contem"):
                erros.append(f"{onde}: condição '{tipo}' desconhecida")
            for o in lista:
                if o not in opcoes[pid]:
                    erros.append(f"{onde}: opção '{o}' não existe na pergunta '{pid}'")
    ver_textos(onde, r)


for secao in ("documentos", "custos", "cuidados", "objetivos", "passos"):
    for i, r in enumerate(regras[secao]):
        ver_regra(f"{secao}[{i}]", r)
for nome, fim in regras["fins"].items():
    ver_regra(f"fins.{nome}", fim)
for p in regras["perguntas"]:
    for o in p.get("opcoes", []):
        if "fim" in o and o["fim"] not in regras["fins"]:
            erros.append(f"pergunta '{p['id']}', opção '{o['id']}': fim '{o['fim']}' não existe")
        for x in o.get("exclusivo_com", []):
            if x not in opcoes[p["id"]]:
                erros.append(f"pergunta '{p['id']}': exclusivo_com '{x}' não existe")

if erros:
    print("ERROS encontrados:")
    for e in erros:
        print("  -", e)
    sys.exit(1)

n = sum(len(regras[s]) for s in ("documentos", "custos", "cuidados", "objetivos", "passos"))
print(f"OK: {len(perguntas)} perguntas e {n} regras verificadas; todas têm fonte e valores válidos.")
