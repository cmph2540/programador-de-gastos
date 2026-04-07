/* ==== MÓDULO DE UTILIDADES ==== */
const Utils = (() => {
    const fmtCOP = new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
    });
    
    const fmtPct2 = (n) => `${(isFinite(n) ? n : 0).toFixed(2)}%`;
    
    const formatNumber = (num) => {
        if (num === undefined || num === null || num === '') return '';
        const n = parseInt(num.toString().replace(/\./g, ''), 10);
        if (isNaN(n)) return '';
        return n.toLocaleString('es-CO');
    };
    
    const parseCurrency = (str) => {
        if (!str) return 0;
        return parseInt(str.toString().replace(/\./g, ''), 10) || 0;
    };
    
    const monthNames = [
        'Enero','Febrero','Marzo','Abril','Mayo','Junio',
        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ];
    
    const palette = [
        '#22c55e','#60a5fa','#f59e0b','#ef4444','#c792ea',
        '#64b5f6','#81c784','#ff8a65','#ffd54f','#90a4ae'
    ];
    
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    
    const hoyLocal = () => new Date();
    
    const fmtYYYYMMDD = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}/${m}/${day}`;
    };
    
    const fmtDateDMY = (d) => {
        const day = String(d.getDate()).padStart(2, '0');
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const y = d.getFullYear();
        return `${day}/${m}/${y}`;
    };
    
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };
    
    const throttle = (func, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };
    
    return {
        fmtCOP,
        fmtPct2,
        formatNumber,
        parseCurrency,
        monthNames,
        palette,
        escapeHTML,
        hoyLocal,
        fmtYYYYMMDD,
        fmtDateDMY,
        debounce,
        throttle
    };
})();

/* ==== DATOS POR DEFECTO ==== */
const defaultIngresoCats = ['Salario','Rentas','Bonos','Honorarios','Venta','Intereses','Herencias','Dividendos','Propinas','Subsidios','Reembolsos','Regalías','Consultorías','Freelance','Licencias'];
const defaultInvCats = ['Fondo de inversiones','Oro','Finca raíz','Acciones','Bonos corporativos','ETFs','Criptomonedas','CDT','Crowdfunding','Emprendimiento','Dividendos','Nu','Lulu bank'];
const defaultGastoTipos = ['Mercado','Arriendo','Servicios públicos','Transporte','Salud','Educación','Entretenimiento','Deudas','Seguros','Impuestos','Mascotas','Hogar','Ropa','Tecnología','Otros', '🐜 Gastos Hormiga'];

/* ==== CONSEJOS DE INVERSIÓN ==== */
const consejosInv = [
    'Diversifica: no pongas todo en un solo activo.',
    'Evita perseguir rendimientos pasados.',
    'Define tu perfil de riesgo antes de invertir.',
    'Rebalancea tu portafolio con disciplina.',
    'Revisa costos: comisiones e impuestos importan.',
    'No te endeudes para invertir.',
    'Construye primero un fondo de emergencias.',
    'Aporta de forma automática cada mes.',
    'Investiga el producto y su emisor.',
    'Piensa a largo plazo: evita el ruido diario.',
    'La paciencia es la mejor aliada del inversionista.',
    'Diversifica geográficamente también.',
    'Invierte en lo que entiendes.',
    'Ten un plan de salida para cada inversión.',
    'No dejes que las emociones guíen tus decisiones.'
];

/* ==== CONSTANTES DE ADMIN ==== */
const MAIN_ADMIN_EMAIL = 'cmph2540@gmail.com';
const MAIN_ADMIN_PASSWORD = '12345678';
const MAIN_ADMIN_SECURITY_PHRASE = 'Crislu2120';

/* ==== MANEJO DE ESTADO ==== */
let state = {
    createdAt: null,
    meses: [],
    ingresoCats: [...defaultIngresoCats],
    invCats: [...defaultInvCats],
    gastoTipos: [...defaultGastoTipos],
    inversiones: [],
    bankLastPct: 0,
    bankStyle: 'jar',
    bankGoalPct: 100,
    editingEnabled: false,
    doceMesesCreados: false,
    gastosHormiga: [],
    users: [],
    recoveryTokens: [],
    adminSecurityPhrases: {},
    sessionExpiry: null,
    userProfile: null,
    currentUser: null
};

let tempIngresos = [];
let tempGastos   = [];
let tempInversiones = [];
let adviceTimer = null;
let hormigaTooltipTimeout = null;
let sessionActivityTimer = null;

/* ==== FUNCIONES DE VALIDACIÓN SIMPLIFICADAS ==== */
function isValidPassword(password) {
    return password && password.length >= 4;
}

function needsSecurityPhrase(email) {
    if (email === MAIN_ADMIN_EMAIL) return true;
    const user = state.users.find(u => u.email === email);
    return user && user.role === 'admin' && state.adminSecurityPhrases[email];
}

/* ==== PERSISTENCIA ==== */
function saveState() { 
    const stateToSave = {
        ...state,
        recoveryTokens: []
    };
    localStorage.setItem('programadorGastos', JSON.stringify(stateToSave)); 
}

function loadState(){
    const raw = localStorage.getItem('programadorGastos');
    if(!raw) return;
    try{
        const loaded = JSON.parse(raw);
        state.createdAt   = loaded.createdAt ?? null;
        state.meses       = Array.isArray(loaded.meses) ? loaded.meses : [];
        state.ingresoCats = (Array.isArray(loaded.ingresoCats) && loaded.ingresoCats.length) ? loaded.ingresoCats : [...defaultIngresoCats];
        state.invCats     = (Array.isArray(loaded.invCats) && loaded.invCats.length) ? loaded.invCats : [...defaultInvCats];
        state.gastoTipos  = (Array.isArray(loaded.gastoTipos) && loaded.gastoTipos.length) ? loaded.gastoTipos : [...defaultGastoTipos];
        if (!state.gastoTipos.includes('🐜 Gastos Hormiga')) {
            state.gastoTipos.push('🐜 Gastos Hormiga');
        }
        state.inversiones = Array.isArray(loaded.inversiones) ? loaded.inversiones : [];
        state.bankLastPct = typeof loaded.bankLastPct === 'number' ? loaded.bankLastPct : 0;
        state.bankStyle   = loaded.bankStyle || 'jar';
        state.bankGoalPct = typeof loaded.bankGoalPct === 'number' ? loaded.bankGoalPct : 100;
        state.editingEnabled = !!loaded.editingEnabled;
        state.doceMesesCreados = !!loaded.doceMesesCreados;
        state.gastosHormiga = Array.isArray(loaded.gastosHormiga) ? loaded.gastosHormiga : [];
        state.users = Array.isArray(loaded.users) ? loaded.users : [];
        state.adminSecurityPhrases = loaded.adminSecurityPhrases || {};
        state.sessionExpiry = loaded.sessionExpiry || null;
        state.userProfile = loaded.userProfile || null;
        state.currentUser = loaded.currentUser || null;
        
        if (state.sessionExpiry && new Date(state.sessionExpiry) < new Date()) {
            state.currentUser = null;
            state.sessionExpiry = null;
            saveState();
        }
    }catch(e){ console.warn('Estado corrupto; usando defaults.', e); }
}
loadState();

/* ==== CREAR ADMINISTRADOR PRINCIPAL AUTOMÁTICAMENTE ==== */
function ensureMainAdminExists() {
    const mainAdminExists = state.users.some(u => u.email === MAIN_ADMIN_EMAIL);
    
    if (!mainAdminExists) {
        console.log('🔧 Creando administrador principal automáticamente...');
        
        state.users.push({
            id: 'main-admin-' + Date.now(),
            email: MAIN_ADMIN_EMAIL,
            name: 'Administrador',
            password: MAIN_ADMIN_PASSWORD,
            role: 'admin',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            method: 'manual'
        });
        
        state.adminSecurityPhrases[MAIN_ADMIN_EMAIL] = MAIN_ADMIN_SECURITY_PHRASE;
        saveState();
        
        console.log('✅ Administrador principal creado!');
        console.log(`   Email: ${MAIN_ADMIN_EMAIL}`);
        console.log(`   Contraseña: ${MAIN_ADMIN_PASSWORD}`);
        console.log(`   Frase: ${MAIN_ADMIN_SECURITY_PHRASE}`);
    } else {
        const mainAdmin = state.users.find(u => u.email === MAIN_ADMIN_EMAIL);
        if (mainAdmin && mainAdmin.password !== MAIN_ADMIN_PASSWORD) {
            mainAdmin.password = MAIN_ADMIN_PASSWORD;
            saveState();
            console.log('✅ Contraseña del administrador actualizada');
        }
        if (!state.adminSecurityPhrases[MAIN_ADMIN_EMAIL]) {
            state.adminSecurityPhrases[MAIN_ADMIN_EMAIL] = MAIN_ADMIN_SECURITY_PHRASE;
            saveState();
        }
    }
}

// EJECUTAR INMEDIATAMENTE
ensureMainAdminExists();

/* ==== FUNCIONES DE AUTENTICACIÓN ==== */
function checkAuth() {
    if (state.sessionExpiry && new Date(state.sessionExpiry) < new Date()) {
        state.currentUser = null;
        state.sessionExpiry = null;
        saveState();
        return false;
    }
    return state.currentUser !== null;
}

function isAdmin() {
    if (!checkAuth()) return false;
    return state.currentUser.role === 'admin';
}

function requireAuth() {
    if (!checkAuth()) {
        showLoginModal();
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!requireAuth()) return false;
    if (!isAdmin()) {
        softToast('Acceso denegado. Se requieren permisos de administrador.', 'danger');
        return false;
    }
    return true;
}

function resetSessionActivityTimer() {
    if (sessionActivityTimer) clearTimeout(sessionActivityTimer);
    if (checkAuth()) {
        const isAdminUser = isAdmin();
        const timeoutMinutes = isAdminUser ? 30 : 15 * 24 * 60;
        sessionActivityTimer = setTimeout(() => {
            if (checkAuth()) {
                logout();
                softToast('Sesión expirada por inactividad.', 'warn');
            }
        }, timeoutMinutes * 60 * 1000);
    }
}

function registerActivity() {
    resetSessionActivityTimer();
}

function login(userEmail, password = null, isGoogleLogin = false, securityPhrase = null) {
    let user = state.users.find(u => u.email === userEmail);
    
    if (userEmail === MAIN_ADMIN_EMAIL) {
        if (isGoogleLogin) {
            softToast('El administrador principal debe usar correo y contraseña', 'warn');
            return false;
        }
        if (!securityPhrase || securityPhrase !== MAIN_ADMIN_SECURITY_PHRASE) {
            softToast('Frase de seguridad incorrecta', 'danger');
            return false;
        }
    }
    
    if (!user && isGoogleLogin) {
        if (userEmail === MAIN_ADMIN_EMAIL) {
            softToast('El administrador principal no puede registrarse por Google', 'warn');
            return false;
        }
        user = {
            id: Date.now().toString(),
            email: userEmail,
            name: userEmail.split('@')[0],
            password: null,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            method: 'google'
        };
        state.users.push(user);
    } else if (user && !isGoogleLogin) {
        if (!user.password || user.password !== password) {
            softToast('Correo o contraseña incorrectos', 'danger');
            return false;
        }
        user.lastLogin = new Date().toISOString();
        
        if (user.role === 'admin') {
            const expectedPhrase = state.adminSecurityPhrases[userEmail] || 
                (userEmail === MAIN_ADMIN_EMAIL ? MAIN_ADMIN_SECURITY_PHRASE : null);
            if (!securityPhrase || securityPhrase !== expectedPhrase) {
                softToast('Frase de seguridad incorrecta', 'danger');
                return false;
            }
        }
    } else if (!user && !isGoogleLogin) {
        softToast('Usuario no encontrado. Regístrate primero.', 'warn');
        return false;
    }
    
    state.currentUser = user;
    const expiryDate = new Date();
    const isAdminUser = user.role === 'admin';
    const daysToExpire = isAdminUser ? 0.0208 : 15;
    expiryDate.setDate(expiryDate.getDate() + daysToExpire);
    state.sessionExpiry = expiryDate.toISOString();
    
    saveState();
    updateAuthUI();
    resetSessionActivityTimer();
    
    softToast(`Bienvenido ${user.name || user.email}`, 'ok');
    
    if (!state.userProfile) {
        setTimeout(() => showProfileModal(), 500);
    }
    
    return true;
}

function registerUser(email, password) {
    if (!email || !email.includes('@')) {
        softToast('Ingresa un correo válido', 'warn');
        return false;
    }
    
    if (!isValidPassword(password)) {
        softToast('La contraseña debe tener al menos 4 caracteres', 'warn');
        return false;
    }
    
    if (state.users.find(u => u.email === email)) {
        softToast('El correo ya está registrado', 'warn');
        return false;
    }
    
    let role = 'user';
    if (email === MAIN_ADMIN_EMAIL) {
        role = 'admin';
        state.adminSecurityPhrases[email] = MAIN_ADMIN_SECURITY_PHRASE;
    }
    
    const newUser = {
        id: Date.now().toString(),
        email: email,
        name: email.split('@')[0],
        password: password,
        role: role,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        method: 'manual'
    };
    
    state.users.push(newUser);
    saveState();
    softToast('Registro exitoso. Ahora inicia sesión.', 'ok');
    return true;
}

function logout() {
    state.currentUser = null;
    state.sessionExpiry = null;
    if (sessionActivityTimer) clearTimeout(sessionActivityTimer);
    saveState();
    updateAuthUI();
    const adminTab = document.getElementById('adminTab');
    if (adminTab) adminTab.style.display = 'none';
    softToast('Sesión cerrada', 'ok');
    const currentPage = getCurrentPage();
    if (currentPage !== 'entrada') {
        navigateToPage('entrada');
    } else {
        refreshCurrentPage();
    }
}

function updateAuthUI() {
    const isLoggedIn = checkAuth();
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const adminTab = document.getElementById('adminTab');
    
    if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'flex';
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'flex' : 'none';
    if (userInfo) userInfo.style.display = isLoggedIn ? 'flex' : 'none';
    if (userName && state.currentUser) userName.textContent = state.currentUser.name || state.currentUser.email.split('@')[0];
    
    if (adminTab) {
        adminTab.style.display = (isLoggedIn && isAdmin()) ? 'flex' : 'none';
    }
}

/* ==== LOGIN CON GOOGLE ==== */
function loginWithGoogle() {
    const emailInput = document.getElementById('loginEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    
    if (!email || !email.includes('@')) {
        softToast('Ingresa un email válido', 'warn');
        return;
    }
    
    if (email === MAIN_ADMIN_EMAIL) {
        softToast('El administrador principal debe usar correo y contraseña', 'warn');
        const manualTab = document.querySelector('.login-tab[data-login-tab="manual"]');
        if (manualTab) manualTab.click();
        document.getElementById('manualEmail').value = email;
        return;
    }
    
    const existingUser = state.users.find(u => u.email === email);
    if (existingUser && existingUser.role === 'admin') {
        softToast('Los administradores deben usar correo y contraseña', 'warn');
        const manualTab = document.querySelector('.login-tab[data-login-tab="manual"]');
        if (manualTab) manualTab.click();
        document.getElementById('manualEmail').value = email;
        return;
    }
    
    login(email, null, true);
    hideLoginModal();
}

/* ==== RECUPERACIÓN DE CONTRASEÑA ==== */
function sendRecoveryLink() {
    const email = document.getElementById('recoveryEmail').value.trim();
    if (!email) {
        document.getElementById('recoveryMessage').textContent = 'Ingresa un correo';
        return;
    }
    
    const user = state.users.find(u => u.email === email);
    if (!user) {
        document.getElementById('recoveryMessage').textContent = 'Cuenta no encontrada';
        return;
    }
    
    const token = Math.random().toString(36).substring(2, 10);
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);
    
    state.recoveryTokens = state.recoveryTokens || [];
    state.recoveryTokens.push({ token, email, expires: expires.toISOString() });
    saveState();
    
    document.getElementById('recoveryMessage').innerHTML = `
        ✅ Token generado: <strong>${token}</strong><br>
        <a href="#" onclick="window.location.href=window.location.pathname+'?reset=${token}'; return false;">Click aquí para recuperar</a>
    `;
}

function verifyRecoveryToken(token) {
    const recovery = (state.recoveryTokens || []).find(t => t.token === token);
    if (!recovery) return null;
    if (new Date(recovery.expires) < new Date()) return null;
    return recovery;
}

function resetPasswordWithToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('reset');
    
    if (!token) {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        const recoveryToken = sessionStorage.getItem('recoveryToken');
        
        if (!recoveryToken) {
            softToast('Token no encontrado', 'danger');
            return;
        }
        
        const recovery = verifyRecoveryToken(recoveryToken);
        if (!recovery) {
            softToast('Token inválido o expirado', 'danger');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            document.getElementById('newPasswordMessage').textContent = 'Las contraseñas no coinciden';
            return;
        }
        
        if (!isValidPassword(newPassword)) {
            document.getElementById('newPasswordMessage').textContent = 'Mínimo 4 caracteres';
            return;
        }
        
        const user = state.users.find(u => u.email === recovery.email);
        if (user) {
            user.password = newPassword;
            state.recoveryTokens = (state.recoveryTokens || []).filter(t => t.token !== recoveryToken);
            saveState();
            softToast('Contraseña actualizada', 'ok');
            hideNewPasswordModal();
            sessionStorage.removeItem('recoveryToken');
        }
        return;
    }
    
    const recovery = verifyRecoveryToken(token);
    if (!recovery) {
        document.body.innerHTML = '<div style="text-align:center;margin-top:50px;"><h1>Token inválido</h1><a href="/">Volver</a></div>';
        return;
    }
    
    sessionStorage.setItem('recoveryToken', token);
    showNewPasswordModal();
    window.history.pushState({}, '', window.location.pathname);
}

/* ==== MODALES ==== */
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('manualEmail').value = '';
    document.getElementById('manualPassword').value = '';
    document.getElementById('manualConfirmPassword').value = '';
    document.getElementById('manualSecurityPhrase').value = '';
    document.getElementById('manualSecurityField').style.display = 'none';
    document.getElementById('manualConfirmField').style.display = 'none';
    document.getElementById('btnManualLogin').style.display = 'block';
    document.getElementById('btnManualRegister').textContent = 'Registrarse';
    document.getElementById('manualLoginMessage').innerHTML = '';
}

function showRecoveryModal() {
    hideLoginModal();
    const modal = document.getElementById('recoveryModal');
    if (modal) modal.style.display = 'flex';
}

function hideRecoveryModal() {
    const modal = document.getElementById('recoveryModal');
    if (modal) modal.style.display = 'none';
}

function showNewPasswordModal() {
    const modal = document.getElementById('newPasswordModal');
    if (modal) modal.style.display = 'flex';
}

function hideNewPasswordModal() {
    const modal = document.getElementById('newPasswordModal');
    if (modal) modal.style.display = 'none';
}

function showProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    if (state.userProfile) {
        document.getElementById('profileAge').value = state.userProfile.ageRange || '';
        document.getElementById('profileGender').value = state.userProfile.gender || '';
        document.getElementById('profileSalary').value = state.userProfile.salaryRange || '';
    }
    modal.style.display = 'flex';
}

function hideProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'none';
}

function saveUserProfile() {
    state.userProfile = {
        ageRange: document.getElementById('profileAge').value || null,
        gender: document.getElementById('profileGender').value || null,
        salaryRange: document.getElementById('profileSalary').value || null,
        updatedAt: new Date().toISOString()
    };
    saveState();
    hideProfileModal();
    softToast('Perfil guardado', 'ok');
}

/* ==== SETUP LOGIN MANUAL ==== */
function setupManualLoginEvents() {
    const manualEmail = document.getElementById('manualEmail');
    const manualSecurityField = document.getElementById('manualSecurityField');
    const btnLogin = document.getElementById('btnManualLogin');
    const btnRegister = document.getElementById('btnManualRegister');
    const confirmField = document.getElementById('manualConfirmField');
    
    let isRegisterMode = false;
    
    manualEmail.addEventListener('input', function() {
        const email = this.value.trim();
        if (needsSecurityPhrase(email) && !isRegisterMode) {
            manualSecurityField.style.display = 'block';
        } else {
            manualSecurityField.style.display = 'none';
        }
    });
    
    btnRegister.addEventListener('click', () => {
        if (!isRegisterMode) {
            isRegisterMode = true;
            confirmField.style.display = 'block';
            btnLogin.style.display = 'none';
            btnRegister.textContent = 'Confirmar registro';
            manualSecurityField.style.display = 'none';
        } else {
            const email = manualEmail.value.trim();
            const password = document.getElementById('manualPassword').value;
            const confirmPassword = document.getElementById('manualConfirmPassword').value;
            
            if (!email || !password) {
                document.getElementById('manualLoginMessage').innerHTML = 'Completa todos los campos';
                return;
            }
            
            if (password !== confirmPassword) {
                document.getElementById('manualLoginMessage').innerHTML = 'Las contraseñas no coinciden';
                return;
            }
            
            if (registerUser(email, password)) {
                isRegisterMode = false;
                confirmField.style.display = 'none';
                btnLogin.style.display = 'block';
                btnRegister.textContent = 'Registrarse';
                document.getElementById('manualPassword').value = '';
                document.getElementById('manualConfirmPassword').value = '';
                document.getElementById('manualLoginMessage').innerHTML = 'Registro exitoso. Ahora inicia sesión.';
            }
        }
    });
    
    btnLogin.addEventListener('click', () => {
        const email = manualEmail.value.trim();
        const password = document.getElementById('manualPassword').value;
        const securityPhrase = document.getElementById('manualSecurityPhrase').value;
        
        if (!email || !password) {
            document.getElementById('manualLoginMessage').innerHTML = 'Completa todos los campos';
            return;
        }
        
        if (needsSecurityPhrase(email) && !securityPhrase) {
            document.getElementById('manualLoginMessage').innerHTML = 'Esta cuenta requiere frase de seguridad';
            manualSecurityField.style.display = 'block';
            return;
        }
        
        if (login(email, password, false, securityPhrase)) {
            hideLoginModal();
        } else {
            document.getElementById('manualLoginMessage').innerHTML = 'Credenciales incorrectas';
        }
    });
}

function setupLoginTabs() {
    const tabs = document.querySelectorAll('.login-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const googlePanel = document.getElementById('loginGooglePanel');
            const manualPanel = document.getElementById('loginManualPanel');
            if (tab.dataset.loginTab === 'google') {
                googlePanel.style.display = 'block';
                manualPanel.style.display = 'none';
            } else {
                googlePanel.style.display = 'none';
                manualPanel.style.display = 'block';
            }
        });
    });
    
    document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
        e.preventDefault();
        showRecoveryModal();
    });
}

/* ==== GASTOS HORMIGA ==== */
function getTotalGastosHormiga() {
    return state.gastosHormiga.reduce((sum, gh) => sum + (gh.valor || 0), 0);
}

function renderGastosHormigaTooltip() {
    const content = document.getElementById('hormigaTooltipContent');
    if (!content) return;
    
    const total = getTotalGastosHormiga();
    
    if (state.gastosHormiga.length === 0) {
        content.innerHTML = '<div class="hormiga-empty">No hay gastos hormiga</div>';
        return;
    }
    
    let html = '<div class="hormiga-tooltip-list">';
    state.gastosHormiga.forEach(gh => {
        html += `<div class="hormiga-tooltip-item">
            <span class="hormiga-concepto">${Utils.escapeHTML(gh.concepto)}</span>
            <span class="hormiga-valor">${Utils.fmtCOP.format(gh.valor)}</span>
            <span class="hormiga-fecha">${gh.fecha || '—'}</span>
        </div>`;
    });
    html += `<div class="hormiga-tooltip-total">Total: ${Utils.fmtCOP.format(total)}</div></div>`;
    content.innerHTML = html;
}

function showHormigaTooltip() {
    const tooltip = document.getElementById('hormigaTooltip');
    if (!tooltip) return;
    renderGastosHormigaTooltip();
    tooltip.classList.add('show');
}

function hideHormigaTooltip() {
    const tooltip = document.getElementById('hormigaTooltip');
    if (!tooltip) return;
    tooltip.classList.remove('show');
}

function openHormigaModal() {
    if (!requireAuth()) return;
    const modal = document.getElementById('hormigaModal');
    if (modal) {
        renderHormigaModalList();
        modal.style.display = 'flex';
    }
}

function closeHormigaModal() {
    const modal = document.getElementById('hormigaModal');
    if (modal) modal.style.display = 'none';
    hideHormigaForm();
}

function renderHormigaModalList() {
    const container = document.getElementById('hormigaListContainer');
    if (!container) return;
    
    const total = getTotalGastosHormiga();
    document.getElementById('hormigaTotalDisplay').textContent = Utils.fmtCOP.format(total);
    document.getElementById('hormigaTotalPreview').textContent = Utils.fmtCOP.format(total);
    
    if (state.gastosHormiga.length === 0) {
        container.innerHTML = '<div class="hormiga-empty-state">No hay gastos hormiga.<br>Haz clic en "Agregar" para comenzar.</div>';
        return;
    }
    
    let html = '<div class="hormiga-list">';
    state.gastosHormiga.forEach((gh, idx) => {
        html += `
            <div class="hormiga-list-item">
                <div class="hormiga-item-info">
                    <div class="hormiga-item-concepto">${Utils.escapeHTML(gh.concepto)}</div>
                    <div class="hormiga-item-valor">${Utils.fmtCOP.format(gh.valor)}</div>
                    <div class="hormiga-item-fecha">${gh.fecha || '—'}</div>
                </div>
                <div class="hormiga-item-actions">
                    <button class="btn small secondary" onclick="editGastoHormiga(${idx})">Editar</button>
                    <button class="btn small warn" onclick="deleteGastoHormiga(${idx})">Eliminar</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function showAddHormigaForm() {
    document.getElementById('hormigaFormTitle').textContent = 'Nuevo Gasto Hormiga';
    document.getElementById('hormigaEditIndex').value = '-1';
    document.getElementById('hormigaConcepto').value = '';
    document.getElementById('hormigaValor').value = '';
    document.getElementById('hormigaFecha').value = Utils.fmtYYYYMMDD(Utils.hoyLocal()).replace(/\//g, '-');
    document.getElementById('hormigaFormContainer').style.display = 'block';
}

function hideHormigaForm() {
    document.getElementById('hormigaFormContainer').style.display = 'none';
}

function saveGastoHormiga() {
    const concepto = document.getElementById('hormigaConcepto').value.trim();
    const valorRaw = document.getElementById('hormigaValor').value;
    const valor = Utils.parseCurrency(valorRaw);
    const fecha = document.getElementById('hormigaFecha').value;
    const editIndex = parseInt(document.getElementById('hormigaEditIndex').value, 10);
    
    if (!concepto) {
        softToast('Ingresa un concepto', 'warn');
        return;
    }
    
    if (!isFinite(valor) || valor <= 0) {
        softToast('Ingresa un valor válido', 'warn');
        return;
    }
    
    const formattedFecha = fecha ? fecha.split('-').reverse().join('/') : Utils.fmtYYYYMMDD(Utils.hoyLocal());
    
    if (editIndex >= 0 && editIndex < state.gastosHormiga.length) {
        state.gastosHormiga[editIndex] = { concepto, valor, fecha: formattedFecha };
        softToast('Gasto hormiga actualizado', 'ok');
    } else {
        state.gastosHormiga.push({ concepto, valor, fecha: formattedFecha, createdAt: new Date().toISOString() });
        softToast('Gasto hormiga agregado', 'ok');
    }
    
    saveState();
    renderHormigaModalList();
    hideHormigaForm();
    renderGastos();
    updateResumenContext();
}

function editGastoHormiga(idx) {
    const gh = state.gastosHormiga[idx];
    if (!gh) return;
    
    document.getElementById('hormigaFormTitle').textContent = 'Editar Gasto Hormiga';
    document.getElementById('hormigaEditIndex').value = idx;
    document.getElementById('hormigaConcepto').value = gh.concepto;
    document.getElementById('hormigaValor').value = Utils.formatNumber(gh.valor);
    const fechaFormatted = gh.fecha ? gh.fecha.split('/').reverse().join('-') : '';
    document.getElementById('hormigaFecha').value = fechaFormatted;
    document.getElementById('hormigaFormContainer').style.display = 'block';
}

function deleteGastoHormiga(idx) {
    if (confirm('¿Eliminar este gasto hormiga?')) {
        state.gastosHormiga.splice(idx, 1);
        saveState();
        renderHormigaModalList();
        renderGastos();
        updateResumenContext();
        softToast('Gasto hormiga eliminado', 'warn');
    }
}

function cancelHormigaForm() {
    hideHormigaForm();
}

/* ==== PANEL DE ADMINISTRACIÓN ==== */
function renderAdminPanel() {
    if (!isAdmin()) return;
    
    const tbody = document.querySelector('#tablaAdminUsers tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    document.getElementById('adminTotalUsers').textContent = state.users.length;
    document.getElementById('adminActiveSessions').textContent = checkAuth() ? '1' : '0';
    
    state.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${Utils.escapeHTML(user.name || user.email.split('@')[0])}</td>
            <td>${Utils.escapeHTML(user.email)}</td
            <td><span class="admin-role-badge ${user.role === 'admin' ? 'admin' : 'user'}">${user.role === 'admin' ? 'Administrador' : 'Usuario'}</span></td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td
            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—'}</td
            <td>${user.method === 'google' ? 'Google' : 'Manual'}</td
            <td>
                <button class="btn small admin-action-btn admin-reset-btn" data-admin-reset="${user.email}">Reset pass</button>
                ${user.role !== 'admin' && user.email !== MAIN_ADMIN_EMAIL ? 
                    `<button class="btn small admin-action-btn admin-assign-btn" data-admin-assign="${user.email}">Asignar Admin</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    tbody.querySelectorAll('[data-admin-reset]').forEach(btn => {
        btn.addEventListener('click', () => adminResetPassword(btn.dataset.adminReset));
    });
    
    tbody.querySelectorAll('[data-admin-assign]').forEach(btn => {
        btn.addEventListener('click', () => adminAssignRole(btn.dataset.adminAssign));
    });
}

function adminResetPassword(email) {
    const user = state.users.find(u => u.email === email);
    if (!user) return;
    
    const tempPassword = Math.random().toString(36).substring(2, 8) + '123';
    user.password = tempPassword;
    saveState();
    softToast(`Nueva contraseña para ${email}: ${tempPassword}`, 'ok');
}

function adminAssignRole(email) {
    const user = state.users.find(u => u.email === email);
    if (!user) return;
    
    if (user.role === 'admin') {
        softToast('Ya es administrador', 'warn');
        return;
    }
    
    const phrase = prompt('Ingresa una frase de seguridad para este administrador:');
    if (!phrase || phrase.length < 4) {
        softToast('Mínimo 4 caracteres', 'warn');
        return;
    }
    
    user.role = 'admin';
    state.adminSecurityPhrases[email] = phrase;
    saveState();
    renderAdminPanel();
    softToast(`${email} ahora es administrador`, 'ok');
}

/* ==== FORMATEO DE MONEDA ==== */
function setupCurrencyInputs() {
    const currencyInputs = document.querySelectorAll('.currency-input');
    currencyInputs.forEach(input => {
        input.addEventListener('input', function() {
            const rawValue = this.value.replace(/\./g, '');
            const numericValue = parseInt(rawValue, 10);
            if (!isNaN(numericValue)) {
                this.value = Utils.formatNumber(numericValue);
            } else if (this.value === '') {
                this.value = '';
            }
        });
    });
}

/* ==== TOAST ==== */
function softToast(message, type='ok'){
    const t = document.getElementById('toast');
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none">
            ${type==='ok' ? '<path d="M5 13l4 4L19 7" stroke="#22c55e" stroke-width="2"/>' :
                type==='warn' ? '<path d="M12 8v6M12 18h0" stroke="#f59e0b" stroke-width="2"/>' :
                '<path d="M12 8v6M12 18h0" stroke="#ef4444" stroke-width="2"/>'}
        </svg>
        <div>${Utils.escapeHTML(message)}</div>`;
    t.appendChild(div);
    setTimeout(()=>{ div.style.opacity='0'; div.style.transform='translateY(6px)'; }, 2600);
    setTimeout(()=>{ div.remove(); }, 3000);
}

/* ==== FUNCIONES DE FECHA ==== */
function parseISO(iso){ 
    const [y,m,d] = iso.split('-').map(Number); 
    return new Date(y, m-1, d); 
}

function diasHasta(iso){ 
    const fin = parseISO(iso); 
    const diff = fin - Utils.hoyLocal(); 
    return Math.floor(diff/(1000*60*60*24)); 
}

function estadoCDT(iso){
    if(!iso) return 'Activa';
    const d = diasHasta(iso);
    if(d < 0) return 'Vencido';
    if(d <= 30) return 'Próximo a vencer';
    return 'Activa';
}

/* ==== SELECTS ==== */
function refreshIngresoCats(){
    const sel = document.getElementById('ingresoCategoria');
    sel.innerHTML=''; 
    sel.append(new Option('Selecciona categoría','',true,true));
    state.ingresoCats.forEach(c=> sel.append(new Option(c,c)));
    sel.append(new Option('➕ Crear nuevo concepto…','__custom__'));
}

function refreshGastoTipos(){
    const sel = document.getElementById('gastoTipo');
    sel.innerHTML=''; 
    sel.append(new Option('Selecciona tipo de gasto','',true,true));
    state.gastoTipos.forEach(c=> sel.append(new Option(c,c)));
    sel.append(new Option('➕ Crear nuevo tipo…','__custom__'));
}

function refreshInvCats(){
    const sel = document.getElementById('invConcepto');
    sel.innerHTML=''; 
    sel.append(new Option('Selecciona inversión','',true,true));
    state.invCats.forEach(c=> sel.append(new Option(c,c)));
    sel.append(new Option('➕ Crear nuevo concepto…','__custom__'));
}

/* ==== NAVEGACIÓN ==== */
function setTab(tab){
    if (tab === 'admin' && !isAdmin()) {
        tab = 'entrada';
    }
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
    document.querySelectorAll('section').forEach(s=> s.style.display = (s.id===tab ? '' : 'none'));
    if(tab==='entrada'){ 
        renderIngresos(); 
        renderGastos(); 
        updateResumenContext(); 
    }
    if(tab==='resumen'){ renderResumen(); }
    if(tab==='ahorros'){ renderAhorros(); }
    if(tab==='inversiones'){ 
        renderInversiones(); 
        startAdviceRotation();
    }
    if(tab==='admin' && isAdmin()){ 
        renderAdminPanel(); 
    }
    registerActivity();
}

/* ==== CONSEJOS DE INVERSIÓN ==== */
function getRandomAdvice() {
    return consejosInv[Math.floor(Math.random() * consejosInv.length)];
}

function showSingleAdvice() {
    const adviceText = getRandomAdvice();
    const adviceElement = document.getElementById('singleAdviceText');
    if (adviceElement) {
        adviceElement.style.opacity = '0';
        setTimeout(() => {
            adviceElement.textContent = adviceText;
            adviceElement.style.opacity = '1';
        }, 300);
    }
}

function startAdviceRotation() {
    showSingleAdvice();
    if (adviceTimer) clearInterval(adviceTimer);
    adviceTimer = setInterval(showSingleAdvice, 300000);
}

function stopAdviceRotation() {
    if (adviceTimer) {
        clearInterval(adviceTimer);
        adviceTimer = null;
    }
}

/* ==== HELPERS ==== */
function hasMonths(){ return state.meses.length>0; }
function selectedMonthIdx(){ return parseInt(document.getElementById('mesSelector').value||'0',10); }
function currentMonthObj(){ return hasMonths() ? state.meses[selectedMonthIdx()] : null; }
function getIngresos(){ return hasMonths() ? state.meses[selectedMonthIdx()].ingresos : tempIngresos; }
function getGastos(){ return hasMonths() ? state.meses[selectedMonthIdx()].gastos : tempGastos; }
function getGastosOrdenados() {
    const gastos = getGastos();
    return [...gastos].sort((a, b) => {
        const valA = (a.valorTotal ?? a.valor ?? 0);
        const valB = (b.valorTotal ?? b.valor ?? 0);
        return valB - valA;
    });
}
function getInversionesMes(){ return hasMonths() ? state.inversiones.filter(inv => inv.monthId === currentMonthObj().id) : tempInversiones; }
function totalInvertidoMes(){ return getInversionesMes().reduce((a,b)=> a + (b.valor||0), 0); }

function dineroDisponibleActual(){
    if(hasMonths()){
        const m = currentMonthObj();
        const totalIng = m.ingresos.reduce((a,b)=>a+b.valor,0);
        let totalGas = m.gastos.reduce((a,b)=>a+(b.valorTotal ?? b.valor ?? 0),0);
        totalGas += getTotalGastosHormiga();
        const saldo = totalIng - totalGas;
        return Math.max(0, Math.round(saldo - (m.ahorroTotal || 0) - (m.gastoValor || 0) - totalInvertidoMes()));
    }else{
        const totalIngTemp = tempIngresos.reduce((a,b)=>a+b.valor,0);
        let totalGasTemp = tempGastos.reduce((a,b)=>a+(b.valorTotal||0),0);
        totalGasTemp += getTotalGastosHormiga();
        const totalInvTemp = tempInversiones.reduce((a,b)=>a+b.valor,0);
        const saldoTemp = totalIngTemp - totalGasTemp;
        return Math.max(0, Math.round(saldoTemp - totalInvTemp));
    }
}

/* ==== INGRESOS ==== */
function renderIngresos(){
    const ingresos = getIngresos();
    const tbody = document.querySelector('#tablaIngresos tbody');
    tbody.innerHTML = '';
    let total = 0;
    
    ingresos.forEach((it, idx)=>{
        total += it.valor;
        const tr = document.createElement('tr');
        const tdCat = document.createElement('td'); 
        tdCat.textContent = it.cat;
        const tdVal = document.createElement('td'); 
        tdVal.className='right'; 
        tdVal.textContent = Utils.fmtCOP.format(it.valor);
        const tdAct = document.createElement('td'); 
        tdAct.className='right';
        tdAct.innerHTML = `
            <button class="btn secondary" data-edit-ing="${idx}">Editar</button>
            <button class="btn warn" data-del-ing="${idx}">Quitar</button>
        `;
        tr.append(tdCat, tdVal, tdAct);
        tbody.appendChild(tr);
    });
    
    document.getElementById('totalIngresos').textContent = Utils.fmtCOP.format(total);
    updateResumenContext();
}

/* ==== GASTOS ==== */
function renderGastos(){
    const isLoggedIn = checkAuth();
    const authWarning = document.getElementById('gastosAuthWarning');
    if (authWarning) {
        authWarning.style.display = isLoggedIn ? 'none' : 'flex';
    }
    
    const gastosOrdenados = getGastosOrdenados();
    const tbody = document.querySelector('#tablaGastos tbody');
    tbody.innerHTML = '';
    let total = 0; 
    gastosOrdenados.forEach(g => total += (g.valorTotal ?? g.valor));
    total += getTotalGastosHormiga();
    const promedio = gastosOrdenados.length ? (total / gastosOrdenados.length) : 0;

    gastosOrdenados.forEach((it, idx)=>{
        const valorMostrar = (it.valorTotal ?? it.valor);
        const pct = total>0 ? (valorMostrar/total*100) : 0;
        const tr = document.createElement('tr');
        
        if(valorMostrar > promedio){ 
            tr.style.backgroundColor = 'rgba(245,158,11,.08)'; 
        }
        
        const cuotaTxt = (it.cuotaIdx && it.cuotasTotal) ? 
            ` (cuota ${it.cuotaIdx}/${it.cuotasTotal})` : 
            (it.cuotas ? ` (en ${it.cuotas} cuotas)` : '');

        const tdDesc = document.createElement('td'); 
        tdDesc.textContent = (it.desc || '—') + cuotaTxt;
        const tdTipo = document.createElement('td'); 
        tdTipo.textContent = it.tipo || '—';
        const tdVal  = document.createElement('td'); 
        tdVal.className='right'; 
        tdVal.textContent = Utils.fmtCOP.format(valorMostrar);
        const tdPct  = document.createElement('td'); 
        tdPct.className='right'; 
        tdPct.textContent = `${pct.toFixed(0)}%`;
        const tdPag  = document.createElement('td'); 
        tdPag.className='right';
        tdPag.innerHTML = `
            <label>
                <input type="checkbox" data-pagado="${idx}" ${it.pagado ? 'checked' : ''} 
                    ${hasMonths() ? '' : 'disabled'}/>
                Pagado
            </label>`;
        const tdAcc  = document.createElement('td'); 
        tdAcc.className='right';
        tdAcc.innerHTML = `
            <button class="btn secondary" data-edit-g="${idx}">Editar</button>
            <button class="btn warn" data-del-g="${idx}">Quitar</button>`;

        tr.append(tdDesc, tdTipo, tdVal, tdPct, tdPag, tdAcc);
        tbody.appendChild(tr);
    });
    
    const totalHormiga = getTotalGastosHormiga();
    if (totalHormiga > 0) {
        const tr = document.createElement('tr');
        tr.className = 'hormiga-total-row';
        tr.style.backgroundColor = 'rgba(34,197,94,0.05)';
        tr.innerHTML = `
            <td colspan="2"><strong>🐜 Total Gastos Hormiga</strong></td>
            <td class="right"><strong>${Utils.fmtCOP.format(totalHormiga)}</strong></td>
            <td class="right">${total > 0 ? ((totalHormiga/total*100).toFixed(0)) : 0}%</td
            <td class="right"></td
            <td class="right"></td>
        `;
        tbody.appendChild(tr);
    }
    
    document.getElementById('totalGastos').textContent = Utils.fmtCOP.format(total);
    renderPagoDonut();
    renderCategoriaDonut();
    updateResumenContext();
}

/* ==== GRÁFICOS ==== */
function renderPagoDonut(){
    const gastos = getGastos();
    const total = gastos.reduce((a,b) => a + ((b.valorTotal ?? b.valor) || 0), 0) + getTotalGastosHormiga();
    const pagado = gastos.reduce((a,b) => {
        if (b.pagado) return a + ((b.valorTotal ?? b.valor) || 0);
        return a;
    }, 0);
    
    const pctNum = total > 0 ? Math.min(100, Math.max(0, (pagado/total)*100)) : 0;
    const C = 2 * Math.PI * 60;
    const donut = document.getElementById('donutPaid');
    const donutSvg = document.getElementById('donutPaidSvg');
    const singleDataContainer = document.getElementById('singleDataContainer');
    const singleDataValue = document.getElementById('singleDataValue');
    const singleDataLabel = document.getElementById('singleDataLabel');
    
    if (gastos.length === 1 || total === 0) {
        donutSvg.style.display = 'none';
        singleDataContainer.style.display = 'flex';
        singleDataValue.textContent = `${pctNum.toFixed(0)}%`;
        singleDataLabel.textContent = total === 0 ? 'Sin datos' : 'Pagado';
    } else {
        donutSvg.style.display = 'block';
        singleDataContainer.style.display = 'none';
        const dashOffset = C - (C * (pctNum/100));
        donut.setAttribute('stroke-dasharray', String(C));
        donut.setAttribute('stroke-dashoffset', String(dashOffset));
        document.getElementById('donutCenterPct').textContent = `${pctNum.toFixed(0)}%`;
    }
    
    const chip = document.getElementById('donutPct');
    chip.className = 'chip ' + (pctNum >= 75 ? 'ok' : pctNum >= 40 ? 'warn' : 'danger');
    chip.textContent = `${pctNum.toFixed(0)}% pagado`;
    
    document.getElementById('donutAmounts').textContent = 
        `${Utils.fmtCOP.format(pagado)} / ${Utils.fmtCOP.format(total)}`;
}

function renderCategoriaDonut(){
    const gastos = getGastos();
    const segs = document.getElementById('catDonutSegs');
    const catDonutSvg = document.getElementById('catDonutSvg');
    const singleCatContainer = document.getElementById('singleCatDataContainer');
    const singleCatValue = document.getElementById('singleCatDataValue');
    const singleCatLabel = document.getElementById('singleCatDataLabel');
    const col1 = document.getElementById('catLegendCol1');
    const col2 = document.getElementById('catLegendCol2');
    segs.innerHTML = '';
    col1.innerHTML = ''; 
    col2.innerHTML = '';
    
    let total = gastos.reduce((a,b)=> a + ((b.valorTotal ?? b.valor)||0), 0);
    const totalHormiga = getTotalGastosHormiga();
    total += totalHormiga;
    
    const centerText = document.getElementById('catDonutCenter');
    
    if(total <= 0){ 
        catDonutSvg.style.display = 'none';
        singleCatContainer.style.display = 'flex';
        singleCatValue.textContent = '0%';
        singleCatLabel.textContent = 'Sin datos';
        centerText.textContent = 'Sin datos'; 
        return; 
    }

    const agg = {};
    gastos.forEach(g=>{
        const tipo = (g.tipo || 'Sin tipo');
        const val = (g.valorTotal ?? g.valor) || 0;
        agg[tipo] = (agg[tipo]||0) + val;
    });
    
    if (totalHormiga > 0) {
        agg['🐜 Gastos Hormiga'] = (agg['🐜 Gastos Hormiga'] || 0) + totalHormiga;
    }
    
    const entries = Object.entries(agg).sort((a,b)=> b[1]-a[1]);

    if (entries.length === 1) {
        const [tipo, val] = entries[0];
        catDonutSvg.style.display = 'none';
        singleCatContainer.style.display = 'flex';
        singleCatValue.textContent = `100%`;
        singleCatLabel.textContent = tipo.length > 10 ? tipo.substring(0, 10) + '...' : tipo;
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<span class="box" style="background:${Utils.palette[0]}"></span><span>${Utils.escapeHTML(tipo)} — 100%</span>`;
        col1.appendChild(item);
        centerText.textContent = tipo;
        return;
    }

    catDonutSvg.style.display = 'block';
    singleCatContainer.style.display = 'none';
    
    const cx = 70, cy = 70, r = 60, strokeW = 16;
    let startAngle = -Math.PI/2;
    const p2xy = (a) => ({x: cx + r*Math.cos(a), y: cy + r*Math.sin(a)});

    entries.forEach(([tipo, val], i)=>{
        const frac = val/total;
        const sweep = frac * 2 * Math.PI;
        const s = p2xy(startAngle);
        const e = p2xy(startAngle + sweep);
        const largeArc = sweep > Math.PI ? 1 : 0;
        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d', `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`);
        path.setAttribute('fill','none');
        path.setAttribute('stroke', Utils.palette[i % Utils.palette.length]);
        path.setAttribute('stroke-width', String(strokeW));
        path.setAttribute('stroke-linecap','butt');
        path.setAttribute('stroke-linejoin','round');
        segs.appendChild(path);
        const pct = frac*100;
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<span class="box" style="background:${Utils.palette[i % Utils.palette.length]}"></span><span>${Utils.escapeHTML(tipo)} — ${pct.toFixed(0)}%</span>`;
        if(i < 5) col1.appendChild(item); 
        else col2.appendChild(item);
        startAngle += sweep;
    });

    const maxVal = entries[0][1];
    const tops = entries.filter(([_, v]) => v === maxVal).map(([t]) => t);
    centerText.textContent = tops.join(' · ');
}

/* ==== RESUMEN ==== */
function updateResumenContext(){
    const ingresos = getIngresos();
    const gastos = getGastos();
    const totalIng = ingresos.reduce((a,b)=>a+b.valor,0);
    let totalGas = gastos.reduce((a,b)=>a+(b.valorTotal ?? b.valor),0);
    totalGas += getTotalGastosHormiga();
    const saldo = totalIng - totalGas;

    const chip = document.getElementById('saldoChip');
    let chipClass = 'ok';
    if (saldo < 0) chipClass = 'danger';
    else if (saldo === 0) chipClass = 'warn';
    else if (saldo < totalIng * 0.1) chipClass = 'warn';
    chip.className = `chip ${chipClass}`;
    document.getElementById('saldoTexto').textContent = Utils.fmtCOP.format(saldo);

    const liq = totalIng > 0 ? Math.min(100, Math.max(0, (saldo/totalIng*100))) : saldo > 0 ? 100 : 0;
    const exp = Math.min(100, Math.max(0, (100 - liq)));
    
    requestAnimationFrame(() => {
        document.getElementById('liqFill').style.width = `${liq.toFixed(0)}%`;
        document.getElementById('expFill').style.width = `${exp.toFixed(0)}%`;
    });
    
    document.getElementById('liqTexto').textContent = Utils.fmtPct2(liq);
    document.getElementById('expTexto').textContent = Utils.fmtPct2(exp);

    const alertEl = document.getElementById('alertaLiquidez');
    const alertaTexto = document.getElementById('alertaLiquidezTexto');
    
    if (totalIng === 0) {
        alertEl.style.display = '';
        alertaTexto.textContent = "No hay ingresos registrados. Agrega ingresos para comenzar.";
        alertEl.className = 'alert warn';
    } else if (liq < 15) {
        alertEl.style.display = '';
        alertaTexto.textContent = "⚠️ Liquidez crítica (<15%). Considera reducir gastos o aumentar ingresos.";
        alertEl.className = 'alert danger';
    } else if (liq < 25) {
        alertEl.style.display = '';
        alertaTexto.textContent = "Liquidez baja (<25%). Aumenta tu colchón de seguridad.";
        alertEl.className = 'alert warn';
    } else {
        alertEl.style.display = 'none';
    }
}

function renderResumen(){
    const tbody = document.querySelector('#tablaResumen tbody');
    tbody.innerHTML=''; 
    if(state.meses.length===0) return;
    
    const mesesOrd = [...state.meses].sort((a,b)=> (a.year-b.year) || (a.monthIdx-b.monthIdx));
    const dineroVals = mesesOrd.map(m=> m.saldo);
    const sortedVals = [...dineroVals].sort((a,b)=> a-b);
    const lows = new Set(sortedVals.slice(0,2));
    const highs = new Set(sortedVals.slice(-2));
    const frag = document.createDocumentFragment();
    
    mesesOrd.forEach(m=>{
        const dinero = m.saldo, liq = m.liqPct, exp = m.expPct;
        let dineroClass = ''; 
        if(highs.has(dinero)) dineroClass='ok'; 
        if(lows.has(dinero)) dineroClass='danger';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${Utils.escapeHTML(m.nombre)}</td
            <td class="right"><span class="chip ${dineroClass}">${Utils.fmtCOP.format(dinero)}</span></td
            <td><div class="bar"><div class="fill liq" style="width:${liq.toFixed(0)}%"></div></div><div class="muted ${liq<50?'chip warn':''}">${Utils.fmtPct2(liq)}</div></td
            <td><div class="bar"><div class="fill exp" style="width:${exp.toFixed(0)}%"></div></div><div class="muted ${exp>50?'chip warn':''}">${Utils.fmtPct2(exp)}</div></td>
        `;
        frag.appendChild(tr);
    });
    tbody.appendChild(frag);
}

/* ==== AHORROS ==== */
const SHAPE_CONFIG = {
    jar:   { bottomY: 145, topY: 40, height: 105 }, 
    pig:   { bottomY: 135, topY: 50, height: 85 },
    chest: { bottomY: 140, topY: 45, height: 95 }
};

function getShapeGeom() {
    const selectEstilo = document.getElementById('ahorroGraficaEstilo');
    const type = selectEstilo ? selectEstilo.value : 'jar';
    const config = SHAPE_CONFIG[type] || SHAPE_CONFIG.jar;
    return {
        fillX: 0,
        fillW: 200, 
        baseY: config.bottomY,
        baseH: config.height
    };
}

function spawnCoins(geom){
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prefersReduce) return;
    const container = document.getElementById('bankCoins');
    container.innerHTML = '';
    for(let i = 0; i < 6; i++){
        const cx = geom.fillX + 4 + Math.random()*(geom.fillW - 8);
        const coin = document.createElementNS('http://www.w3.org/2000/svg','circle');
        coin.setAttribute('cx', String(cx));
        coin.setAttribute('cy', String(geom.baseY));
        coin.setAttribute('r', '3.2');
        coin.setAttribute('fill', '#f59e0b');
        coin.setAttribute('stroke', '#c79a1a');
        coin.setAttribute('stroke-width', '0.7');
        container.appendChild(coin);
        const startY = geom.baseY;
        const endY   = geom.baseY + geom.baseH - (Math.random()*geom.baseH*0.35);
        const start  = performance.now();
        const dur    = 450 + Math.random()*350;
        const ease   = (t)=> 1 - Math.pow(1 - t, 2);
        function step(now){
            const t = Math.min(1, (now - start)/dur);
            const cy = startY + (endY - startY) * ease(t);
            coin.setAttribute('cy', String(cy));
            if(t<1) requestAnimationFrame(step);
            else setTimeout(() => coin.remove(), 500);
        }
        requestAnimationFrame(step);
    }
}

function animateBankFill(fromPct, toPct, geom, durMs=550, onDone=null){
    const clamp = (p)=> Math.min(100, Math.max(0, p));
    fromPct = clamp(fromPct); 
    toPct = clamp(toPct);
    const start = performance.now();
    const fillRect   = document.getElementById('bankFill');
    const centerText = document.getElementById('bankCenterText');
    const chip       = document.getElementById('bankPctChip');
    fillRect.setAttribute('x', '0');
    fillRect.setAttribute('width', '200');
    spawnCoins(geom);
    const easeOutCubic = (t)=> 1 - Math.pow(1 - t, 3);
    function step(now){
        const t = Math.min(1, (now - start) / durMs);
        const k = easeOutCubic(t);
        const cur = fromPct + (toPct - fromPct) * k;
        const pxHeight = (cur / 100) * geom.baseH;
        const y = geom.baseY - pxHeight;
        fillRect.setAttribute('y', String(y));
        fillRect.setAttribute('height', String(pxHeight));
        centerText.textContent = `${cur.toFixed(0)}%`;
        if(chip) chip.textContent = `${cur.toFixed(0)}% cumplimiento`;
        if(t < 1){ 
            requestAnimationFrame(step); 
        } else { 
            state.bankLastPct = toPct; 
            saveState(); 
            if(typeof onDone === 'function') onDone(); 
        }
    }
    requestAnimationFrame(step);
}

function renderAhorros(){
    const tbody = document.querySelector('#tablaAhorros tbody');
    tbody.innerHTML=''; 
    if(state.meses.length===0) return;

    let carryPrev = 0;
    const mesesOrd = [...state.meses].sort((a,b)=> (a.year-b.year) || (a.monthIdx-b.monthIdx));
    let sumPlan = 0, sumAhorrado = 0;
    let sumAhorradoConfirmado = 0;

    mesesOrd.forEach(m=>{
        const ahorroCalc = Math.round(m.saldo * (Math.min(100,Math.max(0,m.ahorroPct))/100));
        const gastoCalc  = Math.round(m.saldo * (Math.min(100,Math.max(0,m.gastoPct))/100));
        m.ahorroValor = ahorroCalc; 
        m.gastoValor  = gastoCalc;
        const invMes = state.inversiones.filter(inv => inv.monthId === m.id).reduce((a,b)=> a + b.valor, 0);
        const disponible = Math.round(m.saldo - (m.ahorroTotal + m.gastoValor + invMes) + carryPrev);
        m.disponible = Math.max(0, disponible);
        carryPrev = m.disponible;
        sumPlan += m.ahorroValor;
        sumAhorrado += (m.ahorroTotal || 0);
        if (m.ahorroConfirmado) sumAhorradoConfirmado += (m.ahorroTotal || 0);
    });

    const frag = document.createDocumentFragment();
    mesesOrd.forEach(m=>{
        const tr = document.createElement('tr');
        const confirmCheckbox = `
            <div class="confirm-ahorro-container">
                <label class="confirm-ahorro-label">
                    <input type="checkbox" class="confirm-ahorro-checkbox" data-m="${Utils.escapeHTML(m.id)}" ${m.ahorroConfirmado ? 'checked' : ''} ${m.ahorroTotal > 0 ? '' : 'disabled'}>
                    <span>${m.ahorroConfirmado ? '✓ Confirmado' : 'Ahorrado'}</span>
                </label>
            </div>
        `;
        const totalAhorradoClass = m.ahorroConfirmado ? 'col-ahorro-confirmado confirmado' : 'col-ahorro-confirmado';
        tr.innerHTML = `
            <td>${Utils.escapeHTML(m.nombre)}</td
            <td class="right">${Utils.fmtCOP.format(m.saldo)}</td
            <td class="right mobile-collapse-label" data-label="% Ahorrar"><input class="input input-pct-ah" type="number" min="0" max="100" step="1" value="${m.ahorroPct}" data-m="${Utils.escapeHTML(m.id)}" /></td
            <td class="right">${Utils.fmtCOP.format(m.ahorroValor)}</td
            <td class="right ${totalAhorradoClass}"><input class="input input-ah-total" type="number" min="0" step="1" value="${m.ahorroTotal}" data-m="${Utils.escapeHTML(m.id)}" /></td
            <td class="right">${confirmCheckbox}</td
            <td class="right mobile-collapse-label" data-label="% Gastar"><input class="input input-pct-g" type="number" min="0" max="100" step="1" value="${m.gastoPct}" data-m="${Utils.escapeHTML(m.id)}" /></td
            <td class="right">${Utils.fmtCOP.format(m.gastoValor)}</td
            <td class="right">${Utils.fmtCOP.format(m.disponible)}</td>
        `;
        frag.appendChild(tr);
    });
    tbody.appendChild(frag);

    tbody.querySelectorAll('.input-pct-ah').forEach(inp=>{
        inp.addEventListener('change', ()=>{
            const id = inp.dataset.m; 
            const m = state.meses.find(x=> x.id===id);
            m.ahorroPct = Math.round(Math.min(100,Math.max(0, parseFloat(inp.value||'0'))));
            m.ahorroValor = Math.round(m.saldo * (m.ahorroPct/100));
            saveState(); 
            renderAhorros();
        });
    });
    
    tbody.querySelectorAll('.input-pct-g').forEach(inp=>{
        inp.addEventListener('change', ()=>{
            const id = inp.dataset.m; 
            const m = state.meses.find(x=> x.id===id);
            m.gastoPct = Math.round(Math.min(100,Math.max(0, parseFloat(inp.value||'0'))));
            m.gastoValor = Math.round(m.saldo * (m.gastoPct/100));
            saveState(); 
            renderAhorros();
        });
    });
    
    tbody.querySelectorAll('.input-ah-total').forEach(inp=>{
        inp.addEventListener('change', ()=>{
            const id = inp.dataset.m; 
            const m = state.meses.find(x=> x.id===id);
            const val = parseInt(inp.value||'0',10); 
            m.ahorroTotal = isFinite(val)&&val>=0 ? val : 0;
            if (m.ahorroTotal < m.ahorroValor) m.ahorroConfirmado = false;
            saveState(); 
            renderAhorros();
        });
    });

    tbody.querySelectorAll('.confirm-ahorro-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = e.target.dataset.m;
            const m = state.meses.find(x => x.id === id);
            if (m) {
                m.ahorroConfirmado = e.target.checked;
                if (e.target.checked && m.ahorroTotal < m.ahorroValor) {
                    m.ahorroTotal = m.ahorroValor;
                    softToast(`Se ajustó el total ahorrado a ${Utils.fmtCOP.format(m.ahorroValor)}`, 'info');
                }
                saveState();
                renderAhorros();
                const message = e.target.checked 
                    ? `✅ Ahorro de ${m.nombre} confirmado` 
                    : `↩️ Ahorro de ${m.nombre} pendiente`;
                softToast(message, e.target.checked ? 'ok' : 'warn');
            }
        });
    });

    const geom = getShapeGeom();
    const metaInputVal = parseFloat(document.getElementById('ahorroMetaPct').value || '100');
    const rawGoal = state.bankGoalPct || metaInputVal;
    const visualGoalPct = Math.min(100, Math.max(0, rawGoal));
    const goalPixelHeight = (visualGoalPct / 100) * geom.baseH;
    const goalY = geom.baseY - goalPixelHeight;
    const goalLine = document.getElementById('bankGoalLine');
    if(goalLine){
        goalLine.setAttribute('x1', '10');
        goalLine.setAttribute('x2', '190');
        goalLine.setAttribute('y1', String(goalY));
        goalLine.setAttribute('y2', String(goalY));
        goalLine.style.opacity = (visualGoalPct > 0) ? '1' : '0';
    }

    const pct = sumPlan > 0 ? Math.min(100, Math.max(0, (sumAhorradoConfirmado / sumPlan) * 100)) : 0;
    const centerText = document.getElementById('bankCenterText');
    if(centerText) centerText.textContent = `${pct.toFixed(0)}%`;
    const chipPct = document.getElementById('bankPctChip');
    if(chipPct) chipPct.textContent = `${pct.toFixed(0)}% cumplimiento`;
    const bankAmounts = document.getElementById('bankAmounts');
    if(bankAmounts) {
        let textoAmount = `Total ahorrado confirmado: ${Utils.fmtCOP.format(sumAhorradoConfirmado)} de ${Utils.fmtCOP.format(sumPlan)}`;
        if (sumAhorrado > sumAhorradoConfirmado) {
            const diferencia = sumAhorrado - sumAhorradoConfirmado;
            textoAmount += ` (${Utils.fmtCOP.format(diferencia)} pendiente)`;
        }
        bankAmounts.textContent = textoAmount;
    }

    animateBankFill(state.bankLastPct || 0, pct, geom, 550, () => {
        state.bankLastPct = pct;
        saveState();
        if(pct >= 100){
            softToast('¡Felicitaciones! 🎉 Alcanzaste el 100% de tu meta de ahorro.', 'ok');
            const bankSvg = document.querySelector('.bank');
            if(bankSvg){
                bankSvg.classList.add('celebrate');
                setTimeout(()=> bankSvg.classList.remove('celebrate'), 1800);
            }
        }
    });
}

/* ==== INVERSIONES ==== */
function renderInversiones(){
    const disponible = dineroDisponibleActual();
    document.getElementById('invDineroDisponible').textContent = Utils.fmtCOP.format(disponible);
    document.getElementById('invMesLabel').textContent = hasMonths() ? (`Mes en edición: ${currentMonthObj().nombre}`) : 'Mes actual (temporal)';
    document.getElementById('invFechaInicio').value = Utils.fmtYYYYMMDD(Utils.hoyLocal());

    const tbody = document.querySelector('#tablaInv tbody');
    tbody.innerHTML='';
    let totalValor=0, totalMensual=0, totalAnual=0;
    const totalInvAll = state.inversiones.reduce((a,b)=>a+b.valor,0) || 1;
    const invsToShow = getInversionesMes();

    invsToShow.forEach((inv, idx)=>{
        const pctMes = (typeof inv.rentPct === 'number' ? inv.rentPct : 0);
        const r = Math.max(-100, pctMes) / 100;
        const rendimientoMes1 = Math.round(inv.valor * r);
        let totalAnualInv = 0, saldoFinal = inv.valor;
        if(inv.compuesto){
            let saldo = inv.valor;
            for(let m=1; m<=12; m++){
                const rendimiento = Math.round(saldo * r);
                totalAnualInv += rendimiento;
                saldo += rendimiento;
            }
            saldoFinal = saldo;
        }else{
            totalAnualInv = rendimientoMes1 * 12;
            saldoFinal = inv.valor + totalAnualInv;
        }
        const partPct = Math.min(100, Math.max(0, inv.valor/totalInvAll*100));
        totalValor   += inv.valor;
        totalMensual += rendimientoMes1;
        totalAnual   += totalAnualInv;
        const est = (inv.concepto==='CDT') ? estadoCDT(inv.vencISO) : 'Activa';
        const estClass = est==='Próximo a vencer' ? 'chip warn' : (est==='Vencido' ? 'chip danger' : 'chip ok');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td title="${Utils.escapeHTML(inv.concepto)}">${Utils.escapeHTML(inv.concepto)}</td
            <td class="right">${Utils.fmtCOP.format(inv.valor)}</td
            <td class="right">${(pctMes||0).toFixed(2)}%</td
            <td class="right">${Utils.fmtCOP.format(rendimientoMes1)}</td
            <td class="right">${Utils.fmtCOP.format(totalAnualInv)}</td
            <td class="right">${partPct.toFixed(0)}%</td
            <td class="right">${Utils.fmtCOP.format(saldoFinal)}</td
            <td>${Utils.escapeHTML(inv.fechaInicio || '—')}</td
            <td>${Utils.escapeHTML(inv.vencISO || '—')}</td
            <td><span class="${estClass}" title="${Utils.escapeHTML(est)}">${Utils.escapeHTML(est)}</span></td
            <td class="right">${inv.compuesto ? 'Sí' : 'No'}</td
            <td class="right"><button class="btn warn" data-del-inv="${idx}">Quitar</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('totalInvertido').textContent = Utils.fmtCOP.format(totalValor);
    document.getElementById('totalRendimientoMensual').textContent = Utils.fmtCOP.format(totalMensual);
    document.getElementById('totalRendimientoAnual').textContent = Utils.fmtCOP.format(totalAnual);
    document.getElementById('totalInvMasUtilidad').textContent = Utils.fmtCOP.format(totalValor + totalAnual);
    document.getElementById('invTotalChip').textContent = `Total invertido: ${Utils.fmtCOP.format(state.inversiones.reduce((a,b)=>a+b.valor,0))}`;
    renderInvTop5Chart();

    const proximos = invsToShow.filter(inv => inv.concepto==='CDT' && inv.vencISO && diasHasta(inv.vencISO) >= 0 && diasHasta(inv.vencISO) <= 30);
    const vencidos = invsToShow.filter(inv => inv.concepto==='CDT' && inv.vencISO && diasHasta(inv.vencISO) < 0);
    
    if(proximos.length>0) softToast(`🟡 ${proximos.length} CDT(s) a ≤30 días. Valida renovación.`, 'warn');
    if(vencidos.length>0) softToast(`🔴 ${vencidos.length} CDT(s) vencidos. Considera renovar o liquidar.`, 'danger');
}

function renderInvTop5Chart(){
    const svg = document.getElementById('invTop5Svg');
    const invs = [...state.inversiones];
    const total = invs.reduce((a,b)=> a + b.valor, 0);
    svg.innerHTML = '';

    if(!invs.length || total<=0){
        svg.setAttribute('viewBox', '0 0 520 160');
        const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
        bg.setAttribute('x','0'); bg.setAttribute('y','0'); bg.setAttribute('width','520'); bg.setAttribute('height','160'); bg.setAttribute('rx','12'); bg.setAttribute('fill','#0b1323'); bg.setAttribute('stroke','#1c2940');
        svg.appendChild(bg);
        const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
        txt.setAttribute('x','260'); txt.setAttribute('y','80'); txt.setAttribute('text-anchor','middle'); txt.setAttribute('dominant-baseline','middle'); txt.setAttribute('fill','#9fb3c8'); txt.setAttribute('font-size','13'); txt.setAttribute('font-weight','700');
        txt.textContent = 'Sin datos'; svg.appendChild(txt); return;
    }

    invs.sort((a,b)=> b.valor - a.valor);
    const top = invs.slice(0,5);
    const width = 520;
    const height = 220;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg','filter');
    filter.setAttribute('id','barShadow');
    filter.innerHTML = `<feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#000" flood-opacity=".3"/>`;
    defs.appendChild(filter);
    svg.appendChild(defs);

    const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
    bg.setAttribute('x','0'); bg.setAttribute('y','0'); bg.setAttribute('width', String(width)); bg.setAttribute('height', String(height));
    bg.setAttribute('rx','12'); bg.setAttribute('fill','#0b1323'); bg.setAttribute('stroke','#1c2940');
    svg.appendChild(bg);

    const padding = {left: 180, right: 130, top: 24, bottom: 26};
    const maxBarW = width - padding.left - padding.right;
    const rowH = 28;
    const gap = 10;

    top.forEach((inv, i)=>{
        const y = padding.top + i*(rowH + gap);
        const pct = Math.min(100, Math.max(0, inv.valor/total*100));
        const targetW = Math.round(maxBarW * (pct/100));
        const trackX = padding.left;
        const track = document.createElementNS('http://www.w3.org/2000/svg','rect');
        track.setAttribute('x', String(trackX)); track.setAttribute('y', String(y));
        track.setAttribute('width', String(maxBarW)); track.setAttribute('height', String(rowH));
        track.setAttribute('rx','10'); track.setAttribute('fill', '#0d1729');
        track.setAttribute('stroke', '#223b60');
        svg.appendChild(track);
        const bar = document.createElementNS('http://www.w3.org/2000/svg','rect');
        bar.setAttribute('x', String(trackX)); bar.setAttribute('y', String(y));
        bar.setAttribute('width', '0'); bar.setAttribute('height', String(rowH));
        bar.setAttribute('rx','10'); bar.setAttribute('fill', Utils.palette[i % Utils.palette.length]);
        bar.setAttribute('filter', 'url(#barShadow)');
        svg.appendChild(bar);
        const labelLeft = document.createElementNS('http://www.w3.org/2000/svg','text');
        labelLeft.setAttribute('x', String(padding.left - 10)); labelLeft.setAttribute('y', String(y + rowH/2));
        labelLeft.setAttribute('text-anchor','end'); labelLeft.setAttribute('dominant-baseline','middle');
        labelLeft.setAttribute('fill','#eaf1f9'); labelLeft.setAttribute('font-size','12'); labelLeft.setAttribute('font-weight','700');
        labelLeft.textContent = Utils.escapeHTML(inv.concepto.length > 20 ? inv.concepto.substring(0, 20) + '...' : inv.concepto);
        svg.appendChild(labelLeft);
        const labelRight = document.createElementNS('http://www.w3.org/2000/svg','text');
        labelRight.setAttribute('x', String(trackX + targetW + 8)); labelRight.setAttribute('y', String(y + rowH/2));
        labelRight.setAttribute('dominant-baseline','middle'); labelRight.setAttribute('fill','#eaf1f9');
        labelRight.setAttribute('font-size','11'); labelRight.setAttribute('font-weight','700');
        labelRight.textContent = `${Utils.fmtCOP.format(inv.valor)} · ${pct.toFixed(0)}%`;
        svg.appendChild(labelRight);
        const start = performance.now(); 
        const dur = 600;
        const easeOut = (t)=> 1 - Math.pow(1 - t, 3);
        function step(now){ 
            const t = Math.min(1, (now - start)/dur); 
            bar.setAttribute('width', String(Math.round(targetW * easeOut(t)))); 
            if(t<1) requestAnimationFrame(step); 
        }
        requestAnimationFrame(step);
    });
}

/* ==== GUARDADO / MESES ==== */
function calcularMes(m){
    const totalIng = m.ingresos.reduce((a,b)=>a+b.valor,0);
    let totalGas = m.gastos.reduce((a,b)=>a+(b.valor ?? b.valorTotal ?? 0),0);
    totalGas += getTotalGastosHormiga();
    m.saldo = totalIng - totalGas;
    m.liqPct = totalIng>0 ? Math.min(100, Math.max(0, (m.saldo/totalIng*100))) : 0;
    m.expPct = Math.min(100, Math.max(0, (100 - m.liqPct)));
    m.ahorroValor = Math.round(m.saldo * ((m.ahorroPct ?? 25)/100));
    m.gastoValor  = Math.round(m.saldo * ((m.gastoPct ?? 35)/100));
}

function distribuirCuotas(total, n){
    total = Math.max(0, Math.floor(total));
    n = Math.max(2, Math.floor(n));
    if (n > total) {
        n = Math.min(12, total);
        if (n < 2) return [total];
    }
    const base = Math.floor(total / n);
    const resto = total - base * n;
    const montos = Array(n).fill(base);
    for (let i = 0; i < resto; i++) montos[i] += 1;
    if (montos[n-1] > montos[0] * 1.5) {
        const promedio = Math.round(total / n);
        return Array(n).fill(promedio).map((val, idx) => idx === n-1 ? val + (total - promedio * n) : val);
    }
    return montos;
}

/* ==== SELECTOR DE MES ==== */
function refreshMesSelector(){
    const sel = document.getElementById('mesSelector');
    sel.innerHTML=''; 
    state.meses.forEach((m,i)=> sel.append(new Option(m.nombre, i)));
    sel.disabled = !state.editingEnabled || state.meses.length===0;
    updatePrimaVisibility(); 
    updateMesEditChip();
}

function updateMesEditChip(){
    const info = document.getElementById('mesEditInfo');
    if(!state.editingEnabled || !hasMonths()){ 
        info.style.display='none'; 
        return; 
    }
    const m = state.meses[selectedMonthIdx()];
    info.style.display=''; 
    document.getElementById('mesEditChip').textContent = `Editando: ${m.nombre}`;
}

function updatePrimaVisibility(){
    const sel = document.getElementById('mesSelector');
    if(sel.disabled) {
        document.getElementById('primaField').style.display='none';
        return;
    }
    const m = state.meses[parseInt(sel.value||'0',10)];
    const show = (m.monthIdx===5 || m.monthIdx===11);
    document.getElementById('primaField').style.display = show ? '' : 'none';
    document.getElementById('chkPrima').checked = !!m.prima;
}

/* ==== INLINE CREATE ==== */
function setupInlineCreate() {
    const selIng = document.getElementById('ingresoCategoria');
    const boxIng = document.getElementById('ingresoCreateBox');
    const inpIng = document.getElementById('ingresoNewConcept');
    const btnIngAdd = document.getElementById('btnIngresoAddConcept');
    const btnIngCancel = document.getElementById('btnIngresoCancelConcept');

    selIng.addEventListener('change', () => {
        const show = selIng.value === '__custom__';
        boxIng.style.display = show ? 'flex' : 'none';
        if(show) inpIng.focus();
    });
    
    btnIngAdd.addEventListener('click', () => {
        const val = (inpIng.value || '').trim();
        if (!val) return softToast('Ingresa un nombre válido', 'warn');
        if (!state.ingresoCats.includes(val)) state.ingresoCats.push(val);
        saveState(); 
        refreshIngresoCats();
        selIng.value = val; 
        boxIng.style.display = 'none'; 
        inpIng.value = '';
        softToast('Categoría de ingreso creada', 'ok');
    });
    
    btnIngCancel.addEventListener('click', () => { 
        boxIng.style.display = 'none'; 
        inpIng.value = ''; 
    });

    const selG = document.getElementById('gastoTipo');
    const boxG = document.getElementById('gastoTipoCreateBox');
    const inpG = document.getElementById('gastoNewTipo');
    const btnGAdd = document.getElementById('btnGastoAddTipo');
    const btnGCancel = document.getElementById('btnGastoCancelTipo');

    selG.addEventListener('change', () => {
        const show = selG.value === '__custom__';
        boxG.style.display = show ? 'flex' : 'none';
        if(show) inpG.focus();
    });
    
    btnGAdd.addEventListener('click', () => {
        const val = (inpG.value || '').trim();
        if (!val) return softToast('Ingresa un tipo válido', 'warn');
        if (!state.gastoTipos.includes(val)) state.gastoTipos.push(val);
        saveState(); 
        refreshGastoTipos();
        selG.value = val; 
        boxG.style.display = 'none'; 
        inpG.value = '';
        softToast('Tipo de gasto creado', 'ok');
    });
    
    btnGCancel.addEventListener('click', () => { 
        boxG.style.display = 'none'; 
        inpG.value = ''; 
    });

    const selInv = document.getElementById('invConcepto');
    const boxInv = document.getElementById('invCreateBox');
    const inpInv = document.getElementById('invNewConcept');
    const btnInvAdd = document.getElementById('btnInvAddConcept');
    const btnInvCancel = document.getElementById('btnInvCancelConcept');

    selInv.addEventListener('change', () => {
        const show = selInv.value === '__custom__';
        boxInv.style.display = show ? 'flex' : 'none';
        if(show) inpInv.focus();
    });
    
    btnInvAdd.addEventListener('click', () => {
        const val = (inpInv.value || '').trim();
        if (!val) return softToast('Ingresa un concepto válido', 'warn');
        if (!state.invCats.includes(val)) state.invCats.push(val);
        saveState(); 
        refreshInvCats();
        selInv.value = val; 
        boxInv.style.display = 'none'; 
        inpInv.value = '';
        softToast('Concepto de inversión creada', 'ok');
    });
    
    btnInvCancel.addEventListener('click', () => { 
        boxInv.style.display = 'none'; 
        inpInv.value = ''; 
    });
}

function updateGuardar12MesesButton() {
    const btnGuardar = document.getElementById('btnGuardar');
    if (state.doceMesesCreados) {
        btnGuardar.disabled = true;
        btnGuardar.classList.add('btn-12meses-disabled');
        btnGuardar.classList.remove('success');
        btnGuardar.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#9fb3c8" stroke-width="2"/></svg>12 Meses Creados`;
    } else {
        btnGuardar.disabled = false;
        btnGuardar.classList.remove('btn-12meses-disabled');
        btnGuardar.classList.add('success');
        btnGuardar.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#22c55e" stroke-width="2"/></svg>Guardar y crear 12 meses`;
    }
}

function showResetModal() {
    document.getElementById('resetModal').style.display = 'flex';
}

function hideResetModal() {
    document.getElementById('resetModal').style.display = 'none';
}

function resetAllData() {
    state = {
        createdAt: null,
        meses: [],
        ingresoCats: [...defaultIngresoCats],
        invCats: [...defaultInvCats],
        gastoTipos: [...defaultGastoTipos],
        inversiones: [],
        bankLastPct: 0,
        bankStyle: 'jar',
        bankGoalPct: 100,
        editingEnabled: false,
        doceMesesCreados: false,
        gastosHormiga: [],
        users: [],
        recoveryTokens: [],
        adminSecurityPhrases: {},
        sessionExpiry: null,
        userProfile: null,
        currentUser: null
    };
    tempIngresos = [];
    tempGastos = [];
    tempInversiones = [];
    saveState();
    updateAuthUI();
    ensureMainAdminExists();
    refreshCurrentPage();
    softToast('Todos los datos han sido restablecidos', 'ok');
    hideResetModal();
}

/* ==== EVENT LISTENERS ==== */
function setupEventListeners() {
    document.querySelectorAll('.tab').forEach(btn=> {
        btn.addEventListener('click', Utils.throttle(() => setTab(btn.dataset.tab), 100));
    });

    document.getElementById('btnResetData').addEventListener('click', showResetModal);
    document.getElementById('btnCancelReset').addEventListener('click', hideResetModal);
    document.getElementById('btnConfirmReset').addEventListener('click', resetAllData);

    document.getElementById('ahorroMetaPct').addEventListener('change', Utils.debounce(()=>{
        const val = parseFloat(document.getElementById('ahorroMetaPct').value || '100');
        state.bankGoalPct = Math.min(100, Math.max(10, val));
        saveState(); 
        renderAhorros();
    }, 300));
    
    document.getElementById('ahorroGraficaEstilo').addEventListener('change', Utils.debounce(()=>{
        const style = document.getElementById('ahorroGraficaEstilo').value || 'jar';
        state.bankStyle = style;
        saveState(); 
        renderAhorros();
    }, 300));

    document.getElementById('chkGastoCuotas').addEventListener('change', (e)=>{
        document.getElementById('gastoCuotas').disabled = !e.target.checked;
    });

    document.getElementById('btnAddIngreso').addEventListener('click', ()=>{
        if (!requireAuth()) return;
        const cat = document.getElementById('ingresoCategoria').value;
        const valorRaw = document.getElementById('ingresoValor').value;
        const valor = Utils.parseCurrency(valorRaw);
        if(!cat || cat==='__custom__'){ 
            softToast('Selecciona o crea una categoría','warn');
            return; 
        }
        if(!isFinite(valor) || valor<=0){ 
            softToast('Valor inválido','warn');
            return; 
        }
        getIngresos().push({cat, valor});
        document.getElementById('ingresoValor').value='';
        softToast('Ingreso agregado','ok'); 
        renderIngresos(); 
        renderAhorros();
        registerActivity();
    });

    document.getElementById('btnAddGasto').addEventListener('click', ()=>{
        if (!requireAuth()) return;
        const desc = (document.getElementById('gastoDesc').value||'').trim();
        const tipo = document.getElementById('gastoTipo').value;
        const valorRaw = document.getElementById('gastoValor').value;
        const valor = Utils.parseCurrency(valorRaw);
        const enCuotas = document.getElementById('chkGastoCuotas').checked;
        const cuotas = parseInt(document.getElementById('gastoCuotas').value||'0',10);
        
        if (!desc) {
            softToast('Agrega una descripción', 'warn');
            return;
        }
        if (desc.length > 30) {
            softToast('La descripción no puede exceder 30 caracteres', 'warn');
            return;
        }
        if (!tipo || tipo === '__custom__') {
            softToast('Selecciona o crea un tipo', 'warn');
            return;
        }
        if (!isFinite(valor) || valor <= 0) {
            softToast('Valor inválido. Ingresa un número mayor a 0', 'warn');
            return;
        }
        if (enCuotas && (cuotas < 2 || cuotas > 12)) {
            softToast('Número de cuotas inválido (2-12)', 'warn');
            return;
        }
        
        const gasto = {
            desc, tipo,
            valorTotal: valor,
            cuotas: enCuotas ? Math.min(12, cuotas) : undefined,
            pagado: false,
            fecha: Utils.fmtYYYYMMDD(Utils.hoyLocal())
        };
        getGastos().push(gasto);
        document.getElementById('gastoDesc').value = '';
        document.getElementById('gastoValor').value = '';
        document.getElementById('gastoCuotas').value = '';
        document.getElementById('chkGastoCuotas').checked = false;
        document.getElementById('gastoCuotas').disabled = true;
        softToast('Gasto agregado correctamente', 'ok');
        renderGastos();
        renderAhorros();
        registerActivity();
    });

    document.querySelector('#tablaGastos tbody').addEventListener('change', (e)=>{
        if (e.target.matches('input[type="checkbox"][data-pagado]')) {
            const idx = parseInt(e.target.dataset.pagado, 10);
            const arr = getGastosOrdenados();
            const gastosOriginal = getGastos();
            const gasto = arr[idx];
            if (gasto) {
                const originalIdx = gastosOriginal.findIndex(g => 
                    g.desc === gasto.desc && (g.valorTotal ?? g.valor) === (gasto.valorTotal ?? gasto.valor)
                );
                if (originalIdx !== -1) {
                    gastosOriginal[originalIdx].pagado = e.target.checked;
                    if (hasMonths()) saveState();
                }
            }
            renderPagoDonut();
            softToast(`Gasto marcado como ${e.target.checked ? 'pagado' : 'pendiente'}`, 'ok');
            registerActivity();
        }
    });

    document.querySelector('#tablaIngresos tbody').addEventListener('click', (e)=>{
        const btnDel = e.target.closest('button[data-del-ing]');
        if(btnDel){
            const idx = parseInt(btnDel.dataset.delIng,10);
            getIngresos().splice(idx,1);
            softToast('Ingreso eliminado','warn'); 
            renderIngresos(); 
            renderAhorros();
            registerActivity();
            return;
        }
        const btnEdit = e.target.closest('button[data-edit-ing]');
        if(btnEdit){
            const idx = parseInt(btnEdit.dataset.editIng,10);
            const it = getIngresos()[idx];
            const tr = btnEdit.closest('tr');
            tr.innerHTML = `<td><input class="input edit-ing-cat" type="text" value="${Utils.escapeHTML(it.cat)}"/></td>
                <td class="right"><input class="input edit-ing-valor" type="number" value="${it.valor}"/></td>
                <td class="right"><button class="btn success" data-save-ing="${idx}">Guardar</button><button class="btn ghost" data-cancel-ing="${idx}">Cancelar</button></td>`;
            return;
        }
        const btnSave = e.target.closest('button[data-save-ing]');
        if(btnSave){
            const idx = parseInt(btnSave.dataset.saveIng,10);
            const tr = btnSave.closest('tr');
            const cat = tr.querySelector('.edit-ing-cat').value.trim();
            const val = parseInt(tr.querySelector('.edit-ing-valor').value,10);
            if(!cat || !isFinite(val) || val<0){ softToast('Datos inválidos','warn'); return; }
            const arr = getIngresos();
            arr[idx].cat = cat;
            arr[idx].valor = val;
            if(hasMonths()) saveState();
            softToast('Ingreso actualizado','ok');
            renderIngresos();
            renderAhorros();
            registerActivity();
            return;
        }
        const btnCancel = e.target.closest('button[data-cancel-ing]');
        if(btnCancel){ renderIngresos(); return; }
    });

    document.querySelector('#tablaGastos tbody').addEventListener('click', (e)=>{
        const btnDel = e.target.closest('button[data-del-g]');
        if(btnDel){
            const idx = parseInt(btnDel.dataset.delG,10);
            const gastosOrdenados = getGastosOrdenados();
            const gastoAEliminar = gastosOrdenados[idx];
            const gastosOriginal = getGastos();
            const originalIdx = gastosOriginal.findIndex(g => 
                g.desc === gastoAEliminar.desc && (g.valorTotal ?? g.valor) === (gastoAEliminar.valorTotal ?? gastoAEliminar.valor)
            );
            if (originalIdx !== -1) gastosOriginal.splice(originalIdx, 1);
            softToast('Gasto eliminado','warn');
            renderGastos();
            renderAhorros();
            registerActivity();
            return;
        }
        const btnEdit = e.target.closest('button[data-edit-g]');
        if(btnEdit){
            const gastosOrdenados = getGastosOrdenados();
            const gasto = gastosOrdenados[parseInt(btnEdit.dataset.editG,10)];
            const gastosOriginal = getGastos();
            const originalIdx = gastosOriginal.findIndex(g => 
                g.desc === gasto.desc && (g.valorTotal ?? g.valor) === (gasto.valorTotal ?? gasto.valor)
            );
            if (originalIdx === -1) return;
            const it = gastosOriginal[originalIdx];
            const tr = btnEdit.closest('tr');
            const tipoOpts = state.gastoTipos.map(t=> `<option value="${Utils.escapeHTML(t)}" ${t===(it.tipo||'')?'selected':''}>${Utils.escapeHTML(t)}</option>`).join('');
            tr.innerHTML = `<td><input class="input edit-g-desc" type="text" maxlength="30" value="${Utils.escapeHTML(it.desc || '')}"/></td>
                <td><select class="input edit-g-tipo">${tipoOpts}</select></td>
                <td class="right"><input class="input edit-g-valor" type="number" value="${it.valorTotal ?? it.valor}"/></td>
                <td class="right">—</td
                <td class="right"><label><input type="checkbox" class="edit-g-pagado" ${it.pagado ? 'checked' : ''}/> Pagado</label></td
                <td class="right"><button class="btn success" data-save-g="${originalIdx}">Guardar</button><button class="btn ghost" data-cancel-g="${originalIdx}">Cancelar</button></td>`;
            return;
        }
        const btnSave = e.target.closest('button[data-save-g]');
        if(btnSave){
            const idx = parseInt(btnSave.dataset.saveG,10);
            const tr = btnSave.closest('tr');
            const desc = tr.querySelector('.edit-g-desc').value.trim();
            const tipo = tr.querySelector('.edit-g-tipo').value;
            const val = parseInt(tr.querySelector('.edit-g-valor').value,10);
            const pagado = tr.querySelector('.edit-g-pagado').checked;
            if(!desc || !tipo || !isFinite(val) || val<0){ softToast('Datos inválidos','warn'); return; }
            const arr = getGastos();
            const it = arr[idx];
            it.desc = desc;
            it.tipo = tipo;
            it.pagado = pagado;
            if('valorTotal' in it) it.valorTotal = val;
            else it.valor = val;
            if(hasMonths()) saveState();
            softToast('Gasto actualizado','ok');
            renderGastos();
            renderAhorros();
            registerActivity();
            return;
        }
        const btnCancel = e.target.closest('button[data-cancel-g]');
        if(btnCancel){ renderGastos(); return; }
    });

    document.getElementById('btnGuardarMes').addEventListener('click', ()=>{
        if(!hasMonths()) return softToast('Primero crea los 12 meses','warn');
        calcularMes(state.meses[selectedMonthIdx()]);
        saveState();
        softToast(`Mes guardado`,'ok');
        renderResumen();
        renderAhorros();
        updateResumenContext();
        registerActivity();
    });

    document.getElementById('btnGuardar').addEventListener('click', ()=>{
        if (!requireAuth()) return;
        const totalIngTemp = tempIngresos.reduce((a,b)=>a+b.valor,0);
        let totalGasTemp = tempGastos.reduce((a,b)=>a+(b.valorTotal||0),0);
        totalGasTemp += getTotalGastosHormiga();
        if(totalIngTemp===0 && totalGasTemp===0){ 
            return softToast('Agrega ingresos/gastos antes de guardar','warn'); 
        }
        if (state.doceMesesCreados) return softToast('Los 12 meses ya han sido creados', 'warn');
        
        if(!state.createdAt){
            const now = new Date(); 
            state.createdAt = now.toISOString();
            const startYear = now.getFullYear(); 
            const startIdx  = now.getMonth();
            state.meses = [];
            for(let i=0;i<12;i++){
                const idx = (startIdx + i) % 12; 
                const year = startYear + Math.floor((startIdx + i)/12);
                state.meses.push({
                    id: `${year}-${String(idx+1).padStart(2,'0')}`, 
                    nombre: `${Utils.monthNames[idx]} ${year}`,
                    year, monthIdx: idx, ingresos: [], gastos: [],
                    saldo: 0, liqPct: 0, expPct: 0, prima: false,
                    ahorroPct: 25, gastoPct: 35, ahorroValor: 0, ahorroTotal: 0, gastoValor: 0, disponible: 0, ahorroConfirmado: false
                });
            }
        }
        
        state.meses.forEach(m=>{ m.ingresos = tempIngresos.map(ing => ({cat: ing.cat, valor: ing.valor})); });
        state.meses.forEach(m=> m.gastos = []);
        
        tempGastos.forEach(g => {
            if (g.cuotas && g.cuotas > 1) {
                for (let k = 0; k < Math.min(12, g.cuotas); k++) {
                    if (k < state.meses.length) {
                        state.meses[k].gastos.push({
                            desc: g.desc, tipo: g.tipo, valor: g.valorTotal,
                            pagado: false, cuotaIdx: k + 1, cuotasTotal: Math.min(12, g.cuotas)
                        });
                    }
                }
            } else {
                state.meses.forEach(m => m.gastos.push({
                    desc: g.desc, tipo: g.tipo, valor: g.valorTotal, pagado: false
                }));
            }
        });
        
        if(tempInversiones.length>0 && state.meses[0]){
            tempInversiones.forEach(inv => { state.inversiones.push({...inv, monthId: state.meses[0].id}); });
            tempInversiones = [];
        }
        
        state.meses.forEach(m=> calcularMes(m));
        state.doceMesesCreados = true;
        saveState();
        refreshMesSelector();
        updateGuardar12MesesButton();
        softToast('12 meses creados y datos replicados','ok');
        setTab('resumen');
        renderResumen();
        renderAhorros();
        registerActivity();
    });

    document.getElementById('mesSelector').addEventListener('change', ()=>{
        updatePrimaVisibility();
        updateMesEditChip();
        renderIngresos();
        renderGastos();
        updateResumenContext();
        renderInversiones();
        renderAhorros();
        registerActivity();
    });

    document.getElementById('btnEditarMes').addEventListener('click', ()=>{
        if(!hasMonths()) return softToast('Primero crea los 12 meses','warn');
        state.editingEnabled = true;
        saveState();
        document.getElementById('mesSelector').disabled = false;
        updateMesEditChip();
        softToast('Edición de mes habilitada','ok');
        registerActivity();
    });

    document.getElementById('chkPrima').addEventListener('change', (e)=>{
        if(!hasMonths()) return;
        const m = state.meses[selectedMonthIdx()];
        m.prima = e.target.checked;
        if(m.prima){
            const salario = m.ingresos.find(x=> x.cat.toLowerCase()==='salario');
            if(!salario){
                m.prima=false;
                document.getElementById('chkPrima').checked=false;
                return softToast('Agrega "Salario" para calcular Prima','warn');
            }
            const primaVal = Math.round(salario.valor*0.5);
            const existing = m.ingresos.find(x=> x.cat.toLowerCase()==='prima');
            if(existing) existing.valor = primaVal;
            else m.ingresos.push({cat:'Prima', valor: primaVal});
            softToast('Prima calculada (50% del salario)','ok');
        }else{
            m.ingresos = m.ingresos.filter(x=> x.cat.toLowerCase()!=='prima');
            softToast('Prima removida','warn');
        }
        calcularMes(m);
        saveState();
        renderIngresos();
        renderResumen();
        renderAhorros();
        updateResumenContext();
        registerActivity();
    });

    document.getElementById('btnAddInv').addEventListener('click', ()=>{
        if (!requireAuth()) return;
        const concepto = document.getElementById('invConcepto').value;
        const valorRaw = document.getElementById('invValor').value;
        const valor = Utils.parseCurrency(valorRaw);
        const rentPct = parseFloat(document.getElementById('invRentMensual').value||'0');
        const compuesto = document.getElementById('invCompuesto').checked;
        const vencISO = document.getElementById('invVencimiento').value;
        
        if(!concepto || concepto==='__custom__') return softToast('Selecciona una inversión','warn');
        if(!isFinite(valor) || valor<=0) return softToast('Valor inválido','warn');
        if(!isFinite(rentPct) || rentPct < -100) return softToast('Rentabilidad inválida','warn');
        if(valor > dineroDisponibleActual()) return softToast('Valor supera el dinero disponible','warn');
        if(concepto==='CDT' && !vencISO) return softToast('Selecciona fecha de vencimiento','warn');
        
        if(hasMonths()){
            state.inversiones.push({
                concepto, valor, rentPct, compuesto,
                fechaInicio: Utils.fmtYYYYMMDD(Utils.hoyLocal()),
                monthId: currentMonthObj().id,
                vencISO: concepto==='CDT' ? vencISO : '',
                ahorroConfirmado: false
            });
            saveState();
        }else{
            tempInversiones.push({
                concepto, valor, rentPct, compuesto,
                fechaInicio: Utils.fmtYYYYMMDD(Utils.hoyLocal()),
                monthId: null,
                vencISO: concepto==='CDT' ? vencISO : '',
                ahorroConfirmado: false
            });
        }
        
        document.getElementById('invValor').value='';
        document.getElementById('invRentMensual').value='';
        document.getElementById('invCompuesto').checked=false;
        document.getElementById('invVencimiento').value='';
        softToast('Inversión agregada','ok');
        renderInversiones();
        renderAhorros();
        registerActivity();
    });

    document.querySelector('#tablaInv tbody').addEventListener('click', (e)=>{
        const btn = e.target.closest('button[data-del-inv]');
        if(!btn) return;
        const idx = parseInt(btn.dataset.delInv,10);
        if(hasMonths()){
            const mId = currentMonthObj().id;
            const indices = state.inversiones.reduce((acc, inv, i)=>{ if(inv.monthId===mId) acc.push(i); return acc; }, []);
            if(indices[idx] !== undefined) state.inversiones.splice(indices[idx],1);
            saveState();
        }else{
            tempInversiones.splice(idx,1);
        }
        softToast('Inversión eliminada','warn');
        renderInversiones();
        renderAhorros();
        registerActivity();
    });

    document.getElementById('btnAplicarPorcentajes').addEventListener('click', () => {
        if (!hasMonths()) return softToast('Primero crea los 12 meses', 'warn');
        const ah = Math.min(100, Math.max(0, parseFloat(document.getElementById('pctAhorroGlobal').value || '25')));
        const ga = Math.min(100, Math.max(0, parseFloat(document.getElementById('pctGastoGlobal').value || '35')));
        state.meses.forEach(m => { m.ahorroPct = ah; m.gastoPct = ga; calcularMes(m); });
        saveState();
        softToast('Porcentajes aplicados a todos los meses', 'ok');
        renderAhorros();
        renderResumen();
        updateResumenContext();
        registerActivity();
    });

    document.getElementById('logoutBtn').addEventListener('click', () => logout());
    document.getElementById('loginBtn').addEventListener('click', () => showLoginModal());

    ['click', 'keydown', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, registerActivity);
    });
}

/* ==== MODALES DE INFORMACIÓN ==== */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function showAboutModal() { showModal('aboutModal'); }
function showPrivacyModal() { showModal('privacyModal'); }
function showTermsModal() { showModal('termsModal'); }

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
        document.body.style.overflow = '';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay[style*="display: flex"]').forEach(modal => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
});

