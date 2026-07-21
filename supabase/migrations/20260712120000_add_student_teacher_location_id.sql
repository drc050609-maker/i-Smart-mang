-- Scope students and teachers to a campus location (Brooklyn / Staten Island).

ALTER TABLE students
  ADD COLUMN location_id bigint REFERENCES public.locations (id) ON DELETE SET NULL;

ALTER TABLE teachers
  ADD COLUMN location_id bigint REFERENCES public.locations (id) ON DELETE SET NULL;

UPDATE students
SET location_id = (SELECT id FROM locations WHERE slug = 'brooklyn')
WHERE location_id IS NULL;

UPDATE teachers
SET location_id = (SELECT id FROM locations WHERE slug = 'brooklyn')
WHERE location_id IS NULL;

UPDATE classes
SET location_id = (SELECT id FROM locations WHERE slug = 'brooklyn')
WHERE location_id IS NULL;

CREATE INDEX students_location_id_idx ON students (location_id);
CREATE INDEX teachers_location_id_idx ON teachers (location_id);

-- Ensure Staten Island has at least one room for new classes.
INSERT INTO rooms (room_number, class_size, location_id)
SELECT 'SI-1', 8, locations.id
FROM locations
WHERE locations.slug = 'staten_island'
  AND NOT EXISTS (
    SELECT 1
    FROM rooms
    WHERE rooms.location_id = locations.id
  );
