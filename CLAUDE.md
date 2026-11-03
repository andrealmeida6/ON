# Projeto Borges

O projeto é desenhado primeiro em mockups e depois implementado em Power Pages. Cada mockup é construído em paralelo com o código Power Pages correspondente.

## Regras de trabalho

1. Começa todas as mensagens com "André,".
2. Coloca os mockups em `3 - Mockups/`.
3. Coloca os agentes em `4 - Agentes/`.
4. Para cada plano, atualiza o ficheiro `.md` de `2 - Ficheiros MD/` relacionado com o tema. Cria um novo apenas se não existir nenhum relacionado.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `1 - Código VSC/web-pages/` | Páginas Power Pages |
| `1 - Código VSC/content-snippets/` | Conteúdo reutilizável, sem parâmetros |
| `1 - Código VSC/web-templates/` | Layouts e blocos Liquid, incluindo blocos com parâmetros |
| `1 - Código VSC/web-files/` | CSS global, JavaScript, imagens e outros ficheiros |
| `2 - Ficheiros MD/` | Planos e documentação |
| `3 - Mockups/` | Mockups HTML que abrem diretamente no browser |
| `4 - Agentes/` | Definições de agentes |

## Do mockup para o Power Pages

O mockup final é um único ficheiro, `3 - Mockups/mockup-final.html`, navegável e com todas as páginas do projeto. Tem de corresponder sempre a `1 - Código VSC/web-pages/`, com uma secção por cada web page e os mesmos nomes.

Sempre que criares ou alterares um mockup, alinha o código em `1 - Código VSC/` na mesma tarefa:

- **CSS global:** existe um único ficheiro, `1 - Código VSC/web-files/global.css`, e os mockups usam-no por caminho relativo em vez de terem uma cópia. Evita CSS inline ou específico de uma página.
- **Web pages:** cria uma por cada página do mockup. A página só organiza os blocos; o conteúdo fica nos snippets.
- **Content snippets:** coloca aqui textos e blocos de HTML, um por bloco reutilizável.
- **Web templates:** usa-os para header, footer, layout e blocos que precisem de parâmetros ou lógica Liquid, porque os snippets não recebem parâmetros.
- **Marcação no mockup:** identifica cada bloco com a sua origem, por exemplo `<!-- snippet: Home/Hero -->`, para o mapeamento ser rastreável.
- **Referências no código:** usa `{{ snippets['Home/Hero'] }}` para snippets e `{% include 'nome-template' %}` para templates.

Antes de criar um bloco novo, verifica se já existe um snippet ou template que possa ser reutilizado.

## Metadados Power Pages

Não inventes GUIDs nem campos nos ficheiros `.yml` de metadados. Segue o formato de um `pac pages download` real do site. Enquanto não houver um, cria apenas os ficheiros de conteúdo (HTML, CSS, JS).
