PM Circle activity
@foreach ($items as $item)
{{ $item['message'] }}
{{ $item['url'] }}
@endforeach
Manage notification preferences: {{ rtrim(config('app.url'), '/') }}/settings/account
