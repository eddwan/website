-- Migration number: 0004 	 2026-11-25T23:16:23.713Z
-- Quarta migração: carga da rodada de teste das lives (issue #20).
-- Candidatos de video/publicar/lives-votacao/live-06-candidatos.json (canal do YouTube).

INSERT INTO rodadas (id, titulo, aberta, criado_em) VALUES (1, 'Rodada de teste (lives)', 1, unixepoch());

INSERT INTO repositorios (rodada_id, repo, nome, url, resumo, criado_em) VALUES
  (1, 'reactive-resume/reactive-resume', 'reactive-resume', 'https://github.com/reactive-resume/reactive-resume', 'Criador de currículo grátis e privado, com modelos bonitos, edição ao vivo, exportação em PDF e opção de hospedar você mesmo.', unixepoch()),
  (1, 'liketrek/TREK', 'TREK', 'https://github.com/liketrek/TREK', 'Planejador de viagens no seu servidor: roteiro em tempo real no mapa, reservas, gastos divididos, lista de mala, diário e servidor MCP.', unixepoch()),
  (1, 'we-promise/sure', 'sure', 'https://github.com/we-promise/sure', 'App de finanças pessoais para hospedar você mesmo, continuação comunitária do Maybe: contas, investimentos, orçamento e patrimônio num painel bonito.', unixepoch()),
  (1, 'photoprism/photoprism', 'photoprism', 'https://github.com/photoprism/photoprism', 'Suas fotos e vídeos no seu servidor, com reconhecimento de rostos e objetos, mapas, busca e app instalável no celular.', unixepoch()),
  (1, 'JerryZLiu/Dayflow', 'Dayflow', 'https://github.com/JerryZLiu/Dayflow', 'Diário de trabalho automático para Mac: entende o que você fez na tela e monta a linha do tempo do dia, o resumo para a daily e a revisão da semana, com IA local.', unixepoch()),
  (1, 'linkwarden/linkwarden', 'linkwarden', 'https://github.com/linkwarden/linkwarden', 'Gerenciador de favoritos no seu servidor que guarda cópia de cada página (captura, PDF e leitura), com anotações, coleções compartilhadas e extensão de navegador.', unixepoch()),
  (1, 'murtaza-nasir/speakr', 'speakr', 'https://github.com/murtaza-nasir/speakr', 'Transcreve gravações e reuniões no seu servidor, separa quem falou, resume e deixa conversar com o áudio, com modelos locais ou na nuvem.', unixepoch()),
  (1, 'vas3k/TaxHacker', 'TaxHacker', 'https://github.com/vas3k/TaxHacker', 'Contabilidade com IA no seu servidor: fotografa recibo ou nota, e ele extrai valores, itens e impostos, converte moedas e organiza por projeto.', unixepoch()),
  (1, 'danielmiessler/Fabric', 'Fabric', 'https://github.com/danielmiessler/Fabric', 'Biblioteca de centenas de prompts prontos (resumir, extrair ideias, revisar texto) que você usa no terminal com qualquer modelo, inclusive local.', unixepoch()),
  (1, 'DIYgod/pinky', 'pinky', 'https://github.com/DIYgod/pinky', 'Deixa agentes de IA usarem o iPhone ou Android, com você aprovando os passos de risco', unixepoch()),
  (1, 'hyperfield/ai-file-sorter', 'ai-file-sorter', 'https://github.com/hyperfield/ai-file-sorter', 'App de desktop que organiza e renomeia pastas pelo conteúdo dos arquivos, com IA local ou na nuvem e prévia de tudo antes de mexer.', unixepoch()),
  (1, 'blinkospace/blinko', 'blinko', 'https://github.com/blinkospace/blinko', 'Notas rápidas com IA no seu servidor: anota em segundos e depois pergunta às notas, com busca por significado e privacidade.', unixepoch());
