/* ================================================================
   RMG Hire — Recruitment Management Portal
   Complete Application Logic
   ================================================================ */

// ───── Constants & State ─────
const STORAGE_KEY = 'rmg_hire_tickets';
const SOURCING_CHANNELS_KEY = 'rmg_sourcing_channels';
let currentEditId = null;
let lastCreatedTicketId = null;
let scopeInitialized = false;

const DEFAULT_CHANNELS = [
    'LinkedIn',
    'JobStreet',
    'Indeed Philippines',
    'Kalibrr',
    'Bossjob',
    'Jora Philippines',
    'Careers Website',
    'Employee Referral',
    'Agency',
    'Other'
];

function loadSourcingChannels() {
    try {
        const stored = localStorage.getItem(SOURCING_CHANNELS_KEY);
        if (stored) {
            const list = JSON.parse(stored);
            if (Array.isArray(list) && list.length > 0) return list;
        }
    } catch { }
    localStorage.setItem(SOURCING_CHANNELS_KEY, JSON.stringify(DEFAULT_CHANNELS));
    return DEFAULT_CHANNELS;
}

function saveSourcingChannel(channel) {
    if (!channel) return;
    const channels = loadSourcingChannels();
    if (!channels.includes(channel)) {
        channels.push(channel);
        localStorage.setItem(SOURCING_CHANNELS_KEY, JSON.stringify(channels));
    }
}

function populateSourcingChannelSelect(selectedVal) {
    const sel = document.getElementById('upd-channel');
    if (!sel) return;
    const channels = loadSourcingChannels();
    sel.innerHTML = channels.map(ch => `<option value="${ch}"${ch === selectedVal ? ' selected' : ''}>${ch}</option>`).join('');
}

function toggleAddCustomChannelInput() {
    const container = document.getElementById('custom-channel-container');
    if (!container) return;
    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
        container.classList.remove('hidden');
        document.getElementById('upd-channel-custom')?.focus();
    } else {
        container.classList.add('hidden');
    }
}

function addCustomSourcingChannel() {
    const input = document.getElementById('upd-channel-custom');
    const val = input ? input.value.trim() : '';
    if (!val) return;
    
    saveSourcingChannel(val);
    showToast('Channel Added', `Sourcing channel "${val}" has been added.`);
    
    populateSourcingChannelSelect(val);
    toggleAddCustomChannelInput();
    if (input) input.value = '';
}

