# Guia de Desenvolvimento: Objetos e Arquitetura

Nesse guia, vamos discutir quais os tipos de objetos que vivem no sistema e como eles são utilizados por unidades
de trabalho em diferentes camadas da aplicação.

## Tipos de Objetos

### Value Objects

São objetos definidos por seus atributos e não possuem identidade única. Se dois Value Objects têm os mesmos valores, eles
são considerados idênticos. Value objects são imutáveis: para alterar um valor, você substitui o objeto inteiro.

> Exemplo: Um CPF, uma Cor ou um Endereco.

### Entities

Representam objetos que possuem uma identidade contínua que persiste ao longo do tempo e através de diferentes estados.
Mesmo que todas as suas propriedades mudem, se o ID for o mesmo, a Entidade é a mesma.

> Exemplo: Um Paciente ou um Milestone.

### Aggregate Roots

Um aggregate root é uma entidade raíz que reune um grupo de objetos de domínio (Entidades e Value Objects), que são tratados
como uma única unidade para fins de mudança de dados.

O aggregate root é a entidade suprema dentro de um domínio/agregado (uma fronteira em que determinadas regras de integridade).
Ela gerencia as modificações de todos os seus compostos **dentro do domínio em que ministra**, garantindo que todos os
dados se mantenham consistentes.

Observe que um aggregate root nunca deve ter, em sua composição, outro aggregate root. Quando houver tal necessidade,
o aggregate root deve possuir uma referência (ID) deste segundo Aggregate Root.

## Arquitetura: Do Núcleo à Saída

### Repositories

Repositórios são conjuntos de métodos que buscam, alteram, persistem ou removem dados (de uma ou mais tabelas e fontes).
Todo repositório fala exclusivamente na linguagem do domínio, isto é, lida com agregados e suas entidades e objetos de
valores.

Todo repositório deve pertencer a um agregado e deve ser responsável por manipular as entidades sob o domínio deste
objeto agregador.

> Por exemplo: existe uma Trajetória Terapeutica que manipula vários profissionais, um paciente e outros
> dados dentro do seu contexto. A adição/remoção de profissionais com acesso à essa trajetória deve ser feita pelo seu
> repositório. Contudo, um profissional também é um aggregate e possui seu repositório, pois ele não vive somente para
> o contexto desta trajetória, e pode tomar ações que são irrelevantes para a trajetória. Um profissional, ao alterar
> sua foto de perfil, não causa nenhuma possível inconsistência na trajetória, portanto esse serviço deve utilizar
> o repositório dos próprios profissionais, não das trajetórias. Agora, se uma trajetória possui milestones (marcos) que
> existem apenas para essa trajetória, eles são entidades e, logo, não devem possuir um repositório próprio, mas sim
> serem manipulados pelo repositório das trajetórias.

### Services

Services (serviços) são unidades que se comunicam somente na lingua de domínio: eles não conhecem [DTOs], presenters,
controllers, nada que esteja acima deles.

Serviços orquestram comandos e manipulam entidades para performar uma ação, garantindo que o estado do sistema seja
sempre válido e que as regras de negócio prevaleçam.

Esses **nunca** acessam estruturas fora do domínio (por exemplo, [DTOs]), e portanto, são ineficientes para
buscar dados completos para leitura.

### Queries

Queries são complementos dos repositórios: elas são responsáveis por reunir os dados necessários para montar [DTOs].
Não criam nem modificam dados, mas leem de várias fontes.

### Query Handler

Query handlers, assim como services, podem executar regras de negócio (por exemplo, para garantir que o requisitante
tenha realmente acesso ao recurso requisitado), e, logo, também utilizam repositórios. Entretanto, em contraste
aos services, query handlers lidam com dados fora do domínio: os [DTOs].

Essas unidades são responsáveis pela lógica necessária para obter um dado de leitura completo de uma ou mais
entidades/agregações do domínio.

Um query handler **nunca** cria ou modifica um dado, apenas visualiza.

### Presenters

Presenters são responsáveis por restringir quais dados de um [DTO] devem ser visíveis dado algum contexto. Eles
realizam a transformação final dos dados.

> Por exemplo: uma prévia de uma trajetória terapêutica não precisa conter todos os dados de um [DTO] de trajetória
> terapêutica, naturalmente.

Veja mais detalhes sobre _presenters_ em seu [documento específico].

[documento específico]: ./presenters.md

### Controllers

Estão na camada de saída (gateway): recebem as requisições HTTP e utilizam de todos os recursos acima para
efetuar uma operação ou obter uma estrutura pronta para apresentar para o usuário final.

[DTO]: ./dtos.md
[DTOs]: ./dtos.md
