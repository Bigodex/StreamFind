function pesquisar() {
    // Obtém a seção onde os resultados da pesquisa serão exibidos
    let section = document.getElementById("resultados-pesquisa");
    
    let campoPesquisa = document.getElementById("campo-pesquisa").value

    if(campoPesquisa == ""){
      section.innerHTML = "<p>Nada foi encontrado. Você não realizou nenhuma pesquisa :/</p>"
      return 
    }

    campoPesquisa = campoPesquisa.toLowerCase()
    
    console.log(campoPesquisa);

    // Inicializa uma string vazia para armazenar os resultados da pesquisa
    let resultados = "";
    let titulo = "";
    let descricao = "";
    let tags = "";
  
    // Itera sobre cada dado na lista de dados
    for (let dado of dados) {
      titulo = dado.titulo.toLowerCase()
      descricao = dado.titulo.toLowerCase()
      tags = dado.tags.toLowerCase()
      if (titulo.includes(campoPesquisa) || descricao.includes(campoPesquisa) || tags.includes(campoPesquisa)){
        resultados += `
        <div class="item-resultado">
          <img src="img/forrestgump.jpg" alt="Forrestgump" class="imagem-resultado">
          <div class="texto-resultado">
            <h2 class="h2-titulo">
              <a href="#" target="_blank">${dado.titulo}</a>
            </h2>
            <p class="descricao-meta1">${dado.descricao}</p>
            <br>
            <hr>
            <br>
            <p class="descricao-meta1">${dado.direcao}</p>
            <p class="descricao-meta1">${dado.Ano}</p>
            <p class="descricao-meta1">${dado.Elenco}</p>
            <p class="descricao-meta1">${dado.Roteiro}</p>
            <p class="descricao-meta1">${dado.Gênero}</p>
            <p class="descricao-meta1">${dado.Duração}</p>
            <p class="descricao-meta1">${dado.Prêmios}</p>
            <p class="descricao-meta1">${dado.Bilheteria}</p>
            <a href=${dado.link} target="_blank">Mais informações</a>
          </div>
        </div>
      `;

      } 
    }

    if (!resultados) {
      resultados = "<p>Nada foi encontrado. Esse artista não existe, ou não consta em nosso banco de dados :'(</p>"
    }
  
    // Atribui o HTML gerado para a seção de resultados
    section.innerHTML = resultados;
  }