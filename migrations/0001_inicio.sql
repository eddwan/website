-- Migration number: 0001 	 2026-11-19T23:39:30.655Z
-- Primeira migração: só a tabela meta, com a versão do esquema (o /api/saude lê esta linha).
-- As tabelas do login entram numa próxima migração.
CREATE TABLE meta (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

INSERT INTO meta (chave, valor) VALUES ('esquema', '1');
