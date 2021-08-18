import express from 'express';
import methodOverride from 'method-override';
import moment from 'moment';
import pg from 'pg';

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

const renderCreateForm = (req, res) => {
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
      res.status(503).send(result.rows);
      return;
    }
    res.send(result.rows);
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
    res.send(result.rows);
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
    // res.send(result.rows);
    const obj = {
      notes: result.rows,
    };
    console.log(result.rows);
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

app.get('/note', renderCreateForm);
app.post('/note', acceptNewNote);
app.get('/note/:id', renderNote);
app.get('/', renderAllNotes);
app.get('/note/:id/edit', editNote);
app.put('/note/:id/edit', acceptNoteEdit);

app.delete('/note/:id/delete', deleteNote);
// test delete with "/sighting/<%=sight.id%>/delete?_method=DELETE"?? need a whole button to use?
app.listen(3004);
