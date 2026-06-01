/* =======================================================
   pages/login/login.js
   Lógica de autenticación: Google OAuth simulado,
   login manual, logout y perfil de usuario (HU-05/06/07)
   ======================================================= */

function loginWithGoogle() {
    const emailInput = document.getElementById('loginEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email || !email.includes('@')) {
        softToast('Por favor ingresa un email válido', 'warn');
        return;
    }
    state.currentUser = {
        email,
        name: email.split('@')[0],
        picture: null,
        loggedAt: new Date().toISOString()
    };
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 15);
    state.sessionExpiry = expiryDate.toISOString();
    saveState();
    hideLoginModal();
    updateAuthUI();
    softToast(`Bienvenido ${state.currentUser.name}`, 'ok');
    if (!state.userProfile) setTimeout(() => showProfileModal(), 500);
}

function hideLoginModal() {
    window.location.href = '../../index.html';
}

/* ==== PERFIL DE USUARIO (HU-05) ==== */
function showProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    if (state.userProfile) {
        document.getElementById('profileAge').value    = state.userProfile.ageRange || '';
        document.getElementById('profileGender').value = state.userProfile.gender || '';
        document.getElementById('profileSalary').value = state.userProfile.salaryRange || '';
    } else {
        document.getElementById('profileAge').value    = '';
        document.getElementById('profileGender').value = '';
        document.getElementById('profileSalary').value = '';
    }
    modal.style.display = 'flex';
}

function hideProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'none';
}

function saveUserProfile() {
    state.userProfile = {
        ageRange:    document.getElementById('profileAge').value || null,
        gender:      document.getElementById('profileGender').value || null,
        salaryRange: document.getElementById('profileSalary').value || null,
        updatedAt:   new Date().toISOString()
    };
    saveState();
    hideProfileModal();
    softToast('Perfil guardado correctamente', 'ok');
}
