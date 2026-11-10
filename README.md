# Site de preparação para a identificação de terrenos (BUPi)

**Versão de teste.** Este é um serviço privado e independente: não pertence ao Estado nem ao BUPi. O site oficial é [bupi.gov.pt](https://bupi.gov.pt).

## Ver o site no computador

Abra o ficheiro `index.html` com duplo clique. Por agora isso basta.

Mais tarde, quando o site precisar de ler ficheiros de dados, vai ser necessário um pequeno servidor local. Corra isto dentro desta pasta:

```
python -m http.server 8000
```

Depois abra <http://localhost:8000> no browser.

## Publicar alterações

O site é publicado com o GitHub Pages a partir do ramo `main`. Para publicar uma alteração, guarde-a com o git e envie-a para o GitHub:

```
git add .
git commit -m "Descrição curta da alteração"
git push
```

Passados um ou dois minutos, o site online fica atualizado.

## Pastas

- `index.html`: página inicial.
- `docs/`: a investigação de base (processo BUPi, dados geográficos, proposta técnica).
