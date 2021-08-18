'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport'); //for cookie generation
const routes = require('./routes');
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
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({url: URI});

app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// get the session id from a cookie and validate it for session middleware
app.use(
	session({
		secret: process.env.SESSION_SECRET, //used to compute the hash used to encrypt the cookie
		resave: true,
		saveUninitialized: true,
		cookie: {secure: false},
		key: 'express.sid',
		store: store,
	})
);

app.use(passport.initialize());
app.use(passport.session());

// Passport authentication for Socket.IO
// used for parsing and decoding the cookie that contains the passport session and deserialize it to obtain the user object
// find out who is connected
// get the session id from a cookie and validate it for socket.io
io.use(
	passportSocketIo.authorize({
		cookieParser: cookieParser,
		key: 'express.sid',
		secret: process.env.SESSION_SECRET,
		store: store,
		success: onAuthorizeSuccess,
		fail: onAuthorizeFail,
	})
);

myDB(async client => {
	const myDataBase = await client.db('database').collection('users');

	routes(app, myDataBase);
	auth(app, myDataBase);

	let currentUsers = 0;
	//.on listens for a specific event, arg1: emitting event title, arg2: function of passed data
	io.on('connection', socket => {
		// console.log('A user has connected', socket);
		++currentUsers;
		// on connection emit a new event
		io.emit('user', {
			name: socket.request.user.username,
			currentUsers,
			connected: true,
		});
		console.log('user ' + socket.request.user.username + ' connected');

		socket.on('chat message', message => {
			console.log(message, 'received');
			io.emit('chat message', {
				name: socket.request.user.username,
				message,
			});
		});

		socket.on('disconnect', () => {
			console.log('A user has disconnected');
			--currentUsers;
			io.emit('user', {
				name: socket.request.user.username,
				currentUsers,
				connected: true,
			});
		});
	});
}).catch(e => {
	app.route('/').get((req, res) => {
		res.render('pug', {title: e, message: 'Unable to login'});
	});
});

function onAuthorizeSuccess(data, accept) {
	console.log('successful connection to socket.io');
	accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
	if (error) throw new Error(message);
	console.log('failed connection to socket.io:', message);
	accept(null, false);
}

const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => { //app has been mounted onto the http server
http.listen(PORT, () => {
	console.log('Listening on port ' + PORT);
});
