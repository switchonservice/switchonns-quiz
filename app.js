let QUESTIONS = [];
let order = [];
let current = 0;
let score = 0;
let userAnswers = [];
let perQuestionTimer = null;
let perQuestionLimit = 30; // 秒
const PASS_PERCENT = 90;   // 合格基準

let studentName = '';
const el = (id)=>document.getElementById(id);

function getNowString(){ try{ return new Date().toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{ return new Date().toISOString(); } }
function generateCertId(){ const d=new Date(); const ymd=[d.getFullYear(),('0'+(d.getMonth()+1)).slice(-2),('0'+d.getDate()).slice(-2)].join(''); const hms=[('0'+d.getHours()).slice(-2),('0'+d.getMinutes()).slice(-2),('0'+d.getSeconds()).slice(-2)].join(''); const rnd=Math.floor(Math.random()*9000+1000); return `SWON-${ymd}${hms}-${rnd}`; }

async function loadDefault(){ try{ const res=await fetch('questions.json'); if(!res.ok) throw new Error(res.statusText); QUESTIONS=await res.json(); }catch(e){ console.warn('デフォルト問題の読み込みに失敗:', e); QUESTIONS=[]; } }
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }
function startQuiz(){
  const nameInput = document.getElementById('studentName');
  const val = nameInput ? nameInput.value.trim() : '';
  if(!val){ alert('受講者氏名を入力してください'); return; }
  studentName = val; try{ localStorage.setItem('quiz-name', studentName);}catch{}
  if(QUESTIONS.length===0){ alert('questions.json がありません。'); return; }
  score=0; current=0; userAnswers=[]; order=[...QUESTIONS.keys()]; shuffle(order);
  el('intro').classList.add('hidden'); el('result').classList.add('hidden'); el('quiz').classList.remove('hidden'); renderQuestion();
}
function renderProgress(){ const total=QUESTIONS.length; el('progressText').textContent=`${current+1} / ${total}`; el('progressBar').style.width=`${((current)/total)*100}%`; }
function startTimer(){ clearInterval(perQuestionTimer); let remain=perQuestionLimit; const t=el('timer'); t.classList.remove('hidden'); t.textContent=`${remain}s`; perQuestionTimer=setInterval(()=>{ remain-=1; t.textContent=`${remain}s`; if(remain<=0){ clearInterval(perQuestionTimer); submitAnswer(true); } },1000);} 
function stopTimer(){ clearInterval(perQuestionTimer); el('timer').classList.add('hidden'); }
function renderQuestion(){ renderProgress(); const q=QUESTIONS[order[current]]; el('questionText').textContent=q.question; const form=el('answers'); form.innerHTML=''; const choiceIdx=q.choices.map((c,i)=>({i,c})); if(q.shuffleChoices!==false) shuffle(choiceIdx); const isMulti=(q.type==='multiple')||(Array.isArray(q.answer)&&q.answer.length>1); choiceIdx.forEach(({i,c},vIdx)=>{ const id=`opt-${current}-${vIdx}`; const wrap=document.createElement('label'); wrap.className='option'; const input=document.createElement('input'); input.type=isMulti?'checkbox':'radio'; input.name='answer'; input.value=String(i); input.id=id; const span=document.createElement('span'); span.textContent=c; wrap.appendChild(input); wrap.appendChild(span); form.appendChild(wrap); }); el('submitBtn').classList.remove('hidden'); el('nextBtn').classList.add('hidden'); if(el('timerToggle') && el('timerToggle').checked){ startTimer(); } else { stopTimer(); } }
function collectUserAnswer(){ const inputs=[...document.querySelectorAll('input[name="answer"]')]; return inputs.filter(i=>i.checked).map(i=>Number(i.value)).slice(0,1); }
function submitAnswer(auto=false){ const q=QUESTIONS[order[current]]; const selected=collectUserAnswer(); if(selected.length===0 && !auto){ alert('回答を選択してください'); return; } stopTimer(); userAnswers[current]=selected; const correct=Array.isArray(q.answer)?q.answer:[q.answer]; const inputs=[...document.querySelectorAll('input[name="answer"]')]; inputs.forEach(inp=>{ const wrap=inp.parentElement; const idx=Number(inp.value); if(correct.includes(idx)) wrap.classList.add('correct'); if(selected.includes(idx)&&!correct.includes(idx)) wrap.classList.add('wrong'); inp.disabled=true; }); if(q.explanation){ const exp=document.createElement('div'); exp.className='explanation'; exp.textContent=`解説: ${q.explanation}`; el('answers').appendChild(exp);} el('submitBtn').classList.add('hidden'); el('nextBtn').classList.remove('hidden'); if(selected.length && correct.length && selected.sort().join(',')===correct.slice().sort().join(',')){ score+=1; } }
function nextQuestion(){ current+=1; if(current>=QUESTIONS.length){ showResult(); } else { renderQuestion(); } }
function renderCertificate(pct){ const title=document.getElementById('app-title')?.textContent||'クイズ'; const total=QUESTIONS.length; const now=getNowString(); el('certName').textContent=studentName||'受講者'; el('certCourse').textContent=title; el('certScore').textContent=`${score} / ${total}（${pct}%）`; el('certDate').textContent=now; el('certPassLine').textContent=`${PASS_PERCENT}%`; const id=generateCertId(); el('certId').textContent=id; try{ localStorage.setItem('quiz-cert-id', id);}catch{} const nameLine=document.getElementById('certNameLine'); if(nameLine) nameLine.textContent=studentName||'受講者'; const dateLine=document.getElementById('certDateLine'); if(dateLine) dateLine.textContent=now; }
function showResult(){ stopTimer(); el('quiz').classList.add('hidden'); el('result').classList.remove('hidden'); el('progressBar').style.width='100%'; const total=QUESTIONS.length; const pct=Math.round(score/total*100); const pass=pct>=PASS_PERCENT; el('scoreText').textContent=`正解: ${score} / ${total}（正答率 ${pct}%）`; const passEl=el('passText'); if(passEl){ passEl.textContent= pass? `合格（${PASS_PERCENT}%以上）` : `不合格（合格基準 ${PASS_PERCENT}%）`; passEl.className= pass? 'pass-pass' : 'pass-fail'; } const certBtn=el('certBtn'); if(certBtn){ if(pass){ certBtn.classList.remove('hidden'); renderCertificate(pct);} else { certBtn.classList.add('hidden'); } } try{ const key='quiz-best'; const prev=Number(localStorage.getItem(key)||'0'); el('bestText').textContent = score>prev? '過去最高スコアを更新！': `過去最高スコア: ${prev}`; if(score>prev) localStorage.setItem(key,String(score)); }catch{} const container=el('review'); container.innerHTML=''; order.forEach((origIdx,i)=>{ const q=QUESTIONS[origIdx]; const blk=document.createElement('div'); blk.style.borderTop='1px solid #243041'; blk.style.padding='12px 0'; const h=document.createElement('div'); h.innerHTML=`<strong>Q${i+1}.</strong> ${q.question}`; const ua=Array.isArray(userAnswers[i])?userAnswers[i]:[]; const uaText = ua.length? ua.map(v=>q.choices[v]).join(' / ') : '（未回答）'; const ca=Array.isArray(q.answer)?q.answer:[q.answer]; const caText = ca.map(v=>q.choices[v]).join(' / '); const uaEl=document.createElement('div'); uaEl.textContent=`あなたの回答: ${uaText}`; const caEl=document.createElement('div'); caEl.textContent=`正解: ${caText}`; if(q.explanation){ const exEl=document.createElement('div'); exEl.className='explanation'; exEl.textContent=`解説: ${q.explanation}`; blk.append(h,uaEl,caEl,exEl);} else { blk.append(h,uaEl,caEl);} container.appendChild(blk); }); }

