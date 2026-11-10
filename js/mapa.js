// Esboço do terreno no mapa: desenhar, ver a área, comparar com a caderneta e exportar KML.
// É só um esboço: não é uma RGG e não tem valor legal.
//
// Camadas usadas:
//  - Ortofotos 2021, DGT (WMS)              https://cartografia.dgterritorio.gov.pt/wms/ortos2021
//  - OpenStreetMap (ODbL)                    https://www.openstreetmap.org/copyright
//  - RGG submetidas, dados abertos eBUPi (WFS, CC-BY)
// A área é calculada no sistema oficial PT-TM06 (EPSG:3763) no continente,
// e em UTM (WGS84) nas ilhas.

const CHAVE_GUARDAR = "esboco-terreno-v1";
const ZOOM_MIN_RGG = 16;
const WFS_BUPI = "https://geo.bupi.gov.pt/gisbupi/services/opendata/RGG_DadosGovPT/MapServer/WFSServer";

proj4.defs("EPSG:3763",
  "+proj=tmerc +lat_0=39.6682583333333 +lon_0=-8.13310833333333 +k=1 +x_0=0 +y_0=0 " +
  "+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

let mapa, camadaDesenho, camadaVertices, camadaLados, camadaRgg, camadaPosicao;
let pontos = [];           // [[lat, lng], ...]
let aDesenhar = false;
let pedidoRgg = 0;

// ---------- Utilitários ----------

const $ = (id) => document.getElementById(id);
const fmt = (n, casas = 0) => n.toLocaleString("pt-PT", { minimumFractionDigits: casas, maximumFractionDigits: casas });

function escapar(texto) {
  const d = document.createElement("div");
  d.textContent = String(texto);
  return d.innerHTML;
}

function projecaoPara(lat, lng) {
  // Continente: PT-TM06. Ilhas: zona UTM correspondente.
  if (lng > -10 && lat > 36.5) return "EPSG:3763";
  const zona = Math.floor((lng + 180) / 6) + 1;
  return `+proj=utm +zone=${zona} +datum=WGS84 +units=m +no_defs`;
}

// Área do polígono (m²), pela fórmula do "laço" depois de projetar em metros.
function areaM2(pts) {
  if (pts.length < 3) return 0;
  const proj = projecaoPara(pts[0][0], pts[0][1]);
  const xy = pts.map(([lat, lng]) => proj4("EPSG:4326", proj, [lng, lat]));
  let s = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

function perimetroM(pts) {
  if (pts.length < 2) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = L.latLng(pts[i]);
    const b = L.latLng(pts[(i + 1) % pts.length]);
    if (i === pts.length - 1 && pts.length < 3) break;
    s += a.distanceTo(b);
  }
  return s;
}

// Há lados que se cruzam? (desenho em forma de "8")
function cruzaSe(pts) {
  const n = pts.length;
  if (n < 4) return false;
  const seg = (i) => [pts[i], pts[(i + 1) % n]];
  const orient = (a, b, c) => Math.sign((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      const [p1, p2] = seg(i);
      const [p3, p4] = seg(j);
      if (orient(p1, p2, p3) !== orient(p1, p2, p4) && orient(p3, p4, p1) !== orient(p3, p4, p2)) return true;
    }
  }
  return false;
}

// Ponto dentro de polígono (pontos em [lat, lng]).
function dentro(p, poligono) {
  let d = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [yi, xi] = poligono[i];
    const [yj, xj] = poligono[j];
    if ((yi > p[0]) !== (yj > p[0]) && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

function segmentosCruzam(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

// Os dois polígonos sobrepõem-se? (algum canto dentro do outro, ou lados que se cruzam)
function sobrepoem(p1, p2) {
  if (p1.some((p) => dentro(p, p2)) || p2.some((p) => dentro(p, p1))) return true;
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      if (segmentosCruzam(p1[i], p1[(i + 1) % p1.length], p2[j], p2[(j + 1) % p2.length])) return true;
    }
  }
  return false;
}

// Quantos terrenos já identificados ficam por baixo do desenho?
function contarSobreposicoes() {
  if (pontos.length < 3 || !mapa.hasLayer(camadaRgg)) return 0;
  let n = 0;
  camadaRgg.eachLayer((l) => {
    const g = l.feature && l.feature.geometry;
    if (!g) return;
    const poligonos = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
    const toca = poligonos.some((pol) => {
      const anel = pol[0].map(([x, y]) => [y, x]);
      // Ignora sobreposições mínimas nas margens: exige uma parte interior em comum.
      return sobrepoem(pontos, anel) && (anel.some((p) => dentro(p, pontos)) || pontos.some((p) => dentro(p, anel)));
    });
    if (toca) n++;
  });
  return n;
}

// ---------- Mapa ----------

function criarMapa() {
  mapa = L.map("mapa", { zoomControl: true, tap: true }).setView([40.2, -8.0], 7);

  const ortos = L.tileLayer.wms("https://cartografia.dgterritorio.gov.pt/wms/ortos2021", {
    layers: "Ortos2021-RGB",
    format: "image/png",
    transparent: false,
    minZoom: 14,        // o serviço da DGT só devolve imagem a partir deste zoom
    maxZoom: 20,
    attribution: 'Ortofotomapas 2021 © <a href="https://www.dgterritorio.gov.pt/">DGT</a>',
  });
  const atribOsm = '© <a href="https://www.openstreetmap.org/copyright">contribuidores do OpenStreetMap</a>';
  const novoOsm = () => L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20, maxNativeZoom: 19, attribution: atribOsm,
  });
  // "Fotografia aérea": mapa de estradas por baixo (vista afastada) e fotografia por cima (vista próxima).
  const fotografia = L.layerGroup([novoOsm(), ortos]);
  const estradas = novoOsm();
  fotografia.addTo(mapa);
  L.control.layers({ "Fotografia aérea (DGT 2021)": fotografia, "Mapa de estradas (OpenStreetMap)": estradas }, null,
    { collapsed: window.innerWidth < 700, position: "topright" }).addTo(mapa);
  const dica = L.control({ position: "bottomleft" });
  dica.onAdd = () => {
    const d = L.DomUtil.create("div", "dica-zoom");
    d.textContent = "Aproxime o mapa para ver a fotografia aérea";
    return d;
  };
  const atualizarDica = () => {
    const ver = mapa.hasLayer(fotografia) && mapa.getZoom() < 14;
    if (ver && !dica._map) dica.addTo(mapa);
    if (!ver && dica._map) dica.remove();
  };
  mapa.on("zoomend baselayerchange", atualizarDica);
  atualizarDica();

  // Os terrenos vizinhos ficam num painel próprio, para deixarem de reagir ao toque enquanto se desenha.
  mapa.createPane("rgg");
  mapa.getPane("rgg").style.zIndex = 390;
  camadaRgg = L.geoJSON(null, {
    pane: "rgg",
    style: { color: "#ffd166", weight: 2, fillOpacity: 0.08, dashArray: "6 4" },
    onEachFeature: (f, camada) => {
      const p = f.properties || {};
      camada.bindPopup(`<strong>Terreno já identificado no BUPi</strong><br>
        Número nas Finanças (artigo): ${escapar(p.numeromatriz || "—")}<br>
        Freguesia: ${escapar(p.freguesiadesc || "—")}<br>
        Área: ${p.st_area_shape_ ? fmt(p.st_area_shape_) + " m²" : "—"}<br>
        <span class="fonte">Dados abertos eBUPi (CC-BY)</span>`);
    },
  });
  camadaDesenho = L.polygon([], { color: "#ff6b2c", weight: 4, fillColor: "#ff6b2c", fillOpacity: 0.2, interactive: false }).addTo(mapa);
  camadaLados = L.layerGroup().addTo(mapa);
  camadaVertices = L.layerGroup().addTo(mapa);
  camadaPosicao = L.layerGroup().addTo(mapa);

  mapa.on("click", (e) => {
    if (!aDesenhar) return;
    pontos.push([e.latlng.lat, e.latlng.lng]);
    atualizar();
  });
  mapa.on("moveend", () => {
    if ($("ver-rgg").checked) carregarRgg();
    atualizarAvisoZoom();
  });
  mapa.attributionControl.addAttribution("Limites: CAOP 2025, DGT");
}

