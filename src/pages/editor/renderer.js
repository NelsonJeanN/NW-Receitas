// Variável global para armazenar a última receita buscada
let ultimaReceita = "";

// Evento disparado quando a página termina de carregar
window.addEventListener("DOMContentLoaded", () => {
  // Recupera o nome do usuário salvo no localStorage
  const userName = localStorage.getItem("userName");
  const welcome = document.getElementById("welcome");

  // Se o usuário estiver logado, exibe mensagem de boas-vindas
  if (userName) {
    welcome.textContent = `Bem-vindo, ${userName}`;
  }
});

// Função assíncrona para fazer o login do usuário
async function login() {
  // Captura email e senha dos inputs do formulário
  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-pass")?.value;

  const msg = document.getElementById("login-msg");

  // Validação simples para campos vazios
  if (!email || !password) {
    msg.textContent = "Preencha todos os campos.";
    return;
  }

  // Chama a API do Electron para verificar login
  const res = await window.electronAPI.loginUser({ email, password });
  msg.textContent = res.message;

  // Se login for bem-sucedido, salva dados no localStorage e redireciona para a página principal
  if (res.success) {
    localStorage.setItem("userEmail", email);
    localStorage.setItem('userName', res.name);
    window.location.href = "index.html";
  }
}

async function register() {
  const name = document.getElementById("reg-name")?.value.trim();
  const email = document.getElementById("reg-email")?.value.trim();
  const password = document.getElementById("reg-pass")?.value;
  const msg = document.getElementById("reg-msg");

  // Regex e validações replicadas do backend
  const nameRegex = /^[A-Za-zÀ-ÿ' ]{3,}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(?:gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|icloud\.com)$/i;

  function hasSequentialNums(str) {
    return /012|123|234|345|456|567|678|789|890|098|987|876|765|654|543|432|321/.test(str);
  }

  function isStrongPassword(pwd) {
    if (pwd.length < 8) return false;
    if (hasSequentialNums(pwd)) return false;
    if (/^(.)\1{3,}$/.test(pwd)) return false;
    return (
      /[a-z]/.test(pwd) &&
      /[A-Z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd)
    );
  }

  // Validações no frontend
  if (!name || !email || !password) {
    msg.textContent = "Preencha todos os campos.";
    return;
  }

  if (!nameRegex.test(name)) {
    msg.textContent = "Nome inválido: mínimo 3 letras, sem números.";
    return;
  }

  if (!emailRegex.test(email)) {
    msg.textContent = "Use um e‑mail dos domínios: gmail, outlook, hotmail, yahoo ou icloud.";
    return;
  }

  if (!isStrongPassword(password)) {
    msg.textContent = "Senha fraca: use 8+ caracteres com letra maiúscula, minúscula, número, símbolo e sem sequências.";
    return;
  }

  // Envia dados ao backend após validações locais
  const res = await window.electronAPI.registerUser({ name, email, password });
  msg.textContent = res.message || "Registrado com sucesso!";
}


// Se a página contém o botão de busca, adiciona evento para buscar receita
if (document.getElementById("searchBtn")) {
  document.getElementById("searchBtn").addEventListener("click", async () => {
    // Obtém o texto digitado para busca da receita
    const query = document.getElementById("recipeInput").value.trim();
    const resultDiv = document.getElementById("result");
    const favBtn = document.getElementById("favBtn");

    // Mensagem de carregamento e esconde o botão de favoritar
    resultDiv.innerHTML = "<p>Buscando receita...</p>";
    favBtn.style.display = "none";

    // Verifica se o campo de busca está vazio
    if (!query) {
      resultDiv.innerHTML = '<p class="erro">Digite o nome de uma receita.</p>';
      return;
    }

    try {
      // Chama a API do Electron para buscar receita
      const resposta = await window.electronAPI.buscarReceita(query);

      // Armazena última receita e exibe resultado na tela
      ultimaReceita = resposta;
      resultDiv.innerHTML = `
        <h2>Resultado para: ${query}</h2>
        <pre>${resposta}</pre>
      `;

      // Exibe botão para salvar receita como favorita
      favBtn.style.display = "inline";

      // Define função para salvar receita favorita quando botão for clicado
      favBtn.onclick = () => salvarFavorita(query, resposta);
    } catch (error) {
      // Exibe erro na tela caso falhe a busca
      resultDiv.innerHTML = '<p class="erro">Erro ao buscar receita.</p>';
      console.error(error);
    }
  });
}

// Função para salvar receita como favorita
function salvarFavorita(nome, conteudo) {
  // Verifica se usuário está logado para salvar favoritos
  const userEmail = localStorage.getItem("userEmail");
  if (!userEmail) {
    alert("Você precisa estar logado.");
    return;
  }

  // Chama API para salvar receita no disco local
  window.electronAPI.salvarFavorito({ email: userEmail, nome, conteudo });

  // Mostra mensagem de sucesso na tela
  mostrarMensagem("Receita salva como favorita!");

  // Limpa o conteúdo da área de resultados para evitar confusão
  const resultDiv = document.getElementById("result");
  if (resultDiv) resultDiv.innerHTML = "";
}

// Se estivermos na página de favoritos
if (window.location.pathname.includes("favoritos.html")) {
  const userEmail = localStorage.getItem('userEmail');

  // Função para carregar a lista de receitas favoritas do usuário
  async function carregarFavoritos() {
    const nomes = await window.electronAPI.getFavorites(userEmail);
    const div = document.getElementById('favoritesList');
    div.innerHTML = '';

    // Se não houver favoritos, exibe mensagem
    if (nomes.length === 0) {
      div.innerHTML = "<p>Nenhuma receita favorita salva.</p>";
    } else {
      // Para cada receita, cria um bloco com nome e botões de ver e excluir
      nomes.forEach(nome => {
        const item = document.createElement('div');
        item.innerHTML = `
          <strong>${nome}</strong>
          <button onclick="verReceita('${nome}')">Ver Receita</button>
          <button onclick="deletarReceita('${nome}')">Excluir</button>
          <hr/>
        `;
        div.appendChild(item);
      });
    }
  }

  // Função para exibir o conteúdo da receita selecionada
  async function verReceita(nome) {
    const conteudo = await window.electronAPI.getFavoritoConteudo({ email: userEmail, nome });
    document.getElementById('conteudoReceita').textContent = conteudo;
  }

  // Função para deletar receita favorita
 async function deletarReceita(nome) {
  const userEmail = localStorage.getItem('userEmail');
  if (!userEmail) {
    mostrarMensagem("Usuário não logado.", "#f44336");
    return;
  }

  document.getElementById('conteudoReceita').textContent = '';

  // Chama API para excluir receita do disco
  await window.electronAPI.deletarFavorito({ email: userEmail, nome });

  // Atualiza lista de favoritos após exclusão
  carregarFavoritos();

  // Mostra mensagem de sucesso usando a função reutilizável
  mostrarMensagem(`Receita "${nome}" excluída com sucesso!`);
}



  // Carrega favoritos assim que a página carrega
  carregarFavoritos();

  // Torna as funções globais para poderem ser chamadas nos botões gerados dinamicamente
  window.verReceita = verReceita;
  window.deletarReceita = deletarReceita;
}

// Função para mostrar mensagens temporárias na tela (ex: sucesso ou erro)
function mostrarMensagem(msg, cor = "#4CAF50") {
  const feedback = document.getElementById("feedback");
  if (!feedback) return;

  feedback.textContent = msg;
  feedback.style.background = cor;
  feedback.style.display = "block";

  // Esconde mensagem após 3 segundos
  setTimeout(() => {
    feedback.style.display = "none";
  }, 3000);
}

// Função para logout, removendo dados do usuário e redirecionando para login
function logout () {
  localStorage.removeItem('userEmail');
  window.location.href='login.html';
}
window.logout = logout; // Torna a função logout global para ser chamada no botão logout
