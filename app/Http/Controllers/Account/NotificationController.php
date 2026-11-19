<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rows = DB::table('notifications')
            ->where('notifiable_type', User::class)->where('notifiable_id', $request->user()->id);
        $unread = (clone $rows)->whereNull('read_at')->count();
        $page = $rows->orderByDesc('created_at')->orderByDesc('id')
            ->cursorPaginate(20, ['id', 'type', 'data', 'read_at', 'created_at']);

        return response()->json([
            'items' => $page->getCollection()->map(static function ($row): array {
                $data = json_decode($row->data, true) ?: [];
                return [
                    'id' => $row->id, 'type' => $row->type,
                    'message' => (string) ($data['message'] ?? ''),
                    'url' => (string) ($data['url'] ?? ''),
                    'read_at' => $row->read_at,
                    'created_at' => \Illuminate\Support\Carbon::parse($row->created_at, 'UTC')->toIso8601String(),
                ];
            })->values(),
            'next_cursor' => $page->nextCursor()?->encode(),
            'unread_count' => $unread,
        ])->header('Cache-Control', 'private, no-store');
    }

    public function read(Request $request, string $notification): JsonResponse
    {
        DB::table('notifications')->where('id', $notification)
            ->where('notifiable_type', User::class)->where('notifiable_id', $request->user()->id)
            ->whereNull('read_at')->update(['read_at' => now(), 'updated_at' => now()]);

        return response()->json(['ok' => true])->header('Cache-Control', 'private, no-store');
    }

    public function readAll(Request $request): JsonResponse
    {
        DB::table('notifications')->where('notifiable_type', User::class)
            ->where('notifiable_id', $request->user()->id)->whereNull('read_at')
            ->update(['read_at' => now(), 'updated_at' => now()]);

        return response()->json(['ok' => true])->header('Cache-Control', 'private, no-store');
    }
}
