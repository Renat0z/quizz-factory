# PRD — Quiz Factory
**Versão:** 1.0  
**Data:** Abril 2026  
**Status:** Em desenvolvimento

---

## Visão do produto

Plataforma para criar, publicar e analisar quizzes/formulários multi-step com UX premium (typeform-style), analytics profundo de funil e painel de administração completo. Substituição de Google Forms para contextos que exigem branding, dados comportamentais e análise de abandono.

---

## Personas

### P1 — João, o Criador de Quiz
**Perfil:** Coordenador de voluntários, gestor de RH, professor, líder de equipe.  
**Objetivo:** Coletar informações estruturadas da sua equipe/alunos/voluntários.  
**Contexto atual:** Usa Google Forms ou papel. Não tem visibilidade de onde as pessoas desistem.

**Dores:**
- Google Forms tem visual genérico, parece impessoal
- Não sabe quais perguntas são confusas ou demoradas
- Não consegue personalizar o fluxo com lógica condicional
- Editar o formulário depois de receber respostas gera perda de histórico
- Compartilha por link, mas não sabe quantas pessoas chegaram vs responderam

**Barreiras ao adotar uma nova ferramenta:**
- Curva de aprendizado elevada frustra na primeira sessão
- Medo de perder dados ao migrar
- Ferramentas pagas são barreira inicial

---

### P2 — Ana, a Respondente
**Perfil:** Voluntária, funcionária, aluna. Responde no celular, geralmente em contexto de baixa atenção.  
**Objetivo:** Completar o formulário rápido e sem fricção.

**Dores:**
- Ver todas as perguntas de uma vez desanima ("isso é enorme")
- Não saber quantas perguntas faltam gera ansiedade
- Formulários sem feedback parecem bugs ("enviou mesmo?")
- Celular: botões pequenos, teclado virtual cobre o conteúdo
- Interrompida no meio — quer retomar, mas o formulário reinicia

**Barreiras:**
- Desconfiança em fornecer dados pessoais em sites desconhecidos
- Lentidão de carregamento em conexão 3G
- Formulários que não funcionam offline (sem feedback de erro claro)

---

### P3 — Marcos, o Analista
**Perfil:** Líder, tomador de decisão que precisa entender padrões nas respostas.  
**Objetivo:** Extrair insights acionáveis dos dados coletados.

**Dores:**
- CSV bruto é difícil de interpretar sem ferramentas
- Não sabe em qual pergunta as pessoas desistem
- Não consegue cruzar respostas ("quem escolheu X também escolheu Y?")
- Não vê tendências ao longo do tempo

**Barreiras:**
- Dashboards complexos têm curva de aprendizado
- Precisa dos dados em formatos compatíveis com Excel/BI
- Não tem tempo para análises longas — precisa de resumo executivo visível imediatamente

---

## Histórias de usuário

### Módulo: Criação de Quiz

**QC-001 — Criar quiz**
> Como João, quero criar um quiz com nome, descrição e URL amigável (slug), para organizar múltiplos quizzes separadamente.

*Critérios de aceite:*
- Slug é gerado automaticamente a partir do nome (slugify)
- Slug pode ser editado manualmente
- Sistema valida unicidade do slug antes de salvar
- Quiz criado com status `draft` (não visível publicamente)

*Desafios/barreiras:*
- João pode não entender o conceito de "slug" → tooltip explicativo + preview da URL em tempo real
- Slug com caracteres especiais em português → sanitização automática

---

**QC-002 — Adicionar perguntas**
> Como João, quero adicionar perguntas de diferentes tipos, para capturar informações variadas.

*Tipos suportados:*
| Tipo | Descrição |
|------|-----------|
| `welcome` | Tela de boas-vindas com logo e texto livre |
| `text` | Campo de texto curto (1 linha) |
| `longtext` | Campo de texto longo (textarea) |
| `choice` | Escolha única (radio) |
| `multichoice` | Múltipla escolha (checkbox) |
| `date` | Seletor de data (dia/mês/ano) |
| `rating` | Escala numérica (1–5 ou 1–10) |

*Critérios de aceite:*
- Painel lateral com seleção de tipo, título, descrição, placeholder
- Preview ao vivo da pergunta no lado direito
- Campo obrigatório/opcional por pergunta
- Opções editáveis inline para `choice`/`multichoice`

*Desafios/barreiras:*
- João não sabe o que "tipo" significa → ícone visual + exemplo por tipo
- Adicionar 10+ opções para choice é tedioso → "adicionar opção em massa" (uma por linha)
- Configurar opções em ordem específica → drag-and-drop nas opções também

---

