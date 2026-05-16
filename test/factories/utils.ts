import type { UUID } from "@/common/uuid";
import accountsMapper from "@/infra/prisma/mappers/accounts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import accountsFactory from "@test/factories/accounts.factory";
// Used for the docstrings; removed during build since it's type import
// oxlint-disable-next-line no-unused-vars
import { type PrismaClientKnownRequestError } from "@prisma-gen/internal/prismaNamespace";

/**
 * Decides whether to create a new `Account` instance for the callee
 * or to fetch the account by the given `accountId`.
 *
 * @note must be used by test factories only.
 *
 * @throws a {@link PrismaClientKnownRequestError `PrismaClientKnownRequestError`} when there
 * is no persisted account with ID `accountId`.
 */
export async function resolveAccount(prismaService: PrismaService, accountId?: UUID) {
  if (!accountId) return await accountsFactory.createAndPersist(prismaService);

  const accountRow = await prismaService.account.findFirstOrThrow({
    where: { id: accountId.toString() },
    include: { professionalProfiles: true },
  });

  return accountsMapper.fromPrisma(accountRow);
}
