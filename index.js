import express from 'express';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import moment from 'moment';
import pg from 'pg';
import jsSHA from 'jssha';
import dotenv from 'dotenv';

dotenv.config({ silent: process.env.NODE_ENV === 'production' });

const { Pool } = pg;
const app = express();

app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use(cookieParser());

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// create separate DB connection configs for production vs non-production environments.
// ensure our server still works on our local machines.
let pgConnectionConfigs;
if (process.env.ENV === 'PRODUCTION') {
  // determine how we connect to the remote Postgres server
  pgConnectionConfigs = {
    user: 'postgres',
    // set DB_PASSWORD as an environment variable for security.
    password: process.env.DB_PASSWORD,
    host: 'localhost',
    database: 'birding',
    port: 5432,
  };
} else {
  // determine how we connect to the local Postgres server
  pgConnectionConfigs = {
    user: 'en',
    host: 'localhost',
    database: 'birding',
    port: 5432,
  };
}

const TABLE = 'sightings';

const pool = new Pool(pgConnectionConfigs);

const { SALT } = process.env;

let loggedInUser;
const hashItem = (text) => {
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  shaObj.update(text);
  return shaObj.getHash('HEX');
};

const createNote = (req, res) => {
  console.log('request came in');

  let sqlQuery = 'SELECT * FROM behaviors';
  pool.query(sqlQuery, (err, behaviors) => {
    if (err) throw err;

    sqlQuery = 'SELECT * FROM species';
    pool.query(sqlQuery, (err, result) => {
      if (err) throw err;
      const emptyNote = {
        species: result.rows,
        title: 'New birding note',
        action: '/note',
        behaviors: behaviors.rows,

      };
      res.render('edit', emptyNote);
    });
  });
};

const acceptNewNote = (req, res) => {
  const obj = req.body;
  const loggedUser = req.cookies['logged-in'] ? loggedInUser : 'anon';
  console.log('user', loggedUser);

  const behaviors = Array.isArray(obj.behavoir_ids) ? obj.behavoir_ids : [obj.behavoir_ids];
  console.log(behaviors);
  let sqlQuery = `INSERT INTO ${TABLE} (date, time, flock_size, species_id,  user_id) VALUES ('${obj.date}', '${obj.time}', '${obj.flock_size}', ${obj.species_id}, (SELECT id FROM users WHERE username= '${loggedUser}')) RETURNING id`;
  pool.query(sqlQuery, (err, result) => {
    if (err) {
      console.log('Error while adding note', err.stack);
      res.status(503).send(result);
      return;
    }
    const sightingId = result.rows[0].id;
    let numQueries = 0;
    sqlQuery = 'INSERT INTO behavior_sighting (sight_id, behavior_id) VALUES ($1, $2) RETURNING *';
    behaviors.forEach((b) => {
      const values = [sightingId, b];
      pool.query(sqlQuery, values, (err2, result2) => {
        if (err2) throw err2;

        numQueries += 1;
        console.log(result2.rows[0]);
        if (numQueries === behaviors.length)
        {
          res.redirect(`/note/${sightingId}`);
        }
      });
    });
  });
};

