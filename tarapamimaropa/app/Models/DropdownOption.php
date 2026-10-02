<?php

namespace App\Models;

use App\Enums\DropdownCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property DropdownCategory $category
 * @property string $label
 * @property string|null $color
 * @property int $sort_order
 */
class DropdownOption extends Model
{
    protected $fillable = [
        'category',
        'label',
        'color',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'category' => DropdownCategory::class,
            'sort_order' => 'integer',
        ];
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('label');
    }

    /**
     * @return list<string>
     */
    public static function labels(DropdownCategory $category): array
    {
        return self::query()
            ->where('category', $category)
            ->ordered()
            ->pluck('label')
            ->all();
    }

    /**
     * Super Admin–chosen colors keyed by label (e.g. ['SETUP' => '#16823c']).
     *
     * @return array<string, string>
     */
    public static function colors(DropdownCategory $category): array
    {
        return self::query()
            ->where('category', $category)
            ->whereNotNull('color')
            ->ordered()
            ->pluck('color', 'label')
            ->all();
    }

    /**
     * Labels per category, keyed by category value (e.g. ['type' => [...], 'sector' => [...]]).
     *
     * @return array<string, list<string>>
     */
    public static function labelsByCategory(): array
    {
        $grouped = self::query()
            ->ordered()
            ->get(['category', 'label'])
            ->groupBy(fn (self $option): string => $option->category->value);

        $result = [];
        foreach (DropdownCategory::cases() as $category) {
            $result[$category->value] = $grouped
                ->get($category->value, collect())
                ->pluck('label')
                ->values()
                ->all();
        }

        return $result;
    }
}