function getCurrentPage() {
    return document.body?.dataset?.page || window.APP_INITIAL_TAB || 'entrada';
}

function getCurrentPageModule() {
    return (window.PageModules || {})[getCurrentPage()] || null;
}

function navigateToPage(page) {
    const link = document.querySelector(`.tab[data-tab="${page}"]`);
    if (link?.href) window.location.href = link.href;
}

function applyCurrentPageVisibility(page) {
    document.querySelectorAll('.tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.tab === page);
    });
    document.querySelectorAll('section').forEach((section) => {
        section.style.display = section.id === page ? '' : 'none';
    });
}

function refreshCurrentPage() {
    const pageModule = getCurrentPageModule();
    if (pageModule && typeof pageModule.activate === 'function') {
        pageModule.activate();
    }
}

function setupSharedEventListeners() {
    document.getElementById('btnResetData')?.addEventListener('click', showResetModal);
    document.getElementById('btnCancelReset')?.addEventListener('click', hideResetModal);
    document.getElementById('btnConfirmReset')?.addEventListener('click', resetAllData);
    document.getElementById('logoutBtn')?.addEventListener('click', () => logout());
    document.getElementById('loginBtn')?.addEventListener('click', () => showLoginModal());

    ['click', 'keydown', 'scroll', 'mousemove'].forEach((eventName) => {
        document.addEventListener(eventName, registerActivity);
    });
}

