# Preparar a identificação do terreno

> ⚠️ **Versão de teste.** Este é um serviço privado e independente: não pertence ao Estado nem ao BUPi. O site oficial é [bupi.gov.pt](https://bupi.gov.pt).

**Site:** https://joaopaisalves04.github.io/site-georreferenciacao/

## O projeto

O site ajuda donos de terrenos rústicos e mistos a **preparar-se** para a identificação do terreno no BUPi (a chamada RGG, Representação Gráfica Georreferenciada). Diz-lhes se o caso é BUPi, que documentos juntar, quanto custa e qual é o próximo passo.

**O que o site não faz:**
- Não faz, não valida nem regista a RGG. Isso faz-se no BUPi ou no balcão da câmara.
- Nunca pede a Chave Móvel Digital, PINs, palavras-passe ou números do Cartão de Cidadão.

## Estado

| Parte | Estado |
|---|---|
| Investigação (processo, custos, dados geográficos) | ✅ Feita, ver `docs/` |
| Página inicial | ✅ |
| Diagnóstico, pergunta 1: concelho → BUPi ou cadastro | ✅ |
| Diagnóstico, restantes perguntas | ⏳ |
| Mapa de esboço do terreno | ⏳ |
| Pedido de ajuda, perguntas frequentes, glossário | ⏳ |

## Estrutura

| Ficheiro / pasta | Conteúdo |
|---|---|
| `index.html`, `diagnostico.html` | Páginas do site |
| `css/`, `js/` | Aspeto e funcionamento |
| `dados/config.json` | **Único sítio com os valores legais** (custos, prazos) e a data da última verificação |
| `dados/concelhos.json` | Os 308 concelhos, com a indicação de terem ou não cadastro (gerado por `ferramentas/gerar_concelhos.py`) |
| `docs/` | Investigação com as fontes oficiais |

## Correr localmente e publicar

```
python -m http.server 8000      # depois abrir http://localhost:8000
```

O site é publicado com o GitHub Pages a partir do ramo `main`. Cada `git push` atualiza o site.
