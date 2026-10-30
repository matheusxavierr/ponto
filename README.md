# Ponto — Calculadora de perfil

Site em HTML, CSS e JavaScript puro. Abra `dist/index.html` no navegador para usar, sem instalar dependências.

## GitHub Pages

O repositório está preparado para publicar a branch `main`, na pasta `/ (root)`, em **Settings → Pages → Deploy from a branch**.

Mantenha o `index.html` da raiz, o arquivo `.nojekyll` e a pasta `dist/` no repositório. O arquivo da raiz encaminha para `./dist/`, onde ficam a calculadora, o CSS e o JavaScript. Assim, o endereço principal abre sempre a versão atual da calculadora.

O campo **Valor inicial (B)** começa em `600` e pode ser alterado. Informe em **Valor no perfil (X)** o valor que aparece no perfil e escolha uma das abas: `0,9` (original), `0,4`, `0,45` ou `0,8`. A troca de aba preserva os dois valores e recalcula o resultado, as etapas e a fórmula exibida. As abas também aceitam as setas do teclado, Home e End. O botão **Limpar** apaga apenas o perfil, mantendo o valor inicial e a aba escolhida.

O cálculo usa o divisor D da aba selecionada:

```text
Y = B - X
Z = Y / D
Onde precisa parar = Z - 1000
```

Aceita valores positivos, negativos e decimais com vírgula ou ponto, sem separador de milhar. A fórmula mantém o sinal e a precisão entre as etapas. Os valores intermediários são exibidos com duas casas decimais.

Até 1000 giros necessários (Z), o resultado final, o campo PARADA e o botão Copiar continuam exibindo o valor absoluto inteiro de `Z - 1000`, sem casas decimais. O número indica onde parar o contador decrescente de um bloco de 1000.

Quando Z ultrapassa 1000, o resultado principal passa a mostrar o **total de giros necessários**, com um aviso **Mais de 1000**, a divisão em blocos e a parada no contador do último bloco. O botão Copiar copia esse total, e a terceira etapa passa a identificar os giros **EXTRA**, além do primeiro bloco. A fórmula original permanece com a precisão completa.

Exemplo: B = 630, X = 200 e divisor 0,4 produzem Z = 1075. A calculadora mostra **1075**, **1000 + 75 giros** e **Último bloco: parar em 925**. Para 2000 giros, mostra dois blocos completos e contador final em 0; para 2500, dois blocos completos mais 500 e parada em 500.

O plano usa giros inteiros: se o total necessário tiver fração, é considerado o giro inteiro seguinte para completar a meta. Por exemplo, 1075,5 exige 1076 giros, com parada em 924 no último bloco. Pequenos resíduos de ponto flutuante em números inteiros são normalizados apenas na apresentação. Os registros das telas, inclusive os antigos, exibem a mesma interpretação do cálculo atual.

Exemplos com B = 600 e X = 300:

| Divisor | Resultado da fórmula (aproximado) | Exibição final |
| --- | --- | --- |
| 0,9 | -666,67 | 666 |
| 0,4 | -250 | 250 |
| 0,45 | -333,33 | 333 |
| 0,8 | -625 | 625 |

Os cálculos são feitos no navegador. A fonte é carregada pelo Google Fonts; sem conexão, a página utiliza uma fonte do sistema e continua funcionando.

## Depósitos por tela

Escolha **Tela 1** até **Tela 10** abaixo do resultado e clique em **Salvar depósito**. Cada tela guarda somente o último valor: salvar novamente substitui o anterior imediatamente, sem limite de salvamentos e sem confirmação extra. Após salvar com sucesso, o seletor avança para a tela seguinte; da Tela 10, volta à Tela 1. O cálculo atual permanece disponível.

