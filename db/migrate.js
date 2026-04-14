import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  console.log('Conectando ao PostgreSQL...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@'));

  try {
    const schema = readFileSync(join(__dir, 'schema.sql'), 'utf-8');

    console.log('Executando migrations...');
    await sql.unsafe(schema);

    console.log('✓ Schema criado/atualizado com sucesso');
    console.log('');
    console.log('Tabelas criadas:');
    const tables = await sql`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    tables.forEach(t => console.log('  -', t.tablename));

  } catch (err) {
    console.error('Erro na migration:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
