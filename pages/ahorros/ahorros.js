window.APP_INITIAL_TAB = 'ahorros';

(window.PageModules = window.PageModules || {}).ahorros = (() => {
    const SHAPE_CONFIG = {
        jar: { bottomY: 145, topY: 40, height: 105 },
        pig: { bottomY: 135, topY: 50, height: 85 },
        chest: { bottomY: 140, topY: 45, height: 95 }
    };

    function getShapeGeom() {
        const type = document.getElementById('ahorroGraficaEstilo')?.value || 'jar';
        const config = SHAPE_CONFIG[type] || SHAPE_CONFIG.jar;
        return { fillX: 0, fillW: 200, baseY: config.bottomY, baseH: config.height };
    }

    function spawnCoins(geom) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const container = document.getElementById('bankCoins');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 6; i += 1) {
            const cx = geom.fillX + 4 + Math.random() * (geom.fillW - 8);
            const coin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            coin.setAttribute('cx', String(cx));
            coin.setAttribute('cy', String(geom.baseY));
            coin.setAttribute('r', '3.2');
            coin.setAttribute('fill', '#f59e0b');
            coin.setAttribute('stroke', '#c79a1a');
            coin.setAttribute('stroke-width', '0.7');
            container.appendChild(coin);
            const start = performance.now();
            const dur = 450 + Math.random() * 350;
            const endY = geom.baseY + geom.baseH - Math.random() * geom.baseH * 0.35;
            const ease = (t) => 1 - Math.pow(1 - t, 2);
            function step(now) {
                const t = Math.min(1, (now - start) / dur);
                coin.setAttribute('cy', String(geom.baseY + (endY - geom.baseY) * ease(t)));
                if (t < 1) requestAnimationFrame(step);
                else setTimeout(() => coin.remove(), 500);
            }
            requestAnimationFrame(step);
        }
    }

    function animateBankFill(fromPct, toPct, geom, durMs = 550, onDone = null) {
        const clamp = (pct) => Math.min(100, Math.max(0, pct));
        const fillRect = document.getElementById('bankFill');
        const centerText = document.getElementById('bankCenterText');
        const chip = document.getElementById('bankPctChip');
        if (!fillRect || !centerText || !chip) return;
        const start = performance.now();
        spawnCoins(geom);
        function step(now) {
            const t = Math.min(1, (now - start) / durMs);
            const current = clamp(fromPct) + (clamp(toPct) - clamp(fromPct)) * (1 - Math.pow(1 - t, 3));
            const pxHeight = (current / 100) * geom.baseH;
            fillRect.setAttribute('y', String(geom.baseY - pxHeight));
            fillRect.setAttribute('height', String(pxHeight));
            centerText.textContent = `${current.toFixed(0)}%`;
            chip.textContent = `${current.toFixed(0)}% cumplimiento`;
            if (t < 1) requestAnimationFrame(step);
            else if (typeof onDone === 'function') onDone();
        }
        requestAnimationFrame(step);
    }

    function renderAhorros() {
        const tbody = document.querySelector('#tablaAhorros tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (state.meses.length === 0) return;

        let carryPrev = 0;
        let sumPlan = 0;
        let sumAhorrado = 0;
        let sumAhorradoConfirmado = 0;
        const mesesOrd = [...state.meses].sort((a, b) => (a.year - b.year) || (a.monthIdx - b.monthIdx));

        mesesOrd.forEach((mes) => {
            mes.ahorroValor = Math.round(mes.saldo * ((Math.min(100, Math.max(0, mes.ahorroPct)) || 0) / 100));
            mes.gastoValor = Math.round(mes.saldo * ((Math.min(100, Math.max(0, mes.gastoPct)) || 0) / 100));
            const invMes = state.inversiones.filter((inv) => inv.monthId === mes.id).reduce((acc, inv) => acc + inv.valor, 0);
            mes.disponible = Math.max(0, Math.round(mes.saldo - (mes.ahorroTotal + mes.gastoValor + invMes) + carryPrev));
            carryPrev = mes.disponible;
            sumPlan += mes.ahorroValor;
            sumAhorrado += mes.ahorroTotal || 0;
            if (mes.ahorroConfirmado) sumAhorradoConfirmado += mes.ahorroTotal || 0;
        });

        tbody.innerHTML = mesesOrd.map((mes) => `
            <tr>
                <td>${Utils.escapeHTML(mes.nombre)}</td>
                <td class="right">${Utils.fmtCOP.format(mes.saldo)}</td>
                <td class="right mobile-collapse-label" data-label="% Ahorrar"><input class="input input-pct-ah" type="number" min="0" max="100" step="1" value="${mes.ahorroPct}" data-m="${Utils.escapeHTML(mes.id)}"></td>
                <td class="right">${Utils.fmtCOP.format(mes.ahorroValor)}</td>
                <td class="right ${mes.ahorroConfirmado ? 'col-ahorro-confirmado confirmado' : 'col-ahorro-confirmado'}"><input class="input input-ah-total" type="number" min="0" step="1" value="${mes.ahorroTotal}" data-m="${Utils.escapeHTML(mes.id)}"></td>
                <td class="right">
                    <div class="confirm-ahorro-container">
                        <label class="confirm-ahorro-label">
                            <input type="checkbox" class="confirm-ahorro-checkbox" data-m="${Utils.escapeHTML(mes.id)}" ${mes.ahorroConfirmado ? 'checked' : ''} ${mes.ahorroTotal > 0 ? '' : 'disabled'}>
                            <span>${mes.ahorroConfirmado ? '✓ Confirmado' : 'Ahorrado'}</span>
                        </label>
                    </div>
                </td>
                <td class="right mobile-collapse-label" data-label="% Gastar"><input class="input input-pct-g" type="number" min="0" max="100" step="1" value="${mes.gastoPct}" data-m="${Utils.escapeHTML(mes.id)}"></td>
                <td class="right">${Utils.fmtCOP.format(mes.gastoValor)}</td>
                <td class="right">${Utils.fmtCOP.format(mes.disponible)}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.input-pct-ah').forEach((input) => input.addEventListener('change', () => {
            const mes = state.meses.find((item) => item.id === input.dataset.m);
            mes.ahorroPct = Math.round(Math.min(100, Math.max(0, parseFloat(input.value || '0'))));
            saveState();
            renderAhorros();
        }));

        tbody.querySelectorAll('.input-pct-g').forEach((input) => input.addEventListener('change', () => {
            const mes = state.meses.find((item) => item.id === input.dataset.m);
            mes.gastoPct = Math.round(Math.min(100, Math.max(0, parseFloat(input.value || '0'))));
            saveState();
            renderAhorros();
        }));

        tbody.querySelectorAll('.input-ah-total').forEach((input) => input.addEventListener('change', () => {
            const mes = state.meses.find((item) => item.id === input.dataset.m);
            mes.ahorroTotal = Math.max(0, parseInt(input.value || '0', 10) || 0);
            if (mes.ahorroTotal < mes.ahorroValor) mes.ahorroConfirmado = false;
            saveState();
            renderAhorros();
        }));

        tbody.querySelectorAll('.confirm-ahorro-checkbox').forEach((checkbox) => checkbox.addEventListener('change', (event) => {
            const mes = state.meses.find((item) => item.id === event.target.dataset.m);
            mes.ahorroConfirmado = event.target.checked;
            if (event.target.checked && mes.ahorroTotal < mes.ahorroValor) mes.ahorroTotal = mes.ahorroValor;
            saveState();
            renderAhorros();
        }));

        const geom = getShapeGeom();
        const visualGoalPct = Math.min(100, Math.max(0, state.bankGoalPct || parseFloat(document.getElementById('ahorroMetaPct').value || '100')));
        const goalY = geom.baseY - ((visualGoalPct / 100) * geom.baseH);
        document.getElementById('bankGoalLine')?.setAttribute('y1', String(goalY));
        document.getElementById('bankGoalLine')?.setAttribute('y2', String(goalY));

        const pct = sumPlan > 0 ? Math.min(100, Math.max(0, (sumAhorradoConfirmado / sumPlan) * 100)) : 0;
        const amounts = document.getElementById('bankAmounts');
        if (amounts) {
            let text = `Total ahorrado confirmado: ${Utils.fmtCOP.format(sumAhorradoConfirmado)} de ${Utils.fmtCOP.format(sumPlan)}`;
            if (sumAhorrado > sumAhorradoConfirmado) text += ` (${Utils.fmtCOP.format(sumAhorrado - sumAhorradoConfirmado)} pendiente)`;
            amounts.textContent = text;
        }

        animateBankFill(state.bankLastPct || 0, pct, geom, 550, () => {
            state.bankLastPct = pct;
            saveState();
        });
    }

    function setupListeners() {
        document.getElementById('ahorroMetaPct').addEventListener('change', Utils.debounce(() => {
            state.bankGoalPct = Math.min(100, Math.max(10, parseFloat(document.getElementById('ahorroMetaPct').value || '100')));
            saveState();
            renderAhorros();
        }, 300));

        document.getElementById('ahorroGraficaEstilo').addEventListener('change', Utils.debounce(() => {
            state.bankStyle = document.getElementById('ahorroGraficaEstilo').value || 'jar';
            saveState();
            renderAhorros();
        }, 300));

        document.getElementById('btnAplicarPorcentajes').addEventListener('click', () => {
            if (!hasMonths()) return softToast('Primero crea los 12 meses', 'warn');
            const ahorro = Math.min(100, Math.max(0, parseFloat(document.getElementById('pctAhorroGlobal').value || '25')));
            const gasto = Math.min(100, Math.max(0, parseFloat(document.getElementById('pctGastoGlobal').value || '35')));
            state.meses.forEach((mes) => {
                mes.ahorroPct = ahorro;
                mes.gastoPct = gasto;
                calcularMes(mes);
            });
            saveState();
            renderAhorros();
            softToast('Porcentajes aplicados a todos los meses', 'ok');
        });
    }

    function activate() {
        document.getElementById('ahorroGraficaEstilo').value = state.bankStyle || 'jar';
        document.getElementById('ahorroMetaPct').value = state.bankGoalPct || 100;
        renderAhorros();
    }

    function init() {
        setupListeners();
        activate();
    }

    return { init, activate };
})();
