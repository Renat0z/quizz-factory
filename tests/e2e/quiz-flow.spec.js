import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  createTestQuiz,
  addQuestion,
  publishQuiz,
  deleteTestQuiz,
} from './helpers.js';

/**
 * E2E — Jornada completa do respondente
 *
 * Estratégia: cada test cria seu próprio quiz isolado via API,
 * garante que dados de um teste não afetam outro.
 */

let token;
let quiz;

test.beforeAll(async ({ request }) => {
  token = await getAdminToken(request);

  // Criar quiz com perguntas de múltiplos tipos
  quiz = await createTestQuiz(request, token);

  await addQuestion(request, token, quiz.id, {
    type: 'welcome',
    title: 'Bem-vindo ao quiz de teste!',
    description: 'Este quiz foi criado pelos testes E2E.',
    required: false,
    order_key: 1.0,
  });

  await addQuestion(request, token, quiz.id, {
    type: 'text',
    title: 'Qual é o seu nome?',
    placeholder: 'Seu nome completo',
    required: true,
    order_key: 2.0,
  });

  await addQuestion(request, token, quiz.id, {
    type: 'choice',
    title: 'Qual sua opção favorita?',
    required: true,
    order_key: 3.0,
    options: [
      { label: 'Opção Alpha', value: 'alpha' },
      { label: 'Opção Beta',  value: 'beta' },
    ],
  });

  await addQuestion(request, token, quiz.id, {
    type: 'rating',
    title: 'Como você nos avalia?',
    required: true,
    order_key: 4.0,
    config: { min: 1, max: 5, labels: { min: 'Ruim', max: 'Ótimo' } },
  });

  await publishQuiz(request, token, quiz.id);
});

test.afterAll(async ({ request }) => {
  if (quiz?.id) await deleteTestQuiz(request, token, quiz.id);
});

test.beforeEach(async ({ page, context }) => {
  // Limpa localStorage navegando para a origem correta (about:blank não tem acesso a localStorage)
  // Não usar context.addInitScript pois rodaria em TODA navegação incluindo reload, quebrando retomada de sessão
  await context.clearCookies();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

// ---------------------------------------------------------------------------
// Jornada feliz
// ---------------------------------------------------------------------------
test('jornada completa — preencher e enviar quiz', async ({ page }) => {
  await page.goto(`/${quiz.slug}`);

  // Step 0: Welcome
  await expect(page.getByText('Bem-vindo ao quiz de teste!')).toBeVisible();
  await expect(page.getByText('Este quiz foi criado pelos testes E2E.').first()).toBeVisible();
  await page.getByRole('button', { name: /começar/i }).click();

  // Step 1: Text
  await expect(page.getByText('Qual é o seu nome?')).toBeVisible();
  const nameInput = page.getByRole('textbox');
  await nameInput.fill('Usuário Teste E2E');
  await page.getByRole('button', { name: /próximo/i }).click();

  // Step 2: Choice
  await expect(page.getByText('Qual sua opção favorita?')).toBeVisible();
  await page.getByRole('button', { name: 'Opção Alpha' }).click();
  // Choice auto-avança após 400ms
  await page.waitForTimeout(500);

  // Step 3: Rating
  await expect(page.getByText('Como você nos avalia?')).toBeVisible();
  await expect(page.getByText('Ruim')).toBeVisible();
  await expect(page.getByText('Ótimo')).toBeVisible();
  await page.getByRole('button', { name: '4' }).click();
  await page.waitForTimeout(500);

  // Tela de sucesso (último step com rating auto-avança)
  // Se não auto-avançou, clicar em Enviar
  const enviarBtn = page.getByRole('button', { name: /enviar/i });
  if (await enviarBtn.isVisible()) await enviarBtn.click();

  await expect(page.getByText('Obrigado!')).toBeVisible({ timeout: 12000 });
  await expect(page.getByText('Resposta registrada.')).toBeVisible({ timeout: 5000 });
});

test('barra de progresso avança a cada step', async ({ page }) => {
  await page.goto(`/${quiz.slug}`);

  // Progress bar está no DOM como elemento com style width
  const getProgress = () =>
    page.locator('[style*="width"]').first().evaluate(el => el.style.width);

  const initial = await getProgress();

  await page.getByRole('button', { name: /começar/i }).click();
  await page.waitForTimeout(100);

  const after = await getProgress();
  // Width em % deve ter aumentado (valor maior como string "X%")
  expect(parseFloat(after)).toBeGreaterThan(parseFloat(initial));
});

test('botão Voltar navega para step anterior', async ({ page }) => {
  await page.goto(`/${quiz.slug}`);

  // Avança para step 1
  await page.getByRole('button', { name: /começar/i }).click();
  await expect(page.getByText('Qual é o seu nome?')).toBeVisible();

  // Volta para step 0
  await page.getByRole('button', { name: /voltar/i }).click();
  await expect(page.getByText('Bem-vindo ao quiz de teste!')).toBeVisible();
});

test('botão Próximo desabilitado sem resposta obrigatória', async ({ page }) => {
  await page.goto(`/${quiz.slug}`);

  // Avança para text (required)
  await page.getByRole('button', { name: /começar/i }).click();
  await expect(page.getByText('Qual é o seu nome?')).toBeVisible();

  const nextBtn = page.getByRole('button', { name: /próximo/i });
  await expect(nextBtn).toBeDisabled();
});

test('botão Próximo habilita após preencher campo obrigatório', async ({ page }) => {
  await page.goto(`/${quiz.slug}`);

  await page.getByRole('button', { name: /começar/i }).click();
  const input = page.getByRole('textbox');
  await input.fill('Teste');

  const nextBtn = page.getByRole('button', { name: /próximo/i });
  await expect(nextBtn).not.toBeDisabled();
});

// ---------------------------------------------------------------------------
// Error states
// ---------------------------------------------------------------------------
test('exibe 404 para slug inexistente', async ({ page }) => {
  await page.goto('/slug-que-nao-existe-xyz');

  await expect(page.getByText(/quiz não encontrado/i)).toBeVisible();
  await expect(page.getByText(/slug-que-nao-existe-xyz/)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Retomada de sessão
// ---------------------------------------------------------------------------
test('retoma sessão ao recarregar a página', async ({ page, context }) => {
  await page.goto(`/${quiz.slug}`);

  // Avança e preenche campo
  await page.getByRole('button', { name: /começar/i }).click();
  await page.getByRole('textbox').fill('João Persistente');

  // Verifica que sessionId foi salvo no localStorage
  const sessionId = await page.evaluate(
    (slug) => localStorage.getItem(`qf_session_${slug}`),
    quiz.slug
  );
  expect(sessionId).toBeTruthy();

  // Aguarda o evento step_viewed do step 1 chegar ao servidor antes de recarregar
  await page.waitForTimeout(500);

  // Recarrega a página
  await page.reload();

  // Deve retomar no step 1 com a resposta preservada
  await expect(page.getByText('Qual é o seu nome?')).toBeVisible({ timeout: 5000 });
});
