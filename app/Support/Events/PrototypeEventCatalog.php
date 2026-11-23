<?php

namespace App\Support\Events;

/**
 * Approved public events prototype data. These are not published events or bookings.
 * A persisted event module can replace this catalog without changing the page contract.
 */
final class PrototypeEventCatalog
{
    /** @return array<int, array<string, mixed>> */
    public static function all(): array
    {
        return [
            self::event('pmp-study-circle', 'PMP study circle', '2026-11-28', '6:00 PM BDT', 'Online', 'Practise scenario questions with fellow candidates.', 'Study session', true),
            self::event('project-delivery-career', 'Starting a career in software delivery', '2026-12-02', '7:00 PM BDT', 'Dhaka', 'Free guest registration. A PM Circle account is optional.', 'Career workshop', true, true, 'Northbridge Digital'),
            self::event('scrum-case-study-night', 'Scrum case study night', '2026-12-04', '7:30 PM BDT', 'Online', 'Discuss a sprint that went off track and what the team could try next.', 'Discussion'),
            self::event('project-manager-resume-clinic', 'Project manager résumé clinic', '2026-12-11', '6:00 PM BDT', 'Online', 'Bring a project achievement and rewrite it with the group.', 'Workshop'),
            self::event('business-analysis-workshop', 'Business analysis requirements workshop', '2026-12-15', '7:00 PM BDT', 'Online', 'Practise turning stakeholder needs into clear requirements.', 'Workshop'),
            self::event('project-risk-planning', 'Project risk planning workshop', '2026-12-18', '7:00 PM BDT', 'Dhaka', 'Build a simple risk register from a project scenario.', 'Workshop'),
            self::event('ai-project-reporting', 'AI for project reporting', '2026-12-20', '7:00 PM BDT', 'Online', 'Explore ways to draft project updates and check the results.', 'Workshop'),
            self::event('stakeholder-communication', 'Stakeholder communication clinic', '2026-12-23', '7:00 PM BDT', 'Online', 'Practise handling difficult conversations with project sponsors.', 'Workshop'),
            self::event('business-process-mapping', 'Business process mapping lab', '2026-12-27', '7:00 PM BDT', 'Dhaka', 'Map a current process and identify where work gets stuck.', 'Workshop'),
            self::event('project-coordinator-qa', 'Project coordinator career Q&A', '2026-12-30', '7:00 PM BDT', 'Online', 'Discuss entry-level roles and what hiring teams look for.', 'Discussion'),
            self::event('agile-retrospective', 'Agile retrospective practice', '2027-01-05', '7:00 PM BDT', 'Online', 'Work through team improvement scenarios with fellow learners.', 'Discussion'),
            self::event('pmp-exam-planning', 'PMP exam preparation planning', '2027-01-09', '6:30 PM BDT', 'Online', 'Build a practical study schedule and identify areas to review.', 'Study session'),
            self::event('project-portfolio', 'Project portfolio review circle', '2027-01-13', '7:00 PM BDT', 'Dhaka', 'Discuss project experience and how to present your work.', 'Workshop'),
        ];
    }

    /** @return array<string, mixed>|null */
    public static function find(string $slug): ?array
    {
        foreach (self::all() as $event) {
            if ($event['slug'] === $slug) {
                return $event;
            }
        }

        // Linked from the supplied details-page prototype without changing the
        // approved thirteen-item event listing.
        if ($slug === 'technology-delivery-roundtable') {
            return self::event('technology-delivery-roundtable', 'Technology delivery roundtable', '2027-01-06', '7:00 PM BDT', 'Dhaka', 'An informal conversation about software delivery careers.', 'Discussion', true);
        }

        return null;
    }

    /** @param array<string, mixed> $event
     *  @return array<int, array<string, mixed>>
     */
    public static function relatedTo(array $event): array
    {
        if ($event['slug'] === 'project-delivery-career') {
            return array_values(array_filter([
                self::find('project-coordinator-qa'),
                self::find('technology-delivery-roundtable'),
            ]));
        }

        $events = array_filter(self::all(), static fn (array $candidate): bool =>
            $candidate['slug'] !== $event['slug'] && $candidate['category'] === $event['category']
        );

        return array_slice(array_values($events), 0, 2);
    }

    /** @return array<string, mixed> */
    private static function event(
        string $slug,
        string $title,
        string $date,
        string $time,
        string $location,
        string $description,
        string $category,
        bool $openToEveryone = false,
        bool $sponsored = false,
        ?string $host = null,
    ): array {
        return compact('slug', 'title', 'date', 'time', 'location', 'description', 'category', 'openToEveryone', 'sponsored', 'host');
    }
}
