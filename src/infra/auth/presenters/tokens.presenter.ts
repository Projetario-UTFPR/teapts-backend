import { ApiProperty } from "@nestjs/swagger";

export class JWTokensPresenter {
  @ApiProperty({ description: "The JWT used for accessing protected resources." })
  public readonly accessToken!: string;

  @ApiProperty({
    description: "The JWT used for requesting another access token upon access token expiration.",
  })
  public readonly refreshToken!: string;

  private constructor(props: JWTokensPresenter) {
    Object.assign(this, props);
  }

  // This is a dead-simple presenter. It might seem unecessarily complexity to introduce this
  // presenter that does nothing actually (and it is), but it makes total sense for the other
  // presenters to follow this pattern. This is a special case that didn't even need a presenter,
  // but it's useful for us to have this presenter class for Swagger usage, hence here we are.
  public static present(tokens: JWTokensPresenter) {
    return new JWTokensPresenter(tokens);
  }
}
