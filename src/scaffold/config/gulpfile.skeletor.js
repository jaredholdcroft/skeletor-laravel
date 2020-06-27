var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var path = require('path');

// browserify  deps
var browserify = require('browserify');
var through = require('through2');
var globby = require('globby');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var babelify = require('babelify');

// Postcss
var magicImporter = require('node-sass-magic-importer')
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');

var bs = require('browser-sync');

var errorHandlers = {
  all: $.notify.onError("Error <%= error.message %>")
}

var PATHS = {
  sassWatch: [
    './resources/views/system/**/**/*.scss'
  ],
  sass: [
    './resources/views/system/styles.scss'
  ],
  js: [
    './resources/assets/js/src/index.js',
    './resources/views/system/**/**/*.js',
  ],
  blade: [
    './resources/views/admin/**/*.blade.php',
    './resources/views/system/**/*.blade.php',
  ]

};

gulp.task('sass', function() {
  var postcssPlugins = [
    autoprefixer
  ];

  if(process.env.NODE_ENV === 'production') {
    postcssPlugins.push(cssnano);
  }

  gulp.src(PATHS.sass)
    .pipe($.plumber({
      errorHandler: errorHandlers.all
    }))
    .pipe($.sourcemaps.init())
      .pipe($.sass({
        outputStyle: 'compressed',
        importer: magicImporter
      }))
      .pipe($.postcss(postcssPlugins))
      .pipe($.concat('styles.css'))
    .pipe($.sourcemaps.write('maps'))
    .pipe(gulp.dest('./public/css/'))
    .pipe(bs.stream({match: '**/*.css'}))
    .pipe($.filter('*.css'))
    .pipe($.size({
      gzip: true
    }))
});

gulp.task('doc', function (cb) {
  var config = require('./jsdoc.conf.json');
  gulp
    .src(PATHS.js)
    .pipe($.jsdoc3(config, cb));
});

/**
 Source:github.com/gulpjs/gulp/blob/master/docs/recipes/browserify-with-globs.md
 */
gulp.task('js', ['doc'], function () {

  var bundledStream = through();

  bundledStream
    .pipe(source('scripts.js'))
    .pipe(buffer())
    .pipe($.sourcemaps.init({loadMaps: true}))
    .pipe($.uglifyjs())
    .pipe($.sourcemaps.write('maps'))
    .pipe(gulp.dest('./public/js/'))
    .pipe($.filter('**/**/*.js'))
    .pipe($.size({gzip: true}))

  globby(PATHS.js)
    .then(function(entries) {
      var b =
        browserify({
          entries: entries,
          debug: true,
          transform: [babelify]
        })
      b.bundle().pipe(bundledStream)
    })
    .catch(function(err) {
      bundledStream.emit('error', err);
    })

  return bundledStream;
});

// Todo
// gulp.task('svg', function() {
//   var svgs = gulp.src('./views/components/icon/source/*.svg')
//     .pipe($.svgmin(function (file) {
//       var prefix = path.basename(file.relative, path.extname(file.relative));
//         return {
//           plugins: [{
//             cleanupIDs: {
//               prefix: prefix + '-',
//               minify: true
//             }
//           }]
//         }
//     }))
//     .pipe($.svgstore())
//     .pipe(gulp.dest('./views/components/icon/'))
// });

/*
 *  Init browser-sync and watch appropriate files
 */
gulp.task('watch', function() {
  if(process.env.NODE_ENV === 'production') {
    return;
  }
  bs.init({
    proxy: 'localhost:8000',
    port: 3001
  })

  gulp.watch(PATHS.sass, ['sass']);
  gulp.watch(PATHS.sassWatch, ['sass']);
  gulp.watch(PATHS.js, ['js']);
  gulp.watch(PATHS.twig)
    .on('change', function () {
      bs.reload()
    })
});

gulp.task('test', function() {
  gulp.src(PATHS.tests, {read: false})
    .pipe($.mocha())
    .once('error', function(e) {
      console.log(e)
      process.exit(1)
    })
    .once('end', function () {
      process.exit()
    })
});

gulp.task('build:production', ['sass', 'js']);
gulp.task('build', ['sass', 'js', 'watch']);

gulp.task('default', ['build']);
