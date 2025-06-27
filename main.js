const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Conexão com o banco de dados MySQL
const mysql = require('mysql2/promise');
let db;
mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
}).then(conn => db = conn).catch(err => console.error("Erro ao conectar ao banco:", err));

// Login com tentativas limitadas
let loginAttempts = {};

ipcMain.handle('register-user', async (event, { name, email, password }) => {
const { isValidName, isValidEmail, isStrongPassword } = require('./validacoes');


  if (!isValidName(name)) return { success: false, message: "Nome inválido: mínimo 3 letras, sem números." };
  if (!isValidEmail(email)) return { success: false, message: "Use um e‑mail válido dos domínios comuns." };
  if (!isStrongPassword(password)) {
    return {
      success: false,
      message: "Senha fraca: misture letras maiúsculas, minúsculas, número e símbolo. Evite sequências ou repetições."
    };
  }

  const [rows] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (rows.length > 0) return { success: false, message: "E‑mail já registrado." };

  const hash = await bcrypt.hash(password, 10);
  await db.execute('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', [name, email, hash]);
  return { success: true, message: "Usuário registrado com sucesso!" };
});

ipcMain.handle('login-user', async (event, { email, password }) => {
  const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
  if (rows.length === 0) return { success: false, message: "E-mail não encontrado." };

  if (loginAttempts[email] >= 3) return { success: false, message: "Conta bloqueada após 3 tentativas." };

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.senha_hash);
  if (valid) {
    loginAttempts[email] = 0;
    return { success: true, message: "Login bem-sucedido!", name: user.nome };
  } else {
    loginAttempts[email] = (loginAttempts[email] || 0) + 1;
    return { success: false, message: `Senha incorreta. Tentativas: ${loginAttempts[email]}` };
  }
});

// API Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const promptRecipe = `
Você é um chef profissional e especialista em explicar receitas de forma clara e acessível. Sempre siga as instruções abaixo ao responder:
1. Use uma linguagem simples, objetiva e amigável, mas não use caracteres especiais como #, *, ~, ou emojis.
2. Estruture a receita da seguinte forma:
   - Nome da receita
   - Ingredientes (em lista com quantidades exatas)
   - Modo de preparo (passo a passo numerado)
   - Dicas extras ou sugestões de variações
3. Use ingredientes comuns e fáceis de encontrar no Brasil.
4. Evite termos técnicos ou estrangeiros sem explicação.
5. A resposta deve ser direta e útil para quem está começando a cozinhar.

Agora, gere uma receita completa para: `;

async function buscarReceitaIA(query) {
  try {
    const prompt = `${promptRecipe}${query}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro ao consultar Gemini:", error);
    return "⚠️ Houve um erro ao buscar a receita. Tente novamente mais tarde.";
  }
}

ipcMain.handle('buscar-receita', async (event, query) => {
  return await buscarReceitaIA(query);
});

// Salvar receita favorita
ipcMain.handle('salvar-favorito', async (event, { email, nome, conteudo }) => {
  const [rows] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (rows.length === 0) return;
  const userId = rows[0].id;

  await db.execute('INSERT INTO favoritos (usuario_id, nome_receita, conteudo) VALUES (?, ?, ?)', [userId, nome, conteudo]);
});

// Listar favoritos
ipcMain.handle('get-favoritos', async (event, email) => {
  const [rows] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (rows.length === 0) return [];
  const userId = rows[0].id;

  const [favoritos] = await db.execute('SELECT nome_receita FROM favoritos WHERE usuario_id = ?', [userId]);
  return favoritos.map(f => f.nome_receita);
});

// Ver conteúdo da receita
ipcMain.handle('get-favorito-conteudo', async (event, { email, nome }) => {
  const [rows] = await db.execute(`
    SELECT conteudo FROM favoritos 
    WHERE usuario_id = (SELECT id FROM usuarios WHERE email = ?) 
    AND nome_receita = ?
  `, [email, nome]);

  return rows.length ? rows[0].conteudo : "Arquivo não encontrado.";
});

// Deletar favorito
ipcMain.handle('deletar-favorito', async (event, { email, nome }) => {
  await db.execute(`
    DELETE FROM favoritos 
    WHERE usuario_id = (SELECT id FROM usuarios WHERE email = ?) 
    AND nome_receita = ?
  `, [email, nome]);

  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('src/pages/editor/login.html');
}

app.whenReady().then(() => {
  createWindow();
});
