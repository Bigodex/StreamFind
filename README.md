# 🎬 StreamFind — Descubra filmes e séries

**StreamFind** ajuda você a descobrir o que assistir e onde encontrar. Busque qualquer filme ou série e veja pôster, sinopse em português, direção, elenco, gêneros, prêmios, duração, bilheteria, trailer e serviços de streaming.

Feito apenas com **HTML, CSS e JavaScript**, sem build e sem chave de API.

## 🚀 Funcionalidades

- **Página inicial viva**: carrossel de destaques em alta no Brasil, Top 10 e coleções curadas (séries aclamadas, clássicos, ficção científica, animações, cinema brasileiro).
- **Busca com sugestões** enquanto você digita (atalho: tecla `/`), com filtros Filmes/Séries.
- **Filmes por gênero**: os 50 mais populares do iTunes Brasil em 11 gêneros.
- **Séries**: coleções por tema (fantasia, crime, comédia, animes…).
- **Detalhes completos**: sinopse da Wikipédia, ficha técnica, elenco, trailer em vídeo (quando disponível), plataformas de streaming e atalho para o JustWatch.
- **Minha lista**: salve títulos para assistir depois (fica guardado no navegador).
- **Responsivo**: barra de navegação inferior no celular, animações suaves e respeito a `prefers-reduced-motion`.

## 🔌 APIs gratuitas utilizadas

| Fonte | Uso |
|---|---|
| [Wikidata](https://www.wikidata.org) (API + SPARQL) | Catálogo e busca, direção, elenco, gêneros, prêmios, duração, temporadas, bilheteria, emissora |
| [Wikipédia](https://pt.wikipedia.org) (REST + pageimages) | Pôsteres e sinopse em português |
| [iTunes Brasil](https://performance-partners.apple.com/search-api) (RSS + Search + Lookup) | Rankings em alta por gênero, trailers e preço de aluguel |
| [JustWatch](https://www.justwatch.com/br) (link) | Lista completa de onde assistir |

Todas aceitam requisições direto do navegador (CORS) e as respostas ficam em cache no `localStorage`.

## 🛠️ Tecnologias

HTML5, CSS3 (variáveis, grid, animações), JavaScript puro e ícones [Lucide](https://lucide.dev).

## 🖥️ Como rodar

Abra o `index.html` no navegador ou sirva a pasta localmente:

```bash
python -m http.server 8000
# acesse http://localhost:8000
```

## 📂 Estrutura

```
/
├── index.html   # estrutura: header, navegação, modal e rodapé
├── styles.css   # tema, componentes, animações e responsividade
├── app.js       # APIs, rotas (#/filmes, #/series, #/lista, #/busca), cards e modal
└── dados.js     # coleções curadas, gêneros e plataformas de streaming
```

Para adicionar uma coleção, inclua um item em `COLECOES` no `dados.js` com os IDs do IMDb (`tt...`).

## 🤝 Contribuições

Contribuições são bem-vindas! Envie pull requests ou abra issues com sugestões.
