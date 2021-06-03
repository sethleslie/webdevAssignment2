const PORT = 3000;

const api = `http://localhost:${PORT}/api`;

const app = document.getElementById("app");

const start = () => {
    //If this is not a new session, login will be skipped
    if (sessionStorage.getItem('user_name') === null) {
      show(document.getElementById('login'));
    } else {
      show(document.getElementById('poems'));
      setGreeting(sessionStorage.getItem('user_full_name'));
      getPoems();
      functionsToPoll.push(getPoems);
    }
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

const signUp = () => {
    hide(document.getElementById('login'));
    show(document.getElementById('sign-up'));
};

const cancelSignUp = () => {
    hide(document.getElementById('sign-up'));
    show(document.getElementById('login'));
};

const cancelAddPoem = () => {
    hide(document.getElementById('add-poem'));
    show(document.getElementById('poems'));
};

const cancelRatePoem = () => {
    hide(document.getElementById('rate-poem'));
    show(document.getElementById('poems'));
};

const addUser = () => {
    //check for value in input fields
    if((document.getElementById('sign-up-user-name').value !== "")
        &&(document.getElementById('sign-up-full-name').value !== "")
        &&(document.getElementById('sign-up-password').value !== ""))
    { 
        const newUser = {
        user_name: document.getElementById('sign-up-user-name').value,
        user_full_name: document.getElementById('sign-up-full-name').value,
        user_pw: document.getElementById('sign-up-password').value
    }

    fetch(`${api}/newUser/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
    })
    .then((data) => {
        if (data.status !== 201) {
            throw `User Name already exists. Please choose another user name.`
        }
        return data;
    })
    .then(data => data.json())
    .then((data) => {
        alert("Sign up SUCCESSFULL! Please login!");
        hide(document.getElementById('sign-up'));
        show(document.getElementById('login'));
        //getPoems();
    })
    .catch((error) => {
        showError(error);
        document.getElementById('sign-up-user-name').value = "";
        document.getElementById('sign-up-full-name').value = "";
        document.getElementById('sign-up-password').value = "";
    });
    } else {
        showError("Please complete all fields before continuing.");
    }
};

const loadPoems = (user_name) => {
    fetch(`${api}/users/${user_name}`)
      .then(response => response.json())
      .then(data => {
        sessionStorage.setItem('user_name', data.user_name);
        sessionStorage.setItem('user_full_name', data.user_full_name);
        sessionStorage.setItem('user_id', data.user_id);
        //hide login and show poems
        hide(document.getElementById('login'));
        show(document.getElementById('poems'));
        setGreeting(data.user_full_name);
        getPoems();
        //add getPoems to the list of functions to be called in the polling service
        functionsToPoll.push(getPoems);
    })
    .catch((error) => {
        showError(error);
    });
};

const getPoems = () => {
    //get all topics from api
    fetch(`${api}/poems/`)
      .then(response => response.json())
      .then(data => {
        //make sure the json is retrieved
          if(!("error" in data)) {
            const poemList = document.getElementById("poem-list");

            data.forEach(poem => {
              //check if the poem is already rendered in the DOM
              if (document.getElementById(`poem-${poem.poem_id}`) === null) {
                const poemRating = document.createElement('p');
                poemRating.id = `avg-rating-${poem.poem_id}`;
                if (poem.avg_rating === null) {
                    poemRating.innerHTML = 'Poem not yet rated.'
                } else {
                    poemRating.innerHTML =  `AVG RATING: ${poem.avg_rating}`
                };
                const poemItem = document.createElement('li');
                poemItem.id = `poem-${poem.poem_id}`;
                poemItem.className = 'poem-item';
                poemItem.innerHTML = `<a onclick="getBodyForPoem(this)" data-id="${ poem.poem_id }">${ poem.poem_title } by ${ poem.user_name }</a>`;
                if (poem.user_name !== sessionStorage.getItem('user_name')) {
                    poemItem.innerHTML = `<a onclick="getBodyForPoem(this)" data-id="${ poem.poem_id }">${ poem.poem_title } by ${ poem.user_name }</a><button onclick="ratePoem(this)" data-id="${poem.poem_id}" data-title="${poem.poem_title}" class="poem-rate-btn">Rate</button>`;
                };
                poemItem.appendChild(poemRating);
                poemList.appendChild(poemItem);
                } else {
                   const poemRating = document.getElementById(`avg-rating-${poem.poem_id}`);
                   if (poem.avg_rating === null) {
                    poemRating.innerHTML = 'Poem not yet rated.'
                    } else {
                    poemRating.innerHTML =  `AVG RATING: ${poem.avg_rating}`
                    };
                };
            });
        };
    });
};

const ratePoem = (element) => {
    console.log(`You wanna rate poem: ${element.dataset.id} ${element.dataset.title}`);
    fetch(`${api}/poems/${element.dataset.id}/rating/${sessionStorage.getItem('user_id')}`)
        .then((data) => {
            if (data.status === 400) {
                showError("You've already rated this poem");
            } else {
                hide(document.getElementById('poems'));
                show(document.getElementById('rate-poem'));
                //todo: find a better way to pass the poem_id
                sessionStorage.setItem('poem_id', element.dataset.id);
                document.getElementById('poem-title').innerHTML = element.dataset.title;
            }
            })
};

const saveRating = (rating) => {
    const newRating = {
        user_id: sessionStorage.getItem('user_id'),
        poem_id: sessionStorage.getItem('poem_id'),
        poem_rating: rating
    }
    sessionStorage.removeItem('poem_id');

    fetch(`${api}/poems/newRating`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRating),
        })
        .then((data) => {
            if (data.status !== 201) {
                throw `Poem rating unsuccessful.`
            }
            return data;
        })
        .then(data => data.json())
        .then((data) => {
            alert(`Woo! You gave the poem ${data.poem_rating} out of 5!`);
            hide(document.getElementById('rate-poem'));
            show(document.getElementById('poems'));
            getPoems();
        })
        .catch((error) => {
            showError(error);
        });
};

const getBodyForPoem = (element) => {
    fetch(`${api}/poems/${ element.dataset.id }/body`)
      .then(response => response.json())
      .then((data) => {
          let poemBody = document.getElementById(`poem-body-${ element.dataset.id }`);
          if (poemBody === null) {
              poemBody = document.createElement('p');
              poemBody.id = `poem-body-${ element.dataset.id }`;
              poemBody.className = "poem-body";
              poemBody.innerHTML = `<p>${ data[0].poem_body}</p>`
          }

          // Check if the post exists so that we don't duplicate it everytime we poll
          let postList = document.getElementById(`post-list-${ element.dataset.id }`);
          let postListCreated = false;

          if (postList === null) {
            postList = document.createElement('ul');
            postList.id = `post-list-${ element.dataset.id }`;
            // This is used to know if we ended up creating a new post list.
            postListCreated = true;
          };

          const numberOfOldItems = postList.getElementsByTagName('li').length; 

          //only add new items to the list using slice and number of old items
          data.slice(numberOfOldItems).reduce(
              (list, poem) => {
                  const postItem = document.createElement('li');
                  postItem.id = `post-item-${poem.comment_id}`;
                  postItem.innerHTML = `<a onclick="hideComment(this)" data-id="${ poem.comment_id }" id="hide-button">hide</a><p>${ poem.comment_text} <br>--${poem.user_name}</p>`;
                  list.appendChild(postItem);
                  return list;
              },
              postList
          );

          // If a new post list is created then add buttons and poll for new posts.
          if (postListCreated) {
            newPostInput = document.createElement('input');
            //add id to input field so it only adds to relevant poem. This solved the problem
            newPostInput.id = "post-input-" + element.dataset.id;
            newPostButton = document.createElement('button');
            newPostButton.innerHTML = 'Post';
            //added a condition to check for input value
            newPostButton.addEventListener('click', () => {
              const myInput = document.getElementById("post-input-" + element.dataset.id);
              if(myInput.value !== ""){
                addPost(element.dataset.id, myInput)
              }
            },false
            );

            element.after(newPostButton);
            element.after(newPostInput);
            element.after(postList);
            element.after(poemBody);

            // Add this function with the current element to the list of functions to call during the poll.
            //That way it only polls the topics that have been opened, which is cool.
            const getBodyForPoemSpecific = () => getBodyForPoem(element);

            //adding name of function to array.
            functionsToPoll.push(getBodyForPoemSpecific);
          };
      });
};

const hideComment = (element) => {
    /* Optimistically remove the item from the DOM. This was a method shown to me by Asher Leslie
      Essentially, update the UI so the user thinks it happened instantly, THEN try to remove it from the database,
      and if it fails to remove, put it back */
    const thisComment = document.getElementById(`post-item-${element.dataset.id}`);
    hide(thisComment);
    fetch(`${api}/deleteComment/${element.dataset.id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: null
      })
      // Success, remove the item permanently.
      .then((data) => {
        if (data.status !== 201) {
            throw `Something went wrong deleting the comment.`
        } else {
          thisComment.remove()
          getPoems();
        };
      })
      // Fail, restore the removed item.
      .catch((error) => {
          showError(error);
          show(thisComment);
      })
};

const newPoem = () => {
    hide(document.getElementById('poems'));
    show(document.getElementById('add-poem'));
};

const addPoem = () => {
        //check for value in input fields
        if((document.getElementById('add-poem-title').value !== "")
        &&(document.getElementById('add-poem-text').value !== ""))
    { 
        const newPoem = {
        poem_title: document.getElementById('add-poem-title').value,
        poem_body: document.getElementById('add-poem-text').value,
        user_id: sessionStorage.getItem('user_id'),
        user_name: sessionStorage.getItem('user_name')
        }

        //Optimistically add poem when the form is submitted.
        const poemItem = document.createElement('li');
        poemItem.className = 'poem-item';
        poemItem.innerHTML = `<a>${ newPoem.poem_title }</a>`
        document.getElementById('poem-list').appendChild(poemItem);

        fetch(`${api}/newPoem/`, {
         method: 'POST',
         headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPoem),
        })
        .then((data) => {
           if (data.status !== 201) {
            throw `Something went wrong posting your poem.`
           }
          return data;
        })
        .then(data => data.json())
        .then((data) => {
            poemItem.id = `poem-${data.poem_id}`;
            poemItem.innerHTML = `<a onclick="getBodyForPoem(this)" data-id="${ data.poem_id }">${ newPoem.poem_title } by ${ newPoem.user_name}</a>`
            const poemRating = document.createElement('p');
            poemRating.id = `avg-rating-${data.poem_id}`;
            poemRating.innerHTML = 'Poem not yet rated.'
            poemItem.appendChild(poemRating);
            alert(`Poem ${newPoem.poem_title} post SUCCESSFULL!`);
            hide(document.getElementById('add-poem'));
            show(document.getElementById('poems'));
            getPoems();
        })
        .catch((error) => {
        showError(error);
    });
    } else {
        showError("Please complete all fields before continuing.");
    }
};

const addPost = (id, newPostInput) => {
    const newPost = {
        user_name: sessionStorage.getItem('user_name'),
        user_id: sessionStorage.getItem('user_id'),
        text: newPostInput.value
    };

    fetch(`${api}/poems/${id}/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPost)
      })
      .then(response => response.json())
      .then((data) => {
        const postItem = document.createElement('li');
        postItem.innerHTML = `<a onclick="hideComment(this)" data-id="${ data.comment_id }" id="hide-button">hide</a><p>${newPostInput.value} <br>--${ sessionStorage.getItem('user_name') }</p>`;
        document.getElementById(`post-list-${ id }`).appendChild(postItem);
        newPostInput.value = '';
        postItem.id = `post-item-${data.comment_id}`;
      })
      .catch((error) => {
        showError(error);
        document.getElementById(`post-list-${ id }`).removeChild(postItem);
      });
};

const showFavourites = () => {
    const user_id = sessionStorage.getItem('user_id');
    fetch(`${api}/poems/${user_id}/notFavs`)
        .then(response => {
            if(response.status !== 201) {
                throw "No favourites"
            }
            return response;
        })
        .then(response => response.json())
        .then(data => {
            data.forEach(poem => {
                hide(document.getElementById(`poem-${poem.poem_id}`));
            });
        })
        .catch((error) => {
            showError(error);
        });
    hide(document.getElementById('favButton'));
    show(document.getElementById('allButton'));
    getPoems();
};

const showAll = () => {
    const user_id = sessionStorage.getItem('user_id');
    fetch(`${api}/poems/${user_id}/notFavs`)
        .then(response => {
            if(response.status !== 201) {
                throw "No favourites"
            }
            return response;
        })
        .then(response => response.json())
        .then(data => {
            data.forEach(poem => {
                show(document.getElementById(`poem-${poem.poem_id}`));
            });
        })
        .catch((error) => {
            showError(error);
        });
    hide(document.getElementById('allButton'));
    show(document.getElementById('favButton'));
    getPoems();
};

  //This method was shown to me by Asher Leslie
  // This keeps track of which api endpoints have been used so that it only polls for data that
  // the user has asked for.
  const functionsToPoll = [];

  const pollServer = (pollList) => {
      setInterval(() => {
          //taking the name in the array and calling it as a function by adding () to the name.
          pollList.map((pollFunction) => pollFunction());
        },
        //set the delay between intervals in ms
        3000
      );
  }

  // Initialise the application.
  start();

  // Start the polling service.
  pollServer(functionsToPoll);