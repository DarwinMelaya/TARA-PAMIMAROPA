<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const DEFAULT_SECTOR_COLORS = [
        'Industry' => '#4338ca',
        'Water' => '#0e7490',
        'Education' => '#a16207',
        'Environment' => '#16823c',
        'Energy' => '#c9440b',
        'DRRM' => '#b91c1c',
        'Agriculture' => '#4d7c0f',
        'Tourism' => '#be185d',
        'Fisheries' => '#1d51db',
    ];

    public function up(): void
    {
        foreach (self::DEFAULT_SECTOR_COLORS as $label => $color) {
            DB::table('dropdown_options')
                ->where('category', 'sector')
                ->where('label', $label)
                ->whereNull('color')
                ->update(['color' => $color]);
        }
    }

    public function down(): void
    {
        DB::table('dropdown_options')
            ->where('category', 'sector')
            ->update(['color' => null]);
    }
};
