"""Mantém iguais em todas as páginas o cabeçalho (aviso, marca, menu) e o rodapé,
e verifica as ligações internas.

Cada página .html tem estes marcadores, e tudo o que está entre eles é reescrito:
    <!-- cabecalho -->  ...  <!-- /cabecalho -->
    <!-- rodape -->     ...  <!-- /rodape -->

Para mudar o menu ou o rodapé do site inteiro: alterar MENU / RODAPE abaixo e correr
    python ferramentas/atualizar_paginas.py
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent

MENU = [
    ("index.html", "Início"),
    ("diagnostico.html", "Diagnóstico"),
    ("mapa.html", "Mapa"),
    ("perguntas.html", "Perguntas"),
    ("glossario.html", "Glossário"),
    ("ajuda.html", "Pedir ajuda"),
]

MARCA_SVG = """<svg viewBox="0 0 40 40" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#1f3a5f"/>
          <path d="M9 27 L14 11 L29 9 L32 24 L19 31 Z" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
          <circle cx="9" cy="27" r="2.6" fill="#f2a27c"/><circle cx="14" cy="11" r="2.6" fill="#f2a27c"/>
          <circle cx="29" cy="9" r="2.6" fill="#f2a27c"/><circle cx="32" cy="24" r="2.6" fill="#f2a27c"/>
          <circle cx="19" cy="31" r="2.6" fill="#f2a27c"/>
        </svg>"""


def cabecalho(pagina):
    itens = "\n".join(
        f'      <a href="{href}"{" aria-current=\"page\"" if href == pagina else ""}>{nome}</a>'
        for href, nome in MENU
    )
    return f"""<!-- cabecalho -->
  <a class="saltar" href="#conteudo">Saltar para o conteúdo</a>
  <div class="aviso-topo" role="note">
    Serviço privado e independente. Não pertence ao Estado nem ao BUPi.
    Site oficial: <a href="https://bupi.gov.pt">bupi.gov.pt</a>
  </div>

  <header class="cabecalho">
    <div class="contentor">
      <a class="marca" href="index.html">
        {MARCA_SVG}
        Terreno em Ordem
      </a>
      <div class="cabecalho-acoes">
        <span class="etiqueta-teste">Versão de teste</span>
        <button type="button" class="botao-letra" data-letra aria-pressed="false"
                title="Aumentar ou diminuir o tamanho da letra">A<span aria-hidden="true">+</span>
          <span class="so-leitor">Letra maior</span></button>
      </div>
    </div>
    <nav class="menu contentor" aria-label="Menu principal">
{itens}
    </nav>
  </header>
  <!-- /cabecalho -->"""


RODAPE = """<!-- rodape -->
  <footer>
    <div class="contentor">
      <p><strong>Terreno em Ordem</strong> é um serviço privado e independente, sem ligação ao Estado nem ao BUPi.
        Não faz, não valida e não regista a identificação de terrenos.</p>
      <p>Valores legais verificados em <span data-data-verificacao>novembro de 2026</span>.
        Informação orientativa: não substitui o atendimento do BUPi ou da câmara municipal.</p>
      <p class="rodape-links">
        <a href="sobre.html">Sobre este site</a>
        <a href="privacidade.html">Privacidade</a>
        <a href="https://bupi.gov.pt">Site oficial do BUPi</a>
      </p>
    </div>
  </footer>
  <!-- /rodape -->"""


def main():
    erros = []
    paginas = sorted(RAIZ.glob("*.html"))
    nomes = {p.name for p in paginas}
    for p in paginas:
        s = p.read_text(encoding="utf-8")
        for marca in ("cabecalho", "rodape"):
            if f"<!-- {marca} -->" not in s or f"<!-- /{marca} -->" not in s:
                erros.append(f"{p.name}: faltam os marcadores <!-- {marca} -->")
        s = re.sub(r"<!-- cabecalho -->.*?<!-- /cabecalho -->", lambda m: cabecalho(p.name), s, flags=re.S)
        s = re.sub(r"<!-- rodape -->.*?<!-- /rodape -->", lambda m: RODAPE, s, flags=re.S)
        p.write_text(s, encoding="utf-8")

        # Verificações
        if 'rel="icon"' not in s:
            erros.append(f"{p.name}: falta o ícone (link rel=icon)")
        if 'id="conteudo"' not in s:
            erros.append(f"{p.name}: falta id=\"conteudo\" no <main>")
        if "bupi.gov.pt" not in s or "Não pertence ao Estado nem ao BUPi" not in s:
            erros.append(f"{p.name}: falta o aviso de serviço privado")
        for href in re.findall(r'href="([^"#:]+\.html)', s):
            if href not in nomes:
                erros.append(f"{p.name}: ligação para página inexistente: {href}")
        for src in re.findall(r'(?:src|href)="((?:js|css|vendor|dados)/[^"]+)"', s):
            if not (RAIZ / src).exists():
                erros.append(f"{p.name}: ficheiro inexistente: {src}")

    if erros:
        print("ERROS:")
        for e in erros:
            print("  -", e)
        sys.exit(1)
    print(f"OK: {len(paginas)} páginas atualizadas e verificadas.")


if __name__ == "__main__":
    main()
