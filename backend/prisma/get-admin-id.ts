import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@sera.com' },
    });
    console.log(`Admin ID: ${user?.id}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
