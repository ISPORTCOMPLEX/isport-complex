import { PrismaClient } from '@prisma/client';

// Jeden Prisma klient na celú aplikáciu (pri vývoji sa nevytvára nový pri každom uložení súboru).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
