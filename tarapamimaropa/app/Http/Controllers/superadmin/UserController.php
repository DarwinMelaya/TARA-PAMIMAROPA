<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\StoreUserRequest;
use App\Http\Requests\SuperAdmin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * List all users for Super Admin.
     */
    public function index(): Response
    {
        $users = User::query()
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'role_label' => $user->role->label(),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        return Inertia::render('superadmin/SuperAdminUsers', [
            'users' => $users,
            'roles' => UserRole::options(),
        ]);
    }

    /**
     * Create a user from the Super Admin panel.
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'],
        ]);

        $user->forceFill([
            'email_verified_at' => now(),
        ])->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('User created successfully.'),
        ]);

        return to_route('superadmin.users');
    }

    /**
     * Update a user from the Super Admin panel.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();

        $user->fill([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
        ]);

        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        $user->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('User updated successfully.'),
        ]);

        return to_route('superadmin.users');
    }
}
