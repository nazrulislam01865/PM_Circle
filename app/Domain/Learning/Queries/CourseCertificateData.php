<?php

namespace App\Domain\Learning\Queries;

use Illuminate\Support\Carbon;

final class CourseCertificateData
{
    public static function fromRecord(object $row): array
    {
        return [
            'reference' => $row->reference,
            'memberName' => $row->member_name,
            'courseTitle' => $row->course_title,
            'issuedAt' => Carbon::parse($row->issued_at)->timezone(config('app.timezone'))->format('j F Y'),
        ];
    }
}
