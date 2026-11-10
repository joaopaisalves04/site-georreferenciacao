# Teste técnico: saber se um terreno já tem RGG a partir do número do artigo

Data: 2026-11-10. Objetivo: confirmar se a ideia do "painel da herança" é tecnicamente viável.

## Pergunta
Sabendo o **concelho** e o **número do artigo matricial** de um terreno (que vem na caderneta),
conseguimos saber, automaticamente, se esse terreno já foi identificado no BUPi (tem RGG)?

## Resposta curta
**Sim, com algumas limitações.** Usam-se os dados abertos da eBUPi (licença CC-BY), consultados em
direto a partir do browser.

## Serviço usado
- REST (ArcGIS): `https://geo.bupi.gov.pt/gisbupi/rest/services/opendata/RGG_DadosGovPT/MapServer/0/query`
- Campos úteis: `dico` (concelho), `dicofre` / `freguesiadesc` (freguesia), `numeromatriz` (artigo),
  `processoid`, área.
- CORS: o servidor aceita pedidos vindos do site (`Access-Control-Allow-Origin` com o domínio do GitHub Pages).
- Também funciona por WFS com filtro (FES), mas o REST é mais simples.
- **Total de RGG nos dados abertos à data do teste: 3 735 653.**

## O que descobrimos

| Aspeto | Resultado |
|---|---|
| Formato do artigo | Quase sempre `R-12345` (rústico). Algumas RGG têm vários artigos: `R-537, U-771` ou `R-12, R-34`. |
| O artigo identifica um terreno? | **Só junto com a freguesia.** Em Lousã, 2913 de 11 643 números de artigo existem em mais de uma freguesia; em Viseu, 6149 de 10 142. |
| Freguesia + artigo é único? | Quase sempre: 1 repetido em 15 323 (Lousã), 0 em 20 000 (Viseu), 1 em 19 999 (Montalegre). |
| Nomes de freguesias | Os dados misturam freguesias antigas, uniões de freguesias (2013) e freguesias desagregadas (2025): por exemplo, "Foz de Arouce" e "Foz de Arouce e Casal de Ermio". Não dá para cruzar com a CAOP 2025 pelo código. |
| Tempo de resposta | Cerca de 1,3 a 1,6 s por pesquisa. |

### Problema encontrado: bloqueio de segurança do servidor
Pesquisas com artigos de número curto (por exemplo `numeromatriz='R-1'`) devolvem **erro 403**. O filtro de
segurança do servidor parece confundir o padrão `-1'` com um ataque informático. `R-1108` passa sem problemas.

**Solução testada:** usar `LIKE 'R_1'` (o `_` vale por um carácter qualquer), o que evita escrever `-1'`.
Funcionou com R-1, R-2, R-18270, R-1108, com um artigo dentro de uma lista ("R-537, U-771") e com um artigo
inexistente (devolve vazio).

Pesquisa usada (para o artigo 1108 no concelho 1706):
```
dico='1706' AND (numeromatriz LIKE 'R_1108' OR numeromatriz LIKE 'R_1108,%'
                 OR numeromatriz LIKE '%, R_1108' OR numeromatriz LIKE '%, R_1108,%')
```

## Como o site deve funcionar
1. A pessoa escolhe o **concelho** e escreve o **número do artigo** (e, se souber, a freguesia).
2. O site pergunta ao BUPi por esse artigo **em todo o concelho**.
3. Mostra as freguesias onde aparece e a pessoa confirma qual é a sua (porque os nomes das freguesias variam).
4. Resultado: "Já identificado" (com a área e o número do processo) ou "Não encontrado".

## Limitações (a dizer sempre ao utilizador)
- **"Não encontrado" não quer dizer "não feito".** Pode haver RGG em curso que ainda não estão nos dados abertos,
  ou registadas com outra freguesia. Não sabemos com que frequência os dados abertos são atualizados.
- **Os números de artigo podem ter mudado** quando as freguesias se uniram ou separaram. **NÃO CONFIRMADO**:
  não verificámos se as cadernetas atuais usam os mesmos números que os dados do BUPi.
- **O contorno do bloqueio (`R_1`) depende das regras do servidor do BUPi**, que podem mudar sem aviso.
- Por respeito ao serviço público: uma pesquisa por concelho de cada vez, sem pesquisas automáticas em massa.

## Conclusão
A verificação automática é viável e é o principal fator que distingue o "painel da herança".
O que falta confirmar com pessoas reais: se os números de artigo das cadernetas coincidem com os dos dados do BUPi.
O ideal é testar com 2 ou 3 cadernetas verdadeiras de terrenos que já se saiba estarem identificados.
