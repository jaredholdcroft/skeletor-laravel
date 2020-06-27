
# Skeletor for Laravel

Adds skeletor tools and architecture to an existing Laravel 5 project.

### Add this package to composer.json

```
"require": {
    "php": ">=5.6.4",
    "laravel/framework": "5.3.*",
    "ams/skeletor-laravel" : "dev-master"
},
```    

Make sure the [AMS Packagist](https://packagist.com/orgs/atlanticmediastrategies) is added to repositories:

```
"repositories": [
    {
        "type": "composer",
        "url": "https://repo.packagist.com/atlanticmediastrategies/"
    },
    {
        "packagist": false
    }
]
```    

then

`$ composer update`

and

`$ composer dump-autoload` for good measure

### Add service provider

config/app.php
```
/*
 * Package Service Providers...
 */

AMS\Skeletor\SkeletorServiceProvider::class,
```

### Publish base files to resources

Create directory structure, necessary .scss and .js files, plus some basic starter items to resources/views/

`$ php artisan vendor:publish --tag=skeletor`

### Add NPM dependencies to package.json

```
"dependencies": {
    "autoprefixer": "^6.3.1",
    "babel-plugin-lodash": "^2.3.0",
    "babel-plugin-transform-object-assign": "^6.5.0",
    "babel-preset-es2015": "^6.6.0",
    "babelify": "^7.3.0",
    "bourbon": "^4.2.6",
    "bourbon-neat": "^1.7.2",
    "browser-sync": "^2.11.1",
    "browserify": "^13.0.0",
    "colors-sass": "^1.0.0",
    "cssnano": "^3.4.0",
    "domready": "^1.0.8",
    "famous-polyfills": "^0.3.0",
    "globby": "^4.0.0",
    "gulp": "^3.9.0",
    "gulp-babel": "^6.1.1",
    "gulp-concat": "^2.6.0",
    "gulp-filter": "^4.0.0",
    "gulp-inject": "^4.0.0",
    "gulp-jsdoc3": "^0.2.1",
    "gulp-load-plugins": "^1.2.2",
    "gulp-notify": "^2.2.0",
    "gulp-plumber": "^1.0.1",
    "gulp-postcss": "^6.0.1",
    "gulp-sass": "^2.1.1",
    "gulp-size": "^2.0.0",
    "gulp-sourcemaps": "^1.6.0",
    "gulp-svgmin": "^1.2.2",
    "gulp-svgstore": "^6.0.0",
    "lodash": "^4.11.1",
    "node-sass-magic-importer": "^0.1.4",
    "normalize.css": "^3.0.3",
    "path": "^0.12.7",
    "picturefill": "^3.0.2",
    "postcss-scss": "^0.1.3",
    "sass-list-maps": "^1.0.0-b",
    "through2": "^2.0.1",
    "tooltip": "^1.6.1",
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "^1.1.0"
},
"devDependencies": {
    "animate.css": "^3.5.2",
    "colors.css": "^2.3.0",
    "gulp-mocha": "^2.2.0",
    "gulp-uglify": "^1.5.3",
    "gulp-uglifyjs": "^0.6.2",
    "jump.js": "^1.0.1",
    "karma": "^0.13.22",
    "mocha": "^2.4.5",
    "nightmare": "^2.3.4",
    "node-sass-glob-once": "^1.0.0-pre1",
    "should": "^8.3.1",
    "whatwg-fetch": "^1.0.0"
}
  ```

### Install dependencies
* npm via `$ yarn`

### Start server

* app: `$ php artisan serve --host=0`
* gulp: `$ gulp --gulpfile gulpfile.skeletor.js`

You can shortcut these with the rundev.sh script. To make sure it is executable:

`$ chmod a+x serve.sh`

Then run:

* app: `$ ./serve.sh artisan`
* gulp: `$ ./serve.sh gulp`

Alternately, if you want skeletor to be your gulp default, just remove your old one and change the name

```
$ rm -rf gulpfile.js && mv gulp.skeletor.js gulpfile.js
```

Visit [/skeletor](http://localhost:3001/skeletor), to verify that things are working.


# Commands

Skeletor comes with the following commands to assist you in managing views.

### `skeletor:make`

To scaffold something new:

`$ php artisan skeletor:make {type} {slug} {element} {--js} {--description=optional} {--admin} {--bare}`

* type: `basic`, `component`, `module` and `template`
* slug: directory name, should 'slug-styled'
* element: specify HTML element, will be printed in template
* js: adds a JS file
* description: will be printed in readme
* admin: creates view in admin vs system (system is default)
* bare: creates template and readme only



### `skeletor:reset`

To empty out the contents of each view type folder and start with a clean slate:

`$ php artisan skeletor:reset {folder}`
