"""Gera dados/concelhos.json: todos os concelhos de Portugal, com a marca
"sem_cadastro" (abrangidos pelo BUPi) tirada de docs/municipios-sem-cadastro.csv.

Continente: nomes e distritos vêm da CAOP 2025 (OGC API da DGT, CC-BY 4.0).
Açores e Madeira: a OGC API da DGT só tem o continente, por isso a lista
das ilhas está escrita abaixo (19 + 11 concelhos).

Uso:  python ferramentas/gerar_concelhos.py
"""
import csv
import json
import pathlib
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
URL_CAOP = ("https://ogcapi.dgterritorio.gov.pt/collections/municipios/items"
            "?f=json&limit=400&skipGeometry=true")

ACORES = {
    "Santa Maria": ["Vila do Porto"],
    "São Miguel": ["Lagoa", "Nordeste", "Ponta Delgada", "Povoação",
                   "Ribeira Grande", "Vila Franca do Campo"],
    "Terceira": ["Angra do Heroísmo", "Praia da Vitória"],
    "Graciosa": ["Santa Cruz da Graciosa"],
    "São Jorge": ["Calheta", "Velas"],
    "Pico": ["Lajes do Pico", "Madalena", "São Roque do Pico"],
    "Faial": ["Horta"],
    "Flores": ["Lajes das Flores", "Santa Cruz das Flores"],
    "Corvo": ["Corvo"],
}
MADEIRA = {
    "Madeira": ["Calheta", "Câmara de Lobos", "Funchal", "Machico",
                "Ponta do Sol", "Porto Moniz", "Ribeira Brava", "Santa Cruz",
                "Santana", "São Vicente"],
    "Porto Santo": ["Porto Santo"],
}


# Grafias diferentes entre o texto da lei e a CAOP (lei -> CAOP).
GRAFIAS = {"Castanheira de Pera": "Castanheira de Pêra"}


def main():
    sem_cad = {"Continente": set(), "Ilhas": set()}
    with open(RAIZ / "docs/municipios-sem-cadastro.csv", encoding="utf-8") as f:
        for linha in csv.DictReader(f):
            chave = "Continente" if linha["regiao"] == "Continente" else "Ilhas"
            sem_cad[chave].add(GRAFIAS.get(linha["concelho"], linha["concelho"]))

    # A API devolve no máximo 200 registos por pedido: seguir as páginas "next".
    feats, url = [], URL_CAOP
    while url:
        with urllib.request.urlopen(url, timeout=60) as r:
            pagina = json.load(r)
        feats += pagina["features"]
        url = next((l["href"] for l in pagina.get("links", []) if l["rel"] == "next"), None)
    dados = {"features": feats}

    concelhos = []
    for feat in dados["features"]:
        p = feat["properties"]
        concelhos.append({
            "nome": p["municipio"],
            "local": "distrito de " + p["distrito_ilha"],
            "sem_cadastro": p["municipio"] in sem_cad["Continente"],
        })
    for regiao, ilhas in (("Açores", ACORES), ("Madeira", MADEIRA)):
        for ilha, nomes in ilhas.items():
            for nome in nomes:
                local = f"ilha de {ilha}, {regiao}" if ilha != regiao else regiao
                concelhos.append({
                    "nome": nome,
                    "local": local,
                    "sem_cadastro": nome in sem_cad["Ilhas"],
                })

    # Verificações: todos os nomes da lista legal têm de existir.
    nomes_cont = {c["nome"] for c in concelhos[:len(dados["features"])]}
    em_falta = sem_cad["Continente"] - nomes_cont
    assert not em_falta, f"Nomes da lista legal sem correspondência na CAOP: {em_falta}"
    n_cont = sum(c["sem_cadastro"] for c in concelhos[:len(dados["features"])])
    n_ilhas = sum(c["sem_cadastro"] for c in concelhos[len(dados["features"]):])
    assert (len(concelhos), n_cont, n_ilhas) == (308, 153, 20), (len(concelhos), n_cont, n_ilhas)

    saida = {
        "_fontes": {
            "lista_sem_cadastro_continente": "Lei 65/2019, Anexo I, na redação do DL 90/2023",
            "lista_sem_cadastro_ilhas": "Lei 65/2019, Anexo II, na redação do DL 87/2026",
            "nomes_continente": "CAOP 2025, DGT (CC-BY 4.0)",
        },
        "concelhos": sorted(concelhos, key=lambda c: (c["nome"], c["local"])),
    }
    destino = RAIZ / "dados/concelhos.json"
    destino.write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK: {len(concelhos)} concelhos ({n_cont} + {n_ilhas} sem cadastro) -> {destino}")


if __name__ == "__main__":
    main()
