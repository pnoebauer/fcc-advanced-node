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

	socket.on('user', data => {
		console.log(data, 'user');
		$('#num-users').text(data.currentUsers + ' users online');
		let message =
			data.name + (data.connected ? ' has joined the chat.' : ' has left the chat.');
		$('#messages').append($('<li>').html('<b>' + message + '</b>'));
	});

	socket.on('chat message', data => {
		// console.log(data, 'received');

		$('#messages').append($('<li>').text(`${data.name}: ${data.message}`));
	});

	// Form submission with new message in field with id 'm'
	$('form').submit(function () {
		var messageToSend = $('#m').val();
		console.log('sending message', messageToSend);

		socket.emit('chat message', messageToSend); //emit an event with the data of the messageToSend field

		$('#m').val(''); //clear the message field
		return false; // prevent form submit from refreshing page
	});
});
