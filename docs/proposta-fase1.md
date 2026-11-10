# Fase 1: proposta de estrutura e tecnologia

Data: 2026-11-09. Estado: **proposta à espera de aprovação**. Nada disto foi implementado.

---

## 1. Princípios que orientam as escolhas

1. **Simples de manter por uma pessoa.** Ficheiros que se abrem e editam num editor de texto, sem ferramentas complicadas.
2. **Sem custos fixos.** Alojamento gratuito; nenhum serviço pago sem a tua autorização.
3. **Privacidade por defeito.** Sem cookies, sem estatísticas de visitas e sem bibliotecas carregadas de servidores de terceiros (CDN). A única exceção são os mapas: as imagens de fundo vêm da DGT e, eventualmente, do OpenStreetMap, e isso fica explicado na política de privacidade.
4. **Acessível a pessoas mais velhas.**
   - Letra base de 20 px.
   - Contraste alto, com objetivo WCAG AAA: 7:1 no texto.
   - Botões com pelo menos 48 px de altura.
   - Uma pergunta por ecrã e no máximo 5 ou 6 opções.
   - Pensado primeiro para telemóvel.
5. **Uma única fonte para os valores legais:** `dados/config.json`.

---

## 2. Tecnologia: o que proponho e as alternativas

### 2.1 Como fazer as páginas

| Opção | Como funciona | Prós | Contras |
|---|---|---|---|
| **A. HTML + CSS + JavaScript simples, sem passo de construção (recomendada)** | Cada página é um ficheiro `.html`. O JavaScript lê `config.json` e `regras.json` e preenche os valores. | Zero instalações. Abre-se em qualquer editor. O GitHub/Netlify publicam os ficheiros tal como estão. Fácil de perceber com o teu HTML/CSS básico. | O cabeçalho e o rodapé ficam repetidos em cada página (cerca de 10 páginas, aceitável). Os valores legais só aparecem com JavaScript ligado (praticamente todos os browsers o têm). |
| B. Gerador estático Eleventy (Node.js) | Modelos e um comando `npx @11ty/eleventy` geram o site. | Sem repetição; valores injetados no HTML final. | Obriga a instalar e aprender Node.js e npm, e acrescenta um passo antes de publicar. |
| C. Script Python próprio de "montagem" | Um `construir.py` junta cabeçalho, rodapé e valores. | Usa uma linguagem que já conheces. | Código nosso para manter. Acaba por ser um mini-Eleventy. |

**Porquê a A:** o site é pequeno, o diagnóstico e o mapa precisam de JavaScript de qualquer forma, e evitar o passo de construção reduz a hipótese de erros ao publicar. Se mais tarde o site crescer, passar para a B é fácil.

Para cumprir a regra do ficheiro único, os valores aparecem no HTML assim:

```html
<span data-valor="rgg_balcao_ate_9">ver tabela de custos</span>
```

Quando a página abre, o `js/comum.js` troca o texto pelo valor do `config.json` (por exemplo "15 €"). Se o JavaScript falhar, aparece "ver tabela de custos". **Nenhum valor legal fica escrito à mão nas páginas.**

### 2.2 Mapa

| Peça | Proposta | Alternativa | Porquê |
|---|---|---|---|
| Biblioteca de mapa | **Leaflet 1.9** (licença BSD), copiada para `vendor/` | OpenLayers | É a que pediste, é leve e tem boa documentação. |
| Desenho do polígono | **Ferramenta própria simples**: "toque nos cantos do terreno", com botões grandes "Desfazer último ponto", "Apagar tudo" e "Terminar" | Leaflet-Geoman (MIT) ou Leaflet.draw | As bibliotecas de desenho têm botões pequenos e muitas opções, o que é mau para o nosso público. Uma ferramenta própria tem cerca de 150 linhas. |
| Cálculo da área | **proj4js** (MIT): converte para PT-TM06 (EPSG:3763) e calcula a área plana | Turf.js `area` (aproximação esférica) | O PT-TM06 é o sistema oficial português, por isso a área fica mais próxima da que o BUPi calcula. A diferença é pequena, mas é mais correto. |
| Exportar KML | Código próprio, que gera o KML em WGS84 | Biblioteca `tokml` | Um polígono em KML são cerca de 20 linhas de texto; não justifica uma biblioteca. |
| Fundo | **Ortofotos DGT 2021 (WMS)** como fundo principal, com o mapa OpenStreetMap como opção para encontrar estradas e localidades | Esri/Google | As da Esri e da Google têm termos restritivos ou pagos. **A licença das ortofotos DGT continua por confirmar** (ver ponto 6). |
| RGG vizinhas | WFS do BUPi (GeoJSON, CC-BY), pedido **só com zoom alto** e só para a área visível | WMS em EPSG:4326 | Evita pedir milhares de polígonos. Fica desligado por defeito, com um botão "Mostrar terrenos vizinhos já identificados". |
| Concelho a partir do ponto | OGC API da DGT (CAOP 2025, CC-BY 4.0) | Ficheiro local com os limites | Sempre atualizado e sem ficheiros pesados no site. |

