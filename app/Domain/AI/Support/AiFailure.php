<?php

namespace App\Domain\AI\Support;

use RuntimeException;

final class AiFailure extends RuntimeException
{
    public function __construct(public readonly string $safeCode, public readonly int $httpStatus = 409)
    {
        parent::__construct($safeCode);
    }
}
