<?php

namespace App\Enums;

enum Province: string
{
    case OccidentalMindoro = 'Occidental Mindoro';
    case OrientalMindoro = 'Oriental Mindoro';
    case Marinduque = 'Marinduque';
    case Romblon = 'Romblon';
    case Palawan = 'Palawan';

    public function label(): string
    {
        return $this->value;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $province): array => [
                'value' => $province->value,
                'label' => $province->label(),
            ],
            self::cases(),
        );
    }
}
