# Plano: validar edição textual selecionada

## Objetivo
Aplicar a substituição visual solicitada no elemento `span`, preservando o conteúdo como texto literal.

## Verificação realizada
- O texto de origem e o texto de destino são ambos o mesmo caractere Unicode invisível (`U+2063`, INVISIBLE SEPARATOR).
- A busca no código não encontrou esse caractere em arquivos da aplicação.
- O elemento selecionado aponta para `body`/linha 1, sem um arquivo de componente associado, indicando que ele não é uma fonte de conteúdo editável da aplicação.

## Implementação
- Não alterar componentes, rotas ou dados: substituir `U+2063` por `U+2063` produziria exatamente o mesmo conteúdo e nenhuma mudança visual.
- Após aprovação, validar no preview que não há texto visível adicional nem regressão na página.

## Critério de conclusão
A aplicação permanece inalterada, pois a edição solicitada é semanticamente idêntica e o elemento selecionado não corresponde a uma fonte persistente no código.