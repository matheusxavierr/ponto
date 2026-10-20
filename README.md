# Ponto — Calculadora de perfil

Site em HTML, CSS e JavaScript puro. Abra `dist/index.html` no navegador para usar, sem instalar dependências.

## GitHub Pages

O repositório está preparado para publicar a branch `main`, na pasta `/ (root)`, em **Settings → Pages → Deploy from a branch**.

Mantenha o `index.html` da raiz, o arquivo `.nojekyll` e a pasta `dist/` no repositório. O arquivo da raiz encaminha para `./dist/`, onde ficam a calculadora, o CSS e o JavaScript. Assim, o endereço principal abre sempre a versão atual da calculadora.

Informe em X o valor que aparece no perfil. O resultado segue exatamente a fórmula:

```text
Y = 600 - X
Z = Y / 0.9
Onde precisa parar = Z - 1000
```

Aceita valores positivos, negativos e decimais com vírgula ou ponto, sem separador de milhar. O cálculo mantém a precisão entre as etapas e arredonda apenas a exibição para duas casas decimais. Resultados negativos preservam o sinal.

Exemplos: X = -300 resulta em 0,00; X = 0 resulta em -333,33; X = 300 resulta em -666,67.

Os cálculos são feitos no navegador. A fonte é carregada pelo Google Fonts; sem conexão, a página utiliza uma fonte do sistema e continua funcionando.
