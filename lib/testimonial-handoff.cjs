'use strict';
const crypto=require('node:crypto');
function handoff(student,activity){
 const s=student,a=activity||{},fallback=a.owner||s.coordinator||s.createdBy||'';
 if(s.interviewStatus==='not_scheduled')return {title:'Schedule the interview',owner:fallback};
 if(s.interviewStatus==='scheduled')return {title:'Conduct the interview and add its recording',email:s.facultyTeams||s.facultyEmail||'',name:s.facultyName||'',owner:''};
 let next=null;function scan(nodes,owner){for(const n of nodes||[]){if(next)return;if(n.done)continue;const who=n.owner||owner;if((n.children||[]).length)scan(n.children,who);else next={title:n.title,owner:who,id:n.id}}}scan(a.subtasks,fallback);
 if(next)return next;if(a.status!=='Published')return {title:'Prepare and publish the testimonial',owner:fallback};return {title:'All testimonial work is complete',owner:'',complete:true};
}
function eventKey(s,a,next){const progress=[];function scan(nodes){for(const n of nodes||[]){progress.push([n.id,n.title,n.owner||'',!!n.done]);scan(n.children)}}scan(a.subtasks);return crypto.createHash('sha256').update(JSON.stringify({student:s.studentName,exam:s.examName,rank:s.rank,stage:s.interviewStatus,faculty:s.facultyName,date:s.interviewDate,time:s.interviewTime,schedule:s.scheduleUrl,recording:s.recordingUrl,status:a.status,progress,next})).digest('hex')}
function html(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function message(s,next){const lines=['<b>'+html(s.studentName)+' · '+html(s.examName)+'</b>',s.rank?'Rank: '+html(s.rank):'', 'Interview: '+html(({not_scheduled:'Not scheduled',scheduled:'Scheduled',recorded:'Recorded'})[s.interviewStatus]||s.interviewStatus),s.interviewDate?'Schedule: '+html(s.interviewDate+' '+s.interviewTime+' IST'):'',s.scheduleUrl?'<a href="'+html(s.scheduleUrl)+'">Join interview</a>':'',s.recordingUrl?'<a href="'+html(s.recordingUrl)+'">Open recording</a>':'','Next step: '+html(next.title)];return lines.filter(Boolean).join('<br>')}
module.exports={handoff,eventKey,message};
