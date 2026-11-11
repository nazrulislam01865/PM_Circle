<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('master_data_options', function (Blueprint $table): void {
            $table->string('icon_path', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('master_data_options', function (Blueprint $table): void {
            $table->dropColumn('icon_path');
        });
    }
};
