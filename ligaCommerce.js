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

  /* ---- 2. ATUALIZA O CONTADOR DINÂMICO DE FUNDADORES ---- */
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
            titleEl.innerHTML = 'Seja o <span class="count" id="founder-count">1º</span> fundador da sua região.';
            if (descEl) {
              descEl.textContent = 'Cadastre seu negócio agora e garanta o selo exclusivo de fundador — destaque permanente no perfil e cadastro sem mensalidade.';
            }
          } else if (count === 1) {
            titleEl.innerHTML = 'Já somos <span class="count" id="founder-count">1</span>. Falta você.';
            if (descEl) {
              descEl.textContent = 'O primeiro negócio parceiro já garantiu o selo de fundador. Seja o próximo a garantir destaque permanente e cadastro sem mensalidade.';
            }
          } else {
            titleEl.innerHTML = `Já somos <span class="count" id="founder-count">${count}</span>. Falta você.`;
            if (descEl) {
              descEl.textContent = 'As primeiras empresas da região já garantiram o selo de fundador — destaque permanente no perfil e cadastro sem mensalidade.';
            }
          }
        } else if (countEl) {
          countEl.textContent = count;
        }
      }
    } catch (e) {
      console.error('Erro ao atualizar contador de fundadores:', e);
    }
  }

  atualizarContador();
  // Atualiza automaticamente a cada 20 segundos para manter todos sincronizados
  setInterval(atualizarContador, 20000);

  /* ---- 3. MÁSCARA DE WHATSAPP ---- */
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

  /* ---- 4. ENVIO DO FORMULÁRIO ---- */
  const form = document.getElementById('preform');
  const submitBtn = document.getElementById('submit-btn');
  const formAlert = document.getElementById('form-alert');

  const fields = [
    { id: 'nome', wrap: 'f-nome' },
    { id: 'resp', wrap: 'f-resp' },
    { id: 'whats', wrap: 'f-whats' },
    { id: 'cat', wrap: 'f-cat' },
    { id: 'cidade', wrap: 'f-cidade' }
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

      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
      }

      try {
        const payload = {
          business_name: nomeNegocio,
          responsible_name: nomeResp,
          whatsapp: digits,
          category: categoria,
          primary_city: cidadePrincipal,
          coverage_cities: [cidadePrincipal]
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

        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }

        // Exibe tela de confirmação
        const founderNumEl = document.getElementById('foundernum');
        if (founderNumEl) {
          founderNumEl.textContent = lead && lead.founder_number
            ? 'fundador nº ' + lead.founder_number
            : 'um dos nossos fundadores';
        }

        const formWrap = document.getElementById('form-wrap');
        if (formWrap) formWrap.style.display = 'none';
        
        const confirmEl = document.getElementById('confirm');
        if (confirmEl) {
          confirmEl.style.display = 'block';
          confirmEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Atualiza imediatamente a contagem na tela
        await atualizarContador();
      } catch (err) {
        console.error('Erro ao registrar:', err);
        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        if (formAlert) {
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
