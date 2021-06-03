import {
    Application,
    Router,
    send,
  } from "https://deno.land/x/oak@v7.4.1/mod.ts";
  import { Client } from "https://deno.land/x/postgres/mod.ts";
  import sodium from "https://deno.land/x/sodium/basic.ts";
  import * as log from "https://deno.land/std/log/mod.ts";
  import * as djwt from "https://deno.land/x/djwt@v2.2/mod.ts";
  
  const client = new Client({
    user: "postgres",
    //user: "assignment2"
    database: "poemZone",
    hostname: "localhost",
    password: "2ur2l3Dov3",
    // password: "Assignment2",
    port: 5432,
  });

  await client.connect();
  await sodium.ready;
  const PORT = 3000;
  
  const app = new Application();
  const router = new Router();

  const secretKey = "44226452948404D635166546A576E";
  const jwtAlgorithm = "HS256";


router.post("/api/newPoem", async (context) => {
  
  if(!context.request.hasBody) {
    context.response.status = 400;
    context.response.body = {"error": "Expected a JSON object body"};
    return;
  }

  const newPoem = await context.request.body('json').value;
  const insertNewPoem = await client.queryObject`INSERT INTO POEMS
  (poem_title, poem_body, user_id)
  VALUES ( ${newPoem.poem_title}, ${newPoem.poem_body}, ${newPoem.user_id})
  RETURNING (poem_id)`;
  

  if(insertNewPoem.rowCount === 0) {
    context.response.status = 400;
    context.response.body = {"error": "Error inserting new poem"};
    return;
  } else {
    context.response.status = 201;
    const thisPoem = insertNewPoem.rows[0];
    context.response.body = thisPoem;

    await client.queryObject`INSERT INTO RATINGS
    (user_id, poem_id, poem_rating)
    VALUES ( ${newPoem.user_id}, ${thisPoem.poem_id}, 0)`;

    await client.queryObject`INSERT INTO POEMCOMMENTS
    (comment_text, user_id, poem_id)
    VALUES ( 'My new poem', ${newPoem.user_id}, ${thisPoem.poem_id})`;
  }; 

})

router.post("/api/poems/newRating", async (context) => {
  if(!context.request.hasBody) {
    context.response.status = 400;
    context.response.body = {"error": "Expected a JSON object body"};
    return;
  }

  const newRating = await context.request.body('json').value;
  const insertNewRating = await client.queryObject`INSERT INTO RATINGS
  (user_id, poem_id, poem_rating)
  VALUES ( ${newRating.user_id}, ${newRating.poem_id}, ${newRating.poem_rating})
  RETURNING (poem_rating)`;

  if(insertNewRating.rowCount === 0) {
    context.response.status = 400;
    context.response.body = {"error": "Error inserting new rating"};
    return;
  } else {
    context.response.status = 201;
    const thisRating = insertNewRating.rows[0];
    context.response.body = thisRating;
  }
});

router.post("/api/newUser", async (context) => {

  if(!context.request.hasBody) {
    context.response.status = 400;
    context.response.body = {"error": "Expected a JSON object body"};
    return;
  }

  const newUser = await context.request.body('json').value;

  const userCheck = await client.queryObject`SELECT
  user_name, user_full_name, user_pw
  FROM pzusers WHERE user_name=${newUser.user_name}`;

  if(userCheck.rowCount !== 0){
    context.response.status = 400;
    context.response.body = {"error": "User already exists!"};
    return;
    }

  let hashedpword = sodium.crypto_pwhash_str(newUser.user_pw,
  sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
  sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE);
  
  const insertUser = await client.queryObject`INSERT INTO PZUSERS 
  (user_name, user_full_name, user_pw) 
  VALUES ( ${newUser.user_name}, ${newUser.user_full_name}, ${hashedpword}) 
  RETURNING (user_id)`;

  if(insertUser.rowCount === 0) {
    context.response.status = 400;
    context.response.body = {"error": "Error inserting new user"};
    return;
  } else {
    context.response.status = 201;
    const thisUser = insertUser.rows[0];
    context.response.body = thisUser;  
  }; 
})

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
    //context.response.body = db_user;

    // Check that the password matches
    const matches = sodium.crypto_pwhash_str_verify(
      db_user.user_pw,
      password,
    );

    if (!matches) {
      context.response.status = 400;
      context.response.body = {"error": "Password incorrect!"};
    } else {
      console.log(`Password matches! Welcome ${db_user.user_full_name}`);
      const jwt = await djwt.create(
        { alg: jwtAlgorithm, typ: "JWT" }, // header. typ is always JWT
        {
          exp: djwt.getNumericDate(60 * 15), // set it to expire in 15 minutes
          user_id: db_user.user_id,            // any other keys we like
        },
        secretKey,
      );

      context.response.body = JSON.stringify(jwt);
      context.response.type = 'json';
    
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

  if(insertResults.rowCount === 0) {
    context.response.status = 400;
    context.response.body = {"error": "Error inserting comment"};
    return;
  } else {
    context.response.status = 201;
    context.response.body = insertResults.rows[0];  
  };
});