function atualizarAvisoZoom() {
  const precisa = mapa.getZoom() < ZOOM_MIN_RGG;
  $("aviso-rgg").hidden = !($("ver-rgg").checked && precisa);
}

// ---------- RGG vizinhas (dados abertos eBUPi) ----------

async function carregarRgg() {
  if (mapa.getZoom() < ZOOM_MIN_RGG) { camadaRgg.clearLayers(); return; }
  const b = mapa.getBounds();
  const bbox = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map((n) => n.toFixed(6)).join(",");
  const url = `${WFS_BUPI}?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeNames=Dados_Abertos_-_RGG_Continente&outputFormat=GEOJSON&count=500` +
    `&srsName=urn:ogc:def:crs:EPSG::4326&bbox=${bbox},urn:ogc:def:crs:EPSG::4326`;
  const este = ++pedidoRgg;
  $("estado-rgg").textContent = "A procurar terrenos vizinhos…";
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const dados = await r.json();
    if (este !== pedidoRgg) return; // chegou um pedido mais recente
    camadaRgg.clearLayers();
    camadaRgg.addData(dados);
    camadaRgg.bringToBack();
    mostrarMedidas();
    const n = (dados.features || []).length;
    $("estado-rgg").textContent = n === 0
      ? "Aqui perto ainda não há terrenos identificados no BUPi."
      : (n === 1 ? "Há 1 terreno vizinho já identificado (linha amarela)."
        : `Há ${n} terrenos vizinhos já identificados (linhas amarelas).`) + " Toque num para ver os dados.";
  } catch (e) {
    if (este !== pedidoRgg) return;
    $("estado-rgg").textContent = "Não foi possível carregar os terrenos do BUPi neste momento. Tente mais tarde.";
  }
}

