// Variáveis Globais 
let ultimaReceita = "";
let selectedFilters = {
  restrictions: [],
  diet: [],
  mealType: [],
  cuisine: [],
  prepTime: "",
  difficulty: "",
};

//  Atualização dos Filtros Selecionados 
function updateFilters() {
  selectedFilters.restrictions = Array.from(
    document.querySelectorAll('input[name="restriction"]:checked')
  ).map((cb) => cb.value);
  selectedFilters.diet = Array.from(
    document.querySelectorAll('input[name="diet"]:checked')
  ).map((cb) => cb.value);
  selectedFilters.mealType = Array.from(
    document.querySelectorAll('input[name="mealType"]:checked')
  ).map((cb) => cb.value);
  selectedFilters.cuisine = Array.from(
    document.querySelectorAll('input[name="cuisine"]:checked')
  ).map((cb) => cb.value);

  const prepTimeSelect = document.getElementById("prepTimeSelect");
  if (prepTimeSelect) selectedFilters.prepTime = prepTimeSelect.value;

  const difficultySelect = document.getElementById("difficultySelect");
  if (difficultySelect) selectedFilters.difficulty = difficultySelect.value;
}

//  Inicialização da Página 
window.addEventListener("DOMContentLoaded", () => {
  const userName = localStorage.getItem("userName");
  const welcome = document.getElementById("welcome");
  if (userName) welcome.textContent = `Bem-vindo, ${userName}`;

  document
    .querySelectorAll('input[name="restriction"]')
    .forEach((checkbox) => checkbox.addEventListener("change", updateFilters));
  document
    .querySelectorAll('input[name="diet"]')
    .forEach((checkbox) => checkbox.addEventListener("change", updateFilters));
  document
    .querySelectorAll('input[name="mealType"]')
    .forEach((checkbox) => checkbox.addEventListener("change", updateFilters));
  document
    .querySelectorAll('input[name="cuisine"]')
    .forEach((checkbox) => checkbox.addEventListener("change", updateFilters));

  const prepTimeSelect = document.getElementById("prepTimeSelect");
  if (prepTimeSelect) prepTimeSelect.addEventListener("change", updateFilters);

  const difficultySelect = document.getElementById("difficultySelect");
  if (difficultySelect)
    difficultySelect.addEventListener("change", updateFilters);

  if (document.getElementById("suggestions")) loadSuggestions();

  const generateDietPlanBtn = document.getElementById("generateDietPlanBtn");
  if (generateDietPlanBtn) {
    generateDietPlanBtn.addEventListener("click", generateAndSaveDietPlan);
  }

  const viewDietPlanBtn = document.getElementById("viewDietPlanBtn");
  if (viewDietPlanBtn) {
    viewDietPlanBtn.addEventListener("click", loadAndDisplayDietPlan);
    checkExistingDietPlan();
  }
});

//  Login do Usuário 
async function login() {
  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-pass")?.value;
  const msg = document.getElementById("login-msg");

  if (!email || !password) {
    msg.textContent = "Preencha todos os campos.";
    return;
  }

  const res = await window.electronAPI.loginUser({ email, password });
  msg.textContent = res.message;

  if (res.success) {
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userName", res.name);
    window.location.href = "index.html";
  }
}
window.login = login;

