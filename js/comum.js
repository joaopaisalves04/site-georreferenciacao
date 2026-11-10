// Código comum a todas as páginas.
// Lê dados/config.json e:
//  - escreve a data de verificação nos elementos com data-data-verificacao;
//  - troca o texto dos elementos com data-valor="chave" pelo valor da chave.
// Se algo falhar, fica o texto que já estava no HTML.

const Config = (() => {
  let promessa = null;

  function carregar() {
    if (!promessa) {
      promessa = fetch("dados/config.json").then((r) => {
        if (!r.ok) throw new Error("config.json: " + r.status);
        return r.json();
      });
    }
    return promessa;
  }

  function formatarValor(v) {
    switch (v.unidade) {
      case "euro":
        return v.valor === 0 ? "grátis" : v.valor.toLocaleString("pt-PT") + " €";
      case "percentagem":
        return Math.round(v.valor * 100) + " %";
      case "dias_uteis":
        return v.valor + " dias úteis";
      default:
        return String(v.valor);
    }
  }

  function formatarData(iso) {
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d).toLocaleDateString("pt-PT", {
      day: "numeric", month: "long", year: "numeric",
    });
  }

  // Preenche os valores dentro de um elemento (por defeito, a página toda).
  async function preencher(raiz = document) {
    try {
      const cfg = await carregar();
      raiz.querySelectorAll("[data-valor]").forEach((el) => {
        const v = cfg.valores[el.dataset.valor];
        if (v) el.textContent = formatarValor(v);
      });
      raiz.querySelectorAll("[data-data-verificacao]").forEach((el) => {
        el.textContent = formatarData(cfg.data_verificacao);
      });
    } catch (e) {
      console.warn("Não foi possível ler a configuração:", e);
    }
  }

  return { carregar, preencher };
})();

document.addEventListener("DOMContentLoaded", () => Config.preencher());
