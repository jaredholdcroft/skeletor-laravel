<?php


namespace AMS\Skeletor\Commands;

use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;

class Reset extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var Signature
     */
    protected $signature = 'skeletor:reset
        {namespace : name of the directory we will delete}
    ';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Removes everything under views';

    /**
     * The filesystem instance.
     *
     * @var Filesystem
     */
    protected $files;

	/**
     * The kinds of modules we're allowed to create
     *
     * @var Types
     */
    protected $views = [
        "basics",
        "modules",
        "components",
        "templates"
    ];

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
     * Sets the path based on namespace
     */
    public function path()
    {
        $namespace = $this->argument('namespace');
        $path = resource_path() . "/views/{$namespace}";

        return $path;
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        if(!$this->files->exists($this->path())){
            $this->error("There's no directory named {$this->path()}");
        } else {
            $bar = $this->output->createProgressBar(count($this->views));
            if ($this->confirm("Are you sure?")) {

                foreach ($this->views as $type) {
                    $this->files->cleanDirectory("{$this->path()}/{$type}");
                    $bar->advance();
                }

                $bar->finish();
                $this->info("Success: resources/{$this->path()} has been emptied");
            }
        }

    }
}
