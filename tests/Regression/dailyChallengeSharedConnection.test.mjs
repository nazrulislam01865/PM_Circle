import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../../${p}`,import.meta.url),'utf8');
test('Daily Challenge explicit shared keys preserve the dedicated default and logical worker slot',()=>{
 const runtime=read('app/Domain/AI/Services/AiRuntimeSettings.php');
 assert.match(runtime,/return \$slot === 'daily_challenge_api_key' \? \[\$slot, 'api_key'\] : \[\$slot\]/);
 assert.match(runtime,/whereIn\('c.slot', self::explicitCredentialSlots\(\$slot\)\)/);
 assert.match(runtime,/where\('p.adapter', self::SLOTS\[\$slot\]\['provider'\]\)/);
 const routing=read('app/Domain/AI/Services/AiFeatureRouting.php');
 assert.match(routing,/\$primary === null \? filled\(\$runtime->credential\(\$slot\)\)/);
 assert.match(routing,/'slot' => self::slot\(\$feature, \$backup->adapter\)/);
 const controller=read('app/Http/Controllers/Admin/AI/AiWorkspaceController.php');
 assert.match(controller,/rows\(\$profiles, AiRuntimeSettings::explicitCredentialSlots\(\$slot\)\)/);
 assert.match(controller,/\$row\['slot'\] === \$slot && \$row\['slot_active'\]/);
 assert.match(controller,/'shared' => \$row\['slot'\] !== \$slot/);
});
test('answer-review test has its own synthetic rubric and cannot update learner data',()=>{
 const service=read('app/Domain/AI/Services/FeatureConnectionStatus.php');
 assert.match(service,/'daily-challenge-review' => 'daily_challenge_review'/);
 assert.match(service,/'rubric' => \['criteria' => \$criteria, 'max_score' => 10\]/);
 assert.match(read('app/Domain/AI/Services/AiExecutionService.php'),/\$row->feature_code === 'daily_challenge_review' && \$row->user_id && \$row->subject_type !== 'feature_connection_test'/);
 assert.match(read('routes/web.php'),/'daily-challenge', 'daily-challenge-review', 'pmp'/);
});
test('dialog separates assignment and operation status and blocks testing unsaved assignments',()=>{
 const ui=read('resources/js/components/admin/ai/WorkspaceConnectionPicker.tsx');
 assert.match(ui,/data\?\.connection\?\.configured && !changed/);
 assert.match(ui,/Credential verified/);
 assert.match(ui,/Save your selection before testing the operation/);
 const controls=read('resources/js/components/admin/ai/ConnectionControls.tsx');
 assert.match(controls,/Saved connection status/);
 assert.match(controls,/connection\.configured === false/);
 assert.match(read('resources/js/components/admin/ai/SettingsShared.tsx'),/Test answer review/);
 assert.match(read('resources/css/pm-career-trend-settings.css'),/\.pm-ai-connection-picker \{ display:grid/);
});
