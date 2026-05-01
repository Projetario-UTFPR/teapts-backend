import { DTO } from "@/infra/http/dto";
import { ConfigValidation } from "@/infra/http/validation-provider";
import { HttpStatus } from "@nestjs/common";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z.object({
  email: z.email({ error: "O e-mail fornecido é inválido." }),
  password: z.string({ error: "A senha é um campo obrigatório e precisa ser um texto." }),
});

type LoginSchema = z.infer<typeof schema>;

@ConfigValidation({ status: HttpStatus.BAD_REQUEST })
export class LoginDto extends DTO implements LoginSchema {
  protected schema = schema;

  @Expose()
  public readonly email!: string;

  @Expose()
  public readonly password!: string;
}
