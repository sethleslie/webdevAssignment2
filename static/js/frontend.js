const PORT = 3000;

const api = `http://localhost:${PORT}/api`;

const app = document.getElementById("app");

const start = () => {
    //If this is not a new session, login will be skipped
    //if (sessionStorage.getItem('username') === null) {
      show(document.getElementById('login'));
    //}
   /*  else {
      show(document.getElementById('topics'));
      setGreeting(sessionStorage.getItem("name"));
      getTopics();
      functionsToPoll.push(getTopics);
    } */
  }

function showError(error) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error";
  
    errorDiv.textContent = error;
    const close = document.createElement("button");
    close.textContent = "X";
    errorDiv.append(close);
  
    close.addEventListener("click", (ev) => errorDiv.remove());
  
    app.prepend(errorDiv);
  }

const login = () => {
    const username = document.getElementById("username-input").value;
    const password = document.getElementById("password-input").value;

    fetch(`${api}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            user_name: username,
            user_pw: password,
          }),
    })
    .then((res) => {
        if (res.status !== 201) {
          throw `Couldn't sign in!`;
        }
        loadPoems(username);
      })
      .catch((error) => {
        showError(error);
      });
};

const hide = (element) => {
    element.setAttribute('hidden', true);
};

const show = (element) => {
    element.removeAttribute('hidden');
};

const setGreeting = (fullName) => {
    document.getElementById('greeting').innerHTML = `Logged in as ${fullName}`;
};

const loadPoems = (user_name) => {
    console.log(`Now we can load all the poems for user: ${user_name}`);
    fetch(`${api}/users/${user_name}`)
      .then(response => response.json())
      .then(data => {
        sessionStorage.setItem('user_name', data.user_name);
        sessionStorage.setItem('user_full_name', data.user_full_name);
        //hide login and show poems
        hide(document.getElementById('login'));
        show(document.getElementById('poems'));
        setGreeting(data.user_full_name);
        getPoems();
        //add getTopics to the list of functions to be called in the polling service
        //functionsToPoll.push(getPoems);
    })
    .catch((error) => {
        showError(error);
    });;
};

const getPoems = () => {
    //get all topics from api
    fetch(`${api}/poems/`)
      .then(response => response.json())
      .then(data => {
        //make sure the json is retrieved
          if(!("error" in data)) {
            const poemList = document.getElementById("poem-list");
            //if poems don't exist in data they need to be removed from the DOM
            Array.from(poemList.getElementsByTagName("li")).forEach(domPoem => {
              //.some() checks each item in array against a condition and returns a single boolean
              const poemExists = data.some(item => `poem-${item.poem_id}` === domPoem.id);
              if (!poemExists) {
                domPoem.remove();
              };
            });
            data.forEach(poem => {
              //check if the poem is already rendered in the DOM
              //if their id isn't in the data destroy it.
              if (document.getElementById(`poem-${poem.poem_id}`) === null) {
                const poemItem = document.createElement('li');
                poemItem.id = `poem-${poem.poem_id}`;
                poemItem.className = 'poem-item';
                poemItem.innerHTML = `<a onclick="getPostsForPoem(this)" data-id="${ poem.poem_id }">${ poem.poem_title } by ${ poem.user_name} AVG RATING: ${poem.avg_rating}</a>`;
                /* if (poem.user_name === sessionStorage.getItem('user_name')) {
                    poemItem.innerHTML = `<button onclick="deletePoem(${poem.poem_id})" class="poem-delete-btn">Delete</button><a onclick="getPostsForPoem(this)" data-id="${ poem.poem_id }">${ poem.poem_title }</a>`;
                } else {
                  poemItem.innerHTML = `<a onclick="getPostsForPoem(this)" data-id="${ poem.poem_id }">${ poem.poem_title } by ${ poem.user_name} AVG RATING: ${poem.avg_rating}</a>`;
                }; */
                poemList.appendChild(poemItem);
              };
            });
             
          };
      });
};

  // Initialise the application.
  start();