const renderNote = (req, res) => {
  const { id } = req.params;
  const { user } = req.cookies;

  let sqlQuery = 'SELECT comment, username FROM comments INNER JOIN users ON commenter_id=users.id INNER JOIN sightings ON sightings.id = comments.sight_id WHERE sightings.id=$1 ORDER BY comments.id ASC';
  pool.query(sqlQuery, [id], (err3, result3) => {
    if (err3) throw err3;
    console.log('result 3', result3.rows);
    const comments = result3.rows;
    sqlQuery = `SELECT sightings.id, date, time, flock_size, user_id, username FROM sightings LEFT JOIN users ON sightings.user_id = users.id WHERE sightings.id='${id}'`;

    const whenSelected = (err, result) => {
      if (err)
      {
        console.log('Error when accessing note by id', err.stack);
        res.status(503).send(result);
        return;
      }
      const noteWriter = result.rows[0].username;
      sqlQuery = 'SELECT behaviors.behavior FROM behavior_sighting INNER JOIN behaviors ON behaviors.id = behavior_sighting.behavior_id WHERE sight_id = $1';
      pool.query(sqlQuery, [id], (err2, result2) => {
        const behaviors = result2.rows.map((b) => b.behavior);
        const behavStr = Array.isArray(behaviors) ? behaviors.join(', ') : behaviors;
        const note = {
          ...result.rows[0],
          fav: false,
          isEditable: hashItem(noteWriter + SALT) === user,
          behavior: behavStr,
          comments,
        };
        console.log('rendering note');
        res.render('note', note);
      });
    };
    pool.query(sqlQuery, whenSelected);
  });
};

const createNoteComment = (req, res) => {
  const { comment } = req.body;
  const { id } = req.params;

  let sqlQuery = 'SELECT id FROM users WHERE username=$1';
  pool.query(sqlQuery, [loggedInUser], (err2, result2) => {
    if (err2) throw err2;
    const index = result2.rows.length === 0 ? 0 : result2.rows[0].id;
    sqlQuery = 'INSERT INTO comments (sight_id, comment, commenter_id) VALUES ($1, $2, $3) RETURNING *';

    pool.query(sqlQuery, [id, comment, index], (err, result) => {
      if (err) throw err;
      console.log(result.rows);
      res.redirect(`/note/${id}`);
    });
  });
};

const renderAllNotes = (req, res) => {
  let sqlQuery = ' SELECT * FROM  sightings';
  pool.query(sqlQuery, (err, result) => {
    if (err)
    {
      console.log('error when viewing user notes', err.stack);
    }
    const sightings = result.rows;
    let queriesCompleted = 0;
    sightings.forEach((sight) => {
      sqlQuery = 'SELECT behaviors.behavior FROM behaviors INNER JOIN behavior_sighting ON behaviors.id = behavior_sighting.behavior_id WHERE behavior_sighting.sight_id= $1';

      pool.query(sqlQuery, [sight.id], (err2, result2) => {
        if (err2) throw err2;
        console.log('result2', result2.rows);
        sight.behavior = result2.rows.map((item) => item.behavior);
        queriesCompleted += 1;

        if (queriesCompleted === sightings.length)
        {
          const obj = {
            notes: sightings,
          };
          console.log(obj);
          res.render('index', obj);
        }
      });
    });
  });
};

const editNote = (req, res) => {
  const { id } = req.params;
  console.log(id);
  const whenSelected = (err, result) => {
    if (err)
    {
      console.log('Error when accessing note by id', err.stack);
      res.status(503).send(result.rows);
      return;
    }
    const note = {
      ...result.rows[0],
      title: 'Edit',
      action: `/note/${id}/edit?_method=PUT`,
    };
    res.render('edit', note);
  };
  const sqlQuery = `SELECT * FROM ${TABLE} WHERE id=${id}`;
  pool.query(sqlQuery, whenSelected);
};

const acceptNoteEdit = (req, res) => {
  const { id } = req.params;
  const note = req.body;

  const whenUpdated = (err, result) => {
    if (err)
    {
      console.log('Error when updating note', err.stack);
      res.status(503).send(result);
      return;
    }
    res.redirect(`/note/${id}`);
  };
  const sqlQuery = `UPDATE ${TABLE} 
  SET date='${note.date}',
  time='${note.time}',
  behavior='${note.behavior}',
  flock_size='${note.flock_size}' WHERE id=${id} RETURNING *`;

  pool.query(sqlQuery, whenUpdated);
};

const deleteNote = (req, res) => {
  const { id } = req.params;
  console.log(id);
  const whenDeleted = (err, result) => {
    if (err)
    {
      console.log('Error when deleting', err.stack);
      res.status(503).send(result);
      return;
    }
    res.redirect('/');
  };

  const sqlQuery = `DELETE FROM ${TABLE} WHERE id = ${id}`;
  pool.query(sqlQuery, whenDeleted);
};

