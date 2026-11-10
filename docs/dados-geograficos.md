# Dados geográficos públicos disponíveis

> **Data de consulta: 9 de novembro de 2026.** Os testes técnicos (pedidos feitos aos serviços) foram também feitos nesta data.
> Regra seguida: só se usam dados **explicitamente abertos** ou serviços **publicados para uso público**. Não se faz scraping de nada.

## Resumo rápido

| Camada | Serviço | Testado? | Licença | Útil para o site? |
|---|---|---|---|---|
| Municípios sem cadastro (153 + 20) | Texto legal → `municipios-sem-cadastro.csv` | ✅ | Legislação (uso livre) | **Sim**: base do diagnóstico "BUPi ou cadastro" |
| RGG já submetidas no BUPi (polígonos) | WMS + WFS + GeoPackage (dados.gov.pt) | ✅ WMS e WFS funcionam | **CC-BY** | **Sim**: mostrar terrenos vizinhos já identificados |
| Progresso BUPi por freguesia | CSV/JSON (dados.gov.pt) | ✅ metadados | **CC-BY** | Talvez: estatísticas por concelho |
| Ortofotos DGT 2021 (25 cm?) | WMS | ✅ devolve imagem | ⚠️ Licença não indicada no serviço ("Fees: no conditions apply") | **Sim**: fundo do mapa de esboço (licença a confirmar) |
| OrtoSat 2023 (satélite, 30 cm) | WMS e OGC API | ✅ capabilities | ⚠️ Imagens licenciadas pela Airbus; visualização WMS "de acesso público"; download só para a Administração Pública | Sim, como alternativa (licença a confirmar) |
| CAOP 2025 (limites de distritos, concelhos e freguesias) | OGC API Features (GeoJSON) | ✅ com CORS | CC-BY 4.0 (dados do Centro de Dados DGT) | **Sim**: saber o concelho a partir do ponto no mapa |
| Cadastro predial (parcelas) | OGC API Features | ✅ metadados | Provavelmente CC-BY 4.0 (**a confirmar**) | Sim: avisar "este ponto já está em zona de cadastro" |
| Linhas de água (DGT) | OGC API | ✅ | CC-BY 4.0 (**a confirmar**) | ❌ **Não**: é EuroRegionalMap (escala ~1:250 000), demasiado grosseiro |
| Estradas (DGT) | OGC API | ✅ | idem | ❌ **Não**: idem (EuroRegionalMap) |
| Rede Rodoviária Nacional (SRUP) | OGC API | ✅ metadados | a confirmar | Parcial: só estradas nacionais, não caminhos |
| Rede hidrográfica geocodificada (APA) | WMS/WFS INSPIRE + Shapefile | ❌ não testado | CC BY 4.0 (dados.gov.pt) / "sem restrições" (INSPIRE) | **Sim, provavelmente**: muito mais detalhada (~101 mil troços) |
| OpenStreetMap (estradas, caminhos, ribeiras) | Tiles / Overpass | ❌ não testado | ODbL (atribuição; partilha nas mesmas condições se redistribuirmos dados derivados) | **Sim**: o único com caminhos rurais em todo o país |
| Mapa Público BUPi | Aplicação web | ❌ bloqueia pedidos automáticos (HTTP 403) | — | **Só como link** (não fazer scraping) |
| Lista de municípios aderentes / balcões | Página web com JavaScript | ❌ sem dados abertos | — | Só como link |
| Camadas de domínio público usadas pelo BUPi | Internas ao BUPi | ❌ não públicas | — | **Não disponíveis** |

---

## 1. Municípios sem cadastro (lista legal)

