<?php

namespace App\Http\Requests\Region;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportProjectsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::RegionalOffice;
    }

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:10240',
                'mimes:xlsx,xls,csv',
            ],
        ];
    }
}