const signUpForm = (req, res) => {
  const obj = {
    title: 'Sign up',
    action: '/signup',
  };
  res.render('login', obj);
};

const acceptSignUp = (req, res) => {
  // check if username alr existing
  // alert if existing, prompt to use another one
  const hashedPassword = hashItem(req.body.password + SALT);
  const values = [req.body.username, hashedPassword];

  const sqlQuery = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *';
  pool.query(sqlQuery, values, (err, result) => {
    if (err)
    {
      console.log('error with signup', err.stack);
      res.status(503).send(result);
      return;
    }
    console.log(result.rows);
    res.redirect('/');
  });
};
const loginForm = (req, res) => {
  const obj = {
    title: 'login',
    action: '/login',
  };
  res.render('login', obj);
};

const acceptLogin = (req, res) => {
  const whenLogIn = (err, result) => {
    if (err)
    {
      console.log('error when logging in', err.stack);
      res.status(503).send(result);
      return;
    }
    console.log(result.rows);
    if (result.rows.length === 0)
    {
      console.log('username does not exist');
      res.redirect('/login');
      return;
    }
    if (result.rows[0].password !== hashItem(req.body.password + SALT))
    {
      console.log('invalid password');
      res.redirect('/login');
      return;
    }
    loggedInUser = req.body.username;
    const hashedUser = hashItem(req.body.username + SALT);
    res.cookie('user', hashedUser);
    res.cookie('logged-in', true);
    // could redirect to user profile page/ page with all user notes
    res.redirect('/');
  };
  const sqlQuery = `SELECT * FROM users WHERE username = '${req.body.username}'`;
  pool.query(sqlQuery, whenLogIn);
};

const logUserOut = (req, res) => {
  loggedInUser = '';
  res.cookie('logged-in', false);
  res.clearCookie('user');
  res.redirect('/');
};

const userNotes = (req, res) => {
  const { id } = req.params;

  let sqlQuery = `SELECT * FROM sightings WHERE user_id = ${id}`;
  pool.query(sqlQuery, (err, result) => {
    if (err)
    {
      console.log('error when viewing user notes', err.stack);
    }
    const sightings = result.rows;
    sqlQuery = 'SELECT * FROM comments WHERE commenter_id = $1';
    pool.query(sqlQuery, [id], (err3, result3) => {
      if (err3) throw err3;
      const comments = result3.rows;
      console.log(comments);

      let queriesCompleted = 0;
      sightings.forEach((sight) => {
        sqlQuery = 'SELECT behaviors.behavior FROM behaviors INNER JOIN behavior_sighting ON behaviors.id = behavior_sighting.behavior_id WHERE behavior_sighting.sight_id= $1';

        pool.query(sqlQuery, [sight.id], (err2, result2) => {
          if (err2) throw err2;
          console.log('result2', result2.rows);
          sight.behavior = result2.rows.map((item) => item.behavior);
          queriesCompleted += 1;

          if (queriesCompleted === sightings.length)
          {
            const obj = {
              notes: sightings,
              comments,
            };
            console.log(obj);
            res.render('index', obj);
          }
        });
      });
    });
  });
};

const userList = (req, res) => {
  const handleUsers = (err, result) => {
    if (err)
    {
      console.log('Error on user listing', err.stack);
      res.status(503).send('User list error');
    }
    const obj = {
      users: result.rows,
    };
    res.render('users', obj);
  };

  const sqlQuery = `SELECT DISTINCT users.id, username FROM users RIGHT JOIN ${TABLE} ON users.id=${TABLE}.user_id WHERE ${TABLE}.user_id IS NOT NULL`;

  pool.query(sqlQuery, handleUsers);
};

const newSpecies = (req, res) => {
  console.log('request came in');
  const emptySpecies = {
    title: 'New species',
    action: '/species',
  };
  res.render('species-form', emptySpecies);
};

