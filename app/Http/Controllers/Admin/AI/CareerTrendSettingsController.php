<?php

namespace App\Http\Controllers\Admin\AI;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\TrendAiConnection;
use App\Support\Admin\HomepageMasterData;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use App\Domain\Careers\Services\CareerTrendSettings;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateCareerTrendSettingsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class CareerTrendSettingsController extends Controller
{
    public function index(Request $request, AiAdminAccess $access, CareerTrendSettings $settings, TrendAiConnection $connections): Response
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $options = [];
        foreach (CareerTrendSettings::OPTIONS as $field => $choices) {
            foreach ($choices as $value => $label) {
                $options[$field][] = ['value' => (string) $value, 'label' => $label];
            }
        }

        $values = $settings->get();
        $groups = ['topics' => 'career_trend_topic', 'target_levels' => 'career_trend_target_level'];
        $master = HomepageMasterData::options(categories: array_values($groups));
        foreach ($groups as $field => $category) {
            $options[$field] = array_map(fn (array $row) => ['value' => $row['value'], 'label' => $row['label']], $master[$category] ?? []);
        }
        $feature = DB::table('ai_features')->where('code', 'trend_draft')->first(['model', 'enabled']);
        $featureModel = $feature?->model;
        $statuses = [];
        foreach (TrendAiConnection::PROVIDERS as $provider => $label) {
            $statuses[$provider] = [...$connections->status($provider, $connections->model($provider, $featureModel), (bool) ($feature?->enabled ?? false)), 'label' => $label];
        }

        return Inertia::render('admin/CareerTrendSettings', [
            'settings' => $values,
            'options' => $options,
            'connections' => $statuses,
        ]);
    }

    public function testConnection(Request $request, AiAdminAccess $access, TrendAiConnection $connections): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $data = $request->validate(['provider' => ['required', Rule::in(array_keys(TrendAiConnection::PROVIDERS))]]);
        $model = $connections->model($data['provider'], DB::table('ai_features')->where('code', 'trend_draft')->value('model'));
        $result = $connections->queueTest($data['provider'], $model, $request->user()->id);
        $access->audit($request->user()->id, 'career_trends.connection.test', 'career_trend_settings', 1, null,
            ['provider' => $data['provider'], 'code' => $result['code']], 'Administrator tested Career Trends API connection');

        return response()->json([...$result, 'label' => TrendAiConnection::PROVIDERS[$data['provider']]]);
    }

    public function connectionTestStatus(Request $request, string $uuid, AiAdminAccess $access, TrendAiConnection $connections): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $result = $connections->testStatus($uuid, $request->user()->id);

        return response()->json([...$result, 'label' => TrendAiConnection::PROVIDERS[$result['provider']]]);
    }

    public function update(UpdateCareerTrendSettingsRequest $request, AiAdminAccess $access): RedirectResponse
    {
        $values = $request->validated();
        DB::transaction(function () use ($request, $access, $values): void {
            $before = DB::table('career_trend_settings')->where('id', 1)->lockForUpdate()->first();
            abort_unless($before, 503, 'Career Trends settings have not been initialized.');
            DB::table('career_trend_settings')->where('id', 1)->update([
                'settings' => json_encode($values, JSON_THROW_ON_ERROR), 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'career_trends.settings.update', 'career_trend_settings', 1,
                json_decode($before->settings, true, 512, JSON_THROW_ON_ERROR), $values,
                'Administrator updated Career Trends settings');
        });

        return back();
    }
}
