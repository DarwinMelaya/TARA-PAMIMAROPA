<?php

namespace Database\Seeders;

use App\Services\ProjectExcelImporter;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class ProjectSeeder extends Seeder
{
    public function run(ProjectExcelImporter $importer): void
    {
        $path = public_path('List of projects.xlsx');

        if (! File::exists($path)) {
            $this->command?->warn('Skipped ProjectSeeder: public/List of projects.xlsx missing.');

            return;
        }

        $result = $importer->import($path);

        $this->command?->info(sprintf(
            'Projects seeded: %d new, %d updated, %d skipped.',
            $result['imported'],
            $result['updated'],
            $result['skipped'],
        ));
    }
}
