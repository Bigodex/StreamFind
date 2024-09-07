function pesquisar() {
  // Obtém a seção onde os resultados da pesquisa serão exibidos
  let section = document.getElementById("resultados-pesquisa");
  
  // Obtém o valor do campo de pesquisa e o converte para minúsculas
  let campoPesquisa = document.getElementById("campo-pesquisa").value.toLowerCase();

  // Verifica se o campo de pesquisa está vazio
  if (campoPesquisa === "") {
    section.innerHTML = "<p>Nada foi encontrado. Você não realizou nenhuma pesquisa :/</p>";
    return;
  }

  console.log(campoPesquisa);

  // Inicializa uma string vazia para armazenar os resultados da pesquisa
  let resultados = "";
  
  // Itera sobre cada dado na lista de dados
  for (let dado of dados) {
    let titulo = dado.titulo.toLowerCase();
    let descricao = dado.descricao.toLowerCase();
    let tags = dado.tags.toLowerCase();
    
    // Verifica se o campo de pesquisa está presente no título, descrição ou tags
    if (titulo.includes(campoPesquisa) || descricao.includes(campoPesquisa) || tags.includes(campoPesquisa)) {
      resultados += `
      <div class="item-resultado">
        <img src="${dado.imagem}" alt="${dado.titulo}" class="imagem-resultado">
        <div class="texto-resultado">
          <div class="titulo-icones">
            <h2 class="h2-titulo">
              <a href="#" target="_blank">${dado.titulo}</a>
            </h2>
            <div class="icones-plataformas">
              <img src="icons/netflix.svg" class="icone-plataforma" alt="Netflix">
              <img src="icons/prime.svg" class="icone-plataforma" alt="Prime Video">
              <img src="icons/appletv.svg" class="icone-plataforma" alt="Apple TV">
            </div>
          </div>
          <p class="descricao-meta1">${dado.descricao}</p>
          <br>
          <hr>
          <br>
          <p class="descricao-meta1"><strong>Direção:</strong> ${dado.direcao}</p>
          <p class="descricao-meta1"><strong>Ano:</strong> ${dado.Ano}</p>
          <p class="descricao-meta1"><strong>Elenco:</strong> ${dado.Elenco}</p>
          <p class="descricao-meta1"><strong>Roteiro:</strong> ${dado.Roteiro}</p>
          <p class="descricao-meta1"><strong>Gênero:</strong> ${dado.Gênero}</p>
          <p class="descricao-meta1"><strong>Duração:</strong> ${dado.Duração}</p>
          <p class="descricao-meta1"><strong>Prêmios:</strong> ${dado.Prêmios}</p>
          <p class="descricao-meta1"><strong>Bilheteria:</strong> ${dado.Bilheteria}</p>
          <p class="descricao-meta1"><strong>Nota:</strong> ${dado.rating}</p>
          <a href="${dado.link}" target="_blank">Mais informações</a>
        </div>
      </div>
    `;
    }
  }

  // Caso não haja resultados, exibe uma mensagem de erro
  if (!resultados) {
    resultados = "<p>Nada foi encontrado. Esse artista não existe, ou não consta em nosso banco de dados :'(</p>";
  }

  // Atribui o HTML gerado para a seção de resultados
  section.innerHTML = resultados;
}
