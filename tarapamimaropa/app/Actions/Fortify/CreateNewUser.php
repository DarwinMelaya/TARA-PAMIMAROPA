<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Concerns\ProvinceValidationRules;
use App\Enums\Province;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;
    use ProfileValidationRules;
    use ProvinceValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     *
     * @throws ValidationException
     */
    public function create(array $input): User
    {
        if (($input['role'] ?? null) !== UserRole::Psto->value) {
            $input['province'] = null;
        }

        if (($input['province'] ?? '') === '') {
            $input['province'] = null;
        }

        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'role' => ['required', 'string', Rule::enum(UserRole::class)],
            'province' => [
                Rule::requiredIf(
                    fn (): bool => ($input['role'] ?? null) === UserRole::Psto->value,
                ),
                'nullable',
                'string',
                Rule::enum(Province::class),
            ],
        ])->validate();

        $role = UserRole::from($input['role']);

        return User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'role' => $role,
            'province' => $role === UserRole::Psto ? $input['province'] : null,
        ]);
    }
}