// ───── Data Layer ─────
function loadTickets() {
    try {
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        let changed = false;
        list.forEach(t => {
            if (!t.assignedRecruiter) {
                t.assignedRecruiter = 'Unassigned';
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
        return list;
    }
    catch { return []; }
}

function saveTickets(tickets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function generateTicketId() {
    const tickets = loadTickets();
    const year = new Date().getFullYear();
    const nums = tickets
        .map(t => t.ticketId)
        .filter(id => id && id.includes(`RMG-${year}-`))
        .map(id => parseInt(id.split('-')[2], 10))
        .filter(n => !isNaN(n));
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `RMG-${year}-${String(next).padStart(4, '0')}`;
}

// ───── Theme Toggling ─────
function getChartThemeColors() {
    const isLight = document.body.classList.contains('light-theme');
    return {
        labelColor: isLight ? '#475569' : '#8892a4',
        gridColor: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.03)',
        borderBaseColor: isLight ? '#ffffff' : '#111827',
        tooltipBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(17, 24, 39, 0.95)',
        tooltipTitle: isLight ? '#0f172a' : '#f8fafc',
        tooltipBody: isLight ? '#334155' : '#cbd5e1',
        tooltipBorder: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'
    };
}

function loadTheme() {
    const savedTheme = localStorage.getItem('rmg_theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        localStorage.setItem('rmg_theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('rmg_theme', 'dark');
    }
    
    // Redraw charts if we are on the analytics page
    const pageAnalytics = document.getElementById('page-analytics');
    if (pageAnalytics && pageAnalytics.classList.contains('active')) {
        const compareContainer = document.getElementById('ana-compare-container');
        if (compareContainer && compareContainer.style.display !== 'none') {
            refreshComparison();
        } else {
            refreshAnalytics();
        }
    }
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light-theme');
    setTheme(isLight ? 'dark' : 'light');
}

// ───── Authentication & Navigation Gate ─────
const USERS_KEY = 'rmg_users';
const ACTIVE_USER_KEY = 'rmg_active_user';

function loadUsers() {
    try {
        const stored = localStorage.getItem(USERS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) { }
    return initDefaultUsers();
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function initDefaultUsers() {
    const defaults = [
        {
            email: 'admin@intelegencia.com',
            password: 'admin',
            name: 'System Admin',
            role: 'HR Team / Admin'
        },
        {
            email: 'recruiter@intelegencia.com',
            password: 'recruiter',
            name: 'Jane Recruiter',
            role: 'Recruiter'
        },
        {
            email: 'requester@intelegencia.com',
            password: 'requester',
            name: 'John Requester',
            role: 'Requester'
        }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
    return defaults;
}

function getActiveUser() {
    try {
        const active = sessionStorage.getItem(ACTIVE_USER_KEY);
        if (active) return JSON.parse(active);
    } catch (e) { }
    return null;
}

function checkAuth() {
    return getActiveUser() !== null;
}

function getActiveUserRole() {
    const user = getActiveUser();
    return user ? user.role : null;
}

function updateUIForUser() {
    const user = getActiveUser();
    if (!user) return;

    // Update Profile Card
    const nameDisplay = document.getElementById('user-name-display');
    const roleDisplay = document.getElementById('user-role-display');
    const initialsDisplay = document.getElementById('user-avatar-initials');
    
    if (nameDisplay) nameDisplay.textContent = user.name || user.email;
    if (roleDisplay) roleDisplay.textContent = user.role;
    if (initialsDisplay) {
        const parts = (user.name || '').trim().split(/\s+/);
        const initials = parts.map(p => p.charAt(0)).join('').toUpperCase().substring(0, 2);
        initialsDisplay.textContent = initials || user.email.charAt(0).toUpperCase();
    }

    // Update Navigation Links Visibility
    const isHr = user.role === 'HR Team / Admin';
    const isRecruiter = user.role === 'Recruiter';
    const isHrOrRecruiter = isHr || isRecruiter;
    
    const hiringNavLink = document.querySelector('.nav-link[data-page="hiring"]');
    const analyticsNavLink = document.querySelector('.nav-link[data-page="analytics"]');
    
    if (hiringNavLink) hiringNavLink.style.display = isHrOrRecruiter ? '' : 'none';
    if (analyticsNavLink) analyticsNavLink.style.display = isHrOrRecruiter ? '' : 'none';

    // Update Home page quick access cards
    const hiringQaCard = document.querySelector('.qa-card[onclick*="navigate(\'hiring\')"]');
    if (hiringQaCard) {
        hiringQaCard.style.display = isHrOrRecruiter ? '' : 'none';
    }

    // Toggle main page hero action button "Open Dashboard"
    const heroDashboardBtn = document.querySelector('.hero-actions .btn-outline[onclick*="navigate(\'hiring\')"]');
    if (heroDashboardBtn) {
        heroDashboardBtn.style.display = isHrOrRecruiter ? '' : 'none';
    }

    // Hide/show admin-security-section and adjust grid for Recruiter/Admin
    const adminSecuritySection = document.getElementById('admin-security-section');
    const adminPanelContent = document.getElementById('admin-panel-content');
    if (adminSecuritySection && adminPanelContent) {
        if (isRecruiter) {
            adminSecuritySection.style.display = 'none';
            adminPanelContent.style.gridTemplateColumns = '1fr 1fr';
        } else if (isHr) {
            adminSecuritySection.style.display = 'flex';
            adminPanelContent.style.gridTemplateColumns = '1fr 1fr 1.2fr';
        }
    }

    // Hide/show clear-database button based on user role (Admin only)
    const clearDbBtn = document.getElementById('btn-clear-database');
    if (clearDbBtn) {
        clearDbBtn.style.display = isHr ? '' : 'none';
    }

    // Set default dashboard scope based on role on first load or login
    if (!scopeInitialized) {
        if (isRecruiter) {
            changeHiringScope('my');
        } else {
            changeHiringScope('all');
        }
        scopeInitialized = true;
    }
}

function navigate(page) {
    const user = getActiveUser();
    
    // Auth Gate: if not logged in, force page to 'auth'
    if (!user) {
        page = 'auth';
    } else {
        // If logged in, prevent going to 'auth'
        if (page === 'auth') {
            page = 'home';
        }
        // Role Gate: Requester cannot access 'hiring' or 'analytics'
        if ((page === 'hiring' || page === 'analytics') && user.role !== 'HR Team / Admin' && user.role !== 'Recruiter') {
            page = 'home';
        }
    }

    // Hide/show navigation and footer depending on auth page
    const globalNav = document.getElementById('global-nav');
    const siteFooter = document.getElementById('site-footer');
    if (globalNav && siteFooter) {
        if (page === 'auth') {
            globalNav.classList.add('hidden');
            siteFooter.classList.add('hidden');
            document.body.classList.add('auth-gated');
        } else {
            globalNav.classList.remove('hidden');
            siteFooter.classList.remove('hidden');
            document.body.classList.remove('auth-gated');
        }
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const target = document.getElementById(`page-${page}`);
    if (target) {
        target.classList.add('active');
        // Restart animation
        target.style.animation = 'none';
        void target.offsetHeight;
        target.style.animation = '';
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Update UI elements based on role
    updateUIForUser();

    // Refresh page content
    switch (page) {
        case 'home':
            updateHeroStats();
            renderRecentActivity();
            break;
        case 'requester':
            renderRequesterTickets();
            break;
        case 'hiring':
            populateDeptFilter();
            renderHiringTickets();
            updateDashboardStats();
            // Initialize passcode value and user list
            const passcodeVal = localStorage.getItem('rmg_recruiter_passcode') || 'RMG123';
            const passcodeInp = document.getElementById('admin-passcode-input');
            if (passcodeInp) passcodeInp.value = passcodeVal;
            renderAdminUserList();
            break;
        case 'analytics':
            populateAnalyticsFilters();
            refreshAnalytics();
            break;
        case 'tracker':
            document.getElementById('tracker-ticket-id')?.focus();
            break;
        case 'auth':
            document.getElementById('login-email')?.focus();
            break;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ───── Particles Background ─────
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = [];
        const count = Math.min(Math.floor((w * h) / 18000), 80);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 1.8 + 0.5,
                alpha: Math.random() * 0.4 + 0.1
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(237, 25, 36, ${p.alpha})`;
            ctx.fill();
        }

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 140) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(237, 25, 36, ${0.06 * (1 - dist / 140)})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();
    window.addEventListener('resize', () => { resize(); createParticles(); });
}

// ───── Clock ─────
function updateClock() {
    const el = document.getElementById('nav-clock');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit'
        });
    }
}

// ───── Hero Stats ─────
function updateHeroStats() {
    let tickets = loadTickets();
    const user = getActiveUser();
    if (user) {
        if (user.role === 'Requester') {
            tickets = tickets.filter(t => t.requestedBy.toLowerCase() === user.name.toLowerCase());
        } else if (user.role === 'Recruiter') {
            tickets = tickets.filter(t => t.assignedRecruiter === user.name);
        }
    }
    const totalHired = tickets.reduce((s, t) => s + (t.hiredCount || 0), 0);
    const totalRequired = tickets.reduce((s, t) => s + (t.requiredHC || 0), 0);
    const inProg = tickets.filter(t => t.status === 'In Progress').length;

    animateNum('hero-total', tickets.length);
    animateNum('hero-hired', totalHired);
    animateNum('hero-pending', Math.max(0, totalRequired - totalHired));
    animateNum('hero-inprog', inProg);
}

// ───── Recent Activity ─────
function renderRecentActivity() {
    const container = document.getElementById('recent-activity');
    const section = document.getElementById('recent-section');
    if (!container || !section) return;

    let tickets = loadTickets();
    const user = getActiveUser();
    if (user) {
        if (user.role === 'Requester') {
            tickets = tickets.filter(t => t.requestedBy.toLowerCase() === user.name.toLowerCase());
        } else if (user.role === 'Recruiter') {
            tickets = tickets.filter(t => t.assignedRecruiter === user.name);
        }
    }
    tickets = tickets.slice(0, 6);
    if (!tickets.length) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';

    const dotColors = {
        'Open': 'var(--amber)',
        'In Progress': 'var(--accent2)',
        'Completed': 'var(--green)',
        'Cancelled': 'var(--red)'
    };

    container.innerHTML = tickets.map(t => `
        <div class="recent-card" onclick="showTicketDetail('${t.ticketId}')">
            <div class="recent-dot" style="background:${dotColors[t.status] || 'var(--accent)'}"></div>
            <div class="recent-info">
                <div class="ri-title">${t.ticketId} — ${t.department}</div>
                <div class="ri-meta">${t.project} · ${t.requestedBy} · HC: ${t.hiredCount}/${t.requiredHC} · <span class="badge ${badgeClass(t.status)}" style="font-size:.68rem;padding:2px 8px">${t.status}</span></div>
            </div>
        </div>
    `).join('');
}

// ───── Submit Hiring Request ─────
function submitRequest(e) {
    e.preventDefault();

    const ticket = {
        ticketId:     generateTicketId(),
        createdAt:    new Date().toISOString(),
        department:   val('req-department'),
        requestedBy:  val('req-requested-by'),
        project:      val('req-project'),
        hiringReason: val('req-hiring-reason'),
        billable:     val('req-billable'),
        reasonDetail: val('req-reason-detail'),
        requiredHC:   parseInt(val('req-hc'), 10) || 1,
        site:         val('req-site'),
        expectedDOJ:  val('req-doj'),
        status:       'Open',
        stage:        'Sourcing',
        hiredCount:   0,
        sourcingChannel: 'Other',
        recruitmentCost: 0,
        assignedRecruiter: 'Unassigned',
        remarks:      '',
        history: [
            { date: new Date().toISOString(), action: 'Ticket Created', by: 'Requester' }
        ]
    };

    const tickets = loadTickets();
    tickets.unshift(ticket);
    saveTickets(tickets);

    document.getElementById('hiring-form').reset();
    setMinDate();
    renderRequesterTickets();

    // Show success modal
    lastCreatedTicketId = ticket.ticketId;
    document.getElementById('success-ticket-display').textContent = ticket.ticketId;
    document.getElementById('success-modal').classList.remove('hidden');
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
}

function copyTicketId() {
    if (lastCreatedTicketId) {
        navigator.clipboard.writeText(lastCreatedTicketId).then(() => {
            showToast('Copied!', `${lastCreatedTicketId} copied to clipboard`);
        }).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = lastCreatedTicketId;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('Copied!', `${lastCreatedTicketId} copied to clipboard`);
        });
    }
}

// ───── Requester: Ticket Cards ─────
function renderRequesterTickets() {
    const container = document.getElementById('requester-ticket-list');
    if (!container) return;

    const search = (document.getElementById('requester-search')?.value || '').toLowerCase();
    const user = getActiveUser();
    const userRole = getActiveUserRole();
    const tickets = loadTickets().filter(t => {
        if (userRole === 'Requester' && user) {
            if (t.requestedBy.toLowerCase() !== user.name.toLowerCase()) return false;
        }
        if (!search) return true;
        return t.ticketId.toLowerCase().includes(search)
            || t.department.toLowerCase().includes(search)
            || t.project.toLowerCase().includes(search)
            || t.requestedBy.toLowerCase().includes(search);
    });

    if (!tickets.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>${search ? 'No matching tickets' : 'No tickets yet'}</h3>
                <p>${search ? 'Try a different search term.' : 'Submit a hiring request to get started.'}</p>
            </div>`;
        return;
    }

    container.innerHTML = tickets.map(t => {
        const pct = Math.min(100, Math.round((t.hiredCount / t.requiredHC) * 100));
        const statusClass = t.status.toLowerCase().replace(/\s+/g, '-');
        return `
        <div class="ticket-card status-${statusClass}" onclick="showTicketDetail('${t.ticketId}')">
            <div class="tc-header">
                <span class="tc-id">${t.ticketId}</span>
                <span class="badge ${badgeClass(t.status)}">${t.status}</span>
            </div>
            <div class="tc-dept">${t.department} — ${t.project}</div>
            <div class="tc-meta">
                <span>👤 ${t.requestedBy}</span>
                <span>📍 ${t.site}</span>
                <span>🎯 ${t.hiredCount}/${t.requiredHC} HC</span>
                <span>📅 ${fmtDate(t.expectedDOJ)}</span>
            </div>
            <div class="progress-mini">
                <div class="progress-mini-fill" style="width:${pct}%"></div>
            </div>
        </div>`;
    }).join('');
}

// ───── Hiring Dashboard: Table ─────
let currentHiringScope = 'all';

function changeHiringScope(scope) {
    currentHiringScope = scope;
    document.querySelectorAll('#hiring-scope-tabs-container .ana-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`btn-hiring-${scope}`);
    if (activeBtn) activeBtn.classList.add('active');
    renderHiringTickets();
}

function claimTicket(ticketId) {
    const user = getActiveUser();
    if (!user || user.role !== 'Recruiter') return;
    
    const tickets = loadTickets();
    const idx = tickets.findIndex(x => x.ticketId === ticketId);
    if (idx === -1) return;
    
    const t = tickets[idx];
    t.assignedRecruiter = user.name;
    t.updatedAt = new Date().toISOString();
    t.history = t.history || [];
    t.history.push({
        date: new Date().toISOString(),
        action: 'Ticket Claimed',
        by: user.name
    });
    
    saveTickets(tickets);
    showToast('Ticket Claimed', `You have claimed ticket ${ticketId}`);
    renderHiringTickets();
}

function renderHiringTickets() {
    const tbody = document.getElementById('hiring-table-body');
    const emptyEl = document.getElementById('hiring-empty');
    if (!tbody || !emptyEl) return;

    const search = (document.getElementById('hiring-search')?.value || '').toLowerCase();
    const statusF = document.getElementById('filter-status')?.value || '';
    const deptF = document.getElementById('filter-dept')?.value || '';

    let tickets = loadTickets();
    
    // Scope Filter
    const user = getActiveUser();
    if (user) {
        if (user.role === 'Recruiter') {
            if (currentHiringScope === 'my') {
                tickets = tickets.filter(t => t.assignedRecruiter === user.name);
            } else if (currentHiringScope === 'new') {
                tickets = tickets.filter(t => !t.assignedRecruiter || t.assignedRecruiter === 'Unassigned');
            } else { // 'all' scope for Recruiter: my + unassigned
                tickets = tickets.filter(t => t.assignedRecruiter === user.name || !t.assignedRecruiter || t.assignedRecruiter === 'Unassigned');
            }
        } else {
            if (currentHiringScope === 'my') {
                tickets = tickets.filter(t => t.assignedRecruiter === user.name);
            } else if (currentHiringScope === 'new') {
                tickets = tickets.filter(t => !t.assignedRecruiter || t.assignedRecruiter === 'Unassigned');
            }
        }
    }

    if (search) tickets = tickets.filter(t =>
        t.ticketId.toLowerCase().includes(search) ||
        t.department.toLowerCase().includes(search) ||
        t.project.toLowerCase().includes(search) ||
        t.requestedBy.toLowerCase().includes(search)
    );
    if (statusF) tickets = tickets.filter(t => t.status === statusF);
    if (deptF) tickets = tickets.filter(t => t.department === deptF);

    if (!tickets.length) {
        tbody.innerHTML = '';
        emptyEl.classList.remove('hidden');
        document.querySelector('.table-scroll').style.display = 'none';
        return;
    }

    emptyEl.classList.add('hidden');
    document.querySelector('.table-scroll').style.display = '';

    tbody.innerHTML = tickets.map(t => {
        const pending = Math.max(0, t.requiredHC - t.hiredCount);
        const pct = Math.min(100, Math.round((t.hiredCount / t.requiredHC) * 100));
        
        let recruiterCell = '';
        const ticketRecruiter = t.assignedRecruiter || 'Unassigned';
        if (ticketRecruiter && ticketRecruiter !== 'Unassigned') {
            recruiterCell = `<span style="font-weight:600;color:var(--text-dim)">${ticketRecruiter}</span>`;
        } else {
            if (user && user.role === 'Recruiter') {
                recruiterCell = `<button class="btn-table" onclick="claimTicket('${t.ticketId}')" style="background:var(--blue);border-color:var(--blue);font-size:0.72rem;padding:4px 8px;margin:0;">Claim</button>`;
            } else {
                recruiterCell = `<span style="color:var(--text-muted);font-style:italic">Unassigned</span>`;
            }
        }

        return `
        <tr>
            <td><strong style="color:var(--accent)">${t.ticketId}</strong></td>
            <td>${fmtDate(t.createdAt)}</td>
            <td>${t.department}</td>
            <td>${t.project}</td>
            <td>${t.requestedBy}</td>
            <td>${recruiterCell}</td>
            <td style="text-align:center">${t.requiredHC}</td>
            <td>
                <span style="color:var(--green);font-weight:700">${t.hiredCount}</span>
                <div class="progress-mini"><div class="progress-mini-fill" style="width:${pct}%"></div></div>
            </td>
            <td><span style="color:var(--amber);font-weight:600">${pending}</span></td>
            <td>${t.stage || '—'}</td>
            <td><span class="badge ${badgeClass(t.status)}">${t.status}</span></td>
            <td style="white-space:nowrap">
                <button class="btn-table" onclick="openUpdateModal('${t.ticketId}')">Update</button>
                <button class="btn-table-view" onclick="showTicketDetail('${t.ticketId}')">View</button>
            </td>
        </tr>`;
    }).join('');

    updateDashboardStats(tickets);
}

// ───── Dashboard Stats ─────
function updateDashboardStats(filteredTickets) {
    let tickets = filteredTickets;
    if (!tickets) {
        tickets = loadTickets();
        const user = getActiveUser();
        if (user) {
            if (user.role === 'Recruiter') {
                if (currentHiringScope === 'my') {
                    tickets = tickets.filter(t => t.assignedRecruiter === user.name);
                } else if (currentHiringScope === 'new') {
                    tickets = tickets.filter(t => !t.assignedRecruiter || t.assignedRecruiter === 'Unassigned');
                } else { // 'all' scope for Recruiter: my + unassigned
                    tickets = tickets.filter(t => t.assignedRecruiter === user.name || !t.assignedRecruiter || t.assignedRecruiter === 'Unassigned');
                }
            } else {
                if (currentHiringScope === 'my') {
                    tickets = tickets.filter(t => t.assignedRecruiter === user.name);
                } else if (currentHiringScope === 'new') {
                    tickets = tickets.filter(t => !t.assignedRecruiter || t.assignedRecruiter === 'Unassigned');
                }
            }
        }
    }
    const open = tickets.filter(t => t.status === 'Open').length;
    const inProg = tickets.filter(t => t.status === 'In Progress').length;
    const comp = tickets.filter(t => t.status === 'Completed').length;
    const canc = tickets.filter(t => t.status === 'Cancelled').length;
    const totalReq = tickets.reduce((s, t) => s + (t.requiredHC || 0), 0);
    const totalHired = tickets.reduce((s, t) => s + (t.hiredCount || 0), 0);
    const pct = totalReq > 0 ? Math.round((totalHired / totalReq) * 100) : 0;

    animateNum('stat-total-num', tickets.length);
    animateNum('stat-open-num', open);
    animateNum('stat-inprogress-num', inProg);
    animateNum('stat-completed-num', comp);
    animateNum('stat-cancelled-num', canc);
    animateNum('stat-hired-num', totalHired);
    animateNum('stat-required-num', totalReq);

    const fill = document.getElementById('stat-hc-fill');
    if (fill) fill.style.width = `${pct}%`;
}

function animateNum(elId, target) {
    const el = document.getElementById(elId);
    if (!el) return;
    const current = parseInt(el.textContent, 10) || 0;
    if (current === target) { el.textContent = target; return; }
    const diff = target - current;
    const steps = Math.min(Math.abs(diff), 20);
    const stepVal = diff / steps;
    let i = 0;
    const iv = setInterval(() => {
        i++;
        el.textContent = Math.round(current + stepVal * i);
        if (i >= steps) { el.textContent = target; clearInterval(iv); }
    }, 30);
}

// ───── Department Filter ─────
function populateDeptFilter() {
    const sel = document.getElementById('filter-dept');
    if (!sel) return;
    const depts = [...new Set(loadTickets().map(t => t.department))].sort();
    const cur = sel.value;
    sel.innerHTML = '<option value="">All Departments</option>' +
        depts.map(d => `<option${d === cur ? ' selected' : ''}>${d}</option>`).join('');
}

// ───── Update Modal ─────
function openUpdateModal(ticketId) {
    const t = loadTickets().find(x => x.ticketId === ticketId);
    if (!t) return;
    currentEditId = ticketId;

    document.getElementById('modal-ticket-id').textContent = ticketId;
    document.getElementById('modal-ticket-summary').innerHTML = `
        <strong>${t.department}</strong> — ${t.project}<br>
        Requested by <strong>${t.requestedBy}</strong> &nbsp;|&nbsp; HC: <strong>${t.requiredHC}</strong> &nbsp;|&nbsp; Site: ${t.site}<br>
        Billable: ${t.billable} &nbsp;|&nbsp; Reason: ${t.hiringReason}
    `;
    document.getElementById('upd-stage').value = t.stage || 'Sourcing';
    document.getElementById('upd-status').value = t.status;
    document.getElementById('upd-hired').value = t.hiredCount;
    document.getElementById('upd-hired').max = t.requiredHC;
    populateSourcingChannelSelect(t.sourcingChannel || 'Other');
    document.getElementById('custom-channel-container')?.classList.add('hidden');
    const customInput = document.getElementById('upd-channel-custom');
    if (customInput) customInput.value = '';
    document.getElementById('upd-cost').value = t.recruitmentCost || 0;
    document.getElementById('upd-remarks').value = t.remarks || '';

    // Populate Recruiter select dropdown
    const recSel = document.getElementById('upd-recruiter');
    if (recSel) {
        const ticketRecruiter = t.assignedRecruiter || 'Unassigned';
        const allUsers = loadUsers();
        // Allow allocating to themselves or any other recruiter / admin (team members)
        const teamMembers = [...new Set(allUsers.filter(u => u.role === 'Recruiter' || u.role === 'HR Team / Admin').map(u => u.name).filter(Boolean))].sort();
        
        let optionsHtml = `<option value="">Unassigned</option>`;
        if (ticketRecruiter && ticketRecruiter !== 'Unassigned' && !teamMembers.includes(ticketRecruiter)) {
            optionsHtml += `<option value="${ticketRecruiter}" selected>${ticketRecruiter}</option>`;
        }
        optionsHtml += teamMembers.map(name => 
            `<option value="${name}" ${ticketRecruiter === name ? 'selected' : ''}>${name}</option>`
        ).join('');
        recSel.innerHTML = optionsHtml;
    }

    // Show/hide delete button based on user role (Admin only)
    const deleteBtn = document.getElementById('btn-delete-ticket');
    if (deleteBtn) {
        const currentUser = getActiveUser();
        if (currentUser && currentUser.role === 'HR Team / Admin') {
            deleteBtn.style.display = 'inline-flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.gap = '4px';
        } else {
            deleteBtn.style.display = 'none';
        }
    }

    document.getElementById('update-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('update-modal').classList.add('hidden');
    currentEditId = null;
}

function deleteTicket() {
    if (!currentEditId) return;
    const currentUser = getActiveUser();
    if (!currentUser || currentUser.role !== 'HR Team / Admin') {
        showToast('Access Denied', 'Only HR Team / Admin users can delete tickets.');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ticket ${currentEditId}? This action cannot be undone.`)) {
        let tickets = loadTickets();
        const deletedId = currentEditId;
        tickets = tickets.filter(t => t.ticketId !== deletedId);
        saveTickets(tickets);
        
        closeModal();
        renderHiringTickets();
        updateDashboardStats();
        
        showToast('Ticket Deleted', `Ticket ${deletedId} has been successfully deleted.`);
    }
}

function saveUpdate(e) {
    e.preventDefault();
    if (!currentEditId) return;
    const tickets = loadTickets();
    const idx = tickets.findIndex(x => x.ticketId === currentEditId);
    if (idx === -1) return;

    const t = tickets[idx];
    const newStage = document.getElementById('upd-stage').value;
    const newStatus = document.getElementById('upd-status').value;
    const newHired = parseInt(document.getElementById('upd-hired').value, 10) || 0;
    const newRemarks = document.getElementById('upd-remarks').value.trim();
    let newChannel = document.getElementById('upd-channel').value;
    const customContainer = document.getElementById('custom-channel-container');
    const customInput = document.getElementById('upd-channel-custom');
    if (customContainer && !customContainer.classList.contains('hidden') && customInput && customInput.value.trim()) {
        const customVal = customInput.value.trim();
        saveSourcingChannel(customVal);
        newChannel = customVal;
    }
    const newCost = parseInt(document.getElementById('upd-cost').value, 10) || 0;
    const newRecruiter = document.getElementById('upd-recruiter')?.value || 'Unassigned';

    const changes = [];
    if (t.stage !== newStage) changes.push(`Stage → ${newStage}`);
    if (t.status !== newStatus) changes.push(`Status → ${newStatus}`);
    if (t.hiredCount !== newHired) changes.push(`Hired Count → ${newHired}`);
    if ((t.sourcingChannel || 'Other') !== newChannel) changes.push(`Sourcing Channel → ${newChannel}`);
    if ((t.recruitmentCost || 0) !== newCost) changes.push(`Spend → ₱${newCost.toLocaleString('en-PH')}`);
    if ((t.assignedRecruiter || 'Unassigned') !== newRecruiter) changes.push(`Recruiter → ${newRecruiter || 'Unassigned'}`);
    if (newRemarks && t.remarks !== newRemarks) changes.push('Remarks updated');

    if (changes.length) {
        t.history = t.history || [];
        t.history.push({
            date: new Date().toISOString(),
            action: changes.join('; '),
            by: getActiveUser()?.name || 'Hiring Team'
        });
    }

    t.stage = newStage;
    t.status = newStatus;
    t.hiredCount = newHired;
    t.sourcingChannel = newChannel;
    t.recruitmentCost = newCost;
    t.assignedRecruiter = newRecruiter || 'Unassigned';
    t.remarks = newRemarks;
    t.updatedAt = new Date().toISOString();
    
    tickets[idx] = t;
    saveTickets(tickets);
    closeModal();
    renderHiringTickets();
    showToast('Update Saved', `Ticket ${t.ticketId} has been updated.`);
}

function showTicketDetail(ticketId) {
    const t = loadTickets().find(x => x.ticketId === ticketId);
    if (!t) return;

    const activeUser = getActiveUser();
    const userRole = getActiveUserRole();
    // Block Requester from viewing other users' tickets
    if (userRole === 'Requester' && activeUser && t.requestedBy.toLowerCase() !== activeUser.name.toLowerCase()) {
        showToast('Unauthorized', 'You are not authorized to view this ticket.');
        return;
    }
    // Block Recruiter from viewing tickets assigned to other recruiters
    if (userRole === 'Recruiter' && activeUser && t.assignedRecruiter && t.assignedRecruiter !== 'Unassigned' && t.assignedRecruiter !== activeUser.name) {
        showToast('Unauthorized', 'You are not authorized to view this ticket.');
        return;
    }

    const pending = Math.max(0, t.requiredHC - t.hiredCount);
    const pct = Math.min(100, Math.round((t.hiredCount / t.requiredHC) * 100));

    const rows = [
        ['Ticket ID', `<strong style="color:var(--accent)">${t.ticketId}</strong>`],
        ['Status', `<span class="badge ${badgeClass(t.status)}">${t.status}</span>`],
        ['Stage', t.stage || '-'],
        ['Department', t.department],
        ['Project', t.project],
        ['Requested By', t.requestedBy],
        ['Assigned Recruiter', t.assignedRecruiter || 'Unassigned'],
        ['Hiring Reason', t.hiringReason],
        ['Detailed Reason', t.reasonDetail || '-'],
        ['Billable', t.billable],
        ['Site / Location', t.site],
        ['Required HC', t.requiredHC],
        ['Hired', `<span style="color:var(--green);font-weight:700">${t.hiredCount}</span>`],
        ['Pending', `<span style="color:var(--amber);font-weight:700">${pending}</span>`],
        ['Progress', `<div style="display:flex;align-items:center;gap:10px">
            <div class="progress-mini" style="width:140px"><div class="progress-mini-fill" style="width:${pct}%"></div></div>
            <span style="font-size:.82rem;color:var(--text-dim)">${pct}%</span></div>`],
        ['Expected DOJ', fmtDate(t.expectedDOJ)],
        ['Sourcing Channel', t.sourcingChannel || 'Other'],
        ['Recruitment Spend', `₱${(t.recruitmentCost || 0).toLocaleString('en-PH')}`],
        ['Created', fmtDateTime(t.createdAt)],
        ['Last Updated', t.updatedAt ? fmtDateTime(t.updatedAt) : '-'],
        ['Remarks', t.remarks || '-'],
    ];

    let html = rows.map(([l, v]) =>
        `<div class="detail-row"><div class="detail-label">${l}</div><div class="detail-value">${v}</div></div>`
    ).join('');

    if (t.history?.length) {
        html += `<div class="timeline"><div class="timeline-title">📋 Activity Timeline</div>`;
        html += t.history.map(h => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-text">
                    <strong>${h.action}</strong><br>
                    <span>${fmtDateTime(h.date)} — ${h.by}</span>
                </div>
            </div>`).join('');
        html += '</div>';
    }

    if (userRole === 'HR Team / Admin' || userRole === 'Recruiter') {
        html += `<div style="margin-top: 18px; padding: 14px; border: 1px dashed rgba(108,99,255,0.3); border-radius: var(--radius-sm); background: rgba(108,99,255,0.03);">
            <div style="color: var(--accent); margin-bottom: 8px; font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                📧 Recruiter Communications (Smart Mailer)
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn-table-view" onclick="currentEditId='${t.ticketId}';generateEmailTemplate('update')" style="margin:0; padding: 6px 10px; font-size: 0.72rem; flex: 1; border-color: rgba(108,99,255,0.3); color: var(--accent);">Update Requester</button>
                <button type="button" class="btn-table-view" onclick="currentEditId='${t.ticketId}';generateEmailTemplate('interview')" style="margin:0; padding: 6px 10px; font-size: 0.72rem; flex: 1; border-color: rgba(16,185,129,0.3); color: var(--green);">Invite Candidate</button>
                <button type="button" class="btn-table-view" onclick="currentEditId='${t.ticketId}';generateEmailTemplate('offer')" style="margin:0; padding: 6px 10px; font-size: 0.72rem; flex: 1; border-color: rgba(245,158,11,0.3); color: var(--amber);">Release Offer</button>
            </div>
        </div>`;
    }

    document.getElementById('detail-content').innerHTML = html;
    document.getElementById('detail-modal').classList.remove('hidden');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.add('hidden');
}

// ───── Tracker Page Lookup ─────
function lookupTicket() {
    const input = (document.getElementById('tracker-ticket-id')?.value || '').trim().toUpperCase();
    const result = document.getElementById('tracker-result');
    if (!result) return;
    if (!input) { result.classList.add('hidden'); return; }

    let t = loadTickets().find(x => x.ticketId === input);
    const activeUser = getActiveUser();
    const userRole = getActiveUserRole();
    if (t && userRole === 'Requester' && activeUser && t.requestedBy.toLowerCase() !== activeUser.name.toLowerCase()) {
        t = null; // Treat as not found for requesters searching other users' tickets
    }
    if (!t) {
        result.classList.remove('hidden');
        result.innerHTML = `
            <div class="tr-card" style="text-align:center;padding:40px">
                <div style="font-size:2.5rem;margin-bottom:12px">😕</div>
                <h3 style="margin-bottom:8px">Ticket Not Found</h3>
                <p style="color:var(--text-dim);font-size:.9rem">No ticket found with ID <strong style="color:var(--accent)">${input}</strong>.<br>Please check and try again.</p>
            </div>`;
        return;
    }

    const pending = Math.max(0, t.requiredHC - t.hiredCount);
    const pct = Math.min(100, Math.round((t.hiredCount / t.requiredHC) * 100));

    result.classList.remove('hidden');
    result.innerHTML = `
        <div class="tr-card">
            <div class="tr-header">
                <span class="tr-id">${t.ticketId}</span>
                <span class="badge ${badgeClass(t.status)}">${t.status}</span>
            </div>

            <div class="tr-grid">
                <div class="tr-item"><span class="tr-label">Department</span><span class="tr-value">${t.department}</span></div>
                <div class="tr-item"><span class="tr-label">Project</span><span class="tr-value">${t.project}</span></div>
                <div class="tr-item"><span class="tr-label">Requested By</span><span class="tr-value">${t.requestedBy}</span></div>
                <div class="tr-item"><span class="tr-label">Site</span><span class="tr-value">${t.site}</span></div>
                <div class="tr-item"><span class="tr-label">Hiring Reason</span><span class="tr-value">${t.hiringReason}</span></div>
                <div class="tr-item"><span class="tr-label">Billable</span><span class="tr-value">${t.billable}</span></div>
                <div class="tr-item"><span class="tr-label">Stage</span><span class="tr-value">${t.stage || '—'}</span></div>
                <div class="tr-item"><span class="tr-label">Assigned Recruiter</span><span class="tr-value">${t.assignedRecruiter || 'Unassigned'}</span></div>
                <div class="tr-item"><span class="tr-label">Expected DOJ</span><span class="tr-value">${fmtDate(t.expectedDOJ)}</span></div>
                <div class="tr-item"><span class="tr-label">Sourcing Channel</span><span class="tr-value">${t.sourcingChannel || 'Other'}</span></div>
                <div class="tr-item"><span class="tr-label">Recruitment Spend</span><span class="tr-value">₱${(t.recruitmentCost || 0).toLocaleString('en-PH')}</span></div>
                <div class="tr-item"><span class="tr-label">Required HC</span><span class="tr-value" style="font-weight:700">${t.requiredHC}</span></div>
                <div class="tr-item"><span class="tr-label">Hired</span><span class="tr-value" style="color:var(--green);font-weight:700">${t.hiredCount}</span></div>
                <div class="tr-item"><span class="tr-label">Pending</span><span class="tr-value" style="color:var(--amber);font-weight:700">${pending}</span></div>
                <div class="tr-item"><span class="tr-label">Created</span><span class="tr-value">${fmtDateTime(t.createdAt)}</span></div>
            </div>

            <div class="tr-progress-row">
                <div class="tr-progress-label">Hiring Progress — ${pct}%</div>
                <div class="tr-progress-bar"><div class="tr-progress-fill" style="width:${pct}%"></div></div>
            </div>

            ${t.remarks ? `<div class="tr-remarks"><strong>Remarks:</strong> ${t.remarks}</div>` : ''}

            ${t.history?.length ? `
            <div class="timeline" style="margin-top:24px">
                <div class="timeline-title">📋 Activity Timeline</div>
                ${t.history.map(h => `
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="timeline-text">
                            <strong>${h.action}</strong><br>
                            <span>${fmtDateTime(h.date)} — ${h.by}</span>
                        </div>
                    </div>`).join('')}
            </div>` : ''}

            <div style="margin-top:20px;display:flex;gap:10px">
                <button class="btn-primary" onclick="showTicketDetail('${t.ticketId}')">View Full Details</button>
            </div>
        </div>`;
}

function clearTracker() {
    const input = document.getElementById('tracker-ticket-id');
    if (input) input.value = '';
    document.getElementById('tracker-result')?.classList.add('hidden');
}

// ───── Excel Export ─────
function exportToExcel() {
    const tickets = loadTickets();
    if (!tickets.length) {
        showToast('No Data', 'There are no tickets to export.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        showToast('Export Error', 'Excel library not loaded. Check your internet connection.');
        return;
    }

    const data = tickets.map(t => ({
        'Ticket ID':       t.ticketId,
        'Created Date':    fmtDateTime(t.createdAt),
        'Department':      t.department,
        'Project':         t.project,
        'Requested By':    t.requestedBy,
        'Assigned Recruiter': t.assignedRecruiter || 'Unassigned',
        'Hiring Reason':   t.hiringReason,
        'Billable':        t.billable,
        'Detailed Reason': t.reasonDetail || '',
        'Required HC':     t.requiredHC,
        'Site':            t.site,
        'Expected DOJ':    fmtDate(t.expectedDOJ),
        'Status':          t.status,
        'Stage':           t.stage || '',
        'Sourcing Channel': t.sourcingChannel || 'Other',
        'Recruitment Spend (PHP)': t.recruitmentCost || 0,
        'Hired Count':     t.hiredCount,
        'Pending':         Math.max(0, t.requiredHC - t.hiredCount),
        'Remarks':         t.remarks || '',
        'Last Updated':    t.updatedAt ? fmtDateTime(t.updatedAt) : ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
        {wch:18},{wch:20},{wch:14},{wch:20},{wch:18},{wch:18},{wch:12},
        {wch:30},{wch:12},{wch:14},{wch:14},{wch:14},{wch:18},{wch:18},{wch:22},{wch:12},
        {wch:10},{wch:30},{wch:20}
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Hiring Requests');

    // Summary sheet
    const all = loadTickets();
    const summaryData = [
        { Metric: 'Total Requests',     Value: all.length },
        { Metric: 'Open',               Value: all.filter(t => t.status === 'Open').length },
        { Metric: 'In Progress',        Value: all.filter(t => t.status === 'In Progress').length },
        { Metric: 'Completed',          Value: all.filter(t => t.status === 'Completed').length },
        { Metric: 'Cancelled',          Value: all.filter(t => t.status === 'Cancelled').length },
        { Metric: 'Total Required HC',  Value: all.reduce((s, t) => s + (t.requiredHC || 0), 0) },
        { Metric: 'Total Hired',        Value: all.reduce((s, t) => s + (t.hiredCount || 0), 0) },
        { Metric: 'Total Pending',      Value: all.reduce((s, t) => s + Math.max(0, (t.requiredHC||0)-(t.hiredCount||0)), 0) },
        { Metric: 'Total Spend (PHP)',  Value: all.reduce((s, t) => s + (t.recruitmentCost || 0), 0) },
        { Metric: 'Avg. Cost Per Hire (PHP)', Value: all.reduce((s, t) => s + (t.hiredCount || 0), 0) > 0 ? Math.round(all.reduce((s, t) => s + (t.recruitmentCost || 0), 0) / all.reduce((s, t) => s + (t.hiredCount || 0), 0)) : 0 },
        { Metric: 'Export Date',        Value: new Date().toLocaleString() }
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    ws2['!cols'] = [{wch:22},{wch:22}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

    const fileName = `RMG_Hiring_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('Export Complete', `Downloaded as ${fileName}`);
}

// ───── Toast ─────
function showToast(title, msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.remove('hidden');
    toast.style.animation = 'none';
    void toast.offsetHeight;
    toast.style.animation = '';
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ───── Helpers ─────
function val(id) { return (document.getElementById(id)?.value || '').trim(); }

function badgeClass(status) {
    const map = {
        'Open':        'badge-open',
        'In Progress': 'badge-in-progress',
        'Completed':   'badge-completed',
        'Cancelled':   'badge-cancelled'
    };
    return map[status] || 'badge-open';
}

function fmtDate(s) {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return s; }
}

function fmtDateTime(s) {
    if (!s) return '—';
    try {
        const d = new Date(s);
        return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
            + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    } catch { return s; }
}

function setMinDate() {
    const el = document.getElementById('req-doj');
    if (el) el.min = new Date().toISOString().split('T')[0];
}

// ───── Authentication Operations ─────
function toggleAuthTab(tab) {
    const loginBtn = document.getElementById('btn-tab-login');
    const signupBtn = document.getElementById('btn-tab-signup');
    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    
    if (!loginBtn || !signupBtn || !loginForm || !signupForm) return;
    
    if (tab === 'login') {
        loginBtn.classList.add('active');
        loginBtn.style.color = 'var(--text)';
        loginBtn.style.borderBottom = '2px solid var(--accent)';
        
        signupBtn.classList.remove('active');
        signupBtn.style.color = 'var(--text-muted)';
        signupBtn.style.borderBottom = 'none';
        
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        document.getElementById('auth-login-error')?.classList.add('hidden');
    } else {
        signupBtn.classList.add('active');
        signupBtn.style.color = 'var(--text)';
        signupBtn.style.borderBottom = '2px solid var(--accent)';
        
        loginBtn.classList.remove('active');
        loginBtn.style.color = 'var(--text-muted)';
        loginBtn.style.borderBottom = 'none';
        
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        document.getElementById('auth-signup-error')?.classList.add('hidden');
    }
}

function toggleRegisterRole(role) {
    const passcodeGroup = document.getElementById('signup-passcode-group');
    const passcodeField = document.getElementById('signup-passcode');
    const passcodeHelp = passcodeGroup ? passcodeGroup.querySelector('.passcode-help') : null;
    const passcodeLabel = passcodeGroup ? passcodeGroup.querySelector('.passcode-label') : null;
    if (!passcodeGroup) return;
    
    if (role === 'HR Team / Admin' || role === 'Recruiter') {
        passcodeGroup.classList.remove('hidden');
        if (passcodeField) passcodeField.required = true;
        if (passcodeHelp) {
            passcodeHelp.textContent = `Security passcode is required to register as ${role === 'Recruiter' ? 'a Recruiter' : 'HR/Admin'}.`;
        }
        if (passcodeLabel) {
            passcodeLabel.innerHTML = `${role === 'Recruiter' ? 'Recruiter' : 'Admin'} Security Passcode <span class="req">*</span>`;
        }
    } else {
        passcodeGroup.classList.add('hidden');
        if (passcodeField) {
            passcodeField.required = false;
            passcodeField.value = '';
        }
    }
}

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    if (!input) return;
    const btn = input.nextElementSibling;
    const eye = btn ? btn.querySelector('.eye-icon') : null;
    
    if (input.type === 'password') {
        input.type = 'text';
        if (eye) eye.style.color = 'var(--accent)';
    } else {
        input.type = 'password';
        if (eye) eye.style.color = 'var(--text-dim)';
    }
}

function submitLogin(e) {
    e.preventDefault();
    const email = val('login-email').toLowerCase();
    const password = val('login-password');
    const errorEl = document.getElementById('auth-login-error');
    const box = document.querySelector('.auth-box');
    
    const users = loadUsers();
    const matchedUser = users.find(u => u.email.toLowerCase() === email && u.password === password);
    
    if (matchedUser) {
        if (errorEl) errorEl.classList.add('hidden');
        
        // Save session
        const sessionUser = {
            email: matchedUser.email,
            name: matchedUser.name,
            role: matchedUser.role
        };
        sessionStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(sessionUser));
        scopeInitialized = false;
        
        // Reset form
        document.getElementById('auth-login-form').reset();
        
        showToast('Welcome back', `Signed in as ${matchedUser.name}`);
        navigate('home');
    } else {
        if (box) {
            box.classList.add('login-shake');
            setTimeout(() => box.classList.remove('login-shake'), 400);
        }
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.textContent = '❌ Invalid corporate email or password.';
        }
    }
}

function submitSignup(e) {
    e.preventDefault();
    const name = val('signup-name');
    const email = val('signup-email').toLowerCase();
    const password = val('signup-password');
    const role = document.getElementById('signup-role').value;
    const passcode = val('signup-passcode');
    const errorEl = document.getElementById('auth-signup-error');
    const box = document.querySelector('.auth-box');
    
    // Recruiter validation check
    if (role === 'HR Team / Admin' || role === 'Recruiter') {
        const currentPasscode = localStorage.getItem('rmg_recruiter_passcode') || 'RMG123';
        if (passcode !== currentPasscode) {
            if (box) {
                box.classList.add('login-shake');
                setTimeout(() => box.classList.remove('login-shake'), 400);
            }
            if (errorEl) {
                errorEl.classList.remove('hidden');
                errorEl.textContent = '❌ Invalid security passcode.';
            }
            return;
        }
    }
    
    const users = loadUsers();
    if (users.some(u => u.email.toLowerCase() === email)) {
        if (box) {
            box.classList.add('login-shake');
            setTimeout(() => box.classList.remove('login-shake'), 400);
        }
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.textContent = '❌ An account with this corporate email already exists.';
        }
        return;
    }
    
    // Save new user
    const newUser = { name, email, password, role };
    users.push(newUser);
    saveUsers(users);
    
    if (errorEl) errorEl.classList.add('hidden');
    
    showToast('Success', 'Account created successfully! Please sign in.');
    
    // Switch to login tab and auto-fill email
    document.getElementById('auth-signup-form').reset();
    toggleRegisterRole('Requester');
    toggleAuthTab('login');
    const loginEmailInput = document.getElementById('login-email');
    if (loginEmailInput) {
        loginEmailInput.value = email;
        document.getElementById('login-password')?.focus();
    }
}

function logout() {
    sessionStorage.removeItem(ACTIVE_USER_KEY);
    scopeInitialized = false;
    currentHiringScope = 'all';
    showToast('Signed Out', 'You have successfully signed out.');
    navigate('auth');
}

// ───── Forgot Password Flow ─────
let currentResetEmail = '';
let currentResetOTP = '';

function handleForgotSubmit(e) {
    if (e) e.preventDefault();
    const step1 = document.getElementById('forgot-step-1');
    if (step1 && !step1.classList.contains('hidden')) {
        sendResetOTP();
    } else {
        submitPasswordReset();
    }
}

function showForgotForm() {
    document.getElementById('auth-login-form')?.classList.add('hidden');
    document.getElementById('auth-signup-form')?.classList.add('hidden');
    document.getElementById('auth-forgot-form')?.classList.remove('hidden');
    
    // Hide tabs selector
    const tabs = document.querySelector('.auth-tabs');
    if (tabs) tabs.style.display = 'none';
    
    // Reset steps
    document.getElementById('forgot-step-1')?.classList.remove('hidden');
    document.getElementById('forgot-step-2')?.classList.add('hidden');
    
    // Clear fields
    const emailField = document.getElementById('forgot-email');
    if (emailField) emailField.value = '';
    
    const otpField = document.getElementById('forgot-otp');
    if (otpField) otpField.value = '';
    
    const newPassField = document.getElementById('forgot-new-password');
    if (newPassField) newPassField.value = '';
    
    const confirmPassField = document.getElementById('forgot-confirm-password');
    if (confirmPassField) confirmPassField.value = '';
    
    document.getElementById('auth-forgot-error')?.classList.add('hidden');
    document.getElementById('auth-reset-error')?.classList.add('hidden');
    
    emailField?.focus();
}

function hideForgotForm() {
    document.getElementById('auth-forgot-form')?.classList.add('hidden');
    document.getElementById('auth-login-form')?.classList.remove('hidden');
    
    // Show tabs selector
    const tabs = document.querySelector('.auth-tabs');
    if (tabs) tabs.style.display = '';
    
    // Reset tabs selection back to Login
    toggleAuthTab('login');
}

function sendResetOTP() {
    const email = val('forgot-email').toLowerCase();
    const errorEl = document.getElementById('auth-forgot-error');
    if (!email) {
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.textContent = '❌ Please enter your corporate email.';
        }
        return;
    }
    
    const users = loadUsers();
    const userExists = users.find(u => u.email.toLowerCase() === email);
    
    if (!userExists) {
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.textContent = '❌ Account with this corporate email was not found.';
        }
        return;
    }
    
    if (errorEl) errorEl.classList.add('hidden');
    
    // Generate a 6-digit mock OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    currentResetEmail = email;
    currentResetOTP = otp;
    
    // Show toast with OTP
    showToast('🔒 Verification OTP Sent', `Your demo password reset verification code is: ${otp}`);
    
    // Transition to Step 2
    document.getElementById('forgot-step-1')?.classList.add('hidden');
    document.getElementById('forgot-step-2')?.classList.remove('hidden');
    document.getElementById('forgot-otp')?.focus();
}

function submitPasswordReset() {
    const otp = val('forgot-otp');
    const newPass = val('forgot-new-password');
    const confirmPass = val('forgot-confirm-password');
    const errorEl = document.getElementById('auth-reset-error');
    
    if (!otp || !newPass || !confirmPass) {
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.textContent = '❌ All fields are required.';
        }
        return;
    }
    
    if (otp !== currentResetOTP) {
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.textContent = '❌ Invalid verification OTP.';
        }
        return;
    }
    
    if (newPass.length < 4) {
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.textContent = '❌ Password must be at least 4 characters long.';
        }
        return;
    }
    
    if (newPass !== confirmPass) {
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.textContent = '❌ Passwords do not match.';
        }
        return;
    }
    
    if (errorEl) errorEl.classList.add('hidden');
    
    // Update password in database
    const users = loadUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === currentResetEmail.toLowerCase());
    if (idx !== -1) {
        users[idx].password = newPass;
        saveUsers(users);
        
        showToast('Password Reset Success', 'Your password was updated. Signing in...');
        
        // Auto sign-in the user
        const sessionUser = {
            email: users[idx].email,
            name: users[idx].name,
            role: users[idx].role
        };
        sessionStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(sessionUser));
        
        // Hide forgot form and navigate
        hideForgotForm();
        navigate('home');
    } else {
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.textContent = '❌ Error updating password. Please try again.';
        }
    }
}

// ───── Data Management Collapsible Panel ─────
function toggleAdminPanel() {
    const content = document.getElementById('admin-panel-content');
    const chevron = document.getElementById('admin-chevron');
    if (!content || !chevron) return;
    
    const isHidden = content.classList.contains('hidden');
    if (isHidden) {
        content.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
        
        // Refresh values on expand
        const passcodeVal = localStorage.getItem('rmg_recruiter_passcode') || 'RMG123';
        const passcodeInp = document.getElementById('admin-passcode-input');
        if (passcodeInp) passcodeInp.value = passcodeVal;
        renderAdminUserList();
    } else {
        content.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
    }
}

// ───── Recruiter Security & User Account Management ─────
function updateRecruiterPasscode() {
    const input = document.getElementById('admin-passcode-input');
    const val = input ? input.value.trim() : '';
    if (!val) {
        showToast('Validation Error', 'Passcode cannot be empty.');
        return;
    }
    
    localStorage.setItem('rmg_recruiter_passcode', val);
    showToast('Passcode Updated', `Recruiter security passcode set to "${val}"`);
}

function renderAdminUserList() {
    const container = document.getElementById('admin-user-list-container');
    const hrCountEl = document.getElementById('admin-stats-hr-count');
    const reqCountEl = document.getElementById('admin-stats-req-count');
    if (!container) return;
    
    const users = loadUsers();
    
    // Count roles
    let hrCount = 0;
    let reqCount = 0;
    users.forEach(u => {
        if (u.role === 'HR Team / Admin') hrCount++;
        else reqCount++;
    });
    
    if (hrCountEl) hrCountEl.textContent = hrCount;
    if (reqCountEl) reqCountEl.textContent = reqCount;
    
    if (!users.length) {
        container.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.72rem; text-align: center;">No registered accounts.</div>';
        return;
    }
    
    // Render list of user accounts
    container.innerHTML = users.map(u => {
        const isDefault = u.email === 'admin@intelegencia.com' || u.email === 'requester@intelegencia.com';
        const roleLabel = u.role === 'HR Team / Admin' ? 'Admin' : 'Req';
        const roleClr = u.role === 'HR Team / Admin' ? 'var(--green)' : 'var(--blue)';
        
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.76rem;">
                <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden; margin-right: 8px;">
                    <strong style="color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${u.name || 'No Name'}</strong>
                    <span style="color: var(--text-dim); font-size: 0.66rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${u.email}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: rgba(${u.role === 'HR Team / Admin' ? '16, 185, 129' : '59, 130, 246'}, 0.1); border: 1px solid ${roleClr}; color: ${roleClr}; font-weight: 600;">
                        ${roleLabel}
                    </span>
                    ${isDefault ? '' : `
                        <button type="button" onclick="deleteUserAccount('${u.email}')" style="background: none; border: none; color: var(--red); cursor: pointer; padding: 2px; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" title="Delete User">
                            🗑️
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function deleteUserAccount(email) {
    if (!email) return;
    if (email === 'admin@intelegencia.com' || email === 'requester@intelegencia.com') {
        showToast('Action Denied', 'Cannot delete system default user accounts.');
        return;
    }
    
    const active = getActiveUser();
    if (active && active.email.toLowerCase() === email.toLowerCase()) {
        showToast('Action Denied', 'You cannot delete your own logged-in account.');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the user account: ${email}?`)) {
        let users = loadUsers();
        users = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
        saveUsers(users);
        showToast('User Deleted', `Account ${email} has been removed.`);
        renderAdminUserList();
    }
}

// ───── Load Premium Demo Data ─────
function loadPremiumDemoData() {
    if (loadTickets().length > 0) {
        if (!confirm("Are you sure you want to load premium demo data? This will overwrite your current local database with 12 highly realistic hiring requests across a 3-month timeline.")) {
            return;
        }
    }
    
    const today = new Date();
    
    function subDays(num) {
        const d = new Date();
        d.setDate(today.getDate() - num);
        return d.toISOString();
    }
    
    const demoTickets = [
        {
            ticketId: "RMG-2026-0001",
            createdAt: subDays(72),
            updatedAt: subDays(20),
            department: "Technology",
            project: "Cloud Migrate",
            requestedBy: "Sarah Jenkins",
            hiringReason: "Expansion",
            billable: "Billable",
            reasonDetail: "Migrating legacy infrastructure to AWS cloud requiring specialized cloud engineers.",
            requiredHC: 4,
            hiredCount: 4,
            site: "Gurugram",
            expectedDOJ: subDays(20),
            status: "Completed",
            stage: "Joined",
            sourcingChannel: "LinkedIn",
            recruitmentCost: 25000,
            remarks: "All candidates onboarded and verified. Successfully completed onboarding.",
            history: [
                { date: subDays(72), action: "Ticket Created", by: "Sarah Jenkins" },
                { date: subDays(68), action: "Stage → Sourcing", by: "Hiring Team" },
                { date: subDays(55), action: "Stage → Interview Scheduled", by: "Hiring Team" },
                { date: subDays(40), action: "Stage → Offer Rolled Out; Hired Count → 4", by: "Hiring Team" },
                { date: subDays(20), action: "Stage → Joined; Status → Completed", by: "Hiring Team" }
            ]
        },
        {
            ticketId: "RMG-2026-0002",
            createdAt: subDays(60),
            updatedAt: subDays(15),
            department: "Operations",
            project: "Tech Support L1",
            requestedBy: "David Miller",
            hiringReason: "Attrition Backfill",
            billable: "Billable",
            reasonDetail: "Backfill for 10 attrition cases in Q1 Tech Support department.",
            requiredHC: 10,
            hiredCount: 10,
            site: "Noida",
            expectedDOJ: subDays(15),
            status: "Completed",
            stage: "Joined",
            sourcingChannel: "JobStreet",
            recruitmentCost: 45000,
            remarks: "Backfill complete. Remaining pipeline closed.",
            history: [
                { date: subDays(60), action: "Ticket Created", by: "David Miller" },
                { date: subDays(58), action: "Stage → Screening", by: "Hiring Team" },
                { date: subDays(45), action: "Stage → Interview Scheduled; Hired Count → 5", by: "Hiring Team" },
                { date: subDays(30), action: "Stage → Offer Rolled Out; Hired Count → 8", by: "Hiring Team" },
                { date: subDays(15), action: "Stage → Joined; Status → Completed; Hired Count → 10", by: "Hiring Team" }
            ]
        },
        {
            ticketId: "RMG-2026-0003",
            createdAt: subDays(45),
            updatedAt: subDays(5),
            department: "Finance",
            project: "SAP Ledger Automation",
            requestedBy: "Rebecca Vance",
            hiringReason: "New Project",
            billable: "Non-Billable",
            reasonDetail: "Dedicated financial systems analyst for internal ledger consolidation.",
            requiredHC: 2,
            hiredCount: 2,
            site: "Mumbai",
            expectedDOJ: subDays(5),
            status: "Completed",
            stage: "Joined",
            sourcingChannel: "Agency",
            recruitmentCost: 65000,
            remarks: "Both analysts joined on schedule.",
            history: [
                { date: subDays(45), action: "Ticket Created", by: "Rebecca Vance" },
                { date: subDays(40), action: "Stage → Sourcing", by: "Hiring Team" },
                { date: subDays(20), action: "Stage → Offer Rolled Out; Hired Count → 2", by: "Hiring Team" },
                { date: subDays(5), action: "Stage → Joined; Status → Completed", by: "Hiring Team" }
            ]
        },
        {
            ticketId: "RMG-2026-0004",
            createdAt: subDays(38),
            updatedAt: subDays(2),
            department: "Technology",
            project: "AI Fraud Detection",
            requestedBy: "Sarah Jenkins",
            hiringReason: "Expansion",
            billable: "Billable",
            reasonDetail: "Specialized machine learning model engineers for payment fraud prevention systems.",
            requiredHC: 3,
            hiredCount: 2,
            site: "Gurugram",
            expectedDOJ: subDays(-10),
            status: "In Progress",
            stage: "Offer Rolled Out",
            sourcingChannel: "LinkedIn",
            recruitmentCost: 35000,
            remarks: "2 offers accepted and background check active. 1 position still sourcing.",
            history: [
                { date: subDays(38), action: "Ticket Created", by: "Sarah Jenkins" },
                { date: subDays(35), action: "Stage → Sourcing", by: "Hiring Team" },
                { date: subDays(20), action: "Stage → Screening", by: "Hiring Team" },
                { date: subDays(10), action: "Stage → Interview Scheduled", by: "Hiring Team" },
                { date: subDays(2), action: "Stage → Offer Rolled Out; Hired Count → 2; Status → In Progress", by: "Hiring Team" }
            ]
        },
        {
            ticketId: "RMG-2026-0005",
            createdAt: subDays(28),
            updatedAt: subDays(4),
            department: "HR",
            project: "Talent Acquisition Q2",
            requestedBy: "Emily Watson",
            hiringReason: "Expansion",
            billable: "Non-Billable",
            reasonDetail: "Additional recruitment coordinators to support bulk operations ramp-up.",
            requiredHC: 2,
            hiredCount: 1,
            site: "Noida",
            expectedDOJ: subDays(-12),
            status: "In Progress",
            stage: "Offer Accepted",
            sourcingChannel: "Employee Referral",
            recruitmentCost: 10000,
            remarks: "First recruiter onboarded, second coordinator starting background verification.",
            history: [
                { date: subDays(28), action: "Ticket Created", by: "Emily Watson" },
                { date: subDays(25), action: "Stage → Sourcing", by: "Hiring Team" },
                { date: subDays(15), action: "Stage → Interview Scheduled; Hired Count → 1", by: "Hiring Team" },
                { date: subDays(4), action: "Stage → Offer Accepted", by: "Hiring Team" }
            ]
        },
        {
            ticketId: "RMG-2026-0006",
            createdAt: subDays(20),
            updatedAt: subDays(3),
            department: "Sales",
            project: "US Retail Expansion",
            requestedBy: "Marcus Brody",
            hiringReason: "Expansion",
            billable: "Billable",
            reasonDetail: "Account executives to lead new US mid-market sales outreach.",
            requiredHC: 5,
            hiredCount: 1,
            site: "Mumbai",
            expectedDOJ: subDays(-20),
            status: "In Progress",
            stage: "Interview Scheduled",
            sourcingChannel: "LinkedIn",
            recruitmentCost: 15000,
            remarks: "8 screenings completed. 4 video interviews scheduled for next week.",
            history: [
                { date: subDays(20), action: "Ticket Created", by: "Marcus Brody" },
                { date: subDays(18), action: "Stage → Sourcing", by: "Hiring Team" },
                { date: subDays(10), action: "Stage → Screening; Hired Count → 1", by: "Hiring Team" },
                { date: subDays(3), action: "Stage → Interview Scheduled", by: "Hiring Team" }
            ]
        },
        {
            ticketId: "RMG-2026-0007",
            createdAt: subDays(15),
            updatedAt: subDays(15),
            department: "Quality",
            project: "ISO Compliance Audit",
            requestedBy: "Arthur Pendelton",
            hiringReason: "New Project",
            billable: "Non-Billable",
            reasonDetail: "ISO compliance lead auditor for upcoming external re-certification.",
            requiredHC: 1,
            hiredCount: 0,
            site: "Noida",
            expectedDOJ: subDays(-15),
            status: "Open",
            stage: "Sourcing",
            sourcingChannel: "Indeed Philippines",
            recruitmentCost: 8000,
            remarks: "Sourcing active on LinkedIn and Naukri. Job description optimized.",
            history: [
                { date: subDays(15), action: "Ticket Created", by: "Arthur Pendelton" }
            ]
        },
        {
            ticketId: "RMG-2026-0008",
            createdAt: subDays(10),
            updatedAt: subDays(1),
            department: "Operations",
            project: "Customer Service Voice",
            requestedBy: "David Miller",
            hiringReason: "Replacement",
            billable: "Billable",
            reasonDetail: "Bulk customer service agent replacement hiring due to attrition.",
            requiredHC: 15,
            hiredCount: 4,
            site: "Noida",
            expectedDOJ: subDays(-5),
            status: "In Progress",
            stage: "Interview Done",
            sourcingChannel: "JobStreet",
            recruitmentCost: 30000,
            remarks: "4 candidates cleared final rounds. Offer letters under approval.",
            history: [
                { date: subDays(10), action: "Ticket Created", by: "David Miller" },
                { date: subDays(7), action: "Stage → Screening", by: "Hiring Team" },
                { date: subDays(4), action: "Stage → Interview Scheduled; Hired Count → 4", by: "Hiring Team" },
                { date: subDays(1), action: "Stage → Interview Done", by: "Hiring Team" }
            ]
        },
        {
            ticketId: "RMG-2026-0009",
            createdAt: subDays(5),
            updatedAt: subDays(2),
            department: "Technology",
            project: "iOS App Redesign",
            requestedBy: "Sarah Jenkins",
            hiringReason: "New Project",
            billable: "Billable",
            reasonDetail: "Senior Swift/iOS developer for core consumer app rewrite.",
            requiredHC: 2,
            hiredCount: 0,
            site: "Gurugram",
            expectedDOJ: subDays(-30),
            status: "Open",
            stage: "Screening",
            sourcingChannel: "Careers Website",
            recruitmentCost: 0,
            remarks: "Screening resumes from recruiter database.",
            history: [
                { date: subDays(5), action: "Ticket Created", by: "Sarah Jenkins" },
                { date: subDays(2), action: "Stage → Screening", by: "Hiring Team" }
            ]
        },
        {
            ticketId: "RMG-2026-0010",
            createdAt: subDays(3),
            updatedAt: subDays(3),
            department: "Training",
            project: "Ops Induction Q2",
            requestedBy: "Clara Barton",
            hiringReason: "Replacement",
            billable: "Non-Billable",
            reasonDetail: "Tech support product trainer for new hires induction.",
            requiredHC: 1,
            hiredCount: 0,
            site: "Mumbai",
            expectedDOJ: subDays(-25),
            status: "Open",
            stage: "Sourcing",
            sourcingChannel: "Other",
            recruitmentCost: 4000,
            remarks: "Job description received and posted on job boards.",
            history: [
                { date: subDays(3), action: "Ticket Created", by: "Clara Barton" }
            ]
        },
        {
            ticketId: "RMG-2026-0011",
            createdAt: subDays(30),
            updatedAt: subDays(5),
            department: "Sales",
            project: "LATAM Markets",
            requestedBy: "Marcus Brody",
            hiringReason: "Expansion",
            billable: "Billable",
            reasonDetail: "Spanish speaking business development reps.",
            requiredHC: 2,
            hiredCount: 0,
            site: "Mumbai",
            expectedDOJ: subDays(5),
            status: "Cancelled",
            stage: "Dropped",
            sourcingChannel: "Agency",
            recruitmentCost: 40000,
            remarks: "Project postponed by LATAM client due to budget freeze.",
            history: [
                { date: subDays(30), action: "Ticket Created", by: "Marcus Brody" },
                { date: subDays(25), action: "Stage → Sourcing", by: "Hiring Team" },
                { date: subDays(5), action: "Stage → Dropped; Status → Cancelled", by: "Hiring Team" }
            ]
        },
        {
            ticketId: "RMG-2026-0012",
            createdAt: subDays(1),
            updatedAt: subDays(1),
            department: "Technology",
            project: "Devops Pipeline",
            requestedBy: "Sarah Jenkins",
            hiringReason: "Attrition Backfill",
            billable: "Billable",
            reasonDetail: "Devops engineer backfill for continuous integration squad.",
            requiredHC: 1,
            hiredCount: 0,
            site: "Noida",
            expectedDOJ: subDays(-20),
            status: "Open",
            stage: "Sourcing",
            sourcingChannel: "LinkedIn",
            recruitmentCost: 12000,
            remarks: "Sourcing initiated.",
            history: [
                { date: subDays(1), action: "Ticket Created", by: "Sarah Jenkins" }
            ]
        }
    ];
    
    saveTickets(demoTickets);
    
    // Refresh all views
    renderHiringTickets();
    updateDashboardStats();
    populateDeptFilter();
    
}

// ───── Clear Database Tickets ─────
function clearDatabaseTickets() {
    const currentUser = getActiveUser();
    if (!currentUser || currentUser.role !== 'HR Team / Admin') {
        showToast('Access Denied', 'Only HR Team / Admin users can clear the database.');
        return;
    }
    
    if (!confirm("Are you sure you want to clear the entire tickets database? This will delete all cases and cannot be undone. We recommend exporting a JSON backup first!")) {
        return;
    }
    
    saveTickets([]);
    
    // Refresh all views
    renderHiringTickets();
    updateDashboardStats();
    populateDeptFilter();
    
    showToast("Database Cleared", "All tickets have been successfully removed.");
}

// ───── Database Backup & Restore (JSON) ─────
function backupDatabaseJSON() {
    const tickets = loadTickets();
    if (!tickets.length) {
        showToast('No Data', 'There is no data to backup.');
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tickets, null, 2));
    const dlAnchorElem = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `RMG_Tickets_Backup_${dateStr}.json`);
    dlAnchorElem.click();
    showToast('Backup Complete', 'JSON backup file downloaded successfully.');
}

function restoreDatabaseJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const tickets = JSON.parse(evt.target.result);
            if (Array.isArray(tickets)) {
                // validation
                const isValid = tickets.every(t => t.ticketId && t.department && t.status);
                if (!isValid) {
                    showToast('Invalid Format', 'JSON file does not contain valid tickets.');
                    return;
                }
                saveTickets(tickets);
                showToast('Restore Complete', `Successfully loaded ${tickets.length} tickets from JSON backup.`);
                
                // Refresh dashboard views
                renderHiringTickets();
                updateDashboardStats();
                populateDeptFilter();
                
                e.target.value = '';
            } else {
                showToast('Invalid Data', 'Backup JSON must be a list of tickets.');
            }
        } catch {
            showToast('Parsing Error', 'Could not read the JSON backup file.');
        }
    };
    reader.readAsText(file);
}

// ───── Smart Excel Import ─────
function importExcelData(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') {
        showToast('Library Error', 'SheetJS is not loaded. Check your internet connection.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const rawRows = XLSX.utils.sheet_to_json(worksheet);
            if (!rawRows.length) {
                showToast('Empty Sheet', 'No data found in the Excel sheet.');
                return;
            }
            
            const tickets = loadTickets();
            let mergedCount = 0;
            let addedCount = 0;
            
            rawRows.forEach(row => {
                const ticketId = row['Ticket ID'] || row['ticketId'] || row['ID'];
                if (!ticketId) return;
                
                const department = row['Department'] || row['department'] || 'Other';
                const project = row['Project'] || row['project'] || 'Unknown';
                const requestedBy = row['Requested By'] || row['requestedBy'] || 'System';
                const hiringReason = row['Hiring Reason'] || row['hiringReason'] || 'New Project';
                const billable = row['Billable'] || row['billable'] || 'Billable';
                const reasonDetail = row['Detailed Reason'] || row['reasonDetail'] || '';
                const requiredHC = parseInt(row['Required HC'] || row['requiredHC'] || 1, 10);
                const site = row['Site'] || row['site'] || 'Noida';
                const expectedDOJ = row['Expected DOJ'] || row['expectedDOJ'] || new Date().toISOString().split('T')[0];
                const status = row['Status'] || row['status'] || 'Open';
                const stage = row['Stage'] || row['stage'] || 'Sourcing';
                const hiredCount = parseInt(row['Hired Count'] || row['hiredCount'] || 0, 10);
                const sourcingChannel = row['Sourcing Channel'] || row['sourcingChannel'] || 'Other';
                saveSourcingChannel(sourcingChannel);
                const recruitmentCost = parseInt(row['Recruitment Spend (PHP)'] || row['Recruitment Cost (PHP)'] || row['recruitmentCost'] || 0, 10);
                const remarks = row['Remarks'] || row['remarks'] || '';
                const assignedRecruiter = row['Assigned Recruiter'] || row['assignedRecruiter'] || row['Recruiter'] || 'Unassigned';
                const createdAt = row['Created Date'] || row['createdAt'] || new Date().toISOString();
                const updatedAt = row['Last Updated'] || row['updatedAt'] || new Date().toISOString();
                
                const ticketObj = {
                    ticketId,
                    createdAt: new Date(createdAt).toISOString(),
                    updatedAt: new Date(updatedAt).toISOString(),
                    department,
                    requestedBy,
                    project,
                    hiringReason,
                    billable,
                    reasonDetail,
                    requiredHC,
                    site,
                    expectedDOJ,
                    status,
                    stage,
                    hiredCount,
                    sourcingChannel,
                    recruitmentCost,
                    assignedRecruiter,
                    remarks,
                    history: [
                        { date: new Date().toISOString(), action: 'Ticket Imported/Merged via Excel', by: 'Recruiter' }
                    ]
                };
                
                const idx = tickets.findIndex(t => t.ticketId === ticketId);
                if (idx !== -1) {
                    tickets[idx] = {
                        ...tickets[idx],
                        ...ticketObj,
                        history: [...(tickets[idx].history || []), ticketObj.history[0]]
                    };
                    mergedCount++;
                } else {
                    tickets.push(ticketObj);
                    addedCount++;
                }
            });
            
            saveTickets(tickets);
            showToast('Import Complete', `Excel import successful: Added ${addedCount}, Merged ${mergedCount} tickets.`);
            
            // Refresh views
            renderHiringTickets();
            updateDashboardStats();
            populateDeptFilter();
            
            e.target.value = '';
        } catch (err) {
            console.error(err);
            showToast('Import Error', 'Failed to parse Excel data. Make sure format is correct.');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ───── Smart Email Template Generator ─────
function generateEmailTemplate(type) {
    if (!currentEditId) {
        showToast('No Ticket Selected', 'Please select a ticket before generating templates.');
        return;
    }
    const tickets = loadTickets();
    const t = tickets.find(x => x.ticketId === currentEditId);
    if (!t) return;
    
    let subject = '';
    let body = '';
    
    const appURL = window.location.href;
    const progressPercent = Math.round((t.hiredCount / t.requiredHC) * 100);
    
    switch (type) {
        case 'update':
            subject = `[RMG Hire] Status Update for Ticket ${t.ticketId} - ${t.project}`;
            body = `Hi ${t.requestedBy},

Here is a quick status update regarding your hiring request (Ticket ID: ${t.ticketId}) for the project "${t.project}" in the ${t.department} department.

• Current Status: ${t.status}
• Recruiter Stage: ${t.stage || 'Sourcing'}
• Headcount Progress: ${t.hiredCount} hired of ${t.requiredHC} required (${progressPercent}% Fulfilled)
• Site Location: ${t.site}
• Expected Date of Joining: ${fmtDate(t.expectedDOJ)}

Recruiter Remarks:
${t.remarks || 'No active remarks added yet. Sourcing is currently in progress.'}

You can track real-time updates for this ticket anytime by visiting the portal at:
${appURL} (Navigate to 'Track Ticket' page and enter ${t.ticketId})

Best regards,
Hiring Operations Team
RMG Hire Portal`;
            break;
            
        case 'interview':
            subject = `[Interview Invitation] Application Review — RMG Hire (${t.project})`;
            body = `Dear Candidate,

Thank you for your interest in joining the ${t.department} team for project ${t.project}. 

We have reviewed your profile and would love to schedule a preliminary discussion with you. 

Please let us know your availability over the next 2-3 business days for a 30-minute MS Teams video call.

Position Details:
• Role/Project: ${t.project}
• Location: ${t.site} (Mode of joining is site-specific)

We look forward to speaking with you!

Best regards,
Hiring & Recruitment Team
RMG Hire`;
            break;
            
        case 'offer':
            subject = `[Offer Release Notification] RMG Recruitment Team — Ticket ID: ${t.ticketId}`;
            body = `Dear ${t.requestedBy},

We are thrilled to notify you that we have successfully finalized a candidate for your hiring request (Ticket ID: ${t.ticketId}) for project ${t.project}.

The details of the offer are as follows:
• Position: Associate / Analyst — ${t.department}
• Project/LOB: ${t.project}
• Proposed Joining Date: ${fmtDate(t.expectedDOJ)}
• Work Site Location: ${t.site}

We are currently initiating the onboarding and pre-joining background verification workflows. We will keep you updated in case of any timeline adjustments.

Best regards,
Recruitment Operations
RMG Hire`;
            break;
    }
    
    // Open email
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    showToast('Mailer Triggered', 'Launched system email client.');
}

// ───── Analytics Engine ─────
let trendPeriod = 'daily';

function populateAnalyticsFilters() {
    const tickets = loadTickets();
    const user = getActiveUser();
    const isRecruiter = user && user.role === 'Recruiter';
    
    // Departments (Standard)
    const deptSel = document.getElementById('ana-filter-dept');
    if (deptSel) {
        const depts = [...new Set(tickets.map(t => t.department).filter(Boolean))].sort();
        const cur = deptSel.value;
        deptSel.innerHTML = '<option value="">All Departments</option>' +
            depts.map(d => `<option${d === cur ? ' selected' : ''}>${d}</option>`).join('');
    }
    
    // Requesters (Standard)
    const reqSel = document.getElementById('ana-filter-requester');
    if (reqSel) {
        const requesters = [...new Set(tickets.map(t => t.requestedBy).filter(Boolean))].sort();
        const cur = reqSel.value;
        reqSel.innerHTML = '<option value="">All Requesters</option>' +
            requesters.map(r => `<option${r === cur ? ' selected' : ''}>${r}</option>`).join('');
    }

    // Projects (Standard)
    const projSel = document.getElementById('ana-filter-project');
    if (projSel) {
        const projects = [...new Set(tickets.map(t => t.project).filter(Boolean))].sort();
        const cur = projSel.value;
        projSel.innerHTML = '<option value="">All Projects</option>' +
            projects.map(p => `<option${p === cur ? ' selected' : ''}>${p}</option>`).join('');
    }

    // Recruiter Filter (Standard Analytics)
    const recSel = document.getElementById('ana-filter-recruiter');
    if (recSel) {
        if (isRecruiter) {
            recSel.innerHTML = `<option value="${user.name}">${user.name}</option>`;
            recSel.value = user.name;
            recSel.disabled = true;
        } else {
            recSel.disabled = false;
            const users = loadUsers();
            const regRecruiters = users.filter(u => u.role === 'Recruiter').map(u => u.name).filter(Boolean);
            const ticketRecruiters = tickets.map(t => t.assignedRecruiter).filter(r => r && r !== 'Unassigned');
            const recruiters = [...new Set([...regRecruiters, ...ticketRecruiters])].sort();
            const cur = recSel.value;
            recSel.innerHTML = '<option value="">All Recruiters</option>' +
                '<option value="Unassigned">Unassigned</option>' +
                recruiters.map(r => `<option${r === cur ? ' selected' : ''} value="${r}">${r}</option>`).join('');
        }
    }

    // Departments (Comparison)
    const compDeptSel = document.getElementById('compare-filter-dept');
    if (compDeptSel) {
        const depts = [...new Set(tickets.map(t => t.department).filter(Boolean))].sort();
        const cur = compDeptSel.value;
        compDeptSel.innerHTML = '<option value="">All Departments</option>' +
            depts.map(d => `<option${d === cur ? ' selected' : ''}>${d}</option>`).join('');
    }

    // Projects (Comparison)
    const compProjSel = document.getElementById('compare-filter-project');
    if (compProjSel) {
        const projects = [...new Set(tickets.map(t => t.project).filter(Boolean))].sort();
        const cur = compProjSel.value;
        compProjSel.innerHTML = '<option value="">All Projects</option>' +
            projects.map(p => `<option${p === cur ? ' selected' : ''}>${p}</option>`).join('');
    }

    // Recruiter Filter (Comparison Analytics)
    const compRecSel = document.getElementById('compare-filter-recruiter');
    if (compRecSel) {
        if (isRecruiter) {
            compRecSel.innerHTML = `<option value="${user.name}">${user.name}</option>`;
            compRecSel.value = user.name;
            compRecSel.disabled = true;
        } else {
            compRecSel.disabled = false;
            const users = loadUsers();
            const regRecruiters = users.filter(u => u.role === 'Recruiter').map(u => u.name).filter(Boolean);
            const ticketRecruiters = tickets.map(t => t.assignedRecruiter).filter(r => r && r !== 'Unassigned');
            const recruiters = [...new Set([...regRecruiters, ...ticketRecruiters])].sort();
            const cur = compRecSel.value;
            compRecSel.innerHTML = '<option value="">All Recruiters</option>' +
                '<option value="Unassigned">Unassigned</option>' +
                recruiters.map(r => `<option${r === cur ? ' selected' : ''} value="${r}">${r}</option>`).join('');
        }
    }

    // Dynamic Years Checklist (Comparison)
    const yearsWrap = document.getElementById('compare-years-list');
    if (yearsWrap) {
        // Keep track of what was checked before rebuilding list
        const checkedYears = new Set(Array.from(yearsWrap.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value));
        
        // Extract years dynamically from tickets' createdAt
        const years = [...new Set(tickets.map(t => {
            const d = t.createdAt ? new Date(t.createdAt) : null;
            return (d && !isNaN(d.getTime())) ? d.getFullYear() : null;
        }).filter(y => y !== null))].sort((a, b) => a - b); // ascending

        if (years.length === 0) {
            years.push(new Date().getFullYear());
        }

        // If no checked years yet (e.g., initial load), select the 2 most recent years
        if (checkedYears.size === 0) {
            const sortedDesc = [...years].sort((a, b) => b - a);
            if (sortedDesc[0]) checkedYears.add(sortedDesc[0].toString());
            if (sortedDesc[1]) checkedYears.add(sortedDesc[1].toString());
        }

        yearsWrap.innerHTML = years.map(y => `
            <label class="compare-checkbox-label">
                <input type="checkbox" value="${y}" onchange="refreshComparison()" ${checkedYears.has(y.toString()) ? 'checked' : ''}>
                ${y}
            </label>
        `).join('');
    }
}

function setPeriodTrend(period) {
    trendPeriod = period;
    
    document.querySelectorAll('.btn-period').forEach(btn => {
        const isTarget = btn.textContent.toLowerCase() === period;
        btn.classList.toggle('active', isTarget);
    });
    
    const label = document.getElementById('trend-period-lbl');
    if (label) label.textContent = period;
    
    refreshAnalytics();
}

function refreshAnalytics() {
    const tickets = loadTickets();
    const deptF = document.getElementById('ana-filter-dept')?.value || '';
    const reqF = document.getElementById('ana-filter-requester')?.value || '';
    const projF = document.getElementById('ana-filter-project')?.value || '';
    const recF = document.getElementById('ana-filter-recruiter')?.value || '';
    
    let filtered = tickets;
    if (deptF) filtered = filtered.filter(t => t.department === deptF);
    if (reqF) filtered = filtered.filter(t => t.requestedBy === reqF);
    if (projF) filtered = filtered.filter(t => t.project === projF);
    if (recF) {
        if (recF === 'Unassigned') {
            filtered = filtered.filter(t => !t.assignedRecruiter || t.assignedRecruiter === 'Unassigned');
        } else {
            filtered = filtered.filter(t => t.assignedRecruiter === recF);
        }
    }
    
    // KPIs
    const completedTickets = filtered.filter(t => t.status === 'Completed');
    let avgFulfillmentText = '—';
    if (completedTickets.length) {
        let totalDays = 0;
        completedTickets.forEach(t => {
            const created = new Date(t.createdAt);
            let closedDate = t.updatedAt ? new Date(t.updatedAt) : new Date();
            const closedHistory = t.history?.find(h => h.action.includes('Completed') || h.action.includes('Status → Completed'));
            if (closedHistory) closedDate = new Date(closedHistory.date);
            
            const diffTime = Math.abs(closedDate - created);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalDays += diffDays;
        });
        avgFulfillmentText = `${Math.round(totalDays / completedTickets.length)} days`;
    }
    document.getElementById('ana-kpi-fulfillment').textContent = avgFulfillmentText;
    
    const totalRequiredHC = filtered.reduce((s, t) => s + (t.requiredHC || 0), 0);
    const totalHiredHC = filtered.reduce((s, t) => s + (t.hiredCount || 0), 0);
    const rateText = totalRequiredHC > 0 ? `${Math.round((totalHiredHC / totalRequiredHC) * 100)}%` : '0%';
    document.getElementById('ana-kpi-rate').textContent = rateText;
    
    document.getElementById('ana-kpi-tickets').textContent = `${completedTickets.length} / ${filtered.length}`;
    
    const uniqueRequesters = [...new Set(filtered.map(t => t.requestedBy))].length;
    document.getElementById('ana-kpi-requesters').textContent = uniqueRequesters;
    
    // Recruitment Cost Metric KPI
    const totalSpend = filtered.reduce((s, t) => s + (t.recruitmentCost || 0), 0);
    const avgCost = totalHiredHC > 0 ? Math.round(totalSpend / totalHiredHC) : 0;
    document.getElementById('ana-kpi-cost').textContent = `₱${avgCost.toLocaleString('en-PH')}`;
    
    // New KPIs calculation
    // 1. Avg. Age of Open Requests (Days)
    const openTickets = filtered.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
    let avgOpenAgeText = '—';
    if (openTickets.length) {
        let totalDays = 0;
        let validCount = 0;
        const today = new Date();
        openTickets.forEach(t => {
            if (t.createdAt) {
                const created = new Date(t.createdAt);
                if (!isNaN(created.getTime())) {
                    const diffTime = Math.abs(today - created);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    totalDays += diffDays;
                    validCount++;
                }
            }
        });
        if (validCount > 0) {
            avgOpenAgeText = `${Math.round(totalDays / validCount)} days`;
        }
    }
    const openAgeKpi = document.getElementById('ana-kpi-open-age');
    if (openAgeKpi) openAgeKpi.textContent = avgOpenAgeText;

    // 2. Highest Hired Positions (Single request)
    let maxHires = 0;
    let maxHiresProject = '';
    filtered.forEach(t => {
        if ((t.hiredCount || 0) > maxHires) {
            maxHires = t.hiredCount;
            maxHiresProject = t.project || 'Unknown';
        }
    });
    const maxHiresText = maxHires > 0 ? `${maxHires} (${maxHiresProject})` : '0';
    const maxHiresKpi = document.getElementById('ana-kpi-max-hires');
    if (maxHiresKpi) maxHiresKpi.textContent = maxHiresText;

    // 3. Top Department by Hires
    const deptHires = {};
    filtered.forEach(t => {
        const dept = t.department || 'Other';
        deptHires[dept] = (deptHires[dept] || 0) + (t.hiredCount || 0);
    });
    let topDept = '—';
    let maxDeptHires = 0;
    Object.keys(deptHires).forEach(dept => {
        if (deptHires[dept] > maxDeptHires) {
            maxDeptHires = deptHires[dept];
            topDept = dept;
        }
    });
    const topDeptText = maxDeptHires > 0 ? `${topDept} (${maxDeptHires})` : '—';
    const topDeptKpi = document.getElementById('ana-kpi-top-dept');
    if (topDeptKpi) topDeptKpi.textContent = topDeptText;

    // Sourcing Channel ROI Table
    const channels = loadSourcingChannels();
    const roiData = channels.map(ch => {
        const chTickets = filtered.filter(t => t.sourcingChannel === ch);
        const hires = chTickets.reduce((s, t) => s + (t.hiredCount || 0), 0);
        const spend = chTickets.reduce((s, t) => s + (t.recruitmentCost || 0), 0);
        const cph = hires > 0 ? Math.round(spend / hires) : 0;
        return { channel: ch, hires, spend, cph };
    });
    
    // Sort channels by hires descending to highlight top performing channels
    roiData.sort((a, b) => b.hires - a.hires);
    
    const roiTableBody = document.getElementById('roi-table-body');
    if (roiTableBody) {
        roiTableBody.innerHTML = roiData.map(r => `
            <tr style="border-bottom: 1px solid var(--border)">
                <td style="padding: 10px 8px; font-weight: 600; color: var(--text-dim);">${r.channel}</td>
                <td style="padding: 10px 8px; text-align: center; color: var(--green); font-weight: 700;">${r.hires}</td>
                <td style="padding: 10px 8px; text-align: right;">₱${r.spend.toLocaleString('en-PH')}</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: var(--accent2);">₱${r.cph.toLocaleString('en-PH')}</td>
            </tr>
        `).join('');
    }
    
    // Draw Charts
    drawTrendChart(filtered);
    drawPipelineChart(filtered);
    drawDepartmentChart(filtered);
    drawRequestersChart(filtered);
    drawCostChart(filtered);
    populateRecruiterPerformanceTracker();
}

function populateRecruiterPerformanceTracker() {
    const section = document.getElementById('admin-recruiter-tracker-section');
    const tbody = document.getElementById('recruiter-tracker-table-body');
    if (!section || !tbody) return;

    const user = getActiveUser();
    if (!user || user.role !== 'HR Team / Admin') {
        section.style.display = 'none';
        return;
    }

    // Show section
    section.style.display = 'block';

    const allTickets = loadTickets();
    const allUsers = loadUsers();

    // Collect all recruiter names
    const recruitersSet = new Set(allUsers.filter(u => u.role === 'Recruiter').map(u => u.name).filter(Boolean));
    allTickets.forEach(t => {
        if (t.assignedRecruiter && t.assignedRecruiter !== 'Unassigned') {
            recruitersSet.add(t.assignedRecruiter);
        }
    });

    const recruiterList = Array.from(recruitersSet).sort();
    // Add "Unassigned" to list
    recruiterList.push('Unassigned');

    const today = new Date();

    tbody.innerHTML = recruiterList.map(recName => {
        const isUnassigned = recName === 'Unassigned';
        const recTickets = allTickets.filter(t => {
            if (isUnassigned) {
                return !t.assignedRecruiter || t.assignedRecruiter === 'Unassigned';
            } else {
                return t.assignedRecruiter === recName;
            }
        });

        const activeCases = recTickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
        const completedCases = recTickets.filter(t => t.status === 'Completed').length;

        // Fill rate
        const totalReq = recTickets.reduce((s, t) => s + (t.requiredHC || 0), 0);
        const totalHired = recTickets.reduce((s, t) => s + (t.hiredCount || 0), 0);
        const fillRate = totalReq > 0 ? Math.round((totalHired / totalReq) * 100) : 0;

        // Avg. Time to Hire
        const completedList = recTickets.filter(t => t.status === 'Completed');
        let avgTimeText = '—';
        if (completedList.length) {
            let totalDays = 0;
            completedList.forEach(t => {
                const created = new Date(t.createdAt);
                let closedDate = t.updatedAt ? new Date(t.updatedAt) : new Date();
                const closedHistory = t.history?.find(h => h.action.includes('Completed') || h.action.includes('Status → Completed'));
                if (closedHistory) closedDate = new Date(closedHistory.date);
                
                const diffTime = Math.abs(closedDate - created);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDays += diffDays;
            });
            avgTimeText = `${Math.round(totalDays / completedList.length)} days`;
        }

        // Oldest pending case
        const activeList = recTickets.filter(t => t.status === 'Open' || t.status === 'In Progress');
        let oldestText = '<span style="color:var(--text-muted)">—</span>';
        if (activeList.length) {
            let oldestTicket = null;
            let oldestTime = Infinity;

            activeList.forEach(t => {
                const createdTime = new Date(t.createdAt).getTime();
                if (createdTime < oldestTime) {
                    oldestTime = createdTime;
                    oldestTicket = t;
                }
            });

            if (oldestTicket) {
                const ageDays = Math.floor((today - new Date(oldestTicket.createdAt)) / (1000 * 60 * 60 * 24));
                oldestText = `<strong style="color:var(--accent); cursor:pointer;" onclick="showTicketDetail('${oldestTicket.ticketId}')">${oldestTicket.ticketId}</strong> <span style="color:var(--text-muted);font-size:0.8rem">(${ageDays}d old)</span>`;
            }
        }

        return `
            <tr style="border-bottom: 1px solid var(--border)">
                <td style="padding: 12px 10px; font-weight: 600; color: var(--text-dim);">${recName}</td>
                <td style="padding: 12px 10px; text-align: center;">${activeCases}</td>
                <td style="padding: 12px 10px; text-align: center; color: var(--green); font-weight: 700;">${completedCases}</td>
                <td style="padding: 12px 10px; text-align: center; font-weight: 600; color: var(--accent2);">${totalReq > 0 ? fillRate + '%' : '—'}</td>
                <td style="padding: 12px 10px; text-align: center;">${avgTimeText}</td>
                <td style="padding: 12px 10px;">${oldestText}</td>
            </tr>
        `;
    }).join('');
}

function toggleAnalyticsView(view) {
    const standardContainer = document.getElementById('ana-standard-container');
    const compareContainer = document.getElementById('ana-compare-container');
    const btnStandard = document.getElementById('btn-ana-standard');
    const btnCompare = document.getElementById('btn-ana-compare');
    
    if (view === 'standard') {
        if (standardContainer) standardContainer.style.display = 'block';
        if (compareContainer) compareContainer.style.display = 'none';
        if (btnStandard) btnStandard.classList.add('active');
        if (btnCompare) btnCompare.classList.remove('active');
        refreshAnalytics();
    } else if (view === 'compare') {
        if (standardContainer) standardContainer.style.display = 'none';
        if (compareContainer) compareContainer.style.display = 'block';
        if (btnStandard) btnStandard.classList.remove('active');
        if (btnCompare) btnCompare.classList.add('active');
        refreshComparison();
    }
}

function refreshComparison() {
    const tickets = loadTickets();
    
    // 1. Get Comparison Filter Values
    const yearsWrap = document.getElementById('compare-years-list');
    const selectedYears = Array.from(yearsWrap?.querySelectorAll('input[type="checkbox"]:checked') || []).map(cb => parseInt(cb.value)).sort((a, b) => a - b);
    
    const selectedMonth = document.getElementById('compare-filter-month')?.value || 'all';
    const deptF = document.getElementById('compare-filter-dept')?.value || '';
    const projF = document.getElementById('compare-filter-project')?.value || '';
    const recF = document.getElementById('compare-filter-recruiter')?.value || '';
    
    // 2. Filter tickets by Department, Project, and Recruiter
    let filtered = tickets;
    if (deptF) filtered = filtered.filter(t => t.department === deptF);
    if (projF) filtered = filtered.filter(t => t.project === projF);
    if (recF) {
        if (recF === 'Unassigned') {
            filtered = filtered.filter(t => !t.assignedRecruiter || t.assignedRecruiter === 'Unassigned');
        } else {
            filtered = filtered.filter(t => t.assignedRecruiter === recF);
        }
    }
    
    // 3. Populate Scorecards Grid
    const scorecardGrid = document.getElementById('compare-grid-scorecards');
    if (scorecardGrid) {
        if (selectedYears.length === 0) {
            scorecardGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">📅</div>
                    <h3>No Years Selected</h3>
                    <p>Please select at least one year to compare.</p>
                </div>
            `;
        } else {
            scorecardGrid.innerHTML = selectedYears.map(year => {
                // Filter tickets to current year
                let yearTickets = filtered.filter(t => {
                    const d = t.createdAt ? new Date(t.createdAt) : null;
                    return d && !isNaN(d.getTime()) && d.getFullYear() === year;
                });
                
                // If specific month is selected, filter by that month too
                if (selectedMonth !== 'all') {
                    const mInt = parseInt(selectedMonth);
                    yearTickets = yearTickets.filter(t => {
                        const d = t.createdAt ? new Date(t.createdAt) : null;
                        return d && !isNaN(d.getTime()) && d.getMonth() === mInt;
                    });
                }
                
                // Calculate metrics
                const requiredHC = yearTickets.reduce((s, t) => s + (t.requiredHC || 0), 0);
                const hiredHC = yearTickets.reduce((s, t) => s + (t.hiredCount || 0), 0);
                const fillRate = requiredHC > 0 ? Math.round((hiredHC / requiredHC) * 100) : 0;
                
                const completed = yearTickets.filter(t => t.status === 'Completed');
                let avgDays = 0;
                if (completed.length) {
                    let totalDays = 0;
                    completed.forEach(t => {
                        const created = new Date(t.createdAt);
                        let closedDate = t.updatedAt ? new Date(t.updatedAt) : new Date();
                        const closedHistory = t.history?.find(h => h.action.includes('Completed') || h.action.includes('Status → Completed'));
                        if (closedHistory) closedDate = new Date(closedHistory.date);
                        
                        const diffTime = Math.abs(closedDate - created);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        totalDays += diffDays;
                    });
                    avgDays = Math.round(totalDays / completed.length);
                }
                
                const avgDaysText = avgDays > 0 ? `${avgDays} days` : '—';
                
                return `
                    <div class="compare-year-card glass-card">
                        <div class="compare-year-title">${year}</div>
                        <div class="compare-metric-row">
                            <span class="compare-metric-lbl">Total Hired:</span>
                            <span class="compare-metric-val" style="color: var(--green); font-weight:800;">${hiredHC}</span>
                        </div>
                        <div class="compare-metric-row">
                            <span class="compare-metric-lbl">Total Required:</span>
                            <span class="compare-metric-val">${requiredHC}</span>
                        </div>
                        <div class="compare-metric-row">
                            <span class="compare-metric-lbl">Fill Rate:</span>
                            <span class="compare-metric-val" style="color: var(--accent2);">${fillRate}%</span>
                        </div>
                        <div class="compare-metric-row">
                            <span class="compare-metric-lbl">Avg. Time to Hire:</span>
                            <span class="compare-metric-val">${avgDaysText}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    // 4. Draw Comparison Chart
    const canvas = document.getElementById('chart-comparison');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (window.chartComparison) {
        window.chartComparison.destroy();
        window.chartComparison = null;
    }
    
    if (selectedYears.length === 0) {
        return;
    }
    
    const themeColors = getChartThemeColors();
    const comparisonColors = [
        { border: 'rgba(108, 99, 255, 1)', bg: 'rgba(108, 99, 255, 0.1)' },   // Indigo
        { border: 'rgba(236, 72, 153, 1)', bg: 'rgba(236, 72, 153, 0.1)' },   // Pink
        { border: 'rgba(59, 130, 246, 1)', bg: 'rgba(59, 130, 246, 0.1)' },   // Blue
        { border: 'rgba(16, 185, 129, 1)', bg: 'rgba(16, 185, 129, 0.1)' },   // Green
        { border: 'rgba(245, 158, 11, 1)', bg: 'rgba(245, 158, 11, 0.1)' },   // Orange/Amber
        { border: 'rgba(237, 25, 36, 1)',  bg: 'rgba(237, 25, 36, 0.1)' }     // Red
    ];
    
    let datasets = [];
    let labels = [];
    let chartType = 'line';
    
    if (selectedMonth === 'all') {
        // Full year comparison (Line Chart)
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        chartType = 'line';
        
        selectedYears.forEach((year, idx) => {
            const monthlyHires = Array(12).fill(0);
            filtered.forEach(t => {
                const d = t.createdAt ? new Date(t.createdAt) : null;
                if (d && !isNaN(d.getTime()) && d.getFullYear() === year) {
                    const m = d.getMonth();
                    monthlyHires[m] += (t.hiredCount || 0);
                }
            });
            
            const colorInfo = comparisonColors[idx % comparisonColors.length];
            datasets.push({
                label: `${year} Hires`,
                data: monthlyHires,
                borderColor: colorInfo.border,
                backgroundColor: colorInfo.bg,
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: colorInfo.border,
                pointHoverRadius: 7,
                pointRadius: 4
            });
        });
    } else {
        // Specific month comparison (Bar Chart: Requested vs Hired for each year)
        labels = selectedYears.map(y => y.toString());
        chartType = 'bar';
        const mInt = parseInt(selectedMonth);
        
        const requestedData = [];
        const hiredData = [];
        
        selectedYears.forEach(year => {
            let req = 0;
            let hir = 0;
            filtered.forEach(t => {
                const d = t.createdAt ? new Date(t.createdAt) : null;
                if (d && !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === mInt) {
                    req += (t.requiredHC || 0);
                    hir += (t.hiredCount || 0);
                }
            });
            requestedData.push(req);
            hiredData.push(hir);
        });
        
        datasets = [
            {
                label: 'Requested Headcount',
                data: requestedData,
                backgroundColor: 'rgba(237, 25, 36, 0.45)', // Red
                borderColor: 'var(--accent)',
                borderWidth: 2,
                borderRadius: 4
            },
            {
                label: 'Hired Headcount',
                data: hiredData,
                backgroundColor: 'rgba(16, 185, 129, 0.45)', // Green
                borderColor: 'var(--green)',
                borderWidth: 2,
                borderRadius: 4
            }
        ];
    }
    
    window.chartComparison = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    labels: { color: themeColors.labelColor, font: { family: 'Inter', size: 11, weight: '600' } }
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.tooltipTitle,
                    bodyColor: themeColors.tooltipBody,
                    borderColor: themeColors.tooltipBorder,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.labelColor, font: { family: 'Inter', size: 11 } }
                },
                y: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.labelColor, stepSize: 1, font: { family: 'Inter', size: 11 } }
                }
            }
        }
    });
}

function getTrendData(tickets, period) {
    const dates = {};
    const today = new Date();
    
    if (period === 'daily') {
        for (let i = 9; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dates[dateStr] = { label: d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' }), requested: 0, hired: 0 };
        }
    } else if (period === 'weekly') {
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - (i * 7));
            const weekNum = getWeekNumber(d);
            const weekKey = `${d.getFullYear()}-W${weekNum}`;
            dates[weekKey] = { label: `Wk ${weekNum} (${d.toLocaleDateString('en-IN', { month:'short' })})`, requested: 0, hired: 0 };
        }
    } else if (period === 'monthly') {
        let minDate = new Date();
        minDate.setMonth(today.getMonth() - 5); // Default to 6 months ago (including current month)
        
        if (tickets && tickets.length > 0) {
            tickets.forEach(t => {
                if (t.createdAt) {
                    const ticketDate = new Date(t.createdAt);
                    if (!isNaN(ticketDate.getTime()) && ticketDate < minDate) {
                        minDate = ticketDate;
                    }
                }
            });
        }
        
        // Cap to maximum 24 months to avoid chart clutter
        const maxLimitDate = new Date();
        maxLimitDate.setMonth(today.getMonth() - 23);
        if (minDate < maxLimitDate) {
            minDate = maxLimitDate;
        }
        
        let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 1);
        
        while (current <= end) {
            const monthKey = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}`;
            dates[monthKey] = { label: current.toLocaleDateString('en-IN', { month:'short', year:'2-digit' }), requested: 0, hired: 0 };
            current.setMonth(current.getMonth() + 1);
        }
    }
    
    tickets.forEach(t => {
        const createDate = new Date(t.createdAt);
        let key = '';
        
        if (period === 'daily') {
            key = createDate.toISOString().split('T')[0];
        } else if (period === 'weekly') {
            const weekNum = getWeekNumber(createDate);
            key = `${createDate.getFullYear()}-W${weekNum}`;
        } else if (period === 'monthly') {
            key = `${createDate.getFullYear()}-${String(createDate.getMonth()+1).padStart(2,'0')}`;
        }
        
        if (dates[key]) {
            dates[key].requested += (t.requiredHC || 0);
            dates[key].hired += (t.hiredCount || 0);
        }
    });
    
    const labels = [];
    const requestedData = [];
    const hiredData = [];
    
    Object.keys(dates).sort().forEach(k => {
        labels.push(dates[k].label);
        requestedData.push(dates[k].requested);
        hiredData.push(dates[k].hired);
    });
    
    return { labels, requestedData, hiredData };
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

function drawTrendChart(tickets) {
    if (window.chartTrend) window.chartTrend.destroy();
    
    const data = getTrendData(tickets, trendPeriod);
    const ctx = document.getElementById('chart-trend')?.getContext('2d');
    if (!ctx) return;
    
    const themeColors = getChartThemeColors();
    window.chartTrend = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Requested Headcount',
                    data: data.requestedData,
                    backgroundColor: 'rgba(237, 25, 36, 0.45)', // Intelegencia Red
                    borderColor: 'var(--accent)',
                    borderWidth: 2,
                    borderRadius: 4
                },
                {
                    label: 'Hired Headcount',
                    data: data.hiredData,
                    backgroundColor: 'rgba(16, 185, 129, 0.45)', // Green
                    borderColor: 'var(--green)',
                    borderWidth: 2,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    labels: { color: themeColors.labelColor, font: { family: 'Inter', size: 11 } }
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.tooltipTitle,
                    bodyColor: themeColors.tooltipBody,
                    borderColor: themeColors.tooltipBorder,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.labelColor }
                },
                y: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.labelColor, stepSize: 1 }
                }
            }
        }
    });
}

function drawPipelineChart(tickets) {
    if (window.chartPipeline) window.chartPipeline.destroy();
    
    const ctx = document.getElementById('chart-pipeline')?.getContext('2d');
    if (!ctx) return;
    
    const stages = {
        'Sourcing': 0,
        'Screening': 0,
        'Interview Scheduled': 0,
        'Interview Done': 0,
        'Offer Rolled Out': 0,
        'Offer Accepted': 0,
        'Joined': 0,
        'Dropped': 0
    };
    
    tickets.forEach(t => {
        const s = t.stage || 'Sourcing';
        if (stages[s] !== undefined) stages[s]++;
        else stages['Sourcing']++;
    });
    
    const labels = Object.keys(stages).filter(k => stages[k] > 0);
    const data = labels.map(k => stages[k]);
    
    if (!data.length) {
        labels.push('No Active Data');
        data.push(1);
    }
    
    const colors = {
        'Sourcing': 'rgba(237, 25, 36, 0.7)', // Intelegencia Red
        'Screening': 'rgba(243, 112, 33, 0.7)', // Intelegencia Orange
        'Interview Scheduled': 'rgba(6, 182, 212, 0.7)',
        'Interview Done': 'rgba(139, 92, 246, 0.7)',
        'Offer Rolled Out': 'rgba(245, 158, 11, 0.7)',
        'Offer Accepted': 'rgba(16, 185, 129, 0.7)', // Green
        'Joined': 'rgba(5, 150, 105, 0.7)',
        'Dropped': 'rgba(239, 68, 68, 0.7)',
        'No Active Data': 'rgba(255,255,255,0.05)'
    };
    
    const themeColors = getChartThemeColors();
    window.chartPipeline = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map(l => colors[l]),
                borderColor: themeColors.borderBaseColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: themeColors.labelColor, font: { family: 'Inter', size: 10 } }
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.tooltipTitle,
                    bodyColor: themeColors.tooltipBody,
                    borderColor: themeColors.tooltipBorder,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    boxPadding: 4
                }
            },
            cutout: '65%'
        }
    });
}

function drawDepartmentChart(tickets) {
    if (window.chartDepartment) window.chartDepartment.destroy();
    
    const ctx = document.getElementById('chart-department')?.getContext('2d');
    if (!ctx) return;
    
    const depts = {};
    tickets.forEach(t => {
        const d = t.department;
        if (!depts[d]) depts[d] = { requested: 0, hired: 0 };
        depts[d].requested += (t.requiredHC || 0);
        depts[d].hired += (t.hiredCount || 0);
    });
    
    const labels = Object.keys(depts).sort();
    const requestedData = labels.map(l => depts[l].requested);
    const hiredData = labels.map(l => depts[l].hired);
    
    const themeColors = getChartThemeColors();
    window.chartDepartment = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Required HC',
                    data: requestedData,
                    backgroundColor: 'rgba(237, 25, 36, 0.55)', // Intelegencia Red
                    borderColor: 'var(--accent)',
                    borderWidth: 1
                },
                {
                    label: 'Hired HC',
                    data: hiredData,
                    backgroundColor: 'rgba(16, 185, 129, 0.55)', // Green
                    borderColor: 'var(--green)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    labels: { color: themeColors.labelColor, font: { family: 'Inter', size: 11 } }
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.tooltipTitle,
                    bodyColor: themeColors.tooltipBody,
                    borderColor: themeColors.tooltipBorder,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.labelColor, stepSize: 1 }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: themeColors.labelColor }
                }
            }
        }
    });
}

