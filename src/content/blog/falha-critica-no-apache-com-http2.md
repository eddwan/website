---
titulo: 'Falha crítica no Apache com HTTP/2: como saber se o seu servidor está exposto e o que fazer esta semana'
descricao: 'A CVE-2026-119618 permite execução remota de código sem autenticação no Apache HTTP Server com HTTP/2. Veja quem está afetado, como checar e como corrigir antes que surja um ataque.'
data: 2026-11-12
tipo: noticia
tags: [segurança, linux]
fontes:
  - titulo: 'Wiz: Critical RCE Vulnerability in Apache HTTP Server (CVE-2026-119618)'
    url: https://www.wiz.io/blog/cve-2026-119618-rce-apache-http-server-vulnerability
  - titulo: 'SecurityOnline: CVE-2026-119618, Apache HTTP Server Remote Code Execution Fixed in 2.4.71'
    url: https://securityonline.info/apache-http-server-cve-2026-119618-rce-fixed/
  - titulo: 'Cybersecurity News: Apache Patches Critical HTTP/2 Flaw Allowing Remote Code Execution'
    url: https://cybersecuritynews.com/apache-patches-critical-http-2-flaw/
---

Se a sua empresa tem um site, um sistema interno ou um painel administrativo rodando em Apache, esta é uma atualização para colocar na agenda desta semana. Foi corrigida uma falha crítica no módulo de HTTP/2 do Apache HTTP Server que permite a um atacante remoto, sem login e sem senha, executar código no servidor.

A boa notícia é que, quando a análise foi publicada, ainda não havia código de ataque público nem relato de exploração. É raro ter essa vantagem. Este artigo explica o que é a falha, como descobrir em poucos minutos se você está na faixa afetada e o que fazer, inclusive quando não dá para atualizar imediatamente.

## O que é a falha

A vulnerabilidade recebeu o identificador **CVE-2026-119618**. Ela está na função `assign_headers()` do módulo `mod_http2`, responsável por atender conexões HTTP/2 no Apache.

O problema é uma condição de corrida: duas operações concorrentes acessam a mesma estrutura de memória sem a sincronização correta. Um atacante que consiga provocar essa corrida de propósito pode corromper a memória do processo e, a partir daí, executar código arbitrário no servidor. Tudo isso acontece antes de qualquer autenticação, ou seja, basta o servidor estar acessível pela rede.

Na prática, execução remota de código no servidor web significa que o atacante pode ler o que o Apache lê (arquivos do site, configurações, às vezes credenciais de banco de dados), instalar código malicioso e usar a máquina como ponto de partida para chegar a outros sistemas da rede.

A falha foi encontrada de forma independente por dois times: o da Anthropic e o de pesquisa de vulnerabilidades do Google Cloud.

## Quem está afetado

A falha só existe em uma combinação específica:

| Componente | Versões vulneráveis | Versão corrigida |
|---|---|---|
| Apache HTTP Server | 2.4.55 até 2.4.70 | 2.4.71 ou posterior |
| Módulo `mod_h2` avulso (distribuído separadamente no GitHub) | até 2.0.42 | posterior à 2.0.42 |

E, além da versão, **o HTTP/2 precisa estar ativo**. Um Apache 2.4.70 que só atende HTTP/1.1 não é afetado por esta falha específica.

Dois cuidados com essa tabela:

1. **Versões abaixo da 2.4.55 não têm esta falha, mas isso não é motivo para ficar nelas.** Elas acumulam outras vulnerabilidades já corrigidas. Se o seu servidor está numa versão muito antiga, este é um bom momento para planejar a atualização de qualquer forma.
2. **Em Linux, o número da versão pode enganar.** Distribuições como Debian, Ubuntu, Red Hat e derivadas costumam aplicar a correção de segurança no pacote que já está instalado, sem mudar o número principal da versão. Um servidor que mostra "2.4.62" pode estar corrigido se o pacote da distribuição já recebeu o patch. Nesses casos, a referência é o aviso de segurança da própria distribuição, não o número que o Apache informa.

### Qual o tamanho da exposição

Segundo dados da Wiz, que publicou a análise técnica, 64% dos ambientes de nuvem que ela monitora têm algum recurso com versão vulnerável, e 51% têm instâncias expostas publicamente. Esses números são de um fornecedor de segurança e não consideram se o HTTP/2 está ligado em cada caso, então servem como ordem de grandeza, não como medida exata do risco. Mesmo assim, mostram que o Apache vulnerável não é exceção.

## Como checar em cinco minutos

### Se o seu site está em uma hospedagem

Abra um chamado com a sua hospedagem e pergunte, com estas palavras:

> "O Apache do meu servidor já está corrigido contra a CVE-2026-119618, ou está com o HTTP/2 desligado?"

Hospedagens compartilhadas e painéis gerenciados costumam aplicar esse tipo de correção sozinhos, mas não custa confirmar. Se a resposta for vaga, peça a versão do pacote e a data da última atualização.

