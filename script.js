const PRAYER_GROUP_URL = "https://chat.whatsapp.com/HKpDqM8iH1OEKEWdU5LZA0";
const form = document.getElementById("prayerForm");
const success = document.getElementById("success");
const modeInputs = document.querySelectorAll('input[name="privacyMode"]');
const identifiedFields = document.getElementById("identifiedFields");
const modeBadge = document.getElementById("modeBadge");
const nameField = document.getElementById("name");
const phoneField = document.getElementById("phone");
const requestField = document.getElementById("request");
const consentField = document.getElementById("consent");
const websiteField = document.getElementById("website");

const config = window.PRAYER_CONFIG || {};
const hasSupabaseConfig =
  config.SUPABASE_URL &&
  config.SUPABASE_ANON_KEY &&
  !config.SUPABASE_URL.includes("SEU-PROJETO") &&
  !config.SUPABASE_ANON_KEY.includes("SUA_CHAVE");

const supabaseClient = hasSupabaseConfig && window.supabase
  ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

document.querySelector(".menu-btn")?.addEventListener("click", () => {
  document.querySelector(".nav nav")?.classList.toggle("open");
});

const initialMode = document.querySelector('input[name="privacyMode"]:checked');
if (initialMode) {
  const identified = initialMode.value === "identified";
  identifiedFields.hidden = !identified;
  nameField.required = identified;
  phoneField.required = identified;
  modeBadge.innerHTML = identified ? "<i></i> Identificado" : "<i></i> Anônimo";
}

modeInputs.forEach(input => {
  input.addEventListener("change", () => {
    const identified = input.value === "identified";
    identifiedFields.hidden = !identified;
    nameField.required = identified;
    phoneField.required = identified;

    modeInputs.forEach(i => {
      i.closest(".privacy-option")?.classList.toggle("active", i.checked);
    });

    document.querySelectorAll(".option-check").forEach(el => {
      el.textContent = "";
    });

    const selected = document.querySelector('input[name="privacyMode"]:checked');
    const selectedCheck = selected?.closest(".privacy-option")?.querySelector(".option-check");
    if (selectedCheck) selectedCheck.textContent = "✓";

    modeBadge.innerHTML = identified ? "<i></i> Identificado" : "<i></i> Anônimo";
  });
});

phoneField?.addEventListener("input", e => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
  else if (v.length) v = "(" + v;
  e.target.value = v;
});

let openedAt = Date.now();
let lastSubmit = Number(localStorage.getItem("prayer_last_submit") || 0);

function showError(message) {
  success.classList.add("is-error");
  success.style.display = "flex";
  success.querySelector("strong").textContent = "Não foi possível enviar.";
  success.querySelector("p").textContent = message;
  success.querySelector(".success-icon").textContent = "!";
}

