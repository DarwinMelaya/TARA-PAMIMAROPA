<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const DEFAULTS = [
        'type' => [
            'SETUP',
            'SSCP',
            'Roll-out',
            'TAPI-assisted',
            'GIA (Community Based)',
            'GIA (Region-initiated Projects) Internally Funded',
            'GIA (Region-initiated Projects) Externally Funded',
            'CEST',
        ],
        'sector' => [
            'Industry',
            'Water',
            'Education',
            'Environment',
            'Energy',
            'DRRM',
            'Agriculture',
            'Tourism',
            'Fisheries',
        ],
    ];

    public function up(): void
    {
        Schema::create('dropdown_options', function (Blueprint $table) {
            $table->id();
            $table->string('category', 32);
            $table->string('label');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['category', 'label']);
            $table->index(['category', 'sort_order']);
        });

        $now = now();
        $rows = [];

        foreach (self::DEFAULTS as $category => $labels) {
            foreach ($labels as $index => $label) {
                $rows[] = [
                    'category' => $category,
                    'label' => $label,
                    'sort_order' => $index + 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('dropdown_options')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('dropdown_options');
    }
};
