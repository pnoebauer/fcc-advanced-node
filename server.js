'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const passport = require('passport'); //for cookie generation
const session = require('express-session');

const routes = require('./routes.js');
const auth = require('./auth.js');

// the app object is instantiated on creation of the Express server.
// to setup a middleware invoke app.use
const app = express();
const http = require('http').createServer(app);
// const io = require('socket.io')(http);
const io = require('socket.io')(http, {
	cors: {
		origin: '*',
	},
});

app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(
	session({
		secret: process.env.SESSION_SECRET, //used to compute the hash used to encrypt the cookie
		resave: true,
		saveUninitialized: true,
		cookie: {secure: false},
	})
);
app.use(passport.initialize());
app.use(passport.session());

myDB(async client => {
	const myDataBase = await client.db('database').collection('users');

	routes(app, myDataBase);
	auth(app, myDataBase);

	let currentUsers = 0;

	//.on listens for a specific event, arg1: emitting event title, arg2: function of passed data
	io.on('connection', socket => {
		console.log('A user has connected');

		++currentUsers;
		io.emit('user count', currentUsers);

		socket.on('disconnect', () => {
			console.log('A user has disconnected');
			--currentUsers;
			io.emit('user count after disconnect', currentUsers);
		});
	});
}).catch(e => {
	app.route('/').get((req, res) => {
		res.render('pug', {title: e, message: 'Unable to login'});
	});
});

const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => { //app has been mounted onto the http server
http.listen(PORT, () => {
	console.log('Listening on port ' + PORT);
});
