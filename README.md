# Ponto — Calculadora de perfil

Site em HTML, CSS e JavaScript puro. Abra `dist/index.html` no navegador para usar, sem instalar dependências.

## GitHub Pages

O repositório está preparado para publicar a branch `main`, na pasta `/ (root)`, em **Settings → Pages → Deploy from a branch**.

Mantenha o `index.html` da raiz, o arquivo `.nojekyll` e a pasta `dist/` no repositório. O arquivo da raiz encaminha para `./dist/`, onde ficam a calculadora, o CSS e o JavaScript. Assim, o endereço principal abre sempre a versão atual da calculadora.

Informe em X o valor que aparece no perfil e escolha uma das abas: `0,9` (original), `0,4`, `0,45` ou `0,8`. A troca de aba preserva o valor digitado e recalcula o resultado, as etapas e a fórmula exibida. As abas também aceitam as setas do teclado, Home e End.

O cálculo usa o divisor D da aba selecionada:

```text
Y = 600 - X
Z = Y / D
Onde precisa parar = Z - 1000
```

Aceita valores positivos, negativos e decimais com vírgula ou ponto, sem separador de milhar. A fórmula mantém o sinal e a precisão entre as etapas. Os valores intermediários são exibidos com duas casas decimais.

O resultado final, o campo PARADA e o botão Copiar mostram apenas o valor absoluto inteiro, cortando as casas decimais sem arredondar. Essa formatação não altera o cálculo original.

Exemplos com X = 300:

| Divisor | Resultado da fórmula (aproximado) | Exibição final |
| --- | --- | --- |
| 0,9 | -666,67 | 666 |
| 0,4 | -250 | 250 |
| 0,45 | -333,33 | 333 |
| 0,8 | -625 | 625 |

Os cálculos são feitos no navegador. A fonte é carregada pelo Google Fonts; sem conexão, a página utiliza uma fonte do sistema e continua funcionando.
