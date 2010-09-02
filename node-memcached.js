var net = require('net'),
	sys = require('sys');

/*
 * Connects to a memcached server using a TCP stream
 */
this.connect = function(addr, port, callback) {
	if(typeof(addr) === 'function') {
		callback = addr;
		addr = null;
	} else if (typeof(port) === 'function') {
		callback = port;
		port = null;
	}
	
	if(!addr) { addr = 'localhost'; }
	if(!port) { port = 11211; }
	
	this.stream = net.createConnection(port, addr);
	
	this.stream.on('connect', function() {
		callback();
	});
}

/*
 * Disconnects from the memcached server
 */
this.disconnect = function() {
	if(!this.stream) return;
	this.stream.end();
}

/*
 * Retrieves a value from memcached with the
 * specified key. Automatically converts objects
 * from stringified JSON back into object form.
 *
 * Callback is fired when data retrieval is complete,
 * and value is passed to callback function.
 */
this.get = function(key, callback) {
	if(!this.stream) return;
	
	this.stream.on('data', function(data) {
		if(data == 'END\r\n') return;
		
		var value = new String(data).split('\r\n')[1];
		
		try {
			var obj = JSON.parse(value);
			value = obj;
		} catch(err) {
		}
		
		callback(value);
	});
	
	this.stream.write('get ' + key + '\r\n');
}

/*
 * Stores a value in memcached with the specified method and key.
 * Automatically converts objects to JSON form for storage.
 * Callback function is fired when data is successfully stored.
 */
this.store = function(type, key, data, expire, callback) {
	if(!this.stream) return;
	if(!callback || typeof(callback) != 'function') {
		callback = function(){ };
	}
	
	this.stream.on('data', function(data) {
		if(data == 'STORED\r\n')
			callback();
	});
	
	if(typeof(data) == 'object') {
		data = JSON.stringify(data);
	}
	
	this.stream.write(type + ' ' + key + ' ' + expire + ' 0 ' + data.length + '\r\n');
	this.stream.write(data + '\r\n');
}

this.set = function(key, data, expire, callback) {
	this.store('set', data, expire, callback);
}

this.add = function(key, data, expire, callback) {
	this.store('add', data, expire, callback);
}

this.replace = function(key, data, expire, callback) {
	this.store('replace', key, data, expire, callback);
}

/*
 * Increments a numeric value stored with the given key
 */
this.increment = function(key, amount, callback) {
	if(!this.stream) return;
	if(!callback || typeof(callback) != 'function') {
		callback = function(){ };
	}
	
	this.stream.on('data', function(data) {
		data = new String(data).split('\r\n')[0];
		if(/([0-9]+)/.test(data)) {
			callback(data);
		}
	});
	
	this.stream.write('incr ' + key + ' ' + amount + '\r\n');
}

/*
 * Decrements a numeric value stored with the given key
 */
this.decrement = function(key, amount, callback) {
	if(!this.stream) return;
	if(!callback || typeof(callback) != 'function') {
		callback = function(){ };
	}
	
	this.stream.on('data', function(data) {
		data = new String(data).split('\r\n')[0];
		if(/([0-9]+)/.test(data)) {
			callback(data);
		}
	});
	
	this.stream.write('decr ' + key + ' ' + amount + '\r\n');
}

/*
 * Deletes the specified key and data
 */
this.delete = function(key, callback) {
	if(!this.stream) return;
	if(!callback || typeof(callback) != 'function') {
		callback = function(){ };
	}
	
	this.stream.on('data', function(data) {
		if(data == 'DELETED\r\n')
			callback();
	});
	
	this.stream.write('delete ' + key + '\r\n');
}

/*
 * Retrieves statistics about the memcached server
 * and returns them in an object via the callback function.
 */
this.stats = function(callback) {
	if(!this.stream) return;
	
	this.stream.on('data', function(data) {
		var stats = {};
		
		data = new String(data);
		data = data.split('\r\n');
		if(data.length > 0) {
			data.forEach(function(line) {
				if(line.substring(0,4) == 'STAT') {
					var line = line.substring(5);
					var info = line.split(' ');
					stats[info[0]] = info[1];
				}
			});
			
			callback(stats);
		}
	});
	
	this.stream.write('stats\n');
}
