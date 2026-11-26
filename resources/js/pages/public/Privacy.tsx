import { LegalPage } from '@/components/pm/LegalPage';
import type { LegalPageData } from '@/components/pm/LegalContent';

export default function Privacy({ legalPage }: { legalPage: LegalPageData }) {
    return <LegalPage legalPage={legalPage} document="privacy"/>;
}
