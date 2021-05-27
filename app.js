import {
    Application,
    Router,
    //send,
  } from "https://deno.land/x/oak@v7.4.1/mod.ts";
  import { Client } from "https://deno.land/x/postgres/mod.ts";
  import sodium from "https://deno.land/x/sodium/basic.ts";
  
  const client = new Client({
    user: "assignment2",
    database: "poemZone",
    hostname: "localhost",
    password: "Assignment2",
    port: 5432,
  });
  await client.connect();
  await sodium.ready;
  
  const app = new Application();
  const router = new Router();


 // const username = document.getElementById("username-input").value;
 //const password = document.getElementById("password-input").value;

 const username = prompt("Enter User Name");
 const password = prompt("Enter Password");

  const results = await client.queryObject`SELECT
    user_name, user_full_name, user_pw
    FROM pzusers WHERE user_name=${username}`;

if (!results.rows.length) {
  console.log("Not found!");
} else {
  // We have a user
  const db_user = results.rows[0];

  // Check that the password matches
  const matches = sodium.crypto_pwhash_str_verify(
    db_user.user_pw,
    password,
  );

  if (!matches) {
    console.log("Incorrect password");
  } else {
    console.log(`Password matches! Welcome ${db_user.user_full_name}`);
  }
}

