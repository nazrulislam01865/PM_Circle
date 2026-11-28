import { MemberSettingsHeading, MemberSettingsPage } from '@/components/dashboard/MemberSettingsPage';
import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <MemberSettingsPage active="appearance">
            <Head title="Appearance settings" />

            <section className="pm-member-settings-card">
                <MemberSettingsHeading
                    title="Appearance settings"
                    description="Update the appearance settings for your account"
                />
                <AppearanceTabs />
            </section>
        </MemberSettingsPage>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
