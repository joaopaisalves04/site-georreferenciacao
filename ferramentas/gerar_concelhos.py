"""Gera os ficheiros de localização usados pelo site:

  dados/concelhos.json   todos os concelhos de Portugal, com a marca "sem_cadastro"
                         (abrangidos pelo BUPi) e a caixa envolvente (bbox) para o mapa;
  dados/freguesias.json  as freguesias do continente, com o concelho a que pertencem
                         e a bbox, para quem pesquisa "Fátima" em vez de "Ourém".

Fontes:
  - Lista de concelhos sem cadastro: docs/municipios-sem-cadastro.csv (texto da lei).
  - Nomes, limites e bbox do continente: CAOP 2025 (OGC API da DGT, CC-BY 4.0).
  - Açores e Madeira: a OGC API da DGT só tem o continente, por isso a lista das ilhas
    e uma bbox aproximada de cada ilha estão escritas abaixo.

Demora alguns minutos: descarrega os limites completos (centenas de MB) só para
calcular as caixas envolventes; nada disso fica guardado.

Uso:  python ferramentas/gerar_concelhos.py
"""
import csv
import json
import pathlib
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
API = "https://ogcapi.dgterritorio.gov.pt/collections/{}/items?f=json&limit={}"

# bbox aproximada de cada ilha: [oeste, sul, este, norte] em graus (WGS84).
ILHAS_BBOX = {
    "Santa Maria": [-25.20, 36.92, -25.00, 37.02],
    "São Miguel": [-25.86, 37.69, -25.13, 37.92],
    "Terceira": [-27.39, 38.63, -27.03, 38.81],
    "Graciosa": [-28.10, 38.99, -27.94, 39.10],
    "São Jorge": [-28.32, 38.53, -27.74, 38.76],
    "Pico": [-28.55, 38.38, -28.02, 38.57],
    "Faial": [-28.84, 38.51, -28.59, 38.65],
    "Flores": [-31.28, 39.36, -31.12, 39.53],
    "Corvo": [-31.13, 39.66, -31.07, 39.73],
    "Madeira": [-17.27, 32.63, -16.65, 32.88],
    "Porto Santo": [-16.42, 33.01, -16.27, 33.10],
}
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


def bbox_da_geometria(geom):
    """Caixa envolvente [oeste, sul, este, norte] de um (Multi)Polygon GeoJSON."""
    xs, ys = [], []

    def percorrer(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0])
            ys.append(c[1])
        else:
            for sub in c:
                percorrer(sub)

    percorrer(geom["coordinates"])
    return [round(min(xs), 4), round(min(ys), 4), round(max(xs), 4), round(max(ys), 4)]


def ler_colecao(nome, por_pagina):
    """Devolve (propriedades, bbox) de cada elemento, página a página."""
    url = API.format(nome, por_pagina)
    while url:
        with urllib.request.urlopen(url, timeout=300) as r:
            pagina = json.load(r)
        for f in pagina["features"]:
            yield f["properties"], bbox_da_geometria(f["geometry"])
        print(f"  {nome}: +{len(pagina['features'])}", flush=True)
        url = next((l["href"] for l in pagina.get("links", []) if l["rel"] == "next"), None)


def main():
    sem_cad = {"Continente": set(), "Ilhas": set()}
    with open(RAIZ / "docs/municipios-sem-cadastro.csv", encoding="utf-8") as f:
        for linha in csv.DictReader(f):
            chave = "Continente" if linha["regiao"] == "Continente" else "Ilhas"
            sem_cad[chave].add(GRAFIAS.get(linha["concelho"], linha["concelho"]))

    concelhos = []
    for p, bbox in ler_colecao("municipios", 40):
        concelhos.append({
            "nome": p["municipio"],
            "local": "distrito de " + p["distrito_ilha"],
            "sem_cadastro": p["municipio"] in sem_cad["Continente"],
            "bbox": bbox,
        })
    n_continente = len(concelhos)
    for regiao, ilhas in (("Açores", ACORES), ("Madeira", MADEIRA)):
        for ilha, nomes in ilhas.items():
            for nome in nomes:
                concelhos.append({
                    "nome": nome,
                    "local": f"ilha de {ilha}, {regiao}" if ilha != regiao else regiao,
                    "sem_cadastro": nome in sem_cad["Ilhas"],
                    "bbox": ILHAS_BBOX[ilha],
                })

    # Verificações: todos os nomes da lista legal têm de existir e os totais têm de bater.
    nomes_cont = {c["nome"] for c in concelhos[:n_continente]}
    em_falta = sem_cad["Continente"] - nomes_cont
    assert not em_falta, f"Nomes da lista legal sem correspondência na CAOP: {em_falta}"
    n_cont = sum(c["sem_cadastro"] for c in concelhos[:n_continente])
    n_ilhas = sum(c["sem_cadastro"] for c in concelhos[n_continente:])
    assert (len(concelhos), n_cont, n_ilhas) == (308, 153, 20), (len(concelhos), n_cont, n_ilhas)

    freguesias = []
    for p, bbox in ler_colecao("freguesias", 200):
        freguesias.append({
            "nome": p.get("designacao_simplificada") or p["freguesia"],
            "concelho": p["municipio"],
            "local": "distrito de " + p["distrito_ilha"],
            "bbox": bbox,
        })
    assert all(f["concelho"] in nomes_cont for f in freguesias)

    fontes = {
        "lista_sem_cadastro_continente": "Lei 65/2019, Anexo I, na redação do DL 90/2023",
        "lista_sem_cadastro_ilhas": "Lei 65/2019, Anexo II, na redação do DL 87/2026",
        "nomes_e_limites_continente": "CAOP 2025, DGT (CC-BY 4.0)",
        "bbox_ilhas": "aproximada, para centrar o mapa",
    }
    (RAIZ / "dados/concelhos.json").write_text(json.dumps(
        {"_fontes": fontes, "concelhos": sorted(concelhos, key=lambda c: (c["nome"], c["local"]))},
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (RAIZ / "dados/freguesias.json").write_text(json.dumps(
        {"_fontes": {"freguesias": "CAOP 2025, DGT (CC-BY 4.0)"},
         "freguesias": sorted(freguesias, key=lambda f: (f["nome"], f["concelho"]))},
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"OK: {len(concelhos)} concelhos ({n_cont} + {n_ilhas} sem cadastro), "
          f"{len(freguesias)} freguesias")


if __name__ == "__main__":
    main()
