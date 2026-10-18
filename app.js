/* =========================================================
   StreamFind
   Fontes (gratuitas, sem chave):
   - Wikidata          → catálogo/busca, direção, elenco, gêneros, prêmios, duração, emissora
   - Wikipédia         → pôsteres e sinopse em português
   - iTunes Brasil     → rankings em alta, trailers, preço de aluguel
   ========================================================= */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const app = $("#app");

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icones = () => window.lucide && lucide.createIcons();
const HORA = 3600e3;
const DIA = 24 * HORA;

/* ---------- Cache (memória + localStorage) ---------- */
const memoria = new Map();

function lerCache(chave) {
  try {
    const v = JSON.parse(localStorage.getItem("sf:" + chave));
    if (v && v.exp > Date.now()) return v.dados;
  } catch (e) { /* armazenamento indisponível */ }
  return null;
}

function gravarCache(chave, dados, ttl) {
  const valor = JSON.stringify({ exp: Date.now() + ttl, dados });
  try {
    localStorage.setItem("sf:" + chave, valor);
  } catch (e) {
    // Cota cheia: limpa o cache antigo (preserva a lista do usuário)
    try {
      Object.keys(localStorage).filter(k => k.startsWith("sf:http")).forEach(k => localStorage.removeItem(k));
      localStorage.setItem("sf:" + chave, valor);
    } catch (e2) { /* ignora */ }
  }
}

function buscarJSON(url, ttl = 6 * HORA) {
  if (memoria.has(url)) return memoria.get(url);
  const salvo = lerCache(url);
  if (salvo) return Promise.resolve(salvo);
  const p = fetch(url)
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(d => { gravarCache(url, d, ttl); return d; })
    .catch(e => { memoria.delete(url); throw e; });
  memoria.set(url, p);
  return p;
}

/* ---------- Normalização de títulos ---------- */
const registro = new Map(); // chave → item

function guardar(item) {
  const atual = registro.get(item.chave);
  registro.set(item.chave, atual ? { ...atual, ...item } : item);
  return registro.get(item.chave);
}

const imgItunes = (url, w) => url ? url.replace(/\/[^/]+$/, `/${w}x${Math.round(w * 1.5)}bb.jpg`) : null;
const limparTitulo = t => t.replace(/\s*[\[(](dublado|legendado|legendas?|dub|leg)[\])]/gi, "").trim();
const tituloDaUrl = url => url ? decodeURIComponent(url.split("/wiki/")[1]).replace(/_/g, " ") : null;

function deItunesRss(e) {
  const imagens = e["im:image"] || [];
  const img = imagens.length ? imagens[imagens.length - 1].label : null;
  const data = e["im:releaseDate"] && e["im:releaseDate"].label;
  return guardar({
    chave: "itunes:" + e.id.attributes["im:id"],
    fonte: "itunes",
    itunes: e.id.attributes["im:id"],
    titulo: limparTitulo(e["im:name"].label),
    ano: data ? data.slice(0, 4) : "",
    poster: imgItunes(img, 400),
    posterGrande: imgItunes(img, 1000),
    tipo: "movie",
    genero: e.category && e.category.attributes.label,
    resumo: e.summary && e.summary.label,
    diretor: e["im:artist"] && e["im:artist"].label,
    preco: e["im:rentalPrice"] ? e["im:rentalPrice"].label : (e["im:price"] && e["im:price"].label)
  });
}

function deItunesBusca(r) {
  return guardar({
    chave: "itunes:" + r.trackId,
    fonte: "itunes",
    itunes: String(r.trackId),
    titulo: limparTitulo(r.trackName),
    ano: r.releaseDate ? r.releaseDate.slice(0, 4) : "",
    poster: imgItunes(r.artworkUrl100, 400),
    posterGrande: imgItunes(r.artworkUrl100, 1000),
    tipo: "movie",
    genero: r.primaryGenreName,
    resumo: r.longDescription,
    diretor: r.artistName
  });
}