// ---------- Desenho ----------

// Escreve o comprimento de cada lado a meio do lado (ex.: "48 m").
function desenharLados() {
  camadaLados.clearLayers();
  const n = pontos.length;
  if (n < 2) return;
  const lados = n === 2 ? 1 : n;
  for (let i = 0; i < lados; i++) {
    const a = L.latLng(pontos[i]);
    const b = L.latLng(pontos[(i + 1) % n]);
    const meio = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
    L.marker(meio, {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({ className: "medida-lado", html: `<span>${fmt(a.distanceTo(b))} m</span>`, iconSize: null }),
    }).addTo(camadaLados);
  }
}

function atualizar() {
  camadaDesenho.setLatLngs(pontos);
  camadaVertices.clearLayers();
  pontos.forEach((p, i) => {
    const m = L.marker(p, {
      draggable: true,
      keyboard: false,
      icon: L.divIcon({ className: "vertice", html: `<span>${i + 1}</span>`, iconSize: [30, 30] }),
    });
    m.on("drag", (e) => {
      pontos[i] = [e.latlng.lat, e.latlng.lng];
      camadaDesenho.setLatLngs(pontos);
      desenharLados();
      mostrarMedidas();
    });
    m.on("dragend", () => { guardar(); atualizar(); });
    m.addTo(camadaVertices);
  });
  desenharLados();
  mostrarMedidas();
  guardar();
}

