var sip = require('gulp-sip'),
options = {
    watch : {
        list : ['w', 'watch']
    },
    coverage : {
        list : ['c', 'coverage']
    },
    reporter : {
        list : ['r', 'reporter']
    },
    stackTrace : {
        list : ['s', 'st', 'stacktrace']
    }
};

function availableOptions() {
    var ctr, len, availOptions = {};
    for(ctr = 0, len = arguments.length; ctr < len; ctr++) {
        if (options.hasOwnProperty(arguments[ctr])) {
            availOptions[arguments[ctr]] = options[arguments[ctr]];
        }
    }
    return availOptions;
}

sip.plugin('js', {
    all : ['index.js', 'spec.js'],
    main : 'index.js',
    test : 'spec.js'
});

sip.plugin('gutil', require('gulp-util'));
sip.plugin('jscs', require('gulp-jscs'));
sip.plugin('jshint', require('gulp-jshint'));
sip.plugin('istanbul', require('gulp-istanbul'));
sip.plugin('mocha', require('gulp-mocha'));
sip.plugin('sequence', require('run-sequence'));

sip.task('lint.main', 'Check main JavaScript for potential problems', function (gulp, js, jshint) {
    return gulp.src(js.main)
    .pipe(jshint('build/jshint.main.json'))
    .pipe(jshint.reporter('jshint-stylish'));
});

sip.task('lint.test', 'Check test JavaScript for potential problems', function (gulp, js, jshint) {
    return gulp.src(js.test)
    .pipe(jshint('build/jshint.test.json'))
    .pipe(jshint.reporter('jshint-stylish'));
});

sip.task('lint.run', ['lint.main', 'lint.test']);

sip.task('watch.lint', 'Continually check all JavaScript for potential problems', function (gulp, js) {
    gulp.watch(js.main, ['lint.main']);
    gulp.watch(js.test, ['lint.test']);
});

sip.task('lint', 'Check all JavaScript for potential problems', availableOptions('watch'), function (options, sequence, done) {
    if (options.watch) {
        sequence('lint.run', 'watch.lint', done);
    } else {
        sequence('lint.run', done);
    }
});

sip.task('style.run', function (gulp, js, jscs, done) {
    gulp.src(js.all)
    .pipe(jscs('build/jscs.json'))
    .on('error', function (error) {
        sip.log(error.message);
    })
    .on('finish', done);
});

sip.task('watch.style', 'Continually check the coding style of all JavaScript code', function (gulp, js) {
    gulp.watch(js.all, ['style.run']);
});

sip.task('style', 'Check the coding style of all JavaScript code', availableOptions('watch'), function (options, sequence, done) {
    if (options.watch) {
        sequence('style.run', 'watch.style', done);
    } else {
        sequence('style.run', done);
    }
});

sip.task('test.run', availableOptions('coverage', 'reporter', 'stackTrace'), function (gulp, gutil, options, mocha, istanbul, js, done) {
    function runTests() {
        gulp.src(js.test)
        .pipe(mocha({reporter : options.reporter || 'dot'}))
        .on('error', function (error) {
            sip.log.partial.red.partial.bold('Test Error: ')(error.message);
            if (options.stackTrace) { sip.log.reset.eol(error.stack); }
            sip.log.done;
        })
        .pipe(options.coverage ? istanbul.writeReports('coverage') : gutil.noop())
        .on('finish', done);
    }
    if (options.coverage) {
        gulp.src(js.main)
        .pipe(istanbul())
        .on('finish', runTests);
    } else {
        runTests();
    }
});

sip.task('watch.test', 'Continually run all unit tests', function (gulp, js) {
    gulp.watch(js.all, ['test.run']);
});

sip.task('test', 'Run all unit tests', availableOptions('watch'), function (options, sequence, done) {
    if (options.watch) {
        sequence('test.run', 'watch.test', done);
    } else {
        sequence('test.run', done);
    }
});

sip.task('all', 'Run linter, style checker, and tests', ['lint', 'style', 'test']);

sip.run(require('gulp'));
