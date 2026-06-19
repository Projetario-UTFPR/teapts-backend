import { generateUUID, UUID } from "@/common/uuid";
import { PrismaService } from "@/infra/prisma/prisma";
import { Document } from "@/modules/patient/aggregates/document.aggregate";
import { faker } from "@faker-js/faker";

type CreateParams = {
    id: UUID;
    patientId: UUID;
    title: string;
    description?: string;
    documentFileKey: string;
    createdAt: Date;
    lastUpdatedAt?: Date;
};

async function create({
    id = generateUUID(),
    patientId = generateUUID(),
    title = faker.lorem.words(3),
    description = faker.lorem.words(10),
    documentFileKey = faker.lorem.words(10),
    createdAt = new Date(),
    lastUpdatedAt = new Date(),
}: Partial<CreateParams> = {}) {

    return Document.createUnchecked({
        id,
        patientId,
        title,
        description,
        documentFileKey,
        createdAt,
        lastUpdatedAt
    });
}

async function createAndPersist(prismaService: PrismaService, params?: Partial<CreateParams>) {
    const document = await create(params);

    await prismaService.document.create({
        data: {
            id: document.getId().toString(),
            patientAccountId: document.getPatientId().toString(),
            title: document.getTitle(),
            description: document.getDescription(),
            documentFileKey: document.getDocumentFileKey(),
            createdAt: document.getCreatedAt(),
            lastUpdatedAt: document.getLastUpdatedAt(),
        },
    });

    return document;
}

export default { create, createAndPersist };