-- Criar schema
CREATE SCHEMA IF NOT EXISTS hydrian;

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
    image BYTEA,
    image_type TEXT,
    location TEXT NOT NULL,
    host TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hydrian.sensor_data_raw (
    id SERIAL PRIMARY KEY,
    sensor_id INT NOT NULL REFERENCES hydrian.sensors(id_sensor) ON DELETE CASCADE,
    user_id INT,
    ax FLOAT,
    ay FLOAT,
    az FLOAT,
    gx FLOAT,
    gy FLOAT,
    gz FLOAT,
    temp FLOAT,
    uptime_ms INT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS hydrian.sensor_data_processed (
    id SERIAL PRIMARY KEY,
    sensor_id INT NOT NULL REFERENCES hydrian.sensors(id_sensor),
    user_id INT,
    
    fft_ax BYTEA,
    fft_ay BYTEA,
    fft_az BYTEA,

    rms FLOAT,
    peak FLOAT,
    crest_factor FLOAT,
    kurtosis FLOAT,

    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_id ON hydrian.sensor_data_raw(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON hydrian.sensor_data_raw(timestamp);
