// Formulário de pedido de ajuda.
// VERSÃO DE TESTE: valida os campos mas NÃO envia nada para lado nenhum.
// Quando houver um serviço de envio aprovado, é aqui que se liga.

const $ = (id) => document.getElementById(id);

// Sequências que parecem números de documentos: NIF (9 dígitos), CC (8 dígitos + letras), etc.
const PARECE_DOCUMENTO = /\b\d{8,9}\b|\b\d{8}\s?\d?\s?[A-Z]{2}\d\b/i;

function mostrarErro(id, mostrar) {
  $(id).hidden = !mostrar;
  const campo = $(id).closest(".campo")?.querySelector("input, select, textarea");
  if (campo) campo.setAttribute("aria-invalid", mostrar ? "true" : "false");
}

function contactoValido(via, valor) {
  const v = valor.trim();
  if (via === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  return v.replace(/[\s+()-]/g, "").length >= 9 && /^[\d\s+()-]+$/.test(v);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = $("formulario-ajuda");

  form.querySelectorAll('input[name="via"]').forEach((r) => r.addEventListener("change", () => {
    const email = form.via.value === "email";
    $("rotulo-contacto").textContent = email ? "Endereço de email" : "Número de telefone";
    $("contacto").setAttribute("autocomplete", email ? "email" : "tel");
    $("contacto").setAttribute("inputmode", email ? "email" : "tel");
  }));

  $("descricao").addEventListener("input", () => {
    const t = $("descricao").value;
    $("contador").textContent = `${t.length} de 500 caracteres`;
    $("aviso-numeros").hidden = !PARECE_DOCUMENTO.test(t);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("website").value) return; // robô de spam

    const erros = {
      "erro-nome": $("nome").value.trim().length < 2,
      "erro-contacto": !contactoValido(form.via.value, $("contacto").value),
      "erro-concelho": $("concelho").value.trim().length < 2,
      "erro-situacao": !$("situacao").value,
      "erro-consentimento": !$("consentimento").checked,
    };
    Object.entries(erros).forEach(([id, mal]) => mostrarErro(id, mal));
    if (PARECE_DOCUMENTO.test($("descricao").value)) {
      $("aviso-numeros").hidden = false;
      $("descricao").focus();
      return;
    }
    const primeiro = Object.keys(erros).find((id) => erros[id]);
    if (primeiro) {
      const campo = $(primeiro).closest(".campo").querySelector("input, select, textarea");
      campo.focus();
      return;
    }

    // Versão de teste: não envia. Mostra a confirmação e limpa o formulário.
    form.reset();
    $("contador").textContent = "0 de 500 caracteres";
    form.hidden = true;
    $("resultado-ajuda").hidden = false;
    $("resultado-ajuda").focus();
  });

  $("voltar-formulario").addEventListener("click", () => {
    $("resultado-ajuda").hidden = true;
    form.hidden = false;
    $("nome").focus();
  });
});
