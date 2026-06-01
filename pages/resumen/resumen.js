window.APP_INITIAL_TAB = 'resumen';

(window.PageModules = window.PageModules || {}).resumen = (() => {
    function renderResumen() {
        const tbody = document.querySelector('#tablaResumen tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (state.meses.length === 0) return;

        const mesesOrd = [...state.meses].sort((a, b) => (a.year - b.year) || (a.monthIdx - b.monthIdx));
        const dineroVals = mesesOrd.map((mes) => mes.saldo);
        const sortedVals = [...dineroVals].sort((a, b) => a - b);
        const lows = new Set(sortedVals.slice(0, 2));
        const highs = new Set(sortedVals.slice(-2));

        tbody.innerHTML = mesesOrd.map((mes) => `
            <tr>
                <td>${Utils.escapeHTML(mes.nombre)}</td>
                <td class="right"><span class="chip ${highs.has(mes.saldo) ? 'ok' : lows.has(mes.saldo) ? 'danger' : ''}">${Utils.fmtCOP.format(mes.saldo)}</span></td>
                <td><div class="bar"><div class="fill liq" style="width:${mes.liqPct.toFixed(0)}%"></div></div><div class="muted ${mes.liqPct < 50 ? 'chip warn' : ''}">${Utils.fmtPct2(mes.liqPct)}</div></td>
                <td><div class="bar"><div class="fill exp" style="width:${mes.expPct.toFixed(0)}%"></div></div><div class="muted ${mes.expPct > 50 ? 'chip warn' : ''}">${Utils.fmtPct2(mes.expPct)}</div></td>
            </tr>
        `).join('');
    }

    return {
        init: renderResumen,
        activate: renderResumen
    };
})();
