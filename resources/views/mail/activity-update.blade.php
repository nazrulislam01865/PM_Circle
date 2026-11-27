<!doctype html><html lang="en"><body>
<h1>PM Circle activity</h1>
@foreach ($items as $item)
<p>{{ $item['message'] }} <a href="{{ $item['url'] }}">View activity</a></p>
@endforeach
<p><a href="{{ rtrim(config('app.url'), '/') }}/settings/account">Manage notification preferences</a></p>
</body></html>
