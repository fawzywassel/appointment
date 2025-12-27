import { PrismaClient } from '@prisma/client';
import { AvailabilityService } from '../src/availability/availability.service';
import { CalendarService } from '../src/calendar/calendar.service';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Availability ---');

    const user = await prisma.user.findUnique({
        where: { email: 'admin@sera.com' },
    });

    if (!user) {
        console.error('User not found');
        return;
    }

    console.log(`User found: ${user.id} (${user.email})`);
    console.log(`User Timezone: ${user.timezone}`);

    // Mock services/dependencies manually since this is a script
    // We can't easily use NestJS dependency injection here without bootstrapping the app
    // So let's check the rules directly first which is the core issue

    const rules = await prisma.availabilityRule.findUnique({
        where: { userId: user.id },
    });

    console.log('Availability Rules:', JSON.stringify(rules, null, 2));

    // Determine a Saturday date (today is Saturday Dec 27)
    const now = new Date(); // This will be UTC in the container
    console.log(`Current Container Time: ${now.toISOString()}`);

    const targetDate = new Date('2025-12-27T14:30:00Z'); // 14:30 UTC
    // If user is UTC, 14:30 is 14:30.
    // If user is +3, 14:30 UTC is 17:30 +3 (Outside 17:00?)

    // Let's test a time that SHOULD be available.
    // Working hours are 09:00 - 17:00.
    // If we want 14:00 User Time.
    // If User Timezone is UTC, that is 14:00 UTC.

    // Note: The service logic was:
    // 1. Get user timezone.
    // 2. Convert input UTC time to user time.
    // 3. Format user time to HH:mm.
    // 4. Compare with 09:00-17:00.

    // Let's simulate what the Service does manually here to see values:

    const { format } = require('date-fns');
    const { toZonedTime } = require('date-fns-tz');

    const timezone = user.timezone || 'UTC';
    // Simulate input: 2025-12-27T11:00:00Z (which is 14:00 in +03:00)
    // But wait, the user's timezone in DB is probably 'UTC' unless updated.

    const testInputTime = new Date('2025-12-27T11:00:00Z');
    console.log(`\nTest Input (UTC): ${testInputTime.toISOString()}`);

    const zonedTime = toZonedTime(testInputTime, timezone);
    console.log(`Zoned Time (${timezone}): ${zonedTime.toString()}`);

    const dayName = format(zonedTime, 'EEEE').toLowerCase();
    console.log(`Day Name: ${dayName}`);

    const timeStr = format(zonedTime, 'HH:mm');
    console.log(`Time String: ${timeStr}`);

    // Check against rules
    const workingHours = rules?.workingHours as any;
    const dayHours = workingHours[dayName] || [];
    console.log(`Working Hours for ${dayName}:`, JSON.stringify(dayHours));

    let allowed = false;
    for (const p of dayHours) {
        if (timeStr >= p.start && timeStr <= p.end) {
            allowed = true;
            break;
        }
    }
    console.log(`Is Allowed? ${allowed}`);

}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
