# 🎬 StreamFind - Plataforma de Busca de Filmes e Séries

**StreamFind** é uma plataforma que ajuda você a descobrir onde seus filmes e séries favoritos estão disponíveis para streaming, proporcionando uma experiência prática e rápida. Desenvolvida com **JavaScript**, **HTML**, e **CSS**, a aplicação permite realizar buscas detalhadas, exibindo informações completas sobre o conteúdo desejado.

## 🚀 Funcionalidades

- **Busca de Títulos**: Localize filmes e séries rapidamente através da barra de pesquisa.
- **Informações Detalhadas**: Além do streaming, obtenha dados como:
  - Direção
  - Ano de lançamento
  - Elenco
  - Gênero
  - Duração
  - Prêmios
  - Bilheteria
  - Nota (rating)
- **Plataformas de Streaming**: Ícones dos principais serviços de streaming (Netflix, Prime Video, Apple TV) são exibidos junto com os resultados.

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura da página.
- **CSS3**: Estilização responsiva e layouts modernos.
- **JavaScript**: Manipulação da DOM e implementação da lógica de busca.

## 📸 Captura de Tela

![Screenshot da Plataforma](img/screenshot.png)

## 📄 Exemplo de Uso

Aqui está uma amostra de como a função de pesquisa é implementada:

```javascript
function pesquisar() {
  let section = document.getElementById("resultados-pesquisa");
  let campoPesquisa = document.getElementById("campo-pesquisa").value.toLowerCase();
  
  if (campoPesquisa === "") {
    section.innerHTML = "<p>Nada foi encontrado. Você não realizou nenhuma pesquisa :/</p>";
    return;
  }

  let resultados = "";
  for (let dado of dados) {
    if (dado.titulo.toLowerCase().includes(campoPesquisa)) {
      resultados += `
        <div class="item-resultado">
          <img src="${dado.imagem}" alt="${dado.titulo}" class="imagem-resultado">
          <div class="texto-resultado">
            <h2><a href="${dado.link}" target="_blank">${dado.titulo}</a></h2>
            <p>${dado.descricao}</p>
          </div>
        </div>
      `;
    }
  }

  section.innerHTML = resultados || "<p>Nenhum resultado encontrado.</p>";
}
```

### Dados Exemplo

```javascript
let dados = [
  {
    titulo: 'Forrest Gump - O Contador de Histórias',
    descricao: 'A emocionante história de Forrest Gump...',
    direcao: 'Robert Zemeckis',
    Ano: '1994',
    Elenco: 'Tom Hanks, Robin Wright, Gary Sinise',
    Gênero: 'Drama, Comédia, Romance',
    Duração: '142 minutos',
    Prêmios: '6 Oscars',
    Bilheteria: '$678 milhões',
    rating: '4.7/5',
    imagem: 'img/forrestgump.jpg',
    link: 'https://en.wikipedia.org/wiki/Forrest_Gump',
    tags: 'drama, comédia, romance'
  }
];
```

## 🖥️ Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/seuusuario/seurepositorio.git
   ```
2. Navegue até o diretório do projeto:
   ```bash
   cd seurepositorio
   ```
3. Abra o arquivo `index.html` no seu navegador preferido.

## 📂 Estrutura de Pastas

```
/
├── css/
│   └── style.css
├── img/
│   └── forrestgump.jpg
├── js/
│   └── app.js
└── index.html
```

## 🤝 Contribuições

Contribuições são sempre bem-vindas! Sinta-se à vontade para enviar pull requests ou abrir issues para melhorias e sugestões.
