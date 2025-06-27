// Importa módulos do Electron necessários para criar uma ponte segura
const { contextBridge, ipcRenderer } = require('electron');

// Expondo uma API segura para o contexto do navegador (frontend)
contextBridge.exposeInMainWorld('electronAPI', {
  // Método para buscar uma receita, envia uma requisição para o processo principal via IPC
  buscarReceita: (query) => ipcRenderer.invoke('buscar-receita', query),

  // Método para registrar um novo usuário, envia dados para o backend criar o cadastro
  registerUser: (userData) => ipcRenderer.invoke('register-user', userData),

  // Método para autenticar login do usuário, enviando email e senha para validação
  loginUser: (userData) => ipcRenderer.invoke('login-user', userData),

  // Método para salvar uma receita como favorita para o usuário logado
  salvarFavorito: (data) => ipcRenderer.invoke('salvar-favorito', data),

  // Método para recuperar a lista de nomes das receitas favoritas do usuário
  getFavorites: (email) => ipcRenderer.invoke('get-favoritos', email),

  // Método para obter o conteúdo completo de uma receita favorita específica
  getFavoritoConteudo: (data) => ipcRenderer.invoke('get-favorito-conteudo', data),

  // Método para deletar uma receita favorita do usuário
  deletarFavorito: (data) => ipcRenderer.invoke('deletar-favorito', data)
});
