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
    })
    .catch((error) => {
        showError(error);
    });;
};

  // Initialise the application.
  start();

/* const login = () => {
    const userInputValue = document.getElementById('username-input').value;
    //check is userInputValue exists
    //ternary operator = condition ? value if true : value if false
    const user = userInputValue === "" ? "undefined" : userInputValue;
    //get the json text using the user name from input
    fetch(`${api}/users/${user}`)
      .then(response => response.json())
      .then(data => {
      //if the user name is in the api, save the name and username to session,
      //if(!("error" in data)) checks that an error key hasn't been returned
          if(!("error" in data)) {
              //save data to session storage
              sessionStorage.setItem('username', data.username);
              sessionStorage.setItem('name', data.name);
              //Hide login and show topics.
              hide(document.getElementById('login'));
              show(document.getElementById('topics'));
              setGreeting(data.name);
              //retrieve all topics from API
              getTopics();
              //add getTopics to the list of functions to be called in the polling service
              functionsToPoll.push(getTopics);
          } else {
            console.log(user);
            fetch(`${api}/users/`)
            .then(response => response.json())
            .then(data => {
              //List all available users in the API as an alert
              //my first .reduce()
              alert(data.reduce(
                (text, user) => text += `${user.username}\n`,
                "Not a valid user name. Try:\n"
              //woo! It worked!
            ));
          });
        };
      });
    } */