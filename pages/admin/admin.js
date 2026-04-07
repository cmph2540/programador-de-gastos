window.APP_INITIAL_TAB = 'admin';

(window.PageModules = window.PageModules || {}).admin = (() => {
    function adminResetPassword(email) {
        const user = state.users.find((item) => item.email === email);
        if (!user) return;
        const tempPassword = `${Math.random().toString(36).substring(2, 8)}123`;
        user.password = tempPassword;
        saveState();
        softToast(`Nueva contraseña para ${email}: ${tempPassword}`, 'ok');
    }

    function adminAssignRole(email) {
        const user = state.users.find((item) => item.email === email);
        if (!user) return;
        if (user.role === 'admin') return softToast('Ya es administrador', 'warn');
        const phrase = prompt('Ingresa una frase de seguridad para este administrador:');
        if (!phrase || phrase.length < 4) return softToast('Mínimo 4 caracteres', 'warn');
        user.role = 'admin';
        state.adminSecurityPhrases[email] = phrase;
        saveState();
        renderAdminPanel();
        softToast(`${email} ahora es administrador`, 'ok');
    }

    function renderAdminPanel() {
        if (!isAdmin()) return;
        const tbody = document.querySelector('#tablaAdminUsers tbody');
        if (!tbody) return;
        document.getElementById('adminTotalUsers').textContent = state.users.length;
        document.getElementById('adminActiveSessions').textContent = checkAuth() ? '1' : '0';
        tbody.innerHTML = state.users.map((user) => `
            <tr>
                <td>${Utils.escapeHTML(user.name || user.email.split('@')[0])}</td>
                <td>${Utils.escapeHTML(user.email)}</td>
                <td><span class="admin-role-badge ${user.role === 'admin' ? 'admin' : 'user'}">${user.role === 'admin' ? 'Administrador' : 'Usuario'}</span></td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—'}</td>
                <td>${user.method === 'google' ? 'Google' : 'Manual'}</td>
                <td>
                    <button class="btn small admin-action-btn admin-reset-btn" data-admin-reset="${user.email}">Reset pass</button>
                    ${user.role !== 'admin' && user.email !== MAIN_ADMIN_EMAIL ? `<button class="btn small admin-action-btn admin-assign-btn" data-admin-assign="${user.email}">Asignar Admin</button>` : ''}
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-admin-reset]').forEach((btn) => btn.addEventListener('click', () => adminResetPassword(btn.dataset.adminReset)));
        tbody.querySelectorAll('[data-admin-assign]').forEach((btn) => btn.addEventListener('click', () => adminAssignRole(btn.dataset.adminAssign)));
    }

    function init() {
        if (!isAdmin()) {
            softToast('Acceso denegado. Se requieren permisos de administrador.', 'danger');
            navigateToPage('entrada');
            return;
        }
        renderAdminPanel();
    }

    return { init, activate: renderAdminPanel };
})();