function showSuccess() {
  success.classList.remove("is-error");
  success.style.display = "flex";
  success.querySelector("strong").textContent = "Pedido recebido.";
  success.querySelector("p").textContent =
    "Obrigado por confiar seu pedido a nós. Sua mensagem foi registrada com segurança e será encaminhada à equipe de oração.";
  success.querySelector(".success-icon").textContent = "✓";

  // Depois que o pedido for salvo, pergunta se a pessoa quer entrar no grupo.
  document.querySelector(".group-modal")?.remove();
  const modal = document.createElement("div");
  modal.className = "group-modal";
  modal.innerHTML = `
    <div class="group-modal-backdrop"></div>
    <div class="group-modal-card" role="dialog" aria-modal="true" aria-labelledby="groupModalTitle">
      <button class="group-modal-close" type="button" aria-label="Fechar">×</button>
      <div class="group-modal-icon">♡</div>
      <span class="eyebrow">COMUNIDADE</span>
      <h3 id="groupModalTitle">Quer continuar perto da gente?</h3>
      <p>Seu pedido foi enviado com sucesso. Se quiser, você pode entrar no nosso grupo do WhatsApp e continuar conectado à nossa comunidade.</p>
      <div class="group-modal-actions">
        <a class="group-modal-join" href="${PRAYER_GROUP_URL}" target="_blank" rel="noopener noreferrer">Sim, quero entrar</a>
        <button class="group-modal-later" type="button">Agora não</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const closeGroupModal = () => modal.remove();
  modal.querySelector(".group-modal-close").addEventListener("click", closeGroupModal);
  modal.querySelector(".group-modal-backdrop").addEventListener("click", closeGroupModal);
  modal.querySelector(".group-modal-later").addEventListener("click", closeGroupModal);
  success.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

form?.addEventListener("submit", async e => {
  e.preventDefault();

  const r = requestField.value.trim();
  const identified = document.querySelector('input[name="privacyMode"]:checked')?.value === "identified";
  const n = nameField?.value.trim() || "";
  const p = phoneField?.value.trim() || "";

  if (websiteField?.value.trim()) return;
  if (Date.now() - openedAt < 2500) {
    showError("Aguarde alguns segundos antes de enviar.");
    return;
  }
  if (Date.now() - lastSubmit < 30000) {
    showError("Aguarde alguns segundos antes de enviar outro pedido.");
    return;
  }
  if (!r || !consentField.checked || (identified && (!n || !p))) {
    showError("Confira os campos obrigatórios e confirme o consentimento.");
    return;
  }
  if (!supabaseClient) {
    showError("O banco de dados ainda não foi configurado. Preencha o arquivo config.js antes de publicar.");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

  const payload = {
    privacy_mode: identified ? "identified" : "anonymous",
    name: identified ? n : null,
    whatsapp: identified ? p.replace(/\D/g, "") : null,
    prayer_request: r,
    consent_lgpd: true,
    consented_at: new Date().toISOString(),
    source: "site"
  };

  try {
    const { error } = await supabaseClient
      .from("prayer_requests")
      .insert(payload);

    if (error) throw error;

    localStorage.setItem("prayer_last_submit", String(Date.now()));
    form.reset();

    const defaultMode = document.querySelector('input[name="privacyMode"][value="identified"]');
    if (defaultMode) {
      defaultMode.checked = true;
      defaultMode.dispatchEvent(new Event("change"));
    }

    showSuccess();
  } catch (error) {
    console.error(error);
    showError("Não conseguimos registrar seu pedido agora. Tente novamente em alguns instantes.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Enviar pedido";
  }
});


/* V35 — scroll reveal */
(function(){
  const els = document.querySelectorAll(
    'section, .why-list article, .trust-card, .location-map, .community-gallery figure, .lgpd-consent, .form-card, .prayer-form'
  );
  els.forEach((el,i)=>{
    if(el.classList.contains('v35-reveal')) return;
    el.classList.add('v35-reveal');
    if(i%5===1) el.classList.add('v35-delay-1');
    if(i%5===2) el.classList.add('v35-delay-2');
    if(i%5===3) el.classList.add('v35-delay-3');
    if(i%5===4) el.classList.add('v35-delay-4');
  });
  if(!('IntersectionObserver' in window)){
    els.forEach(el=>el.classList.add('v35-visible'));
    return;
  }
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('v35-visible');
        io.unobserve(entry.target);
      }
    });
  },{threshold:.12,rootMargin:'0px 0px -35px 0px'});
  els.forEach(el=>io.observe(el));
})();

/* V38 — sorteio de 100 palavras bíblicas */
(function(){
  const verses = window.BIBLE_VERSES || [];
  const btn = document.getElementById('drawVerse');
  const text = document.getElementById('verseText');
  const ref = document.getElementById('verseRef');
  const pastoral = document.getElementById('pastoralText');
  const counter = document.querySelector('.verse-counter');
  if(!btn || !verses.length) return;
  let last=-1;
  function draw(){
    let i;
    do{i=Math.floor(Math.random()*verses.length)}while(verses.length>1 && i===last);
    last=i;
    const item=verses[i];
    text.classList.remove('verse-pop');
    pastoral.classList.remove('verse-pop');
    void text.offsetWidth;
    text.textContent='“'+item.verse+'”';
    ref.textContent=item.ref;
    pastoral.textContent=item.pastoral;
    counter.textContent=String(i+1).padStart(2,'0')+' / 100';
    text.classList.add('verse-pop');
    pastoral.classList.add('verse-pop');
  }
  btn.addEventListener('click',draw);
})();

\n/* V41 — copiar chave PIX */
(function(){
  const button=document.getElementById('copyPix');
  const key=document.getElementById('pixKey');
  const feedback=document.getElementById('pixFeedback');
  if(!button||!key||!feedback) return;

  button.addEventListener('click',async function(){
    const rawKey=key.textContent.replace(/\D/g,'');
    try{
      if(navigator.clipboard&&window.isSecureContext){
        await navigator.clipboard.writeText(rawKey);
      }else{
        const temp=document.createElement('textarea');
        temp.value=rawKey;
        temp.style.position='fixed';
        temp.style.opacity='0';
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }
      feedback.textContent='Chave PIX copiada. Agora é só colar no seu aplicativo bancário.';
      button.innerHTML='Chave copiada ✓';
      setTimeout(()=>{button.innerHTML='Copiar chave PIX <span>↗</span>';},2500);
    }catch(error){
      feedback.textContent='Não foi possível copiar automaticamente. Selecione e copie a chave acima.';
    }
  });
})();
