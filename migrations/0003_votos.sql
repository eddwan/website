-- Migration number: 0003 	 2026-11-25T23:16:21.757Z
-- Terceira migração: rodadas de votação, candidatos e votos (issue #20).
-- Datas em segundos Unix (INTEGER), como na 0002.

-- Rodadas: só uma aberta por vez é regra da aplicação; aqui só garante 0 ou 1
CREATE TABLE rodadas (
  id INTEGER PRIMARY KEY,
  titulo TEXT NOT NULL,
  aberta INTEGER NOT NULL DEFAULT 0 CHECK (aberta IN (0, 1)),
  criado_em INTEGER NOT NULL
);

-- Candidatos de cada rodada; repo é dono/nome, como no GitHub
CREATE TABLE repositorios (
  rodada_id INTEGER NOT NULL REFERENCES rodadas(id),
  repo TEXT NOT NULL,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  resumo TEXT NOT NULL,
  criado_em INTEGER NOT NULL,
  PRIMARY KEY (rodada_id, repo)
);

-- Um voto por pessoa, repositório e rodada (a chave primária impede votar duas vezes).
-- Apagar o usuário ou o candidato apaga os votos.
CREATE TABLE votos (
  rodada_id INTEGER NOT NULL,
  repo TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em INTEGER NOT NULL,
  PRIMARY KEY (rodada_id, repo, usuario_id),
  FOREIGN KEY (rodada_id, repo) REFERENCES repositorios(rodada_id, repo) ON DELETE CASCADE
);

-- Votos de uma pessoa, e a cascata ao apagar um usuário (sem ele, varre a tabela votos inteira)
CREATE INDEX idx_votos_usuario ON votos (usuario_id);

UPDATE meta SET valor = '3' WHERE chave = 'esquema';
