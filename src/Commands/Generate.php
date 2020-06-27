<?php


namespace AMS\Skeletor\Commands;

use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;

class Generate extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var Signature
     */
    protected $signature = 'skeletor:make
        {type}
        {slug}
        {element=div}
        {description?}
        {--js : Add a javascript file}
        {--admin : creates in admin namespace}
        {--bare : creates template only, no sass or js}
    ';

    /**
     * The kinds of modules we're allowed to create
     * @todo create a layout type
     * @var Types
     */
    protected $types = [
        "basic",
        "module",
        "component",
        "template"
    ];

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generates scaffolding for Skeletor components';

    /**
     * The filesystem instance.
     *
     * @var Filesystem
     */
    protected $files;

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(Filesystem $files)
    {
        parent::__construct();
        $this->files = $files;
    }

    /**
     * Set the namespace
     *
     * @return void
     */
    public function namespace()
    {
        $namespace = ($this->option('admin') == null) ? "system" : "admin";

        return $namespace;
    }

    /**
     * Set the path
     *
     * @return void
     */
    public function path()
    {
        $path = resource_path() . "/views/{$this->namespace()}";

        return $path;
    }

    public function getComponentDirectory()
    {
        return "{$this->argument('type')}s/{$this->argument('slug')}";
    }

    /**
     * Creates the directory structure if it isn't there
     *
     * @return void
     */
    private function createDirectoryStructure()
    {
        // Make the namespace directory
        if(!$this->files->exists($this->path())){
            $this->files->makeDirectory($this->path());
        }

        // Then make the contents
        foreach ($this->types as $dir) {
            $typedir = "{$this->path()}/{$dir}s";
            if(!$this->files->exists($typedir)){
                $this->files->makeDirectory($typedir);
                $this->info("Created {$this->namespace()}/{$dir} directory");
            }
        }
    }

    /**
     * Make sure we can add this type
     *
     * @return void
     */
    private function canMakeType()
    {
        if(in_array($this->argument('type'), $this->types)){
            return true;
        }
    }

    /**
     * Creates the new directory if it doesn't exist
     *
     * @return void
     */
    private function createComponentDirectory()
    {
        if($this->canMakeType()){

            $dir = $this->getComponentDirectory();

            if(!$this->files->exists("{$this->path()}/{$dir}")) {
                $this->files->makeDirectory("{$this->path()}/{$dir}");
                $this->info("Success: created {$this->namespace()}/{$dir}");
            } else {
                $this->error("Error: {$this->path()}/{$dir} already exists");
            }

        } else {
            $this->error("Error: Can't create type '{$this->argument('type')}'");
        }
    }

    /**
     * Creates the new files
     *
     * @return void
     */
    private function createComponentFiles()
    {
        $stubs = $this->files->files(__DIR__ . '/../scaffold/stubs');

        foreach ($stubs as $stub) {
            if(!in_array($this->files->name($stub), $this->typeFilter())) {
                $this->files->put(
                    $this->createFileName($stub),
                    $this->compileComponentFile($stub)
                );
            }
        }
    }

    /**
     * Filter for file types based on input
     *
     * @return array
     */
    private function typeFilter()
    {

        $type = $this->argument('type');

        // Create a list of types to ignore
        $ignore = [];

        // If js flagged, create .js file
        if(!$this->option('js')) {
            array_push($ignore, "js");
        }

        // If template type, use template file
        if($type == "template") {
            array_push($ignore, "blade.php");
        }

        // If component or module
        if($type == "component" || $type == "module") {
            array_push($ignore, "template.blade.php");
        }

        // If basic type, don't print templates
        if($type == "basic"){
            array_push($ignore, "blade.php", "template.blade.php");
        }

        // If bare, only create the blade file
        if($this->option('bare')) {
            array_push($ignore, "js", "scss", "template.blade.php");
        }

        return $ignore;
    }

    /**
     * Compiles component file
     * @param  string $stub the path to the file we're using
     *
     * @return void
     */
    private function compileComponentFile($stub)
    {
        $stub = $this->files->get($stub);

        $fields = [
            'slug',
            'element',
            'description',
            'type'
        ];

        foreach ($fields as $field) {
            $stub = str_replace("{{ " . $field . " }}", $this->argument($field), $stub);
        }

        return $stub;
    }

    /**
     * Creates the file name we'll be using
     * @param  string $stub path to the new file
     *
     * @return void
     */
    private function createFileName($stub)
    {
        // Change the name to readme if it's a markdown
        $slug = (strpos($stub, 'md') ? 'readme' : $this->argument('slug'));

        // Remove 'template' from extensions
        $stub = str_replace("template.", "", $this->files->name($stub));

        return
            "{$this->path()}/" .
            "{$this->getComponentDirectory()}/" .
            "{$slug}." .
            "{$stub}"
        ;
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        $this->createDirectoryStructure();
        $this->createComponentDirectory();
        $this->createComponentFiles();
    }
}
