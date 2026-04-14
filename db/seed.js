import postgres from 'postgres';
import bcrypt from 'bcryptjs';

async function seed() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  console.log('Iniciando seed...');

  try {
    // Admin user
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASS || 'admin123', 12);
    await sql`
      INSERT INTO admin_users (username, password_hash)
      VALUES (${process.env.ADMIN_USER || 'admin'}, ${passwordHash})
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `;
    console.log('✓ Admin user criado:', process.env.ADMIN_USER || 'admin');

    // Quiz de exemplo
    const [quiz] = await sql`
      INSERT INTO quizzes (slug, name, description, status, config)
      VALUES (
        'pesquisa-exemplo',
        'Pesquisa de Satisfação',
        'Quiz de exemplo para demonstrar as funcionalidades da plataforma.',
        'published',
        ${JSON.stringify({
          theme: {
            primary: '#6C5CE7',
            bg: '#0f0f0f',
            surface: '#1a1a1a',
            border: '#2a2a2a',
            text: '#ffffff',
            muted: '#888888',
          },
          successTitle: 'Obrigado!',
          successMessage: 'Suas respostas foram registradas com sucesso.',
          showProgressCount: true,
          allowRetake: false,
        })}
      )
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;

    console.log('✓ Quiz criado:', quiz.id);

    // Perguntas de exemplo
    const questions = [
      {
        type: 'welcome',
        title: 'Bem-vindo à Pesquisa!',
        description: 'Esta é uma pesquisa de satisfação de exemplo. Leva menos de 2 minutos.',
        required: false,
        order_key: 1.0,
        config: { buttonLabel: 'Começar' },
      },
      {
        type: 'text',
        title: 'Qual é o seu nome?',
        description: 'Como você gostaria de ser chamado?',
        placeholder: 'Seu nome completo',
        required: true,
        order_key: 2.0,
      },
      {
        type: 'choice',
        title: 'Como você nos conheceu?',
        description: 'Selecione a opção que melhor descreve.',
        required: true,
        order_key: 3.0,
        options: [
          { label: 'Redes sociais', value: 'redes_sociais' },
          { label: 'Indicação de amigo', value: 'indicacao' },
          { label: 'Pesquisa no Google', value: 'google' },
          { label: 'Outro', value: 'outro' },
        ],
      },
      {
        type: 'rating',
        title: 'Como você avalia nossa plataforma?',
        description: 'De 1 a 5, sendo 5 excelente.',
        required: true,
        order_key: 4.0,
        config: { min: 1, max: 5, labels: { min: 'Péssimo', max: 'Excelente' } },
      },
      {
        type: 'multichoice',
        title: 'Quais funcionalidades você mais usa?',
        description: 'Selecione todas que se aplicam.',
        required: false,
        order_key: 5.0,
        options: [
          { label: 'Criação de quiz', value: 'criar' },
          { label: 'Analytics', value: 'analytics' },
          { label: 'Exportação CSV', value: 'exportar' },
          { label: 'Personalização visual', value: 'design' },
        ],
      },
      {
        type: 'longtext',
        title: 'Alguma sugestão de melhoria?',
        description: 'Sua opinião é muito importante para nós.',
        placeholder: 'Descreva aqui suas sugestões...',
        required: false,
        order_key: 6.0,
      },
    ];

    for (const q of questions) {
      await sql`
        INSERT INTO questions (quiz_id, type, title, description, placeholder, required, order_key, options, config)
        VALUES (
          ${quiz.id},
          ${q.type},
          ${q.title},
          ${q.description || null},
          ${q.placeholder || null},
          ${q.required},
          ${q.order_key},
          ${q.options ? JSON.stringify(q.options) : null},
          ${JSON.stringify(q.config || {})}
        )
      `;
    }

    console.log(`✓ ${questions.length} perguntas criadas`);
    console.log('');
    console.log('Seed concluído!');
    console.log('');
    console.log('Acesse:');
    console.log('  Quiz público: http://localhost:5174/pesquisa-exemplo');
    console.log('  Admin:        http://localhost:5174/admin');
    console.log('  Login:        admin / admin123');

  } catch (err) {
    console.error('Erro no seed:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
