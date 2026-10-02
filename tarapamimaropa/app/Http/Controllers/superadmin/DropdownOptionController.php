<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Enums\DropdownCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\StoreDropdownOptionRequest;
use App\Http\Requests\SuperAdmin\UpdateDropdownOptionRequest;
use App\Models\DropdownOption;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DropdownOptionController extends Controller
{
    /**
     * Type and Sector option lists with how many projects use each label.
     */
    public function index(): Response
    {
        $options = DropdownOption::query()->ordered()->get()
            ->groupBy(fn (DropdownOption $option): string => $option->category->value);

        $categories = array_map(function (DropdownCategory $category) use ($options): array {
            $column = $category->projectColumn();
            $usage = Project::query()
                ->whereNotNull($column)
                ->groupBy($column)
                ->pluck(DB::raw('count(*)'), $column);

            return [
                'value' => $category->value,
                'label' => $category->label(),
                'options' => $options->get($category->value, collect())
                    ->map(fn (DropdownOption $option): array => [
                        'id' => $option->id,
                        'label' => $option->label,
                        'color' => $option->color,
                        'projects_count' => (int) ($usage[$option->label] ?? 0),
                    ])
                    ->values(),
            ];
        }, DropdownCategory::cases());

        return Inertia::render('superadmin/DropdownManagement', [
            'categories' => $categories,
        ]);
    }

    public function store(StoreDropdownOptionRequest $request): RedirectResponse
    {
        $data = $request->validated();

        DropdownOption::create([
            'category' => $data['category'],
            'label' => $data['label'],
            'color' => $data['color'] ?? null,
            'sort_order' => (int) DropdownOption::query()
                ->where('category', $data['category'])
                ->max('sort_order') + 1,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Option added.'),
        ]);

        return to_route('superadmin.settings.dropdowns');
    }

    /**
     * Rename / recolor an option; projects using the old label are renamed too so filters stay consistent.
     */
    public function update(UpdateDropdownOptionRequest $request, DropdownOption $dropdownOption): RedirectResponse
    {
        $newLabel = $request->validated('label');
        $oldLabel = $dropdownOption->label;
        $color = $request->validated('color');

        DB::transaction(function () use ($dropdownOption, $oldLabel, $newLabel, $color): void {
            $dropdownOption->update(['label' => $newLabel, 'color' => $color]);

            if ($oldLabel !== $newLabel) {
                Project::query()
                    ->where($dropdownOption->category->projectColumn(), $oldLabel)
                    ->update([$dropdownOption->category->projectColumn() => $newLabel]);
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Option updated.'),
        ]);

        return to_route('superadmin.settings.dropdowns');
    }

    /**
     * Remove an option from the list. Existing projects keep their saved value.
     */
    public function destroy(DropdownOption $dropdownOption): RedirectResponse
    {
        $dropdownOption->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Option removed.'),
        ]);

        return to_route('superadmin.settings.dropdowns');
    }
}
