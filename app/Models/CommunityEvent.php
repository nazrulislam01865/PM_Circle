<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

final class CommunityEvent extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'agenda' => 'array', 'speakers' => 'array',
            'open_to_everyone' => 'boolean', 'sponsored' => 'boolean', 'registration_open' => 'boolean', 'discussion_open' => 'boolean'];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('starts_at', '>=', now());
    }

    public static function listingColumns(): array
    {
        return ['id', 'slug', 'title', 'description', 'category', 'starts_at', 'format', 'location', 'host', 'open_to_everyone', 'sponsored'];
    }

    public function listingData(): array
    {
        $start = $this->starts_at->copy()->timezone('Asia/Dhaka');
        return ['slug' => $this->slug, 'title' => $this->title, 'description' => $this->description,
            'category' => $this->category, 'date' => $start->toDateString(), 'time' => $start->format('g:i A').' BDT',
            'format' => $this->format, 'location' => $this->format === 'online' ? 'Online' : $this->location,
            'openToEveryone' => $this->open_to_everyone, 'sponsored' => $this->sponsored, 'host' => $this->host];
    }

    public function coverUrl(): ?string
    {
        return $this->cover_path ? Storage::disk('public')->url($this->cover_path) : null;
    }

    public function mapUrl(): ?string
    {
        return $this->map_path ? Storage::disk('public')->url($this->map_path) : null;
    }

    public function detailData(): array
    {
        return [...$this->listingData(), 'about' => $this->about, 'hostType' => $this->host_type,
            'publisher' => $this->publisher_id ? 'PM Circle Admin' : 'PM Circle', 'venue' => $this->venue, 'address' => $this->address, 'mapLink' => $this->map_link,
            'coverUrl' => $this->coverUrl(), 'mapUrl' => $this->mapUrl(), 'agenda' => $this->agenda ?? [], 'speakers' => $this->speakers ?? [],
            'startsAt' => $this->starts_at->toIso8601String(), 'endsAt' => $this->ends_at?->toIso8601String(),
            'endTime' => $this->ends_at ? $this->ends_at->copy()->timezone('Asia/Dhaka')->format('d M Y, g:i A').' BDT' : null,
            'registrationOpen' => $this->registration_open && $this->starts_at->isFuture(), 'discussionOpen' => $this->discussion_open];
    }
}
