import {
    Application,
    Router,
    send,
  } from "https://deno.land/x/oak@v7.4.1/mod.ts";
  import { Client } from "https://deno.land/x/postgres/mod.ts";
  import sodium from "https://deno.land/x/sodium/basic.ts";
  import * as log from "https://deno.land/std/log/mod.ts";
  
  const client = new Client({
    user: "postgres",
    database: "poemZone",
    hostname: "localhost",
    password: "2ur2l3Dov3",
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

    // Check that the password matches
    const matches = sodium.crypto_pwhash_str_verify(
      db_user.user_pw,
      password,
    );

    if (!matches) {
      context.response.status = 400;
      context.response.body = {"error": "Requires a name or a password"};
    return;
    } else {
      console.log(`Password matches! Welcome ${db_user.user_full_name}`);
    }
  }
});

router.post('/api/poems/:poem_id/posts', async (context) => {
  if(!context.request.hasBody) {
    context.response.status = 400;
    context.response.body = {"error": "Expected a JSON object body"};
    return;
  }

  const user = await context.request.body('json').value;

  if(!user.text) {
    context.response.status = 400;
    context.response.body = {"error": "Requires a name or a description"};
    return;
  }

  const insertResults = await client.queryObject`INSERT INTO POEMCOMMENTS 
  (comment_text, user_id, poem_id) 
  VALUES ( ${user.text}, ${user.user_id}, ${context.params.poem_id}) 
  RETURNING (comment_id)`;

  console.log(insertResults.rows[0])
  if(insertResults.rowCount === 0) {
    context.response.status = 400;
    context.response.body = {"error": "Error inserting comment"};
    return;
  } else {
    context.response.status = 201;
    context.response.body = insertResults.rows[0];  
  };
});

/* Return the user with a given username */
router.get('/api/users/:user_name', async (context) => {
  if (context.params.user_name) {
    const results = await client.queryObject`SELECT 
    user_id, user_name, user_full_name 
    FROM pzusers WHERE user_name=${context.params.user_name}`;
    if (!results.rows.length) {
      context.response.status = 400;
      context.response.body = {"error": "Username not found"};
    } else {
        context.response.body = results.rows[0];
    }
  }
});

router.get('/api/poems/:poem_id/body', async (context) => {
  if (context.params.poem_id) {
    const results = await client.queryObject`SELECT 
    poems.poem_id, poems.poem_body, poemcomments.comment_text, poemcomments.comment_id, pzusers.user_name
    FROM poems
    INNER JOIN poemcomments ON poems.poem_id=poemcomments.poem_id
    INNER JOIN pzusers ON poemcomments.user_id=pzusers.user_id
    WHERE poems.poem_id = ${context.params.poem_id}
    GROUP BY poemcomments.comment_id, poems.poem_id, poemcomments.comment_text, pzusers.user_name
    ORDER BY poemcomments.comment_id`;

    if (!results.rows.length) {
      context.response.status = 400;
      context.response.body = {"error": "Username not found"};
    } else {
      context.response.body = results.rows.map(r => (
        {...r, _url: `/api/poems/${r.id}`}    // this is the "spread" operator
      ))}
}
})

// Set up a route to listen to /api/poems
router.get("/api/poems", async (context) => {
  const results = await client.queryObject`SELECT 
  poems.poem_id, poem_title, poem_body, poems.user_id, pzusers.user_name, CAST(AVG(ratings.poem_rating) AS DECIMAL(2,1)) AS avg_rating
  FROM poems
  INNER JOIN pzusers ON poems.user_id=pzusers.user_id
  INNER JOIN ratings ON poems.poem_id=ratings.poem_id
  GROUP BY poems.poem_id, pzusers.user_name
  ORDER BY avg_rating DESC;`;

  context.response.body = results.rows.map(data => (
      {...data, _url: `/api/poems/${data.poem_id}`}    // this is the "spread" operator
  ));
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