function drawRequestersChart(tickets) {
    if (window.chartRequesters) window.chartRequesters.destroy();
    
    const ctx = document.getElementById('chart-requesters')?.getContext('2d');
    if (!ctx) return;
    
    const reqs = {};
    tickets.forEach(t => {
        const r = t.requestedBy;
        if (!reqs[r]) reqs[r] = { requested: 0, hired: 0 };
        reqs[r].requested += (t.requiredHC || 0);
        reqs[r].hired += (t.hiredCount || 0);
    });
    
    const topRequesters = Object.keys(reqs)
        .sort((a, b) => reqs[b].requested - reqs[a].requested)
        .slice(0, 5);
        
    const requestedData = topRequesters.map(r => reqs[r].requested);
    const hiredData = topRequesters.map(r => reqs[r].hired);
    
    const themeColors = getChartThemeColors();
    window.chartRequesters = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topRequesters,
            datasets: [
                {
                    label: 'Requested HC',
                    data: requestedData,
                    backgroundColor: 'rgba(237, 25, 36, 0.45)', // Intelegencia Red
                    borderColor: 'var(--accent)',
                    borderWidth: 1
                },
                {
                    label: 'Hired HC',
                    data: hiredData,
                    backgroundColor: 'rgba(243, 112, 33, 0.45)', // Intelegencia Orange
                    borderColor: 'var(--accent2)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    labels: { color: themeColors.labelColor, font: { family: 'Inter', size: 10 } }
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.tooltipTitle,
                    bodyColor: themeColors.tooltipBody,
                    borderColor: themeColors.tooltipBorder,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: themeColors.labelColor }
                },
                y: {
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.labelColor, stepSize: 1 }
                }
            }
        }
    });
}

