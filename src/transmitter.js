"use strict";

var remoteMouseX, remoteMouseY;

function Connection(target, handler) {
	var ws;
	var ready = false;
	var self = this;

	this.open = function() {
		ws = new WebSocket(target);
		window.ws = ws;

		ws.addEventListener('open', function(e) {
			ready = true;
			if (handler.onOpen) handler.onOpen(e);
		});

		ws.addEventListener('error', function (e) {
			console.log('error', e)
			if (handler.onError) handler.onError(e);
		});

		ws.addEventListener('close', function(e) {
			ready = false;
			ws = null;
			console.log('close', e)
			setTimeout(self.open, 500);
			if (handler.onClose) handler.onClose(e);
		});

		ws.addEventListener('message', function(e) {
			if (handler.onMessage) handler.onMessage(e);
		});

	};

	this.send = function send(e) {
		if (ws && ready) ws.send(e);
	}
}


function startTransmitter() {
	var width, height, remoteWidth, remoteHeight;

	var handler = {
		onOpen: function(e) {
			sendDimension();
			send('devicemotion' + typeof(window.DeviceMotionEvent));
		},

		onError: function (e) {
			console.log('error', e)
		},

		onClose: function(e) {
			console.log('close', e)
		},

		onMessage: function(e) {
			var data = e.data;

			var d = data.split('\n');

			switch (d[0]) {
				case 'p':
					ws.send('pp\n'  + d[1]);
					break;
				case 'r':
					// sendDimension();
					break;
				case 'rr':
					var dimensions = JSON.parse(d[1]);
					remoteWidth = dimensions[0];
					remoteHeight = dimensions[1];

					var remoteRatio = remoteWidth / remoteHeight;
					var currentRatio = width / height;

					// if (remoteRatio > currentRatio) {
					// 	// remote width is wider. // currentHeight should be restricted
					// } else {
					// 	//
					// }
					send('ratio: ' + remoteRatio + ' vs ' + currentRatio);
					break;
				case 'mc':
					var dimensions = JSON.parse(d[1]);
					remoteMouseX = dimensions[0];
					remoteMouseY = dimensions[1];
					break;

			}
		},
		onError: function(e) {
			console.log('error', e);
		}
	};

	var target = 'ws://' + location.hostname + ':8081/touchpad';
	var connection = new Connection(target, handler);
	connection.open();

	function send(e) {
		connection.send(e);
	}

	function convert(touches) {
		var i, len, px, py, touch;
		var a = [];
		for (i=0, len = touches.length; i<len; i++) {
			touch = touches[i];
			px = touch.pageX;
			py = touch.pageY;
			a.push(px, py);
		}

		return JSON.stringify(a);
	}

	function sendDimension() {
		width = window.innerWidth;
		height = window.innerHeight;
		send('r\n['+width+','+height+']');
	}

	window.onerror = function(message, file, line) {
		send([message, file, line].join('\t'));
	}

	var last = {};

	function setLast(touches) {
		var touch = touches[0];
		if (touch) {
			var now = Date.now();

			if (last.time) {
				var dt = now - last.time;
				var dx = touch.pageX - last.pageX;
				var dy = touch.pageY - last.pageY;

				send('dm\n[' + dx + ',' + dy + ',' + dt + ']')
				send('force' +  touch.force);
			}

			last.pageX = touch.pageX;
			last.pageY = touch.pageY;
			last.time = now;
		}
	}

	window.addEventListener('touchend', function(event) {
		touches = event.touches;
		last.time = 0;
		send('te\n' + convert(touches));
	}, false);

	window.addEventListener('touchmove', function(event) {
		event.preventDefault();
		touches = event.touches;
		setLast(touches);
		send('tm\n' + convert(touches));
	}, false);

	window.addEventListener('touchstart', function(event) {
		touches = event.touches;
		setLast(touches);
		send('ts\n' + convert(touches));
	}, false);

	window.addEventListener('touchcancel', function(event) {
		touches = event.touches;
		send('tc\n' + convert(touches));
	}, false);

	window.addEventListener('resize', sendDimension, false);


	function tilt(a, b) {
		send('tilt [' + a + ', ' + b + ']');
	}


	// hello in 50 languages.
	// css3d mobile deviceorientation threejs
	// oh, what a time to be an anti-anti-null-transform.
	var mina, minb, minc, maxa, maxb, maxc;

	maxa = maxb = maxc = Number.NEGATIVE_INFINITY;
	mina = minb = minc = Number.POSITIVE_INFINITY;
	window.addEventListener("deviceorientation", function(event) {
		// send([event.alpha, event.beta, event.gamma].join(','));
		maxa = Math.max(maxa, event.alpha);
		maxb = Math.max(maxb, event.beta);
		maxc = Math.max(maxc, event.gamma);
		mina = Math.min(mina, event.alpha);
		minb = Math.min(minb, event.beta);
		minc = Math.min(minc, event.gamma);
		
		// (Math.random()<0.5) && 
		// send('yoz' + JSON.stringify([[mina, maxa], [minb, maxb], [minc, maxc]]));

		// alpha = compass (0, 360)
		// beta = forward roll (-90, 90) (-180, 180 ff)
		// gamma = -90, 270. (-90, 90 ff)
	}, true);

	// Use Black
	// Joystick
	// Presentation

	// window.addEventListener('devicemotion', function (event) {
	// 	 (Math.random()<0.3) && send('acceleration' + JSON.stringify([
	// 	 	event.acceleration.x,
	// 	 	event.acceleration.y,
	// 	 	event.acceleration.z]));
	// }, true);
}

startTransmitter();