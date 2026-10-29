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

O resultado final, o campo PARADA e o botão Copiar mostram apenas o valor absoluto inteiro, cortando as casas decimais sem arredondar. Essa formatação não altera o cálculo original.

Exemplos com B = 600 e X = 300:

| Divisor | Resultado da fórmula (aproximado) | Exibição final |
| --- | --- | --- |
| 0,9 | -666,67 | 666 |
| 0,4 | -250 | 250 |
| 0,45 | -333,33 | 333 |
| 0,8 | -625 | 625 |

Os cálculos são feitos no navegador. A fonte é carregada pelo Google Fonts; sem conexão, a página utiliza uma fonte do sistema e continua funcionando.

## Depósitos por tela

Escolha **Tela 1** até **Tela 10** abaixo do resultado e clique em **Salvar depósito**. Cada tela guarda somente o último valor: salvar novamente substitui o anterior imediatamente, sem limite de salvamentos e sem confirmação extra.

Em **Telas salvas**, as 10 telas mostram seus valores mais recentes. Ao selecionar uma tela, você vê o valor salvo com os dados do cálculo e a data, e também pode salvar o resultado atual diretamente nela. Não há ações de carregar ou excluir registros. **Limpar** continua apagando apenas o perfil, sem modificar os valores salvos.

Registros da versão anterior são lidos usando o cálculo mais recente de cada tela. No próximo salvamento, os 10 valores passam para o formato de um único registro por tela; os dados antigos permanecem guardados como cópia de compatibilidade, sem aparecer como depósitos extras na interface.

Os registros ficam no armazenamento local deste navegador e deste endereço, sem conta ou sincronização entre dispositivos. Eles sobrevivem ao fechamento normal e ao recarregamento; apagar os dados do site também apaga os registros. Abas do mesmo endereço atualizam os registros entre si. Falhas de armazenamento são mostradas na tela, sem informar que um depósito foi salvo quando a gravação falha.

## Janela flutuante

O botão **Flutuar** usa a Document Picture-in-Picture API quando disponível no navegador, como Chrome e Edge no computador em HTTPS. A calculadora continua interativa, incluindo as abas, os valores iniciais e os registros. Arraste a janela pela barra de título e redimensione-a usando os controles do sistema.

Mantenha a aba original aberta: a janela flutuante depende dela. **Voltar**, o controle nativo do navegador ou o fechamento da janela devolvem a mesma calculadora à aba, preservando o cálculo em andamento. A compatibilidade é detectada em tempo de execução; navegadores sem essa API recebem uma mensagem explicativa. Uma janela comum de `window.open()` não é usada como substituto, pois não garante ficar sobre as outras janelas.

Referência: [Document Picture-in-Picture — Chrome for Developers](https://developer.chrome.com/docs/web-platform/document-picture-in-picture).
