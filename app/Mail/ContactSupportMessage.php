<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class ContactSupportMessage extends Mailable
{
    /** @param array{name:string,email:string,topic:string,subject:string,message:string} $details */
    public function __construct(public readonly array $details) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[PM Circle Contact] '.str_replace(["\r", "\n"], ' ', $this->details['subject']),
            replyTo: [new Address($this->details['email'], $this->details['name'])],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.contact-support', text: 'mail.contact-support-text');
    }
}