// === Mobile-friendly PDF generation using html2pdf.js ===
function saveCertificatePdf(){
  const elCert = document.getElementById('certificate');
  if(!elCert){ alert('修了証の要素が見つかりません'); return; }
  document.documentElement.classList.add('export-cert');
  const filename = '訪問看護事業部_行動指針_修了証.pdf';
  const opt = {
    margin:       0,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, background: '#ffffff' },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  try {
    const worker = html2pdf().set(opt).from(elCert).toPdf();
    worker.get('pdf').then(pdf => { try{ pdf.setProperties({ title: '訪問看護事業部　行動指針　修了証' }); }catch{} });
    worker.save().then(()=>{ document.documentElement.classList.remove('export-cert'); });
  } catch(e){
    document.documentElement.classList.remove('export-cert');
    alert('PDF生成に失敗しました: '+ e.message);
  }
}

document.getElementById('fileInput').addEventListener('change', async (e)=>{ const file=e.target.files?.[0]; if(!file) return; const text=await file.text(); try{ QUESTIONS=JSON.parse(text); alert(`問題を ${QUESTIONS.length} 件読み込みました`);}catch(err){ alert('JSON の読み込みに失敗: '+err.message);} });

document.getElementById('startBtn').addEventListener('click', startQuiz);
document.getElementById('submitBtn').addEventListener('click', (e)=>{ e.preventDefault(); submitAnswer(false); });
document.getElementById('nextBtn').addEventListener('click', (e)=>{ e.preventDefault(); nextQuestion(); });
document.getElementById('retryBtn').addEventListener('click', ()=>{ current=0; score=0; userAnswers=[]; document.getElementById('intro').classList.remove('hidden'); document.getElementById('result').classList.add('hidden'); });

// Prefill name and hook certificate saving
try{ const saved=localStorage.getItem('quiz-name'); if(saved){ const ni=document.getElementById('studentName'); if(ni) ni.value=saved; } }catch{}
const certBtnEl=document.getElementById('certBtn'); if(certBtnEl){ certBtnEl.addEventListener('click', saveCertificatePdf); }

loadDefault();
