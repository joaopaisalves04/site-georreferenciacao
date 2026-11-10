// Diagnóstico guiado: uma pergunta por ecrã.
// As perguntas e as regras estão em dados/regras.json; os valores legais em dados/config.json;
// a lista de concelhos em dados/concelhos.json. As respostas ficam só neste browser.

const MAX_SUGESTOES = 6;

const FONTES_CONCELHOS = {
  continente: {
    nome: "Lei 65/2019, Anexo I, na redação do Decreto-Lei 90/2023",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Decreto_Lei_90_2023.pdf",
  },
  ilhas: {
    nome: "Lei 65/2019, Anexo II, na redação do Decreto-Lei 87/2026",
    url: "https://diariodarepublica.pt/dr/detalhe/decreto-lei/87-2026-1085738183",
  },
};

let regras, cfg, concelhos;
const respostas = {};
let indice = 0;

const ecra = () => document.getElementById("ecra");

// ---------- Utilitários ----------

function normalizar(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function t(texto) {
  return Config.substituir(texto, cfg);
}

function escapar(texto) {
  const d = document.createElement("div");
  d.textContent = texto;
  return d.innerHTML;
}

function linkFontes(codigos) {
  const links = codigos.map((c) => {
    const f = regras.fontes[c];
    return `<a href="${f.url}">${f.nome}</a>`;
  });
  return `<span class="fonte">Fonte: ${links.join("; ")}</span>`;
}

// A regra aplica-se? Todas as condições de "quando" têm de ser verdadeiras.
function aplica(regra) {
  if (!regra.quando) return true;
  return Object.entries(regra.quando).every(([pergunta, cond]) => {
    const r = respostas[pergunta];
    const lista = Array.isArray(r) ? r : [r];
    if (cond.em) return cond.em.includes(r);
    if (cond.contem) return cond.contem.some((x) => lista.includes(x));
    if (cond.nao_contem) return !cond.nao_contem.some((x) => lista.includes(x));
    return true;
  });
}

function mostrar(html) {
  ecra().innerHTML = html;
  const h1 = ecra().querySelector("h1");
  if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus(); }
  window.scrollTo({ top: 0 });
}

function cabecalhoPergunta() {
  const total = regras.perguntas.length;
  const n = indice + 1;
  return `
    <div class="progresso">
      <span class="progresso-texto">Pergunta ${n} de ${total}</span>
      <div class="progresso-barra" aria-hidden="true"><span style="width:${(n / total) * 100}%"></span></div>
    </div>`;
}

function botaoVoltar() {
  return `<div class="botoes"><button type="button" class="botao-secundario" data-acao="voltar">← Voltar</button></div>`;
}

// ---------- Navegação ----------

function irPara(i) {
  indice = i;
  const p = regras.perguntas[i];
  if (p.tipo === "concelho") perguntaConcelho(p);
  else if (p.tipo === "escolha") perguntaEscolha(p);
  else if (p.tipo === "varias") perguntaVarias(p);
}

function seguinte() {
  if (indice + 1 < regras.perguntas.length) irPara(indice + 1);
  else mostrarResultado();
}

function voltar() {
  if (indice === 0 && !respostas.concelho) window.location.href = "index.html";
  else irPara(indice);
}

// ---------- Pergunta: concelho ----------

function perguntaConcelho(p) {
  mostrar(`
    ${cabecalhoPergunta()}
    <h1>${p.titulo}</h1>
    <label for="campo-concelho">Escreva as primeiras letras do concelho</label>
    <input type="text" id="campo-concelho" autocomplete="off" placeholder="Por exemplo: Lousã"
           aria-describedby="ajuda-concelho" aria-controls="lista-concelhos">
    <p id="ajuda-concelho" class="ajuda">Depois toque no nome certo na lista que aparece.</p>
    <p id="estado-pesquisa" class="estado" aria-live="polite"></p>
    <ul id="lista-concelhos" class="opcoes"></ul>`);

  const campo = document.getElementById("campo-concelho");
  campo.addEventListener("input", () => sugerirConcelhos(campo.value));
}

