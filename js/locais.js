// Pesquisa de concelhos e freguesias (usada no diagnóstico e no mapa).
// Dados: dados/concelhos.json e dados/freguesias.json (CAOP 2025, DGT, CC-BY 4.0).

const Locais = (() => {
  let concelhos = [];
  let freguesias = [];
  let promessa = null;

  function normalizar(texto) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  // O texto escrito serve se o nome, ou uma palavra do nome, começar por ele.
  function corresponde(chave, q) {
    return chave.startsWith(q) || chave.split(/[\s\-(),]+/).some((p) => p && p.startsWith(q));
  }

  function carregar() {
    if (!promessa) {
      promessa = Promise.all([
        fetch("dados/concelhos.json").then((r) => r.json()),
        fetch("dados/freguesias.json").then((r) => r.json()),
      ]).then(([c, f]) => {
        concelhos = c.concelhos.map((x) => ({ ...x, chave: normalizar(x.nome) }));
        freguesias = f.freguesias.map((x) => ({ ...x, chave: normalizar(x.nome) }));
      });
    }
    return promessa;
  }

  function concelhoDe(nome, local) {
    return concelhos.find((c) => c.nome === nome && (!local || c.local === local));
  }

  // Devolve concelhos primeiro e depois freguesias, sempre com o concelho associado.
  function procurar(texto) {
    const q = normalizar(texto);
    if (q.length < 2) return [];
    const r = concelhos
      .filter((c) => corresponde(c.chave, q))
      .map((c) => ({ tipo: "concelho", nome: c.nome, descricao: c.local, concelho: c, bbox: c.bbox }));
    // Exatos primeiro (quem escreve "Porto" quer o Porto, não Porto de Mós).
    r.sort((a, b) => (normalizar(b.nome) === q) - (normalizar(a.nome) === q));
    const f = freguesias
      .filter((x) => corresponde(x.chave, q))
      .map((x) => {
        const c = concelhoDe(x.concelho, x.local);
        return { tipo: "freguesia", nome: x.nome, descricao: `freguesia do concelho de ${x.concelho}`, concelho: c, bbox: x.bbox };
      });
    f.sort((a, b) => (normalizar(b.nome) === q) - (normalizar(a.nome) === q));
    return r.concat(f);
  }

  return { carregar, procurar, normalizar, concelhoDe };
})();
