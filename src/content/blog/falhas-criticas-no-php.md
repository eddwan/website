---
titulo: 'Duas falhas críticas no PHP: atualize hoje'
descricao: 'As falhas apelidadas de PHP2Shell deixam alguém invadir o servidor sem login e sem senha. Veja quais versões corrigem e o que fazer se o seu site roda WordPress, Laravel ou Magento.'
data: 2026-10-21
tipo: noticia
tags: [segurança, php, wordpress, notícia]
youtube:
  id: r4bRFOAIE_E
  formato: short
fontes:
  - titulo: 'Projeto PHP: anúncios de lançamento de 2026 (php.net)'
    url: https://www.php.net/archive/2026.php
  - titulo: 'BleepingComputer: PHP ships emergency patches for critical PHP2Shell flaws'
    url: https://bleepingcomputer.com/news/security/php-ships-emergency-patches-for-critical-php2shell-flaws
---

Se o site da sua empresa roda em WordPress, presta atenção.

Em 21 de outubro de 2026, o projeto PHP publicou correções urgentes para **duas falhas graves** (CVE-2026-109618 e CVE-2026-109619), apelidadas de **PHP2Shell**. O PHP é a linguagem por trás do WordPress, do Laravel, do Magento e de muitos outros sistemas.

## O que as falhas permitem

Elas deixam alguém **invadir o servidor sem login e sem senha**. E já tem gente tentando: segundo o BleepingComputer, a Cloudflare viu tentativas de ataque antes de a correção sair.

## Versões corrigidas

| Ramo | Versão corrigida |
| --- | --- |
| PHP 8.5 | 8.5.12 |
| PHP 8.4 | 8.4.27 |
| PHP 8.3 | 8.3.36 |
| PHP 8.2 | 8.2.35 |

## O que fazer hoje

- **Site numa hospedagem:** pergunte hoje à sua hospedagem se o PHP já foi atualizado.
- **Servidor próprio:** instale a versão corrigida do seu ramo (tabela acima).
- **PHP 8.1 ou anterior:** é hora de migrar para um ramo que ainda recebe correções.

Atualização crítica não espera reunião.