function procurarConcelhos(texto) {
  const q = normalizar(texto);
  if (!q) return [];
  return concelhos.filter((c) =>
    c.chave.startsWith(q) || c.chave.split(/[\s-]+/).some((parte) => parte.startsWith(q))
  );
}

function sugerirConcelhos(texto) {
  const lista = document.getElementById("lista-concelhos");
  const estado = document.getElementById("estado-pesquisa");
  lista.innerHTML = "";
  if (normalizar(texto).length < 2) { estado.textContent = ""; return; }

  const encontrados = procurarConcelhos(texto);
  if (encontrados.length === 0) {
    estado.textContent = "Não encontrámos nenhum concelho com esse nome. Escreva o nome do concelho (não da freguesia nem da aldeia) e verifique a escrita.";
    return;
  }
  encontrados.slice(0, MAX_SUGESTOES).forEach((c) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<span>${escapar(c.nome)}<span class="local">${escapar(c.local)}</span></span>`;
    b.addEventListener("click", () => escolherConcelho(c));
    li.appendChild(b);
    lista.appendChild(li);
  });
  estado.textContent = encontrados.length > MAX_SUGESTOES
    ? `Há ${encontrados.length} concelhos com estas letras. Continue a escrever para ver menos.`
    : (encontrados.length === 1 ? "Encontrámos 1 concelho:" : `Encontrámos ${encontrados.length} concelhos:`);
}

function fonteConcelho(c) {
  return /Açores|Madeira/.test(c.local) ? FONTES_CONCELHOS.ilhas : FONTES_CONCELHOS.continente;
}

function escolherConcelho(c) {
  respostas.concelho = c;
  if (c.sem_cadastro) { seguinte(); return; }

  const f = fonteConcelho(c);
  mostrar(`
    <span class="selo selo-info">ℹ Concelho com cadastro</span>
    <h1>${escapar(c.nome)}: o concelho já tem cadastro</h1>
    <p><strong>${escapar(c.nome)}</strong> (${escapar(c.local)}) <strong>não está</strong> na lista oficial
      de concelhos sem cadastro. Por isso, o terreno <strong>não se identifica no BUPi</strong>.</p>
    <p>Nestes concelhos, a forma e os limites dos terrenos já constam do cadastro
      da Direção-Geral do Território (DGT).</p>
    <p class="caixa">Este site foi pensado para os concelhos do BUPi. Para o seu caso,
      informe-se na câmara municipal, nas Finanças ou no
      <a href="https://www.dgterritorio.gov.pt/cadastro">site do cadastro da DGT</a>.</p>
    <p class="fonte">Fonte: <a href="${f.url}">${f.nome}</a> (o concelho não consta da lista).</p>
    ${botaoVoltar()}`);
}

// ---------- Pergunta: escolha única ----------

function seloConcelho() {
  const c = respostas.concelho;
  if (indice !== 1 || !c) return "";
  const f = fonteConcelho(c);
  return `<p class="caixa caixa-ok">✓ <strong>${escapar(c.nome)}</strong> está abrangido pelo BUPi.<br>
    <span class="fonte">Fonte: <a href="${f.url}">${f.nome}</a></span></p>`;
}

function perguntaEscolha(p) {
  const opcoes = p.opcoes.map((o) => `
    <li><button type="button" data-opcao="${o.id}" class="${respostas[p.id] === o.id ? "escolhida" : ""}">
      <span>${o.texto}${o.detalhe ? `<span class="local">${o.detalhe}</span>` : ""}</span>
    </button></li>`).join("");

  mostrar(`
    ${cabecalhoPergunta()}
    ${seloConcelho()}
    <h1>${p.titulo}</h1>
    ${p.ajuda ? `<p class="ajuda">${p.ajuda}</p>` : ""}
    <ul class="opcoes">${opcoes}</ul>
    <div class="botoes"><button type="button" class="botao-secundario" data-acao="anterior">← Voltar</button></div>`);

  ecra().querySelectorAll("[data-opcao]").forEach((b) => {
    b.addEventListener("click", () => {
      const o = p.opcoes.find((x) => x.id === b.dataset.opcao);
      respostas[p.id] = o.id;
      if (o.fim) mostrarFim(regras.fins[o.fim]);
      else seguinte();
    });
  });
}

function mostrarFim(fim) {
  mostrar(`
    <span class="selo selo-info">ℹ Resultado</span>
    <h1>${fim.titulo}</h1>
    <p>${t(fim.texto)}</p>
    <p>${linkFontes(fim.fonte)}</p>
    ${botaoVoltar()}`);
}

// ---------- Pergunta: escolha múltipla ----------

function perguntaVarias(p) {
  const marcadas = respostas[p.id] || [];
  const opcoes = p.opcoes.map((o) => `
    <li><label class="opcao-marcar">
      <input type="checkbox" value="${o.id}" ${marcadas.includes(o.id) ? "checked" : ""}>
      <span>${o.texto}${o.detalhe ? `<span class="local">${o.detalhe}</span>` : ""}</span>
    </label></li>`).join("");

  mostrar(`
    ${cabecalhoPergunta()}
    <h1>${p.titulo}</h1>
    ${p.ajuda ? `<p class="ajuda">${p.ajuda}</p>` : ""}
    <ul class="opcoes">${opcoes}</ul>
    <p id="aviso-varias" class="estado" aria-live="polite"></p>
    <div class="botoes">
      <button type="button" data-acao="continuar">Continuar →</button>
      <button type="button" class="botao-secundario" data-acao="anterior">← Voltar</button>
    </div>`);

  const caixas = [...ecra().querySelectorAll("input[type=checkbox]")];
  const opcao = (id) => p.opcoes.find((x) => x.id === id);
  caixas.forEach((cx) => cx.addEventListener("change", () => {
    if (!cx.checked) return;
    const o = opcao(cx.value);
    caixas.forEach((outra) => {
      if (outra === cx) return;
      const oo = opcao(outra.value);
      // "Nenhum destes" desmarca tudo o resto (e vice-versa); "não está nas Finanças" exclui "caderneta".
      if (o.exclusivo || oo.exclusivo) outra.checked = false;
      if ((o.exclusivo_com || []).includes(oo.id) || (oo.exclusivo_com || []).includes(o.id)) outra.checked = false;
    });
  }));

  ecra().querySelector("[data-acao=continuar]").addEventListener("click", () => {
    const escolhidas = caixas.filter((c) => c.checked).map((c) => c.value);
    if (escolhidas.length === 0) {
      document.getElementById("aviso-varias").textContent = "Escolha pelo menos uma opção (ou «Nenhum destes»).";
      return;
    }
    respostas[p.id] = escolhidas;
    seguinte();
  });
}

// ---------- Resultado final ----------

function textoResposta(pergunta) {
  const p = regras.perguntas.find((x) => x.id === pergunta);
  const r = respostas[pergunta];
  if (pergunta === "concelho") return r.nome;
  const ids = Array.isArray(r) ? r : [r];
  return ids.map((id) => p.opcoes.find((o) => o.id === id).texto).join(", ");
}

function mostrarResultado() {
  indice = regras.perguntas.length; // "Voltar" no resultado regressa à última pergunta
  const tem = respostas.documentos || [];

  const docs = regras.documentos.filter(aplica).map((d) => {
    let estado, icone;
    if (d.informativo) { estado = "info"; icone = "i"; }
    else if ((d.satisfeito_por || []).some((x) => tem.includes(x))) { estado = "tem"; icone = "✓"; }
    else { estado = "falta"; icone = "!"; }
    const etiqueta = { tem: "Já tem", falta: "Falta", info: "A preparar" }[estado];
    return `
      <li class="doc doc-${estado}">
        <span class="doc-icone" aria-hidden="true">${icone}</span>
        <div>
          <span class="doc-etiqueta">${etiqueta}</span>
          <strong class="doc-titulo">${t(d.texto)}</strong>
          ${d.detalhe ? `<p>${t(d.detalhe)}</p>` : ""}
          ${linkFontes(d.fonte)}
        </div>
      </li>`;
  }).join("");

  const custos = regras.custos.filter(aplica).map((c) => `
    <div class="custo ${c.destaque ? "custo-destaque" : ""}">
      <span class="valor">${t(c.valor)}</span>
      <span class="rotulo">${t(c.texto)}</span>
      ${linkFontes(c.fonte)}
    </div>`).join("");

  const objetivos = regras.objetivos.filter(aplica).map((o) => `
    <div class="caixa">${t(o.texto)}<br>${linkFontes(o.fonte)}</div>`).join("");

  const cuidados = regras.cuidados.filter(aplica).map((c) => `
    <li>${t(c.texto)}<br>${linkFontes(c.fonte)}</li>`).join("");

  const passos = regras.passos.filter(aplica).map((p) => `
    <li>${t(p.texto)}<br>${linkFontes(p.fonte)}</li>`).join("");

  const resumo = regras.perguntas.map((p) => `
    <li>${p.titulo} <strong>${escapar(textoResposta(p.id))}</strong></li>`).join("");

  mostrar(`
    <span class="selo selo-ok">✓ Diagnóstico concluído</span>
    <h1>O seu plano para identificar o terreno</h1>
    <p>O terreno em <strong>${escapar(respostas.concelho.nome)}</strong> identifica-se no BUPi.
      Com base nas suas respostas, isto é o que precisa de saber.</p>

    ${objetivos}

    <h2>Documentos</h2>
    <ul class="lista-docs">${docs}</ul>

    <h2>Quanto custa</h2>
    <div class="custos">${custos}</div>

    <h2>Cuidados a ter</h2>
    <ul class="lista-cuidados">${cuidados}</ul>

    <h2>Próximos passos</h2>
    <ol class="lista-passos">${passos}</ol>

    <details class="resumo">
      <summary>Ver as minhas respostas</summary>
      <ul>${resumo}</ul>
    </details>

    <p class="caixa caixa-aviso">Esta informação é orientativa e não substitui o atendimento
      do BUPi ou da câmara municipal. Este site não faz nem submete a RGG.</p>

    <div class="botoes nao-imprimir">
      <button type="button" data-acao="imprimir">Imprimir ou guardar em PDF</button>
      <button type="button" class="botao-secundario" data-acao="anterior">← Voltar</button>
      <button type="button" class="botao-secundario" data-acao="recomecar">Recomeçar</button>
    </div>`);
}

// ---------- Arranque ----------

document.addEventListener("click", (e) => {
  const acao = e.target.closest("[data-acao]")?.dataset.acao;
  if (acao === "voltar") voltar();
  else if (acao === "anterior") {
    if (indice === 0) window.location.href = "index.html";
    else irPara(indice - 1);
  }
  else if (acao === "imprimir") window.print();
  else if (acao === "recomecar") {
    Object.keys(respostas).forEach((k) => delete respostas[k]);
    irPara(0);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [r, c, l] = await Promise.all([
      fetch("dados/regras.json").then((x) => x.json()),
      Config.carregar(),
      fetch("dados/concelhos.json").then((x) => x.json()),
    ]);
    regras = r;
    cfg = c;
    concelhos = l.concelhos.map((x) => ({ ...x, chave: normalizar(x.nome) }));
  } catch (e) {
    ecra().innerHTML = `<p class="caixa caixa-aviso">Não foi possível carregar o diagnóstico.
      Tente recarregar a página.</p>`;
    console.error(e);
    return;
  }
  irPara(0);
});
