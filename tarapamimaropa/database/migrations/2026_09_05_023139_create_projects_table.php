<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('row_number')->nullable();
            $table->string('code')->nullable()->unique();
            $table->string('name');
            $table->string('type')->nullable()->index();
            $table->unsignedSmallInteger('year_approved')->nullable()->index();
            $table->string('beneficiary')->nullable();
            $table->text('collaborators')->nullable();
            $table->string('sector')->nullable()->index();
            $table->string('province')->nullable()->index();
            $table->string('city')->nullable();
            $table->string('district')->nullable();
            $table->string('status')->nullable()->index();
            $table->decimal('project_cost', 15, 2)->nullable();
            $table->decimal('amount_due', 15, 2)->nullable();
            $table->decimal('refunded', 15, 2)->nullable();
            $table->decimal('refund_rate', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
