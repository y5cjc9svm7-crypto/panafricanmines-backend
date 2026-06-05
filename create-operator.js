// Create or update a back-office operator.
// Usage: node scripts/create-operator.js <email> <password> [name] [role]
import bcrypt from 'bcryptjs';
import { pool, query } from '../src/db/pool.js';
import { uuid } from '../src/lib/ids.js';

async function main() {
  const [, , email, password, name = 'Operator', role = 'operator'] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/create-operator.js <email> <password> [name] [role]');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO operators (id, email, password_hash, name, role)
       VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role, active = TRUE`,
    [uuid(), email.toLowerCase(), hash, name, role]
  );
  console.log(`Operator ready: ${email} (${role})`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
