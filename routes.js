const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
  app.route('/').get((req, res) => {
  // can use app.get instead too - no difference in this case
  // app.get('/',(req, res) => {

    // process.cwd() --> current working directory
    // __dirname --> directory name containing JS source file
    res.render(process.cwd() + '/views/pug/index', {title: 'Connected to Database', message: 'Please login', showLogin: true, showRegistration: true, showSocialAuth: true});
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

  app.route('/auth/github').get(passport.authenticate('github'));

  app.route('/auth/github/callback').get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile');
  })

  // handle logout
  app.route('/logout').get((req, res) => {
    req.logout(); //passport method for logging out
    res.redirect('/');
  });

  // since this is the last non-error-handling middleware use()d, we assume 404, as nothing else responded.
  app.use((req, res, next) => {
    res.status(404).type('text').send('Not Found');
  });

}