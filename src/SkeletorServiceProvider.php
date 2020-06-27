<?php

namespace AMS\Skeletor;

use Illuminate\Support\ServiceProvider;

class SkeletorServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        // Boot commands
		if ($this->app->runningInConsole()) {
	        $this->commands([
	            Commands\Generate::class,
	            Commands\Reset::class,
	        ]);
	    }

        $this->publishes([
            __DIR__.'/scaffold/config/gulpfile.skeletor.js' => base_path('gulpfile.skeletor.js')
        ], 'skeletor');

		$this->publishes([
            __DIR__.'/scaffold/config/jsdoc.conf.json' => base_path('jsdoc.conf.json')
        ], 'skeletor');

		$this->publishes([
            __DIR__.'/scaffold/config/babelrc' => base_path('.babelrc')
        ], 'skeletor');

		$this->publishes([
            __DIR__.'/scaffold/config/serve.sh' => base_path('serve.sh')
        ], 'skeletor');

        $this->publishes([
            __DIR__.'/scaffold/config/index.js' => resource_path('assets/js/src/index.js')
        ], 'skeletor');

		$this->publishes([
            __DIR__.'/scaffold/views' => resource_path('views')
        ], 'skeletor');

        $this->registerComponentDirectories();

		$this->loadRoutesFrom(__DIR__.'/library/routes/web.php');

        $this->loadViewsFrom(__DIR__.'/library/resources/views', 'skeletor');
    }

    /**
     * Sets directories so we can have nicer includes
     *
     * @return void
     */
    public function registerComponentDirectories()
    {
        foreach(glob(realpath(base_path('resources/views/system')) . '/**/*', GLOB_ONLYDIR) as $dir) {
            \View::addLocation($dir);
        }

        foreach(glob(realpath(base_path('resources/views/admin')) . '/**/*', GLOB_ONLYDIR) as $dir) {
            \View::addLocation($dir);
        }
    }
}
