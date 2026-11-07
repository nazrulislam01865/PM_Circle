import { Highlighter, Info, ListChecks, Strikethrough } from 'lucide-react';
import type { ReactNode } from 'react';
import { ExamOptionList, Highlighted, type ExamQuestion } from './ExamShared';

const example: ExamQuestion = {
    id: -1, domain: 'Process', difficulty: 'Moderate',
    prompt: 'A project is in the execution phase. A key stakeholder raises a concern that a recent change may impact the project’s scope, schedule, and cost. What should the project manager do first?',
    options: {
        A: 'Implement the change since it was requested by a key stakeholder.',
        B: 'Conduct an impact analysis to assess the change’s effect on scope, schedule, and cost.',
        C: 'Update the project management plan to include the change.',
        D: 'Escalate the issue to the change control board for immediate approval.',
    },
};

export function ExamToolGuide() {
    return <div className="pm-exam-guide"><div className="pm-exam-guide-top"><div><h1>Exam Tools: Strike Through & Highlight</h1>
        <p>Use these tools during the exam to analyze options and focus on key information.</p></div></div>
        <div className="pm-exam-guide-layout"><div className="pm-exam-guide-examples">
            <ExamplePanel label="Original Question (No Tool Applied)" tone="blue"><p className="pm-exam-guide-prompt">{example.prompt}</p>
                <ExamOptionList question={example} readonly/></ExamplePanel>
            <ExamplePanel label="With Strike Through Applied" tone="purple" icon={<Strikethrough size={26}/>}><p className="pm-exam-guide-prompt">{example.prompt}</p>
                <ExamOptionList question={example} struck={['A', 'C']} readonly/></ExamplePanel>
            <ExamplePanel label="With Highlight Applied" tone="yellow" icon={<Highlighter size={26}/>}><p className="pm-exam-guide-prompt"><Highlighted content={example.prompt} active={["a recent change may impact the project’s scope, schedule, and cost"]}/></p>
                <ExamOptionList question={example} chosen="B" readonly/></ExamplePanel>
        </div><aside className="pm-exam-guide-side"><section className="pm-exam-guide-toolbox"><h2><Info size={23}/>Tool Guide</h2>
            <div className="pm-exam-guide-tool"><span className="pm-exam-tool-icon purple"><Strikethrough/></span><div><div className="pm-exam-tool-title"><h3>Strike Through</h3><small>Shortcut: S</small></div><p>Crosses out an answer option you want to eliminate, so you can focus on more likely options.</p>
                <div className="pm-exam-guide-mini"><s>C. Update the project management plan to include the change.</s></div></div></div>
            <div className="pm-exam-guide-tool"><span className="pm-exam-tool-icon yellow"><Highlighter/></span><div><div className="pm-exam-tool-title"><h3>Highlight</h3><small>Shortcut: H</small></div><p>Marks important text in the question or scenario with a yellow highlight so you can quickly identify key information.</p>
                <div className="pm-exam-guide-mini">... <mark>a recent change may impact the project's scope, schedule, and cost.</mark></div></div></div>
        </section><section className="pm-exam-guide-help"><h2><ListChecks size={23}/>How to Use</h2>
            <ol><li>Select text in the question or scenario and click Highlight (or press H) to mark important words.</li>
                <li>Enable Strike Through (or press S), then click any option to cross it out.</li>
                <li>Apply or remove these tools any time before submitting the exam.</li></ol>
        </section><p className="helper">Strike-through and highlighting are study aids and do not change your selected answer.</p></aside></div>
    </div>;
}

function ExamplePanel({ label, tone, icon, children }: { label: string; tone: string; icon?: ReactNode; children: ReactNode }) {
    return <section className="pm-exam-guide-example"><div className={`pm-exam-example-tag tone-${tone}`}>{icon}{label}</div><div>{children}</div></section>;
}
