export type AboutFeature = { title: string; description: string; linkLabel: string; href: string };
export type AboutContent = {
    banner: { title: string; description: string };
    intro: { enabled: boolean; title: string; description: string };
    features: { enabled: boolean; title: string; cards: AboutFeature[] };
    company: AboutFeature & { enabled: boolean };
};
export type TrendListingSettings = { searchLabel: string; searchPlaceholder: string; topicLabel: string; allTopics: string; searchAction: string; clearAction: string; emptyText: string };
export type TrendDetailSettings = { noticeTitle: string; sourceTitle: string; sampleNoticeTitle: string; sampleNoticeText: string; noticeText: string; relatedTitle: string; allReportsLabel: string; relatedEnabled: boolean; commentsEnabled: boolean; saveEnabled: boolean; shareEnabled: boolean };
export type PageResult<T> = { data: T[]; total: number; links: {url: string | null; label: string; active: boolean}[] };
