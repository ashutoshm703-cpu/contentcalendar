'use strict';
const crypto=require('node:crypto');
function handoff(student,activity){
 const s=student,a=activity||{},fallback=a.owner||s.coordinator||s.createdBy||'';
 if(s.interviewStatus==='not_scheduled')return {title:'Schedule the interview',owner:fallback};
 if(s.interviewStatus==='scheduled')return {title:'Conduct the interview and add its recording',email:s.facultyTeams||s.facultyEmail||'',name:s.facultyName||'',owner:''};
 let next=null;function scan(nodes,owner){for(const n of nodes||[]){if(next)return;if(n.done)continue;const who=n.owner||owner;if((n.children||[]).length)scan(n.children,who);else next={title:n.title,owner:who,id:n.id}}}scan(a.subtasks,fallback);
 if(next)return next;if(a.status!=='Published')return {title:'Prepare and publish the testimonial',owner:fallback};return {title:'All testimonial work is complete',owner:'',complete:true};
}
function eventKey(s,a,next){const progress=[];function scan(nodes){for(const n of nodes||[]){progress.push([n.id,n.title,n.owner||'',!!n.done]);scan(n.children)}}scan(a.subtasks);return crypto.createHash('sha256').update(JSON.stringify({student:s.studentName,exam:s.examName,rank:s.rank,plan:s.planName||'',deletedAt:s.deletedAt||'',restoredAt:s.restoredAt||'',stage:s.interviewStatus,faculty:s.facultyName,date:s.interviewDate,time:s.interviewTime,schedule:s.scheduleUrl,recording:s.recordingUrl,status:a.status,progress,next})).digest('hex')}
function html(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function message(s,next){const lines=[['Student Name',s.studentName],['Exam',s.examName],['Rank',s.rank],['Plan Name',s.planName]].map(([label,value])=>'<b>'+label+':</b> '+html(value||'Not added'));lines.push('','<b>Interview:</b> '+html(({not_scheduled:'Not scheduled',scheduled:'Scheduled',recorded:'Recorded'})[s.interviewStatus]||s.interviewStatus));if(s.interviewStatus!=='not_scheduled'&&s.interviewDate)lines.push('<b>Schedule:</b> '+html(s.interviewDate+' '+s.interviewTime+' IST'));if(s.interviewStatus!=='not_scheduled'&&s.scheduleUrl)lines.push('<a href="'+html(s.scheduleUrl)+'">Join interview</a>');if(s.recordingUrl)lines.push('<a href="'+html(s.recordingUrl)+'">Open recording</a>');lines.push('<b>Next step:</b> '+html(next.title));return lines.join('<br>')}
function lifecycleMessage(s,event){return '<b>Student Name:</b> '+html(s.studentName)+'<br><b>Exam:</b> '+html(s.examName)+'<br><br>This testimonial entry was '+(event==='deleted'?'deleted':'restored')+' by Ashutosh Mishra. Campaign tasks and recording links are preserved.'}
module.exports={handoff,eventKey,message,lifecycleMessage};