//  Registro de Novo Usuário 
async function register() {
  const name = document.getElementById("reg-name")?.value.trim();
  const email = document.getElementById("reg-email")?.value.trim();
  const password = document.getElementById("reg-pass")?.value;
  const msg = document.getElementById("reg-msg");

  const nameRegex = /^[A-Za-zÀ-ÿ' ]{3,}$/;
  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@(?:gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|icloud\.com)$/i;

  function hasSequentialNums(str) {
    return /012|123|234|345|456|567|678|789|890|098|987|876|765|654|543|432|321/.test(str);
  }

  function isStrongPassword(pwd) {
    if (pwd.length < 8) return false;
    if (hasSequentialNums(pwd)) return false;
    if (/^(.)\1{3,}$/.test(pwd)) return false;
    return /[a-z]/.test(pwd) &&
           /[A-Z]/.test(pwd) &&
           /[0-9]/.test(pwd) &&
           /[^A-Za-z0-9]/.test(pwd);
  }

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

  const res = await window.electronAPI.registerUser({ name, email, password });
  msg.textContent = res.message || "Registrado com sucesso!";
}
window.register = register;

//  Busca de Receita 
if (document.getElementById("searchBtn")) {
  document.getElementById("searchBtn").addEventListener("click", async () => {
    const query = document.getElementById("recipeInput").value.trim();
    const resultDiv = document.getElementById("result");
    const favBtn = document.getElementById("favBtn");

    resultDiv.innerHTML = "<p>Buscando receita...</p>";
    favBtn.style.display = "none";

    if (!query) {
      resultDiv.innerHTML = '<p class="erro">Digite o nome de uma receita.</p>';
      return;
    }

    try {
      const resposta = await window.electronAPI.buscarReceitaComFiltros({
        query,
        filters: selectedFilters,
      });

      const userEmail = localStorage.getItem("userEmail");
      if (userEmail) {
        await window.electronAPI.salvarHistoricoBusca({ email: userEmail, query });
        loadSuggestions();
      }

      ultimaReceita = resposta;
      resultDiv.innerHTML = `<h2>Resultado para: ${query}</h2><pre>${resposta}</pre>`;
      favBtn.style.display = "inline";
      favBtn.onclick = () => salvarFavorita(query, resposta);
    } catch (error) {
      resultDiv.innerHTML = '<p class="erro">Erro ao buscar receita.</p>';
      console.error(error);
    }
  });
}

//  Salvar Receita como Favorita 
async function salvarFavorita(nome, conteudo) {
  const userEmail = localStorage.getItem("userEmail");
  if (!userEmail) {
    mostrarMensagem("Você precisa estar logado para salvar favoritos.", "#f44336");
    return;
  }

  const res = await window.electronAPI.salvarFavorito({ email: userEmail, nome, conteudo });

  if (res.success) {
    mostrarMensagem(res.message);
    const resultDiv = document.getElementById("result");
    if (resultDiv) resultDiv.innerHTML = "";
  } else {
    mostrarMensagem(res.message, "#f44336");
  }
}

//  Sugestões de Histórico 
async function loadSuggestions() {
  const userEmail = localStorage.getItem("userEmail");
  const suggestionsDiv = document.getElementById("suggestions");
  if (!userEmail || !suggestionsDiv) return;

  const suggestions = await window.electronAPI.getSugestoesHistorico(userEmail);
  suggestionsDiv.innerHTML = "<h3>Histórico de Pesquisa:</h3>";

  if (suggestions.length === 0) {
    suggestionsDiv.innerHTML += "<p>Comece a buscar e salvar receitas para ver sugestões aqui!</p>";
  } else {
    suggestions.forEach((sug) => {
      const span = document.createElement("span");
      span.classList.add("suggestion-item");
      span.textContent = sug;
      span.onclick = () => {
        document.getElementById("recipeInput").value = sug;
      };
      suggestionsDiv.appendChild(span);
    });
  }
}

//  Página de Favoritos 
if (window.location.pathname.includes("favoritos.html")) {
  const userEmail = localStorage.getItem("userEmail");

  async function carregarFavoritos() {
    const nomes = await window.electronAPI.getFavorites(userEmail);
    const div = document.getElementById("favoritesList");
    div.innerHTML = "";

    if (nomes.length === 0) {
      div.innerHTML = "<p>Nenhuma receita favorita salva.</p>";
    } else {
      nomes.forEach((nome) => {
        const item = document.createElement("div");
        item.className = "favorite-item";
        item.innerHTML = `<strong>${nome}</strong>
                    <button onclick="verReceita('${nome}')">Ver Receita</button>
                    <button onclick="deletarReceita('${nome}')">Excluir</button>`;
        div.appendChild(item);
      });
    }
  }

  async function verReceita(nome) {
  const conteudo = await window.electronAPI.getFavoritoConteudo({
    email: userEmail,
    nome,
  });
  const div = document.getElementById("conteudoReceita");
  div.textContent = conteudo;
  div.style.display = "block"; // <-- ADICIONAR ESTA LINHA
}


  async function deletarReceita(nome) {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      mostrarMensagem("Usuário não logado.", "#f44336");
      return;
    }

    document.getElementById("conteudoReceita").textContent = "";
    const success = await window.electronAPI.deletarFavorito({ email: userEmail, nome });

    if (success) {
      carregarFavoritos();
      mostrarMensagem(`Receita "${nome}" excluída com sucesso!`);
    } else {
      mostrarMensagem(`Erro ao excluir receita "${nome}".`, "#f44336");
    }
  }

  carregarFavoritos();
  window.verReceita = verReceita;
  window.deletarReceita = deletarReceita;
}

//  Mensagens de Feedback 
function mostrarMensagem(msg, cor = "#4CAF50") {
  const feedback = document.getElementById("feedback");
  if (!feedback) return;

  feedback.textContent = msg;
  feedback.style.background = cor;
  feedback.style.display = "block";

  setTimeout(() => {
    feedback.style.display = "none";
  }, 3000);
}

//  Logout 
function logout() {
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  window.location.href = "login.html";
}
window.logout = logout;

//  Plano de Dieta: Verificação de Existência 
async function checkExistingDietPlan() {
  const userEmail = localStorage.getItem("userEmail");
  if (!userEmail) return;

  const hasPlan = await window.electronAPI.hasDietPlan(userEmail);
  const viewDietPlanBtn = document.getElementById("viewDietPlanBtn");
  if (viewDietPlanBtn) {
    viewDietPlanBtn.style.display = hasPlan ? "inline" : "none";
  }
}

