CREATE TABLE sightings (id SERIAL PRIMARY KEY, date DATE, time TIME, behavior TEXT, flock_size INTEGER );

INSERT INTO sightings (date, time, behavior, flock_size) VALUES ('2019-01-01',  '14:00:00', 'preening', 15 );
INSERT INTO sightings (date, time, behavior, flock_size) VALUES ('2019-03-01',  '15:00:00', 'preyed', 1 );
INSERT INTO sightings (date, time, behavior, flock_size) VALUES ('2020-08-01',  '17:00:00', 'foraging', 4 );
INSERT INTO sightings (date, time, behavior, flock_size) VALUES ('2020-01-01',  '08:00:00', 'flying', 3 );