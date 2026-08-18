#!/usr/bin/env node
// Genera propietarios, inquilinos y contratos de alquiler ficticios para cada
// apartamento de una empresa (pensado para poblar la demo de Mike/MG).
// Es reanudable: si un apartamento ya tiene propietario/inquilino/contrato,
// reutiliza lo que exista y solo crea lo que falte.
//
// Uso:
//   node scripts/seed-demo-tenants.mjs "email@empresa.com" "password"
//
// Por default pega contra producción. Para local:
//   API_URL=http://localhost:4000/api/v1 node scripts/seed-demo-tenants.mjs "email" "password"

const API_URL = process.env.API_URL || 'https://propadmin-api.onrender.com/api/v1';

const [, , EMAIL, PASSWORD] = process.argv;
if (!EMAIL || !PASSWORD) {
  console.error('Uso: node scripts/seed-demo-tenants.mjs "email@empresa.com" "password"');
  process.exit(1);
}

const COMMISSION_PCT = 0.105; // 10.5%, la que pidió Mike

const OWNER_NAMES = [
  ['Maria', 'Fernandez'], ['Jorge', 'Suarez'], ['Ana', 'Rodriguez'], ['Carlos', 'Perez'],
  ['Lucia', 'Gonzalez'], ['Pablo', 'Martinez'], ['Valentina', 'Diaz'], ['Diego', 'Sosa'],
  ['Camila', 'Pereira'], ['Federico', 'Silva'], ['Sofia', 'Acosta'], ['Martin', 'Cabrera'],
  ['Julieta', 'Barrios'], ['Nicolas', 'Correa'], ['Agustina', 'Bermudez'], ['Rodrigo', 'Ferreira'],
  ['Victoria', 'Nunez'], ['Santiago', 'Ramos'], ['Florencia', 'Castro'], ['Ignacio', 'Vidal'],
  ['Manuela', 'Gimenez'], ['Bruno', 'Aguirre'], ['Renata', 'Lopez'], ['Emiliano', 'Rojas'],
];

const TENANT_NAMES = [
  ['Juan', 'Alvarez'], ['Lucas', 'Moreira'], ['Guadalupe', 'Techera'], ['Mateo', 'Olivera'],
  ['Delfina', 'Machado'], ['Facundo', 'Bentancor'], ['Catalina', 'Pintos'], ['Tomas', 'Rivero'],
  ['Martina', 'Cardozo'], ['Franco', 'Viera'], ['Antonella', 'DaSilva'], ['Joaquin', 'Mendez'],
  ['Milagros', 'Estevez'], ['Gaston', 'Larrosa'], ['Abril', 'Pastorini'], ['Maximiliano', 'Coitinho'],
  ['Candela', 'Machado'], ['Ramiro', 'Bordoli'], ['Ornella', 'Rocha'], ['Bautista', 'Umpierrez'],
  ['Josefina', 'Deambrosi'], ['Thiago', 'Failache'], ['Alma', 'Cuadrado'], ['Benjamin', 'Cesar'],
];

let seed = 0;
function pick(arr) {
  seed++;
  return arr[seed % arr.length];
}
function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) / 500) * 500;
}
function emailSlug(first, last) {
  return `${first}.${last}`
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // sin acentos
    .replace(/[^a-z0-9.]/g, ''); // sin espacios/símbolos
}

let token;

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data;
}

async function main() {
  console.log(`Login como ${EMAIL}...`);
  const login = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  token = login.accessToken;
  console.log(`OK — empresa: ${login.user.company.name}\n`);

  const buildings = await api('/buildings');
  console.log(`${buildings.length} propiedades encontradas.\n`);

  let ownersCreated = 0, tenantsCreated = 0, contractsCreated = 0, contractsSkipped = 0, errors = 0;

  for (const building of buildings) {
    const apartments = await api(`/apartments/building/${building.id}`);
    if (apartments.length === 0) {
      console.log(`⏭  ${building.name}: sin apartamentos todavía, salteo.`);
      continue;
    }

    for (const apt of apartments) {
      try {
        let owner = (apt.residents || []).find((r) => r.type === 'OWNER');
        let tenant = (apt.residents || []).find((r) => r.type === 'TENANT');

        if (!owner) {
          const [first, last] = pick(OWNER_NAMES);
          owner = await api(`/residents/apartment/${apt.id}`, {
            method: 'POST',
            body: JSON.stringify({
              firstName: first,
              lastName: last,
              type: 'OWNER',
              startDate: new Date('2026-01-01').toISOString(),
              email: `${emailSlug(first, last)}@ejemplo.com`,
            }),
          });
          ownersCreated++;
        }

        if (!tenant) {
          const [first, last] = pick(TENANT_NAMES);
          tenant = await api(`/residents/apartment/${apt.id}`, {
            method: 'POST',
            body: JSON.stringify({
              firstName: first,
              lastName: last,
              type: 'TENANT',
              startDate: new Date('2026-01-01').toISOString(),
              email: `${emailSlug(first, last)}@ejemplo.com`,
            }),
          });
          tenantsCreated++;
        }

        const existingContracts = await api(`/rental-contracts/apartment/${apt.id}`);
        if (existingContracts.some((c) => c.status === 'ACTIVE')) {
          contractsSkipped++;
          console.log(`⏭  ${building.name} / Apto ${apt.number}: ya tiene contrato activo.`);
          continue;
        }

        const bedrooms = apt.bedrooms || 2;
        const rentAmount = randomBetween(12000 + bedrooms * 4000, 18000 + bedrooms * 6000);

        await api(`/rental-contracts/apartment/${apt.id}`, {
          method: 'POST',
          body: JSON.stringify({
            ownerResidentId: owner.id,
            tenantResidentId: tenant.id,
            rentAmount,
            commissionPct: COMMISSION_PCT,
            currency: building.currency || 'UYU',
            startDate: new Date('2026-01-01').toISOString(),
          }),
        });
        contractsCreated++;
        console.log(`✅ ${building.name} / Apto ${apt.number}: ${owner.firstName} ${owner.lastName} (prop.) → ${tenant.firstName} ${tenant.lastName} (inq.) — ${rentAmount} ${building.currency || 'UYU'}/mes`);
      } catch (e) {
        errors++;
        console.log(`⚠️  ${building.name} / Apto ${apt.number}: ${e.message}`);
      }
    }
  }

  console.log(`\n— Resumen —`);
  console.log(`Propietarios creados: ${ownersCreated}`);
  console.log(`Inquilinos creados:   ${tenantsCreated}`);
  console.log(`Contratos creados:    ${contractsCreated}`);
  console.log(`Contratos ya existentes (saltados): ${contractsSkipped}`);
  console.log(`Errores: ${errors}`);
}

main().catch((e) => {
  console.error('❌ Error fatal:', e.message);
  process.exit(1);
});
