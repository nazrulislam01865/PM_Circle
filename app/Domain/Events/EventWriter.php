<?php

namespace App\Domain\Events;

use App\Http\Requests\Events\SaveEventRequest;
use App\Models\CommunityEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

final class EventWriter
{
    public function save(SaveEventRequest $request, ?CommunityEvent $event = null): CommunityEvent
    {
        $admin = $request->user()->is_admin === true;
        $data = $request->safe()->except(['cover_image', 'map_image', 'remove_cover_image', 'remove_map_image']);
        $data['starts_at'] = Carbon::createFromFormat('Y-m-d\TH:i', $data['starts_at'], 'Asia/Dhaka')->startOfMinute()->utc();
        $data['ends_at'] = empty($data['ends_at']) ? null : Carbon::createFromFormat('Y-m-d\TH:i', $data['ends_at'], 'Asia/Dhaka')->startOfMinute()->utc();
        if (! $event && $data['starts_at']->isPast()) {
            throw ValidationException::withMessages(['starts_at' => 'Choose a future event date and time.']);
        }
        if ($data['format'] === 'online') {
            $data['location'] = $data['venue'] = $data['address'] = $data['map_link'] = null;
        }
        $data['sponsored'] = $admin && $request->boolean('sponsored');
        $data['agenda'] = array_values($data['agenda'] ?? []);
        $data['speakers'] = array_values($data['speakers'] ?? []);
        $newPaths = [];
        $oldPaths = [];
        try {
            foreach (['cover_image' => 'cover_path', 'map_image' => 'map_path'] as $field => $column) {
                if ($field === 'map_image' && $data['format'] === 'online') {
                    $data[$column] = null;
                } elseif ($request->hasFile($field)) {
                    $path = $request->file($field)->store('community-events', 'public');
                    if (! $path) {
                        throw ValidationException::withMessages([$field => 'The image could not be saved. Please try again.']);
                    }
                    $newPaths[] = $data[$column] = $path;
                } elseif ($request->boolean('remove_'.$field)) {
                    $data[$column] = null;
                }
                if (array_key_exists($column, $data) && $event?->{$column}) {
                    $oldPaths[] = $event->{$column};
                }
            }
            if (! $event) {
                $data['slug'] = Str::limit(Str::slug($data['title']) ?: 'event', 120, '').'-'.Str::lower((string) Str::ulid());
                $data['creator_id'] = $request->user()->id;
                $data['status'] = 'pending';
                return CommunityEvent::query()->create($data);
            }
            $event->update($data);
        } catch (Throwable $exception) {
            if ($newPaths) Storage::disk('public')->delete($newPaths);
            throw $exception;
        }
        if ($oldPaths) Storage::disk('public')->delete($oldPaths);
        return $event;
    }
}
