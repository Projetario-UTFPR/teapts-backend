# Presenters

Presenters são responsáveis por apresentar os dados de saída, visando omitir campos sensíveis (ou
fora do escopo do _endpoint_) e/ou realizar outras transformações de apresentação. Podemos
enxergá-los como DTOs de saída.

Um presenter não precisa implementar nenhuma interface em particular, no entanto é esperado que
sigam o padrão descrito neste documento. A não conformância com este padrão somente pode dificultar
ou alterar o modo como ele é utilizado nos _controllers_.

## O objeto

Espera-se que um _presenter_ seja uma classe extremamente simples:

- Ela somente **deve** possuir variáveis públicas e de leitura (`public readonly`)
- A classe apresentadora **deve** ser composta somente por tipos primitivos ou outros _presenters_
- Uma classe apresentadora **não deve** possuir nenhum método além daqueles especificados neste documento
- O construtor de uma classe apresentadora **deve** ser privado e **não deveria** performar nenhuma lógica
  complexa, apenas atribuir os valores às propriedades.

## O método `present`

Uma classe apresentadora **deve** possuir um método estático `present`, que tome uma entidade
de domínio como parâmetro e transforme-a em uma instância de si própria — isto é, apresente a entidade.

O método pode ser síncrono ou assíncrono, conforme houver necessidade.

## Swagger

As classes apresentadoras **devem** ter todas as suas propriedades decoradas com `@ApiProperty(...)`.
Descrições **devem** ser providenciadas para cada propriedade. Exemplos **deveriam** ser providenciados para
cada propriedade.

## Exemplos

### Simples

```ts
import { Account } from "@/modules/identity/entities/account.aggregate";
import { ApiProperty } from "@nestjs/swagger";

export class AccountPresenter {
  @ApiProperty({ example: "...", description: "..." }) public readonly id!: string;
  @ApiProperty({ example: "...", description: "..." }) public readonly name!: string;
  @ApiProperty({ example: "...", description: "..." }) public readonly email!: string;
  @ApiProperty({ example: "...", description: "..." }) public readonly lastUpdatedAt?: Date;
  @ApiProperty({ example: "...", description: "..." }) public readonly createdAt!: Date;

  private constructor(props: AccountPresenter) {
    Object.assign(this, props);
  }

  public static present(account: Account) {
    return new this({
      id: account.getId().toString(),
      name: account.getName(),
      email: account.getEmail(),
      createdAt: account.getCreatedAt(),
      lastUpdatedAt: account.getLastUpdatedAt(),
    });
  }
}
```

Os valores de exemplo, bem como as descrições, foram omitidos para manter a simplicidade do
documento.

Observe que neste apresentador o campo `passwordHash` da `Account` foi omitido, e o tipo
`UUID` precisou ser transformado em uma string (tipo primitivo), assim como discutimos anteriormente.

Observe, ainda, que para resolver erros do Typescript, utilizamos o operador de _non-null assertion_
em todas as propriedades obrigatórias — não é necessário adicioná-lo nas opcionais, já que não são
obrigatórias —, pois utilizamos um atalho (`Object.assign`) para atribuir os valores das propriedades.

Tomar o próprio _presenter_ como parâmetro do construtor privado está ok: como é um objeto simples e
sem métodos, o compilador do Typescript não acusará erros se passarmos um objeto plano ao invés de
uma instância, desde que o objeto implemente a classe como se fosse uma interface. Tomamos proveito
deste mecanismo.

### Composto

```ts
export class ComposedPresenter {
  @ApiProperty({ example: "...", description: "..." })
  public readonly somethingComplex!: SomeComplexObjectPresenter;

  @ApiProperty({ example: "...", description: "..." })
  public readonly primitiveValue!: string;

  private constructor(props: ComposedPresenter) {
    Object.assign(this, props);
  }

  public static present(composedEntity: ComposedEntity, complexEntity: ComplexEntity) {
    return new this({
      somethingComplex: SomeComplexObjectPresenter.present(complexEntity),
      primitiveValue: composedEntity.someValue.toString(),
    });
  }
}
```

Neste exemplo, utilizamos um outro _presenter_ para compor a classe apresentadora `ComposedPresenter`.
Além disso, apresentamos um método `present` que toma mais de 1 parâmetro, o que é totalmente permitido,
desde que facilite a utilização do apresentador.
