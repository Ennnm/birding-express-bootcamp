import express from 'express';
import methodOverride from 'method-override';
import moment from 'moment';
import pg from 'pg';
import jsSHA from 'jssha';

const { Pool } = pg;
const app = express();

app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
// app.use(cookieParser());

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

const pgConnectionConfigs = {
  user: 'en',
  host: 'localhost',
  database: 'birding',
  port: 5432,
};
const TABLE = 'sightings';

const pool = new Pool(pgConnectionConfigs);

const createNote = (req, res) => {
  console.log('request came in');
  const emptyNote = {
    title: 'New birding note',
    action: '/note',
  };
  res.render('edit', emptyNote);
};

const acceptNewNote = (req, res) => {
  const obj = req.body;

  const whenDoneWithAdd = (err, result) => {
    if (err) {
      console.log('Error while adding note', err.stack);
      res.status(503).send(result);
      return;
    }
    res.redirect(`/note/${result.rows[0].id}`);
  };

  const sqlQuery = `INSERT INTO ${TABLE} (date, time, behavior, flock_size) VALUES ('${obj.date}', '${obj.time}', '${obj.behavior}', '${obj.flock_size}') RETURNING *`;
  pool.query(sqlQuery, whenDoneWithAdd);
};

const renderNote = (req, res) => {
  const whenSelected = (err, result) => {
    if (err)
    {
      console.log('Error when accessing note by id', err.stack);
      res.status(503).send(result.rows);
      return;
    }
    const note = {
      ...result.rows[0],
      fav: false,
    };
    res.render('note', note);
  };

  const { id } = req.params;
  const sqlQuery = `SELECT * FROM ${TABLE} WHERE id=${id}`;
  pool.query(sqlQuery, whenSelected);
};

const renderAllNotes = (req, res) => {
  const sqlQuery = `SELECT * FROM ${TABLE}`;
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

const editNote = (req, res) => {
  const { id } = req.params;
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

const hashItem = (text) => {
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  shaObj.update(text);
  return shaObj.getHash('HEX');
};

const acceptSignUp = (req, res) => {
  // check if username alr existing
  // alert if existing, prompt to use another one
  const hashedPassword = hashItem(req.body.password);
  const values = [req.body.username, hashedPassword];

  const sqlQuery = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *';
  pool.query(sqlQuery, values, (err, result) => {
    if (err)
    {
      console.log('error with signup', err.stack);
      res.status(503).send(result);
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
    }
    if (result.rows.length === 0)
    {
      console.log('username does not exist');
      res.redirect('/login');
    }
    if (result.rows[0].password !== hashItem(req.body.password))
    {
      console.log('invalid password');
      res.redirect('/login');
    }
    res.cookie('user', req.body.username);
    res.cookie('logged-in', true);
    // could redirect to user profile page/ page with all user notes
    res.redirect('/');
  };
  const sqlQuery = `SELECT * FROM users WHERE username = '${req.body.username}'`;
  pool.query(sqlQuery, whenLogIn);
};

const logUserOut = (req, res) => {
  // console.log(req.baseUrl);
  // console.log(req.originalUrl);

  res.cookie('logged-in', false);
  res.clearCookie('user');
  res.redirect('/');
};

app.get('/note', createNote);
app.post('/note', acceptNewNote);
app.get('/note/:id', renderNote);
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
app.listen(3004);