function mostrarMedidas() {
  const n = pontos.length;
  $("n-pontos").textContent = n === 0 ? "Ainda não marcou nenhum canto."
    : (n === 1 ? "1 canto marcado." : `${n} cantos marcados.`) + (n < 3 ? ` Faltam pelo menos ${3 - n}.` : "");
  $("terminar").disabled = n < 3;
  $("desfazer").disabled = n === 0;
  $("exportar").disabled = n < 3;

  const a = areaM2(pontos);
  if (n < 3) {
    $("area").textContent = "—";
    $("area-ha").textContent = "";
  } else {
    $("area").textContent = `${fmt(a)} m²`;
    $("area-ha").textContent = `ou seja, ${fmt(a / 10000, 2)} hectares`;
  }
  $("aviso-cruza").hidden = !cruzaSe(pontos);
  const nSob = contarSobreposicoes();
  $("aviso-sobrepoe").hidden = nSob === 0;
  $("aviso-sobrepoe").innerHTML = nSob === 0 ? "" : `<strong>O desenho fica por cima de ${nSob === 1 ? "1 terreno vizinho" : nSob + " terrenos vizinhos"}</strong>
    que já foram identificados. Confirme os limites com os vizinhos: se ficar assim, a identificação só é aceite «com reserva».
    <a class="fonte" href="https://bupi.gov.pt/pt/perguntas-frequentes">(fonte)</a>`;
  comparar();
}

function comparar() {
  const saida = $("comparacao");
  const valor = parseFloat(($("area-caderneta").value || "").replace(/\s/g, "").replace(",", "."));
  const unidade = $("unidade-caderneta").value;
  const a = areaM2(pontos);
  if (!valor || valor <= 0 || pontos.length < 3) { saida.innerHTML = ""; return; }

  const caderneta = unidade === "ha" ? valor * 10000 : valor;
  const dif = a - caderneta;
  const pct = (dif / caderneta) * 100;
  const sinal = dif >= 0 ? "maior" : "menor";
  let classe = "caixa caixa-ok";
  let conselho = "✓ Estão muito parecidas.";
  if (Math.abs(pct) >= 10) {
    classe = "caixa caixa-aviso";
    conselho = `A diferença é grande. Confirme se os cantos estão no sítio certo. Se tiver a certeza,
      não faz mal: a caderneta pode estar errada, e a área certa é enviada às Finanças depois da identificação.`;
  } else if (Math.abs(pct) >= 3) {
    classe = "caixa";
    conselho = "Há uma pequena diferença, normal num desenho feito à mão. Pode aproximar o mapa e acertar os cantos.";
  }
  saida.innerHTML = `<div class="${classe}">
    <p>Desenho: <strong>${fmt(a)} m²</strong>. Caderneta: <strong>${fmt(caderneta)} m²</strong>.</p>
    <p>O desenho é <strong>${fmt(Math.abs(pct), 0)} % ${sinal}</strong>. ${conselho}</p>
    <a class="fonte" href="https://bupi.gov.pt/pt/perguntas-frequentes">(fonte)</a></div>`;
}

function modoDesenho(ligar) {
  aDesenhar = ligar;
  mapa.getPane("rgg").classList.toggle("sem-toque", ligar);
  if (ligar) { mapa.doubleClickZoom.disable(); mapa.closePopup(); } else mapa.doubleClickZoom.enable();
  $("mapa").classList.toggle("a-desenhar", ligar);
}

// ---------- Passos do guia (1 Encontrar, 2 Desenhar, 3 Pronto) ----------

function irPasso(n) {
  [1, 2, 3].forEach((i) => { $(`passo-${i}`).hidden = i !== n; });
  document.querySelectorAll("[data-guia]").forEach((li) => {
    const i = Number(li.dataset.guia);
    li.classList.toggle("atual", i === n);
    li.classList.toggle("feito", i < n);
    if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  });
  modoDesenho(n === 2);
  if (n === 3 && pontos.length >= 3) mapa.fitBounds(L.latLngBounds(pontos), { maxZoom: 19, padding: [30, 30] });
  mostrarMedidas();
  const titulo = $(`passo-${n}`).querySelector("h2");
  titulo.setAttribute("tabindex", "-1");
  titulo.focus({ preventScroll: true });
  // No telemóvel, as instruções ficam por cima do mapa: mostrar o início do passo.
  if (window.innerWidth < 900 && document.readyState === "complete") {
    $(`passo-${n}`).scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ---------- Guardar no próprio browser ----------

function guardar() {
  try { localStorage.setItem(CHAVE_GUARDAR, JSON.stringify(pontos)); } catch (e) { /* sem espaço ou bloqueado */ }
}

function recuperar() {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE_GUARDAR) || "[]");
    if (Array.isArray(p) && p.every((x) => Array.isArray(x) && x.length === 2)) return p;
  } catch (e) { /* ignora */ }
  return [];
}

