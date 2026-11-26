import { useState } from 'react';

export function QuestionScenario({ text, videoUrl }: { text?: string | null; videoUrl?: string | null }) {
    const [failed, setFailed] = useState(false);
    const safe = videoUrl && /^https:\/\//i.test(videoUrl) ? videoUrl : null;
    if (!text && !safe) return null;
    return <div className="pm-course-question-scenario">
        {text && <p className="pm-course-lesson-copy">{text}</p>}
        {safe && !failed && <video className="pm-course-lesson-video" controls preload="none" src={safe} aria-label="Question scenario video" onError={() => setFailed(true)}/>}
        {safe && failed && <p role="alert">The scenario video could not be played. Please try again or contact course support.</p>}
    </div>;
}
