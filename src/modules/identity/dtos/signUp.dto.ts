import { DTO } from "@/infra/http/dto";
import { ConfigValidation } from "@/infra/http/validation-provider";
import { HttpStatus } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z.object({
  email: z.email({ error: "O e-mail fornecido é inválido." }),
  username: z
    .string({
      error: "O nome do usuário é um campo obrigatório e precisa ser um texto.",
    })
    .min(5, "Nome de usuário precisa de no mínimo 5 caracteres"),
  password: z
    .string({
      error: "A senha é um campo obrigatório e precisa ser um texto.",
    })
    .min(8, "Senha precisa de no mínimo 8 caracteres"),
});

type SignUpSchema = z.infer<typeof schema>;

export class SignUpDto extends DTO implements SignUpSchema {
  protected schema = schema;

  @ApiProperty({ description: "The account's e-mail address." })
  @Expose()
  public readonly email!: string;

  @ApiProperty({ description: "The account's user name." })
  @Expose()
  public readonly username!: string;

  @ApiProperty({ description: "The account's password." })
  @Expose()
  public readonly password!: string;
}
