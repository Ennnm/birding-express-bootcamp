DROP TABLE IF EXISTS sightings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS species CASCADE;
DROP TABLE IF EXISTS behaviors CASCADE;
DROP TABLE IF EXISTS behavior_sighting CASCADE;
DROP TABLE IF EXISTS comments CASCADE;


CREATE TABLE IF NOT EXISTS sightings (id SERIAL PRIMARY KEY, date DATE, time TIME, flock_size INTEGER, user_id INTEGER, species_id INTEGER);

INSERT INTO sightings (date, time, flock_size, user_id, species_id) VALUES ('2019-01-01',  '14:00:00', 15, 1, 1);
INSERT INTO sightings (date, time, flock_size, user_id, species_id) VALUES ('2019-03-01',  '15:00:00', 1 , 1, 2);
INSERT INTO sightings (date, time, flock_size, user_id, species_id) VALUES ('2020-08-01',  '17:00:00', 4 , 1, 3);
INSERT INTO sightings (date, time, flock_size, user_id, species_id) VALUES ('2020-01-01',  '08:00:00', 3 , 1, 4);

CREATE TABLE users (id SERIAL PRIMARY KEY, username TEXT, password TEXT);
INSERT INTO users (id, username) VALUES (0, 'anon');

CREATE TABLE IF NOT EXISTS species  (id SERIAL PRIMARY KEY, name TEXT, scientific_name TEXT);

INSERT INTO species  (name, scientific_name) VALUES ('King Quail', 'Excalfactoria chinensis');
INSERT INTO species (name, scientific_name) VALUES ('Red Junglefowl', 'Gallus gallus');
INSERT INTO species (name, scientific_name) VALUES ('Wandering Whistling Duck', 'Dendrocygna arcuata');
INSERT INTO species (name, scientific_name) VALUES ('Lesser Whistling Duck', 'Dendrocygna javanica');
INSERT INTO species (name, scientific_name) VALUES ('Cotton Pygmy Goose', 'Nettapus coromandelianus');

CREATE TABLE IF NOT EXISTS behaviors (id SERIAL PRIMARY KEY, behavior TEXT);

INSERT INTO behaviors (behavior) VALUES ('walking'),
                                        ('bathing'),
                                        ('resting'),
                                        ('gathering nesting materials'),
                                        ('mobbing'),
                                        ('long song');

CREATE TABLE IF NOT EXISTS behavior_sighting(id SERIAL PRIMARY KEY, sight_id INTEGER, behavior_id INTEGER);

INSERT INTO behavior_sighting (sight_id, behavior_id) VALUES (1,2), (1,5) , (2,6), (2,3), (3,3), (3,4), (4,1);

CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, sight_id INTEGER, comment TEXT, commenter_id INTEGER,FOREIGN KEY (sight_id) REFERENCES sightings(id));