/* ---------- APIs ---------- */
const API = {
  // Busca no catálogo do Wikidata (apenas filmes e séries com ID do IMDb)
  async sugestoes(termo, limite = 24) {
    const q = termo.trim().replace(/["\\]/g, "");
    if (!q) return [];
    const qids = await wdBuscar(`${q} haswbstatement:P345`, limite);
    return hidratar({ qids });
  },

  async topItunes(genero = "", limite = 50) {
    const g = genero ? `/genre=${genero}` : "";
    const d = await buscarJSON(`https://itunes.apple.com/br/rss/topmovies/limit=${limite}${g}/json`, 3 * HORA);
    const e = d.feed && d.feed.entry;
    return (Array.isArray(e) ? e : e ? [e] : []).map(deItunesRss);
  },

  async buscaItunes(termo) {
    const d = await buscarJSON(`https://itunes.apple.com/search?term=${encodeURIComponent(termo)}&country=br&lang=pt_br&limit=40`, DIA);
    return (d.results || []).filter(r => r.kind === "feature-movie").map(deItunesBusca);
  },

  async lookupItunes(id) {
    const d = await buscarJSON(`https://itunes.apple.com/lookup?id=${id}&country=br`, DIA);
    return d.results && d.results[0];
  }
};

// Transforma itens do Wikidata (por QID ou ID do IMDb) em cards com pôster da Wikipédia
async function hidratar({ qids, imdbs }) {
  const lista = qids || imdbs;
  if (!lista || !lista.length) return [];
  const filtro = qids
    ? `VALUES ?item { ${qids.map(q => "wd:" + q).join(" ")} }`
    : `VALUES ?imdb { ${imdbs.map(i => `"${i}"`).join(" ")} }`;
  const sparql = `SELECT ?item ?imdb ?lbl ?en ?ptw ?enw (MIN(?d) AS ?data) (SAMPLE(?s) AS ?serie) (SAMPLE(?f) AS ?filme) WHERE {
    ${filtro} ?item wdt:P345 ?imdb. FILTER(STRSTARTS(?imdb, "tt"))
    OPTIONAL { ?item rdfs:label ?lbl FILTER(LANG(?lbl) IN ("pt-br", "pt")) }
    OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) IN ("en", "mul")) }
    OPTIONAL { ?ptw schema:about ?item; schema:isPartOf <https://pt.wikipedia.org/> }
    OPTIONAL { ?enw schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
    OPTIONAL { ?item wdt:P577|wdt:P580 ?d }
    OPTIONAL { ?item wdt:P31/wdt:P279* wd:Q5398426 BIND(1 AS ?s) }
    OPTIONAL { ?item wdt:P31/wdt:P279* wd:Q11424 BIND(1 AS ?f) }
  } GROUP BY ?item ?imdb ?lbl ?en ?ptw ?enw`;
  const d = await buscarJSON("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(sparql), 7 * DIA);

  const porQid = new Map();
  d.results.bindings.forEach(b => {
    const qid = b.item.value.split("/").pop();
    if (!b.serie && !b.filme) return; // ignora episódios, jogos etc.
    const lbl = b.lbl && b.lbl.value;
    const atual = porQid.get(qid);
    if (atual) { if (b.lbl && b.lbl["xml:lang"] === "pt-br") atual.titulo = lbl; return; }
    porQid.set(qid, {
      qid,
      imdb: b.imdb.value,
      titulo: lbl || (b.en && b.en.value) || qid,
      original: b.en && b.en.value,
      ano: b.data ? b.data.value.slice(0, 4) : "",
      tipo: b.serie ? "series" : "movie",
      ptw: tituloDaUrl(b.ptw && b.ptw.value),
      enw: tituloDaUrl(b.enw && b.enw.value)
    });
  });

  const brutos = [...porQid.values()];
  const [imgPt, imgEn] = await Promise.all([
    imagensWiki("pt", brutos.map(b => b.ptw).filter(Boolean)).catch(() => ({})),
    imagensWiki("en", brutos.map(b => b.enw).filter(Boolean)).catch(() => ({}))
  ]);

  const itens = brutos.map(b => {
    const opcoes = [imgPt[b.ptw], imgEn[b.enw]].filter(Boolean);
    const retrato = opcoes.find(i => i.height >= i.width);
    const img = retrato || opcoes[0];
    return guardar({
      chave: "wd:" + b.qid,
      fonte: "wd",
      qid: b.qid,
      imdb: b.imdb,
      titulo: b.titulo,
      original: b.original,
      ano: b.ano,
      tipo: b.tipo,
      poster: img ? img.source : null,
      posterGrande: img ? img.source : null,
      logo: !!img && !retrato
    });
  });

  // Mantém a ordem original (relevância da busca ou ordem da coleção)
  const pos = it => qids ? qids.indexOf(it.qid) : imdbs.indexOf(it.imdb);
  return itens.sort((a, b) => pos(a) - pos(b));
}

// Imagem principal dos artigos da Wikipédia (em lotes de 50)
async function imagensWiki(lang, titulos) {
  const mapa = {};
  for (let i = 0; i < titulos.length; i += 50) {
    const lote = titulos.slice(i, i + 50);
    const d = await buscarJSON(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=500&pilicense=any&redirects=1&format=json&origin=*&titles=` + encodeURIComponent(lote.join("|")), 7 * DIA);
    const q = d.query || {};
    const alias = {};
    [...(q.normalized || []), ...(q.redirects || [])].forEach(n => { alias[n.to] = alias[n.from] || n.from; });
    Object.values(q.pages || {}).forEach(pg => {
      if (!pg.thumbnail) return;
      mapa[pg.title] = pg.thumbnail;
      if (alias[pg.title]) mapa[alias[pg.title]] = pg.thumbnail;
    });
  }
  return mapa;
}

/* ---------- Wikidata + Wikipédia ---------- */
const WD = "https://www.wikidata.org/w/api.php?format=json&origin=*&";

async function wdBuscar(texto, limite = 1) {
  const d = await buscarJSON(WD + `action=query&list=search&srlimit=${limite}&srsearch=` + encodeURIComponent(texto), 7 * DIA);
  return ((d.query && d.query.search) || []).map(r => r.title);
}

async function wdEntidades(ids, props = "labels|claims|sitelinks") {
  if (!ids.length) return {};
  const d = await buscarJSON(WD + `action=wbgetentities&ids=${ids.join("|")}&props=${props}&languages=pt-br|pt|en|mul&sitefilter=ptwiki|enwiki`, 7 * DIA);
  return d.entities || {};
}

const rotulo = ent => {
  const l = (ent && ent.labels) || {};
  return (l["pt-br"] || l.pt || l.en || l.mul || {}).value;
};

const valores = (claims, p) => (claims[p] || [])
  .filter(s => s.rank !== "deprecated" && s.mainsnak.snaktype === "value")
  .map(s => s.mainsnak.datavalue.value);

const anoDe = v => v && v.time ? parseInt(v.time.slice(1, 5), 10) : null;

async function detalhesWikidata(ent) {
  const c = ent.claims || {};
  const ids = v => valores(c, v).map(x => x.id);
  const grupos = {
    direcao: ids("P57").slice(0, 4),
    criacao: ids("P170").slice(0, 4),
    elenco: ids("P161").slice(0, 10),
    generos: ids("P136").slice(0, 5),
    paises: ids("P495").slice(0, 2),
    idiomas: ids("P364").slice(0, 2),
    exibicao: [...ids("P449"), ...ids("P750")].slice(0, 8)
  };
  const todos = [...new Set(Object.values(grupos).flat())].slice(0, 50);
  const rotulos = await wdEntidades(todos, "labels").catch(() => ({}));
  const nomes = lista => lista.map(id => rotulo(rotulos[id])).filter(Boolean);

  const duracao = valores(c, "P2047")[0];
  let minutos = null;
  if (duracao) {
    const n = parseFloat(duracao.amount);
    minutos = duracao.unit.endsWith("Q25235") ? n * 60 : duracao.unit.endsWith("Q11574") ? n / 60 : n;
  }
  const bilheteria = valores(c, "P2142")
    .filter(v => v.unit.endsWith("Q4917"))
    .map(v => parseFloat(v.amount))
    .sort((a, b) => b - a)[0];
  const datas = [...valores(c, "P577"), ...valores(c, "P580")].map(anoDe).filter(Boolean).sort();
  const fim = anoDe(valores(c, "P582")[0]);
  const site = ent.sitelinks || {};

  return {
    qid: ent.id,
    imdb: (valores(c, "P345")[0] || null),
    tituloPt: rotulo(ent),
    anoInicio: datas[0] || null,
    anoFim: fim,
    minutos: minutos ? Math.round(minutos) : null,
    temporadas: valores(c, "P2437")[0] ? parseInt(valores(c, "P2437")[0].amount, 10) : null,
    episodios: valores(c, "P1113")[0] ? parseInt(valores(c, "P1113")[0].amount, 10) : null,
    bilheteria,
    premios: (c.P166 || []).length,
    indicacoes: (c.P1411 || []).length,
    direcao: nomes(grupos.direcao),
    criacao: nomes(grupos.criacao),
    elenco: nomes(grupos.elenco),
    generos: nomes(grupos.generos),
    paises: nomes(grupos.paises),
    idiomas: nomes(grupos.idiomas),
    exibicao: nomes(grupos.exibicao),
    wiki: site.ptwiki ? { lang: "pt", titulo: site.ptwiki.title } : site.enwiki ? { lang: "en", titulo: site.enwiki.title } : null
  };
}

async function resumoWikipedia(wiki) {
  if (!wiki) return null;
  const d = await buscarJSON(`https://${wiki.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki.titulo.replace(/ /g, "_"))}`, 7 * DIA);
  return { texto: d.extract, url: d.content_urls && d.content_urls.desktop.page, lang: wiki.lang };
}

async function wikidataPorQid(qid) {
  const ents = await wdEntidades([qid]);
  return ents[qid] ? detalhesWikidata(ents[qid]) : null;
}

// Para filmes do iTunes: encontra o filme no Wikidata pelo título + ano
async function wikidataPorTitulo(titulo, ano) {
  const nome = titulo.replace(/[:\-–(].*$/, "").trim() || titulo;
  const qids = await wdBuscar(`${nome} haswbstatement:P31=Q11424 haswbstatement:P345`, 5);
  if (!qids.length) return null;
  const ents = await wdEntidades(qids);
  const alvo = parseInt(ano, 10);
  const ent = qids.map(q => ents[q]).find(e => {
    if (!e) return false;
    const anos = valores(e.claims || {}, "P577").map(anoDe);
    return !alvo || anos.some(a => Math.abs(a - alvo) <= 1);
  });
  return ent ? detalhesWikidata(ent) : null;
}

/* ---------- Minha lista ---------- */
const Lista = {
  itens() {
    try { return JSON.parse(localStorage.getItem("sf:lista")) || []; } catch (e) { return []; }
  },
  tem(chave) { return this.itens().some(i => i.chave === chave); },
  alternar(item) {
    let itens = this.itens();
    const tinha = itens.some(i => i.chave === item.chave);
    if (tinha) itens = itens.filter(i => i.chave !== item.chave);
    else itens.unshift({ chave: item.chave, fonte: item.fonte, qid: item.qid, imdb: item.imdb, original: item.original, logo: item.logo, itunes: item.itunes, titulo: item.titulo, ano: item.ano, poster: item.poster, posterGrande: item.posterGrande, tipo: item.tipo });
    try { localStorage.setItem("sf:lista", JSON.stringify(itens)); } catch (e) { /* ignora */ }
    atualizarBadge();
    toast(tinha ? `Removido da sua lista` : `Adicionado à sua lista`, tinha ? "bookmark-minus" : "bookmark-check");
    $$(`[data-salvar="${item.chave}"]`).forEach(b => marcarSalvo(b, !tinha));
    return !tinha;
  }
};

function marcarSalvo(botao, salvo) {
  botao.classList.toggle("salvo", salvo);
  botao.setAttribute("aria-pressed", salvo);
  const rotuloBotao = botao.querySelector("span");
  if (rotuloBotao) rotuloBotao.textContent = salvo ? "Na minha lista" : "Minha lista";
  botao.title = salvo ? "Remover da minha lista" : "Adicionar à minha lista";
}

function atualizarBadge() {
  const n = Lista.itens().length;
  const b = $("#badge-lista");
  b.hidden = n === 0;
  b.textContent = n;
}

/* ---------- Componentes ---------- */
function toast(msg, icone = "info") {
  const t = $("#toast");
  t.innerHTML = `<i data-lucide="${icone}"></i><span>${esc(msg)}</span>`;
  icones();
  t.classList.add("visivel");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("visivel"), 2200);
}

const iconeTipo = tipo => tipo === "series" ? "tv" : "film";
const nomeTipo = tipo => tipo === "series" ? "Série" : "Filme";

function cardHTML(item, i = 0, opcoes = {}) {
  const salvo = Lista.tem(item.chave);
  const poster = item.poster
    ? `<img src="${esc(item.poster)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('sem-poster');this.remove()">`
    : "";
  return `
    <article class="card ${opcoes.rank ? "card--rank" : ""} ${item.poster ? "" : "sem-poster"} ${item.logo ? "card--logo" : ""} revelar" style="--i:${i % 12}">
      ${opcoes.rank ? `<span class="card__rank">${opcoes.rank}</span>` : ""}
      <button class="card__poster" data-abrir="${esc(item.chave)}" aria-label="Ver detalhes de ${esc(item.titulo)}">
        ${poster}
        <span class="card__vazio"><i data-lucide="${iconeTipo(item.tipo)}"></i></span>
        <span class="card__overlay"><span class="card__play"><i data-lucide="info"></i></span></span>
        <span class="card__tipo"><i data-lucide="${iconeTipo(item.tipo)}"></i>${nomeTipo(item.tipo)}</span>
      </button>
      <button class="card__salvar ${salvo ? "salvo" : ""}" data-salvar="${esc(item.chave)}" aria-pressed="${salvo}" title="${salvo ? "Remover da minha lista" : "Adicionar à minha lista"}">
        <i data-lucide="bookmark"></i>
      </button>
      <div class="card__info">
        <h3 title="${esc(item.titulo)}">${esc(item.titulo)}</h3>
        <p>${esc(item.ano || "")}${item.genero ? ` · ${esc(item.genero)}` : ""}</p>
      </div>
    </article>`;
}

const esqueletos = (n = 8) => Array.from({ length: n }, () => `<div class="card card--esqueleto"><div class="card__poster"></div><div class="card__info"><span></span><span></span></div></div>`).join("");

function fileiraHTML({ id, titulo, icone, link, rank }) {
  return `
    <section class="fileira revelar" id="fileira-${id}">
      <header class="fileira__topo">
        <h2><span class="fileira__icone"><i data-lucide="${icone}"></i></span>${esc(titulo)}</h2>
        <div class="fileira__acoes">
          ${link ? `<a class="link-seta" href="${link}">Ver tudo<i data-lucide="chevron-right"></i></a>` : ""}
          <button class="seta" data-rolar="-1" aria-label="Anterior"><i data-lucide="chevron-left"></i></button>
          <button class="seta" data-rolar="1" aria-label="Próximo"><i data-lucide="chevron-right"></i></button>
        </div>
      </header>
      <div class="fileira__trilho ${rank ? "fileira__trilho--rank" : ""}">${esqueletos(rank ? 6 : 8)}</div>
    </section>`;
}

function preencher(alvo, itens, opcoes = {}) {
  if (!alvo) return;
  if (!itens.length) {
    alvo.innerHTML = `<p class="aviso"><i data-lucide="cloud-off"></i>Não foi possível carregar agora.</p>`;
  } else {
    alvo.innerHTML = itens.map((it, i) => cardHTML(it, i, { rank: opcoes.rank ? i + 1 : null })).join("");
  }
  icones();
  observarRevelar(alvo);
}

function erroHTML(msg = "Não foi possível carregar os dados. Verifique sua conexão.") {
  return `<div class="vazio"><span class="vazio__icone"><i data-lucide="wifi-off"></i></span><h3>Ops!</h3><p>${esc(msg)}</p><button class="botao botao--secundario" onclick="rotear()"><i data-lucide="rotate-cw"></i>Tentar de novo</button></div>`;
}

async function carregarColecao(col) {
  try {
    return await hidratar({ imdbs: col.ids });
  } catch (e) {
    return [];
  }
}

/* ---------- Animações de entrada ---------- */
const observador = "IntersectionObserver" in window
  ? new IntersectionObserver(entradas => entradas.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("visivel"); observador.unobserve(e.target); }
    }), { rootMargin: "0px 0px -40px 0px" })
  : null;

function observarRevelar(raiz = document) {
  $$(".revelar:not(.visivel)", raiz).forEach(el => observador ? observador.observe(el) : el.classList.add("visivel"));
}

/* ---------- Página inicial ---------- */
let heroTimer = null;

async function paginaInicio() {
  const colecoes = COLECOES.filter(c => !c.soSeries);
  app.innerHTML = `
    <section class="hero" id="hero">
      <div class="hero__slides"><div class="hero__slide ativo"><div class="hero__conteudo hero__conteudo--esqueleto"><span></span><span></span><span></span></div></div></div>
    </section>

    <section class="generos-rapidos revelar">
      <h2 class="titulo-secao"><i data-lucide="compass"></i>Explorar por gênero</h2>
      <div class="chips">
        ${GENEROS.slice(1).map((g, i) => `<a class="chip revelar" style="--i:${i}" href="#/filmes/${g.id}"><i data-lucide="${g.icone}"></i>${g.nome}</a>`).join("")}
      </div>
    </section>

    ${fileiraHTML({ id: "top10", titulo: "Top 10 filmes no Brasil hoje", icone: "trophy", link: "#/filmes", rank: true })}
    ${colecoes.map(c => fileiraHTML({ id: c.id, titulo: c.titulo, icone: c.icone, link: c.tipo === "series" ? "#/series" : null })).join("")}

    <section class="como revelar">
      <h2 class="titulo-secao"><i data-lucide="lightbulb"></i>Como o StreamFind funciona</h2>
      <div class="como__grade">
        <div class="como__item revelar" style="--i:0"><span><i data-lucide="search"></i></span><h3>Busque</h3><p>Pesquise entre centenas de milhares de filmes e séries do Wikidata e do iTunes, em português ou inglês.</p></div>
        <div class="como__item revelar" style="--i:1"><span><i data-lucide="book-open"></i></span><h3>Descubra</h3><p>Veja sinopse, direção, elenco, gêneros, prêmios, duração e bilheteria de cada título.</p></div>
        <div class="como__item revelar" style="--i:2"><span><i data-lucide="play-circle"></i></span><h3>Assista</h3><p>Confira trailers, onde o título foi lançado e os serviços de streaming disponíveis no Brasil.</p></div>
      </div>
    </section>`;
  icones();
  observarRevelar();

  API.topItunes("", 25).then(itens => {
    montarHero(itens.slice(0, 6));
    preencher($("#fileira-top10 .fileira__trilho"), itens.slice(0, 10), { rank: true });
  }).catch(() => {
    $("#hero").innerHTML = `<div class="hero__erro">${erroHTML()}</div>`;
    preencher($("#fileira-top10 .fileira__trilho"), []);
  });

  colecoes.forEach(c => carregarColecao(c).then(itens => preencher($(`#fileira-${c.id} .fileira__trilho`), itens)));
}

function montarHero(itens) {
  const hero = $("#hero");
  if (!hero || !itens.length) return;
  hero.innerHTML = `
    <div class="hero__slides">
      ${itens.map((it, i) => `
        <div class="hero__slide ${i === 0 ? "ativo" : ""}" data-slide="${i}">
          <div class="hero__fundo" style="background-image:url('${esc(it.posterGrande)}')"></div>
          <div class="hero__conteudo">
            <span class="hero__selo"><i data-lucide="flame"></i>#${i + 1} em alta no Brasil</span>
            <h1>${esc(it.titulo)}</h1>
            <p class="hero__meta">
              ${it.ano ? `<span><i data-lucide="calendar"></i>${esc(it.ano)}</span>` : ""}
              ${it.genero ? `<span><i data-lucide="tag"></i>${esc(it.genero)}</span>` : ""}
              ${it.diretor ? `<span><i data-lucide="clapperboard"></i>${esc(it.diretor)}</span>` : ""}
            </p>
            <p class="hero__resumo">${esc(it.resumo || "")}</p>
            <div class="hero__botoes">
              <button class="botao" data-abrir="${esc(it.chave)}" data-trailer><i data-lucide="play"></i>Ver trailer</button>
              <button class="botao botao--secundario" data-abrir="${esc(it.chave)}"><i data-lucide="info"></i>Detalhes</button>
              <button class="botao botao--icone ${Lista.tem(it.chave) ? "salvo" : ""}" data-salvar="${esc(it.chave)}" aria-label="Minha lista"><i data-lucide="bookmark"></i></button>
            </div>
          </div>
          <button class="hero__poster" data-abrir="${esc(it.chave)}" aria-label="Detalhes de ${esc(it.titulo)}"><img src="${esc(it.posterGrande)}" alt=""></button>
        </div>`).join("")}
    </div>
    <div class="hero__pontos" role="tablist">
      ${itens.map((it, i) => `<button class="${i === 0 ? "ativo" : ""}" data-ir="${i}" aria-label="Destaque ${i + 1}"><span></span></button>`).join("")}
    </div>`;
  icones();

  let atual = 0;
  const ir = n => {
    atual = (n + itens.length) % itens.length;
    $$(".hero__slide", hero).forEach((s, i) => s.classList.toggle("ativo", i === atual));
    $$(".hero__pontos button", hero).forEach((b, i) => b.classList.toggle("ativo", i === atual));
  };
  const iniciar = () => { clearInterval(heroTimer); heroTimer = setInterval(() => ir(atual + 1), 7000); };
  hero.addEventListener("click", e => { const b = e.target.closest("[data-ir]"); if (b) { ir(+b.dataset.ir); iniciar(); } });
  hero.addEventListener("mouseenter", () => { clearInterval(heroTimer); hero.classList.add("pausado"); });
  hero.addEventListener("mouseleave", () => { hero.classList.remove("pausado"); iniciar(); });
  iniciar();
}

/* ---------- Filmes ---------- */
async function paginaFilmes(genero = "") {
  const g = GENEROS.find(x => x.id === genero) || GENEROS[0];
  app.innerHTML = `
    <section class="pagina">
      <header class="pagina__topo revelar">
        <span class="pagina__icone"><i data-lucide="film"></i></span>
        <div>
          <h1>Filmes</h1>
          <p>Os 50 filmes mais populares do iTunes Brasil, atualizados diariamente. Escolha um gênero:</p>
        </div>
      </header>
      <div class="chips chips--fixo">
        ${GENEROS.map(x => `<a class="chip ${x.id === g.id ? "ativo" : ""}" href="#/filmes${x.id ? "/" + x.id : ""}"><i data-lucide="${x.icone}"></i>${x.nome}</a>`).join("")}
      </div>
      <h2 class="titulo-secao"><i data-lucide="${g.icone}"></i>${g.nome}</h2>
      <div class="grade" id="grade">${esqueletos(12)}</div>
    </section>`;
  icones();
  observarRevelar();
  const ativo = $(".chip.ativo");
  if (ativo) ativo.scrollIntoView({ inline: "center", block: "nearest" });

  try {
    preencher($("#grade"), await API.topItunes(g.id, 50), { rank: false });
  } catch (e) {
    $("#grade").innerHTML = erroHTML();
    icones();
  }
}

/* ---------- Séries ---------- */
function paginaSeries() {
  const cols = COLECOES.filter(c => c.tipo === "series");
  app.innerHTML = `
    <section class="pagina">
      <header class="pagina__topo revelar">
        <span class="pagina__icone"><i data-lucide="tv"></i></span>
        <div>
          <h1>Séries</h1>
          <p>Seleções das séries mais marcantes. Quer outra? Use a busca no topo: o catálogo inclui centenas de milhares de títulos.</p>
        </div>
      </header>
      <div class="chips chips--fixo">
        ${cols.map(c => `<a class="chip" href="#fileira-${c.id}" data-ancora="fileira-${c.id}"><i data-lucide="${c.icone}"></i>${c.titulo}</a>`).join("")}
      </div>
    </section>
    ${cols.map(c => fileiraHTML({ id: c.id, titulo: c.titulo, icone: c.icone })).join("")}`;
  icones();
  observarRevelar();
  cols.forEach(c => carregarColecao(c).then(itens => preencher($(`#fileira-${c.id} .fileira__trilho`), itens)));
}

/* ---------- Minha lista ---------- */
function paginaLista() {
  const itens = Lista.itens().map(guardar);
  app.innerHTML = `
    <section class="pagina">
      <header class="pagina__topo revelar">
        <span class="pagina__icone"><i data-lucide="bookmark"></i></span>
        <div>
          <h1>Minha lista</h1>
          <p>${itens.length ? `${itens.length} ${itens.length === 1 ? "título salvo" : "títulos salvos"} neste navegador.` : "Salve filmes e séries para assistir depois."}</p>
        </div>
      </header>
      ${itens.length
        ? `<div class="grade" id="grade"></div>`
        : `<div class="vazio revelar"><span class="vazio__icone"><i data-lucide="bookmark-plus"></i></span><h3>Sua lista está vazia</h3><p>Toque no ícone <i data-lucide="bookmark" class="inline"></i> em qualquer título para guardá-lo aqui.</p><a class="botao" href="#/"><i data-lucide="compass"></i>Explorar títulos</a></div>`}
    </section>`;
  icones();
  observarRevelar();
  if (itens.length) preencher($("#grade"), itens);
}

/* ---------- Busca ---------- */
async function paginaBusca(termo, filtro = "todos") {
  $("#campo-pesquisa").value = termo;
  app.innerHTML = `
    <section class="pagina">
      <header class="pagina__topo revelar">
        <span class="pagina__icone"><i data-lucide="search"></i></span>
        <div>
          <h1>Resultados para “${esc(termo)}”</h1>
          <p id="busca-resumo">Buscando no Wikidata e no iTunes…</p>
        </div>
      </header>
      <div class="chips" id="filtros">
        <button class="chip ${filtro === "todos" ? "ativo" : ""}" data-filtro="todos"><i data-lucide="layout-grid"></i>Todos</button>
        <button class="chip ${filtro === "movie" ? "ativo" : ""}" data-filtro="movie"><i data-lucide="film"></i>Filmes</button>
        <button class="chip ${filtro === "series" ? "ativo" : ""}" data-filtro="series"><i data-lucide="tv"></i>Séries</button>
      </div>
      <div class="grade" id="grade">${esqueletos(8)}</div>
    </section>`;
  icones();
  observarRevelar();

  const [wd, itunes] = await Promise.allSettled([API.sugestoes(termo, 40), API.buscaItunes(termo)]);
  const a = wd.status === "fulfilled" ? wd.value : [];
  const vistos = new Set(a.map(i => (i.titulo + i.ano).toLowerCase()));
  const b = (itunes.status === "fulfilled" ? itunes.value : []).filter(i => !vistos.has((i.titulo + i.ano).toLowerCase()));
  const todos = [...a, ...b];

  const mostrar = f => {
    const lista = f === "todos" ? todos : todos.filter(i => i.tipo === f);
    $$("#filtros .chip").forEach(c => c.classList.toggle("ativo", c.dataset.filtro === f));
    const n = lista.length;
    $("#busca-resumo").textContent = n ? `${n} ${n === 1 ? "título encontrado" : "títulos encontrados"}` : "Nenhum título encontrado";
    if (!n) {
      $("#grade").innerHTML = `<div class="vazio"><span class="vazio__icone"><i data-lucide="search-x"></i></span><h3>Nada por aqui</h3><p>Tente outro nome, o título original em inglês ou verifique a ortografia.</p></div>`;
      icones();
    } else preencher($("#grade"), lista);
  };
  $("#filtros").addEventListener("click", e => {
    const c = e.target.closest("[data-filtro]");
    if (c) mostrar(c.dataset.filtro);
  });
  if (wd.status === "rejected" && itunes.status === "rejected") {
    $("#grade").innerHTML = erroHTML();
    icones();
  } else mostrar(filtro);
}

/* ---------- Sugestões ao digitar ---------- */
const campo = $("#campo-pesquisa");
const caixaSug = $("#sugestoes");
let sugTimer = null;
let sugIndice = -1;

function fecharSugestoes() {
  caixaSug.hidden = true;
  sugIndice = -1;
}

campo.addEventListener("input", () => {
  clearTimeout(sugTimer);
  const termo = campo.value.trim();
  if (termo.length < 2) return fecharSugestoes();
  sugTimer = setTimeout(async () => {
    try {
      const itens = (await API.sugestoes(termo, 8)).slice(0, 6);
      if (campo.value.trim() !== termo) return;
      caixaSug.innerHTML = itens.length
        ? itens.map(it => `
            <button type="button" class="sugestao" data-abrir="${esc(it.chave)}" role="option">
              ${it.poster ? `<img src="${esc(it.poster)}" alt="" class="${it.logo ? "logo-img" : ""}">` : `<span class="sugestao__sem"><i data-lucide="${iconeTipo(it.tipo)}"></i></span>`}
              <span><strong>${esc(it.titulo)}</strong><small><i data-lucide="${iconeTipo(it.tipo)}"></i>${nomeTipo(it.tipo)}${it.ano ? " · " + esc(it.ano) : ""}${it.original && it.original !== it.titulo ? " · " + esc(it.original) : ""}</small></span>
            </button>`).join("") + `<button type="submit" class="sugestao sugestao--todos"><i data-lucide="search"></i>Ver todos os resultados para “${esc(termo)}”</button>`
        : `<p class="sugestao sugestao--nada">Nenhuma sugestão. Pressione Enter para buscar.</p>`;
      caixaSug.hidden = false;
      sugIndice = -1;
      icones();
    } catch (e) { fecharSugestoes(); }
  }, 220);
});

campo.addEventListener("keydown", e => {
  const opcoes = $$(".sugestao[data-abrir], .sugestao--todos", caixaSug);
  if (caixaSug.hidden || !opcoes.length) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    sugIndice = (sugIndice + (e.key === "ArrowDown" ? 1 : -1) + opcoes.length) % opcoes.length;
    opcoes.forEach((o, i) => o.classList.toggle("foco", i === sugIndice));
  } else if (e.key === "Enter" && sugIndice >= 0) {
    e.preventDefault();
    opcoes[sugIndice].click();
  } else if (e.key === "Escape") fecharSugestoes();
});

$("#form-busca").addEventListener("submit", e => {
  e.preventDefault();
  const termo = campo.value.trim();
  fecharSugestoes();
  if (termo) { location.hash = "#/busca?q=" + encodeURIComponent(termo); campo.blur(); }
});

document.addEventListener("click", e => {
  if (!e.target.closest("#form-busca")) fecharSugestoes();
});

/* ---------- Modal de detalhes ---------- */
const modal = $("#modal");
const conteudoModal = $("#modal-conteudo");
let ultimoFoco = null;

function abrirModal(chave, comTrailer = false) {
  const item = registro.get(chave);
  if (!item) return;
  ultimoFoco = document.activeElement;
  fecharSugestoes();
  modal.hidden = false;
  document.body.classList.add("sem-rolagem");
  requestAnimationFrame(() => modal.classList.add("aberto"));
  renderModal(item, null, { carregando: true });
  modal.scrollTop = 0;
  $(".modal__fechar", modal).focus({ preventScroll: true });
  carregarDetalhes(item).then(det => {
    if (modal.dataset.chave !== chave) return;
    renderModal(item, det, { comTrailer });
  });
}

function fecharModal() {
  modal.classList.remove("aberto");
  document.body.classList.remove("sem-rolagem");
  modal.dataset.chave = "";
  setTimeout(() => { modal.hidden = true; conteudoModal.innerHTML = ""; }, 250);
  if (ultimoFoco) ultimoFoco.focus();
}

async function carregarDetalhes(item) {
  const det = {};
  try {
    if (item.fonte === "itunes") {
      const [lookup, wd] = await Promise.allSettled([API.lookupItunes(item.itunes), wikidataPorTitulo(item.titulo, item.ano)]);
      det.itunes = lookup.status === "fulfilled" ? lookup.value : null;
      det.wd = wd.status === "fulfilled" ? wd.value : null;
    } else {
      det.wd = await wikidataPorQid(item.qid).catch(() => null);
    }
    if (det.wd && det.wd.wiki) det.wiki = await resumoWikipedia(det.wd.wiki).catch(() => null);
  } catch (e) { /* mostra o que houver */ }
  return det;
}

const moeda = n => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);
const duracaoTexto = min => min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}min` : `${min}min`;

function plataformas(nomes) {
  const achadas = [];
  nomes.forEach(n => {
    const p = PLATAFORMAS.find(pl => pl.padrao.test(n));
    if (p && !achadas.includes(p)) achadas.push(p);
  });
  return achadas;
}

function renderModal(item, det, { carregando = false, comTrailer = false } = {}) {
  modal.dataset.chave = item.chave;
  det = det || {};
  const wd = det.wd || {};
  const it = det.itunes || {};
  const titulo = item.titulo;
  const original = item.original && item.original !== titulo ? item.original : null;
  const minutos = wd.minutos || (it.trackTimeMillis ? Math.round(it.trackTimeMillis / 60000) : null);
  const anos = item.tipo === "series" && wd.anoInicio
    ? `${wd.anoInicio}${wd.anoFim ? "–" + wd.anoFim : "–"}`
    : (item.ano || wd.anoInicio || "");
  const sinopse = (det.wiki && det.wiki.texto) || it.longDescription || item.resumo || "";
  const pessoas = item.tipo === "series" && wd.criacao && wd.criacao.length ? { rotulo: "Criação", nomes: wd.criacao } : { rotulo: "Direção", nomes: wd.direcao && wd.direcao.length ? wd.direcao : (it.artistName || item.diretor ? [it.artistName || item.diretor] : []) };
  const elenco = wd.elenco && wd.elenco.length ? wd.elenco : [];
  const generos = wd.generos && wd.generos.length ? wd.generos : (it.primaryGenreName || item.genero ? [it.primaryGenreName || item.genero] : []);
  const plats = plataformas(wd.exibicao || []);
  const outrasEmissoras = (wd.exibicao || []).filter(n => !PLATAFORMAS.some(p => p.padrao.test(n))).slice(0, 4);
  const trailer = it.previewUrl;
  const busca = encodeURIComponent(`${item.titulo} ${String(item.ano).slice(0, 4)}`);
  const justwatch = `https://www.justwatch.com/br/busca?q=${encodeURIComponent(titulo)}`;
  const salvo = Lista.tem(item.chave);
  const imdbId = item.imdb || wd.imdb;
  const preco = it.trackRentalPrice ? `Alugar por R$ ${it.trackRentalPrice.toFixed(2).replace(".", ",")}` : it.trackPrice ? `Comprar por R$ ${it.trackPrice.toFixed(2).replace(".", ",")}` : item.preco ? item.preco : null;

  const infos = [
    pessoas.nomes.length && { icone: "clapperboard", rotulo: pessoas.rotulo, valor: pessoas.nomes.join(", ") },
    wd.temporadas && { icone: "layers", rotulo: "Temporadas", valor: `${wd.temporadas}${wd.episodios ? ` · ${wd.episodios} episódios` : ""}` },
    minutos && item.tipo !== "series" && { icone: "clock", rotulo: "Duração", valor: duracaoTexto(minutos) },
    (wd.premios || wd.indicacoes) && { icone: "trophy", rotulo: "Prêmios", valor: [wd.premios && `${wd.premios} ${wd.premios === 1 ? "prêmio" : "prêmios"}`, wd.indicacoes && `${wd.indicacoes} ${wd.indicacoes === 1 ? "indicação" : "indicações"}`].filter(Boolean).join(" · ") },
    wd.bilheteria && { icone: "ticket", rotulo: "Bilheteria mundial", valor: moeda(wd.bilheteria) },
    wd.paises && wd.paises.length && { icone: "globe", rotulo: "País", valor: wd.paises.join(", ") },
    wd.idiomas && wd.idiomas.length && { icone: "languages", rotulo: "Idioma original", valor: wd.idiomas.join(", ") },
    it.contentAdvisoryRating && { icone: "shield-check", rotulo: "Classificação", valor: /^\d+$/.test(it.contentAdvisoryRating) ? `${it.contentAdvisoryRating} anos` : it.contentAdvisoryRating },
  ].filter(Boolean);

  conteudoModal.innerHTML = `
    <div class="det__banner">
      <div class="det__fundo" style="background-image:url('${esc(item.posterGrande || item.poster || "")}')"></div>
      <div class="det__poster ${item.poster ? "" : "sem-poster"} ${item.logo ? "det__poster--logo" : ""}">
        ${item.posterGrande || item.poster ? `<img src="${esc(item.posterGrande || item.poster)}" alt="Pôster de ${esc(titulo)}">` : `<span class="card__vazio"><i data-lucide="${iconeTipo(item.tipo)}"></i></span>`}
      </div>
      <div class="det__cabecalho">
        <span class="selo"><i data-lucide="${iconeTipo(item.tipo)}"></i>${nomeTipo(item.tipo)}</span>
        <h2 id="modal-titulo">${esc(titulo)}</h2>
        ${original ? `<p class="det__original">Título original: ${esc(original)}</p>` : ""}
        <p class="det__meta">
          ${anos ? `<span><i data-lucide="calendar"></i>${esc(anos)}</span>` : ""}
          ${minutos && item.tipo !== "series" ? `<span><i data-lucide="clock"></i>${duracaoTexto(minutos)}</span>` : ""}
          ${wd.temporadas ? `<span><i data-lucide="layers"></i>${wd.temporadas} ${wd.temporadas === 1 ? "temporada" : "temporadas"}</span>` : ""}
          ${it.contentAdvisoryRating ? `<span class="classif">${esc(it.contentAdvisoryRating)}</span>` : ""}
        </p>
        ${generos.length ? `<div class="det__generos">${generos.map(g => `<span>${esc(g)}</span>`).join("")}</div>` : ""}
        <div class="det__botoes">
          ${trailer
            ? `<button class="botao" data-tocar><i data-lucide="play"></i>Ver trailer</button>`
            : `<a class="botao" href="https://www.youtube.com/results?search_query=${busca}%20trailer" target="_blank" rel="noopener"><i data-lucide="youtube"></i>Trailer</a>`}
          <button class="botao botao--secundario ${salvo ? "salvo" : ""}" data-salvar="${esc(item.chave)}" aria-pressed="${salvo}"><i data-lucide="bookmark"></i><span>${salvo ? "Na minha lista" : "Minha lista"}</span></button>
          <button class="botao botao--icone" data-compartilhar aria-label="Compartilhar"><i data-lucide="share-2"></i></button>
        </div>
      </div>
    </div>

    ${trailer ? `<div class="det__trailer" hidden><video src="${esc(trailer)}" controls playsinline preload="none" poster="${esc(item.posterGrande || "")}"></video></div>` : ""}

    <div class="det__corpo">
      <section class="det__sinopse">
        <h3><i data-lucide="align-left"></i>Sinopse</h3>
        ${carregando && !sinopse
          ? `<div class="linhas-esqueleto"><span></span><span></span><span></span></div>`
          : `<p>${esc(sinopse || "Sinopse indisponível para este título.")}</p>
             ${det.wiki && det.wiki.url ? `<a class="link-seta" href="${esc(det.wiki.url)}" target="_blank" rel="noopener">Ler mais na Wikipédia${det.wiki.lang === "en" ? " (em inglês)" : ""}<i data-lucide="external-link"></i></a>` : ""}`}
      </section>

      <section class="det__onde">
        <h3><i data-lucide="monitor-play"></i>Onde assistir</h3>
        <div class="plataformas">
          ${plats.map(p => `<span class="plataforma" style="--cor:${p.cor};--texto:${p.texto || "#fff"}"><i data-lucide="play"></i>${p.nome}</span>`).join("")}
          ${preco ? `<a class="plataforma plataforma--apple" href="${esc(it.trackViewUrl || "#")}" target="_blank" rel="noopener"><i data-lucide="apple"></i>Apple TV · ${esc(preco)}</a>` : ""}
          ${carregando ? `<span class="plataforma plataforma--esqueleto"></span>` : ""}
        </div>
        ${outrasEmissoras.length ? `<p class="det__nota"><i data-lucide="radio-tower"></i>Lançamento/distribuição: ${esc(outrasEmissoras.join(", "))}</p>` : ""}
        <a class="botao botao--secundario botao--largo" href="${justwatch}" target="_blank" rel="noopener"><i data-lucide="search-check"></i>Buscar no JustWatch</a>
        <p class="det__nota"><i data-lucide="info"></i>A disponibilidade nos catálogos muda com frequência.</p>
      </section>

      ${infos.length ? `
      <section class="det__ficha">
        <h3><i data-lucide="list"></i>Ficha técnica</h3>
        <dl>${infos.map(f => `<div><dt><i data-lucide="${f.icone}"></i>${f.rotulo}</dt><dd>${esc(f.valor)}</dd></div>`).join("")}</dl>
      </section>` : ""}

      ${elenco.length ? `
      <section class="det__elenco">
        <h3><i data-lucide="users"></i>Elenco</h3>
        <div class="pessoas">${elenco.map(n => `<span class="pessoa"><span class="pessoa__avatar">${esc(n.split(" ").map(p => p[0]).slice(0, 2).join(""))}</span>${esc(n)}</span>`).join("")}</div>
      </section>` : (carregando ? `<section class="det__elenco"><h3><i data-lucide="users"></i>Elenco</h3><div class="linhas-esqueleto"><span></span></div></section>` : "")}

      <footer class="det__links">
        ${imdbId ? `<a href="https://www.imdb.com/title/${esc(imdbId)}/" target="_blank" rel="noopener"><i data-lucide="star"></i>IMDb</a>` : ""}
        ${det.wiki && det.wiki.url ? `<a href="${esc(det.wiki.url)}" target="_blank" rel="noopener"><i data-lucide="book-open"></i>Wikipédia</a>` : ""}
        ${wd.qid ? `<a href="https://www.wikidata.org/wiki/${esc(wd.qid)}" target="_blank" rel="noopener"><i data-lucide="database"></i>Wikidata</a>` : ""}
        ${it.trackViewUrl ? `<a href="${esc(it.trackViewUrl)}" target="_blank" rel="noopener"><i data-lucide="apple"></i>iTunes</a>` : ""}
      </footer>
    </div>`;
  icones();
  if (comTrailer && trailer) tocarTrailer();
}

function tocarTrailer() {
  const caixa = $(".det__trailer", conteudoModal);
  if (!caixa) return;
  caixa.hidden = false;
  const v = $("video", caixa);
  v.play().catch(() => {});
  caixa.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function compartilhar() {
  const item = registro.get(modal.dataset.chave);
  if (!item) return;
  const url = item.imdb ? `https://www.imdb.com/title/${item.imdb}/` : location.href;
  const texto = `Olha esse título que encontrei no StreamFind: ${item.titulo}`;
  try {
    if (navigator.share) await navigator.share({ title: item.titulo, text: texto, url });
    else { await navigator.clipboard.writeText(`${texto} ${url}`); toast("Link copiado", "link"); }
  } catch (e) { /* cancelado */ }
}

