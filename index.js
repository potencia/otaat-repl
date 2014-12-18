'use strict';

var OTaaT = {
    repl : require('repl'),
    vm : require('vm'),
    createEval : function (options) {
        var vm = this.vm, fireNext = true, timeout = {}, commands = [];
        function next () {
            var toProcess = commands.shift(), err, result;
            if (toProcess) {
                fireNext = false;
                try {
                    if (options.useGlobal) {
                        result = vm.runInThisContext(toProcess.code, toProcess.file);
                    } else {
                        result = vm.runInContext(toProcess.code, toProcess.context, toProcess.file);
                    }
                    if (result && Object.prototype.toString.call(result.then) === '[object Function]') {
                        toProcess.async = true;
                        if (options.timeout) {
                            toProcess.timeoutId = setTimeout(function () {
                                if (toProcess.processed) { return; }
                                toProcess.timedOut = true;
                                toProcess.callback(new Error('The promise was not fulfilled or rejected before the timeout of [ ' +
                                options.timeout + ' ] milliseconds.'));
                                next();
                            }, options.timeout);
                        }
                        result.then(function (response) {
                            if (toProcess.timedOut) { return; }
                            toProcess.processed = true;
                            if (toProcess.timeoutId) { clearTimeout(toProcess.timeoutId); }
                            toProcess.callback(undefined, response);
                            next();
                        }, function (reason) {
                            if (toProcess.timedOut) { return; }
                            toProcess.processed = true;
                            if (toProcess.timeoutId) { clearTimeout(toProcess.timeoutId); }
                            toProcess.callback(reason);
                            next();
                        });
                    }
                } catch (e) {
                    result = undefined;
                    err = e;
                }

                if (!toProcess.async) {
                    toProcess.callback(err, result);
                    next();
                }
            } else {
                fireNext = true;
            }
        }

        return function (code, context, file, callback) {
            commands.push({
                code : code,
                context : context,
                file : file,
                callback : callback
            });
            if (fireNext) {
                next();
            }
        };
    }
};

function isValidTimeoutNumber (arg) { return /^\+?[0-9]+$/.test(arg); }

function createTimeoutCommand (options) {
    return {
        help : 'Sets the promise timeout in milliseconds. A value of false means no timeout.',
        action : function (arg) {
            var valid = false;
            if (arg === 'false') {
                valid = true;
                options.timeout = false;
            }
            if (isValidTimeoutNumber(arg)) {
                valid = true;
                options.timeout = parseInt(arg);
            }
            if (arg === '') {
                valid = true;
            }
            if (valid) {
                if (options.timeout === false) {
                    console.log('Promise timeout disabled');
                } else {
                    console.log('Promise timeout in milliseconds: ' + options.timeout);
                }
            } else {
                console.log('Promise timeout was not changed from [ ' + options.timeout + ' ].\n\nValid values are [ false ] for no ' +
                'timeout and non-negative integers specifying the timeout in milliseconds.\n');
            }
            this.displayPrompt();
        }
    };
}

OTaaT.start = function (options) {
    var o = {}, session;
    Object.keys(options || {}).filter(function (key) {
        return key !== 'eval';
    }).forEach(function (key) {
        o[key] = options[key];
    });
    o['eval'] = OTaaT.createEval(o);
    if (o.timeout === undefined) {
        o.timeout = 60000;
    } else {
        if (o.timeout !== false && !isValidTimeoutNumber(o.timeout)) {
            throw new Error('The [ timeout ] option must be [ false ] or a non-negative integer');
        }
    }
    session = OTaaT.repl.start(o);
    session.commands['.timeout'] = createTimeoutCommand(o);
    return session;
};

module.exports = OTaaT;
