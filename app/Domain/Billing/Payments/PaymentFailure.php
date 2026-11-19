<?php

namespace App\Domain\Billing\Payments;

use RuntimeException;

final class PaymentFailure extends RuntimeException
{
    public function __construct(public readonly string $safeCode, public readonly int $httpStatus = 409)
    {
        parent::__construct($safeCode);
    }
}