const acceptNewSpecies = (req, res) => {
  const obj = req.body;
  const whenDoneSpeciesAdd = (err, result) => {
    if (err) {
      console.log('Error while adding species', err.stack);
      res.status(503).send(result);
      return;
    }
    res.redirect(`/species/${result.rows[0].id}`);
  };

  const sqlQuery = `INSERT INTO species (name, scientific_name) VALUES ('${obj.name}', '${obj.scientificName}') RETURNING id`;
  pool.query(sqlQuery, whenDoneSpeciesAdd);
};

const renderSpecies = (req, res) => {
  const { index } = req.params;

  const sqlQuery = 'SELECT * FROM species WHERE id = $1';
  pool.query(sqlQuery, [...index], (err, result) => {
    if (err)
    {
      console.log('error when accessing species', err.stack);
      return;
    }

    res.render('one-species', result.rows[0]);
  });
};

const renderAllSpecies = (req, res) => {
  const sqlQuery = 'SELECT * FROM species';
  pool.query(sqlQuery, (err, result) => {
    if (err)
    {
      console.log('Error when accessing species index', err.stack);
      res.status(503).send(result.rows);
      return;
    }
    console.log(result.rows);
    const obj = {
      species: result.rows,
    };
    console.log(obj);
    res.render('specieses', obj);
  });
};

const renderBehaviors = (req, res) =>
{
  const sqlQuery = 'SELECT * FROM behavior_sighting INNER JOIN behaviors ON behavior_sighting.behavior_id=behaviors.id';
  pool.query(sqlQuery, (err, result) => {
    const obj = {
      behaviors: result.rows,
    };
    console.log(obj);
    res.render('behaviors', obj);
  });
};

const behaviorSighting = (req, res) => {
  const { id } = req.params;

  const sqlQuery = `SELECT sightings.id, joinedBehavior.behavior, sightings.date, sightings.time, sightings.flock_size, sightings.user_id, sightings.species_id FROM (SELECT behavior, sight_id  FROM behavior_sighting INNER JOIN behaviors ON behaviors.id = behavior_sighting.behavior_id WHERE behaviors.id=${id}) AS joinedBehavior  INNER JOIN sightings ON sightings.id = joinedBehavior.sight_id`;
  pool.query(sqlQuery, (err, result) => {
    if (err)
    {
      console.log('Error when accessing notes', err.stack);
      res.status(503).send(result.rows);
      return;
    }
    console.log(result.rows);
    const obj = {
      notes: result.rows,

    };
    res.render('index', obj);
  });
};
app.get('/note', createNote);
app.post('/note', acceptNewNote);
app.get('/note/:id', renderNote);
app.post('/note/:id/comment', createNoteComment);
app.get('/', renderAllNotes);
app.get('/note/:id/edit', editNote);
app.put('/note/:id/edit', acceptNoteEdit);
app.get('/note.:id/fav', (req, res) => { res.status(404).send('No fav page yet'); });
app.delete('/note/:id/delete', deleteNote);

app.get('/signup', signUpForm);
app.post('/signup', acceptSignUp);
app.get('/login', loginForm);
app.post('/login', acceptLogin);
app.delete('/logout', logUserOut);
// your notes
app.get('/users/:id', userNotes);
app.get('/users', userList);

// POCE 7 Bird watching species
app.get('/species', newSpecies);
app.post('/species', acceptNewSpecies);
app.get('/species/all', renderAllSpecies);
app.get('/species/:index', renderSpecies);

// app.get('/species/:index/edit', editSpecies);
// app.put('/species/:index/edit', acceptSpeciesEdit);
// app.delete('/species/:index/delete', deleteSpecies);

// POCE 8 bird watching behavior
app.get('/behaviours', renderBehaviors);
app.get('/behaviours/:id', behaviorSighting);
const PORT = process.argv[2];
app.listen(PORT);