function drawCostChart(tickets) {
    if (window.chartCost) window.chartCost.destroy();
    
    const ctx = document.getElementById('chart-cost')?.getContext('2d');
    if (!ctx) return;
    
    const depts = {};
    tickets.forEach(t => {
        const d = t.department;
        if (!depts[d]) depts[d] = { spend: 0, hired: 0 };
        depts[d].spend += (t.recruitmentCost || 0);
        depts[d].hired += (t.hiredCount || 0);
    });
    
    const labels = Object.keys(depts).sort();
    const costData = labels.map(l => depts[l].hired > 0 ? Math.round(depts[l].spend / depts[l].hired) : 0);
    
    const themeColors = getChartThemeColors();
    window.chartCost = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cost per Hire (PHP)',
                data: costData,
                backgroundColor: 'rgba(243, 112, 33, 0.55)', // Brand Orange
                borderColor: 'var(--accent2)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    labels: { color: themeColors.labelColor, font: { family: 'Inter', size: 11 } }
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.tooltipTitle,
                    bodyColor: themeColors.tooltipBody,
                    borderColor: themeColors.tooltipBorder,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    grid: { color: themeColors.gridColor },
                    ticks: {
                        color: themeColors.labelColor,
                        callback: function(value) { return '₱' + value.toLocaleString('en-PH'); }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: themeColors.labelColor }
                }
            }
        }
    });
}

