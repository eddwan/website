---
titulo: 'AWS Emulator: a AWS agora roda no seu notebook, mas não é a nuvem'
descricao: 'A AWS lançou um emulador gratuito que responde às suas APIs localmente. Veja como ele funciona, onde ajuda, quais são os limites e por que a telemetria merece atenção antes de adotar.'
data: 2026-11-12
tipo: noticia
tags: [cloud, ferramentas, programação]
fontes:
  - titulo: 'AWS News Blog: Test your applications against AWS locally with AWS Emulator'
    url: https://aws.amazon.com/blogs/aws/test-your-applications-against-aws-locally-with-aws-emulator/
  - titulo: 'AWS Emulator: documentação oficial'
    url: https://docs.aws.amazon.com/emulator/latest/userguide/what-is-service.html
  - titulo: 'The Register: AWS distills its cloud into a local emulator that runs on your PC'
    url: https://www.theregister.com/off-prem/2026/11/12/aws-distills-its-cloud-into-a-local-emulator-that-runs-on-your-pc/5309251
  - titulo: 'DEV Community: AWS''s Official Emulator vs LocalStack'
    url: https://dev.to/chenyuan20509/awss-official-emulator-vs-localstack-160-rust-crates-fidelity-scores-per-release-and-a-2jk5
  - titulo: 'GitHub: aws/aws-emulator'
    url: https://github.com/aws/aws-emulator
---

A AWS lançou em 11 de novembro o **AWS Emulator**, um emulador gratuito que responde às APIs da AWS direto na sua máquina. O SDK, a CLI e até agentes de código conversam com ele como se estivessem falando com a nuvem, sem mudar uma linha da aplicação.

Para quem paga conta de ambiente de teste, ou espera minutos para cada ciclo de deploy em uma conta compartilhada, isso muda o cálculo. Mas o emulador tem limites claros, alguns declarados pela própria AWS, e um padrão de telemetria que vale conhecer antes de colocar no fluxo do time.

## O que é

O AWS Emulator é um programa local que serve um endpoint HTTPS com as mesmas APIs da AWS. Em vez de a sua aplicação chamar `s3.amazonaws.com` ou o endpoint do DynamoDB na região, ela chama o endpoint local, e o emulador responde no formato que a AWS responderia.

Os pontos principais:

- **Gratuito.** Não há cobrança pelo uso do emulador. Testes que rodam nele, no notebook ou no CI, não chamam a AWS e não geram conta.
- **Escrito em Rust**, segundo a AWS para manter baixo o consumo de CPU e memória em um notebook.
- **Código no GitHub**, no repositório `aws/aws-emulator`.
- **Cobertura ampla, com fidelidade variável.** Ele atende serviços que têm modelo de API publicado pela AWS. Uma análise do repositório contou 160 módulos de serviço no momento do lançamento. A própria AWS diz que o quanto ele se parece com a nuvem varia por serviço e por recurso.

## Como funciona na prática

Ao iniciar, o emulador gera as próprias credenciais, um arquivo de configuração e um certificado para o endpoint HTTPS local. Variáveis de ambiente apontam o SDK e a CLI para esse endpoint, e o código da aplicação continua o mesmo.

Isso é o que torna a ferramenta interessante: você não precisa reescrever chamadas, criar mocks à mão nem manter duas versões do código, uma para teste e outra para produção. A troca entre emulador e nuvem é configuração, não código.

A AWS também publicou uma skill para agentes de código usarem o emulador. Faz sentido: um agente que testa infraestrutura contra o emulador não corre o risco de criar recurso de verdade, nem de gerar custo, enquanto itera.

### Instalação

- **Linux:** pacotes RPM e Debian.
- **macOS e Windows:** via Docker. A documentação traz um Dockerfile para você montar a imagem, porque não há uma imagem pronta publicada.
- **Código-fonte:** também dá para compilar a partir do repositório.

## Onde ele ajuda

**Ciclo de desenvolvimento.** Criar uma fila, publicar uma mensagem, gravar um objeto e ler de volta em segundos, sem depender de conta compartilhada nem de rede.

