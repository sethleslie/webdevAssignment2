import {
    Application,
    Router,
    send,
  } from "https://deno.land/x/oak@v7.4.1/mod.ts";
  import { Client } from "https://deno.land/x/postgres/mod.ts";
  import sodium from "https://deno.land/x/sodium/basic.ts";
  import * as log from "https://deno.land/std/log/mod.ts";
  
  const client = new Client({
    user: "assignment2",
    database: "poemZone",
    hostname: "localhost",
    password: "Assignment2",
    port: 5432,
  });

  await client.connect();
  await sodium.ready;
  const PORT = 3000;
  
  const app = new Application();
  const router = new Router();


 //const username = document.getElementById("username-input").value;
 //const password = document.getElementById("password-input").value;

/*  const username = prompt("Enter User Name");
 const password = prompt("Enter Password"); */

/*  router.post("/api/login", async (context) => {
  const data = await context.request.body();
  const value = await data.value;
  context.response.status = 201;
  context.response.headers.set("Content-Type", "application/json");
  context.response.body = value;
  console.log(value);
}); */

router.post("/api/login", async (context) => {

    if(!context.request.hasBody) {
    context.response.status = 400;
    context.response.body = {"error": "Expected a JSON object body"};
    return;
  }

  const user = await context.request.body('json').value;
  console.log(user);
  const password = user.user_pw;


  if(!user.user_name || !user.user_pw) {
    console.log("No user info entered");
    context.response.status = 400;
    context.response.body = {"error": "Requires a name or a password"};
    return;
  }
 
  const results = await client.queryObject`SELECT
  user_name, user_full_name, user_pw
  FROM pzusers WHERE user_name=${user.user_name}`;
  console.log(results.rows[0]);
  console.log("Length of row: " + results.rows.length);

  if (!results.rows.length) {
    console.log("Not found!");
  } else {
    // We have a user
    console.log("we're in the else statement");
    context.response.status = 201;
    console.log("Status is set to: " + context.response.status)
    const db_user = results.rows[0];
    console.log("db_user name = " + db_user.user_name);
    context.response.body = db_user;
    console.log("response password: " + context.response.body.user_pw);
    console.log(password);

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
});


app.use(router.routes());
app.use(router.allowedMethods());


app.use(async (context) => {
  const filePath = context.request.url.pathname;
  const fileWhitelist = ["/index.html", "/js/frontend.js", "/css/styles.css"];
  console.log(filePath);

  if (fileWhitelist.includes(filePath)) {
    console.log(filePath);
    await send(context, filePath, {
      root: `${Deno.cwd()}/static`,
    });
  }
});

if (import.meta.main) {
    log.info(`Starting server on port: ${PORT}...`);
    await app.listen({
        port: PORT,
    });
}