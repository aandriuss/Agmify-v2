CREATE USER keycloak WITH
    LOGIN
    NOSUPERUSER
    INHERIT
    PASSWORD 'keycloak';

CREATE DATABASE keycloak
    WITH 
    OWNER = speckle
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

\c keycloak;

CREATE SCHEMA IF NOT EXISTS public;
GRANT ALL PRIVILEGES ON DATABASE keycloak TO speckle;
GRANT ALL PRIVILEGES ON SCHEMA public TO speckle;