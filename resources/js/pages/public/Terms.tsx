import { LegalPage } from '@/components/pm/LegalPage';
import type { LegalPageData } from '@/components/pm/LegalContent';

export default function Terms({ legalPage }: { legalPage: LegalPageData }) {
    return <LegalPage legalPage={legalPage} document="terms"/>;
}
