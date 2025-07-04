-- Cria o banco de dados
CREATE DATABASE IF NOT EXISTS nw_receitas;
USE nw_receitas;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL
);

-- Tabela de favoritos
CREATE TABLE IF NOT EXISTS favoritos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nome_receita VARCHAR(100) NOT NULL,
  conteudo TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
-- Tabela plano de dieta
CREATE TABLE IF NOT EXISTS planos_dieta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  data_inicio DATE NOT NULL,
  plano_json JSON NOT NULL, -- Para armazenar o plano de dieta em formato JSON
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);