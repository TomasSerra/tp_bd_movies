# Base de Datos y Recursos de Información – 2023
## TP - MovieWeb

### Instalar dependencias
`npm install express sqlite3 ejs`

### Ejecutar
`node app.js`

## Funciones a implementar
1. Búsqueda de películas, actores y directores
- Modificar la página principal para que el buscador no solo busque nombres de
películas, sino también nombres de personas que sean actores o directores.
- Crear una página de resultados de búsqueda que liste los resultados separados en
secciones: películas, actores y directores.
2. Páginas de personas (actores y directores)
- Al hacer clic en una persona (actor o director) en la página de resultados de búsqueda,
se debe mostrar la página de esa persona.
- En la página de la persona, listar las películas en las que esa persona ha participado
como actor o director.
3. Información detallada de películas
- Modificar la página de películas para que incluya todos los datos de la película,
incluyendo género, país de producción, etc. Mostrar toda la información contenida en las
tablas de la base de datos "movies.db".
4. Búsqueda de películas por palabras clave
- Incluir un buscador de palabras clave (keywords) que devuelva como resultado las
películas relacionadas con la palabra de búsqueda. 
