# TEA-PTS [back-end]

Esse repositório contém o sistema back-end do TEA-PTS, uma plataforma para elaboração e manutenção de
Programas Terapêuticos Singulares e atendimento de pessoas com TEA.

## Guia de Desenvolvimento

Para aprender como contribuir com o projeto, dirija-se ao [Guia de Desenvolvimento].

[Guia de Desenvolvimento]: .github/docs/guia-de-desenvolvimento/index.md

## Rodando o Servidor

O jeito mais fácil de rodar o servidor é levantar um contêiner Docker executando a sua imagem.
Isso pode ser feito seguindo o breve passo-a-passo adiante:

1. Configure as variáveis de ambiente (leia [as instruções de como configurá-las])
2. Levante os contêineres (do banco de dados e do próprio sistema) com o comando `docker compose --profile full up`

[as instruções de como configurá-las]: .github/docs/guia-de-desenvolvimento/configurações-do-ambiente.md#variáveis-de-ambientes

Para _buildar_ e executar o servidor, confira o [Guia de Desenvolvimento].