- **O que é:** os 153 concelhos do continente (Anexo I da Lei 65/2019, na redação do DL 90/2023) e os 20 dos Açores e Madeira (Anexo II, na redação do DL 87/2026) onde se aplica o BUPi.
- **Ficheiro:** `docs/municipios-sem-cadastro.csv` (extraído automaticamente do texto da lei; 153 + 20 linhas; "Calheta" aparece duas vezes porque há uma nos Açores e outra na Madeira).
- **Fontes:**
  - DL 90/2023, Anexo I: [cópia no Portal das Finanças](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Decreto_Lei_90_2023.pdf)
  - DL 87/2026, Anexo: [PDF DR](https://files.diariodarepublica.pt/1s/2026/04/07300/0000500022.pdf)
- **Licença:** texto legal; uso livre.
- **Limitação:** a lista diz onde *não há cadastro em vigor*. Uma RGG validada por todos os confinantes passa a CGP (cadastro), por isso, com o tempo, há prédios com cadastro dentro destes concelhos. A camada "Cadastro predial" da DGT (secção 6) ajuda a detetar isso.
- **A fazer na Fase 2:** associar cada nome ao **código INE (DICO)** da CAOP, para não depender da grafia dos nomes.

## 2. RGG submetidas no BUPi (dados abertos eBUPi)

- **Página:** https://dados.gov.pt/datasets/representacao-grafica-georreferenciada
- **Publicador:** eBUPi (Estrutura de Missão para a Expansão do Sistema de Informação Cadastral Simplificado)
- **Licença:** **CC-BY** (atribuição obrigatória)
- **Atualização:** "diariamente nos serviços WMS/WFS e quinzenalmente em Geopackage"
- **Serviços:**
  - WMS Continente: `https://geo.bupi.gov.pt/gisbupi/services/opendata/RGG_DadosGovPT/MapServer/WMSServer`
  - WFS Continente: `https://geo.bupi.gov.pt/gisbupi/services/opendata/RGG_DadosGovPT/MapServer/WFSServer`
  - WMS/WFS Madeira: `https://geo.bupi.gov.pt/arcgis/services/opendata/RGG_DadosGovPT_Madeira/MapServer/...`
  - GeoPackage do continente: ~680 MB (não usar no site; só para análise local)
- **Atributos (WFS):** `processoid`, `di`/`distritodesc`, `dico`/`concelhodesc`, `dicofre`/`freguesiadesc`, `numeromatriz`, `baldio`, `integrada_cadastro`, área e perímetro. **Não inclui nomes de pessoas.**
- **Teste técnico:** o WMS GetMap devolveu um PNG. O WFS GetFeature devolveu GeoJSON em EPSG:4326. O servidor envia o cabeçalho CORS (`Access-Control-Allow-Origin`), por isso o browser pode pedi-lo diretamente.
- **Sistemas de coordenadas:** EPSG:3763 (PT-TM06), EPSG:4326 e CRS:84. ⚠️ **Não anuncia EPSG:3857** (o sistema habitual do Leaflet). Como camada WMS no Leaflet pode precisar de pedir em EPSG:4326, ou usar WFS/GeoJSON. Testar na Fase 2.
- **Utilidade:** mostrar ao utilizador os terrenos **vizinhos que já têm RGG**, para alinhar o esboço e evitar sobreposições. E também verificar se o próprio terreno já foi identificado.

## 3. Progresso da georreferenciação por freguesia

- **Página:** https://dados.gov.pt/datasets/progresso-da-georreferenciacao-de-municipios-e-freguesias-bupi
- **Licença:** CC-BY · **Atualização:** mensal · **Formatos:** CSV (~12 MB) e JSON (~65 MB)
- **Campos:** ano, mês, DICOFRE, freguesia, DICO, concelho, canal (presencial/digital), processos abertos e finalizados, matrizes georreferenciadas, …
- **Utilidade:** opcional. Por exemplo, "No seu concelho já foram identificados X terrenos". Também serve como indício de que um concelho tem atividade BUPi.

## 4. Ortofotos e imagens de satélite (DGT)

| Produto | Endpoint WMS | Camadas | CRS (inclui 3857?) |
|---|---|---|---|
| Ortos 2021 (Continente) | `https://cartografia.dgterritorio.gov.pt/wms/ortos2021` | `Ortos2021-RGB`, `Ortos2021-IRG` | ✅ EPSG:3857, 3763, 4258, 4326 |
| OrtoSat 2023 (satélite Pléiades-Neo) | `https://ortos.dgterritorio.gov.pt/wms/ortosat2023` | `ortoSat2023-CorVerdadeira`, `ortoSat2023-FalsaCor` | ✅ idem |

- **Teste técnico:** o GetMap das Ortos2021 em EPSG:3857 devolveu um PNG de 64 KB. Funciona diretamente no Leaflet (`L.tileLayer.wms`).
- **Licença / condições:**
  - O GetCapabilities dos dois serviços diz `Fees: no conditions apply` e não tem `AccessConstraints`.
  - Sobre o OrtoSat2023, a DGT diz: "O serviço de visualização é de acesso público através de um serviço WMS" e "O serviço de descarregamento está apenas disponível para as entidades da Administração Pública" ([página DGT](https://www.dgterritorio.gov.pt/formularios/ortosat2023)). As imagens são da Airbus ([termo de utilização](https://www.dgterritorio.gov.pt/sites/default/files/ficheiros-dgt/Termo_de_utilizacao-OrtoSat2023.pdf)). Os metadados citados por terceiros pedem o crédito "DGT" e "© Airbus DS 2023".
  - ⚠️ **NÃO CONFIRMADO:** se um **site privado** (possivelmente com fins comerciais) pode mostrar estes WMS ao público. **Recomendação:** antes de publicar, enviar um email à DGT a pedir confirmação. Até lá, mostrar sempre a atribuição "Ortofotos: DGT".
- **Alternativa** se a DGT não autorizar: imagem de satélite de um fornecedor comercial (por exemplo, Esri World Imagery). Tem os seus próprios termos, que seria preciso ler.
- **Arquivo histórico:** a OGC API da DGT tem ortofotos de 1995, 2004–06, 2007, 2010, 2012, 2015 e 2018. Pode ser útil mais tarde para ver antigos limites e muros.

## 5. Limites administrativos (CAOP 2025)

- **OGC API (GeoJSON):** `https://ogcapi.dgterritorio.gov.pt/collections/{distritos|municipios|freguesias}/items`
- **Teste técnico:** responde com CORS ativo (o browser pode pedir diretamente).
- **Licença:** a DGT indica que os dados do seu Centro de Dados estão sob **CC-BY 4.0**, "que permite a utilização livre e gratuita dos dados", com a menção da DGT como entidade proprietária ([dados abertos DGT](https://www.dgterritorio.gov.pt/dados-abertos)). A CAOP está entre as coleções listadas. O endpoint OGC API não declara a licença em si.
- **Aprovação da CAOP 2025:** Aviso n.º 3502/2026/2, DR II série de 18/02/2026 ([PDF DGT](https://www.dgterritorio.gov.pt/sites/default/files/ficheiros-artigos/DR_AvisoCAOP2025.pdf)).
- **Utilidade:** dado um ponto no mapa, saber o concelho e a freguesia, e cruzar com a lista de municípios sem cadastro. Em alternativa, mais leve: um ficheiro estático simplificado só com os concelhos, gerado uma vez e guardado no site.

## 6. Cadastro predial (DGT)

- **OGC API:** `https://ogcapi.dgterritorio.gov.pt/collections/cadastro/items` ("Parcelas Cadastrais", palavra-chave `DL_72_2023`, "cadastro predial atualizado")
- **Licença:** provavelmente CC-BY 4.0, por estar entre os dados abertos da DGT. ⚠️ **A confirmar.**
- **Utilidade:** verificar se o ponto escolhido já está numa parcela cadastrada. Nesse caso usa-se a CGP, não a RGG.
- A FAQ do BUPi remete para o "Visualizador da DGT" para verificar a existência de CGP ([FAQ](https://bupi.gov.pt/pt/perguntas-frequentes)).

## 7. Rede hidrográfica (linhas de água)

| Fonte | Detalhe | Serviço | Licença | Avaliação |
|---|---|---|---|---|
| DGT `linhas_agua` | 14 761 elementos; identificadores `EG.ERM` = **EuroRegionalMap** (escala ~1:250 000) | OGC API | CC-BY 4.0 (a confirmar) | ❌ Demasiado grosseiro para terrenos de poucos hectares |
| APA, Rede hidrográfica geocodificada | ~101 231 troços; EPSG:3763 | WMS/WFS INSPIRE em `inspire.apambiente.pt` + Shapefile | CC BY 4.0 segundo o [dados.gov.pt](https://dados.gov.pt/en/datasets/rede-hidrografica-geocodificada); "sem restrições" segundo o [INSPIRE](https://inspire-geoportal.ec.europa.eu/srv/api/records/D49E859C-E430-4B0E-896C-1D75536B339E) | ✅ Candidato principal (**testar na Fase 2**) |
| OpenStreetMap (`waterway=*`) | Varia; muitas ribeiras pequenas estão mapeadas | Overpass API / tiles | ODbL | ✅ Complemento |

**Atenção:** nenhuma destas camadas é a que o BUPi usa para verificar o domínio público hídrico. Essa informação é carregada no BUPi pelas entidades públicas ([DR 8/2026](https://files.diariodarepublica.pt/1s/2026/09/18300/0003500046.pdf), art. 4.º-A, n.º 2) e não é pública. Os avisos do site têm de dizer: "**indicativo; pode haver linhas de água ou caminhos que não aparecem aqui**".

## 8. Rede viária e caminhos

| Fonte | Detalhe | Avaliação |
|---|---|---|
| DGT `estradas` | 48 399 elementos, EuroRegionalMap (~1:250 000) | ❌ Grosseiro |
| DGT `srup_rede_viaria` (Rede Rodoviária Nacional) | Só estradas nacionais (servidão administrativa) | ⚠️ Útil mas incompleto |
| OpenStreetMap (`highway=*`, incluindo `track` e `path`) | Inclui caminhos rurais e florestais em boa parte do território | ✅ O mais útil para avisos, sempre como "indicativo" |
| Caminhos municipais / vicinais | Não há camada nacional aberta (**NÃO ENCONTRADA**) | ❌ É justamente onde há mais conflitos |

OpenStreetMap, notas de licença: mostrar os mapas base de OSM exige a atribuição "© contribuidores do OpenStreetMap". O servidor de tiles `tile.openstreetmap.org` tem uma política de uso justo (baixo volume, sem uso intensivo). Para consultas de caminhos, a Overpass API pública também tem limites de uso. **Avaliar na Fase 1.**

## 9. Mapa Público BUPi e GeoPortal

- **Mapa Público:** `https://mapapublico.bupi.gov.pt/pesquisaprocesso/`. Permite pesquisar por n.º de processo ou por distrito + concelho + freguesia + artigo matricial ([manual, abril 2026](https://www.cm-montalegre.pt/cmmontalegre/uploads/writer_file/document/4906/manual_mapa_publico_do_bupi.pdf)).
- **Pedidos automáticos:** devolvem HTTP 403 (bloqueado). **Não vamos fazer scraping.** O site limita-se a pôr um link e a explicar como pesquisar.
- **GeoPortal:** segundo fontes secundárias, reúne o Mapa Público, os dados abertos, um dashboard e a App ([idealista](https://www.idealista.pt/news/node/74315)). **URL exato NÃO CONFIRMADO.**
- **Os dados por trás do Mapa Público** (polígonos das RGG) estão disponíveis legalmente pelo WMS/WFS da secção 2. É esse que devemos usar.

## 10. O que não existe (ou não encontrei) como dados abertos

- A lista de municípios **aderentes** e de **balcões BUPi** com moradas e horários.
- As camadas de **domínio público** que o BUPi usa na validação.
- Os **caminhos municipais e vicinais** a nível nacional.
- Uma **API** do BUPi para cidadãos (consultar o estado de um processo, submeter): não existe publicamente, e não devemos tentar usá-la.

---

## Notas técnicas para a Fase 1/2

- **Leaflet + WMS da DGT:** compatível (EPSG:3857 suportado).
- **Leaflet + RGG BUPi:** usar WFS (GeoJSON, EPSG:4326, com CORS) **só para a área visível e com zoom alto**, para não pedir milhares de polígonos. Em alternativa, WMS em EPSG:4326, se o Leaflet o permitir. Testar.
- **Área do polígono:** calcular no browser (por exemplo, com `@turf/area`, área geodésica). Para comparar com a caderneta, a precisão é suficiente. Explicar ao utilizador que pode diferir ligeiramente da área calculada pelo BUPi, que usa PT-TM06.
- **Exportação KML:** formato aceite pelo BUPi segundo a FAQ e o manual. Coordenadas em WGS84 (lon, lat), polígono fechado.
- **Atribuições obrigatórias no mapa:** "Ortofotos: DGT" (e "© Airbus DS 2023" se usarmos o OrtoSat), "RGG: eBUPi, dados.gov.pt (CC-BY)", "Limites: CAOP 2025, DGT (CC-BY 4.0)" e "© contribuidores do OpenStreetMap" (se usarmos OSM).
