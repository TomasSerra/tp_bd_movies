const express = require('express');
const sqlite3 = require('sqlite3');
const ejs = require('ejs');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "views" directory
app.use(express.static('views'));

// Conectar a la base de datos SQLite
const db = new sqlite3.Database('./movies.db');

// Configurar el motor de plantillas EJS
app.set('view engine', 'ejs');

// Ruta para la página de inicio
app.get('/', (req, res) => {
    res.render('index');
});

// Ruta para buscar películas
app.get('/buscar', (req, res) => {
    const searchTerm = req.query.q;

    // Realizar la búsqueda en la base de datos para películas
    db.all(
        'SELECT * FROM movie WHERE title LIKE ?',
        [`%${searchTerm}%`],
        (err, movieRows) => {
            if (err) {
                res.status(500).send('Error en la búsqueda de películas.');
            } else {
                // Realizar la búsqueda en la base de datos para personas
                db.all(
                    `SELECT DISTINCT p.person_name, p.person_id FROM person AS p
                    JOIN movie_crew AS mc ON p.person_id = mc.person_id
                    WHERE person_name LIKE ? AND mc.job='Director'`,
                    [`%${searchTerm}%`],
                    (err, directorRows) => {
                        if (err) {
                            res.status(500).send('Error en la búsqueda de personas.');
                        } else {
                            // Renderizar la vista con los resultados de películas y personas
                            db.all(
                                `SELECT DISTINCT p.person_name, p.person_id FROM person AS p
                                JOIN movie_cast AS mc ON p.person_id = mc.person_id
                                WHERE p.person_name LIKE ?`,
                                [`%${searchTerm}%`],
                                (err, actorRows) => {
                                    if (err) {
                                        res.status(500).send('Error en la búsqueda de actores.');
                                    } else {
                                        // Renderizar la vista con los resultados de películas y personas
                                        res.render('resultado', { movies: movieRows, directors: directorRows, actors: actorRows });
                                    }
                                }
                            );
                        }
                    }
                );
            }
        }
    );
});

app.get('/tags', (req, res) => {
    const searchTerm = req.query.q;

    db.all(
        `SELECT *
        FROM keyword
        JOIN movie_keywords ON movie_keywords.keyword_id = keyword.keyword_id
        JOIN movie ON movie.movie_id = movie_keywords.movie_id
        WHERE keyword.keyword_name LIKE ?`,
        [`%${searchTerm}%`],
        (err, movieRows) => {
            if (err) {
                console.log(movieRows)
                res.status(500).send('Error en la búsqueda de películas.');
            } else {
                res.render('tags', { movies: movieRows });
            }
        });
});

// Ruta para la página de datos de una película particular
app.get('/pelicula/:id', (req, res) => {
    const movieId = req.params.id;

    // Consulta SQL para obtener los datos de la película, elenco y crew
    const query = `
    SELECT
      movie.*,
      genre.*,
      movie_genres.*,
      actor.person_name as actor_name,
      actor.person_id as actor_id,
      crew_member.person_name as crew_member_name,
      crew_member.person_id as crew_member_id,
      movie_cast.character_name,
      movie_cast.cast_order,
      department.department_name,
      movie_crew.job
    FROM movie
    LEFT JOIN movie_cast ON movie.movie_id = movie_cast.movie_id
    LEFT JOIN person as actor ON movie_cast.person_id = actor.person_id
    LEFT JOIN movie_crew ON movie.movie_id = movie_crew.movie_id
    LEFT JOIN department ON movie_crew.department_id = department.department_id
    LEFT JOIN person as crew_member ON crew_member.person_id = movie_crew.person_id
    LEFT JOIN movie_genres ON movie_genres.movie_id = movie.movie_id
    LEFT JOIN genre ON genre.genre_id = movie_genres.genre_id
    WHERE movie.movie_id = ?
  `;

    // Ejecutar la consulta
    db.all(query, [movieId], (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al cargar los datos de la película.');
        } else if (rows.length === 0) {
            res.status(404).send('Película no encontrada.');
        } else {
            // Organizar los datos en un objeto de película con elenco y crew
            const movieData = {
                id: rows[0].id,
                title: rows[0].title,
                release_date: rows[0].release_date,
                overview: rows[0].overview,
                vote_average: rows[0].vote_average,
                genre: rows[0].genre_name,
                homepage: rows[0].homepage,
                directors: [],
                writers: [],
                cast: [],
                crew: [],
            };

            // Crear un objeto para almacenar directores
            rows.forEach((row) => {
                if (row.crew_member_id && row.crew_member_name && row.department_name && row.job) {
                    // Verificar si ya existe una entrada con los mismos valores en directors
                    const isDuplicate = movieData.directors.some((crew_member) =>
                        crew_member.crew_member_id === row.crew_member_id
                    );

                    if (!isDuplicate) {
                        // Si no existe, agregar los datos a la lista de directors
                        if (row.department_name === 'Directing' && row.job === 'Director') {
                            movieData.directors.push({
                                crew_member_id: row.crew_member_id,
                                crew_member_name: row.crew_member_name,
                                department_name: row.department_name,
                                job: row.job,
                            });
                        }
                    }
                }
            });

            // Crear un objeto para almacenar writers
            rows.forEach((row) => {
                if (row.crew_member_id && row.crew_member_name && row.department_name && row.job) {
                    // Verificar si ya existe una entrada con los mismos valores en writers
                    const isDuplicate = movieData.writers.some((crew_member) =>
                        crew_member.crew_member_id === row.crew_member_id
                    );

                    if (!isDuplicate) {
                        // Si no existe, agregar los datos a la lista de writers
                        if (row.department_name === 'Writing' && row.job === 'Writer') {
                            movieData.writers.push({
                                crew_member_id: row.crew_member_id,
                                crew_member_name: row.crew_member_name,
                                department_name: row.department_name,
                                job: row.job,
                            });
                        }
                    }
                }
            });

            // Crear un objeto para almacenar el elenco
            rows.forEach((row) => {
                if (row.actor_id && row.actor_name && row.character_name) {
                    // Verificar si ya existe una entrada con los mismos valores en el elenco
                    const isDuplicate = movieData.cast.some((actor) =>
                        actor.actor_id === row.actor_id
                    );

                    if (!isDuplicate) {
                    // Si no existe, agregar los datos a la lista de elenco
                        movieData.cast.push({
                            actor_id: row.actor_id,
                            actor_name: row.actor_name,
                            character_name: row.character_name,
                            cast_order: row.cast_order,
                        });
                    }
                }
            });

            // Crear un objeto para almacenar el crew
            rows.forEach((row) => {
                if (row.crew_member_id && row.crew_member_name && row.department_name && row.job) {
                    // Verificar si ya existe una entrada con los mismos valores en el crew
                    const isDuplicate = movieData.crew.some((crew_member) =>
                        crew_member.crew_member_id === row.crew_member_id
                    );

                    // console.log('movieData.crew: ', movieData.crew)
                    // console.log(isDuplicate, ' - row.crew_member_id: ', row.crew_member_id)
                    if (!isDuplicate) {
                        // Si no existe, agregar los datos a la lista de crew
                        if (row.department_name !== 'Directing' && row.job !== 'Director'
                        && row.department_name !== 'Writing' && row.job !== 'Writer') {
                            movieData.crew.push({
                                crew_member_id: row.crew_member_id,
                                crew_member_name: row.crew_member_name,
                                department_name: row.department_name,
                                job: row.job,
                            });
                        }
                    }
                }
            });

            res.render('pelicula', { movie: movieData });
        }
    });
});

