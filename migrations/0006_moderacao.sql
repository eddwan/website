-- Migration number: 0006 	 2026-11-27T23:18:51.899Z
-- Sexta migração: moderação das sugestões (issue #22) e o furo no limite diário.
-- Datas em segundos Unix (INTEGER), como nas anteriores.

-- envios_sugestao: um registro por sugestão aceita no POST /api/sugestoes, só para o limite de
-- 3 por dia. Antes o limite contava as linhas de sugestoes, mas o DELETE /api/sugestoes/<repo>
-- apaga a linha: sugerir e remover em loop furava o limite (e cada volta gastava até 2 chamadas
-- na API do GitHub). Aqui o envio conta mesmo se a sugestão for removida depois.
-- Guarda só quem e quando, nada da sugestão. O cron diário apaga envios com mais de 2 dias
-- (a janela do limite é de 24 h, então nada que ainda conte é apagado).
CREATE TABLE envios_sugestao (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em INTEGER NOT NULL -- segundos Unix
);

-- Limite por dia: WHERE usuario_id = ? AND criado_em > ?; também serve à cascata ao apagar um usuário.
CREATE INDEX idx_envios_sugestao_usuario_criado ON envios_sugestao (usuario_id, criado_em);

-- Já conta as sugestões que existem, para o limite não zerar no deploy.
-- As antigas saem na primeira limpeza do cron.
INSERT INTO envios_sugestao (usuario_id, criado_em) SELECT usuario_id, criado_em FROM sugestoes;

-- Moderação (Live 8): motivo_recusa preenchido ao recusar; revisado_em em segundos Unix.
ALTER TABLE sugestoes ADD COLUMN motivo_recusa TEXT;
ALTER TABLE sugestoes ADD COLUMN revisado_em INTEGER;

UPDATE meta SET valor = '5' WHERE chave = 'esquema';
