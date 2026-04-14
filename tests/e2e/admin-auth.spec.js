import { test, expect } from '@playwright/test';
import { getAdminToken, deleteTestQuiz } from './helpers.js';

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
test.describe('Admin — autenticação', () => {
  test.beforeEach(async ({ context }) => {
    // Garante que começa sem token
    await context.addInitScript(() => localStorage.removeItem('qf_admin_token'));
  });

  test('redireciona para /admin/login quando não autenticado', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('exibe erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/admin/login');

    await page.getByPlaceholder('admin').fill('wrong');
    await page.getByPlaceholder('••••••••').fill('wrong-pass');
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page.getByText(/credenciais inválidas/i)).toBeVisible({ timeout: 3000 });
  });

  test('login com credenciais válidas redireciona para dashboard', async ({ page }) => {
    await page.goto('/admin/login');

    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL('/admin', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('botão mostrar/ocultar senha funciona', async ({ page }) => {
    await page.goto('/admin/login');

    const passInput = page.getByPlaceholder('••••••••');
    await passInput.fill('minhasenha');

    // Campo tipo password por padrão
    await expect(passInput).toHaveAttribute('type', 'password');

    // Clicar no ícone de olho
    await page.locator('button[type="button"]').click();
    await expect(passInput).toHaveAttribute('type', 'text');
  });

  test('logout limpa token e redireciona para login', async ({ page }) => {
    // Login primeiro
    await page.goto('/admin/login');
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL('/admin');

    // Logout
    await page.getByRole('button', { name: /sair/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 3000 });

    // Token removido
    const token = await page.evaluate(() => localStorage.getItem('qf_admin_token'));
    expect(token).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
test.describe('Admin — dashboard', () => {
  test.use({ storageState: undefined });

  test.beforeEach(async ({ page }) => {
    // Login programático
    await page.goto('/admin/login');
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL('/admin');
  });

  test('exibe KPIs no dashboard', async ({ page }) => {
    await expect(page.getByText('Total de quizzes')).toBeVisible();
    await expect(page.getByText('Publicados')).toBeVisible();
    await expect(page.getByText('Respostas totais')).toBeVisible();
  });

  test('navega para Meus Quizzes pelo menu', async ({ page }) => {
    await page.getByRole('link', { name: /meus quizzes/i }).click();
    await expect(page).toHaveURL('/admin/quizzes');
  });
});

// ---------------------------------------------------------------------------
// Criar e publicar quiz
// ---------------------------------------------------------------------------
test.describe('Admin — criar e publicar quiz', () => {
  let createdQuizId;

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL('/admin');
  });

  test.afterAll(async ({ request }) => {
    if (createdQuizId) {
      const token = await getAdminToken(request);
      await deleteTestQuiz(request, token, createdQuizId);
    }
  });

  test('cria um novo quiz com nome e slug', async ({ page }) => {
    await page.goto('/admin/quizzes/new');

    // Nome com timestamp para evitar conflito de slug em re-execuções
    const nameInput = page.locator('input[placeholder="Nome do quiz"]');
    await nameInput.fill(`Quiz E2E ${Date.now()}`);

    // Salvar
    await page.getByRole('button', { name: /salvar/i }).click();

    // Aguarda confirmação de save antes de checar URL (DB remoto pode ser lento)
    await expect(page.getByText('Salvo!')).toBeVisible({ timeout: 12000 });
    // Aguarda React Router processar o navigate() que ocorre no mesmo bloco síncrono
    await page.waitForTimeout(300);
    // Deve ter redirecionado para /:id/edit após criação
    await expect(page).toHaveURL(/\/admin\/quizzes\/.+\/edit/, { timeout: 5000 });

    // Capturar ID para limpeza
    createdQuizId = page.url().match(/quizzes\/([^/]+)\/edit/)?.[1];
  });

  test('adiciona pergunta do tipo texto no builder', async ({ page }) => {
    await page.goto('/admin/quizzes/new');

    const nameInput = page.locator('input[placeholder="Nome do quiz"]');
    await nameInput.fill(`Quiz Pergunta E2E ${Date.now()}`);

    // Adicionar pergunta tipo text
    await page.getByRole('button', { name: /texto curto/i }).click();

    // Expande automaticamente (último item adicionado)
    const titleInput = page.locator('input[placeholder="Título da pergunta"]').last();
    await titleInput.fill('Qual é o seu nome?');

    await page.getByRole('button', { name: /salvar/i }).click();
    await expect(page.getByText('Salvo!')).toBeVisible({ timeout: 5000 });

    createdQuizId = page.url().match(/quizzes\/([^/]+)\/edit/)?.[1];
  });

  test('publica e despublica quiz', async ({ page, request }) => {
    // Criar quiz via API para ter controle
    const token = await getAdminToken(request);
    const slug = `e2e-publish-${Date.now()}`;
    const res = await request.post('http://localhost:3001/api/admin/quizzes', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Quiz Publish Test', slug, config: {} },
    });
    const created = await res.json();
    createdQuizId = created.id;

    await page.goto(`/admin/quizzes/${createdQuizId}/edit`);

    // Status inicial: Rascunho (botão Publicar visível)
    const publishBtn = page.getByRole('button', { name: /publicar/i });
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();

    // Status muda para Publicado (DB remoto pode ser lento)
    await expect(page.getByRole('button', { name: /publicado/i })).toBeVisible({ timeout: 10000 });

    // Clicar novamente → despublica
    await page.getByRole('button', { name: /publicado/i }).click();
    await expect(page.getByRole('button', { name: /publicar/i })).toBeVisible({ timeout: 3000 });
  });

  test('preview ao vivo reflete mudanças do builder', async ({ page }) => {
    await page.goto('/admin/quizzes/new');

    const nameInput = page.locator('input[placeholder="Nome do quiz"]');
    await nameInput.fill('Quiz Preview Test');

    // Adicionar welcome step para o preview ter algo para renderizar
    await page.getByRole('button', { name: /boas.vindas/i }).click();

    // Abrir preview
    await page.getByRole('button', { name: /preview/i }).click();

    // Indicador "PREVIEW AO VIVO" confirma que o painel está aberto
    await expect(page.getByText(/preview ao vivo/i)).toBeVisible();

    // O player renderiza algum botão de navegação (Começar → ou Enviar dependendo se é o único step)
    await expect(page.getByRole('button', { name: /começar|enviar/i })).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
test.describe('Admin — analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL('/admin');
  });

  test('exibe placeholder quando sem dados', async ({ page, request }) => {
    const token = await getAdminToken(request);
    const slug = `e2e-analytics-${Date.now()}`;
    const res = await request.post('http://localhost:3001/api/admin/quizzes', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Analytics Test', slug, config: {} },
    });
    const created = await res.json();

    await page.goto(`/admin/quizzes/${created.id}/analytics`);

    await expect(page.getByText(/sem dados ainda/i)).toBeVisible({ timeout: 5000 });

    // Limpar
    await request.delete(`http://localhost:3001/api/admin/quizzes/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});
