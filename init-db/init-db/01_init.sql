-- Criar schema
CREATE SCHEMA IF NOT EXISTS hydrian;

-- Tabela users
CREATE TABLE IF NOT EXISTS hydrian.users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT,
    created_at DATE NOT NULL,
    token TEXT
);

CREATE TABLE IF NOT EXISTS hydrian.sensors (
    id_sensor SERIAL PRIMARY KEY,
    sensor_name TEXT NOT NULL,
    user_id INT NOT NULL REFERENCES hydrian.users(id),
    equip TEXT NOT NULL,
    image BYTEA NOT NULL,
    image_type TEXT NOT NULL,
    location TEXT NOT NULL,
    host TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);