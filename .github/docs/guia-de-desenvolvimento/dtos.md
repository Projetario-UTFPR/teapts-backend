# Data Transfer Objects (DTOs)

DTOs são classes simples que expõem um único método: `validate`. Seu único dever é representar
uma estrutura de objeto e garantir que o que quer que seja enviado como corpo de uma requisição
se adeque à esta estrutura e às suas regras.

## Zod

A biblioteca [zod] é utilizada para enforçar regras de validação de forma elegante e simples.
Todo DTO possui um _schema_ zod, isto é, um objeto que define as regras de cada propriedade
que o compõe.

O zod permite inferência do tipo de um _schema_. Esse tipo deve ser encarado como uma segunda
interface a ser implementada pelo DTO, visando garantir que o schema seja a principal fonte
de verdade.

## Class Transformer

Esta é a biblioteca utilizada para "forçar" a instanciação do DTO a partir do corpo da
requisição. Essa transformação não garante que os dados estejam íntegros nem que existam, de fato.
Contudo, é garantido que campos que não forem explícitamente permitidos serão ignorados durante
a transformação, isto é, ela atua como uma _whitelist_ de propriedades.

Portanto, é necessário decorar todas as propriedades (enforçadas pela interface inferida do
_schema_ zod) com o _decorator_ `@Expose()`.

## O método `validate`

Por padrão, todo DTO que herde a classe `DTO` possui uma implementação simples para validar schemas
zod. Se necessário, esta função pode ser sobrescrita.

Para usufruir da implementação padrão do método `validate`, classes que herdam `DTO` precisam
definir, explicitamente, qual seu _schema_.

## Configuração do DTO

Entre as facilidades que o kit de providers de validação de DTOs providenciam, uma em destaque
é o decorator `@ConfigValidation()` (ou `@validationProvider.Confi`()`). Esse decorator permite
configurar o código HTTP que deve ser retornado diante de um erro de validação de um DTO.

Ele pode ser aplicado sobre DTOs, _controllers_ ou _handlers_ específicos. Por padrão, o código
HTTP `422` (_Unprocessable Entity_) é utilizado.

## Exemplo

### DTO Simples

```ts
import { DTO } from "@/infra/http/dto";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z.object({
  email: z.email({ error: "O e-mail fornecido é inválido." }),
  password: z.string({ error: "A senha é um campo obrigatório e precisa ser um texto." }),
});

type LoginSchema = z.infer<typeof schema>;

export class LoginDto extends DTO implements LoginSchema {
  protected schema = schema;

  @Expose()
  public readonly email!: string;

  @Expose()
  public readonly password!: string;
}
```

Observe que é necessário utilizar o operador de _non null assertion_, pois esta classe nunca
é instanciada pelo seu construtor. Por mais que pareça inseguro, o sistema só terá acesso às
propriedades após os providers terem validado o DTO, isto é, o sistema tem a garantia de que
elas existem se obteve acesso ao DTO.

### Sobrescrevendo o Código HTTP

```ts
// ...
import { ConfigValidation } from "@/infra/http/validation-provider";
import { HttpStatus } from "@nestjs/common";

// ...

@ConfigValidation({ status: HttpStatus.BAD_REQUEST })
export class LoginDto extends DTO implements LoginSchema {
  // ...
}
```

### Utilizando DTOs

```ts
@Controller()
export class SessionsController {
  @Post("login")
  public async login(@Body() loginDto: LoginDto): string {
    const { email, password } = loginDto;
    // ...
  }
}
```
