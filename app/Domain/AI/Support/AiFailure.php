<?php

namespace App\Domain\AI\Support;

use RuntimeException;

final class AiFailure extends RuntimeException
{
    public function __construct(public readonly string $safeCode, public readonly int $httpStatus = 409, public readonly bool $retrySafe = false, public readonly ?array $usage = null)
    {
        parent::__construct($safeCode);
    }
}
