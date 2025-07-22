const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials),
    registerUser: (userData) => ipcRenderer.invoke('register-user', userData),
    buscarReceita: (query) => ipcRenderer.invoke('buscar-receita', query),
    buscarReceitaComFiltros: (data) => ipcRenderer.invoke('buscar-receita-com-filtros', data),
    salvarHistoricoBusca: (data) => ipcRenderer.invoke('salvar-historico-buscas', data), 
    getSugestoesHistorico: (email) => ipcRenderer.invoke('get-sugestoes-historico', email),
    salvarFavorito: (data) => ipcRenderer.invoke('salvar-favorito', data),
    getFavorites: (email) => ipcRenderer.invoke('get-favoritos', email),
    getFavoritoConteudo: (data) => ipcRenderer.invoke('get-favorito-conteudo', data),
    deletarFavorito: (data) => ipcRenderer.invoke('deletar-favorito', data),

    generateDietPlan: (data) => ipcRenderer.invoke('generate-diet-plan', data),
    getDietPlan: (email) => ipcRenderer.invoke('get-diet-plan', email),
    hasDietPlan: (email) => ipcRenderer.invoke('has-diet-plan', email),
});