window.APP_INITIAL_TAB = 'inversiones';

(window.PageModules = window.PageModules || {}).inversiones = (() => {
    function refreshInvCats() {
        const sel = document.getElementById('invConcepto');
        if (!sel) return;
        sel.innerHTML = '';
        sel.append(new Option('Selecciona inversión', '', true, true));
        state.invCats.forEach((cat) => sel.append(new Option(cat, cat)));
        sel.append(new Option('➕ Crear nuevo concepto…', '__custom__'));
    }

    function getInversionesMes() {
        return hasMonths() ? state.inversiones.filter((inv) => inv.monthId === currentMonthObj().id) : tempInversiones;
    }

    function totalInvertidoMes() {
        return getInversionesMes().reduce((acc, inv) => acc + (inv.valor || 0), 0);
    }

    function dineroDisponibleActualInv() {
        if (hasMonths()) {
            const month = currentMonthObj();
            const totalIng = month.ingresos.reduce((acc, item) => acc + item.valor, 0);
            let totalGas = month.gastos.reduce((acc, item) => acc + (item.valorTotal ?? item.valor ?? 0), 0);
            totalGas += getTotalGastosHormiga();
            return Math.max(0, Math.round(totalIng - totalGas - (month.ahorroTotal || 0) - (month.gastoValor || 0) - totalInvertidoMes()));
        }
        return Math.max(0, Math.round(tempIngresos.reduce((acc, item) => acc + item.valor, 0) - tempGastos.reduce((acc, item) => acc + (item.valorTotal || 0), 0) - totalInvertidoMes()));
    }

    function getRandomAdvice() {
        return consejosInv[Math.floor(Math.random() * consejosInv.length)];
    }

    function showSingleAdvice() {
        const el = document.getElementById('singleAdviceText');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => {
            el.textContent = getRandomAdvice();
            el.style.opacity = '1';
        }, 300);
    }

    function startAdviceRotation() {
        showSingleAdvice();
        if (adviceTimer) clearInterval(adviceTimer);
        adviceTimer = setInterval(showSingleAdvice, 300000);
    }

    function renderInvTop5Chart() {
        const svg = document.getElementById('invTop5Svg');
        if (!svg) return;
        const invs = [...state.inversiones].sort((a, b) => b.valor - a.valor).slice(0, 5);
        const total = invs.reduce((acc, inv) => acc + inv.valor, 0);
        svg.innerHTML = '';
        if (!invs.length || total <= 0) {
            svg.setAttribute('viewBox', '0 0 520 160');
            svg.innerHTML = '<rect x="0" y="0" width="520" height="160" rx="12" fill="#0b1323" stroke="#1c2940"></rect><text x="260" y="80" text-anchor="middle" dominant-baseline="middle" fill="#9fb3c8" font-size="13" font-weight="700">Sin datos</text>';
            return;
        }
        svg.setAttribute('viewBox', '0 0 520 220');
        svg.innerHTML = '<rect x="0" y="0" width="520" height="220" rx="12" fill="#0b1323" stroke="#1c2940"></rect>';
        invs.forEach((inv, idx) => {
            const y = 24 + idx * 38;
            const pct = inv.valor / total;
            const width = Math.round(210 * pct);
            svg.insertAdjacentHTML('beforeend', `
                <text x="170" y="${y + 14}" text-anchor="end" dominant-baseline="middle" fill="#eaf1f9" font-size="12" font-weight="700">${Utils.escapeHTML(inv.concepto.length > 20 ? `${inv.concepto.slice(0, 20)}...` : inv.concepto)}</text>
                <rect x="180" y="${y}" width="210" height="28" rx="10" fill="#0d1729" stroke="#223b60"></rect>
                <rect x="180" y="${y}" width="${width}" height="28" rx="10" fill="${Utils.palette[idx % Utils.palette.length]}"></rect>
                <text x="${180 + width + 8}" y="${y + 14}" dominant-baseline="middle" fill="#eaf1f9" font-size="11" font-weight="700">${Utils.fmtCOP.format(inv.valor)} · ${(pct * 100).toFixed(0)}%</text>
            `);
        });
    }

    function renderInversiones() {
        document.getElementById('invDineroDisponible').textContent = Utils.fmtCOP.format(dineroDisponibleActualInv());
        document.getElementById('invMesLabel').textContent = hasMonths() ? `Mes en edición: ${currentMonthObj().nombre}` : 'Mes actual (temporal)';
        document.getElementById('invFechaInicio').value = Utils.fmtYYYYMMDD(Utils.hoyLocal());
        const tbody = document.querySelector('#tablaInv tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let totalValor = 0;
        let totalMensual = 0;
        let totalAnual = 0;
        const totalInvAll = state.inversiones.reduce((acc, inv) => acc + inv.valor, 0) || 1;

        getInversionesMes().forEach((inv, idx) => {
            const rentPct = typeof inv.rentPct === 'number' ? inv.rentPct : 0;
            const monthlyRate = Math.max(-100, rentPct) / 100;
            const rendimientoMes = Math.round(inv.valor * monthlyRate);
            let totalAnualInv = 0;
            let saldoFinal = inv.valor;
            if (inv.compuesto) {
                let saldo = inv.valor;
                for (let month = 0; month < 12; month += 1) {
                    const rendimiento = Math.round(saldo * monthlyRate);
                    totalAnualInv += rendimiento;
                    saldo += rendimiento;
                }
                saldoFinal = saldo;
            } else {
                totalAnualInv = rendimientoMes * 12;
                saldoFinal = inv.valor + totalAnualInv;
            }
            totalValor += inv.valor;
            totalMensual += rendimientoMes;
            totalAnual += totalAnualInv;
            const estado = inv.concepto === 'CDT' ? estadoCDT(inv.vencISO) : 'Activa';
            const stateClass = estado === 'Próximo a vencer' ? 'chip warn' : estado === 'Vencido' ? 'chip danger' : 'chip ok';
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td title="${Utils.escapeHTML(inv.concepto)}">${Utils.escapeHTML(inv.concepto)}</td>
                    <td class="right">${Utils.fmtCOP.format(inv.valor)}</td>
                    <td class="right">${rentPct.toFixed(2)}%</td>
                    <td class="right">${Utils.fmtCOP.format(rendimientoMes)}</td>
                    <td class="right">${Utils.fmtCOP.format(totalAnualInv)}</td>
                    <td class="right">${Math.min(100, Math.max(0, (inv.valor / totalInvAll) * 100)).toFixed(0)}%</td>
                    <td class="right">${Utils.fmtCOP.format(saldoFinal)}</td>
                    <td>${Utils.escapeHTML(inv.fechaInicio || '—')}</td>
                    <td>${Utils.escapeHTML(inv.vencISO || '—')}</td>
                    <td><span class="${stateClass}">${Utils.escapeHTML(estado)}</span></td>
                    <td class="right">${inv.compuesto ? 'Sí' : 'No'}</td>
                    <td class="right"><button class="btn warn" data-del-inv="${idx}">Quitar</button></td>
                </tr>
            `);
        });

        document.getElementById('totalInvertido').textContent = Utils.fmtCOP.format(totalValor);
        document.getElementById('totalRendimientoMensual').textContent = Utils.fmtCOP.format(totalMensual);
        document.getElementById('totalRendimientoAnual').textContent = Utils.fmtCOP.format(totalAnual);
        document.getElementById('totalInvMasUtilidad').textContent = Utils.fmtCOP.format(totalValor + totalAnual);
        document.getElementById('invTotalChip').textContent = `Total invertido: ${Utils.fmtCOP.format(state.inversiones.reduce((acc, inv) => acc + inv.valor, 0))}`;
        renderInvTop5Chart();
    }

    function setupInlineCreate() {
        const sel = document.getElementById('invConcepto');
        const box = document.getElementById('invCreateBox');
        const input = document.getElementById('invNewConcept');
        sel.addEventListener('change', () => {
            const show = sel.value === '__custom__';
            box.style.display = show ? 'flex' : 'none';
            if (show) input.focus();
        });
        document.getElementById('btnInvAddConcept').addEventListener('click', () => {
            const value = (input.value || '').trim();
            if (!value) return softToast('Ingresa un concepto válido', 'warn');
            if (!state.invCats.includes(value)) state.invCats.push(value);
            saveState();
            refreshInvCats();
            sel.value = value;
            box.style.display = 'none';
            input.value = '';
            softToast('Concepto de inversión creado', 'ok');
        });
        document.getElementById('btnInvCancelConcept').addEventListener('click', () => {
            box.style.display = 'none';
            input.value = '';
        });
    }

    function setupListeners() {
        document.getElementById('btnAddInv').addEventListener('click', () => {
            if (!requireAuth()) return;
            const concepto = document.getElementById('invConcepto').value;
            const valor = Utils.parseCurrency(document.getElementById('invValor').value);
            const rentPct = parseFloat(document.getElementById('invRentMensual').value || '0');
            const compuesto = document.getElementById('invCompuesto').checked;
            const vencISO = document.getElementById('invVencimiento').value;
            if (!concepto || concepto === '__custom__') return softToast('Selecciona una inversión', 'warn');
            if (!isFinite(valor) || valor <= 0) return softToast('Valor inválido', 'warn');
            if (!isFinite(rentPct) || rentPct < -100) return softToast('Rentabilidad inválida', 'warn');
            if (valor > dineroDisponibleActualInv()) return softToast('Valor supera el dinero disponible', 'warn');
            if (concepto === 'CDT' && !vencISO) return softToast('Selecciona fecha de vencimiento', 'warn');
            const inversion = { concepto, valor, rentPct, compuesto, fechaInicio: Utils.fmtYYYYMMDD(Utils.hoyLocal()), monthId: hasMonths() ? currentMonthObj().id : null, vencISO: concepto === 'CDT' ? vencISO : '' };
            if (hasMonths()) {
                state.inversiones.push(inversion);
                saveState();
            } else {
                tempInversiones.push(inversion);
            }
            document.getElementById('invValor').value = '';
            document.getElementById('invRentMensual').value = '';
            document.getElementById('invCompuesto').checked = false;
            document.getElementById('invVencimiento').value = '';
            renderInversiones();
            softToast('Inversión agregada', 'ok');
        });

        document.querySelector('#tablaInv tbody').addEventListener('click', (event) => {
            const btn = event.target.closest('button[data-del-inv]');
            if (!btn) return;
            const idx = parseInt(btn.dataset.delInv, 10);
            if (hasMonths()) {
                const monthId = currentMonthObj().id;
                const indices = state.inversiones.reduce((acc, inv, invIdx) => {
                    if (inv.monthId === monthId) acc.push(invIdx);
                    return acc;
                }, []);
                if (indices[idx] !== undefined) state.inversiones.splice(indices[idx], 1);
                saveState();
            } else {
                tempInversiones.splice(idx, 1);
            }
            renderInversiones();
            softToast('Inversión eliminada', 'warn');
        });
    }

    function activate() {
        refreshInvCats();
        renderInversiones();
        startAdviceRotation();
    }

    function init() {
        setupInlineCreate();
        setupListeners();
        activate();
    }

    return { init, activate };
})();
