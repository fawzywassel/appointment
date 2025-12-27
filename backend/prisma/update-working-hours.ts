import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@sera.com';
    console.log(`Updating working hours for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error('User not found');
        process.exit(1);
    }

    let rules = await prisma.availabilityRule.findUnique({
        where: { userId: user.id },
    });

    if (!rules) {
        console.log('Availability rules not found, creating defaults...');
        const defaultWorkingHours = {
            monday: [{ start: '09:00', end: '17:00' }],
            tuesday: [{ start: '09:00', end: '17:00' }],
            wednesday: [{ start: '09:00', end: '17:00' }],
            thursday: [{ start: '09:00', end: '17:00' }],
            friday: [{ start: '09:00', end: '17:00' }],
            saturday: [],
            sunday: [],
        };

        rules = await prisma.availabilityRule.create({
            data: {
                userId: user.id,
                bufferMinutes: 15,
                workingHours: defaultWorkingHours,
            },
        });
    }

    const workingHours = rules.workingHours as any;

    // Add Saturday working hours
    workingHours.saturday = [{ start: '09:00', end: '17:00' }];

    await prisma.availabilityRule.update({
        where: { userId: user.id },
        data: { workingHours },
    });

    console.log('Updated working hours: Added Saturday 09:00-17:00');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
