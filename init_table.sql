CREATE TABLE sightings (id SERIAL PRIMARY KEY, date DATE, time TIME, behavior TEXT, flock_size INTEGER );

INSERT INTO sightings (date, time, behavior, flock_size) VALUES ('2019-01-01',  '14:00:00', 'preening', 15 );
INSERT INTO sightings (date, time, behavior, flock_size) VALUES ('2019-03-01',  '15:00:00', 'preyed', 1 );
INSERT INTO sightings (date, time, behavior, flock_size) VALUES ('2020-08-01',  '17:00:00', 'foraging', 4 );
INSERT INTO sightings (date, time, behavior, flock_size) VALUES ('2020-01-01',  '08:00:00', 'flying', 3 );

CREATE TABLE users (id SERIAL PRIMARY KEY, username TEXT, password TEXT);

ALTER TABLE sightings ADD user_id INTEGER;

SELECT * FROM sightings INNER JOIN users  ON sightings.user_id = users.id WHERE users.id=1;

CREATE TABLE species (id SERIAL PRIMARY KEY, name TEXT, scientific_name TEXT);

INSERT INTO species (name, scientific_name) VALUES ('King Quail', 'Excalfactoria chinensis');
INSERT INTO species (name, scientific_name) VALUES ('Red Junglefowl', 'Gallus gallus');
INSERT INTO species (name, scientific_name) VALUES ('Wandering Whistling Duck', 'Dendrocygna arcuata');
INSERT INTO species (name, scientific_name) VALUES ('Lesser Whistling Duck', 'Dendrocygna javanica');
INSERT INTO species (name, scientific_name) VALUES ('Cotton Pygmy Goose', 'Nettapus coromandelianus');