<?php

namespace Database\Seeders;

use App\Models\MasterDataOption;
use Illuminate\Database\Seeder;

/** Add starter signup options without overwriting administrator edits or activation. */
final class SignupMasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'Project Manager', 'Project Coordinator', 'Program Manager', 'PMO Analyst',
            'Scrum Master', 'Agile Coach', 'Business Analyst', 'Technical Project Manager',
            'Product Operations', 'Student / Aspiring PM', 'Other',
        ];
        $certifications = ['PMP', 'CAPM', 'CSM', 'PSM', 'PRINCE2', 'PMI-ACP', 'AgilePM', 'Other'];
        $experience = [['value' => '0', 'label' => 'Less than 1 year']];
        foreach (range(1, 10) as $year) {
            $experience[] = ['value' => (string) $year, 'label' => $year.' '.($year === 1 ? 'year' : 'years')];
        }
        $experience[] = ['value' => '15', 'label' => '15+ years'];
        $experience[] = ['value' => '20', 'label' => '20+ years'];

        $groups = [
            'signup_role' => array_map(fn (string $value) => ['value' => $value, 'label' => $value], $roles),
            'signup_experience' => $experience,
            'signup_certification' => array_map(fn (string $value) => ['value' => $value, 'label' => $value], $certifications),
        ];

        foreach ($groups as $category => $options) {
            foreach ($options as $index => $option) {
                MasterDataOption::query()->firstOrCreate(
                    ['category' => $category, 'value' => $option['value']],
                    ['label' => $option['label'], 'sort_order' => ($index + 1) * 10, 'is_active' => true],
                );
            }
        }
    }
}