**CI.** Testes de integração que hoje precisam de uma conta de teste, com credenciais no pipeline e limpeza de recursos depois, podem rodar contra o emulador. Menos custo, menos credencial circulando e menos lixo esquecido na conta.

**Agentes de código.** Um agente que escreve código de infraestrutura pode testar contra o emulador sem acesso à conta real. É uma forma simples de limitar o que ele consegue fazer de errado.

**Ambientes de teste esquecidos.** Todo time tem aquele ambiente de teste ligado há meses que ninguém usa. Parte desse custo pode simplesmente deixar de existir.

## Onde ele não é a nuvem

Aqui está o ponto que mais importa. A AWS declara estes limites:

### 1. Não avalia permissões como a AWS

O emulador **não avalia políticas de IAM nem políticas de recurso** do jeito que a AWS avalia. Uma chamada que seria negada na nuvem pode passar no emulador.

Na prática: um teste que passa localmente não prova que a role da aplicação tem as permissões certas, nem que um bucket está fechado como deveria. Erros de permissão, que estão entre os problemas mais comuns em deploy na AWS, só aparecem na nuvem.

### 2. Uma conta e uma região

Cada emulador funciona como **uma única conta, em uma única região**. Não há comportamento entre contas nem entre regiões. Se a sua arquitetura usa replicação entre regiões, acesso entre contas ou organizações com várias contas, essa parte não pode ser testada localmente.

### 3. Fidelidade varia por serviço

A AWS publica, a cada versão, uma nota de fidelidade por serviço, baseada em quantos testes passam, e mantém um rastreador público das diferenças conhecidas em relação à nuvem. É um nível de transparência que ajuda bastante: antes de confiar no emulador para um serviço específico, vale olhar a nota dele.

## A telemetria vem ligada

Este é o detalhe que eu levaria para o time de segurança antes de adotar. **O emulador envia dados de uso e de erro para a AWS por padrão.**

Segundo a AWS, esses registros são minimizados e não incluem conteúdo de requisições ou respostas, código, credenciais nem dados pessoais, e não são compartilhados com terceiros. Ainda assim, para muitas empresas, ferramenta que envia dados para fora por padrão precisa passar por avaliação, especialmente em notebooks de desenvolvedores e em pipelines de CI.

Dá para desligar de algumas formas:

- Iniciar o emulador com a opção `--telemetry off`.
- Definir a variável de ambiente:

```bash
export EMULATOR_TELEMETRY=off
```

- Ou, no arquivo `~/.aws/emulator/config.toml`:

```toml
[telemetry]
enabled = false
```

Se o time decidir desligar, a forma mais segura é padronizar no próprio pipeline e na imagem de desenvolvimento, em vez de depender de cada pessoa lembrar.

## Como eu usaria

Uma divisão simples, que aproveita o emulador sem cair nos limites dele:

1. **Emulador** para o ciclo rápido de desenvolvimento, para testes de integração no CI e para agentes de código.
2. **Conta real de teste** para tudo que envolve permissões, integrações entre contas ou regiões e serviços com nota de fidelidade baixa.
3. **Um teste final na nuvem** antes de cada deploy em produção, sempre.

Com isso, a maior parte dos testes deixa de gerar custo e fica mais rápida, e o que o emulador não cobre continua sendo validado onde importa.

## E as alternativas?

Ferramentas para emular a AWS localmente já existiam, como o LocalStack e o Moto, além de projetos abertos mais recentes. A diferença aqui é ser uma ferramenta oficial, mantida pela própria AWS, gratuita e com nota de fidelidade publicada a cada versão. Para quem já usa uma alternativa e está satisfeito, vale testar lado a lado nos serviços que o time mais usa antes de trocar.

## Resumo

O AWS Emulator é uma boa notícia para custo e velocidade de desenvolvimento. Ele tira da nuvem a maior parte dos testes do dia a dia e dá aos agentes de código um lugar seguro para testar. Mas ele não avalia permissões, não cobre cenários entre contas e regiões e envia telemetria por padrão.

Emulador acelera o teste. Não aprova o deploy.
