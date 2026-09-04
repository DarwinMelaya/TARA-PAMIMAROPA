<?php

namespace App\Enums;

enum UserRole: string
{
    case Psto = 'psto';
    case RegionalOffice = 'regional_office';
    case SuperAdmin = 'super_admin';

    public function label(): string
    {
        return match ($this) {
            self::Psto => 'PSTO',
            self::RegionalOffice => 'Regional Office',
            self::SuperAdmin => 'Super Admin',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $role): array => [
                'value' => $role->value,
                'label' => $role->label(),
            ],
            self::cases(),
        );
    }
}
