const cfg=window.PRAYER_CONFIG||{};
const ready=cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes("SEU-PROJETO")&&!cfg.SUPABASE_ANON_KEY.includes("SUA_CHAVE")&&window.supabase;
const client=ready?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;

const authView=document.getElementById("authView"),appView=document.getElementById("appView"),loginForm=document.getElementById("loginForm"),loginError=document.getElementById("loginError");
const list=document.getElementById("requestsList"),loading=document.getElementById("loading"),empty=document.getElementById("emptyState"),search=document.getElementById("search"),statusFilter=document.getElementById("statusFilter"),privacyFilter=document.getElementById("privacyFilter"),monthFilter=document.getElementById("monthFilter");
let allRequests=[],currentRequest=null;

const $=id=>document.getElementById(id);
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmtDate=v=>new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v));
const statusLabel=s=>({novo:"Novo",em_oracao:"Em oração",concluido:"Concluído",arquivado:"Arquivado"}[s]||s);

function loginMsg(m){loginError.textContent=m;loginError.style.display="block"}
function updateStats(){
  const n=allRequests.filter(x=>x.status==="novo").length,p=allRequests.filter(x=>x.status==="em_oracao").length,d=allRequests.filter(x=>x.status==="concluido").length;
  $("statAll").textContent=allRequests.length;$("statNew").textContent=n;$("statPrayer").textContent=p;$("statDone").textContent=d;
  $("navNew").textContent=n;$("navPrayer").textContent=p;
}
function render(){
  const q=search.value.trim().toLowerCase(),st=statusFilter.value,pr=privacyFilter.value,mo=monthFilter?monthFilter.value:"all";
  const filtered=allRequests.filter(x=>{
    const text=[x.name,x.whatsapp,x.prayer_request].filter(Boolean).join(" ").toLowerCase();
    const date=new Date(x.created_at);
    const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
    return(!q||text.includes(q))&&(st==="all"||x.status===st)&&(pr==="all"||x.privacy_mode===pr)&&(mo==="all"||key===mo)
  });
  list.innerHTML=filtered.map(x=>{
    const anonymous=x.privacy_mode==="anonymous",who=anonymous?"Pedido anônimo":(x.name||"Sem nome");
    return `<article class="request-card" data-id="${x.id}">
      <div><div class="request-top"><strong>${escapeHtml(who)}</strong><span class="badge ${anonymous?"anonymous":"identified"}">${anonymous?"Anônimo":"Identificado"}</span><span class="status ${x.status}">${statusLabel(x.status)}</span></div>
      <div class="request-preview">${escapeHtml(x.prayer_request).slice(0,300)}${x.prayer_request.length>300?"…":""}</div></div>
      <div class="request-date">${fmtDate(x.created_at)}</div>
    </article>`
  }).join("");
  empty.classList.toggle("hidden",filtered.length>0);list.classList.toggle("hidden",filtered.length===0);
}
function populateMonthFilter(){
  if(!monthFilter)return;
  const current=monthFilter.value;
  const keys=[...new Set(allRequests.map(x=>{
    const d=new Date(x.created_at);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }))].sort().reverse();
  monthFilter.innerHTML='<option value="all">Todos os meses</option>'+keys.map(key=>{
    const [y,m]=key.split("-");
    const label=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(Number(y),Number(m)-1,1));
    return `<option value="${key}">${label.replace(/^./,c=>c.toUpperCase())}</option>`;
  }).join("");
  if(keys.includes(current)||current==="all")monthFilter.value=current;else monthFilter.value="all";
}

async function loadRequests(){
  loading.style.display="block";
  const {data,error}=await client.from("prayer_requests").select("*").order("created_at",{ascending:false});
  loading.style.display="none";
  if(error){list.innerHTML=`<div class="empty"><h3>Não foi possível carregar</h3><p>${escapeHtml(error.message)}</p></div>`;return}
  allRequests=data||[];populateMonthFilter();updateStats();updateAnalytics();render();
}
function openRequest(id){
  currentRequest=allRequests.find(x=>x.id===id);if(!currentRequest)return;
  const anonymous=currentRequest.privacy_mode==="anonymous";
  $("detailTitle").textContent=anonymous?"Pedido anônimo":(currentRequest.name||"Pedido");
  $("detailPrivacy").className=`badge ${currentRequest.privacy_mode}`;
  $("detailPrivacy").textContent=anonymous?"Anônimo":"Identificado";
  $("detailDate").textContent=`Recebido em ${fmtDate(currentRequest.created_at)}`;
  $("detailMeta").innerHTML=[
    !anonymous&&currentRequest.name?`Nome: ${escapeHtml(currentRequest.name)}`:"",
    !anonymous&&currentRequest.whatsapp?`WhatsApp: ${escapeHtml(currentRequest.whatsapp)}`:""
  ].filter(Boolean).join(" · ");
  $("detailRequest").textContent=currentRequest.prayer_request;$("detailStatus").value=currentRequest.status;
  const contact=$("contactPerson");
  if(!anonymous&&currentRequest.whatsapp){contact.classList.remove("hidden");contact.href=`https://wa.me/55${currentRequest.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent("Olá! Recebemos seu pedido de oração e gostaríamos de conversar com você.")}`}
  else contact.classList.add("hidden");
  $("detailFeedback").textContent="";$("detailModal").classList.remove("hidden");
}
async function saveStatus(){
  if(!currentRequest)return;
  const btn=$("saveStatus");btn.disabled=true;btn.textContent="Salvando...";
  const value=$("detailStatus").value;
  const {error}=await client.from("prayer_requests").update({status:value}).eq("id",currentRequest.id);
  btn.disabled=false;btn.textContent="Salvar status";
  if(error){$("detailFeedback").textContent="Não foi possível atualizar o status.";return}
  currentRequest.status=value;
  updateAnalytics();
  const i=allRequests.findIndex(x=>x.id===currentRequest.id);if(i>=0)allRequests[i].status=value;
  updateStats();render();$("detailFeedback").textContent="Status atualizado com sucesso.";setTimeout(()=>$("detailModal").classList.add("hidden"),180);
}

