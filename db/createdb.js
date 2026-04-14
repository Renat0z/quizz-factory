import postgres from 'postgres';

async function createDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL não definida no .env');
    process.exit(1);
  }

  // Extrai nome do banco da URL: postgresql://user:pass@host:port/dbname
  const match = url.match(/\/([^/?]+)(\?|$)/);
  if (!match) {
    console.error('Não foi possível extrair o nome do banco de DATABASE_URL');
    process.exit(1);
  }
  const dbName = match[1];

  // Conecta ao banco padrão 'postgres' para poder criar o novo banco
  const adminUrl = url.replace(`/${dbName}`, '/postgres');

  console.log(`Conectando ao servidor PostgreSQL...`);
  console.log(`Banco a criar: ${dbName}`);

  const sql = postgres(adminUrl, { max: 1 });

  try {
    // Verifica se o banco já existe
    const [row] = await sql`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}
    `;

    if (row) {
      console.log(`✓ Banco "${dbName}" já existe — nada a fazer.`);
    } else {
      // CREATE DATABASE não aceita parâmetros prepared, precisa de unsafe
      await sql.unsafe(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Banco "${dbName}" criado com sucesso!`);
    }

    console.log('');
    console.log('Próximo passo:');
    console.log('  npm run db:migrate');

  } catch (err) {
    console.error('Erro ao criar banco:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createDatabase();
