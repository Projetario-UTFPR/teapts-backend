import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma";

@Module({ providers: [PrismaService] })
export class PrismaModule {}