//  Plano de Dieta: Geração e Salvamento 
async function generateAndSaveDietPlan() {
  const userEmail = localStorage.getItem("userEmail");
  if (!userEmail) {
    mostrarMensagem("Você precisa estar logado para gerar um plano de dieta.", "#f44336");
    return;
  }

  const dietTypeSelect = document.getElementById("dietTypeSelect");
  const selectedDietType = dietTypeSelect.value;

  if (!selectedDietType) {
    mostrarMensagem("Por favor, selecione um tipo de dieta.", "#f44336");
    return;
  }

  const feedbackDiv = document.getElementById("dietPlanFeedback");
  const calendarDiv = document.getElementById("dietCalendar");
  const viewDietPlanBtn = document.getElementById("viewDietPlanBtn");

  feedbackDiv.textContent = "Gerando plano de dieta... isso pode levar um momento.";
  feedbackDiv.style.background = "#2196F3";
  feedbackDiv.style.display = "block";
  calendarDiv.innerHTML = "";

  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await window.electronAPI.generateDietPlan({
      email: userEmail,
      dietType: selectedDietType,
      startDate: today,
    });

    if (response.success) {
      mostrarMensagem(response.message);
      viewDietPlanBtn.style.display = "inline";
      loadAndDisplayDietPlan();
    } else {
      mostrarMensagem(response.message, "#f44336");
    }
  } catch (error) {
    console.error("Erro ao gerar plano de dieta:", error);
    mostrarMensagem("Erro ao gerar plano de dieta. Tente novamente.", "#f44336");
  } finally {
    setTimeout(() => {
      feedbackDiv.style.display = "none";
    }, 3000);
  }
}

//  Plano de Dieta: Carregamento e Exibição 
async function loadAndDisplayDietPlan() {
  const userEmail = localStorage.getItem("userEmail");
  if (!userEmail) {
    mostrarMensagem("Você precisa estar logado para ver seu plano de dieta.", "#f44336");
    return;
  }

  const calendarDiv = document.getElementById("dietCalendar");
  calendarDiv.innerHTML = "<p>Carregando plano de dieta...</p>";

  try {
    const dietPlan = await window.electronAPI.getDietPlan(userEmail);

    if (dietPlan && dietPlan.plan) {
      renderDietCalendar(dietPlan.plan, calendarDiv);
      mostrarMensagem("Plano de dieta carregado com sucesso!");
    } else {
      calendarDiv.innerHTML = "<p>Nenhum plano de dieta encontrado. Gere um novo!</p>";
      mostrarMensagem("Nenhum plano de dieta encontrado.", "#ff9800");
    }
  } catch (error) {
    console.error("Erro ao carregar plano de dieta:", error);
    calendarDiv.innerHTML = "<p>Erro ao carregar plano de dieta.</p>";
    mostrarMensagem("Erro ao carregar plano de dieta.", "#f44336");
  }
}

//  Plano de Dieta: Renderizar Calendário 
function renderDietCalendar(plan, container) {
  let html = '<h4>Seu Plano de Dieta Mensal</h4>';
  html += '<div class="calendar-grid">';

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  daysOfWeek.forEach(day => {
    html += `<div class="calendar-header">${day}</div>`;
  });

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startingDay = firstDayOfMonth.getDay();

  for (let i = 0; i < startingDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dailyPlan = plan[dateKey];

    html += `<div class="calendar-day">`;
    html += `<div class="day-number">${day}</div>`;
    if (dailyPlan) {
      html += `<strong>Café:</strong> ${dailyPlan.cafe || 'N/A'}<br>`;
      html += `<strong>Almoço:</strong> ${dailyPlan.almoco || 'N/A'}<br>`;
      html += `<strong>Jantar:</strong> ${dailyPlan.jantar || 'N/A'}`;
    } else {
      html += `<p>Nenhum plano para este dia.</p>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

//  Botão de Mostrar/Ocultar Filtros Avançados 
const toggleBtn = document.getElementById("toggleFiltersBtn");
const filtersSection = document.getElementById("filtersSection");

if (toggleBtn && filtersSection) {
  toggleBtn.addEventListener("click", () => {
    const isVisible = filtersSection.style.maxHeight && filtersSection.style.maxHeight !== "0px";

    if (isVisible) {
      filtersSection.style.maxHeight = "0";
      filtersSection.style.opacity = "0";
      toggleBtn.textContent = "Mostrar Filtros Avançados";
    } else {
      filtersSection.style.maxHeight = filtersSection.scrollHeight + "px";
      filtersSection.style.opacity = "1";
      toggleBtn.textContent = "Ocultar Filtros Avançados";
    }
  });
}