/* ==== INICIALIZACIÓN ==== */
function init(){
    const initialTab = getCurrentPage();
    applyCurrentPageVisibility(initialTab);
    setupSharedEventListeners();
    setupCurrencyInputs();
    setupLoginTabs();
    setupManualLoginEvents();
    ensureMainAdminExists();
    updateAuthUI();
    
    const tips = [
        "Un presupuesto te da libertad, no límites.",
        "El ahorro es la base de la libertad financiera.",
        "Pequeños gastos diarios pueden convertirse en grandes ahorros anuales.",
        "Invertir en educación financiera es la mejor inversión.",
        "Controla tus gastos o ellos te controlarán a ti."
    ];
    document.getElementById('tipText').textContent = tips[Math.floor(Math.random() * tips.length)];
    
    if (checkAuth()) updateAuthUI();
    
    if (window.location.search.includes('reset=')) {
        resetPasswordWithToken();
    }

    getCurrentPageModule()?.init?.();
}

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    if (!menuToggle || !mainNav) return;
    const navTabs = mainNav.querySelectorAll('.tab');

    menuToggle.addEventListener('click', () => { mainNav.classList.toggle('active'); });

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (window.getComputedStyle(menuToggle).display !== 'none') mainNav.classList.remove('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) mainNav.classList.remove('active');
    });
});

init();
