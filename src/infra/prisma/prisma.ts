import datastoreConfig from "@/configs/datastore.config";
import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import { PrismaClient } from "@prisma-gen/client";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public constructor(@Inject(datastoreConfig.KEY) config: ConfigType<typeof datastoreConfig>) {
    const connectionString = config.DATABASE_URL;
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
