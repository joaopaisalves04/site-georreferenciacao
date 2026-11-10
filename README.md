# Preparar a identificação do terreno

> ⚠️ **Versão de teste.** Este é um serviço privado e independente: não pertence ao Estado nem ao BUPi. O site oficial é [bupi.gov.pt](https://bupi.gov.pt).

## 🌐 Ver o site

**👉 https://joaopaisalves04.github.io/site-georreferenciacao/**

O site atualiza-se sozinho 1 a 2 minutos depois de cada alteração no ramo `main`.

---

## O que é este projeto

O site ajuda donos de terrenos rústicos e mistos a **preparar-se** para a identificação do terreno no BUPi (a chamada RGG, Representação Gráfica Georreferenciada). Diz-lhes que documentos juntar, quanto custa e qual é o próximo passo.

**O que o site não faz:**
- Não faz, não valida nem regista a RGG. Isso faz-se no BUPi ou no balcão da câmara.
- Nunca pede a Chave Móvel Digital, PINs, palavras-passe ou números do Cartão de Cidadão.

## Em que ponto estamos

| Fase | O quê | Estado |
|---|---|---|
| 0 | Investigação: processo, custos, dados geográficos | ✅ Feita (ver `docs/`) |
| 1 | Escolha da tecnologia e estrutura | 📝 Proposta, à espera de decisões |
| 2 | Primeira versão: diagnóstico, mapa, formulário | ⏳ Por começar |
| — | Página inicial de teste | ✅ Online |

## O que está em cada ficheiro

| Ficheiro / pasta | Conteúdo |
|---|---|
| [`index.html`](index.html) | A página inicial do site |
| [`docs/conhecimento-bupi.md`](docs/conhecimento-bupi.md) | Como funciona o processo BUPi: passos, documentos, custos, prazos, glossário. Cada facto tem a sua fonte. |
| [`docs/dados-geograficos.md`](docs/dados-geograficos.md) | Mapas e dados públicos que podemos usar, e as respetivas licenças |
| [`docs/municipios-sem-cadastro.csv`](docs/municipios-sem-cadastro.csv) | Lista oficial dos concelhos abrangidos pelo BUPi |
| [`docs/proposta-fase1.md`](docs/proposta-fase1.md) | Proposta de tecnologia e estrutura do site |

---

## Como fazer alterações

### Opção A: no browser (para textos simples)

1. Clica no ficheiro que queres mudar (por exemplo `index.html`).
2. Clica no lápis ✏️ (canto superior direito do ficheiro).
3. Faz a alteração.
4. Carrega em **"Commit changes"** e escreve uma frase curta a dizer o que mudou.
5. Espera 1 a 2 minutos e recarrega o site.

### Opção B: no computador

Dentro da pasta do projeto, corre:

```
git pull                                   # traz as alterações que estão no GitHub
# ... editar os ficheiros ...
git add .
git commit -m "Frase curta a dizer o que mudou"
git push                                   # envia para o GitHub e o site atualiza
```

Para ver o site no computador antes de publicar, abre o `index.html` com duplo clique. Mais tarde, quando o site precisar de ler ficheiros de dados, vai ser preciso usar:

```
python -m http.server 8000
```

e abrir <http://localhost:8000>.

### Pequeno dicionário

| Termo | Significado |
|---|---|
| **commit** | Uma versão guardada, com uma frase a explicar o que mudou |
| **push** / **pull** | Enviar para o GitHub / trazer do GitHub |
| **branch** (ramo) | Uma cópia de trabalho para experimentar sem mexer no site publicado (`main`) |
| **pull request** | Pedido para juntar um ramo ao `main`. Mostra o que mudou, linha a linha, para rever antes de aprovar ("Merge") |
