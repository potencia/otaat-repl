# OTaaTRepl #
#### A node.js REPL that helps you do "One thing at a time" ####

The [node.js REPL](http://nodejs.org/api/repl.html) is fantastic. It's a great tool for experimentation, testing, debugging, domain-specific languages, etc.
The only trouble with the REPL is that it is hard to deal with asynchronous code. Not impossible, just hard. It really is a great place to do one thing at a
time, but it's a lousy place to do many things at once.

Of course, if you are using node.js, you already use asynchronous code **all the time**. Asynchronous design is one of node.js's strengths. Even if you didn't
do any asynchronous coding before learning node.js, you do now, right?

Enter OTaaTRepl.

OTaaTRepl is a small wrapper around the standard node.js REPL that handles promise objects complying with the
[CommonJS Promises/A](http://wiki.commonjs.org/wiki/Promises/A) specification. When an expression results in a non-promise the REPL acts as normal. When an
expression results in a CommonJS Promises/A promise then the REPL does not return control back to the user until either the promise is fulfilled, the promise
is rejected, or a timeout is reached. This creates the illusion that the REPL is blocked until the asynchronous expression completes. When you want to do one
thing at a time this is exactly the behavior you want. When the promise is fulfilled the results are displayed and also put in the `_` variable just as if the
code really was blocking.

OTaaTRepl is known to work with the wonderful promise library [Q by Kris Kowal](https://github.com/kriskowal/q). In theory it should work with any object
that has a `then()` method that accepts a fulfillment callback and a rejection callback.

----------------------------------------------------------------------

### Installation ###

    npm install otaat-repl

----------------------------------------------------------------------

### Usage ###

To start up the REPL, require the library and call the static `start()` method. Use the REPL as you would use the normal node.js REPL. You don't need to write
callbacks for promises unless you want to actually do something in the callback. If all you want to do is get the value for later use, just store the contents
of the `_` variable somewhere.

Executable File: repl

    #!/usr/bin/env node

    require('otaat-repl').start();

Command line:

    $ ./repl

    > var Q = require('q'); // You will need to have Q installed
    undefined
    > Q.nfcall(fs.readdir, '.');
    [ '.git',
      'README.md',
      'repl' ]
    > _
    [ '.git',
      'README.md',
      'repl' ]
    > 

Notice how the array of file names was returned as if this was the synchronous function? fs.readdir() is the *async* version of the function and it is supposed
to take a callback. The Q.nfcall() method calls the standard style node.js async function and returns a promise.

OTaaTRepl detects the promise and waits to execute the REPL callback until the promise is either fulfilled (the results are sent to the callback) or rejected
(the reason is sent to the callback).

The default timeout is 1 minute (60000 milliseconds). If the promise is not fulfilled or rejected within the timeout period, the callback is called with a
timeout error. The timeout value can be set to any positive value. It can also be disabled by setting the timeout to `false`.

#### start() Options ####

You may pass an options object to `OTaaTRepl.start()`. Except for a few exceptions (below) the values are passed directly to the underlying node.js REPL. See
the [node.js REPL documentation](http://nodejs.org/api/repl.html#repl_repl_start_options) for the supported options.

##### eval #####

This option is NOT passed on to the node.js REPL start up even if it is provided. This is because OTaaTRepl provides its own custom eval function. If you need
to provide a custom eval function then OTaaTRepl is not for you. Use the node.js REPL directly.

##### timeout #####

This option is passed on to the underlying node.js REPL even though it is ignored. The OTaaTRepl uses this option to set the timeout for promise fulfillment
or rejection.

Valid values:

- Non-negative integer: Sets the timeout to that number of milliseconds
- `false`: Disables the timeout logic

Default value:

- 60000

Examples: 

    OTaaTRepl.start({
        timeout : 360000 // The timeout will be 5 minutes
    });

    // or

    OTaaTRepl.start({
        timeout : false // There will be no timeout
    });

    // or

    OTaaTRepl.start(); // There timeout will be 1 minute

#### REPL command: .timeout ####

From inside the REPL the user may display or set the timeout value using the `.timeout` command. When called with no arguments the command outputs the current
setting. When passed an argument the setting is changed.

Valid arguments:

- Non-negative integer: Sets the timeout to that number of milliseconds
- `false`: Disables the timeout logic

Example: 

    $ ./repl # defined above

    > .timeout
    Promise timeout in milliseconds: 60000
    > .timeout 360000
    Promise timeout in milliseconds: 360000
    > .timeout false
    Promise timeout disabled
    > .timeout true
    Promise timeout was not changed from [ false ].

    Valid values are [ false ] for no timeout and non-negative integers specifying the timeout in milliseconds.

    > .timeout 60000
    Promise timeout in milliseconds: 60000
    > 

----------------------------------------------------------------------

### License ###

otaat-repl is provided under the MIT License.

Copyright &copy; 2014 John P. Johnson II

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR
A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
