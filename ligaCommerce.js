/* =========================================================
   LIGACOMMERCE - CLIENTE DE BANCO DE DADOS & INTERAÇÃO (API NATIVA)
   Comunicação direta via REST API PostgREST (Zero dependências externas)
   ========================================================= */

const SUPABASE_URL = 'https://glibdygzmmddzlxhtrie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_n-Ew0oNPlrzeUos1t9j59w_dI0WTYvj';

const API_HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json'
};

/* =========================================================
   SISTEMA DE ATRIBUIÇÃO AUTOMÁTICA DE PARCEIROS E CAMPANHAS
   Persistência em Cookie (60 dias) e LocalStorage
   ========================================================= */
const REF_STORAGE_KEY = 'lc_partner_ref';
const UTM_STORAGE_KEY = 'lc_utm_data';
const COOKIE_EXPIRY_DAYS = 60;

function setCookie(name, value, days) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  } catch (e) {
    console.warn('Erro ao gravar cookie:', e);
  }
}

function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch (e) {
    return null;
  }
}

function initReferralTracking() {
  try {
    const params = new URLSearchParams(window.location.search);
    
    // Captura o código do parceiro via URL (?ref=, ?r=, ?partner=, ?parceiro=, ?p=)
    const refParam = params.get('ref') || params.get('r') || params.get('partner') || params.get('parceiro') || params.get('p');
    if (refParam && refParam.trim()) {
      const cleanCode = refParam.trim().toUpperCase();
      localStorage.setItem(REF_STORAGE_KEY, cleanCode);
      setCookie(REF_STORAGE_KEY, cleanCode, COOKIE_EXPIRY_DAYS);
    }

    // Captura parâmetros UTM
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    if (utmSource || utmMedium || utmCampaign) {
      const utmData = {
        utm_source: utmSource ? utmSource.trim() : null,
        utm_medium: utmMedium ? utmMedium.trim() : null,
        utm_campaign: utmCampaign ? utmCampaign.trim() : null
      };
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
    }
  } catch (e) {
    console.warn('Erro ao processar tracking de indicação:', e);
  }
}

function getActiveReferral() {
  try {
    const fromStorage = localStorage.getItem(REF_STORAGE_KEY);
    const fromCookie = getCookie(REF_STORAGE_KEY);
    return fromStorage || fromCookie || null;
  } catch (e) {
    return null;
  }
}

