DROP TABLE client;
CREATE TABLE client(
  _id  SERIAL PRIMARY KEY,
  session  VARCHAR(100) NOT NULL,
  state VARCHAR NOT NULL
);

INSERT INTO client (session, state) VALUES ('exampleSession', 'hello, world');