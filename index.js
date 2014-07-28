'use strict';

var OTaaT = {
    repl : require('repl'),
    vm : require('vm'),
    createEval : function (options) {
        var timeout = {};
        function setId (id) {
            timeout.id = id;
        }
        function clearId () {
            delete timeout.id;
        }
        return function (code, context, file, callback) {
            var err, result;
            if (timeout.id) { return; }
            try {
                if (options.useGlobal) {
                    result = OTaaT.vm.runInThisContext(code, file);
                } else {
                    result = OTaaT.vm.runInContext(code, context, file);
                }
                if (result && Object.prototype.toString.call(result.then) === '[object Function]') {
                    if (options.timeout) {
                        setId(setTimeout(function () {
                            clearId();
                            callback(new Error('The promise was not fulfilled or rejected before the timeout of [ ' + options.timeout + ' ] milliseconds.'));
                        }, options.timeout));
                    } else {
                        setId(false);
                    }
                    result
                    .then(
                    function (result) {
                        clearTimeout(timeout.id);
                        clearId();
                        callback(null, result);
                    },
                    function (reason) {
                        clearTimeout(timeout.id);
                        clearId();
                        callback(reason);
                    });
                }
            } catch (e) {
                clearTimeout(timeout.id);
                clearId();
                result = undefined;
                err = e;
            }

            if (timeout.id === undefined) {
                callback(err, result);
            }
        };
    }
};

function isValidTimoutNumber (arg) { return /^\+?[0-9]+$/.test(arg); }

function createTimeoutCommand (options) {
    return {
        help : 'Sets the promise timeout in milliseconds. A value of false means no timeout.',
        action : function (arg) {
            var valid = false;
            if (arg === 'false') {
                valid = true;
                options.timeout = false;
            }
            if (isValidTimoutNumber(arg)) {
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
    o.eval = OTaaT.createEval(o);
    if (o.timeout === undefined) {
        o.timeout = 60000;
    } else {
        if (o.timeout !== false && !isValidTimoutNumber(o.timeout)) {
            throw new Error('The [ timeout ] option must be [ false ] or a non-negative integer');
        }
    }
    session = OTaaT.repl.start(o);
    session.commands['.timeout'] = createTimeoutCommand(o);
    return session;
};

module.exports = OTaaT;