**QC-003 — Reordenar perguntas**
> Como João, quero reordenar perguntas arrastando, para iterar no fluxo sem deletar e recriar.

*Critérios de aceite:*
- Drag handle visível em cada pergunta na lista
- Animação suave ao arrastar
- Ordem salva automaticamente (sem botão "salvar")
- Funciona em toque (mobile admin)

*Desafios/barreiras:*
- Drag-and-drop em touch é notoriamente difícil → usar @dnd-kit que tem suporte a touch
- Usuário pode mover sem querer → undo (Ctrl+Z) ou confirmação visual

---

**QC-004 — Configurar design do quiz**
> Como João, quero personalizar cores, fonte, logo e mensagem de sucesso, para o quiz combinar com minha identidade visual.

*Critérios de aceite:*
- Seleção de tema (preset) com paletas pré-definidas
- Cor primária customizável via color picker
- Upload de logo (base64 ou URL)
- Mensagem de sucesso personalizada com variável `{nome}` (capturada de campo texto)
- Preview ao vivo reflete mudanças em tempo real via CSS variables

*Desafios/barreiras:*
- Color picker confunde não-técnicos → oferecer 8 cores pré-aprovadas como atalho
- Contraste texto/fundo pode ficar ilegível → validação WCAG AA automática com aviso
- Upload de imagem grande → comprimir no frontend antes de enviar

---

**QC-005 — Preview antes de publicar**
> Como João, quero visualizar o quiz exatamente como o respondente vê, antes de publicar.

*Critérios de aceite:*
- Botão "Preview" abre o quiz em modal ou nova aba com flag `?preview=true`
- Modo preview não salva respostas no banco
- Preview mostra viewport mobile (375px) por padrão com opção desktop

*Desafios/barreiras:*
- João pode confundir preview com versão publicada → banner "MODO PREVIEW" fixo no topo
- Alterações não salvas não aparecem no preview → auto-save antes de abrir preview

---

**QC-006 — Publicar e despublicar**
> Como João, quero controlar quando o quiz fica acessível publicamente.

*Critérios de aceite:*
- Status `draft` → `published` com um clique
- Status `published` → `draft` (despublicar) possível a qualquer momento
- Quiz despublicado retorna 404 para o respondente
- Data de publicação e última edição exibidas no painel

---

**QC-007 — Lógica condicional (branching)**
> Como João, quero que certas perguntas apareçam apenas se a resposta anterior atender a uma condição, para tornar o quiz mais relevante.

*Critérios de aceite:*
- Regra: "Se resposta à pergunta X for Y, pular para pergunta Z"
- Múltiplas regras por pergunta
- Preview mostra os diferentes caminhos
- Respostas de perguntas "puladas" não são salvas

*Desafios/barreiras:*
- Lógica visual complexa pode confundir → interface de regras tipo "Se [pergunta] [operador] [valor] → ir para [pergunta]"
- Loops infinitos de branching → validação no builder

---

### Módulo: Resposta ao Quiz

**QR-001 — Responder passo a passo**
> Como Ana, quero ver uma pergunta por vez com barra de progresso, para não me sentir sobrecarregada.

*Critérios de aceite:*
- Uma pergunta por tela
- Barra de progresso topo mostrando % concluído
- Contador "Etapa X de Y" (opcional, configurável pelo criador)
- Animação de entrada por slide (esquerda → direita, direita → esquerda no voltar)

*Desafios/barreiras:*
- "1 de 20" pode desanimar → opção de mostrar só % sem total
- Barra de progresso sem movimento em perguntas longas → micro-animação pulsante

---

**QR-002 — Retomar sessão interrompida**
> Como Ana, quero poder fechar o browser e continuar onde parei, para não perder meu progresso.

*Critérios de aceite:*
- `sessionId` salvo em `localStorage` com chave `qf_session_[quizSlug]`
- Ao reabrir, busca session no servidor e retoma no último step respondido
- Aviso ao tentar fechar browser com quiz em andamento (`beforeunload`)
- Sessões sem atividade por 7 dias são consideradas abandonadas

*Desafios/barreiras:*
- `localStorage` pode ser limpo → fallback: tentar recuperar por email/nome se disponíveis
- Usuário pode querer começar do zero → botão "Recomeçar"

---

**QR-003 — Experiência mobile fluida**
> Como Ana, quero preencher o quiz no celular sem zoom ou problemas de teclado.

*Critérios de aceite:*
- Targets de toque ≥ 44px × 44px
- Navegação (Próximo/Voltar) fixada no bottom, acima do teclado virtual
- `font-size` de inputs ≥ 16px (previne zoom automático no iOS)
- Sem scroll horizontal
- Funciona em conexão 3G (bundle < 200KB gzipped)

