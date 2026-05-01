import { BadRequestError } from "@/common/errors/bad-request.error";
import { BaseError } from "@/common/errors/base.error";
import { InvalidArgumentError } from "@/common/errors/invalid-argument.error";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { ResourceNotFoundError } from "@/common/errors/resource-not-found.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { ValidationErrorsBag } from "@/common/errors/validation-errors-bag.error";
import { BasicExceptionPresenter } from "@/infra/http/exceptions/basic.presenter";
import { ValidationErrorsBagException } from "@/infra/http/exceptions/validation/exception";
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

const internalServerErrorMessage =
  "Nosso servidor está enfrentando dificuldades para " +
  "processar essa solicitação. Tente novamente mais tarde.";

function fromError(error: BaseError | ValidationErrorsBag): never {
  if (error instanceof UnauthorizedError) {
    const { cause } = error;
    throw new UnauthorizedException(BasicExceptionPresenter.present(error), { cause });
  }

  if (error instanceof InvalidArgumentError) {
    throw new BadRequestException({ [error.field]: error.errorMessage }, { cause: error });
  }

  if (error instanceof ValidationErrorsBag) throw new ValidationErrorsBagException(error);

  if (error instanceof IrrecoverableError) {
    console.error(error.message, { cause: error.cause });

    throw new InternalServerErrorException(
      { message: internalServerErrorMessage },
      { cause: error },
    );
  }

  if (error instanceof ResourceNotFoundError) {
    throw new NotFoundException({ message: error.message }, { cause: error });
  }

  if (error instanceof BadRequestError) {
    throw new BadRequestException({ message: error.message });
  }

  console.error("An unexpected error occurred and was not properly handled.", { cause: error });
  const internalError = BasicExceptionPresenter.present({ message: internalServerErrorMessage });
  throw new InternalServerErrorException(internalError);
}

export default {
  fromError,
};