// ---------- KML ----------

function gerarKml() {
  const coords = pontos.concat([pontos[0]])
    .map(([lat, lng]) => `${lng.toFixed(7)},${lat.toFixed(7)},0`).join(" ");
  const nome = ($("nome-terreno").value || "Esboço do terreno").trim();
  const a = areaM2(pontos);
  const data = new Date().toISOString().slice(0, 10);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(nome)}</name>
    <Style id="esboco"><LineStyle><color>ff2c6bff</color><width>3</width></LineStyle><PolyStyle><color>332c6bff</color></PolyStyle></Style>
    <Placemark>
      <name>${esc(nome)}</name>
      <description>Esboço feito em ${data}. Área aproximada: ${Math.round(a)} m2. ESBOÇO SEM VALOR LEGAL: não é uma RGG.</description>
      <styleUrl>#esboco</styleUrl>
      <Polygon>
        <outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>
`;
}

function exportarKml() {
  if (pontos.length < 3) return;
  const blob = new Blob([gerarKml()], { type: "application/vnd.google-earth.kml+xml" });
  const a = document.createElement("a");
  const nome = ($("nome-terreno").value || "esboco-terreno").trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").toLowerCase() || "esboco-terreno";
  a.href = URL.createObjectURL(blob);
  a.download = `${nome}.kml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- Abrir um ficheiro KML (lido só no aparelho) ----------

// Devolve os pontos [lat, lng] do primeiro polígono do KML (ou de uma linha, se não houver polígono).
function lerKml(texto) {
  const xml = new DOMParser().parseFromString(texto, "application/xml");
  if (xml.getElementsByTagName("parsererror").length) throw new Error("ficheiro inválido");
  const procurar = (sel) => {
    for (const el of xml.getElementsByTagNameNS("*", "coordinates")) {
      if (el.closest && el.closest(sel)) return el.textContent;
      // closest() não existe em alguns browsers para XML: subir à mão
      for (let p = el.parentNode; p; p = p.parentNode) if (p.localName === sel) return el.textContent;
    }
    return null;
  };
  const coords = procurar("outerBoundaryIs") || procurar("LineString");
  if (!coords) throw new Error("sem polígono");
  let pts = coords.trim().split(/\s+/).map((c) => c.split(",").map(Number))
    .filter((c) => c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
    .map(([lng, lat]) => [lat, lng]);
  const [a, b] = [pts[0], pts[pts.length - 1]];
  if (pts.length > 1 && a[0] === b[0] && a[1] === b[1]) pts = pts.slice(0, -1); // anel fechado
  if (pts.length < 3) throw new Error("poucos pontos");
  if (pts.some(([lat, lng]) => Math.abs(lat) > 90 || Math.abs(lng) > 180)) throw new Error("coordenadas inválidas");
  return pts;
}

function abrirKml(ficheiro) {
  const estado = $("estado-kml");
  if (!ficheiro) return;
  if (/\.kmz$/i.test(ficheiro.name)) {
    estado.textContent = "Os ficheiros KMZ não são suportados. Abra-o no Google Earth e guarde-o como KML.";
    return;
  }
  if (ficheiro.size > 5 * 1024 * 1024) { estado.textContent = "O ficheiro é demasiado grande (máximo 5 MB)."; return; }
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      pontos = lerKml(String(leitor.result));
      atualizar();
      irPasso(3);
      estado.textContent = `Ficheiro aberto: ${pontos.length} cantos. Para os acertar, carregue em «Corrigir o desenho».`;
      $("mapa").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      estado.textContent = "Não foi possível ler um terreno neste ficheiro. Confirme que é um KML com um polígono.";
    }
  };
  leitor.readAsText(ficheiro);
}

