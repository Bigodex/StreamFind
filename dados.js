// Coleções curadas (IDs do IMDb) exibidas na página inicial e na aba Séries.
// Pôsteres e títulos vêm em tempo real das APIs; aqui ficam apenas os IDs.
// tipo "series" → aparece na aba Séries; soSeries: true → não aparece na página inicial.
const COLECOES = [
  {
    id: "series-aclamadas",
    titulo: "Séries aclamadas",
    icone: "tv",
    tipo: "series",
    ids: [
      "tt0903747", "tt0944947", "tt4574334", "tt7366338", "tt3032476", "tt11280740",
      "tt3581920", "tt7660850", "tt5753856", "tt10919420", "tt6468322", "tt14452776",
      "tt13443470", "tt1475582", "tt2861424", "tt10986410", "tt0108778", "tt0386676"
    ]
  },
  {
    id: "series-fantasia",
    titulo: "Ação, heróis e fantasia",
    icone: "swords",
    tipo: "series",
    soSeries: true,
    ids: [
      "tt1190634", "tt11198330", "tt5180504", "tt8111088", "tt9140554", "tt7631058",
      "tt11126994", "tt2306299", "tt0417299", "tt1520211"
    ]
  },
  {
    id: "series-crime",
    titulo: "Crime e suspense",
    icone: "fingerprint",
    tipo: "series",
    soSeries: true,
    ids: [
      "tt0141842", "tt0306414", "tt2707408", "tt2442560", "tt0773262", "tt2085059",
      "tt5834204", "tt4786824", "tt0412142"
    ]
  },
  {
    id: "series-anime",
    titulo: "Animes e animações",
    icone: "sparkles",
    tipo: "series",
    ids: [
      "tt0388629", "tt2560140", "tt0877057", "tt9335498", "tt12343534", "tt0096697",
      "tt0149460", "tt2861424", "tt11126994"
    ]
  },
  {
    id: "series-comedia",
    titulo: "Comédias para maratonar",
    icone: "laugh",
    tipo: "series",
    soSeries: true,
    ids: [
      "tt0108778", "tt0386676", "tt0098904", "tt0460649", "tt10986410", "tt14452776",
      "tt0096697", "tt0149460"
    ]
  },
  {
    id: "classicos",
    titulo: "Clássicos imperdíveis",
    icone: "award",
    tipo: "movie",
    ids: [
      "tt0068646", "tt0111161", "tt0109830", "tt0110912", "tt0468569", "tt0137523",
      "tt0120737", "tt0133093", "tt0114369", "tt0102926", "tt0080684", "tt0172495",
      "tt0407887", "tt6751668", "tt0482571", "tt0209144"
    ]
  },
  {
    id: "ficcao",
    titulo: "Ficção científica",
    icone: "rocket",
    tipo: "movie",
    ids: [
      "tt0816692", "tt1375666", "tt0062622", "tt0083658", "tt1856101", "tt2543164",
      "tt1160419", "tt15239678", "tt0088763", "tt0133093"
    ]
  },
  {
    id: "animacoes",
    titulo: "Animações para toda a família",
    icone: "sparkles",
    tipo: "movie",
    ids: [
      "tt0245429", "tt0114709", "tt0910970", "tt2380307", "tt4633694", "tt0110357",
      "tt0266543", "tt1049413", "tt0198781", "tt2096673", "tt0096283", "tt0119698"
    ]
  },
  {
    id: "brasil",
    titulo: "Feito no Brasil",
    icone: "flag",
    tipo: "movie",
    ids: [
      "tt14961016", "tt0317248", "tt0861739", "tt1555149", "tt0140888", "tt0271383",
      "tt2762506", "tt3742378", "tt0293007", "tt4922804"
    ]
  }
];

// Gêneros do ranking de filmes do iTunes Brasil (aba Filmes).
const GENEROS = [
  { id: "",     nome: "Em alta",            icone: "flame" },
  { id: "4401", nome: "Ação e aventura",    icone: "swords" },
  { id: "4404", nome: "Comédia",            icone: "laugh" },
  { id: "4406", nome: "Drama",              icone: "drama" },
  { id: "4413", nome: "Ficção e fantasia",  icone: "rocket" },
  { id: "4416", nome: "Suspense",           icone: "eye" },
  { id: "4408", nome: "Terror",             icone: "skull" },
  { id: "4412", nome: "Romance",            icone: "heart" },
  { id: "4410", nome: "Infantil e família", icone: "baby" },
  { id: "4402", nome: "Anime",              icone: "sparkles" },
  { id: "4405", nome: "Documentário",       icone: "camera" },
  { id: "4403", nome: "Clássicos",          icone: "film" }
];

// Plataformas reconhecidas nos dados de exibição/distribuição do Wikidata.
const PLATAFORMAS = [
  { nome: "Netflix",     padrao: /netflix/i,                 cor: "#E50914" },
  { nome: "Prime Video", padrao: /prime video|amazon studios|amazon mgm|amazon/i, cor: "#00A8E1" },
  { nome: "Disney+",     padrao: /disney\+|disney plus/i,     cor: "#113CCF" },
  { nome: "Max",         padrao: /\bhbo\b|hbo max|^max$/i,    cor: "#002BE7" },
  { nome: "Apple TV+",   padrao: /apple tv/i,                 cor: "#1D1D1F" },
  { nome: "Hulu",        padrao: /hulu/i,                     cor: "#1CE783", texto: "#0B0B0F" },
  { nome: "Paramount+",  padrao: /paramount\+|paramount plus/i, cor: "#0064FF" },
  { nome: "Globoplay",   padrao: /globoplay|globo filmes|tv globo/i, cor: "#FB0234" },
  { nome: "AMC",         padrao: /^amc$/i,                    cor: "#2B2B2B" },
  { nome: "FX",          padrao: /^fx$/i,                     cor: "#2B2B2B" },
  { nome: "BBC",         padrao: /\bbbc\b/i,                  cor: "#2B2B2B" }
];
