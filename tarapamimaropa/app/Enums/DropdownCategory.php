<?php

namespace App\Enums;

enum DropdownCategory: string
{
    case Type = 'type';
    case Sector = 'sector';

    public function label(): string
    {
        return match ($this) {
            self::Type => 'Type',
            self::Sector => 'Sector',
        };
    }

    /**
     * Matching column on the projects table.
     */
    public function projectColumn(): string
    {
        return $this->value;
    }
}
