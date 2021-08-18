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

const test = (req, res) => {
  const sqlQuery = `SELECT * FROM ${TABLE}`;
  pool.query(sqlQuery, (err, result) => {
    res.send(result);
  });
};
app.get('/note', renderCreateForm);
app.post('/note', acceptNewNote);
// app.get('/note/:id', renderNote);
// app.get('/', indexHandler);
app.get('/', test);

app.listen(3004);
