import {
  ArgumentMetadata,
  Inject,
  Injectable,
  Paramtype,
  PipeTransform,
  Scope,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { either } from "fp-ts";
import coreValidation from ".";
import { type HttpRequest } from "@/infra/http";
import { DTO } from "@/infra/http/dto";
import { ValidationErrorsBagException } from "@/infra/http/exceptions/validation/exception";
import { REQUEST } from "@nestjs/core";
import { BadRequestError } from "@/common/errors/bad-request.error";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";

/**
 * Validates the body parameter (decorated with `@Body()`).
 * The body value must be an instance of some class which implements the `DTO` interface.
 */
@Injectable({ scope: Scope.REQUEST })
export class ValidationPipe implements PipeTransform {
  public constructor(@Inject(REQUEST) readonly request: HttpRequest) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const workableTypes: Paramtype[] = ["body", "query", "param"];

    if (!workableTypes.includes(metadata.type)) return value;

    if (!metadata.metatype)
      throw new TypeError(
        "The body value needs to have an explicit type. Ensure it has a proper " +
          "type and that it is a concrete class instead of a type or interface.",
      );

    const isDtoCompliant =
      "validate" in metadata.metatype.prototype &&
      typeof metadata.metatype.prototype.validate === "function";

    if (!isDtoCompliant) return value;

    // `isDtoCompliant` is not actually important here, but it enforces that this boolean is only
    // meaningful after we prooved value is DTO compliant
    const isDtoButItsNull = isDtoCompliant && (typeof value === "undefined" || value === null);

    if (isDtoButItsNull) {
      const message =
        "O corpo da requisição recebido é inválido. Esperava um objeto JSON, mas nenhum corpo foi recebido.";
      exceptionsFactory.fromError(new BadRequestError({ message }));
    }

    const valueAsInstanceOfADto: DTO = plainToInstance(metadata.metatype, value, {
      excludeExtraneousValues: true,
      strategy: "excludeAll",
    });

    const isValid = valueAsInstanceOfADto.validate();
    if (either.isRight(isValid)) return valueAsInstanceOfADto;

    const validationErrors = isValid.left;
    const config = coreValidation.getConfigsFromRequest(this.request);

    throw new ValidationErrorsBagException(validationErrors, config.status);
  }
}