function downloadPPTReport() {
    if (typeof PptxGenJS === 'undefined') {
        showToast('Library Error', 'PowerPoint presentation library not loaded.');
        return;
    }
    
    // ───── Filter & Live DB Fetch ─────
    const tickets = loadTickets();
    const deptF = document.getElementById('ana-filter-dept')?.value || '';
    const reqF = document.getElementById('ana-filter-requester')?.value || '';
    
    let filtered = tickets;
    if (deptF) filtered = filtered.filter(t => t.department === deptF);
    if (reqF) filtered = filtered.filter(t => t.requestedBy === reqF);
    
    if (!filtered.length) {
        showToast('No Data', 'There is no data matching filters to write to slides.');
        return;
    }
    
    // ───── Math and Metrics compilation ─────
    const totalTickets = filtered.length;
    const activePipeline = filtered.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
    const requiredHC = filtered.reduce((s, t) => s + (t.requiredHC || 0), 0);
    const hiredHC = filtered.reduce((s, t) => s + (t.hiredCount || 0), 0);
    const fulfillmentRate = requiredHC > 0 ? Math.round((hiredHC / requiredHC) * 100) : 0;
    
    const completedTickets = filtered.filter(t => t.status === 'Completed');
    let fulfillmentVelocity = 0;
    if (completedTickets.length) {
        let totalDays = 0;
        completedTickets.forEach(t => {
            const created = new Date(t.createdAt);
            let closedDate = t.updatedAt ? new Date(t.updatedAt) : new Date();
            const closedHistory = t.history?.find(h => h.action.includes('Completed') || h.action.includes('Status → Completed'));
            if (closedHistory) closedDate = new Date(closedHistory.date);
            const diffTime = Math.abs(closedDate - created);
            totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        });
        fulfillmentVelocity = Math.round(totalDays / completedTickets.length);
    }
    
    const totalSpend = filtered.reduce((s, t) => s + (t.recruitmentCost || 0), 0);
    const avgCost = hiredHC > 0 ? Math.round(totalSpend / hiredHC) : 0;
    
    // ───── Initialize Presentation ─────
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    
    // Common styles
    const navyBg = '06080F';
    const textMuted = '94A3B8';
    
    // ───── Slide 1: Cover Slide ─────
    const slide1 = pptx.addSlide();
    slide1.background = { color: navyBg };
    
    // Vertical left side brand stripes
    slide1.addShape(pptx.ShapeType.rect, { x: 0.0, y: 0.0, w: 0.20, h: 7.5, fill: { color: 'F37021' } });
    slide1.addShape(pptx.ShapeType.rect, { x: 0.20, y: 0.0, w: 0.10, h: 7.5, fill: { color: 'ED1924' } });
    
    // Brand header logo
    slide1.addText(
        [
            { text: 'intele', options: { color: 'FFFFFF', bold: true } },
            { text: 'gencia', options: { color: 'F37021', bold: true } }
        ],
        { x: 0.8, y: 0.5, w: 3.0, h: 0.5, fontSize: 20, fontFace: 'Arial' }
    );
    
    // Titles
    slide1.addText('RECRUITMENT PERFORMANCE & COST REPORT', {
        x: 1.0, y: 2.2, w: 11.0, h: 1.4,
        fontSize: 34, bold: true, color: 'FFFFFF',
        fontFace: 'Arial'
    });
    
    slide1.addText('Executive Talent Acquisition Analytics & Sourcing ROI', {
        x: 1.0, y: 3.6, w: 11.0, h: 0.5,
        fontSize: 16, color: 'F37021',
        fontFace: 'Arial'
    });
    
    // Horizontal separator
    slide1.addShape(pptx.ShapeType.rect, { x: 1.0, y: 4.3, w: 6.0, h: 0.04, fill: { color: 'ED1924' } });
    
    // Metadata
    const filterInfo = `Scope: ${deptF || 'All Departments'} | ${reqF || 'All Requesters'}\nGenerated: ${new Date().toLocaleDateString('en-PH')}\nDatabase Source: RMG Hire Live DB`;
    slide1.addText(filterInfo, {
        x: 1.0, y: 4.8, w: 10.0, h: 1.2,
        fontSize: 11, color: textMuted,
        fontFace: 'Arial', lineSpacing: 18
    });
    
    // ───── Slide 2: Scorecard Slide ─────
    const slide2 = pptx.addSlide();
    slide2.background = { color: navyBg };
    
    // Top border line
    slide2.addShape(pptx.ShapeType.rect, { x: 0.0, y: 0.0, w: 13.33, h: 0.06, fill: { color: 'F37021' } });
    
    // Brand header
    slide2.addText(
        [
            { text: 'intele', options: { color: 'FFFFFF', bold: true } },
            { text: 'gencia', options: { color: 'F37021', bold: true } }
        ],
        { x: 11.0, y: 0.4, w: 1.8, h: 0.4, fontSize: 16, fontFace: 'Arial', align: 'right' }
    );
    
    slide2.addText('EXECUTIVE RECRUITMENT SCORECARD', {
        x: 0.6, y: 0.4, w: 8.0, h: 0.4,
        fontSize: 22, bold: true, color: 'FFFFFF',
        fontFace: 'Arial'
    });
    
    slide2.addText('High-level fulfillment status and recruitment spend breakdown', {
        x: 0.6, y: 0.8, w: 8.0, h: 0.3,
        fontSize: 11, color: textMuted,
        fontFace: 'Arial'
    });
    
    // KPI Cards
    const cards = [
        { title: 'TOTAL TICKET REQUESTS', val: totalTickets.toString(), desc: 'Hiring requests registered in database.' },
        { title: 'ACTIVE PIPELINE', val: activePipeline.toString(), desc: 'Tickets currently Open or In Progress.' },
        { title: 'HEADCOUNT STATUS', val: `${hiredHC} / ${requiredHC}`, desc: `Fulfillment rate: ${fulfillmentRate}% of goal.` },
        { title: 'FULFILLMENT VELOCITY', val: fulfillmentVelocity > 0 ? `${fulfillmentVelocity} Days` : '—', desc: 'Avg. elapsed days for Completed tickets.' },
        { title: 'TOTAL RECRUITMENT SPEND', val: `₱${totalSpend.toLocaleString('en-PH')}`, desc: 'Total direct spend on candidate sourcing.' },
        { title: 'AVERAGE COST PER HIRE', val: `₱${avgCost.toLocaleString('en-PH')}`, desc: 'Average cost allocated per hired candidate.' }
    ];
    
    cards.forEach((c, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const cardX = 0.6 + col * 4.2;
        const cardY = 1.45 + row * 2.65;
        const cardW = 3.9;
        const cardH = 2.25;
        
        slide2.addShape(pptx.ShapeType.rect, {
            x: cardX, y: cardY, w: cardW, h: cardH,
            fill: { color: '111827' },
            line: { color: '2A3547', width: 1 }
        });
        
        slide2.addText(c.title, {
            x: cardX + 0.2, y: cardY + 0.2, w: cardW - 0.4, h: 0.3,
            fontSize: 9.5, bold: true, color: textMuted,
            fontFace: 'Arial'
        });
        
        slide2.addText(c.val, {
            x: cardX + 0.2, y: cardY + 0.5, w: cardW - 0.4, h: 0.8,
            fontSize: 28, bold: true, color: 'ED1924',
            fontFace: 'Arial'
        });
        
        slide2.addText(c.desc, {
            x: cardX + 0.2, y: cardY + 1.45, w: cardW - 0.4, h: 0.6,
            fontSize: 9, color: 'E2E8F0',
            fontFace: 'Arial'
        });
    });
    
    // ───── Slide 3: Sourcing ROI Slide ─────
    const slide3 = pptx.addSlide();
    slide3.background = { color: navyBg };
    slide3.addShape(pptx.ShapeType.rect, { x: 0.0, y: 0.0, w: 13.33, h: 0.06, fill: { color: 'F37021' } });
    
    slide3.addText(
        [
            { text: 'intele', options: { color: 'FFFFFF', bold: true } },
            { text: 'gencia', options: { color: 'F37021', bold: true } }
        ],
        { x: 11.0, y: 0.4, w: 1.8, h: 0.4, fontSize: 16, fontFace: 'Arial', align: 'right' }
    );
    
    slide3.addText('SOURCING CHANNEL ROI & SHARE', {
        x: 0.6, y: 0.4, w: 8.0, h: 0.4,
        fontSize: 22, bold: true, color: 'FFFFFF',
        fontFace: 'Arial'
    });
    
    slide3.addText('Hires volume, spend distribution, and cost per hire by sourcing channel', {
        x: 0.6, y: 0.8, w: 8.0, h: 0.3,
        fontSize: 11, color: textMuted,
        fontFace: 'Arial'
    });
    
    // Sourcing Channels List & Table compilation
    const rawChannels = loadSourcingChannels();
    const roiData = rawChannels.map(ch => {
        const chTickets = filtered.filter(t => t.sourcingChannel === ch);
        const hires = chTickets.reduce((s, t) => s + (t.hiredCount || 0), 0);
        const spend = chTickets.reduce((s, t) => s + (t.recruitmentCost || 0), 0);
        const cph = hires > 0 ? Math.round(spend / hires) : 0;
        return { channel: ch, hires, spend, cph };
    });
    
    roiData.sort((a, b) => b.hires - a.hires);
    
    const tableHeaderStyle = {
        fill: 'ED1924',
        color: 'FFFFFF',
        fontFace: 'Arial',
        fontSize: 9.5,
        bold: true,
        align: 'center',
        valign: 'middle'
    };
    
    const tableCellStyle = {
        color: 'FFFFFF',
        fontFace: 'Arial',
        fontSize: 9,
        valign: 'middle'
    };
    
    let tableRows = [
        [
            { text: 'Channel', options: tableHeaderStyle },
            { text: 'Hires', options: tableHeaderStyle },
            { text: 'Total Spend', options: tableHeaderStyle },
            { text: 'Cost Per Hire', options: tableHeaderStyle }
        ]
    ];
    
    roiData.forEach(r => {
        tableRows.push([
            { text: r.channel, options: { ...tableCellStyle, align: 'left' } },
            { text: r.hires.toString(), options: { ...tableCellStyle, align: 'center', bold: true } },
            { text: `₱${r.spend.toLocaleString('en-PH')}`, options: { ...tableCellStyle, align: 'right' } },
            { text: `₱${r.cph.toLocaleString('en-PH')}`, options: { ...tableCellStyle, align: 'right', bold: true, color: 'F37021' } }
        ]);
    });
    
    slide3.addTable(tableRows, {
        x: 0.6, y: 1.5, w: 7.2,
        colWidths: [2.0, 1.2, 2.0, 2.0],
        border: { pt: '1', color: '374151' }
    });
    
    // Doughnut chart of hires share
    const activeRoi = roiData.filter(r => r.hires > 0);
    const finalLabels = activeRoi.length ? activeRoi.map(r => r.channel) : ['No Hires'];
    const finalHires = activeRoi.length ? activeRoi.map(r => r.hires) : [1];
    
    const chartType = pptx.ChartType ? pptx.ChartType.doughnut : 'doughnut';
    slide3.addChart(chartType, [{ name: 'Hires Share', labels: finalLabels, values: finalHires }], {
        x: 8.1, y: 1.5, w: 4.6, h: 3.7,
        showLegend: true,
        legendPos: 'b',
        legendColor: 'FFFFFF',
        holeSize: 60,
        chartColors: ['ED1924', 'F37021', '3B82F6', '10B981', '8B5CF6', 'F59E0B', '6B7280']
    });
    
    // Bottom right insights box
    const topChannel = roiData[0]?.hires > 0 ? roiData[0].channel : 'N/A';
    const referralRoi = roiData.find(r => r.channel === 'Employee Referral');
    const referralCost = referralRoi ? referralRoi.cph : 0;
    const referTxt = referralCost > 0 ? `₱${referralCost.toLocaleString('en-PH')}` : '₱0';
    
    const insightBoxY = 5.35;
    slide3.addShape(pptx.ShapeType.rect, {
        x: 8.1, y: insightBoxY, w: 4.6, h: 1.4,
        fill: { color: '111827' },
        line: { color: '2A3547', width: 1 }
    });
    
    slide3.addText('💡 Operational Insights', {
        x: 8.3, y: insightBoxY + 0.15, w: 4.2, h: 0.3,
        fontSize: 11, bold: true, color: 'ED1924', fontFace: 'Arial'
    });
    
    slide3.addText(`Volume lead: ${topChannel} represents the highest headcount volume. Referral efficiency: Employee Referrals yield candidates at ${referTxt} CPH, the highest cost efficiency. Action: Allocate more sourcing efforts here.`, {
        x: 8.3, y: insightBoxY + 0.45, w: 4.2, h: 0.8,
        fontSize: 9.5, color: 'E2E8F0', fontFace: 'Arial', lineSpacing: 14
    });
    
    // ───── Slide 4: Department Analysis & Strategy Slide ─────
    const slide4 = pptx.addSlide();
    slide4.background = { color: navyBg };
    slide4.addShape(pptx.ShapeType.rect, { x: 0.0, y: 0.0, w: 13.33, h: 0.06, fill: { color: 'F37021' } });
    
    slide4.addText(
        [
            { text: 'intele', options: { color: 'FFFFFF', bold: true } },
            { text: 'gencia', options: { color: 'F37021', bold: true } }
        ],
        { x: 11.0, y: 0.4, w: 1.8, h: 0.4, fontSize: 16, fontFace: 'Arial', align: 'right' }
    );
    
    slide4.addText('DEPARTMENT BREAKDOWN & ALIGNMENT', {
        x: 0.6, y: 0.4, w: 8.0, h: 0.4,
        fontSize: 22, bold: true, color: 'FFFFFF',
        fontFace: 'Arial'
    });
    
    slide4.addText('Fulfillment ratios and recruitment spend averages by department', {
        x: 0.6, y: 0.8, w: 8.0, h: 0.3,
        fontSize: 11, color: textMuted,
        fontFace: 'Arial'
    });
    
    // Department stats compilation
    const depts = {};
    filtered.forEach(t => {
        const d = t.department;
        if (!depts[d]) depts[d] = { req: 0, hired: 0, spend: 0 };
        depts[d].req += (t.requiredHC || 0);
        depts[d].hired += (t.hiredCount || 0);
        depts[d].spend += (t.recruitmentCost || 0);
    });
    
    let deptRows = [
        [
            { text: 'Department', options: tableHeaderStyle },
            { text: 'Required', options: tableHeaderStyle },
            { text: 'Hired', options: tableHeaderStyle },
            { text: 'Spend', options: tableHeaderStyle },
            { text: 'CPH', options: tableHeaderStyle }
        ]
    ];
    
    Object.keys(depts).sort().forEach(d => {
        const info = depts[d];
        const cph = info.hired > 0 ? Math.round(info.spend / info.hired) : 0;
        deptRows.push([
            { text: d, options: { ...tableCellStyle, align: 'left' } },
            { text: info.req.toString(), options: { ...tableCellStyle, align: 'center' } },
            { text: info.hired.toString(), options: { ...tableCellStyle, align: 'center', bold: true } },
            { text: `₱${info.spend.toLocaleString('en-PH')}`, options: { ...tableCellStyle, align: 'right' } },
            { text: `₱${cph.toLocaleString('en-PH')}`, options: { ...tableCellStyle, align: 'right', bold: true, color: 'F37021' } }
        ]);
    });
    
    slide4.addTable(deptRows, {
        x: 0.6, y: 1.5, w: 6.8,
        colWidths: [2.0, 1.0, 1.0, 1.4, 1.4],
        border: { pt: '1', color: '374151' }
    });
    
    // Right panel: Strategic recommendations card
    const recX = 7.7;
    const recY = 1.5;
    const recW = 5.0;
    const recH = 5.25;
    
    slide4.addShape(pptx.ShapeType.rect, {
        x: recX, y: recY, w: recW, h: recH,
        fill: { color: '111827' },
        line: { color: '2A3547', width: 1 }
    });
    
    slide4.addText('🎯 STRATEGIC STRATEGY & ACTIONS', {
        x: recX + 0.3, y: recY + 0.3, w: recW - 0.6, h: 0.4,
        fontSize: 13, bold: true, color: 'ED1924', fontFace: 'Arial'
    });
    
    const bulletOptions = {
        x: recX + 0.3, w: recW - 0.6, h: 1.3,
        fontSize: 10, color: 'E2E8F0', fontFace: 'Arial',
        lineSpacing: 15
    };
    
    slide4.addText(
        [
            { text: '1. Sourcing Optimization: ', options: { bold: true, color: 'F37021' } },
            { text: 'Allocate additional sourcing focus to JobStreet and LinkedIn to ensure Technology and Operations pipelines stay filled. Avoid high Agency dependance.' }
        ],
        { ...bulletOptions, y: recY + 0.9 }
    );
    
    slide4.addText(
        [
            { text: '2. Cost per Hire Reduction: ', options: { bold: true, color: 'F37021' } },
            { text: 'Average CPH is high in Technology. Introduce pre-assessment automation and expand Employee Referral programs to drop unit acquisition cost by up to 25%.' }
        ],
        { ...bulletOptions, y: recY + 2.3 }
    );
    
    slide4.addText(
        [
            { text: '3. Capacity Planning: ', options: { bold: true, color: 'F37021' } },
            { text: `Fulfillment is currently at ${fulfillmentRate}% of required headcounts. Standardize screening workflows in Q2 to expedite open ticket closures and boost joining velocities.` }
        ],
        { ...bulletOptions, y: recY + 3.7 }
    );
    
    // ───── Save File ─────
    const scopeStr = deptF ? `_${deptF.replace(/\s+/g, '')}` : '_AllDepts';
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Intelegencia_Recruitment_Report${scopeStr}_${dateStr}.pptx`;
    
    pptx.writeFile(fileName)
        .then(() => showToast('PPT Downloaded', `Successfully saved presentation as ${fileName}`))
        .catch(err => {
            console.error(err);
            showToast('Download Error', 'Could not generate PowerPoint file.');
        });
}

// ───── Event Listeners & Initialize ─────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeDetailModal(); closeSuccessModal(); }
});

document.getElementById('tracker-ticket-id')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); lookupTicket(); }
});

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadTheme();
    initParticles();
    setMinDate();
    updateClock();
    setInterval(updateClock, 30000);
    navigate('home');
    console.log('%c🚀 RMG Hire Portal Loaded', 'color:#ED1924;font-size:14px;font-weight:bold');
});

