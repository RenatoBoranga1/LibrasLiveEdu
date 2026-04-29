# Accessibility

LibrasLive Edu busca WCAG AA com foco em uso por alunos surdos, pessoas com deficiencia auditiva, professores e curadores.

## Recursos

- Layout mobile-first para uso com uma mao.
- Legenda grande em area central.
- Avatar/fallback em area superior fixa.
- Cards horizontais objetivos.
- Modo alto contraste.
- Fonte grande.
- Modo foco: legenda + avatar.
- Feedback de conexão com `role="status"` e erros com `role="alert"`.
- Navegação por teclado e foco visível.
- Textos simples e curtos.
- Aviso claro quando sinal esta pendente de curadoria.

## Limitacoes

- A tradução automática pode conter limitações.
- Glosa técnica não deve ser tratada como tradução perfeita.
- O app não substitui intérprete humano de Libras.
- QR Scanner e renderer de avatar real estao preparados para integracao futura.

## Checklist WCAG

- Contraste testado.
- Navegação por teclado testada.
- Leitor de tela testado.
- Celular Android testado.
- iPhone testado.
- Tablet testado.
- Modo alto contraste testado.
- Fonte grande testada.
- Animacoes respeitam `prefers-reduced-motion`.
- Mensagens não dependem apenas de cor.

## Atalhos Visuais

- `Fonte grande`: aumenta legenda e textos principais.
- `Alto contraste`: reforca leitura em ambientes de sala.
- `Modo foco`: reduz distracoes para priorizar avatar e legenda.
- `Pausar legenda`: congela o ultimo trecho para leitura.
