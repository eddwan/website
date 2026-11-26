-- Migration number: 0005 	 2026-11-26T23:16:56.597Z
-- Quinta migração: sugestões de repositórios validadas no GitHub (issue #21).
-- Datas em segundos Unix (INTEGER), como nas anteriores.

-- repo é único (em minúsculas): o GitHub não diferencia maiúsculas em dono/nome, então
-- "Foo/Bar" e "foo/bar" são o mesmo repositório. Assim cada repositório só pode ser
-- sugerido uma vez, e uma segunda sugestão do mesmo repo esbarra no UNIQUE.
-- nome guarda a grafia do GitHub, para mostrar na tela.
--
-- licenca, estrelas e ultimo_commit são uma foto do GitHub no momento da sugestão:
-- a Live 8 (aprovar ou recusar) decide com esses dados, sem consultar o GitHub de novo
-- (e sem gastar o limite de pedidos do token).
CREATE TABLE sugestoes (
  id INTEGER PRIMARY KEY,
  repo TEXT NOT NULL UNIQUE CHECK (repo = lower(repo)),
  nome TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL CHECK (length(motivo) BETWEEN 1 AND 280),
  licenca TEXT NOT NULL,          -- spdx_id do GitHub (ex.: MIT, Apache-2.0)
  estrelas INTEGER NOT NULL,
  ultimo_commit INTEGER NOT NULL, -- segundos Unix
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  criado_em INTEGER NOT NULL
);

-- Limite por dia: WHERE usuario_id = ? AND criado_em > ?
-- Também serve à cascata ao apagar um usuário (usuario_id é a primeira coluna do índice).
CREATE INDEX idx_sugestoes_usuario_criado ON sugestoes (usuario_id, criado_em);

UPDATE meta SET valor = '4' WHERE chave = 'esquema';
