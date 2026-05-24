import { AuthCollection } from "@/infra/auth/auth-collection";
import { AuthCollectionPresenter } from "@/infra/auth/presenters/auth-collection.presenter";
import { ApiProperty } from "@nestjs/swagger";

export class JWTokenPresenter {
  @ApiProperty({ description: "The JWT used for accessing protected resources." })
  public readonly accessToken!: string;

  @ApiProperty({
    description: "The JWT used for requesting another access token upon access token expiration.",
  })
  public readonly refreshToken!: string;

  @ApiProperty({
    description: "Useful minimal set of data regarding the authenticated user.",
  })
  public readonly authCollection!: AuthCollectionPresenter;

  private constructor(props: JWTokenPresenter) {
    Object.assign(this, props);
  }

  public static present(
    {
      accessToken,
      refreshToken,
    }: {
      accessToken: string;
      refreshToken: string;
    },
    authCollection: AuthCollection,
  ) {
    return new JWTokenPresenter({
      accessToken,
      refreshToken,
      authCollection: AuthCollectionPresenter.present(authCollection),
    });
  }
}
