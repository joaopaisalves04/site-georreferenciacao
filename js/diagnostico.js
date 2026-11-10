// Diagnóstico, pergunta 1: "Em que concelho fica o terreno?"
// Lê dados/concelhos.json e diz se o concelho está abrangido pelo BUPi
// (sem cadastro) ou se já tem cadastro.

const MAX_SUGESTOES = 6;

const FONTES = {
  continente: {
    texto: "Lei 65/2019, Anexo I, na redação do Decreto-Lei 90/2023",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Decreto_Lei_90_2023.pdf",
  },
  ilhas: {
    texto: "Lei 65/2019, Anexo II, na redação do Decreto-Lei 87/2026",
    url: "https://diariodarepublica.pt/dr/detalhe/decreto-lei/87-2026-1085738183",
  },
};

let concelhos = [];

// Tira acentos e põe em minúsculas, para "lousa" encontrar "Lousã".
function normalizar(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// O concelho serve se o nome, ou alguma palavra do nome, começar pelo texto escrito.
function procurar(texto) {
  const t = normalizar(texto);
  if (!t) return [];
  return concelhos.filter((c) =>
    c.chave.startsWith(t) || c.chave.split(/[\s-]+/).some((p) => p.startsWith(t))
  );
}

function mostrarSugestoes() {
  const texto = document.getElementById("campo-concelho").value;
  const lista = document.getElementById("lista-concelhos");
  const estado = document.getElementById("estado-pesquisa");
  lista.innerHTML = "";

  if (normalizar(texto).length < 2) {
    estado.textContent = "";
    return;
  }

  const encontrados = procurar(texto);
  if (encontrados.length === 0) {
    estado.textContent = "Não encontrámos nenhum concelho com esse nome. Verifique a escrita.";
    return;
  }

  encontrados.slice(0, MAX_SUGESTOES).forEach((c) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<span>${c.nome}<span class="local">${c.local}</span></span>`;
    b.addEventListener("click", () => mostrarResultado(c));
    li.appendChild(b);
    lista.appendChild(li);
  });

  estado.textContent = encontrados.length > MAX_SUGESTOES
    ? `Há ${encontrados.length} concelhos com estas letras. Continue a escrever para ver menos.`
    : (encontrados.length === 1 ? "Encontrámos 1 concelho:" : `Encontrámos ${encontrados.length} concelhos:`);
}

function mostrarResultado(c) {
  const titulo = document.getElementById("resultado-titulo");
  const corpo = document.getElementById("resultado-corpo");
  const ilhas = /Açores|Madeira/.test(c.local);
  const fonte = ilhas ? FONTES.ilhas : FONTES.continente;

  const selo = document.getElementById("resultado-selo");

  if (c.sem_cadastro) {
    selo.innerHTML = `<span class="selo selo-ok">✓ Concelho abrangido pelo BUPi</span>`;
    titulo.textContent = `${c.nome}: o terreno identifica-se no BUPi`;
    corpo.innerHTML = `
      <p><strong>${c.nome}</strong> (${c.local}) é um dos concelhos sem cadastro.
        Por isso, os terrenos <strong>rústicos e mistos</strong> identificam-se no BUPi.</p>
      <p>Essa identificação chama-se <strong>RGG</strong> (Representação Gráfica Georreferenciada):
        é um desenho dos limites do terreno sobre o mapa.</p>
      <h2>Quanto custa</h2>
      <div class="custos">
        <div class="custo custo-destaque">
          <span class="valor" data-valor="rgg_online">grátis</span>
          <span class="rotulo">Online, feita por si</span>
        </div>
        <div class="custo">
          <span class="valor" data-valor="rgg_balcao_ate_9">—</span>
          <span class="rotulo">No balcão, com técnico, por terreno
            (a partir do 10.º: <span data-valor="rgg_balcao_desde_10">—</span>)</span>
        </div>
      </div>
      <p class="caixa caixa-aviso"><strong>Atenção:</strong> se o prédio for só urbano
        (por exemplo, só uma casa), o BUPi não se aplica.</p>
      <p class="fonte">Fonte: <a href="${fonte.url}">${fonte.texto}</a>.</p>`;
  } else {
    selo.innerHTML = `<span class="selo selo-info">ℹ Concelho com cadastro</span>`;
    titulo.textContent = `${c.nome}: o concelho já tem cadastro`;
    corpo.innerHTML = `
      <p><strong>${c.nome}</strong> (${c.local}) <strong>não está</strong> na lista oficial
        de concelhos sem cadastro. Por isso, o terreno <strong>não se identifica no BUPi</strong>.</p>
      <p>Nestes concelhos, a forma e os limites dos terrenos já constam do cadastro
        da Direção-Geral do Território (DGT).</p>
      <p class="caixa">Este site foi pensado para os concelhos do BUPi. Para o seu caso,
        informe-se na câmara municipal, nas Finanças ou no
        <a href="https://www.dgterritorio.gov.pt/cadastro">site do cadastro da DGT</a>.</p>
      <p class="fonte">Fonte: <a href="${fonte.url}">${fonte.texto}</a>
        (o concelho não consta da lista).</p>`;
  }

  Config.preencher(corpo);
  document.getElementById("passo-concelho").hidden = true;
  document.getElementById("resultado").hidden = false;
  titulo.focus();
}

function voltarAPergunta() {
  document.getElementById("resultado").hidden = true;
  document.getElementById("passo-concelho").hidden = false;
  const campo = document.getElementById("campo-concelho");
  campo.value = "";
  mostrarSugestoes();
  campo.focus();
}

document.addEventListener("DOMContentLoaded", async () => {
  const campo = document.getElementById("campo-concelho");
  const estado = document.getElementById("estado-pesquisa");
  try {
    const r = await fetch("dados/concelhos.json");
    if (!r.ok) throw new Error(r.status);
    const dados = await r.json();
    concelhos = dados.concelhos.map((c) => ({ ...c, chave: normalizar(c.nome) }));
  } catch (e) {
    estado.textContent = "Não foi possível carregar a lista de concelhos. Tente recarregar a página.";
    campo.disabled = true;
    return;
  }
  campo.addEventListener("input", mostrarSugestoes);
  document.getElementById("mudar-concelho").addEventListener("click", voltarAPergunta);
});