// ---------- Procurar local e GPS ----------

function ligarPesquisa() {
  const campo = $("procurar-local");
  const lista = $("resultados-local");
  Locais.ligarCampo(campo, (encontrados) => {
    lista.innerHTML = "";
    encontrados.slice(0, 6).forEach((r) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `<span>${escapar(r.nome)}<span class="local">${escapar(r.descricao)}</span></span>`;
      b.addEventListener("click", () => {
        const [o, s, e, n] = r.bbox;
        mapa.fitBounds([[s, o], [n, e]]);
        lista.innerHTML = "";
        campo.value = r.nome;
        document.getElementById("mapa").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      li.appendChild(b);
      lista.appendChild(li);
    });
  });
}

function irParaPosicao(marcarCanto) {
  const estado = $("estado-gps");
  if (!navigator.geolocation) { estado.textContent = "Este aparelho não permite saber a localização."; return; }
  estado.textContent = "A procurar a sua localização…";
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude, accuracy } = pos.coords;
    camadaPosicao.clearLayers();
    L.circle([latitude, longitude], { radius: accuracy, color: "#2c7be5", weight: 1, fillOpacity: 0.15 }).addTo(camadaPosicao);
    L.circleMarker([latitude, longitude], { radius: 7, color: "#fff", weight: 2, fillColor: "#2c7be5", fillOpacity: 1 }).addTo(camadaPosicao);
    if (marcarCanto) {
      pontos.push([latitude, longitude]);
      atualizar();
      mapa.setView([latitude, longitude], Math.max(mapa.getZoom(), 18));
    } else {
      mapa.setView([latitude, longitude], 18);
    }
    estado.textContent = `Localização encontrada (precisão de cerca de ${fmt(accuracy)} m).` +
      (accuracy > 15 ? " A precisão é fraca: espere uns segundos ao ar livre e tente de novo." : "");
  }, () => {
    estado.textContent = "Não foi possível obter a localização. Confirme que deu autorização ao browser.";
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
}

// ---------- Arranque ----------

document.addEventListener("DOMContentLoaded", async () => {
  criarMapa();
  Locais.carregar().then(ligarPesquisa);

  $("ir-passo-2").addEventListener("click", () => irPasso(2));
  $("voltar-passo-1").addEventListener("click", () => irPasso(1));
  $("terminar").addEventListener("click", () => irPasso(3));
  $("corrigir").addEventListener("click", () => irPasso(2));
  $("desfazer").addEventListener("click", () => { pontos.pop(); atualizar(); });
  $("apagar").addEventListener("click", () => { pontos = []; atualizar(); irPasso(2); });
  $("exportar").addEventListener("click", exportarKml);
  $("abrir-kml").addEventListener("change", (e) => { abrirKml(e.target.files[0]); e.target.value = ""; });
  $("area-caderneta").addEventListener("input", comparar);
  $("unidade-caderneta").addEventListener("change", comparar);
  $("gps-ir").addEventListener("click", () => irParaPosicao(false));
  $("gps-canto").addEventListener("click", () => irParaPosicao(true));
  $("ver-rgg").addEventListener("change", () => {
    if ($("ver-rgg").checked) { camadaRgg.addTo(mapa); carregarRgg(); }
    else { camadaRgg.remove(); $("estado-rgg").textContent = ""; }
    atualizarAvisoZoom();
    mostrarMedidas();
  });

  // Se houver um desenho guardado neste aparelho, abre-o já no passo "Pronto".
  pontos = recuperar();
  if (pontos.length >= 3) {
    atualizar();
    irPasso(3);
    $("estado-kml").textContent = "";
  } else {
    pontos = [];
    irPasso(1);
  }
});
