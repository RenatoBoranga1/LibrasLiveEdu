# LibrasLive Edu Android

Este é o cliente Android nativo do LibrasLive Edu, criado para abrir no Android Studio e executar diretamente em um celular.

## Como rodar

1. Abra o Android Studio.
2. Clique em **Open**.
3. Selecione a pasta `LibrasLiveEdu/android`.
4. Aguarde o Gradle Sync.
5. Conecte o celular com depuração USB ativa.
6. Clique em **Run**.

O app já funciona em modo demonstração offline. Para recursos reais de backend, rode o backend FastAPI no computador e configure a URL no app usando o IP da sua rede, por exemplo:

```text
http://192.168.0.10:8000
```

No celular, `localhost` aponta para o próprio celular, então use sempre o IP do computador.

## O que já existe no app Android

- Tela inicial com Professor, Aluno e Administrador.
- Modo demo offline.
- Tela do professor com criação/início/fim de aula simulada.
- Tela do aluno com avatar placeholder, legenda grande, cards visuais, salvar palavra, alto contraste e aumentar texto.
- Tela de revisão com resumo, histórico, palavras-chave e salvas.
- Tela administrativa com sinais pendentes, filtros simples e aprovação local.
- Mensagem institucional de acessibilidade.

O backend web completo continua em `../backend`.
