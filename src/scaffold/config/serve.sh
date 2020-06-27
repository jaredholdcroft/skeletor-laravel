#!/bin/bash

if [ "$1" = "artisan" ]
then
     echo "Starting artisan"
     php artisan serve --host=0
elif [ "$1" = "gulp" ]
then

     gulp --gulpfile gulpfile.skeletor.js
else
echo "Should we start artisan or gulp?"
fi
