import {Pool} from 'pg';

export const pool = new Pool({
  user: "myuser",
  host: "192.168.56.11",
  database: "game",
  password: "mypassword",
  port: 5432,
});
