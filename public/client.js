console.log('chat loaded script');

$(document).ready(function () {
	// below comment suppresses the error that would normally occur
	// when 'io' is not defined in the file
	/*global io*/
	var socket = io();
	console.log(socket, 'io');

	// socket.on('connection', function (socket) {
	// 	console.log('new client connected');
	// });

	socket.on('user count', function (data) {
		console.log(data, 'count');
	});

	// Form submission with new message in field with id 'm'
	$('form').submit(function () {
		var messageToSend = $('#m').val();

		$('#m').val('');
		return false; // prevent form submit from refreshing page
	});
});