---

**QR-004 — Feedback de envio**
> Como Ana, quero uma confirmação clara de que minha resposta foi recebida, para não reenviar por insegurança.

*Critérios de aceite:*
- Tela de sucesso com animação após submit
- Mensagem personalizada configurável pelo criador
- Se campo `nome` existir, usar na mensagem ("Obrigado, {nome}!")
- Botão para voltar à lista ou para URL customizada

---

### Módulo: Analytics

**AN-001 — Funil de abandono**
> Como Marcos, quero ver quantas pessoas chegaram em cada etapa e quantas responderam, para identificar gargalos.

*Critérios de aceite:*
- Gráfico de funil vertical: cada step = uma barra
- Dois valores por step: `chegaram` (step_viewed) e `responderam` (step_answered)
- Taxa de abandono em % por step
- Destaque visual nos steps com taxa de abandono > 30%
- Filtro por período (7d, 30d, todos)

*Desafios/barreiras:*
- < 10 sessões → exibir aviso "dados insuficientes" em vez de funil enganoso
- Tempo idle distorce `time_spent_ms` → excluir tempo com tab em background

---

**AN-002 — Distribuição de respostas por pergunta**
> Como Marcos, quero ver o ranking de opções escolhidas, para entender preferências e padrões.

*Critérios de aceite:*
- Choice/multichoice: gráfico de barras horizontais com %
- Rating: histograma + média
- Text/longtext: lista das 10 respostas mais recentes + contagem total
- Clique em uma barra filtra as respostas exibidas

---

**AN-003 — Tempo médio por pergunta**
> Como Marcos, quero ver quanto tempo as pessoas levam em cada pergunta, para identificar perguntas confusas.

*Critérios de aceite:*
- Heatmap de tempo: cor mais quente = mais tempo
- Médias em segundos por pergunta
- Comparativo: perguntas > 2x a média marcadas como "atenção"
- Exclui automaticamente tempo com tab em background

---

**AN-004 — Métricas globais do quiz**
> Como Marcos, quero ver KPIs do quiz de uma olhada, para avaliar saúde geral.

*KPIs:*
- Total de sessões iniciadas
- Taxa de conclusão (%)
- Tempo médio de conclusão
- Sessões por dia (sparkline)
- Tela de abandono mais comum

---

**AN-005 — Exportar respostas**
> Como Marcos, quero baixar as respostas em CSV, para analisar no Excel ou BI.

*Critérios de aceite:*
- Colunas: session_id, submitted_at, [título de cada pergunta]
- Encoding UTF-8 com BOM (para Excel reconhecer acentos)
- Filtro por período antes do download
- Nome do arquivo: `[quiz-slug]-respostas-[data].csv`

---

## Requisitos não-funcionais

### Performance
| Métrica | Meta |
|---------|------|
| Carregamento do quiz | < 500ms |
| Transição entre steps | < 100ms (60fps) |
| Salvamento de answer | < 200ms (fire-and-forget) |
| Build Vite (gzip) | < 200KB |

### Segurança
- JWT com expiração de 24h para admin
- Senhas hasheadas com bcrypt (12 rounds)
- IP armazenado como hash SHA-256 (LGPD)
- Rate limiting: 10 submits/IP/quiz/hora
- Soft delete apenas (nunca destruir dados)
- CORS configurado explicitamente

### Escalabilidade
- PostgreSQL connection pool max 10
- Answers com upsert (idempotente)
- View materializada para analytics pesados
- Sessões antigas (> 30 dias, `abandoned`) podem ser arquivadas

### LGPD
- Consentimento explícito registrado na tabela `sessions`
- Endpoint de exclusão de sessão por email/sessionId
- Retenção configurável por quiz (padrão: 2 anos)
- Dados pessoais nunca logados em console/servidor

---

## Roadmap

### v1.0 — MVP (atual)
- [x] CRUD de quizzes com builder visual
- [x] Todos os tipos de pergunta
- [x] Player com sessão persistida
- [x] Analytics: funil + distribuição + tempo
- [x] Exportação CSV
- [x] Autenticação JWT admin

### v1.1
- [ ] Lógica condicional (branching) no builder
- [ ] Themes/design system completo
- [ ] Webhook on-submit

### v1.2
- [ ] Múltiplos administradores com roles
- [ ] Agendamento de abertura/fechamento
- [ ] Limit de respostas por quiz

### v2.0
- [ ] Migração para Firebase / NeonDB
- [ ] Cluster de respondentes (K-means)
- [ ] Score/pontuação por quiz (modo quiz real)
- [ ] Embed como iframe
