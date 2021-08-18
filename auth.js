const passport = require('passport');
const LocalStrategy = require('passport-local'); // a strategy is a way of authenticating a user - local based on registration, or from providers such as google or github
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID; // create unique ID with mongodb for generation the cookie
const GitHubStrategy = require('passport-github').Strategy;

module.exports = function (app, myDataBase) {
	// serializing object: convert its contents into a small key (this allows to identify who has communicated with the server without having to send the authentication data)
	passport.serializeUser((user, done) => {
		done(null, user._id);
	});

	// convert back into original object
	passport.deserializeUser((id, done) => {
		myDataBase.findOne({_id: new ObjectID(id)}, (err, doc) => {
			done(null, doc);
		});
	});

	// setup local auth strategy
	passport.use(
		new LocalStrategy((username, password, done) => {
			myDataBase.findOne({username: username}, (err, user) => {
				console.log('User ' + username + ' attempted to log in.');
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
		})
	);

	// auth via github
	passport.use(
		new GitHubStrategy(
			{
				clientID: process.env.GITHUB_CLIENT_ID,
				clientSecret: process.env.GITHUB_CLIENT_SECRET,
				callbackURL:
					'https: //boilerplate-advancednode.pnoebauer.repl.co/auth/github/callback',
			},
			function (accessToken, refreshToken, profile, cb) {
				console.log(profile);
				//Database logic here with callback containing our user object
				myDataBase.findOneAndUpdate(
					{id: profile.id},
					{
						$setOnInsert: {
							id: profile.id,
							name: profile.displayName || 'John Doe',
							photo: profile.photos[0].value || '',
							email: Array.isArray(profile.emails)
								? profile.emails[0].value
								: 'No public email',
							created_on: new Date(),
							provider: profile.provider || '',
						},
						$set: {
							last_login: new Date(),
						},
						$inc: {
							login_count: 1,
						},
					},
					{upsert: true, new: true}, //if the profile does not exist yet then create a new doc
					(err, doc) => {
						return cb(null, doc.value); //invoked if new profile is created
					}
				);
			}
		)
	);
};
