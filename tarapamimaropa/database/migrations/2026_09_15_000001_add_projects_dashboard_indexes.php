<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Composite indexes for cursor pagination + province filters (large tables).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->index(['province', 'id'], 'projects_province_id_index');
            $table->index(['status', 'id'], 'projects_status_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex('projects_province_id_index');
            $table->dropIndex('projects_status_id_index');
        });
    }
};