let monthlyChart=null;

function updateAnalytics(){
  const now=new Date();
  const months=[];
  for(let i=11;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push(d);
  }
  const labels=months.map(d=>new Intl.DateTimeFormat("pt-BR",{month:"short"}).format(d).replace(".","").replace(/^./,c=>c.toUpperCase()));
  const monthly=months.map(d=>{
    const y=d.getFullYear(),m=d.getMonth();
    return allRequests.filter(x=>{
      const date=new Date(x.created_at);
      return date.getFullYear()===y&&date.getMonth()===m;
    }).length;
  });

  const monthCount=monthly[11]||0;
  const done=allRequests.filter(x=>x.status==="concluido").length;
  const identified=allRequests.filter(x=>x.privacy_mode!=="anonymous").length;
  $("indMonth").textContent=monthCount;
  $("indDoneRate").textContent=allRequests.length?Math.round(done/allRequests.length*100)+"%":"0%";
  $("indIdentified").textContent=allRequests.length?Math.round(identified/allRequests.length*100)+"%":"0%";

  const canvas=$("monthlyChart");
  if(!canvas||!window.Chart)return;
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart=new Chart(canvas,{
    type:"line",
    data:{
      labels,
      datasets:[{
        data:monthly,
        borderColor:"#1765f5",
        backgroundColor:"rgba(23,101,245,.10)",
        fill:true,
        tension:.42,
        borderWidth:3,
        pointRadius:3,
        pointHoverRadius:6,
        pointBackgroundColor:"#fff",
        pointBorderColor:"#1765f5",
        pointBorderWidth:2
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{intersect:false,mode:"index"},
      plugins:{
        legend:{display:false},
        tooltip:{
          displayColors:false,
          backgroundColor:"#071c3b",
          titleFont:{family:"Inter",size:11,weight:"700"},
          bodyFont:{family:"Inter",size:11},
          padding:11,
          cornerRadius:10,
          callbacks:{label:ctx=>`${ctx.parsed.y} pedido${ctx.parsed.y===1?"":"s"}`}
        }
      },
      scales:{
        x:{grid:{display:false},ticks:{color:"#8a97a8",font:{family:"Inter",size:9}}},
        y:{beginAtZero:true,grid:{color:"rgba(15,35,65,.07)"},ticks:{color:"#8a97a8",font:{family:"Inter",size:9},precision:0},border:{display:false}}
      }
    }
  });
}

async function boot(){
  if(!client){loginMsg("Configure o Supabase em config.js antes de entrar.");return}
  const {data:{session}}=await client.auth.getSession();
  if(!session){authView.classList.remove("hidden");appView.classList.add("hidden");return}
  authView.classList.add("hidden");appView.classList.remove("hidden");
  const email=session.user.email||"Usuário";$("userEmail").textContent=email;$("userInitial").textContent=email[0].toUpperCase();
  await loadRequests();
}
loginForm.addEventListener("submit",async e=>{
  e.preventDefault();loginError.style.display="none";
  if(!client){loginMsg("Configure o Supabase em config.js.");return}
  const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error){loginMsg("E-mail ou senha inválidos.");return}
  await boot();
});
$("logoutBtn").addEventListener("click",async()=>{await client.auth.signOut();location.reload()});
$("refreshBtn").addEventListener("click",loadRequests);
$("closeModal").addEventListener("click",()=>$("detailModal").classList.add("hidden"));
document.querySelector(".modal-backdrop").addEventListener("click",()=>$("detailModal").classList.add("hidden"));
$("saveStatus").addEventListener("click",saveStatus);
list.addEventListener("click",e=>{const c=e.target.closest(".request-card");if(c)openRequest(c.dataset.id)});
search.addEventListener("input",render);statusFilter.addEventListener("change",render);privacyFilter.addEventListener("change",render);if(monthFilter)monthFilter.addEventListener("change",render);
document.querySelectorAll("[data-quick]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();statusFilter.value=a.dataset.quick;render()}));
boot();
