import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting system write test...');

  try {
    // 1. Get or Create Dependencies
    console.log('Checking dependencies...');

    let branch = await prisma.branch.findFirst();
    if (!branch) {
      console.log('Creating dummy branch...');
      branch = await prisma.branch.create({
        data: {
          name: 'Test Branch',
          location: 'Test Location',
          image: '/test-branch.jpg',
          availableServices: '[]',
        },
      });
    }

    let service = await prisma.service.findFirst();
    if (!service) {
      console.log('Creating dummy service...');
      service = await prisma.service.create({
        data: {
          name: 'Test Service',
          description: 'Test Description',
          duration: 60,
          price: 100,
          image: '/test-service.jpg',
        },
      });
    }

    let staff = await prisma.staff.findFirst();
    if (!staff) {
      console.log('Creating dummy staff...');
      staff = await prisma.staff.create({
        data: {
          name: 'Test Staff',
          role: 'Therapist',
          image: '/test-staff.jpg',
          specialty: '[]',
        },
      });
    }

    // 2. Create Booking
    console.log('Creating booking...');
    const booking = await prisma.booking.create({
      data: {
        branchId: branch.id,
        serviceId: service.id,
        staffId: staff.id,
        date: new Date(),
        time: '10:00',
        customerName: 'System Test User',
        customerPhone: '0000000000',
        status: 'confirmed',
      },
    });

    console.log('Booking created successfully:', booking.id);

    // 3. Verify Booking
    const savedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });

    if (!savedBooking) {
      throw new Error('Booking was created but could not be found!');
    }

    console.log('Booking verification successful.');
    
    // Optional: Cleanup
    // await prisma.booking.delete({ where: { id: booking.id } });

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
