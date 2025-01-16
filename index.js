import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123456",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let users = [];

async function checkVisisted(){
  try {
    const result = await db.query(
      "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ", [currentUserId]);
    let countries = [];
    result.rows.forEach((country) => {
      countries.push(country.country_code);
    });
    return countries;
  } catch (error) {
    console.log(error);
  }
};

async function checkCurrentUser(){
  try {
    const result = await db.query("SELECT * FROM users;");
    users = result.rows;
    return result.rows.find((user) => user.id == currentUserId);
  } catch (error) {
    console.log(error);
  }
};

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await checkCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    if (result.rows.length !== 0) {
      const data = result.rows[0];
      const countryCode = data.country_code;

      try {
        await db.query("INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2);", [countryCode, currentUserId]);
        res.redirect("/");
      } catch (err) {
        console.log(err);
        const countries = await checkVisisted();
        const currentUser = await checkCurrentUser();
        res.render("index.ejs",{error: "Country already added", countries: countries, total: countries.length, users: users, color: currentUser.color})
    }}
  } catch (err) {
    console.log(err);
    const countries = await checkVisisted();
    const currentUser = await checkCurrentUser();
    res.render("index.ejs",{error: "Country does not exist", countries: countries, total: countries.length, users: users, color: currentUser.color})
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const result = await db.query(
    "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *;", [req.body.name, req.body.color]);
  const userId = result.rows[0].id;
  currentUserId = userId;
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
