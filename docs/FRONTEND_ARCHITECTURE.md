# Arquitetura do frontend

## Auditoria de 2026

O frontend usa Next.js App Router, React, TypeScript, Tailwind, Vitest e Playwright. A auditoria identificou três concentrações principais: `services/api.ts` reunia todos os domínios, a página da sala do aluno combinava sessão, WebSocket, preferências e toda a apresentação, e a curadoria repetia controles, cards e estados assíncronos.

As páginas operacionais mais extensas continuam sendo acompanhadas por tamanho e responsabilidade. Novas funcionalidades não devem ampliar páginas de rota; devem entrar em `features/<dominio>` e usar as primitivas compartilhadas.

## Design system

As primitivas ficam em `frontend/src/components/ui`:

- `Button`, `Card`, `Badge`, `Input`, `Select` e `Textarea`;
- `Dialog`, `Tabs` e `Table`;
- `InlineFeedback`, `StatusBanner` e estados de loading, erro, vazio, permissão e offline;
- `PageShell`, `PageHeader` e `Section`.

Controles interativos usam a classe `touch-target`. Não existe mais tamanho mínimo global em todos os links. O foco visível e `prefers-reduced-motion` permanecem globais.

## Shells e permissões

`frontend/src/components/shells/ProductShells.tsx` define os shells público, aluno, professor, administrador, curador e sala de aula. O bloqueio real continua sendo feito pela API; os shells também evitam exibir uma área incompatível durante a resolução da sessão.

- admin: curadoria e ferramentas técnicas;
- curator: fila, revisão e cadastro editorial, sem crawlers/importadores administrativos;
- professor: criação e condução da aula;
- student: entrada e experiência de aula.

O `AppHeader` deriva sua navegação do perfil e compartilha a mesma lista entre desktop e menu móvel.

## Sala do aluno

`/join/[accessCode]` é uma composição curta. O domínio está em `frontend/src/features/student`:

- `useStudentClassroom`: entrada na aula, fallback e resumo inicial;
- `useStudentPreferences`: contraste, tamanho e modo foco persistidos;
- `useCaptionControls`, `useAvatarControls`, `useSavedWords` e `useMediaPreview`;
- regiões independentes para legenda, Avatar, resumo, palavras-chave, histórico, palavras salvas e diálogo de mídia.

O hook `useLiveClass` continua sendo a única integração WebSocket. Imagem estática só aparece em cards ou prévia de apoio; nunca entra na fila do Avatar.

## Serviços

`services/api.ts` permanece como fachada compatível para imports antigos. Novos módulos delimitam os domínios: `authApi`, `classesApi`, `signsApi`, `adminApi`, `mediaApi` e `publicApi`. Código novo deve importar do módulo do domínio. A fachada preserva refresh token único, prevenção de `/api/api`, erro tipado e limpeza de sessão.

## Curadoria

Componentes de curadoria ficam em `features/curation/components`. Checklists devem tornar explícitos fonte, licença, mídia animada e validação por especialista. Imagem de apoio nunca equivale a sinal pronto para Avatar.

## Critérios para mudanças

1. Use tipos de `types/domain.ts` e `types/live.ts`.
2. Modele loading, vazio, erro e permissão explicitamente.
3. Preserve navegação por teclado, nome acessível e foco visível.
4. Evite busca sequencial quando chamadas independentes puderem ser concorrentes.
5. Não use imagens institucionais pesadas em superfícies operacionais.
6. Cubra novos fluxos com Vitest e mantenha o smoke Playwright por perfil.
