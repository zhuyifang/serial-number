'use strict';

var fs		= require('fs');
var http	= require('http');
var exec	= require('child_process').exec;

var serialNumber = function (cb, cmdPrefix) {
	var delimiter = ': ';
	var uselessSerials = [
		'To be filled by O.E.M.',
	]

	var fromCache = function (error, stdout) {
		fs.readFile(__dirname + '/cache', function (fsErr, data) {
			if (data) {data = data.toString().trim();}
			if (fsErr || !data || data.length < 2) {
				attemptEC2(function() {
					stdoutHandler(error, stdout, true);
				});
			} else {
				cb(null, data);
			}
		});
	};

	var stdoutHandler = function (error, stdout, bypassCache) {
		if (error && !bypassCache) {
			fromCache(error, stdout);
		} else {
			cb(error, parseResult(stdout));
		}
	};

	var parseResult = function (input) {
		var result = input.slice(input.indexOf(delimiter) + 2).trim();

		var isResultUseless = uselessSerials.some(function(val) {
			return val === result;
		});

		if (isResultUseless) {
			return '';
		}

		return result;
	};

	var attemptEC2 = function (failCb) {
		var data = '';
		var failHandler = function () {
			failCb();
			failCb = function () {};
		};
		var request = http.get(
			'http://169.254.169.254/latest/meta-data/instance-id',
			function (res) {
				res.on('data', function (chunk) {
					data += chunk;
				}).on('end', function () {
					if (data.length > 2) {
						cb(null, data.trim());
					} else {
						failHandler();
					}
				});
			}
		);
		request.on('error', failHandler).setTimeout(1000, failHandler);
	};

	cmdPrefix = cmdPrefix || '';
	var vals = ['Serial', 'UUID'];
	var cmd;

	switch (process.platform) {

	case 'win32':
		delimiter = '\r\n';
		vals[0] = 'IdentifyingNumber';
		cmd = 'wmic csproduct get ';
		break;

	case 'darwin':
		cmd = 'system_profiler SPHardwareDataType | grep ';
		break;

	case 'linux':
		if (process.arch === 'arm') {
			vals[1] = 'Serial';
			cmd = 'cat /proc/cpuinfo | grep ';

		} else {
			cmd = 'dmidecode -t system | grep ';
		}
		break;

	case 'freebsd':
		cmd = 'dmidecode -t system | grep ';
		break;
	}

	if (!cmd) return cb(new Error('Cannot provide serial number for ' + process.platform));

	if (serialNumber.preferUUID) vals.reverse();


	
var wmicResult,wmicError,child;
  child = exec(cmdPrefix + cmd + vals[0], function (error, stdout, stderr) {
    	wmicError = error || stderr;
    	if (wmicError || parseResult(stdout).length > 1) {
      		console.log("root path open failed" + error + stderr);
      		stdoutHandler(wmicError, stdout);
      		return;
    	}
    wmicResult = stdout;
  });
  child.stdin.end();   // stop the input pipe, in order to run in windows xp
  child.on('close', function (code) {
    console.log("wmic close:: code:" + code);
    stdoutHandler(wmicError, wmicResult);
    child.kill();
  });
};

serialNumber.preferUUID = false;

module.exports = exports = serialNumber;

exports.useSudo = function (cb) {
	serialNumber(cb, 'sudo ');
};
