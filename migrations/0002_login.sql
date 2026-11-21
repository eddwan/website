-- Migration number: 0002 	 2026-11-20T23:28:07.324Z
-- Segunda migração: tabelas do login (issue #18). O envio do código por e-mail vem na próxima live.
-- Datas em segundos Unix (INTEGER). O e-mail nunca é guardado em texto, só como HMAC.

CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY,
  email_hmac TEXT NOT NULL UNIQUE,
  criado_em INTEGER NOT NULL
);

-- Códigos de login: guarda só o hash do código, com validade e contagem de tentativas
CREATE TABLE codigos (
  id INTEGER PRIMARY KEY,
  email_hmac TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  expira_em INTEGER NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  criado_em INTEGER NOT NULL
);

-- Sessões: guarda só o hash do token; apagar o usuário apaga as sessões dele
CREATE TABLE sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em INTEGER NOT NULL,
  criado_em INTEGER NOT NULL
);

-- Limite de 3 códigos por hora: WHERE email_hmac = ? AND criado_em > ?
CREATE INDEX idx_codigos_email_criado ON codigos (email_hmac, criado_em);

-- Limpeza dos vencidos: DELETE ... WHERE expira_em < ?
CREATE INDEX idx_codigos_expira ON codigos (expira_em);
CREATE INDEX idx_sessoes_expira ON sessoes (expira_em);

-- Cascata e "sessões do usuário": sem este índice, apagar um usuário varre a tabela sessoes inteira
CREATE INDEX idx_sessoes_usuario ON sessoes (usuario_id);

UPDATE meta SET valor = '2' WHERE chave = 'esquema';