/* ---------- Eventos globais ---------- */
document.addEventListener("click", e => {
  const salvar = e.target.closest("[data-salvar]");
  if (salvar) {
    e.preventDefault();
    const item = registro.get(salvar.dataset.salvar);
    if (item) Lista.alternar(item);
    if (location.hash === "#/lista" && !modal.classList.contains("aberto")) paginaLista();
    return;
  }
  const abrir = e.target.closest("[data-abrir]");
  if (abrir) {
    e.preventDefault();
    if (abrir.classList.contains("sugestao")) campo.blur();
    return abrirModal(abrir.dataset.abrir, abrir.hasAttribute("data-trailer"));
  }
  if (e.target.closest("[data-fechar]")) return fecharModal();
  if (e.target.closest("[data-tocar]")) return tocarTrailer();
  if (e.target.closest("[data-compartilhar]")) return compartilhar();

  const seta = e.target.closest("[data-rolar]");
  if (seta) {
    const trilho = $(".fileira__trilho", seta.closest(".fileira"));
    trilho.scrollBy({ left: trilho.clientWidth * 0.85 * +seta.dataset.rolar, behavior: "smooth" });
  }
  const ancora = e.target.closest("[data-ancora]");
  if (ancora) {
    e.preventDefault();
    const alvo = document.getElementById(ancora.dataset.ancora);
    if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !modal.hidden) fecharModal();
  if (e.key === "/" && document.activeElement !== campo && !/input|textarea/i.test(document.activeElement.tagName)) {
    e.preventDefault();
    campo.focus();
  }
});

const header = $("#header");
window.addEventListener("scroll", () => header.classList.toggle("header--solido", window.scrollY > 20), { passive: true });

/* ---------- Rotas ---------- */
function rotear() {
  clearInterval(heroTimer);
  if (!modal.hidden) fecharModal();
  const hash = location.hash.replace(/^#/, "") || "/";
  if (hash.startsWith("fileira-")) return; // âncoras internas
  const [caminho, query] = hash.split("?");
  const partes = caminho.split("/").filter(Boolean);
  const rota = partes[0] || "inicio";
  const params = new URLSearchParams(query || "");

  $$("[data-route]").forEach(a => a.classList.toggle("ativo", a.dataset.route === rota));
  if (rota !== "busca") campo.value = "";
  window.scrollTo({ top: 0 });
  document.body.dataset.rota = rota;

  if (rota === "filmes") return paginaFilmes(partes[1] || "");
  if (rota === "series") return paginaSeries();
  if (rota === "lista") return paginaLista();
  if (rota === "busca" && params.get("q")) return paginaBusca(params.get("q"));
  return paginaInicio();
}

window.addEventListener("hashchange", rotear);
$("#ano").textContent = new Date().getFullYear();
atualizarBadge();
rotear();
