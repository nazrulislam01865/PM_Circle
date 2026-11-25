import {test} from 'node:test';
import assert from 'node:assert/strict';
import {qualityChecks} from '../../resources/js/components/profile/resumeQuality.ts';
const document = () => ({headline:'Software Engineer',phone:'',portfolio:'',github:'',linkedin:'',education:[],experience:[],research:[],projects:[],skills:[],achievements:[],interests:[],languages:[],certifications:[]});
const fields = {name:'Example Member',email:'example@example.com',role:'Software Engineer',company:'',location:'Dhaka, Bangladesh',summary:'',period:'',responsibilities:'',skills:'',degree:'',institution:'',certification:''};
const score = (data,cv) => qualityChecks(data,cv).reduce((sum,check)=>sum+check.points,0);
test('template quality rewards actual draft fields, not legacy profile values or repeated filler',()=>{
    const cv=document();
    assert.equal(score(fields,cv),2);
    assert.equal(score({...fields,summary:'hello '.repeat(100),skills:'legacy skill list',responsibilities:'legacy duties'},cv),2);
});
test('a student with completed education and skills can earn full completeness without optional sections',()=>{
    const cv=document();
    cv.education=[{title:'Example University',subtitle:'Computer Science',period:'2022 – 2026',courses:'Algorithms, databases, web development, software testing'}];
    cv.skills=[{title:'Programming',description:'Python, SQL, JavaScript'}];
    const data={...fields,summary:'Computer science student developing reliable web applications with strong database design skills, collaborative project experience, practical software testing and secure API development.'};
    assert.equal(score(data,cv),10);
    cv.languages=[{title:'English'}];
    assert.equal(score(data,cv),9);
    cv.languages[0].description='Professional proficiency';
    assert.equal(score(data,cv),10);
});
test('quality never exceeds ten and evaluates private project and research evidence',()=>{
    const cv=document();cv.research=[{title:'Research study',subtitle:'Research assistant',period:'2024 – Present',description:'Collected survey data and tested prototype reliability.'}];
    assert.equal(score(fields,cv),6);
    assert.equal(qualityChecks(fields,cv).length,10);
});