### 2.3 Alojamento

| Opção | Custo | Uso comercial | Formulário incluído | Notas |
|---|---|---|---|---|
| **Netlify, plano grátis (recomendada se o serviço for comercial)** | 0 € | Os termos do plano grátis não o proíbem | **Sim (Netlify Forms)**. Desde 14/04/2026 as submissões são gratuitas e ilimitadas nos planos de créditos ([changelog Netlify](https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/)) | Plano grátis com 300 créditos/mês. Se ultrapassar, o site **pausa** até ao mês seguinte; para um site pequeno isso é improvável. Os dados ficam em servidores dos EUA (precisa de menção na política de privacidade). |
| GitHub Pages | 0 € | ❌ **Não permite** "run your online business" ([limites GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)) | Não; precisa de um serviço externo (ex.: Formspree, 50 submissões/mês grátis, [limites Formspree](https://help.formspree.io/articles/account-management/account-limits)) | Ótimo se o site for apenas informativo e sem fins comerciais. |
| Cloudflare Pages | 0 € | Fontes secundárias dizem que sim (**não confirmado** nos termos oficiais) | Não incluído | Boa alternativa, um pouco mais técnica. |

**A minha recomendação depende de uma resposta tua:** o pedido de ajuda vai dar origem a um serviço pago (teu ou de um parceiro)?
- **Sim, ou talvez:** usar a Netlify, com hosting e formulário no mesmo sítio.
- **Não, é só informativo:** pode ser o GitHub Pages e o formulário via Formspree, ou também a Netlify.

O código fica sempre no GitHub, como cópia de segurança e histórico, seja qual for o alojamento.

### 2.4 Formulário de pedido de ajuda (dados pessoais)

- **Campos:** nome, contacto (telefone ou email), concelho, tipo de situação (lista), descrição curta (máximo 500 caracteres) e uma caixa de consentimento RGPD **não pré-marcada**.
- **Proibido:** anexos de documentos, número do CC, NIF, Chave Móvel Digital, senhas ou PINs. A descrição terá um aviso: "Não escreva números de documentos nem senhas."
- **Antispam:** um campo escondido que só os robôs preenchem (honeypot), sem CAPTCHA da Google.
- **Para onde vão os pedidos:** ficam no painel da Netlify e chega um aviso ao teu email.
- **O RGPD obriga a ter uma página de privacidade** com:
  - quem é o responsável (o teu nome ou empresa, e um contacto);
  - para que servem os dados (responder ao pedido);
  - quanto tempo os guardamos (proponho 12 meses);
  - os direitos de acesso e apagamento;
  - a transferência para os EUA (Netlify) e o direito de queixa à CNPD.

**Isto obriga-te a identificar-te publicamente como responsável.**

### 2.5 Testes

- **`ferramentas/validar_regras.py` (Python):** confirma que cada regra do `regras.json` tem fonte e que todos os valores referidos existem no `config.json`. Corre antes de cada publicação.
- **Lista de verificação manual:** telemóvel, zoom a 200 %, só teclado e leitor de ecrã (NVDA).
- **Lighthouse** (incluído no Chrome): verificação de acessibilidade, com objetivo de 100.

---

## 3. Estrutura do site

```
site-georreferenciacao/
├── index.html            Início: para quem é, o que fazemos e o que NÃO fazemos
├── diagnostico.html      Diagnóstico guiado (uma pergunta por ecrã)
├── mapa.html             Esboço do terreno no mapa
├── carta.html            "Recebeu uma carta do BUPi?" (proposta nova, opcional)
├── ajuda.html            Formulário de pedido de ajuda
├── perguntas.html        Perguntas frequentes
├── glossario.html        Glossário
├── custos.html           Tabela de custos e prazos (lida do config.json)
├── privacidade.html      Política de privacidade (obrigatória por causa do formulário)
├── sobre.html            Quem somos, aviso de serviço privado, ligações oficiais
├── css/estilo.css
├── js/
│   ├── comum.js          Preenche valores do config, data de verificação, menu
│   ├── diagnostico.js    Motor do diagnóstico (lê regras.json)
│   └── mapa.js           Desenho, área, comparação, KML
├── dados/
│   ├── config.json       TODOS os valores legais + "data_verificacao"
│   ├── regras.json       Regras do diagnóstico, cada uma com fonte
│   └── concelhos.json    Os 308 concelhos, com a marca "sem cadastro" (gerado do CSV + CAOP)
├── vendor/               Leaflet e proj4js (cópias locais)
├── ferramentas/          Scripts Python de manutenção (não publicados)
├── docs/                 Investigação (Fase 0) e esta proposta
└── README.md             Como correr localmente e publicar
```

**Em todas as páginas:**
- **Cabeçalho:** o nome do site (não "BUPi") e uma faixa fixa com o texto: "Serviço privado e independente. Não pertence ao Estado nem ao BUPi. Site oficial: [bupi.gov.pt](https://bupi.gov.pt)".
- **Rodapé:** "Valores legais verificados em 9 de novembro de 2026" (lido do `config.json`) e ligações para a privacidade e para "sobre".
- **Cores:** neutras (por exemplo, azul-escuro e branco). **Não usamos as cores nem o logótipo do BUPi ou do Governo.**

### 3.1 Diagnóstico: o fluxo

1. **Onde fica o terreno?** A pessoa escreve as primeiras letras do concelho e aparecem até 6 botões grandes com sugestões. É mais simples do que uma lista de 308 nomes.
2. **Que tipo de prédio é?** Rústico / Misto / Urbano / Não sei (com a explicação de onde ver isto na caderneta).
3. **Qual é a sua relação com o terreno?** Dono único / Coproprietário / Herdeiro (herança por partilhar) / Representante com procuração / Comprador ou vendedor.
4. **Que documentos tem?** Escolha múltipla com caixas grandes: caderneta, certidão do registo, escritura, habilitação de herdeiros, nenhum.
5. **O que pretende?** Vender ou doar / Partilhar uma herança / Pedir um apoio ou subsídio / Pôr em ordem / Recebi uma carta.

**Resultado:**
- se o caso é BUPi ou cadastro;
- a lista de documentos;
- os custos (online grátis ou balcão);
- os avisos de risco (por exemplo, terreno junto a uma ribeira ou caminho, prédio urbano, sem documentos);
- o próximo passo, com links oficiais;
- botões para "Fazer esboço no mapa", "Imprimir esta página" e "Pedir ajuda".

O diagnóstico não guarda nada: as respostas ficam só no browser da pessoa.

**Casos de saída rápida:**
- **Urbano:** "o BUPi não se aplica a prédios só urbanos".
- **Concelho com cadastro:** "o seu concelho tem cadastro; o caminho é outro", com uma ligação para a DGT.

---

## 4. Plano da Fase 2 (MVP), em commits pequenos

1. Esqueleto: `index.html`, `css`, `comum.js`, `config.json`, README.
2. Páginas de conteúdo: sobre, privacidade, custos, glossário e perguntas frequentes.
3. `regras.json` e `validar_regras.py`.
4. Diagnóstico.
5. Mapa: fundo, desenho, área, comparação com a caderneta e KML.
6. Mapa: RGG vizinhas e concelho a partir do ponto.
7. Formulário de ajuda.
8. Revisão de acessibilidade e testes.

No fim, paro para tu reveres. A publicação só acontece com a tua autorização.

---

## 5. Decisões que preciso que tomes

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| 1 | Forma de construir o site | A (HTML simples) / B (Eleventy) / C (Python) | **A** |
| 2 | Alojamento | Netlify / GitHub Pages / Cloudflare Pages | **Netlify** se houver serviço comercial; caso contrário, qualquer uma |
| 3 | O serviço de ajuda é pago ou comercial? | Sim / Não / Ainda não sei | Precisa da tua resposta (afeta o alojamento e a página "sobre") |
| 4 | Nome do site | A tua escolha (sem "BUPi"). Ideias: "Terreno em Ordem", "Prepare o seu Terreno", "Primeiro Passo Terreno" | Tua decisão |
| 5 | Domínio próprio (ex.: `terrenoemordem.pt`, cerca de 10 a 20 €/ano) | Sim / Não (usar `algo.netlify.app`, grátis) | Começar **sem domínio**; comprar quando estiver pronto |
| 6 | Responsável pelos dados no formulário | O teu nome / uma empresa | Necessário para a página de privacidade |
| 7 | Prazo de conservação dos pedidos | 6 / 12 / 24 meses | **12 meses** |
| 8 | Pedir autorização à DGT para usar as ortofotos | Eu redijo o email e tu envias / não pedir | **Redigir o email**; até haver resposta, pode-se desenvolver com as ortofotos, mas não publicar |
| 9 | Página "Recebeu uma carta do BUPi?" | Incluir no MVP / deixar para depois | **Incluir** (é simples e responde a uma dúvida comum) |
| 10 | Fundo OpenStreetMap como alternativa | Sim / Não | **Sim**, com atribuição e uso baixo, conforme a política do OSM |

## 6. Riscos conhecidos

- **Licença das ortofotos DGT por confirmar.** Plano B: OSM, sem imagem aérea, o que torna o esboço muito mais difícil.
- **Serviços externos podem mudar** (WFS do BUPi, OGC API da DGT). O site tem de funcionar mesmo que estes falhem, com mensagens claras do tipo "camada temporariamente indisponível".
- **Os valores legais mudam:** o `config.json` tem a data de verificação, e o README explica como os rever.
- **Responsabilidade:** o diagnóstico é orientativo. Cada resultado inclui um aviso: "Esta informação não substitui o atendimento do BUPi ou da câmara."