Em **Telas salvas**, as 10 telas mostram seus valores mais recentes. Ao selecionar uma tela, você vê o valor salvo com os dados do cálculo e a data, e também pode salvar o resultado atual diretamente nela. **Marcar OK** substitui a exibição do número por **✓ OK** e retira a tela da fila. **Reabrir tela** recupera a exibição do valor e a devolve à fila. **Excluir valor** esvazia somente a tela selecionada. Salvar novamente em uma tela OK substitui o cálculo e a deixa pendente. Essas ações persistem ao recarregar. **Limpar** continua apagando apenas o perfil, sem modificar os valores salvos.

A aba **Fila de parada** do modal lista apenas telas pendentes, em ordem crescente dos giros totais necessários; empates seguem o número da tela. Para cálculos de até 1000 giros, isso equivale a priorizar o maior contador de parada. Cálculos que exigem vários blocos são ordenados pelo total de giros, não pelo contador do último bloco. Cada item permite abrir a tela correspondente para marcar OK ou excluir. Em janelas pequenas, a fila exibe cinco itens por página, com botões para avançar e voltar, sem rolagem. A fila é uma previsão considerando o mesmo início dos cálculos; não lê contadores ao vivo nem considera velocidades diferentes ou giros já executados.

Registros da versão anterior são lidos usando o cálculo mais recente de cada tela. No próximo salvamento, os 10 valores passam para o formato de um único registro por tela; os dados antigos permanecem guardados como cópia de compatibilidade, sem aparecer como depósitos extras na interface.

Os registros ficam no armazenamento local deste navegador e deste endereço, sem conta ou sincronização entre dispositivos. Eles sobrevivem ao fechamento normal e ao recarregamento; apagar os dados do site também apaga os registros. Abas do mesmo endereço atualizam os registros entre si. Falhas de armazenamento são mostradas na tela, sem informar que um depósito foi salvo quando a gravação falha.

## Janela flutuante

O botão **Flutuar** usa a Document Picture-in-Picture API quando disponível no navegador, como Chrome e Edge no computador em HTTPS. A calculadora continua interativa, incluindo as abas, os valores iniciais e os registros. Arraste a janela pela barra de título e redimensione-a usando os controles do sistema.

Mantenha a aba original aberta: a janela flutuante depende dela. **Voltar**, o controle nativo do navegador ou o fechamento da janela devolvem a mesma calculadora à aba, preservando o cálculo em andamento. A compatibilidade é detectada em tempo de execução; navegadores sem essa API recebem uma mensagem explicativa. Uma janela comum de `window.open()` não é usada como substituto, pois não garante ficar sobre as outras janelas.

Referência: [Document Picture-in-Picture — Chrome for Developers](https://developer.chrome.com/docs/web-platform/document-picture-in-picture).

## Estudo de monitor de rolls (não implementado)

É tecnicamente possível capturar o monitor escolhido pelo usuário com `getDisplayMedia()` e aplicar OCR local apenas às dez regiões dos contadores, comparando as leituras com os alvos salvos. O usuário precisaria iniciar o compartilhamento e selecionar o monitor em cada sessão. Uma captura direta, com janelas visíveis e layout fixo, é mais adequada que uma foto inclinada do monitor.

Uma implementação futura precisaria associar cada região à Tela 1–10, calibrar após mudanças de posição/zoom, validar leituras ao longo de vários quadros, tratar números ocultos e distinguir reinícios de blocos de 1000. Alvos acima de 1000 exigem acompanhar o bloco atual e o total realizado. Caso a leitura fique incerta ou a captura termine, deve avisar que o acompanhamento foi perdido, sem marcar a tela como OK automaticamente.

O primeiro protótipo sugerido é um monitor de alertas visuais e sonoros, com a parada manual no jogo. A viabilidade das APIs está confirmada, mas a precisão, a latência e o consumo de CPU com dez contadores ainda precisam ser medidos com uma captura real dos jogos em movimento. Não há monitoramento, captura de tela ou OCR ativos nesta versão.

Referências: [Screen Capture API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia), [Tesseract.js — repositório oficial](https://github.com/naptha/tesseract.js).
