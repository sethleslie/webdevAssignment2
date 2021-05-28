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

router.post("/api/login", async (context) => {

    if(!context.request.hasBody) {
    context.response.status = 400;
    context.response.body = {"error": "Expected a JSON object body"};
    return;
  }

  const user = await context.request.body('json').value;
  const password = user.user_pw;


  if(!user.user_name || !user.user_pw) {
    context.response.status = 400;
    context.response.body = {"error": "Requires a name or a password"};
    return;
  }
 
  const results = await client.queryObject`SELECT
  user_name, user_full_name, user_pw
  FROM pzusers WHERE user_name=${user.user_name}`;

  if (!results.rows.length) {
    console.log("Not found!");
  } else {
    // We have a user
    context.response.status = 201;
    const db_user = results.rows[0];
    context.response.body = db_user;
    console.log(password);

    // Check that the password matches
    const matches = sodium.crypto_pwhash_str_verify(
      db_user.user_pw,
      password,
    );

    if (!matches) {
      console.log("Incorrect password");
      context.response.status = 400;
      context.response.body = {"error": "Requires a name or a password"};
    return;
    } else {
      console.log(`Password matches! Welcome ${db_user.user_full_name}`);
    }
  }
});

/* Return the user with a given username */
router.get('/api/users/:user_name', async (context) => {
  if (context.params.user_name) {
    const results = await client.queryObject`SELECT 
    user_name, user_full_name 
    FROM pzusers WHERE user_name=${context.params.user_name}`;
    if (!results.rows.length) {
      context.response.status = 400;
      context.response.body = {"error": "Username not found"};
    } else {
        context.response.body = results.rows[0];
    }
  }
});


app.use(router.routes());
app.use(router.allowedMethods());


app.use(async (context) => {
  const filePath = context.request.url.pathname;
  const fileWhitelist = ["/index.html", "/js/frontend.js", "/css/styles.css"];

  if (fileWhitelist.includes(filePath)) {
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