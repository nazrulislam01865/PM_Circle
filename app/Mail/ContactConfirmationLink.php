<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class ContactConfirmationLink extends Mailable
{
    public function __construct(public readonly string $verificationUrl, public readonly int $expiresInMinutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Confirm your PM Circle support message');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.contact-confirmation', text: 'mail.contact-confirmation-text');
    }
}
