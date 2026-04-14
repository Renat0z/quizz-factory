import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,

  // Dados isolados: cada teste usa um slug único gerado no beforeEach
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Seletores estáveis: preferir data-testid, role, label
    testIdAttribute: 'data-testid',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usa o Chrome instalado no sistema (evita download do browser headless)
        channel: 'chrome',
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
      },
    },
  ],

  // Inicia o servidor de dev automaticamente antes dos testes E2E
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/report', open: 'never' }],
  ],
});
