/* =========================================================
   CONFIGURAÇÃO DAS CHAVES
   Substitua SUA_CHAVE_ANON_PUBLICA pela chave encontrada em:
   Supabase > Project Settings > API > anon public
   ========================================================= */
const SUPABASE_URL = 'https://glibdygzmmddzlxhtrie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_n-Ew0oNPlrzeUos1t9j59w_dI0WTYvj';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

document.addEventListener('DOMContentLoaded', () => {
  if (!supabase) {
    console.error('SDK do Supabase não foi carregado.');
    return;
  }

  /* ---- 1. CARREGA AS CIDADES ATIVAS NO SELECT ---- */
  const cidadeSelect = document.getElementById('cidade');
  async function carregarCidades() {
    try {
      const { data, error } = await supabase
        .from('available_cities')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (!error && data && data.length > 0 && cidadeSelect) {
        cidadeSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';
        data.forEach((item) => {
          const opt = document.createElement('option');
          opt.value = item.name;
          opt.textContent = item.name;
          cidadeSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Erro ao carregar cidades:', e);
    }
  }
  carregarCidades();

  /* ---- 2. ATUALIZA O CONTADOR REAL DE FUNDADORES ---- */
  async function atualizarContador() {
    try {
      let count = null;

      // 1. Tenta via RPC otimizada
      const { data, error } = await supabase.rpc('get_founder_count');
      if (!error && typeof data === 'number') {
        count = data;
      } else {
        // 2. Fallback direto consultando a tabela
        const { count: total, error: countErr } = await supabase
          .from('founder_leads')
          .select('*', { count: 'exact', head: true });
        if (!countErr && typeof total === 'number') {
          count = total;
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
      console.error('Erro ao buscar contador de fundadores:', e);
    }
  }
  atualizarContador();

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

  /* ---- 4. ENVIO DO FORMULÁRIO COM O ARRAY DE CIDADES ---- */
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
    el.addEventListener('input', () => {
      const wrapEl = document.getElementById(f.wrap);
      if (wrapEl) wrapEl.classList.remove('invalid');
    });
    el.addEventListener('change', () => {
      const wrapEl = document.getElementById(f.wrap);
      if (wrapEl) wrapEl.classList.remove('invalid');
    });
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

      if (!valid) return;

      const nomeNegocio = document.getElementById('nome').value.trim();
      const nomeResp = document.getElementById('resp').value.trim();
      const categoria = document.getElementById('cat').value;
      const cidadePrincipal = document.getElementById('cidade').value;

      if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
      }

      try {
        // Grava na tabela founder_leads com o array de cidades
        const { data, error } = await supabase
          .from('founder_leads')
          .insert([
            {
              business_name: nomeNegocio,
              responsible_name: nomeResp,
              whatsapp: digits,
              category: categoria,
              primary_city: cidadePrincipal,
              coverage_cities: [cidadePrincipal] // Array de cidades de atendimento
            }
          ])
          .select('founder_number')
          .single();

        if (error) throw error;

        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }

        // Exibe tela de confirmação
        const founderNumEl = document.getElementById('foundernum');
        if (founderNumEl) {
          founderNumEl.textContent = data && data.founder_number
            ? 'fundador nº ' + data.founder_number
            : 'um dos nossos fundadores';
        }
        const formWrap = document.getElementById('form-wrap');
        if (formWrap) formWrap.style.display = 'none';
        const confirmEl = document.getElementById('confirm');
        if (confirmEl) confirmEl.style.display = 'block';

        atualizarContador();
      } catch (err) {
        console.error('Erro ao registrar:', err);
        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }
        if (formAlert) formAlert.classList.add('show');
      }
    });
  }
});
