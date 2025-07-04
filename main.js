const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const bcrypt = require("bcryptjs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Conexão com o banco de dados MySQL
const mysql = require("mysql2/promise");
let db;

mysql
  .createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  })
  .then((conn) => {
    db = conn;
    console.log("Conexão com o banco de dados estabelecida.");
  
    createTables();
  })
  .catch((err) => console.error("Erro ao conectar ao banco:", err));

// Função para criar tabelas se não existirem
async function createTables() {
  try {
    await db.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha_hash VARCHAR(255) NOT NULL
            );
        `);
    await db.execute(`
            CREATE TABLE IF NOT EXISTS favoritos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                nome_receita VARCHAR(255) NOT NULL,
                conteudo TEXT NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);
    await db.execute(`
            CREATE TABLE IF NOT EXISTS historico_buscas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                query TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);
    
    await db.execute(`
            CREATE TABLE IF NOT EXISTS planos_dieta (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                data_inicio DATE NOT NULL,
                plano_json JSON NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);
    console.log("Tabelas verificadas/criadas com sucesso.");
  } catch (error) {
    console.error("Erro ao criar tabelas:", error);
  }
}

// Login com tentativas limitadas
let loginAttempts = {};

ipcMain.handle("register-user", async (event, { name, email, password }) => {
  const {
    isValidName,
    isValidEmail,
    isStrongPassword,
  } = require("./validacoes");

  if (!isValidName(name))
    return {
      success: false,
      message: "Nome inválido: mínimo 3 letras, sem números.",
    };
  if (!isValidEmail(email))
    return {
      success: false,
      message: "Use um e‑mail válido dos domínios comuns.",
    };
  if (!isStrongPassword(password)) {
    return {
      success: false,
      message:
        "Senha fraca: misture letras maiúsculas, minúsculas, número e símbolo. Evite sequências ou repetições.",
    };
  }

  try {
    const [rows] = await db.execute("SELECT id FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (rows.length > 0)
      return { success: false, message: "E‑mail já registrado." };

    const hash = await bcrypt.hash(password, 10);
    await db.execute(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",
      [name, email, hash]
    );
    return { success: true, message: "Usuário registrado com sucesso!" };
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return {
      success: false,
      message: "Erro ao registrar usuário. Tente novamente.",
    };
  }
});

ipcMain.handle("login-user", async (event, { email, password }) => {
  try {
    const [rows] = await db.execute("SELECT * FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return { success: false, message: "E-mail não encontrado." };

    if (loginAttempts[email] >= 3)
      return { success: false, message: "Conta bloqueada após 3 tentativas." };

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.senha_hash);
    if (valid) {
      loginAttempts[email] = 0;
      return { success: true, message: "Login bem-sucedido!", name: user.nome };
    } else {
      loginAttempts[email] = (loginAttempts[email] || 0) + 1;
      return {
        success: false,
        message: `Senha incorreta. Tentativas: ${loginAttempts[email]}`,
      };
    }
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    return { success: false, message: "Erro ao fazer login. Tente novamente." };
  }
});

// API Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const promptRecipeBase = `Você é um chef profissional e especialista em explicar receitas de forma clara e acessível. Sempre siga as instruções abaixo ao responder:
1. Use uma linguagem simples, objetiva e amigável, mas não use caracteres especiais como #, *, ~, ou emojis.
2. Estruture a receita da seguinte forma:
- Nome da receita
- Ingredientes (em lista com quantidades exatas)
- Modo de preparo (passo a passo numerado)
- Dicas extras ou sugestões de variações
3. Use ingredientes comuns e fáceis de encontrar no Brasil.
4. Evite termos técnicos ou estrangeiros sem explicação.
5. A resposta deve ser direta e útil para quem está começando a cozinhar.`;

async function buscarReceitaIA(query, filters = {}) {
  try {
    let fullPrompt = `${promptRecipeBase}\nAgora, gere uma receita completa para: ${query}.`;

    if (filters.restrictions && filters.restrictions.length > 0) {
      fullPrompt += ` Deve ser ${filters.restrictions.join(", ")}.`;
    }
    if (filters.diet && filters.diet.length > 0) {
      fullPrompt += ` Siga a dieta: ${filters.diet.join(", ")}.`;
    }
    if (filters.mealType && filters.mealType.length > 0) {
      fullPrompt += ` Ideal para: ${filters.mealType.join(", ")}.`;
    }
    if (filters.cuisine && filters.cuisine.length > 0) {
      fullPrompt += ` Cozinha: ${filters.cuisine.join(", ")}.`;
    }
    if (filters.prepTime) {
      fullPrompt += ` Com tempo de preparo: ${filters.prepTime}.`;
    }
    if (filters.difficulty) {
      fullPrompt += ` Dificuldade: ${filters.difficulty}.`;
    }

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro ao consultar Gemini para receita:", error);
    return "⚠️ Houve um erro ao buscar a receita. Tente novamente mais tarde.";
  }
}

ipcMain.handle("buscar-receita", async (event, query) => {
  // Mantido para compatibilidade ou buscas simples sem filtros
  return await buscarReceitaIA(query);
});

ipcMain.handle(
  "buscar-receita-com-filtros",
  async (event, { query, filters }) => {
    return await buscarReceitaIA(query, filters);
  }
);

// Salvar histórico de busca 
ipcMain.handle("salvar-historico-buscas", async (event, { email, query }) => {
  try {
    const [rows] = await db.execute("SELECT id FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) return;
    const userId = rows[0].id;
    await db.execute(
      "INSERT INTO historico_buscas (usuario_id, query, timestamp) VALUES (?, ?, NOW())",
      [userId, query]
    );
  } catch (error) {
    console.error("Erro ao salvar histórico de busca:", error);
  }
});

// Obter sugestões do histórico de busca e favoritos 
ipcMain.handle("get-sugestoes-historico", async (event, email) => {
  try {
    const [rows] = await db.execute("SELECT id FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) return [];
    const userId = rows[0].id;

    // Obter histórico de buscas recentes - 
    const [searchHistory] = await db.execute(
      `SELECT query
         FROM historico_buscas
        WHERE usuario_id = ?
     GROUP BY query
     ORDER BY MAX(timestamp) DESC
        LIMIT 5`,
      [userId]
    );
    const recentSearches = searchHistory.map((row) => row.query);

    // Obter nomes de receitas favoritas
    const [favoriteNames] = await db.execute(
      "SELECT DISTINCT nome_receita FROM favoritos WHERE usuario_id = ? LIMIT 5",
      [userId]
    );
    const favoriteSuggestions = favoriteNames.map((row) => row.nome_receita);

    // Combinar e remover duplicatas
    const combinedSuggestions = [
      ...new Set([...recentSearches, ...favoriteSuggestions]),
    ];

    return combinedSuggestions;
  } catch (error) {
    console.error("Erro ao obter sugestões do histórico:", error);
    return [];
  }
});

// Salvar receita favorita
ipcMain.handle("salvar-favorito", async (event, { email, nome, conteudo }) => {
  try {
    const [rows] = await db.execute("SELECT id FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) return;
    const userId = rows[0].id;

    // Verifica se a receita já foi salva para este usuário
    const [existing] = await db.execute(
      "SELECT id FROM favoritos WHERE usuario_id = ? AND nome_receita = ?",
      [userId, nome]
    );
    if (existing.length > 0) {
      return { success: false, message: "Receita já está nos favoritos!" };
    }

    await db.execute(
      "INSERT INTO favoritos (usuario_id, nome_receita, conteudo) VALUES (?, ?, ?)",
      [userId, nome, conteudo]
    );
    return { success: true, message: "Receita salva como favorita!" };
  } catch (error) {
    console.error("Erro ao salvar favorito:", error);
    return {
      success: false,
      message: "Erro ao salvar favorito. Tente novamente.",
    };
  }
});

// Listar favoritos
ipcMain.handle("get-favoritos", async (event, email) => {
  try {
    const [rows] = await db.execute("SELECT id FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) return [];
    const userId = rows[0].id;

    const [favoritos] = await db.execute(
      "SELECT nome_receita FROM favoritos WHERE usuario_id = ?",
      [userId]
    );
    return favoritos.map((f) => f.nome_receita);
  } catch (error) {
    console.error("Erro ao obter favoritos:", error);
    return [];
  }
});

// Ver conteúdo da receita
ipcMain.handle("get-favorito-conteudo", async (event, { email, nome }) => {
  try {
    const [rows] = await db.execute(
      `SELECT conteudo FROM favoritos
             WHERE usuario_id = (SELECT id FROM usuarios WHERE email = ?)
              AND nome_receita = ?`,
      [email, nome]
    );
    return rows.length ? rows[0].conteudo : "Arquivo não encontrado.";
  } catch (error) {
    console.error("Erro ao obter conteúdo do favorito:", error);
    return "Erro ao obter conteúdo do favorito. Tente novamente.";
  }
});

// Deletar favorito
ipcMain.handle("deletar-favorito", async (event, { email, nome }) => {
  try {
    await db.execute(
      `DELETE FROM favoritos
             WHERE usuario_id = (SELECT id FROM usuarios WHERE email = ?)
              AND nome_receita = ?`,
      [email, nome]
    );
    return true;
  } catch (error) {
    console.error("Erro ao deletar favorito:", error);
    return false;
  }
});

//Calendario de dieta
ipcMain.handle("has-diet-plan", async (event, email) => {
  try {
    const [rows] = await db.execute("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (rows.length === 0) return false;
    const userId = rows[0].id;

    const [planRows] = await db.execute(
      "SELECT 1 FROM planos_dieta WHERE usuario_id = ? LIMIT 1",
      [userId]
    );
    return planRows.length > 0;
  } catch (error) {
    console.error("Erro ao verificar plano de dieta:", error);
    return false;
  }
});

ipcMain.handle("generate-diet-plan", async (event, { email, dietType, startDate }) => {
  try {
    const [rows] = await db.execute("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (rows.length === 0) return { success: false, message: "Usuário não encontrado." };
    const userId = rows[0].id;

    await db.execute(
      "DELETE FROM planos_dieta WHERE usuario_id = ?",
      [userId]
    );

    //Gera o calendario de dieta de 31 dias
    const dietPlan = await generateMonthlyDietPlanIA(dietType);

    if (!dietPlan || Object.keys(dietPlan).length === 0) {
      return { success: false, message: "Falha ao gerar plano de dieta. Tente novamente." };
    }

    const dietPlanJson = JSON.stringify(dietPlan); // Store as JSON

    await db.execute(
      "INSERT INTO planos_dieta (usuario_id, data_inicio, plano_json) VALUES (?, ?, ?)",
      [userId, startDate, dietPlanJson]
    );

    return { success: true, message: "Plano de dieta gerado e salvo com sucesso!" };
  } catch (error) {
    console.error("Erro ao gerar e salvar plano de dieta:", error);
    return { success: false, message: "Erro ao gerar ou salvar plano de dieta. Tente novamente." };
  }
});

ipcMain.handle("get-diet-plan", async (event, email) => {
  try {
    const [rows] = await db.execute("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (rows.length === 0) return null;
    const userId = rows[0].id;

    const [planRows] = await db.execute(
      "SELECT plano_json FROM planos_dieta WHERE usuario_id = ? ORDER BY data_inicio DESC LIMIT 1",
      [userId]
    );

    if (planRows.length > 0) {
      const rawJson = planRows[0].plano_json;
            if (typeof rawJson === 'string') {
        try {
          return { success: true, plan: JSON.parse(rawJson) };
        } catch (parseError) {
          console.error("Erro ao fazer parse do JSON do plano de dieta:", parseError);
          console.error("JSON problemático:", rawJson); // Log the problematic JSON
          return { success: false, message: "Erro ao carregar plano de dieta: formato inválido." };
        }
      } else if (typeof rawJson === 'object' && rawJson !== null) {
                    return { success: true, plan: rawJson };
      } else {
          console.error("Dados do plano de dieta não são string nem objeto:", rawJson);
          return { success: false, message: "Erro ao carregar plano de dieta: dados inesperados." };
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao obter plano de dieta:", error);
    return null;
  }
});

async function generateMonthlyDietPlanIA(dietType) {
  const promptDietPlan = `Você é um nutricionista e criará um plano de dieta mensal para o usuário, com base no tipo de dieta "${dietType}".
  Para cada dia do mês (30 dias), forneça uma sugestão de refeição para Café da Manhã, Almoço e Jantar.
  Siga o formato JSON estrito para a saída. O objeto JSON deve ter chaves no formato "YYYY-MM-DD" para cada dia.
  Dentro de cada dia, deve haver um objeto com as chaves "cafe", "almoco", e "jantar", cada uma contendo uma breve descrição da refeição.

  Exemplo do formato JSON esperado para um dia:
  {
    "2025-07-01": {
      "cafe": "Omelete com vegetais e uma fatia de pão integral.",
      "almoco": "Salada de frango grelhado com folhas verdes e azeite.",
      "jantar": "Sopa de lentilha com torrada integral."
    },
    "2025-07-02": {
      "cafe": "Iogurte natural com frutas vermelhas e granola.",
      "almoco": "Peixe assado com batata doce e brócolis cozido no vapor.",
      "jantar": "Wrap de atum com alface e tomate."
    }
    // ... e assim por diante para 30 dias
  }

  Gere um plano de dieta completo para 30 dias a partir da data de hoje. A data de hoje é ${new Date().toISOString().split('T')[0]}.
  Inclua o ano, mês e dia no formato YYYY-MM-DD para cada chave do dia. Siga a dieta "${dietType}".
  Use ingredientes comuns no Brasil e opções variadas.`;

  try {
    const result = await model.generateContent(promptDietPlan);
    const response = await result.response;
    const textResponse = response.text();

    console.log("Raw Gemini Response Text:", textResponse);

    const jsonString = textResponse.replace(/```json\n|\n```/g, '');

    console.log("Cleaned JSON String:", jsonString);

    try {
      const parsedJson = JSON.parse(jsonString);
      return parsedJson;
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON da Gemini:", parseError);
      console.error("JSON problemático (após limpeza):", jsonString);
      return {}; 
    }
  } catch (error) {
    console.error("Erro ao consultar Gemini para plano de dieta:", error);
    return {};
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("src/pages/editor/login.html");
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});