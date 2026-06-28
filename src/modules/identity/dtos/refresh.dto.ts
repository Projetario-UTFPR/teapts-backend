import { DTO } from "@/infra/http/dto";
import { ConfigValidation } from "@/infra/http/validation-provider";
import { HttpStatus } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z.object({
  refreshToken: z.string({
    error: "É necessário fornecer o JWT de atualização para obter um novo token.",
  }),
});

type RefreshSchema = z.infer<typeof schema>;

@ConfigValidation({ status: HttpStatus.BAD_REQUEST })
export class RefreshTokenDto extends DTO implements RefreshSchema {
  protected schema = schema;

  @Expose()
  @ApiProperty({ description: "The JWT refresh token." })
  public readonly refreshToken!: string;
}