// Ruta para mostrar la página de un actor específico
app.get('/actor/:id', (req, res) => {
    const actorId = req.params.id;

      // Definir variables para guardar los dos tipos de pelicula
      let actedInMovies = [];
      let directedMovies = [];

     // Consulta para pelis que actuo
     const actedInQuery = `
     SELECT DISTINCT
         person.person_name as actorName,
         movie.*
     FROM movie
     INNER JOIN movie_cast ON movie.movie_id = movie_cast.movie_id
     INNER JOIN person ON person.person_id = movie_cast.person_id
     WHERE movie_cast.person_id = ?;
 `;

 // Consulta para pelis que dirigió
 const directedQuery = `
     SELECT DISTINCT
         person.person_name as actorName,
         movie.*
     FROM movie
     INNER JOIN movie_crew ON movie.movie_id = movie_crew.movie_id
     INNER JOIN person ON person.person_id = movie_crew.person_id
     WHERE movie_crew.person_id = ? AND movie_crew.job = 'Director';
 `;

     // Ejecutar la consulta de pelis que actuó
     db.all(actedInQuery, [actorId], (err, actedInResults) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al cargar las películas del actor.');
        } else {
            actedInMovies = actedInResults;

            // Ejecutar la consulta de pelis que dirigió
            db.all(directedQuery, [actorId], (err, directedResults) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error al cargar las películas del actor.');
                } else {
                    directedMovies = directedResults;

                    // Obtener el nombre del actor
                    const actorName = actedInMovies.length > 0 ? actedInMovies[0].actorName : '';

                    // Poner las dos listas en la view
                    res.render('actor', { actorName, actedInMovies, directedMovies });
                }
            });
        }
    });
});

// Ruta para mostrar la página de un director específico
app.get('/director/:id', (req, res) => {
    const directorId = req.params.id;

          // Definir variables para guardar los dos tipos de pelicula
          let actedInMovies = [];
          let directedMovies = [];
    
         // Consulta para pelis que actuo
         const actedInQuery = `
         SELECT DISTINCT
             person.person_name as directorName,
             movie.*
         FROM movie
         INNER JOIN movie_cast ON movie.movie_id = movie_cast.movie_id
         INNER JOIN person ON person.person_id = movie_cast.person_id
         WHERE movie_cast.person_id = ?;
     `;
    
     // Consulta para pelis que dirigió
     const directedQuery = `
         SELECT DISTINCT
             person.person_name as directorName,
             movie.*
         FROM movie
         INNER JOIN movie_crew ON movie.movie_id = movie_crew.movie_id
         INNER JOIN person ON person.person_id = movie_crew.person_id
         WHERE movie_crew.person_id = ? AND movie_crew.job = 'Director';
     `;
    
         // Ejecutar la consulta de pelis que actuó
         db.all(actedInQuery, [directorId], (err, actedInResults) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error al cargar las películas del actor.');
            } else {
                actedInMovies = actedInResults;
    
                // Ejecutar la consulta de pelis que dirigió
                db.all(directedQuery, [directorId], (err, directedResults) => {
                    if (err) {
                        console.error(err);
                        res.status(500).send('Error al cargar las películas del actor.');
                    } else {
                        directedMovies = directedResults;
                        directorName = directedResults[0].directorName;
    
                        // Obtener el nombre del actor
                        const actorName = actedInMovies.length > 0 ? actedInMovies[0].actorName : '';
    
                        // Poner las dos listas en la view
                        res.render('director', { directorName, actedInMovies, directedMovies });
                    }
                });
            }
        });
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});
