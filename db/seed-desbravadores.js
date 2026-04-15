import postgres from 'postgres';

async function seed() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  console.log('Criando quiz Desbravadores v2...');

  try {
    const [quiz] = await sql`
      INSERT INTO quizzes (slug, name, description, status, config)
      VALUES (
        'desbravadores-v2',
        'Desbravadores — Seleção Fundadores',
        'Formulário de entrada para os 10 membros fundadores da comunidade de builders com agentes de IA.',
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
          successTitle: 'Candidatura enviada!',
          successMessage: 'Analisaremos sua candidatura com cuidado e retornaremos em breve. A porta permanece aberta — o critério é público.',
          showProgressCount: true,
          allowRetake: false,
          evaluationMode: 'desbravadores',
        })}
      )
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            config = EXCLUDED.config
      RETURNING id
    `;

    console.log('✓ Quiz criado:', quiz.id);

    // Remove perguntas antigas para re-criar limpas
    await sql`DELETE FROM questions WHERE quiz_id = ${quiz.id}`;

    const questions = [
      {
        type: 'welcome',
        title: 'Desbravadores',
        description: 'Comunidade de builders de apps com agentes orquestradores de IA.\n\nEste formulário seleciona os primeiros 10 membros fundadores.',
        required: false,
        order_key: 1.0,
        config: { buttonLabel: 'Começar candidatura', key: 'welcome' },
      },
      {
        type: 'choice',
        title: 'Como você se descreveria hoje em relação à IA?',
        required: true,
        order_key: 2.0,
        options: [
          { label: 'Consumo conteúdo sobre IA, ainda não construí nada funcionando', value: 'A' },
          { label: 'Fiz alguns testes e experimentos, mas nunca entreguei nada real', value: 'B' },
          { label: 'Já construí algo — pode ser simples, mas funciona e está rodando', value: 'C' },
          { label: 'Tenho projeto em produção ativo, com usuários ou uso real', value: 'D' },
        ],
        config: { key: 'q1' },
      },
      {
        type: 'longtext',
        title: 'Você tem uma ideia específica do que quer construir com agentes?',
        description: 'Descreve em uma linha: o que o agente faz, para quem, e qual problema resolve.\n\n"Quero aprender IA" = não é uma ideia. "Quero um agente que lê contratos e sinaliza cláusulas de risco para advogados" = é uma ideia.',
        placeholder: 'O agente faz X, para Y, resolvendo o problema Z...',
        required: true,
        order_key: 3.0,
        config: { key: 'q2' },
      },
      {
        type: 'text',
        title: 'Horas por semana dedicadas ao projeto',
        description: 'O que você já investiu nesse projeto (1/3)',
        placeholder: 'Ex: 10h/semana',
        required: false,
        order_key: 4.0,
        config: { key: 'q3_horas' },
      },
      {
        type: 'text',
        title: 'Gasto mensal em APIs, infraestrutura ou ferramentas',
        description: 'O que você já investiu nesse projeto (2/3)',
        placeholder: 'Ex: R$ 150/mês',
        required: false,
        order_key: 5.0,
        config: { key: 'q3_gasto' },
      },
      {
        type: 'longtext',
        title: 'O que você abriu mão para conseguir tempo de construção',
        description: 'O que você já investiu nesse projeto (3/3)',
        placeholder: 'Ex: Reduzi horas de lazer, recusei freelas, acordo mais cedo...',
        required: false,
        order_key: 6.0,
        config: { key: 'q3_abriu' },
      },
      {
        type: 'choice',
        title: 'Você já colocou alguma solução com IA em produção — mesmo que simples?',
        required: true,
        order_key: 7.0,
        options: [
          { label: 'Sim — está rodando hoje com usuários reais ou uso regular', value: 'A' },
          { label: 'Sim — rodou por um tempo, mas parei ou refiz', value: 'B' },
          { label: 'Não — ainda está em desenvolvimento ou teste', value: 'C' },
          { label: 'Não — ainda não cheguei nessa fase', value: 'D' },
        ],
        config: { key: 'q4' },
      },
      {
        type: 'longtext',
        title: 'Se A ou B: O que funcionou diferente do que você esperava quando foi para produção?',
        description: 'Pule esta pergunta se respondeu C ou D acima.',
        placeholder: 'O que aconteceu de inesperado quando foi a público...',
        required: false,
        order_key: 8.0,
        config: { key: 'q4_detail' },
      },
      {
        type: 'choice',
        title: 'Você já descartou uma abordagem com agentes porque era mais trabalho que o ganho?',
        required: true,
        order_key: 9.0,
        options: [
          { label: 'Sim — tenho um caso específico', value: 'A' },
          { label: 'Não — ainda não cheguei nessa situação', value: 'B' },
          { label: 'Não descarto abordagens, persisto até funcionar', value: 'C' },
        ],
        config: { key: 'q5' },
      },
      {
        type: 'longtext',
        title: 'Se A: Qual foi a situação e o que te fez perceber que não valia a pena?',
        description: 'Pule esta pergunta se respondeu B ou C acima.',
        placeholder: 'A situação e o critério que te fez descartar a abordagem...',
        required: false,
        order_key: 10.0,
        config: { key: 'q5_detail' },
      },
      {
        type: 'longtext',
        title: 'Descreva a última vez que algo que você estava construindo quebrou.',
        description: 'O que quebrou, o que você fez, e o que aprendeu. Não precisa ter sido com IA — pode ser qualquer projeto.',
        placeholder: 'O que quebrou: ...\nO que fiz: ...\nO que aprendi: ...',
        required: true,
        order_key: 11.0,
        config: { key: 'q6' },
      },
      {
        type: 'choice',
        title: 'Se a IA orquestradora não existisse, você resolveria esse problema manualmente?',
        required: true,
        order_key: 12.0,
        options: [
          { label: 'Sim — já resolvi ou tentei resolver assim antes', value: 'A' },
          { label: 'Sim — faria mesmo sendo mais lento e trabalhoso', value: 'B' },
          { label: 'Provavelmente não — o problema só existe porque a IA viabilizou', value: 'C' },
          { label: 'Não sei — nunca pensei sobre isso', value: 'D' },
        ],
        config: { key: 'q7' },
      },
      {
        type: 'choice',
        title: 'Quando você aprende algo que funciona bem — o que você faz?',
        required: true,
        order_key: 13.0,
        options: [
          { label: 'Guardo para mim — é minha vantagem competitiva', value: 'A' },
          { label: 'Compartilho se alguém perguntar diretamente', value: 'B' },
          { label: 'Posto espontaneamente — quem puder usar, usa', value: 'C' },
          { label: 'Depende do que é', value: 'D' },
        ],
        config: { key: 'q8' },
      },
      {
        type: 'longtext',
        title: 'O que você estaria construindo nos próximos 3 meses mesmo que essa comunidade não existisse?',
        description: 'Seja específico: o projeto, em que fase está, e qual é o próximo passo concreto.',
        placeholder: 'Projeto: ...\nFase atual: ...\nPróximo passo concreto: ...',
        required: true,
        order_key: 14.0,
        config: { key: 'q9' },
      },
      {
        type: 'multichoice',
        title: 'O que mais te irrita na forma como a maioria das pessoas usa IA hoje?',
        description: 'Marque todas que se aplicam.',
        required: false,
        order_key: 15.0,
        options: [
          { label: 'Conteúdo que mostra só o resultado, nunca o processo real', value: 'processo' },
          { label: 'A obsessão por velocidade sem estrutura — muito output, pouco valor', value: 'velocidade' },
          { label: 'Ninguém mostra o que falhou — só sucesso curado', value: 'falhas' },
          { label: 'Comunidades onde todo mundo fala sobre IA mas ninguém constrói nada', value: 'comunidades' },
          { label: 'A ilusão de produtividade — muita atividade, pouco progresso real', value: 'produtividade' },
          { label: 'Nenhuma dessas — não me incomoda nada específico', value: 'nenhuma' },
        ],
        config: { key: 'q10' },
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
    console.log('Quiz público: http://localhost:5174/desbravadores-v2');
    console.log('Avaliação:    http://localhost:5174/admin → Meus Quizzes → Avaliação');
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
