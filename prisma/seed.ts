import { PrismaClient } from '@prisma/client';
import { BRANCHES, SERVICES, STAFF_MEMBERS, STAFF_SCHEDULES, SHOP_CONFIG } from '../src/constants';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Seed Branches
  for (const branch of BRANCHES) {
    await prisma.branch.upsert({
      where: { code: branch.id },
      update: {},
      create: {
        code: branch.id,
        name: branch.name,
        location: branch.location,
        image: branch.image,
        availableServices: JSON.stringify(branch.availableServices),
      },
    });
  }
  console.log('Seeded Branches');

  // Seed Services
  for (const service of SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    
    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          description: service.description,
          duration: service.duration,
          price: service.price,
          image: service.image,
        },
      });
    } else {
      await prisma.service.create({
        data: {
          name: service.name,
          description: service.description,
          duration: service.duration,
          price: service.price,
          image: service.image,
        },
      });
    }
  }
  console.log('Seeded Services');

  // Seed Staff - Commented out because Staff model doesn't exist in schema
  // Use Employee model instead if needed
  // for (const staff of STAFF_MEMBERS) {
  //   await prisma.employee.create({
  //     data: {
  //       fname: staff.name,
  //       // Add other fields as needed
  //     },
  //   });
  // }
  // console.log('Seeded Staff');

  // Seed StaffSchedule
  for (const key in STAFF_SCHEDULES) {
    const schedule = STAFF_SCHEDULES[key];
    await prisma.staffSchedule.upsert({
      where: { staffId: schedule.staffId },
      update: {},
      create: {
        staffId: schedule.staffId,
        offDays: JSON.stringify(schedule.offDays),
        busySlots: JSON.stringify(schedule.busySlots),
      },
    });
  }
  console.log('Seeded StaffSchedule');


  console.log('Seeded ShopConfig');

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