### Se o servidor é seu

**1. Veja a versão do Apache.**

```bash
# Debian e Ubuntu
apache2ctl -v

# Red Hat, Rocky, AlmaLinux, CentOS
httpd -v

# Em muitas instalações, este também funciona
apachectl -v
```

**2. Veja se o módulo de HTTP/2 está carregado.**

```bash
apachectl -M 2>/dev/null | grep -i http2
```

Se aparecer `http2_module`, o módulo está carregado.

**3. Veja se o HTTP/2 está habilitado na configuração.**

```bash
# Debian e Ubuntu
grep -Ri "^\s*Protocols" /etc/apache2/

# Red Hat e derivadas
grep -Ri "^\s*Protocols" /etc/httpd/
```

Linhas como `Protocols h2 http/1.1` ou `Protocols h2 h2c http/1.1` indicam que o HTTP/2 está em uso.

**4. Confirme de fora, pelo navegador ou pelo terminal.**

```bash
curl -sI --http2 https://seusite.com.br | head -n 1
```

Se a resposta começar com `HTTP/2`, o servidor está negociando HTTP/2 com os clientes. Se começar com `HTTP/1.1`, não está.

**5. Se for Linux com pacote da distribuição, consulte o aviso de segurança dela.** Procure pelo identificador CVE-2026-119618 no rastreador de segurança da sua distribuição e compare a versão do pacote corrigido com a instalada:

```bash
# Debian e Ubuntu
dpkg -l | grep apache2

# Red Hat e derivadas
rpm -q httpd
```

## O que fazer

### 1. Atualizar

A correção definitiva é atualizar:

- **Apache compilado a partir do código-fonte:** para a versão 2.4.71 ou posterior.
- **Apache de pacote da distribuição:** para o pacote corrigido que a distribuição publicou, com `apt upgrade`, `dnf upgrade` ou o mecanismo equivalente.
- **Módulo `mod_h2` avulso:** para uma versão posterior à 2.0.42.

Depois da atualização, reinicie o serviço e confira se a versão ou o pacote mudou.

### 2. Se não der para atualizar agora, desligar o HTTP/2

Às vezes a atualização depende de janela de manutenção, de homologação ou de um fornecedor. Enquanto isso, dá para eliminar a exposição desligando o HTTP/2. Na configuração do Apache, deixe apenas o HTTP/1.1:

```apache
Protocols http/1.1
```

E remova as referências a `h2` e `h2c` de onde aparecerem, incluindo dentro de blocos `VirtualHost`. Depois:

```bash
apachectl configtest && apachectl graceful
```

E repita o teste do `curl` para confirmar que a resposta passou a ser `HTTP/1.1`.

O efeito colateral é uma pequena perda de desempenho em páginas com muitos arquivos, porque o HTTP/1.1 não multiplexa requisições como o HTTP/2. Para a maioria dos sites de empresa, é uma troca aceitável por alguns dias.

### 3. Conferir de novo

Depois de atualizar ou de desligar o HTTP/2, repita a checagem. Vale também revisar outros servidores que você talvez tenha esquecido: ambiente de homologação, servidor antigo que ninguém desligou, painel de um sistema legado. Falhas assim costumam ser exploradas exatamente nos servidores que ninguém lembra que existem.

## Por que agir antes do ataque

Em outubro, as [falhas apelidadas de PHP2Shell, no PHP](/blog/falhas-criticas-no-php), seguiram o caminho oposto: a Cloudflare já via tentativas de ataque antes de a correção sair. Quem tinha servidor exposto ficou correndo atrás do prejuízo.

Desta vez, a correção chegou antes de qualquer ataque conhecido. É a janela mais barata para agir: dá para planejar, testar e aplicar com calma, em vez de fazer tudo às pressas no meio de um incidente.

Essa janela não costuma durar. Depois que uma correção é publicada, comparar a versão antiga com a nova ajuda atacantes a entender a falha, e o tempo até surgirem os primeiros ataques tende a ser curto.

## O que este caso ensina

Três hábitos tornam situações como esta muito mais simples:

1. **Inventário atualizado.** Saber quais servidores rodam Apache, em qual versão e com quais módulos. Se você precisou de mais de cinco minutos para responder a essa pergunta, esse é o primeiro ponto a resolver.
2. **Janela de atualização definida.** Ter um dia e um processo combinados para aplicar correções de segurança, em vez de decidir caso a caso.
3. **Configuração mínima.** Ativar só os módulos e protocolos que você realmente usa. Cada recurso ligado sem necessidade é mais superfície de ataque.

O patch mais barato é o que sai antes do ataque.

---

**Transparência:** a falha foi encontrada, de forma independente, pela Anthropic, criadora do Claude, ferramenta que uso no trabalho, e pelo time de pesquisa de vulnerabilidades do Google Cloud.
