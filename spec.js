'use strict';

var expect = require('chai').expect,
Q = require('q'),
sinon = require('sinon'),
OTaaT = require('./index');

describe('OTaaT', function () {
    var replStart, replSession;
    beforeEach(function () {
        replSession = {context : {}, commands : {}};
        replStart = sinon.stub(OTaaT.repl, 'start').returns(replSession);
    });

    afterEach(function () {
        replStart.restore();
    });

    it('should be an object', function () {
        expect(OTaaT).to.be.an('object');
    });

    describe('static .start()', function () {
        it('should return the result of calling the node repl.start() function', function () {
            expect(OTaaT.start()).to.equal(replSession);
            expect(replStart.callCount).to.equal(1);
        });

        it('should pass normal options to repl.start()', function () {
            OTaaT.start({
                prompt : 'otaat> '
            });
            expect(replStart.firstCall.args[0].prompt).to.equal('otaat> ');
        });

        it('should not pass the [ eval ] option to repl.start()', function () {
            function evalFn () {}
            OTaaT.start({
                eval : evalFn
            });
            expect(replStart.firstCall.args[0].eval).to.not.equal(evalFn);
        });

        it('should default the [ timeout ] option to 60000', function () {
            OTaaT.start({
                prompt : 'otaat> '
            });
            expect(replStart.firstCall.args[0].timeout).to.equal(60000);
        });

        it('should allow [ timeout ] to be [ false ] (no timeout)', function () {
            OTaaT.start({
                prompt : 'otaat> ',
                timeout : false
            });
            expect(replStart.firstCall.args[0].timeout).to.equal(false);
        });

        it('should not allow invalid values for [ timeout ]', function () {
            expect(OTaaT.start.bind(null, {
                prompt : 'otaat> ',
                timeout : 'foo'
            })).to.throw(Error, 'The [ timeout ] option must be [ false ] or a non-negative integer');
        });

        describe('calling [ .createEval() ]', function () {
            function evalFn () {}
            beforeEach(function () {
                sinon.stub(OTaaT, 'createEval').returns(evalFn);
            });

            afterEach(function () {
                OTaaT.createEval.restore();
            });

            it('should pass the [ eval ] option', function () {
                OTaaT.start({
                    prompt : 'otaat> '
                });
                expect(replStart.firstCall.args[0].eval).to.equal(evalFn);
                expect(OTaaT.createEval.callCount).to.equal(1);
                expect(OTaaT.createEval.firstCall.args).to.have.length(1);
                expect(OTaaT.createEval.firstCall.args[0].prompt).to.equal('otaat> ');
            });
        });
    });

    describe('generated eval function', function () {
        var evalFn, vmRunInContext, callback, callback2, callback3;
        beforeEach(function () {
            vmRunInContext = sinon.stub(OTaaT.vm, 'runInContext');
            callback = sinon.stub();
            callback2 = sinon.stub();
            callback3 = sinon.stub();
            OTaaT.start({
                timeout : 50
            });
            evalFn = replStart.firstCall.args[0]['eval'];
        });

        afterEach(function () {
            vmRunInContext.restore();
        });

        describe('when useGlobal is set', function () {
            var vmRunInThisContext;
            beforeEach(function () {
                vmRunInThisContext = sinon.stub(OTaaT.vm, 'runInThisContext');
                replStart.reset();
                OTaaT.start({
                    useGlobal : true
                });
                evalFn = replStart.firstCall.args[0]['eval'];
            });

            afterEach(function () {
                vmRunInThisContext.restore();
            });

            it('should pass [ code ] and [ file ] to [ vm.runInThisContext() ]', function (done) {
                Q().then(function () {
                    evalFn('test: code', 'test: context', 'test: file', callback);
                }).delay(1).then(function () {
                    expect(vmRunInThisContext.callCount).to.equal(1);
                    expect(vmRunInThisContext.firstCall.args).to.deep.equal(['test: code', 'test: file']);
                }).done(done);
            });
        });

        it('should pass [ code ], [ context ], and [ file ] to [ vm.runInContext() ]', function (done) {
            Q().then(function () {
                evalFn('test: code', 'test: context', 'test: file', callback);
            }).delay(1).then(function () {
                expect(vmRunInContext.callCount).to.equal(1);
                expect(vmRunInContext.firstCall.args).to.deep.equal(['test: code', 'test: context', 'test: file']);
            }).done(done);
        });

        describe('when running the code throws an error', function () {
            var err;
            beforeEach(function () {
                err = new Error('Ouch!');
                vmRunInContext.throws(err);
            });

            it('should pass the error to the callback', function (done) {
                Q().then(function () {
                    evalFn(null, null, null, callback);
                }).delay(1).then(function () {
                    expect(callback.callCount).to.equal(1);
                    expect(callback.firstCall.args[0]).to.equal(err);
                }).done(done);
            });
        });

        describe('when the evaluated code results in a non promise object', function () {
            it('should call the callback with the result', function (done) {
                var result = {type : 'result'};
                vmRunInContext.returns(result);
                Q().then(function () {
                    evalFn(0, 1, 2, callback);
                }).delay(1).then(function () {
                    expect(callback.callCount).to.equal(1);
                    expect(callback.firstCall.args).to.deep.equal([undefined, result]);
                }).done(done);
            });

            it('should allow multiple calls in a row', function (done) {
                Q().then(function () {
                    evalFn(0, 1, 2, callback);
                    evalFn(0, 1, 2, callback);
                    evalFn(0, 1, 2, callback);
                }).delay(1).then(function () {
                    expect(vmRunInContext.callCount).to.equal(3);
                }).done(done);
            });
        });

        describe('when the evaluated code results in a promise object', function () {
            var deferred, deferred2, deferred3;
            beforeEach(function () {
                deferred = Q.defer();
                deferred2 = Q.defer();
                deferred3 = Q.defer();
                vmRunInContext.onFirstCall().returns(deferred.promise);
                vmRunInContext.onSecondCall().returns(deferred2.promise);
                vmRunInContext.onThirdCall().returns(deferred3.promise);
            });

            it('should call the callback with the reason when the promise is rejected', function (done) {
                Q().then(function () {
                    evalFn(0, 1, 2, callback);
                    expect(callback.callCount).to.equal(0);
                    deferred.reject('Boo!');
                }).delay(1).then(function () {
                    expect(callback.callCount).to.equal(1);
                    expect(callback.firstCall.args).to.deep.equal(['Boo!']);
                }).done(done);
            });

            it('should process calls in the order they were received', function (done) {
                Q().then(function () {
                    evalFn(0, 1, 2, callback);
                }).then(function () {
                    evalFn(0, 1, 2, callback2);
                }).then(function () {
                    evalFn(0, 1, 2, callback3);
                    expect(callback.callCount).to.equal(0);
                    expect(callback2.callCount).to.equal(0);
                    expect(callback3.callCount).to.equal(0);
                    deferred.resolve('Yay!');
                    deferred3.resolve('Yay3!');
                }).delay(1).then(function () {
                    expect(callback.callCount).to.equal(1);
                    expect(callback2.callCount).to.equal(0);
                    expect(callback3.callCount).to.equal(0);
                    expect(callback.firstCall.args).to.deep.equal([undefined, 'Yay!']);
                    deferred2.resolve('Yay2!');
                }).delay(1).then(function () {
                    expect(callback.callCount).to.equal(1);
                    expect(callback2.callCount).to.equal(1);
                    expect(callback3.callCount).to.equal(1);
                    expect(callback2.firstCall.args).to.deep.equal([undefined, 'Yay2!']);
                    expect(callback3.firstCall.args).to.deep.equal([undefined, 'Yay3!']);
                }).done(done);
            });

            it('should call the callback with the result when the promise is fulfilled', function (done) {
                Q().then(function () {
                    evalFn(0, 1, 2, callback);
                    expect(callback.callCount).to.equal(0);
                    deferred.resolve('Yay!');
                }).delay(1).then(function () {
                    expect(callback.callCount).to.equal(1);
                    expect(callback.firstCall.args).to.deep.equal([undefined, 'Yay!']);
                }).done(done);
            });

            it('should call the callback with an error when the promise is pending after a timeout', function (done) {
                Q().then(function () {
                    evalFn(0, 1, 2, callback);
                    expect(callback.callCount).to.equal(0);
                }).delay(75).then(function () {
                    expect(callback.callCount).to.equal(1);
                    expect(callback.firstCall.args).to.have.length(1);
                    expect(callback.firstCall.args[0]).to.be.an.instanceOf(Error);
                    expect(callback.firstCall.args[0].message).to.equal('The promise was not fulfilled or rejected before the timeout of [ 50 ] milliseconds.');
                }).done(done);
            });

            it('should allow the timeout to be [ false ] (no timeout)', function (done) {
                replStart.reset();
                OTaaT.start({
                    timeout : false
                });
                evalFn = replStart.firstCall.args[0]['eval'];

                evalFn(0, 1, 2, callback);
                expect(callback.callCount).to.equal(0);
                deferred.resolve('Yay!');
                setImmediate(function () {
                    expect(callback.callCount).to.equal(1);
                    expect(callback.firstCall.args).to.deep.equal([undefined, 'Yay!']);
                    done();
                });
            });

            it('should call the callback with any error [ .then() ] throws', function () {
                var err = new Error('I am not a real promise.');
                vmRunInContext.returns({then : function () { throw err; }});
                Q().then(function () {
                    evalFn(0, 1, 2, callback);
                }).then(function () {
                    expect(callback.callCount).to.equal(1);
                    expect(callback.firstCall.args).to.deep.equal([err, undefined]);
                });
            });
        });
    });

    describe('.timeout REPL command', function () {
        var thisObj, displayPrompt;
        beforeEach(function () {
            displayPrompt = sinon.stub();
            thisObj = {
                displayPrompt : displayPrompt
            };
            sinon.stub(console, 'log');
        });

        afterEach(function () {
            console.log.restore();
        });

        it('should be added to the [ session.commands ] object', function () {
            OTaaT.start();
            expect(replSession.commands).to.have.property('.timeout');
            expect(replSession.commands['.timeout']).to.have.property('help', 'Sets the promise timeout in milliseconds. A value of false means no timeout.');
            expect(replSession.commands['.timeout']).to.have.property('action');
            expect(replSession.commands['.timeout'].action).to.be.a('function');
        });

        describe('when called with no argument', function () {
            it('should print out the current timeout setting when defaulted', function () {
                OTaaT.start();
                replSession.commands['.timeout'].action.call(thisObj, '');
                expect(console.log.firstCall.args).to.deep.equal(['Promise timeout in milliseconds: 60000']);
                expect(displayPrompt.callCount).to.equal(1);
            });

            it('should print out the current timeout setting when set in the options', function () {
                OTaaT.start({
                    timeout : 20000
                });
                replSession.commands['.timeout'].action.call(thisObj, '');
                expect(console.log.firstCall.args).to.deep.equal(['Promise timeout in milliseconds: 20000']);
                expect(displayPrompt.callCount).to.equal(1);
            });
        });

        describe('when called with [ false ]', function () {
            it('should set the timeout to false (no timeout)', function () {
                OTaaT.start();
                replSession.commands['.timeout'].action.call(thisObj, 'false');
                expect(console.log.firstCall.args).to.deep.equal(['Promise timeout disabled']);
                expect(displayPrompt.callCount).to.equal(1);
                displayPrompt.reset();
                replSession.commands['.timeout'].action.call(thisObj, '');
                expect(console.log.secondCall.args).to.deep.equal(['Promise timeout disabled']);
                expect(displayPrompt.callCount).to.equal(1);
            });
        });

        describe('when called with a positive integer', function () {
            it('should set the timeout', function () {
                OTaaT.start();
                replSession.commands['.timeout'].action.call(thisObj, '0');
                expect(console.log.firstCall.args).to.deep.equal(['Promise timeout in milliseconds: 0']);
                expect(displayPrompt.callCount).to.equal(1);
                displayPrompt.reset();
                replSession.commands['.timeout'].action.call(thisObj, '');
                expect(console.log.secondCall.args).to.deep.equal(['Promise timeout in milliseconds: 0']);
                expect(displayPrompt.callCount).to.equal(1);
                displayPrompt.reset();
                console.log.reset();

                replSession.commands['.timeout'].action.call(thisObj, '3000');
                expect(console.log.firstCall.args).to.deep.equal(['Promise timeout in milliseconds: 3000']);
                expect(displayPrompt.callCount).to.equal(1);
                displayPrompt.reset();
                replSession.commands['.timeout'].action.call(thisObj, '');
                expect(console.log.secondCall.args).to.deep.equal(['Promise timeout in milliseconds: 3000']);
                expect(displayPrompt.callCount).to.equal(1);
            });
        });

        describe('when called with an invalid value', function () {
            it('should print out a helpful message', function () {
                OTaaT.start();
                replSession.commands['.timeout'].action.call(thisObj, 'foo');
                expect(console.log.firstCall.args).to.deep.equal(['Promise timeout was not changed from [ 60000 ].\n\nValid values are [ false ] for no ' +
                'timeout and non-negative integers specifying the timeout in milliseconds.\n']);
                expect(displayPrompt.callCount).to.equal(1);
            });
        });
    });
});
