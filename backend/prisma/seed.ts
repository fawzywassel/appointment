import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');
    const email = 'admin@sera.com';
    const password = 'P@$$w0rd';

    // Check if admin user already exists
    console.log(`Checking for existing user: ${email}`);
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log(`User with email ${email} already exists`);
        return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const user = await prisma.user.create({
        data: {
            email,
            name: 'Admin User',
            password: hashedPassword,
            role: UserRole.ADMIN,
            timezone: 'UTC',
        },
    });

    console.log(`Created admin user with id: ${user.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
