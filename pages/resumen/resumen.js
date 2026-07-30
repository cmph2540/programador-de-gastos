window.APP_INITIAL_TAB = 'resumen';

(window.PageModules = window.PageModules || {}).resumen = (() => {
    function renderRestanteChart() {
        const svg = document.getElementById('restanteChart');
        const total = document.getElementById('restanteTotal');
        if (!svg || !total) return;

        const meses = getOrderedMonths();
        const width = 800;
        const height = 300;
        const padding = { top: 28, right: 22, bottom: 42, left: 28 };
        const chartHeight = height - padding.top - padding.bottom;
        const chartWidth = width - padding.left - padding.right;
        const max = Math.max(1, ...meses.map((mes) => mes.restanteCierre || 0));
        const totalRestante = meses.reduce((sum, mes) => sum + (mes.restanteCierre || 0), 0);

        total.textContent = Utils.fmtCOP.format(totalRestante);
        svg.innerHTML = '<rect width="800" height="300" rx="12" fill="#0b1323" stroke="#1c2940"></rect>';
        if (!meses.length) {
            svg.insertAdjacentHTML('beforeend', '<text x="400" y="150" text-anchor="middle" fill="#9fb3c8" font-size="14">Sin datos para mostrar</text>');
            return;
        }

        const gap = chartWidth / meses.length;
        const barWidth = Math.max(10, Math.min(42, gap * .62));
        meses.forEach((mes, index) => {
            const restante = Math.max(0, mes.restanteCierre || 0);
            const barHeight = (restante / max) * chartHeight;
            const x = padding.left + index * gap + (gap - barWidth) / 2;
            const y = padding.top + chartHeight - barHeight;
            const label = (mes.nombre || '').split(' ')[0].slice(0, 3);
            svg.insertAdjacentHTML('beforeend', `
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${restante > 0 ? '#22c55e' : '#ef4444'}" opacity=".85"><title>${Utils.escapeHTML(mes.nombre)}: ${Utils.escapeHTML(Utils.fmtCOP.format(restante))}</title></rect>
                <text x="${x + barWidth / 2}" y="${height - 16}" text-anchor="middle" fill="#9fb3c8" font-size="10">${Utils.escapeHTML(label)}</text>
            `);
        });
    }

    function renderResumen() {
        const tbody = document.querySelector('#tablaResumen tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (state.meses.length === 0) return;

        // Recalcula los valores derivados de todos los meses antes de
        // dibujarlos, incluyendo datos creados con fórmulas anteriores.
        recalcularSaldosMeses();
        const mesesOrd = [...state.meses].sort((a, b) => (a.year - b.year) || (a.monthIdx - b.monthIdx));
        const dineroVals = mesesOrd.map((mes) => mes.saldo);
        const sortedVals = [...dineroVals].sort((a, b) => a - b);
        const lows = new Set(sortedVals.slice(0, 2));
        const highs = new Set(sortedVals.slice(-2));

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        tbody.innerHTML = mesesOrd.map((mes) => `
            <tr class="${mes.monthIdx === currentMonth && mes.year === currentYear ? 'mes-actual' : ''}">
                <td>${Utils.escapeHTML(mes.nombre)}</td>
                <td class="right"><span class="chip ${highs.has(mes.saldo) ? 'ok' : lows.has(mes.saldo) ? 'danger' : ''}">${Utils.fmtCOP.format(mes.saldo)}</span></td>
                <td>
                    <div class="resumen-indicador resumen-indicador-liquidez">
                        <div class="bar barraLiquidez"><div class="fill liq" style="width:${Math.max(0, Math.min(100, mes.liqPct)).toFixed(0)}%"></div></div>
                        <div class="muted porcentajeLiquidez ${mes.liqPct < 50 ? 'chip warn' : ''}">${Utils.fmtPct2(mes.liqPct)}</div>
                    </div>
                </td>
                <td>
                    <div class="resumen-indicador resumen-indicador-gastos">
                        <div class="bar barraGastos"><div class="fill exp" style="width:${Math.max(0, Math.min(100, mes.expPct)).toFixed(0)}%"></div></div>
                        <div class="muted porcentajeGastos ${mes.expPct > 50 ? 'chip warn' : ''}">${Utils.fmtPct2(mes.expPct)}</div>
                    </div>
                </td>
            </tr>
        `).join('');
        renderRestanteChart();
    }

    return {
        init: renderResumen,
        activate: renderResumen
    };
})();
