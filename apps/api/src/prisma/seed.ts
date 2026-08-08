import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo company
  const company = await prisma.company.upsert({
    where: { email: 'demo@propadmin.com' },
    update: {},
    create: {
      name: 'Administradora Demo S.A.',
      email: 'demo@propadmin.com',
      phone: '+598 2900 0000',
      address: '18 de Julio 1234, Ap. 201',
      city: 'Montevideo',
      country: 'UY',
      plan: 'PROFESSIONAL',
    },
  });

  // Create admin user
  const password = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@propadmin.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@propadmin.com',
      password,
      firstName: 'Laura',
      lastName: 'González',
      role: 'COMPANY_ADMIN',
    },
  });

  // Create demo building
  const building = await prisma.building.upsert({
    where: { id: 'bld_demo_001' },
    update: {},
    create: {
      id: 'bld_demo_001',
      companyId: company.id,
      name: 'Edificio Punta Carretas',
      address: 'Ellauri 452',
      city: 'Montevideo',
      department: 'Montevideo',
      totalUnits: 12,
      reserveFund: 50000,
      interestRate: 0.03,
      currency: 'UYU',
    },
  });

  // Create apartments with coefficients that sum to exactly 1.0
  // Floor 1: 0.07+0.07=0.14 | Floor 2+4: 0.08+0.08=0.16 each
  // Floor 3+5: 0.085+0.085=0.17 each | PH: 0.10+0.10=0.20
  // Total: 0.14+0.16+0.17+0.16+0.17+0.20 = 1.00
  const aptData = [
    { number: '101', floor: '1',  coefficient: 0.07  },
    { number: '102', floor: '1',  coefficient: 0.07  },
    { number: '201', floor: '2',  coefficient: 0.08  },
    { number: '202', floor: '2',  coefficient: 0.08  },
    { number: '301', floor: '3',  coefficient: 0.085 },
    { number: '302', floor: '3',  coefficient: 0.085 },
    { number: '401', floor: '4',  coefficient: 0.08  },
    { number: '402', floor: '4',  coefficient: 0.08  },
    { number: '501', floor: '5',  coefficient: 0.085 },
    { number: '502', floor: '5',  coefficient: 0.085 },
    { number: '601', floor: 'PH', coefficient: 0.10  },
    { number: '602', floor: 'PH', coefficient: 0.10  },
  ];

  for (const apt of aptData) {
    await prisma.apartment.upsert({
      where: { buildingId_number: { buildingId: building.id, number: apt.number } },
      update: { coefficient: apt.coefficient },   // corrige coeficientes si ya existen
      create: { ...apt, buildingId: building.id },
    });
  }

  // Create common area
  await prisma.commonArea.upsert({
    where: { id: 'ca_demo_001' },
    update: {},
    create: {
      id: 'ca_demo_001',
      buildingId: building.id,
      name: 'Salón de Fiestas',
      description: 'Salón con capacidad para 80 personas',
      capacity: 80,
      pricePerUse: 1500,
      openTime: '08:00',
      closeTime: '23:00',
      rules: 'Máximo 80 personas. Dejar el salón limpio.',
    },
  });

  console.log('✅ Seed completo');
  console.log(`   Empresa:  ${company.name}`);
  console.log(`   Admin:    admin@propadmin.com / Admin1234!`);
  console.log(`   Edificio: ${building.name} (${aptData.length} apartments)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
