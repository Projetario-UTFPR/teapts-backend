import { ApiProperty } from "@nestjs/swagger";

export class BasicExceptionPresenter {
  @ApiProperty({
    example: "Uma mensagem descritiva explicando o que ocasionou o erro.",
    description: "A human-readable and user-targeted error message.",
  })
  public readonly message!: string;

  private constructor(props: BasicExceptionPresenter) {
    Object.assign(this, props);
  }

  public static present(error: BasicExceptionPresenter) {
    return new this(error);
  }
}
