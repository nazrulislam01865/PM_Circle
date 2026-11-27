<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class ActivityUpdate extends Mailable
{
    public function __construct(public readonly array $items) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: count($this->items) === 1 ? 'PM Circle activity update' : 'PM Circle activity digest');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.activity-update', text: 'mail.activity-update-text');
    }
}
