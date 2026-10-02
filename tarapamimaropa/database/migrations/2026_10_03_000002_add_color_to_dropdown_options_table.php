<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Matches the built-in palette in resources/js/constants/taraProjects.ts (projectTypeMeta).
     */
    private const DEFAULT_TYPE_COLORS = [
        'SETUP' => '#16823c',
        'SSCP' => '#7f23d0',
        'Roll-out' => '#a16207',
        'TAPI-assisted' => '#be185d',
        'GIA (Community Based)' => '#1d51db',
        'GIA (Region-initiated Projects) Internally Funded' => '#0e7490',
        'GIA (Region-initiated Projects) Externally Funded' => '#4338ca',
        'CEST' => '#c9440b',
    ];

    public function up(): void
    {
        Schema::table('dropdown_options', function (Blueprint $table) {
            $table->string('color', 7)->nullable()->after('label');
        });

        foreach (self::DEFAULT_TYPE_COLORS as $label => $color) {
            DB::table('dropdown_options')
                ->where('category', 'type')
                ->where('label', $label)
                ->update(['color' => $color]);
        }
    }

    public function down(): void
    {
        Schema::table('dropdown_options', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
