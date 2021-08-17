'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const passport = require('passport'); //for cookie generation
const session = require('express-session');
const ObjectID = require('mongodb').ObjectID; //create unique ID with mongodb for generation the cookie
const LocalStrategy = require('passport-local'); //a strategy is a way of authenticating a user - local based on registration, or from providers such as google or github
const bcrypt = require('bcrypt');

const routes = require('./routes.js');
const auth = require('./auth.js');

// the app object is instantiated on creation of the Express server.
// to setup a middleware invoke app.use
const app = express();
app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET, //used to compute the hash used to encrypt the cookie
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());


myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  app.route('/').get((req, res) => {
  // can use app.get instead too - no difference in this case
  // app.get('/',(req, res) => {

    // process.cwd() --> current working directory
    // __dirname --> directory name containing JS source file
    res.render(process.cwd() + '/views/pug/index', {title: 'Connected to Database', message: 'Please login', showLogin: true, showRegistration: true});
    // {title, message} object to pass vars into .pug file --> vars references with p=title or #{message} 
  });

// app.get('/login', (req, res) => { ... });
// app.post('/login', (req, res) => { ... });
// app.put('/login', (req, res) => { ... });
// -----------vs: 
// app.route('/login')
//   .get((req, res) => { ... })
//   .post((req, res) => { ... })
//   .put((req, res) => { ... });

  // passport.authenticate('local') middleware
  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile'); //if successfully authenticated then redirect to /profile=
  });

  // create middleware to make sure that user is authenticated
  function ensureAuthenticated(req, res, next) {
    // call passport's isAuthenticated method, which checks that req.user is defined
    if(req.isAuthenticated()) {
      return next();
    }
    res.redirect('/'); //if not authenticated redirect
  }

  // ensureAuthenticated is passed as middleware
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + '/views/pug/profile', {username: req.user.username});
  });

  app.route('/register').post((req, res, next) => {
    // check if user exists
    myDataBase.findOne({username: req.body.username}, (err, user) => {
      if(err) {
        next(err);
      } else if(user) {
       res.redirect('/');
      } else {
        const hash = bcrypt.hashSync(req.body.password, 12);
        // if user does not exist yet insert it and pass doc to the next function
        myDataBase.insertOne({username: req.body.username, password: hash}, (err, doc) => {
          if(err) {
            res.redirect('/');
          } else {
            // the inserted document is held within the ops property of the doc
            next(null, doc.ops[0]);
          }
        });
      }
    });
  }, passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    }
  );

  // handle logout
  app.route('/logout').get((req, res) => {
    req.logout(); //passport method for logging out
    res.redirect('/');
  });

  // since this is the last non-error-handling middleware use()d, we assume 404, as nothing else responded.
  app.use((req, res, next) => {
    res.status(404).type('text').send('Not Found');
  });

  // serializing object: convert its contents into a small key (this allows to identify who has communicated with the server without having to send the authentication data)
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // convert back into original object
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });
}).catch((e) => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

passport.use(new LocalStrategy(
  (username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log('User '+ username +' attempted to log in.');
      if (err) { 
        return done(err); 
      }
      if (!user) { 
        return done(null, false); 
      }
      if (!bcrypt.compareSync(password, user.password)) { 
        return done(null, false);
      }
      return done(null, user);
    });
  }
));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