router.get('/api/poems/:poem_id/rating/:user_id', async (context) => {
  console.log();
  if (context.params.poem_id && context.params.user_id) {
    const result = await client.queryObject`SELECT * FROM
    RATINGS
    WHERE user_id = ${context.params.user_id} AND poem_id = ${context.params.poem_id}`;
    if (result.rows.length > 0) {
      context.response.status = 400;
      return;
    } else {
      context.response.status = 201;
    }
  }
})

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
  poems.poem_id, poem_title, poem_body, poems.user_id, pzusers.user_name, CAST(AVG(NULLIF(ratings.poem_rating, 0)) AS DECIMAL(2,1)) AS avg_rating
  FROM poems
  INNER JOIN pzusers ON poems.user_id=pzusers.user_id
  INNER JOIN ratings ON poems.poem_id=ratings.poem_id
  GROUP BY poems.poem_id, pzusers.user_name;`;

  context.response.body = results.rows.map(data => (
      {...data, _url: `/api/poems/${data.poem_id}`}    // this is the "spread" operator
  ));
});

router.get("/api/poems/:user_id/notFavs", async (context) => {
  if (context.params.user_id) {
  const results = await client.queryObject`SELECT poem_id
  FROM RATINGS
  WHERE user_id = ${context.params.user_id} AND poem_rating <= 3;`;
  if (results.rows.length) {
      context.response.status = 201;
      context.response.body = results.rows.map(data => (
      {...data, _url: `/api/poems/user_id/notFavs/${data.poem_id}`}    // this is the "spread" operator
      ));
  } else {
    context.response.status = 400;
    context.response.body = {"error": "You have no favourites!"}
    }
  };
});

router.delete("/api/deleteComment/:comment_id", async (context) => {
  if(context.params.comment_id) {

    const deleteComment = await client.queryObject`DELETE FROM
    POEMCOMMENTS
    WHERE comment_id = ${context.params.comment_id}
    RETURNING comment_id`;
    //Why does this comparison return false?
    if(deleteComment.rows[0].comment_id === context.params.comment_id) {
      context.response.status = 400
      context.response.body = {"error": "comment not deleted"};
      return;
    } else {
      context.response.status = 201;
    }
  }
})


app.use(async (context, next) => {
  const filePath = context.request.url.pathname;
  const fileWhitelist = ["/index.html", "/js/frontend.js", "/css/styles.css"];

  if (fileWhitelist.includes(filePath)) {
    await send(context, filePath, {
      root: `${Deno.cwd()}/static`,
    });
    return;
  }
  await next();
});

app.use(async (context, next) => {
  if(context.request.url.pathname === '/api/login') {
    await next();
    return;
  }
  const token = context.request.headers.get('Authorization');
  try {
    await djwt.verify(token, secretKey, jwtAlgorithm);
    await next();
  } catch (ex) {
    context.response.status = 401;
    context.response.body =
      {"error": "JWT Authentication error"};
  }
});

app.use(router.routes());
app.use(router.allowedMethods());


if (import.meta.main) {
    log.info(`Starting server on port: ${PORT}...`);
    await app.listen({
        port: PORT,
    });
}