function getActiveUtms() {
  try {
    const data = localStorage.getItem(UTM_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

// Inicializa a captura de parâmetros imediatamente
initReferralTracking();


const AVATAR_COLORS = [
  'linear-gradient(135deg, #0a1628, #1c355e)',
  'linear-gradient(135deg, #b5860a, #d49e0c)',
  'linear-gradient(135deg, #0f766e, #14b8a6)',
  'linear-gradient(135deg, #6d28d9, #8b5cf6)',
  'linear-gradient(135deg, #c2410c, #ea580c)',
  'linear-gradient(135deg, #1e293b, #334155)'
];

function getInitials(name) {
  if (!name) return 'LC';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getFounderLogo(businessName, founderNumber) {
  const b = (businessName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (b.includes('sao carlos') || founderNumber === 1) return 'img/SaoCarlos.webp';
  if (b.includes('uau') || b.includes('aroma') || founderNumber === 2) return 'img/UAUaromas.webp';
  if (b.includes('cleiton') || b.includes('pintura automotiva') || founderNumber === 3) return 'img/CleitonEduardo.webp';
  return null;
}

function initApp() {
  /* ---- 1. CARREGA AS CIDADES ATIVAS NO SELECT ---- */
  const cidadeSelect = document.getElementById('cidade');
  async function carregarCidades() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/available_cities?is_active=eq.true&select=name&order=name.asc`, {
        method: 'GET',
        headers: API_HEADERS
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && cidadeSelect) {
          cidadeSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';
          data.forEach((item) => {
            const opt = document.createElement('option');
            opt.value = item.name;
            opt.textContent = item.name;
            cidadeSelect.appendChild(opt);
          });
        }
      }
    } catch (e) {
      console.warn('Usando cidades padrão:', e);
    }
  }
  carregarCidades();

  /* ---- 2. RENDERIZA OS CÍRCULOS DE AVATARES E MODAL DE ZOOM ---- */
  function abrirModalEmpresa(f) {
    const modalBackdrop = document.getElementById('founder-modal-backdrop');
    const badgeEl = document.getElementById('modal-founder-badge');
    const logoWrapEl = document.getElementById('modal-logo-wrap');
    const nameEl = document.getElementById('modal-founder-name');
    const catEl = document.getElementById('modal-founder-cat');
    const cityEl = document.getElementById('modal-founder-city');
    const logo = getFounderLogo(f.business_name, f.founder_number);
    const initials = getInitials(f.business_name);
    const formattedNum = '#' + String(f.founder_number).padStart(2, '0');

    if (badgeEl) badgeEl.textContent = `🏆 MEMBRO FUNDADOR OFICIAL ${formattedNum}`;
    if (nameEl) nameEl.textContent = f.business_name;
    if (catEl) catEl.textContent = f.category || 'Comércio & Serviços';
    if (cityEl) cityEl.textContent = `${f.primary_city || 'Arapiraca'} - AL`;

    const neighborhoodEl = document.getElementById('modal-founder-neighborhood');
    if (neighborhoodEl) {
      if (f.neighborhood) {
        neighborhoodEl.textContent = `Bairro: ${f.neighborhood}`;
        neighborhoodEl.style.display = 'inline-block';
      } else {
        neighborhoodEl.style.display = 'none';
      }
    }

    if (logoWrapEl) {
      if (logo) {
        logoWrapEl.innerHTML = `<img src="${logo}" alt="${f.business_name}">`;
      } else {
        const bg = AVATAR_COLORS[(f.founder_number - 1) % AVATAR_COLORS.length] || AVATAR_COLORS[0];
        logoWrapEl.innerHTML = `<div class="modal-initials" style="background: ${bg}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${initials}</div>`;
      }
    }

    if (modalBackdrop) {
      modalBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function fecharModalEmpresa() {
    const modalBackdrop = document.getElementById('founder-modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Eventos de fechamento do modal
  const modalCloseBtn = document.getElementById('founder-modal-close');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', fecharModalEmpresa);

  const modalBackdrop = document.getElementById('founder-modal-backdrop');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) fecharModalEmpresa();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModalEmpresa();
  });

  async function renderizarAvatares() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/founder_leads?select=business_name,category,primary_city,neighborhood,founder_number&order=created_at.asc&limit=12`, {
        method: 'GET',
        headers: API_HEADERS
      });
      if (!res.ok) return;
      const founders = await res.json();
      const stackEl = document.getElementById('founder-avatars-stack');
      const captionEl = document.getElementById('founder-avatars-caption');
      if (!stackEl) return;

      let html = '';
      if (Array.isArray(founders) && founders.length > 0) {
        founders.forEach((f, idx) => {
          const initials = getInitials(f.business_name);
          const bg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          const logo = getFounderLogo(f.business_name, f.founder_number);
          const localDesc = f.neighborhood ? `${f.primary_city || 'Arapiraca'} · ${f.neighborhood}` : (f.primary_city || 'Arapiraca');
          const title = `Clique para ver: ${f.business_name} (${localDesc}) · Fundador #${f.founder_number}`;
          
          if (logo) {
            html += `<div class="avatar-circle has-img" data-index="${idx}" title="${title}">
              <img src="${logo}" alt="${f.business_name}" onerror="this.parentElement.className='avatar-circle'; this.parentElement.style.background='${bg}'; this.parentElement.textContent='${initials}';">
            </div>`;
          } else {
            html += `<div class="avatar-circle" data-index="${idx}" style="background: ${bg};" title="${title}">${initials}</div>`;
          }
        });
      }

      // Slot para convidar o próximo visitante a ser membro fundador
      html += `<div class="avatar-circle add-slot" title="Clique para garantir sua vaga e ser o próximo fundador!">Você</div>`;
      stackEl.innerHTML = html;

      // Adiciona clique nos círculos para abrir o modal ampliado
      const circles = stackEl.querySelectorAll('.avatar-circle[data-index]');
      circles.forEach((circle) => {
        circle.addEventListener('click', () => {
          const idx = parseInt(circle.getAttribute('data-index'), 10);
          const f = founders[idx];
          if (f) abrirModalEmpresa(f);
        });
      });

      // Slot Você rola suavemente até o formulário
      const addSlot = stackEl.querySelector('.avatar-circle.add-slot');
      if (addSlot) {
        addSlot.addEventListener('click', () => {
          const formWrap = document.getElementById('form-wrap');
          if (formWrap) {
            formWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const nomeInput = document.getElementById('nome');
            if (nomeInput) setTimeout(() => nomeInput.focus(), 400);
          }
        });
      }

      if (captionEl) {
        if (founders && founders.length > 0) {
          captionEl.innerHTML = `<span class="live-dot"></span> <strong>${founders.length}</strong> ${founders.length === 1 ? 'empresa pioneira cadastrada (clique para ver)' : 'empresas pioneiras cadastradas (clique para ver)'}`;
        } else {
          captionEl.innerHTML = `<span class="live-dot"></span> Inscrições abertas para fundadores`;
        }
      }
    } catch (e) {
      console.warn('Erro ao renderizar avatares:', e);
    }
  }

  /* ---- 3. ATUALIZA O CONTADOR DINÂMICO E REAL DE FUNDADORES ---- */
  async function atualizarContador() {
    try {
      let count = null;

      // 1. Tenta via RPC otimizada get_founder_count
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_founder_count`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({})
      });

      if (rpcRes.ok) {
        const data = await rpcRes.json();
        if (typeof data === 'number') {
          count = data;
        }
      }

      // 2. Fallback de contagem direta se RPC falhar
      if (count === null) {
        const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/founder_leads?select=id`, {
          method: 'HEAD',
          headers: {
            ...API_HEADERS,
            'Prefer': 'count=exact'
          }
        });
        const contentRange = fallbackRes.headers.get('content-range');
        if (contentRange) {
          const total = parseInt(contentRange.split('/')[1], 10);
          if (!isNaN(total)) count = total;
        }
      }

      if (typeof count === 'number') {
        const countEl = document.getElementById('founder-count');
        const titleEl = document.getElementById('founder-title');
        const descEl = document.getElementById('founder-desc');

        if (titleEl) {
          if (count === 0) {
            titleEl.innerHTML = 'Os primeiros lugares do <span class="count">Clube de Fundadores</span> estão abertos.';
          } else if (count === 1) {
            titleEl.innerHTML = 'O <span class="count" id="founder-count">1º</span> lugar já foi preenchido. Falta você.';
          } else {
            titleEl.innerHTML = `Os <span class="count" id="founder-count">${count}</span> primeiros lugares já foram preenchidos.`;
          }
          if (descEl) {
            descEl.textContent = 'Garanta sua empresa entre as pioneiras da região com taxa zero de adesão, prioridade no lançamento e benefícios vitalícios de parceiro.';
          }
        } else if (countEl) {
          countEl.textContent = count;
        }
      }

      // Atualiza também os círculos com iniciais
      renderizarAvatares();
    } catch (e) {
      console.error('Erro ao atualizar contador de fundadores:', e);
    }
  }

  atualizarContador();
  // Atualiza automaticamente a cada 20 segundos para manter todos sincronizados
  setInterval(atualizarContador, 20000);

  /* ---- 4. MÁSCARA DE WHATSAPP ---- */
  const whatsEl = document.getElementById('whats');
  if (whatsEl) {
    whatsEl.addEventListener('input', () => {
      const d = whatsEl.value.replace(/\D/g, '').slice(0, 11);
      let out = '';
      if (d.length > 0) out = '(' + d.slice(0, 2);
      if (d.length >= 2) out += ') ';
      if (d.length > 2) out += d.slice(2, 3);
      if (d.length > 3) out += ' ' + d.slice(3, 7);
      if (d.length > 7) out += '-' + d.slice(7, 11);
      whatsEl.value = out;
    });
  }

  /* ---- 5. ENVIO DO FORMULÁRIO ---- */
  const form = document.getElementById('preform');
  const submitBtn = document.getElementById('submit-btn');
  const formAlert = document.getElementById('form-alert');

  const fields = [
    { id: 'nome', wrap: 'f-nome' },
    { id: 'resp', wrap: 'f-resp' },
    { id: 'whats', wrap: 'f-whats' },
    { id: 'cat', wrap: 'f-cat' },
    { id: 'cidade', wrap: 'f-cidade' },
    { id: 'bairro', wrap: 'f-bairro' }
  ];

  fields.forEach((f) => {
    const el = document.getElementById(f.id);
    if (!el) return;
    const clearInvalid = () => {
      const wrapEl = document.getElementById(f.wrap);
      if (wrapEl) wrapEl.classList.remove('invalid');
    };
    el.addEventListener('input', clearInvalid);
    el.addEventListener('change', clearInvalid);
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (formAlert) formAlert.classList.remove('show');
      let valid = true;

      fields.forEach((f) => {
        const el = document.getElementById(f.id);
        if (!el) return;
        const val = el.value.trim();
        const wrapEl = document.getElementById(f.wrap);
        if (!val) {
          if (wrapEl) wrapEl.classList.add('invalid');
          valid = false;
        } else {
          if (wrapEl) wrapEl.classList.remove('invalid');
        }
      });

      if (!whatsEl) return;
      const digits = whatsEl.value.replace(/\D/g, '');
      if (digits.length < 10) {
        const wrapWhats = document.getElementById('f-whats');
        if (wrapWhats) wrapWhats.classList.add('invalid');
        valid = false;
      }

      if (!valid) {
        const firstInvalid = document.querySelector('.field.invalid, .field-select.invalid');
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const nomeNegocio = document.getElementById('nome').value.trim();
      const nomeResp = document.getElementById('resp').value.trim();
      const categoria = document.getElementById('cat').value;
      const cidadePrincipal = document.getElementById('cidade').value || 'Arapiraca';
      const bairro = document.getElementById('bairro').value.trim();

      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
      }

      try {
        const partnerCode = getActiveReferral();
        const utms = getActiveUtms();

        const payload = {
          business_name: nomeNegocio,
          responsible_name: nomeResp,
          whatsapp: digits,
          category: categoria,
          primary_city: cidadePrincipal,
          neighborhood: bairro,
          coverage_cities: [cidadePrincipal],
          partner_code: partnerCode,
          origin: 'LANDING_PAGE',
          campaign: utms.utm_campaign || 'FUNDADORES-2026',
          utm_source: utms.utm_source || null,
          utm_medium: utms.utm_medium || null,
          utm_campaign: utms.utm_campaign || null
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/founder_leads?select=id,founder_number`, {
          method: 'POST',
          headers: {
            ...API_HEADERS,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.text();
          throw new Error('Falha na resposta do servidor: ' + errData);
        }

        const insertedData = await res.json();
        const lead = Array.isArray(insertedData) ? insertedData[0] : insertedData;
        const founderNum = lead && lead.founder_number ? lead.founder_number : 1;
        const founderFormatted = '#' + String(founderNum).padStart(2, '0');

        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }

        // Preenche o Cartão VIP Comemorativo
        const respNameEl = document.getElementById('confirm-resp-name');
        if (respNameEl) respNameEl.textContent = nomeResp;

        const numEl = document.getElementById('confirm-num');
        if (numEl) numEl.textContent = founderFormatted;

        const businessNameEl = document.getElementById('confirm-business-name');
        if (businessNameEl) businessNameEl.textContent = nomeNegocio;

        const catEl = document.getElementById('confirm-cat');
        if (catEl) catEl.textContent = categoria;

        const cityEl = document.getElementById('confirm-city');
        if (cityEl) cityEl.textContent = bairro ? `${cidadePrincipal} (${bairro})` : cidadePrincipal;

        const whatsDisplayEl = document.getElementById('confirm-whats');
        if (whatsDisplayEl) whatsDisplayEl.textContent = whatsEl.value;

        // Configura o link de compartilhamento no WhatsApp
        const shareWhatsBtn = document.getElementById('btn-share-whats');
        if (shareWhatsBtn) {
          const localStr = bairro ? `${cidadePrincipal} (${bairro})` : cidadePrincipal;
          const shareMsg = encodeURIComponent(
            `Olá! Acabei de cadastrar ${nomeNegocio} como Membro Fundador (${founderFormatted}) da LigaCommerce em ${localStr}! Garanta também o selo exclusivo do seu negócio no pré-lançamento: https://ligacommerce-landing.vercel.app/`
          );
          shareWhatsBtn.href = `https://api.whatsapp.com/send?text=${shareMsg}`;
        }

        // Esconde o formulário e exibe a celebração
        const formWrap = document.getElementById('form-wrap');
        if (formWrap) formWrap.style.display = 'none';
        
        const confirmEl = document.getElementById('confirm');
        if (confirmEl) {
          confirmEl.style.display = 'block';
          confirmEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Atualiza imediatamente a contagem e os avatares na tela
        await atualizarContador();
      } catch (err) {
        console.error('Erro ao registrar:', err);
        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        if (formAlert) {
          if (err.message && (err.message.includes('duplicate') || err.message.includes('founder_leads_whatsapp_key') || err.message.includes('23505'))) {
            formAlert.textContent = 'Este número de WhatsApp já possui uma vaga de fundador garantida!';
          } else {
            formAlert.textContent = 'Não conseguimos enviar agora. Tenta de novo em instantes.';
          }
          formAlert.classList.add('show');
          formAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }
}

// Inicialização segura garantindo execução mesmo se o DOM já tiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
