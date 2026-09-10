/*
 * Nikkoplas website chatbot widget.
 * Self-contained: injects its own CSS + markup. Sends questions to a
 * Cloudflare Worker backend (see /chatbot-worker) that calls the Google
 * Gemini API, so answers come from a real AI model grounded in the
 * company's facts. If CHAT_ENDPOINT isn't configured yet, or the request
 * fails, it falls back to local keyword-matched FAQ answers so the widget
 * never breaks.
 */
(function () {
  'use strict';

  // Set this to your deployed Cloudflare Worker URL (see chatbot-worker/README.md).
  // Leave empty to run in FAQ-only mode (no AI backend required).
  var CHAT_ENDPOINT = 'https://nikkoplas-chatbot.wkwong04.workers.dev/';

  var IS_ZH = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;

  var KB_EN = [
    {
      id: 'materials',
      q: 'What materials do you mould?',
      label: 'Materials',
      keywords: ['material', 'materials', 'resin', 'plastic', 'ps', 'abs', 'polycarbonate', 'pc', 'pp', 'polypropylene', 'nylon', 'pa6', 'pa66', 'engineering plastic', 'polystyrene'],
      a: 'We process a wide range of thermoplastics including PS (Polystyrene), ABS, PC (Polycarbonate), PC/ABS blends, PP (Polypropylene), PE, Nylon (PA6, PA66) and other engineering-grade materials. Our injection moulding machines range from 50T to 450T clamping force.',
      link: { href: '/capabilities/', text: 'See our moulding capabilities' }
    },
    {
      id: 'moq',
      q: 'What is your minimum order quantity (MOQ)?',
      label: 'MOQ',
      keywords: ['moq', 'minimum order', 'minimum quantity', 'small order', 'quantity'],
      a: 'MOQ depends on part complexity and tooling investment. For new tools we typically require 1,000–5,000 pieces per run to cover setup costs; smaller runs can be accommodated if you already have a tool with us. Send us your part drawing and annual volume estimate for a specific quotation.',
      link: { href: '/#contact', text: 'Request a quotation' }
    },
    {
      id: 'dfm',
      q: 'Do you offer DFM (Design for Manufacturability) review?',
      keywords: ['dfm', 'design for manufacturability', 'design review', 'mould design', 'tooling design'],
      a: 'Our outsource partner performs DFM analysis on your part design — checking wall thickness, draft angles, gate locations and weld lines — and we provide written feedback together with your quotation to avoid costly mould modifications later.'
    },
    {
      id: 'location',
      q: 'Where are you located?',
      label: 'Location',
      keywords: ['location', 'located', 'address', 'where', 'johor', 'factory', 'directions', 'map'],
      a: 'Our facility is at 2B, Jalan Tampoi 2, Kawasan Perindustrian Tampoi, 81200 Johor Bahru, Johor, Malaysia — about 8 km from Johor Bahru city centre and within easy reach of Singapore via the Causeway.'
    },
    {
      id: 'iso',
      q: 'Are you ISO certified?',
      label: 'ISO Certified?',
      keywords: ['iso', 'certified', 'certification', 'certificate', 'quality management', 'environmental management', '9001', '14001'],
      a: 'Yes — we hold ISO 9001:2015 (Quality Management) and ISO 14001:2015 (Environmental Management) certifications, maintained through regular third-party audits.',
      link: { href: '/certifications/', text: 'View our certifications' }
    },
    {
      id: 'contact',
      q: 'How can I contact you?',
      label: 'Contact',
      keywords: ['contact', 'phone', 'call', 'whatsapp', 'email', 'reach', 'talk to someone', 'sales'],
      a: 'You can reach us at Tel: +607-237 0021, WhatsApp: 016-760 2667, or email bntee@nikkoplas.com. Office hours are Monday–Friday, 8:00am–5:30pm.',
      link: { href: '/#contact', text: 'Go to the contact section' }
    },
    {
      id: 'about',
      q: 'Tell me about Industri Nikkoplas.',
      keywords: ['about', 'company', 'history', 'since when', 'founded', 'experience', 'who are you', 'nikkoplas'],
      a: 'Industri Nikkoplas Sdn. Bhd. is an ISO 9001:2015 & 14001:2015 certified precision plastic injection moulding manufacturer in Johor Bahru, Malaysia, serving electronics, telecom and engineering OEM customers since 1988 — 35+ years of experience.',
      link: { href: '/about/', text: 'Read more about us' }
    },
    {
      id: 'services',
      q: 'What secondary processing / finishing services do you offer?',
      label: 'Services',
      keywords: ['service', 'services', 'secondary process', 'finishing', 'spray painting', 'printing', 'hot stamping', 'ultrasonic welding', 'silk screen', 'pad printing', 'tempo printing', 'assembly', 'sub-assembly'],
      a: 'Beyond injection moulding, we offer in-house secondary processing: spray painting (auto & semi-auto rotary), tempo printing (incl. 2-colour), pad printing, silk screen printing, hot stamping and ultrasonic welding — giving you a one-stop moulding-to-finishing solution.',
      link: { href: '/secondary-processes/', text: 'See all secondary processes' }
    },
    {
      id: 'industries',
      q: 'What industries do you serve?',
      keywords: ['industry', 'industries', 'electronics', 'telecom', 'telecommunication', 'connector housing', 'enclosure', 'sector', 'oem'],
      a: 'We specialize in precision plastic components for electronics, telecommunication and engineering OEMs — including connector housings and telecom enclosures.',
      link: { href: '/industries/electronics-telecom-engineering/', text: 'See industries we serve' }
    },
    {
      id: 'machinery',
      q: 'What machines / equipment do you have?',
      keywords: ['machine', 'machinery', 'equipment', 'clamping force', 'tonnage', 'fleet', 'press'],
      a: 'Our injection moulding fleet ranges from 50T to 450T clamping force, suited for small-to-mid tonnage precision parts.',
      link: { href: '/machinery/', text: 'View our machinery fleet' }
    },
    {
      id: 'portfolio',
      q: 'Can I see examples of your work?',
      keywords: ['portfolio', 'examples', 'past work', 'projects', 'gallery', 'products made'],
      a: 'You can browse examples of parts and projects we have manufactured in our portfolio.',
      link: { href: '/portfolio/', text: 'View our portfolio' }
    },
    {
      id: 'capabilities',
      q: 'What are your core capabilities?',
      keywords: ['capability', 'capabilities', 'one-stop', 'in-house painting', 'precision moulding'],
      a: 'Our core capabilities are one-stop injection moulding & finishing (with in-house painting) and small-to-mid tonnage precision moulding from 50T to 450T.',
      link: { href: '/capabilities/', text: 'See our capabilities' }
    }
  ];

  var KB_ZH = [
    {
      id: 'materials',
      q: '你們可以射出成型哪些材料?',
      label: '材料',
      keywords: ['材料', '樹脂', '塑膠', 'ps', 'abs', '聚碳酸酯', 'pc', 'pp', '聚丙烯', '尼龍', 'pa6', 'pa66', '工程塑膠', '聚苯乙烯'],
      a: '我們可加工多種熱塑性材料,包括 PS(聚苯乙烯)、ABS、PC(聚碳酸酯)、PC/ABS 合金、PP(聚丙烯)、PE、尼龍(PA6、PA66)及其他工程級材料。我們的射出成型機鎖模力範圍為 50 噸至 450 噸。',
      link: { href: '/zh/capabilities/', text: '查看我們的生產能力' }
    },
    {
      id: 'moq',
      q: '最低訂購量(MOQ)是多少?',
      label: 'MOQ',
      keywords: ['moq', '最低訂購', '最低數量', '小量訂購', '數量'],
      a: '最低訂購量取決於零件複雜度與模具投資。新開模具通常每批需 1,000 至 5,000 件以攤銷開模成本;若您已有現成模具,則可接受較小批量。請提供零件圖面與年用量預估,我們將提供具體報價。',
      link: { href: '/zh/#contact', text: '索取報價' }
    },
    {
      id: 'dfm',
      q: '是否提供 DFM(可製造性設計)審查?',
      keywords: ['dfm', '可製造性設計', '設計審查', '模具設計', '工模設計'],
      a: '我們的外部合作夥伴會針對您的零件設計進行 DFM 分析 ── 檢查壁厚、脫模角度、澆口位置與熔接線 ── 並隨報價提供書面意見,避免日後高成本的模具修改。'
    },
    {
      id: 'location',
      q: '你們的廠址在哪裡?',
      label: '廠址',
      keywords: ['廠址', '地址', '位置', '柔佛', '新山', '工廠', '路線', '地圖'],
      a: '我們的廠房位於 2B, Jalan Tampoi 2, Kawasan Perindustrian Tampoi, 81200 Johor Bahru, Johor, Malaysia ── 距新山市中心約 8 公里,並可透過新柔長堤輕鬆前往新加坡。'
    },
    {
      id: 'iso',
      q: '你們是否通過 ISO 認證?',
      label: 'ISO 認證?',
      keywords: ['iso', '認證', '品質管理', '環境管理', '9001', '14001'],
      a: '是的 ── 我們持有 ISO 9001:2015(品質管理)與 ISO 14001:2015(環境管理)認證,並定期接受第三方稽核。',
      link: { href: '/zh/certifications/', text: '查看我們的認證' }
    },
    {
      id: 'contact',
      q: '如何聯絡你們?',
      label: '聯絡我們',
      keywords: ['聯絡', '電話', '致電', 'whatsapp', '電郵', 'email', '找人', '業務'],
      a: '您可以透過電話 +607-237 0021、WhatsApp 016-760 2667,或電郵 bntee@nikkoplas.com 與我們聯繫。辦公時間為週一至週五 8:00am–5:30pm。',
      link: { href: '/zh/#contact', text: '前往聯絡我們頁面' }
    },
    {
      id: 'about',
      q: '請介紹一下 Industri Nikkoplas。',
      keywords: ['關於', '公司', '歷史', '成立', '經驗', '你們是誰', 'nikkoplas'],
      a: 'Industri Nikkoplas Sdn. Bhd. 是一家 ISO 9001:2015 與 14001:2015 認證的精密塑膠射出成型製造商,位於馬來西亞新山,自 1988 年起服務電子、電信及工程 OEM 客戶 ── 擁有 35 年以上經驗。',
      link: { href: '/zh/about/', text: '深入了解我們' }
    },
    {
      id: 'services',
      q: '你們提供哪些二次加工/表面處理服務?',
      label: '服務項目',
      keywords: ['服務', '二次加工', '表面處理', '噴漆', '印刷', '熱燙印', '超音波熔接', '網版印刷', '移印', '組裝', '次組裝'],
      a: '除了射出成型,我們也提供廠內二次加工:噴漆(自動與半自動迴轉式)、移印(含雙色移印)、網版印刷、熱燙印與超音波熔接 ── 提供您一站式從成型到表面處理的完整解決方案。',
      link: { href: '/zh/secondary-processes/', text: '查看所有二次加工服務' }
    },
    {
      id: 'industries',
      q: '你們服務哪些產業?',
      keywords: ['產業', '電子', '電信', '連接器外殼', '外殼', '領域', 'oem'],
      a: '我們專精於為電子、電信及工程類 OEM 客戶生產精密塑膠零件 ── 包括連接器外殼與電信設備外殼。',
      link: { href: '/zh/industries/electronics-telecom-engineering/', text: '查看我們服務的產業' }
    },
    {
      id: 'machinery',
      q: '你們有哪些機械設備?',
      keywords: ['機台', '機械', '設備', '鎖模力', '噸位', '機隊', '壓機'],
      a: '我們的射出成型機隊鎖模力範圍為 50 噸至 450 噸,適合中小噸位的精密零件生產。',
      link: { href: '/zh/machinery/', text: '查看我們的機械設備' }
    },
    {
      id: 'portfolio',
      q: '可以看看你們過去的作品嗎?',
      keywords: ['作品', '實績', '案例', '專案', '產品實績'],
      a: '您可以在我們的產品實績頁面瀏覽我們製造過的零件與專案範例。',
      link: { href: '/zh/portfolio/', text: '查看我們的產品實績' }
    },
    {
      id: 'capabilities',
      q: '你們的核心生產能力是什麼?',
      keywords: ['生產能力', '一站式', '廠內噴漆', '精密射出成型'],
      a: '我們的核心生產能力是一站式射出成型與表面處理(含廠內噴漆),以及鎖模力 50 噸至 450 噸的中小噸位精密射出成型。',
      link: { href: '/zh/capabilities/', text: '查看我們的生產能力' }
    }
  ];

  var KB = IS_ZH ? KB_ZH : KB_EN;

  var GREETING = IS_ZH
    ? "您好!👋 我是 Nikkoplas 的網站助理。歡迎詢問我們的材料、最低訂購量(MOQ)、服務項目、認證,或聯絡方式。"
    : "Hi! 👋 I'm the Nikkoplas assistant. Ask me about our materials, MOQ, services, certifications, or how to reach us.";
  var FALLBACK = IS_ZH
    ? "這個問題我暫時沒有明確的答案。如需詳細回覆,請透過電話 +607-237 0021、WhatsApp 016-760 2667,或電郵 bntee@nikkoplas.com 與我們聯繫。"
    : "I don't have a specific answer for that yet. For a detailed reply, please contact us at +607-237 0021, WhatsApp 016-760 2667, or bntee@nikkoplas.com.";
  var FALLBACK_LINK = IS_ZH ? { href: '/zh/#contact', text: '前往聯絡我們頁面' } : { href: '/#contact', text: 'Go to contact section' };
  var QUICK_REPLIES = ['materials', 'moq', 'services', 'iso', 'location', 'contact'];

  function normalize(str) {
    return str.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function findAnswer(text) {
    var norm = normalize(text);
    if (!norm) return null;
    var words = norm.split(' ');
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < KB.length; i++) {
      var entry = KB[i];
      var score = 0;
      for (var j = 0; j < entry.keywords.length; j++) {
        var kw = entry.keywords[j];
        if (norm.indexOf(kw) !== -1) {
          score += kw.split(' ').length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
    return bestScore > 0 ? best : null;
  }

  function askAI(message, history) {
    return fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, history: history, lang: IS_ZH ? 'zh-Hant' : 'en' })
    }).then(function (res) {
      if (!res.ok) throw new Error('Chat backend error ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || !data.reply) throw new Error('Empty reply');
      return data.reply;
    });
  }

  function injectStyles() {
    var css = [
      '#nk-chat-launcher{position:fixed;bottom:96px;right:28px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#005aab,#00c4b4);border:none;box-shadow:0 6px 24px rgba(0,43,92,0.35);cursor:pointer;z-index:1001;display:flex;align-items:center;justify-content:center;transition:transform .2s ease;padding:0;}',
      '#nk-chat-launcher:hover{transform:scale(1.06);}',
      '#nk-chat-launcher svg{width:28px;height:28px;fill:#fff;}',
      '#nk-chat-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#ff4d4f;border-radius:50%;border:2px solid #fff;}',
      '#nk-chat-panel{position:fixed;bottom:164px;right:24px;width:340px;max-width:calc(100vw - 32px);height:460px;max-height:calc(100vh - 200px);background:#fff;border-radius:16px;box-shadow:0 16px 48px rgba(0,43,92,0.25);display:flex;flex-direction:column;overflow:hidden;z-index:1001;font-family:\'Inter\',system-ui,-apple-system,sans-serif;opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease;}',
      '#nk-chat-panel.nk-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}',
      '#nk-chat-header{background:linear-gradient(135deg,#005aab,#003d7a);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}',
      '#nk-chat-header strong{font-size:.95rem;display:block;}',
      '#nk-chat-header span{font-size:.75rem;opacity:.8;}',
      '#nk-chat-close{background:none;border:none;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:4px;opacity:.85;}',
      '#nk-chat-close:hover{opacity:1;}',
      '#nk-chat-messages{flex:1;overflow-y:auto;padding:14px;background:#f8fafc;display:flex;flex-direction:column;gap:10px;}',
      '.nk-msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:.86rem;line-height:1.45;white-space:pre-wrap;}',
      '.nk-msg-bot{align-self:flex-start;background:#fff;color:#1e293b;border:1px solid #e5edf5;border-bottom-left-radius:4px;}',
      '.nk-msg-user{align-self:flex-end;background:#005aab;color:#fff;border-bottom-right-radius:4px;}',
      '.nk-msg a{color:#00c4b4;font-weight:600;text-decoration:underline;}',
      '.nk-msg-bot a{color:#005aab;}',
      '.nk-typing{display:inline-flex;gap:3px;align-items:center;padding:2px 0;}',
      '.nk-typing span{width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:nk-bounce 1.2s infinite ease-in-out;}',
      '.nk-typing span:nth-child(2){animation-delay:.15s;}',
      '.nk-typing span:nth-child(3){animation-delay:.3s;}',
      '@keyframes nk-bounce{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-4px);opacity:1;}}',
      '#nk-chat-quick{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;flex-shrink:0;max-width:100%;box-sizing:border-box;}',
      '.nk-chip{max-width:100%;background:#eef4fb;color:#005aab;border:1px solid #d7e6f7;border-radius:999px;padding:6px 11px;font-size:.78rem;line-height:1.3;cursor:pointer;transition:background .15s;white-space:normal;overflow-wrap:break-word;text-align:left;}',
      '.nk-chip:hover{background:#dcecfa;}',
      '#nk-chat-form{display:flex;border-top:1px solid #e5edf5;padding:10px;gap:8px;flex-shrink:0;background:#fff;box-sizing:border-box;}',
      '#nk-chat-input{flex:1 1 auto;min-width:0;width:100%;border:1px solid #dbe6f0;border-radius:10px;padding:9px 12px;font-size:.86rem;font-family:inherit;outline:none;box-sizing:border-box;}',
      '#nk-chat-input:focus{border-color:#005aab;}',
      '#nk-chat-send{flex:0 0 auto;background:#005aab;color:#fff;border:none;border-radius:10px;padding:0 14px;font-size:.86rem;font-weight:600;cursor:pointer;}',
      '#nk-chat-send:hover{background:#003d7a;}',
      '@media (max-width:420px){#nk-chat-panel{right:16px;left:16px;width:auto;bottom:148px;height:min(460px,calc(100vh - 180px));}#nk-chat-quick{padding:0 10px 8px;}.nk-chip{font-size:.74rem;padding:5px 9px;}#nk-chat-form{padding:8px;gap:6px;}#nk-chat-send{padding:0 10px;font-size:.8rem;}}'
    ].join('');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) e.setAttribute(k, attrs[k]);
    }
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function build() {
    injectStyles();

    var launcher = el('button', { id: 'nk-chat-launcher', 'aria-label': IS_ZH ? '開啟 Nikkoplas 助理對話視窗' : 'Open chat with Nikkoplas assistant', 'aria-expanded': 'false' });
    launcher.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.03 2 11c0 2.42 1.09 4.62 2.86 6.24-.14 1.34-.6 2.55-1.4 3.6a.5.5 0 0 0 .49.8c1.98-.36 3.63-1.1 4.9-2.02.99.24 2.04.38 3.15.38 5.52 0 10-4.03 10-9S17.52 2 12 2z"/></svg><span id="nk-chat-badge"></span>';
    document.body.appendChild(launcher);

    var panel = el('div', { id: 'nk-chat-panel', role: 'dialog', 'aria-label': IS_ZH ? 'Nikkoplas 聊天助理' : 'Nikkoplas chat assistant', 'aria-hidden': 'true' });

    var header = el('div', { id: 'nk-chat-header' },
      IS_ZH
        ? '<div><strong>Nikkoplas 助理</strong><span>詢問射出成型與服務項目</span></div>'
        : '<div><strong>Nikkoplas Assistant</strong><span>Ask about moulding &amp; services</span></div>');
    var closeBtn = el('button', { id: 'nk-chat-close', 'aria-label': IS_ZH ? '關閉對話視窗' : 'Close chat', type: 'button' }, '&times;');
    header.appendChild(closeBtn);

    var messages = el('div', { id: 'nk-chat-messages', role: 'log', 'aria-live': 'polite' });

    var quick = el('div', { id: 'nk-chat-quick' });
    QUICK_REPLIES.forEach(function (id) {
      var entry = KB.filter(function (e) { return e.id === id; })[0];
      if (!entry) return;
      var chip = el('button', { type: 'button', class: 'nk-chip', title: entry.q }, escapeHtml(entry.label || entry.q));
      chip.addEventListener('click', function () {
        handleUserMessage(entry.q);
      });
      quick.appendChild(chip);
    });

    var form = el('form', { id: 'nk-chat-form' });
    var input = el('input', { id: 'nk-chat-input', type: 'text', placeholder: IS_ZH ? '請輸入您的問題…' : 'Type your question…', autocomplete: 'off', maxlength: '300' });
    var sendBtn = el('button', { id: 'nk-chat-send', type: 'submit' }, IS_ZH ? '送出' : 'Send');
    form.appendChild(input);
    form.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(quick);
    panel.appendChild(form);
    document.body.appendChild(panel);

    // Centre the launcher above the WhatsApp float button (if present) so the
    // two floating buttons read as one aligned stack instead of an
    // off-centre circle-on-pill.
    function positionFAB() {
      var wa = document.querySelector('.whatsapp-float');
      var launcherSize = 56;
      var gapAboveWa = 16;
      var launcherRight = 28;
      var launcherBottom = 96;
      if (wa) {
        var r = wa.getBoundingClientRect();
        if (r.width && r.height) {
          var rightGap = window.innerWidth - r.right;
          var bottomGap = window.innerHeight - r.bottom;
          launcherRight = Math.max(16, Math.round(rightGap + (r.width - launcherSize) / 2));
          launcherBottom = Math.round(bottomGap + r.height + gapAboveWa);
        }
      }
      launcher.style.right = launcherRight + 'px';
      launcher.style.bottom = launcherBottom + 'px';
      panel.style.bottom = (launcherBottom + launcherSize + 12) + 'px';
    }
    positionFAB();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(positionFAB, 150);
    });

    var history = [];

    function addMessage(text, who, linkObj) {
      var msg = el('div', { class: 'nk-msg ' + (who === 'user' ? 'nk-msg-user' : 'nk-msg-bot') });
      msg.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
      if (linkObj) {
        var a = el('a', { href: linkObj.href }, escapeHtml(linkObj.text));
        msg.appendChild(document.createElement('br'));
        msg.appendChild(a);
      }
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
      return msg;
    }

    function addTyping() {
      var msg = el('div', { class: 'nk-msg nk-msg-bot' }, '<span class="nk-typing"><span></span><span></span><span></span></span>');
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
      return msg;
    }

    function localFallback(text) {
      var match = findAnswer(text);
      if (match) {
        addMessage(match.a, 'bot', match.link);
      } else {
        addMessage(FALLBACK, 'bot', FALLBACK_LINK);
      }
    }

    function handleUserMessage(text) {
      text = text.trim();
      if (!text) return;
      addMessage(text, 'user');
      input.value = '';

      if (!CHAT_ENDPOINT) {
        setTimeout(function () { localFallback(text); }, 250);
        return;
      }

      var typingEl = addTyping();
      askAI(text, history).then(function (reply) {
        typingEl.remove();
        addMessage(reply, 'bot');
        history.push({ role: 'user', text: text });
        history.push({ role: 'model', text: reply });
      }).catch(function () {
        typingEl.remove();
        localFallback(text);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleUserMessage(input.value);
    });

    var opened = false;
    function openPanel() {
      opened = true;
      panel.classList.add('nk-open');
      panel.setAttribute('aria-hidden', 'false');
      launcher.setAttribute('aria-expanded', 'true');
      var badge = document.getElementById('nk-chat-badge');
      if (badge) badge.style.display = 'none';
      if (!messages.children.length) {
        addMessage(GREETING, 'bot');
      }
      setTimeout(function () { input.focus(); }, 150);
    }
    function closePanel() {
      opened = false;
      panel.classList.remove('nk-open');
      panel.setAttribute('aria-hidden', 'true');
      launcher.setAttribute('aria-expanded', 'false');
    }
    launcher.addEventListener('click', function () {
      opened ? closePanel() : openPanel();
    });
    closeBtn.addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && opened) closePanel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
