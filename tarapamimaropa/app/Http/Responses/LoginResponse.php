<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        $home = route($request->user()->homeRouteName(), absolute: false);

        return $request->wantsJson()
            ? response()->json(['two_factor' => false])
            : redirect()->to($home);
    }
}
