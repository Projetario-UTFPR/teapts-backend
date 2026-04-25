# Configurações do Ambiente de Desenvolvimento

Neste guia, aprenda como configurar o ambiente de desenvolvimento para contribuir com o projeto.

## Requisitos

Os seguintes softwares são necessários para o desenvolvimento deste sistema.

- [Docker](https://docs.docker.com/engine/install/)
- [NodeJS e NPM](https://nodejs.org/en/download)

## Extensões Sugeridas (Para o VS Code)

- [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma)
- [Oxc](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode)
- [Vitest](https://marketplace.visualstudio.com/items?itemName=vitest.explorer)

## Variáveis de Ambientes

O template de variáveis de ambientes é encontrado no arquivo [`.env.sample`](/.env.sample).
Contudo, a fim de evitar eventuais problemas de segurança, variáveis sensíveis devem ser
configuradas manualmente mesmo em ambiente de desenvolvimento.

1. Copie as variáveis de ambiente localmente (`cp .env.sample .env`).
2. Gere as chaves pública e privada SHA256, utilizadas para assinar e validar JWTs:
   - Utilize o script `node scripts/gen-keys.mjs`.
   - Copie a chave privada e cole como valor da variável de ambiente `JWT_PRIVATE_KEY`
     (`.env`).
   - Copie a chave pública e cole como valor da variável de ambiente `JWT_PRIVATE_KEY`
     (`.env`).

Sinta-se a vontade para modificar outras variáveis conforme julgar necessário.
