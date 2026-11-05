<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class SignupVerificationCode extends Mailable
{
    public function __construct(public readonly string $code) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your PM Circle verification code');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.signup-verification-code', text: 'mail.signup-verification-code-text');
    }
}
