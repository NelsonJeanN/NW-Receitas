CREATE DATABASE IF NOT EXISTS nw_receitas;
USE nw_receitas;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE -- Adicionada coluna para status de administrador
);

-- Tabela de favoritos
CREATE TABLE IF NOT EXISTS favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome_receita VARCHAR(100) NOT NULL,
    conteudo TEXT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de perfis
CREATE TABLE IF NOT EXISTS perfis (
    usuario_id INT PRIMARY KEY,
    bio TEXT,
    foto_perfil VARCHAR(255),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de publicações
CREATE TABLE IF NOT EXISTS publicacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    imagem VARCHAR(255),
    data DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de curtidas
CREATE TABLE IF NOT EXISTS curtidas (
    usuario_id INT NOT NULL,
    publicacao_id INT NOT NULL,
    PRIMARY KEY (usuario_id, publicacao_id), 
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE
);

-- Tabela de comentários
CREATE TABLE IF NOT EXISTS comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    publicacao_id INT NOT NULL,
    texto TEXT NOT NULL,
    data DATETIME DEFAULT CURRENT_TIMESTAMP, -- Data e hora do comentário
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE
);

-- Tabela de seguidores
CREATE TABLE IF NOT EXISTS seguidores (
    seguidor_id INT NOT NULL, -- O ID do usuário que está seguindo
    seguido_id INT NOT NULL, -- O ID do usuário que está sendo seguido
    PRIMARY KEY (seguidor_id, seguido_id),
    FOREIGN KEY (seguidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (seguido_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT chk_not_self_follow CHECK (seguidor_id != seguido_id) -- Impede que um usuário siga a si mesmo
);
