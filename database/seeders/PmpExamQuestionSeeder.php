<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Curated, illustrative PM Circle practice questions; never represented as the official PMP question bank. */
final class PmpExamQuestionSeeder extends Seeder
{
    public function run(): void
    {
        $examples = [
            ['change-control', 'Process', 'Moderate',
                'A project is in the execution phase. A key stakeholder raises a concern that a recent change may impact the project’s scope, schedule, and cost. What should the project manager do first?',
                ['Implement the change since it was requested by a key stakeholder.', 'Conduct an impact analysis to assess the change’s effect on scope, schedule, and cost.', 'Update the project management plan to include the change.', 'Escalate the issue to the change control board for immediate approval.'], 'B',
                'Assess the effect of the proposed change before requesting approval or updating baselines. The impact analysis informs the integrated change-control decision.',
                'A: Do not implement an unapproved change. C: Update baselines only after approval. D: Escalation before analysis leaves decision-makers without impact information.',
                'Understand a change request before seeking a decision.', 'Integrated change control; change impact assessment', 'PMBOK Guide: integrated change control'],
            ['stakeholder-engagement', 'People', 'Moderate',
                'A stakeholder who supported a project is now resisting a new delivery approach. What should the project manager do next?',
                ['Remove the stakeholder from communications.', 'Immediately request an executive decision.', 'Meet with the stakeholder to understand their concerns and revise the engagement approach.', 'Continue delivery without changing the stakeholder plan.'], 'C',
                'Engage directly to understand concerns before choosing an appropriate response. The stakeholder engagement plan can then be updated.',
                'A: Exclusion increases resistance. B: Escalation is premature. D: Ignoring concerns increases project risk.',
                'Seek to understand resistance before acting.', 'Stakeholder engagement; communication', 'PMBOK Guide: stakeholder engagement'],
            ['risk-response', 'Process', 'Moderate',
                'A previously identified risk occurs and its agreed response is still suitable. What should the project manager do?',
                ['Execute the planned risk response and monitor its effectiveness.', 'Ignore the risk because it was already documented.', 'Close the risk register immediately.', 'Wait until the next steering committee meeting.'], 'A',
                'Use the approved response and monitor the result, updating risk information as necessary.',
                'B: Documenting is not mitigating. C: Close only after appropriate review. D: Avoid unnecessary delay.',
                'Planned responses help teams react quickly to known risks.', 'Risk response; risk monitoring', 'PMBOK Guide: risk management'],
            ['team-conflict', 'People', 'Easy',
                'Two experienced team members disagree about implementation details and the disagreement is delaying work. What is the best initial action?',
                ['Choose the senior person’s preferred approach.', 'Facilitate a collaborative discussion focused on project objectives.', 'Escalate directly to human resources.', 'Reassign both team members without consultation.'], 'B',
                'Collaborative problem solving helps the team surface facts and reach a mutually workable solution.',
                'A: Seniority is not a decision criterion. C: Escalation is premature. D: Reassignment avoids the root cause.',
                'Facilitate collaboration before escalation.', 'Team conflict; servant leadership', 'PMBOK Guide: team performance'],
            ['agile-prioritization', 'Process', 'Moderate',
                'During an iteration, a new high-value feature is requested. How should the delivery team handle it?',
                ['Add it immediately without discussing impact.', 'Ask the product owner to prioritize it in the product backlog for an appropriate iteration.', 'Extend the current iteration automatically.', 'Stop all work until the sponsor signs a new project charter.'], 'B',
                'The product owner manages backlog ordering and works with the team to consider capacity and iteration goals.',
                'A: Unplanned work may jeopardize the goal. C: Timeboxes should remain predictable. D: A new charter is not normally needed.',
                'Maintain transparent backlog prioritization.', 'Agile backlog; product ownership', 'Agile Practice Guide: backlog refinement'],
            ['business-value', 'Business Environment', 'Moderate',
                'A project deliverable has been accepted, but adoption is lower than forecast. Which action best supports business value?',
                ['Declare the project successful because the deliverable was accepted.', 'Transfer accountability without informing stakeholders.', 'Review adoption metrics with business owners and plan corrective actions.', 'Delete the original benefits targets.'], 'C',
                'Value realization depends on outcomes and adoption, not deliverable completion alone.',
                'A: Acceptance alone does not guarantee benefits. B: Ownership must be clear. D: Targets should not be erased to hide variance.',
                'Measure outcomes and enable benefits realization.', 'Benefits management; outcomes', 'PMBOK Guide: benefits realization'],
            ['quality-control', 'Process', 'Easy',
                'A deliverable fails a quality-control check. What should the project manager do?',
                ['Ship it without disclosing the issue.', 'Record the defect, analyze the cause, and arrange correction under the quality process.', 'Lower quality standards without approval.', 'Remove the tester from the team.'], 'B',
                'Document the defect, determine the cause, and follow the agreed quality and corrective-action process.',
                'A: Conceals known defects. C: Standards require proper governance. D: Personnel changes do not resolve the defect.',
                'Address defects using objective evidence and agreed controls.', 'Quality control; corrective action', 'PMBOK Guide: project quality'],
            ['hybrid-delivery', 'Business Environment', 'Moderate',
                'A project has fixed regulatory milestones but evolving user-interface requirements. Which delivery approach is most suitable?',
                ['Use only a predictive approach for every activity.', 'Use only an adaptive approach and ignore fixed milestones.', 'Use a hybrid approach with planned milestones and iterative interface delivery.', 'Delay all planning until the interface is fully understood.'], 'C',
                'A hybrid approach can protect regulatory milestones while adapting uncertain features iteratively.',
                'A: May restrict flexibility unnecessarily. B: Regulatory milestones cannot be ignored. D: Some planning is still essential.',
                'Tailor the delivery approach to the nature of the work.', 'Hybrid delivery; tailoring', 'Agile Practice Guide: life-cycle selection'],
        ];

        $now = now();
        foreach ($examples as [$code, $domain, $difficulty, $prompt, $options, $correct, $explanation, $other, $takeaway, $concepts, $references]) {
            DB::table('pmp_exam_questions')->insertOrIgnore([
                'code' => 'demo-'.$code, 'domain' => $domain, 'difficulty' => $difficulty,
                'prompt' => $prompt,
                'options' => json_encode(array_combine(['A', 'B', 'C', 'D'], $options), JSON_THROW_ON_ERROR),
                'correct_option' => $correct, 'explanation' => $explanation, 'other_options' => $other,
                'takeaway' => $takeaway, 'concepts' => $concepts, 'references' => $references,
                'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }
}
