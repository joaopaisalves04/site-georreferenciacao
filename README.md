# Terreno em Ordem: preparar a identificação do terreno

> ⚠️ **Versão de teste.** Este é um serviço privado e independente: não pertence ao Estado nem ao BUPi. O site oficial é [bupi.gov.pt](https://bupi.gov.pt). O nome "Terreno em Ordem" é provisório.

**Site:** https://joaopaisalves04.github.io/site-georreferenciacao/

## O projeto

O site ajuda donos de terrenos rústicos e mistos a **preparar-se** para a identificação do terreno no BUPi (a RGG, Representação Gráfica Georreferenciada). Diz-lhes se o caso é BUPi, que documentos juntar, quanto custa e qual é o próximo passo, e deixa fazer um esboço do terreno no mapa.

**O que o site não faz:**
- Não faz, não valida nem regista a RGG. Isso faz-se no BUPi ou no balcão da câmara.
- Nunca pede a Chave Móvel Digital, PINs, palavras-passe ou números do Cartão de Cidadão.

## Estado

| Parte | Estado |
|---|---|
| Investigação (processo, custos, dados geográficos) | ✅ `docs/` |
| Página inicial | ✅ |
| Diagnóstico guiado (6 perguntas, pesquisa por concelho ou freguesia) com plano personalizado | ✅ |
| Mapa de esboço: fotografia aérea, área, comparação com a caderneta, terrenos vizinhos do BUPi, GPS, KML | ✅ |
| Perguntas frequentes e glossário | ✅ |
| Pedido de ajuda | 🧪 Formulário em modo de teste: valida, mas **não envia** dados |
| Privacidade e "Sobre" | 📝 Rascunho com campos [a definir] |

### Decisões pendentes antes de sair da versão de teste
- Nome definitivo do site e responsável pelos dados (página de privacidade e "Sobre").
- Serviço para receber os pedidos de ajuda (por exemplo, Netlify Forms) e prazo de conservação.
- Confirmar com a DGT a utilização das ortofotos num site privado.

## Estrutura

| Ficheiro / pasta | Conteúdo |
|---|---|
| `*.html` | As 8 páginas do site |
| `css/estilo.css` | Aspeto de todas as páginas |
| `js/` | `comum.js` (valores legais), `locais.js` (pesquisa de concelhos/freguesias), `diagnostico.js`, `mapa.js`, `ajuda.js` |
| `dados/config.json` | **Único sítio com os valores legais** (custos, prazos) e a data da última verificação |
| `dados/regras.json` | Perguntas e regras do diagnóstico, cada uma com a fonte oficial |
| `dados/concelhos.json`, `dados/freguesias.json` | Concelhos (com a indicação de terem ou não cadastro) e freguesias, gerados a partir da CAOP 2025 |
| `vendor/` | Leaflet 1.9.4 e proj4 2.22.0 (cópias locais, com as licenças) |
| `ferramentas/` | Scripts Python de manutenção (ver abaixo) |
| `docs/` | Investigação com as fontes oficiais |

## Manutenção

```
python ferramentas/validar_regras.py      # confirma fontes, valores e condições do diagnóstico
python ferramentas/atualizar_paginas.py   # aplica o mesmo cabeçalho/rodapé a todas as páginas e verifica ligações
python ferramentas/gerar_concelhos.py     # volta a gerar concelhos e freguesias a partir da CAOP (demora uns minutos)
```

## Correr localmente e publicar

```
python -m http.server 8000      # depois abrir http://localhost:8000
```

O site é publicado com o GitHub Pages a partir do ramo `main`. Cada `git push` atualiza o site.

## Dados e licenças

Ortofotomapas 2021 © DGT · CAOP 2025, DGT (CC-BY 4.0) · RGG: dados abertos eBUPi (CC-BY) · © contribuidores do OpenStreetMap (ODbL) · Leaflet (BSD-2) · proj4js (MIT).
