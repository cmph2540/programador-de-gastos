window.APP_INITIAL_TAB = 'entrada';

(window.PageModules = window.PageModules || {}).entrada = (() => {
    function refreshIngresoCats() {
        const sel = document.getElementById('ingresoCategoria');
        if (!sel) return;
        sel.innerHTML = '';
        sel.append(new Option('Selecciona categoría', '', true, true));
        state.ingresoCats.forEach((cat) => sel.append(new Option(cat, cat)));
        sel.append(new Option('➕ Crear nuevo concepto…', '__custom__'));
    }

    function refreshGastoTipos() {
        const sel = document.getElementById('gastoTipo');
        if (!sel) return;
        sel.innerHTML = '';
        sel.append(new Option('Selecciona tipo de gasto', '', true, true));
        state.gastoTipos.forEach((tipo) => sel.append(new Option(tipo, tipo)));
        sel.append(new Option('➕ Crear nuevo tipo…', '__custom__'));
    }

    function hasEntradaMonths() {
        return hasMonths();
    }

    function selectedMonthIdxEntrada() {
        const selector = document.getElementById('mesSelector');
        return parseInt(selector?.value || '0', 10);
    }

    function getIngresosEntrada() {
        return hasEntradaMonths() ? state.meses[selectedMonthIdxEntrada()].ingresos : tempIngresos;
    }

    function getGastosEntrada() {
        return hasEntradaMonths() ? state.meses[selectedMonthIdxEntrada()].gastos : tempGastos;
    }

    function getGastosOrdenados() {
        return [...getGastosEntrada()].sort((a, b) => (b.valorTotal ?? b.valor ?? 0) - (a.valorTotal ?? a.valor ?? 0));
    }

    function updateResumenContext() {
        const ingresos = getIngresosEntrada();
        const gastos = getGastosEntrada();
        const totalIng = ingresos.reduce((acc, item) => acc + item.valor, 0);
        let totalGas = gastos.reduce((acc, item) => acc + (item.valorTotal ?? item.valor), 0);
        totalGas += getTotalGastosHormiga();
        const saldo = totalIng - totalGas;

        const chip = document.getElementById('saldoChip');
        if (!chip) return;

        let chipClass = 'ok';
        if (saldo < 0) chipClass = 'danger';
        else if (saldo === 0 || saldo < totalIng * 0.1) chipClass = 'warn';

        chip.className = `chip ${chipClass}`;
        document.getElementById('saldoTexto').textContent = Utils.fmtCOP.format(saldo);

        const liq = totalIng > 0 ? Math.min(100, Math.max(0, (saldo / totalIng) * 100)) : saldo > 0 ? 100 : 0;
        const exp = Math.min(100, Math.max(0, 100 - liq));

        requestAnimationFrame(() => {
            document.getElementById('liqFill').style.width = `${liq.toFixed(0)}%`;
            document.getElementById('expFill').style.width = `${exp.toFixed(0)}%`;
        });

        document.getElementById('liqTexto').textContent = Utils.fmtPct2(liq);
        document.getElementById('expTexto').textContent = Utils.fmtPct2(exp);

        const alertEl = document.getElementById('alertaLiquidez');
        const alertText = document.getElementById('alertaLiquidezTexto');
        if (!alertEl || !alertText) return;

        if (totalIng === 0) {
            alertEl.style.display = '';
            alertEl.className = 'alert warn';
            alertText.textContent = 'No hay ingresos registrados. Agrega ingresos para comenzar.';
            return;
        }

        if (liq < 15) {
            alertEl.style.display = '';
            alertEl.className = 'alert danger';
            alertText.textContent = 'Liquidez crítica (<15%). Considera reducir gastos o aumentar ingresos.';
            return;
        }

        if (liq < 25) {
            alertEl.style.display = '';
            alertEl.className = 'alert warn';
            alertText.textContent = 'Liquidez baja (<25%). Aumenta tu colchón de seguridad.';
            return;
        }

        alertEl.style.display = 'none';
    }

    function renderIngresos() {
        const tbody = document.querySelector('#tablaIngresos tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        let total = 0;

        getIngresosEntrada().forEach((item, idx) => {
            total += item.valor;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${Utils.escapeHTML(item.cat)}</td>
                <td class="right">${Utils.fmtCOP.format(item.valor)}</td>
                <td class="right">
                    <button class="btn secondary" data-edit-ing="${idx}">Editar</button>
                    <button class="btn warn" data-del-ing="${idx}">Quitar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('totalIngresos').textContent = Utils.fmtCOP.format(total);
        updateResumenContext();
    }

    function renderPagoDonut() {
        const gastos = getGastosEntrada();
        const total = gastos.reduce((acc, item) => acc + ((item.valorTotal ?? item.valor) || 0), 0) + getTotalGastosHormiga();
        const pagado = gastos.reduce((acc, item) => acc + (item.pagado ? ((item.valorTotal ?? item.valor) || 0) : 0), 0);
        const pctNum = total > 0 ? Math.min(100, Math.max(0, (pagado / total) * 100)) : 0;
        const donutSvg = document.getElementById('donutPaidSvg');
        const singleDataContainer = document.getElementById('singleDataContainer');
        const singleDataValue = document.getElementById('singleDataValue');
        const singleDataLabel = document.getElementById('singleDataLabel');
        const donut = document.getElementById('donutPaid');
        const centerPct = document.getElementById('donutCenterPct');
        if (!donutSvg || !singleDataContainer || !singleDataValue || !singleDataLabel || !donut || !centerPct) return;

        if (gastos.length === 1 || total === 0) {
            donutSvg.style.display = 'none';
            singleDataContainer.style.display = 'flex';
            singleDataValue.textContent = `${pctNum.toFixed(0)}%`;
            singleDataLabel.textContent = total === 0 ? 'Sin datos' : 'Pagado';
        } else {
            donutSvg.style.display = 'block';
            singleDataContainer.style.display = 'none';
            const circumference = 2 * Math.PI * 60;
            donut.setAttribute('stroke-dasharray', String(circumference));
            donut.setAttribute('stroke-dashoffset', String(circumference - circumference * (pctNum / 100)));
            centerPct.textContent = `${pctNum.toFixed(0)}%`;
        }

        const chip = document.getElementById('donutPct');
        chip.className = `chip ${pctNum >= 75 ? 'ok' : pctNum >= 40 ? 'warn' : 'danger'}`;
        chip.textContent = `${pctNum.toFixed(0)}% pagado`;
        document.getElementById('donutAmounts').textContent = `${Utils.fmtCOP.format(pagado)} / ${Utils.fmtCOP.format(total)}`;
    }

    function renderCategoriaDonut() {
        const gastos = getGastosEntrada();
        const segs = document.getElementById('catDonutSegs');
        const svg = document.getElementById('catDonutSvg');
        const singleContainer = document.getElementById('singleCatDataContainer');
        const singleValue = document.getElementById('singleCatDataValue');
        const singleLabel = document.getElementById('singleCatDataLabel');
        const col1 = document.getElementById('catLegendCol1');
        const col2 = document.getElementById('catLegendCol2');
        const center = document.getElementById('catDonutCenter');
        if (!segs || !svg || !singleContainer || !singleValue || !singleLabel || !col1 || !col2 || !center) return;

        segs.innerHTML = '';
        col1.innerHTML = '';
        col2.innerHTML = '';

        const agg = {};
        gastos.forEach((gasto) => {
            const tipo = gasto.tipo || 'Sin tipo';
            agg[tipo] = (agg[tipo] || 0) + ((gasto.valorTotal ?? gasto.valor) || 0);
        });

        const totalHormiga = getTotalGastosHormiga();
        if (totalHormiga > 0) agg['🐜 Gastos Hormiga'] = totalHormiga;

        const entries = Object.entries(agg).sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((acc, [, value]) => acc + value, 0);

        if (total <= 0) {
            svg.style.display = 'none';
            singleContainer.style.display = 'flex';
            singleValue.textContent = '0%';
            singleLabel.textContent = 'Sin datos';
            center.textContent = 'Sin datos';
            return;
        }

        if (entries.length === 1) {
            const [tipo] = entries[0];
            svg.style.display = 'none';
            singleContainer.style.display = 'flex';
            singleValue.textContent = '100%';
            singleLabel.textContent = tipo.length > 10 ? `${tipo.slice(0, 10)}...` : tipo;
            col1.innerHTML = `<div class="legend-item"><span class="box" style="background:${Utils.palette[0]}"></span><span>${Utils.escapeHTML(tipo)} — 100%</span></div>`;
            center.textContent = tipo;
            return;
        }

        svg.style.display = 'block';
        singleContainer.style.display = 'none';

        const cx = 70;
        const cy = 70;
        const r = 60;
        const strokeW = 16;
        let startAngle = -Math.PI / 2;
        const point = (angle) => ({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });

        entries.forEach(([tipo, value], idx) => {
            const frac = value / total;
            const sweep = frac * Math.PI * 2;
            const start = point(startAngle);
            const end = point(startAngle + sweep);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${start.x} ${start.y} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${end.x} ${end.y}`);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', Utils.palette[idx % Utils.palette.length]);
            path.setAttribute('stroke-width', String(strokeW));
            segs.appendChild(path);

            const legend = `<div class="legend-item"><span class="box" style="background:${Utils.palette[idx % Utils.palette.length]}"></span><span>${Utils.escapeHTML(tipo)} — ${(frac * 100).toFixed(0)}%</span></div>`;
            if (idx < 5) col1.insertAdjacentHTML('beforeend', legend);
            else col2.insertAdjacentHTML('beforeend', legend);
            startAngle += sweep;
        });

        center.textContent = entries.filter(([, value]) => value === entries[0][1]).map(([tipo]) => tipo).join(' · ');
    }

    function renderGastos() {
        const tbody = document.querySelector('#tablaGastos tbody');
        if (!tbody) return;

        const authWarning = document.getElementById('gastosAuthWarning');
        if (authWarning) authWarning.style.display = checkAuth() ? 'none' : 'flex';

        const gastosOrdenados = getGastosOrdenados();
        tbody.innerHTML = '';

        let total = gastosOrdenados.reduce((acc, gasto) => acc + (gasto.valorTotal ?? gasto.valor), 0);
        total += getTotalGastosHormiga();
        const promedio = gastosOrdenados.length ? total / gastosOrdenados.length : 0;

        gastosOrdenados.forEach((gasto, idx) => {
            const valor = gasto.valorTotal ?? gasto.valor;
            const cuotaTxt = gasto.cuotaIdx && gasto.cuotasTotal
                ? ` (cuota ${gasto.cuotaIdx}/${gasto.cuotasTotal})`
                : gasto.cuotas ? ` (en ${gasto.cuotas} cuotas)` : '';
            const tr = document.createElement('tr');
            if (valor > promedio) tr.style.backgroundColor = 'rgba(245,158,11,.08)';
            tr.innerHTML = `
                <td>${Utils.escapeHTML((gasto.desc || '—') + cuotaTxt)}</td>
                <td>${Utils.escapeHTML(gasto.tipo || '—')}</td>
                <td class="right">${Utils.fmtCOP.format(valor)}</td>
                <td class="right">${total > 0 ? ((valor / total) * 100).toFixed(0) : 0}%</td>
                <td class="right">
                    <label>
                        <input type="checkbox" data-pagado="${idx}" ${gasto.pagado ? 'checked' : ''} ${hasEntradaMonths() ? '' : 'disabled'}>
                        Pagado
                    </label>
                </td>
                <td class="right">
                    <button class="btn secondary" data-edit-g="${idx}">Editar</button>
                    <button class="btn warn" data-del-g="${idx}">Quitar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        const totalHormiga = getTotalGastosHormiga();
        if (totalHormiga > 0) {
            tbody.insertAdjacentHTML('beforeend', `
                <tr class="hormiga-total-row">
                    <td colspan="2"><strong>🐜 Total Gastos Hormiga</strong></td>
                    <td class="right"><strong>${Utils.fmtCOP.format(totalHormiga)}</strong></td>
                    <td class="right">${total > 0 ? ((totalHormiga / total) * 100).toFixed(0) : 0}%</td>
                    <td class="right"></td>
                    <td class="right"></td>
                </tr>
            `);
        }

        document.getElementById('totalGastos').textContent = Utils.fmtCOP.format(total);
        renderPagoDonut();
        renderCategoriaDonut();
        updateResumenContext();
    }

    function refreshMesSelector() {
        const sel = document.getElementById('mesSelector');
        if (!sel) return;
        sel.innerHTML = '';
        state.meses.forEach((mes, idx) => sel.append(new Option(mes.nombre, idx)));
        sel.disabled = !state.editingEnabled || state.meses.length === 0;
        updatePrimaVisibility();
        updateMesEditChip();
    }

    function updateMesEditChip() {
        const info = document.getElementById('mesEditInfo');
        if (!info) return;
        if (!state.editingEnabled || !hasEntradaMonths()) {
            info.style.display = 'none';
            return;
        }
        const month = state.meses[selectedMonthIdxEntrada()];
        info.style.display = '';
        document.getElementById('mesEditChip').textContent = `Editando: ${month.nombre}`;
    }

    function updatePrimaVisibility() {
        const sel = document.getElementById('mesSelector');
        const primaField = document.getElementById('primaField');
        if (!sel || !primaField) return;
        if (sel.disabled) {
            primaField.style.display = 'none';
            return;
        }
        const month = state.meses[parseInt(sel.value || '0', 10)];
        const show = month && (month.monthIdx === 5 || month.monthIdx === 11);
        primaField.style.display = show ? '' : 'none';
        document.getElementById('chkPrima').checked = !!month?.prima;
    }

    function updateGuardar12MesesButton() {
        const btn = document.getElementById('btnGuardar');
        if (!btn) return;
        if (state.doceMesesCreados) {
            btn.disabled = true;
            btn.classList.add('btn-12meses-disabled');
            btn.classList.remove('success');
            btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#9fb3c8" stroke-width="2"/></svg>12 Meses Creados';
            return;
        }
        btn.disabled = false;
        btn.classList.remove('btn-12meses-disabled');
        btn.classList.add('success');
        btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#22c55e" stroke-width="2"/></svg>Guardar y crear 12 meses';
    }

    function setupInlineCreate() {
        const selIng = document.getElementById('ingresoCategoria');
        const boxIng = document.getElementById('ingresoCreateBox');
        const inpIng = document.getElementById('ingresoNewConcept');
        document.getElementById('btnIngresoAddConcept').addEventListener('click', () => {
            const value = (inpIng.value || '').trim();
            if (!value) return softToast('Ingresa un nombre válido', 'warn');
            if (!state.ingresoCats.includes(value)) state.ingresoCats.push(value);
            saveState();
            refreshIngresoCats();
            selIng.value = value;
            boxIng.style.display = 'none';
            inpIng.value = '';
            softToast('Categoría de ingreso creada', 'ok');
        });
        document.getElementById('btnIngresoCancelConcept').addEventListener('click', () => {
            boxIng.style.display = 'none';
            inpIng.value = '';
        });
        selIng.addEventListener('change', () => {
            const show = selIng.value === '__custom__';
            boxIng.style.display = show ? 'flex' : 'none';
            if (show) inpIng.focus();
        });

        const selGasto = document.getElementById('gastoTipo');
        const boxGasto = document.getElementById('gastoTipoCreateBox');
        const inpGasto = document.getElementById('gastoNewTipo');
        document.getElementById('btnGastoAddTipo').addEventListener('click', () => {
            const value = (inpGasto.value || '').trim();
            if (!value) return softToast('Ingresa un tipo válido', 'warn');
            if (!state.gastoTipos.includes(value)) state.gastoTipos.push(value);
            saveState();
            refreshGastoTipos();
            selGasto.value = value;
            boxGasto.style.display = 'none';
            inpGasto.value = '';
            softToast('Tipo de gasto creado', 'ok');
        });
        document.getElementById('btnGastoCancelTipo').addEventListener('click', () => {
            boxGasto.style.display = 'none';
            inpGasto.value = '';
        });
        selGasto.addEventListener('change', () => {
            const show = selGasto.value === '__custom__';
            boxGasto.style.display = show ? 'flex' : 'none';
            if (show) inpGasto.focus();
        });
    }

    function renderGastosHormigaTooltip() {
        const content = document.getElementById('hormigaTooltipContent');
        if (!content) return;
        if (state.gastosHormiga.length === 0) {
            content.innerHTML = '<div class="hormiga-empty">No hay gastos hormiga</div>';
            return;
        }
        const total = getTotalGastosHormiga();
        content.innerHTML = `
            <div class="hormiga-tooltip-list">
                ${state.gastosHormiga.map((item) => `
                    <div class="hormiga-tooltip-item">
                        <span class="hormiga-concepto">${Utils.escapeHTML(item.concepto)}</span>
                        <span class="hormiga-valor">${Utils.fmtCOP.format(item.valor)}</span>
                        <span class="hormiga-fecha">${item.fecha || '—'}</span>
                    </div>
                `).join('')}
                <div class="hormiga-tooltip-total">Total: ${Utils.fmtCOP.format(total)}</div>
            </div>
        `;
    }

    function showHormigaTooltip() {
        const tooltip = document.getElementById('hormigaTooltip');
        if (!tooltip) return;
        renderGastosHormigaTooltip();
        tooltip.classList.add('show');
    }

    function hideHormigaTooltip() {
        document.getElementById('hormigaTooltip')?.classList.remove('show');
    }

    function hideHormigaForm() {
        const form = document.getElementById('hormigaFormContainer');
        if (form) form.style.display = 'none';
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

        container.innerHTML = `
            <div class="hormiga-list">
                ${state.gastosHormiga.map((item, idx) => `
                    <div class="hormiga-list-item">
                        <div class="hormiga-item-info">
                            <div class="hormiga-item-concepto">${Utils.escapeHTML(item.concepto)}</div>
                            <div class="hormiga-item-valor">${Utils.fmtCOP.format(item.valor)}</div>
                            <div class="hormiga-item-fecha">${item.fecha || '—'}</div>
                        </div>
                        <div class="hormiga-item-actions">
                            <button class="btn small secondary" onclick="editGastoHormiga(${idx})">Editar</button>
                            <button class="btn small warn" onclick="deleteGastoHormiga(${idx})">Eliminar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function openHormigaModal() {
        if (!requireAuth()) return;
        renderHormigaModalList();
        const modal = document.getElementById('hormigaModal');
        if (modal) modal.style.display = 'flex';
    }

    function closeHormigaModal() {
        const modal = document.getElementById('hormigaModal');
        if (modal) modal.style.display = 'none';
        hideHormigaForm();
    }

    function showAddHormigaForm() {
        document.getElementById('hormigaFormTitle').textContent = 'Nuevo Gasto Hormiga';
        document.getElementById('hormigaEditIndex').value = '-1';
        document.getElementById('hormigaConcepto').value = '';
        document.getElementById('hormigaValor').value = '';
        document.getElementById('hormigaFecha').value = Utils.fmtYYYYMMDD(Utils.hoyLocal()).replace(/\//g, '-');
        document.getElementById('hormigaFormContainer').style.display = 'block';
    }

    function saveGastoHormiga() {
        const concepto = document.getElementById('hormigaConcepto').value.trim();
        const valor = Utils.parseCurrency(document.getElementById('hormigaValor').value);
        const fecha = document.getElementById('hormigaFecha').value;
        const editIndex = parseInt(document.getElementById('hormigaEditIndex').value, 10);

        if (!concepto) return softToast('Ingresa un concepto', 'warn');
        if (!isFinite(valor) || valor <= 0) return softToast('Ingresa un valor válido', 'warn');

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
    }

    function editGastoHormiga(idx) {
        const item = state.gastosHormiga[idx];
        if (!item) return;
        document.getElementById('hormigaFormTitle').textContent = 'Editar Gasto Hormiga';
        document.getElementById('hormigaEditIndex').value = idx;
        document.getElementById('hormigaConcepto').value = item.concepto;
        document.getElementById('hormigaValor').value = Utils.formatNumber(item.valor);
        document.getElementById('hormigaFecha').value = item.fecha ? item.fecha.split('/').reverse().join('-') : '';
        document.getElementById('hormigaFormContainer').style.display = 'block';
    }

    function deleteGastoHormiga(idx) {
        if (!confirm('¿Eliminar este gasto hormiga?')) return;
        state.gastosHormiga.splice(idx, 1);
        saveState();
        renderHormigaModalList();
        renderGastos();
        softToast('Gasto hormiga eliminado', 'warn');
    }

    function createYearMonths() {
        if (state.createdAt) return;
        const now = new Date();
        state.createdAt = now.toISOString();
        const startYear = now.getFullYear();
        const startIdx = now.getMonth();
        state.meses = [];
        for (let i = 0; i < 12; i += 1) {
            const idx = (startIdx + i) % 12;
            const year = startYear + Math.floor((startIdx + i) / 12);
            state.meses.push({
                id: `${year}-${String(idx + 1).padStart(2, '0')}`,
                nombre: `${Utils.monthNames[idx]} ${year}`,
                year,
                monthIdx: idx,
                ingresos: [],
                gastos: [],
                saldo: 0,
                liqPct: 0,
                expPct: 0,
                prima: false,
                ahorroPct: 25,
                gastoPct: 35,
                ahorroValor: 0,
                ahorroTotal: 0,
                gastoValor: 0,
                disponible: 0,
                ahorroConfirmado: false
            });
        }
    }

    function setupListeners() {
        document.getElementById('chkGastoCuotas').addEventListener('change', (event) => {
            document.getElementById('gastoCuotas').disabled = !event.target.checked;
        });

        document.getElementById('btnAddIngreso').addEventListener('click', () => {
            if (!requireAuth()) return;
            const cat = document.getElementById('ingresoCategoria').value;
            const valor = Utils.parseCurrency(document.getElementById('ingresoValor').value);
            if (!cat || cat === '__custom__') return softToast('Selecciona o crea una categoría', 'warn');
            if (!isFinite(valor) || valor <= 0) return softToast('Valor inválido', 'warn');
            getIngresosEntrada().push({ cat, valor });
            document.getElementById('ingresoValor').value = '';
            renderIngresos();
            softToast('Ingreso agregado', 'ok');
            registerActivity();
        });

        document.getElementById('btnAddGasto').addEventListener('click', () => {
            if (!requireAuth()) return;
            const desc = (document.getElementById('gastoDesc').value || '').trim();
            const tipo = document.getElementById('gastoTipo').value;
            const valor = Utils.parseCurrency(document.getElementById('gastoValor').value);
            const cuotas = parseInt(document.getElementById('gastoCuotas').value || '0', 10);
            const enCuotas = document.getElementById('chkGastoCuotas').checked;

            if (!desc) return softToast('Agrega una descripción', 'warn');
            if (desc.length > 30) return softToast('La descripción no puede exceder 30 caracteres', 'warn');
            if (!tipo || tipo === '__custom__') return softToast('Selecciona o crea un tipo', 'warn');
            if (!isFinite(valor) || valor <= 0) return softToast('Valor inválido. Ingresa un número mayor a 0', 'warn');
            if (enCuotas && (cuotas < 2 || cuotas > 12)) return softToast('Número de cuotas inválido (2-12)', 'warn');

            getGastosEntrada().push({
                desc,
                tipo,
                valorTotal: valor,
                cuotas: enCuotas ? Math.min(12, cuotas) : undefined,
                pagado: false,
                fecha: Utils.fmtYYYYMMDD(Utils.hoyLocal())
            });

            document.getElementById('gastoDesc').value = '';
            document.getElementById('gastoValor').value = '';
            document.getElementById('gastoCuotas').value = '';
            document.getElementById('chkGastoCuotas').checked = false;
            document.getElementById('gastoCuotas').disabled = true;
            renderGastos();
            softToast('Gasto agregado correctamente', 'ok');
            registerActivity();
        });

        document.querySelector('#tablaIngresos tbody').addEventListener('click', (event) => {
            const btnDel = event.target.closest('button[data-del-ing]');
            if (btnDel) {
                getIngresosEntrada().splice(parseInt(btnDel.dataset.delIng, 10), 1);
                renderIngresos();
                softToast('Ingreso eliminado', 'warn');
                registerActivity();
                return;
            }

            const btnEdit = event.target.closest('button[data-edit-ing]');
            if (btnEdit) {
                const idx = parseInt(btnEdit.dataset.editIng, 10);
                const item = getIngresosEntrada()[idx];
                const tr = btnEdit.closest('tr');
                tr.innerHTML = `
                    <td><input class="input edit-ing-cat" type="text" value="${Utils.escapeHTML(item.cat)}"></td>
                    <td class="right"><input class="input edit-ing-valor" type="number" value="${item.valor}"></td>
                    <td class="right">
                        <button class="btn success" data-save-ing="${idx}">Guardar</button>
                        <button class="btn ghost" data-cancel-ing="${idx}">Cancelar</button>
                    </td>
                `;
                return;
            }

            const btnSave = event.target.closest('button[data-save-ing]');
            if (btnSave) {
                const idx = parseInt(btnSave.dataset.saveIng, 10);
                const tr = btnSave.closest('tr');
                const cat = tr.querySelector('.edit-ing-cat').value.trim();
                const valor = parseInt(tr.querySelector('.edit-ing-valor').value, 10);
                if (!cat || !isFinite(valor) || valor < 0) return softToast('Datos inválidos', 'warn');
                getIngresosEntrada()[idx] = { cat, valor };
                if (hasEntradaMonths()) saveState();
                renderIngresos();
                softToast('Ingreso actualizado', 'ok');
                registerActivity();
                return;
            }

            if (event.target.closest('button[data-cancel-ing]')) renderIngresos();
        });

        document.querySelector('#tablaGastos tbody').addEventListener('change', (event) => {
            if (!event.target.matches('input[type="checkbox"][data-pagado]')) return;
            const idx = parseInt(event.target.dataset.pagado, 10);
            const gasto = getGastosOrdenados()[idx];
            const gastosOriginal = getGastosEntrada();
            const originalIdx = gastosOriginal.findIndex((item) => item.desc === gasto.desc && (item.valorTotal ?? item.valor) === (gasto.valorTotal ?? gasto.valor));
            if (originalIdx !== -1) {
                gastosOriginal[originalIdx].pagado = event.target.checked;
                if (hasEntradaMonths()) saveState();
            }
            renderPagoDonut();
            softToast(`Gasto marcado como ${event.target.checked ? 'pagado' : 'pendiente'}`, 'ok');
            registerActivity();
        });

        document.querySelector('#tablaGastos tbody').addEventListener('click', (event) => {
            const btnDel = event.target.closest('button[data-del-g]');
            if (btnDel) {
                const gasto = getGastosOrdenados()[parseInt(btnDel.dataset.delG, 10)];
                const gastosOriginal = getGastosEntrada();
                const originalIdx = gastosOriginal.findIndex((item) => item.desc === gasto.desc && (item.valorTotal ?? item.valor) === (gasto.valorTotal ?? gasto.valor));
                if (originalIdx !== -1) gastosOriginal.splice(originalIdx, 1);
                renderGastos();
                softToast('Gasto eliminado', 'warn');
                registerActivity();
                return;
            }

            const btnEdit = event.target.closest('button[data-edit-g]');
            if (btnEdit) {
                const gasto = getGastosOrdenados()[parseInt(btnEdit.dataset.editG, 10)];
                const gastosOriginal = getGastosEntrada();
                const originalIdx = gastosOriginal.findIndex((item) => item.desc === gasto.desc && (item.valorTotal ?? item.valor) === (gasto.valorTotal ?? gasto.valor));
                if (originalIdx === -1) return;
                const current = gastosOriginal[originalIdx];
                const tr = btnEdit.closest('tr');
                const opciones = state.gastoTipos.map((tipo) => `<option value="${Utils.escapeHTML(tipo)}" ${tipo === (current.tipo || '') ? 'selected' : ''}>${Utils.escapeHTML(tipo)}</option>`).join('');
                tr.innerHTML = `
                    <td><input class="input edit-g-desc" type="text" maxlength="30" value="${Utils.escapeHTML(current.desc || '')}"></td>
                    <td><select class="input edit-g-tipo">${opciones}</select></td>
                    <td class="right"><input class="input edit-g-valor" type="number" value="${current.valorTotal ?? current.valor}"></td>
                    <td class="right">—</td>
                    <td class="right"><label><input type="checkbox" class="edit-g-pagado" ${current.pagado ? 'checked' : ''}> Pagado</label></td>
                    <td class="right">
                        <button class="btn success" data-save-g="${originalIdx}">Guardar</button>
                        <button class="btn ghost" data-cancel-g="${originalIdx}">Cancelar</button>
                    </td>
                `;
                return;
            }

            const btnSave = event.target.closest('button[data-save-g]');
            if (btnSave) {
                const idx = parseInt(btnSave.dataset.saveG, 10);
                const tr = btnSave.closest('tr');
                const desc = tr.querySelector('.edit-g-desc').value.trim();
                const tipo = tr.querySelector('.edit-g-tipo').value;
                const valor = parseInt(tr.querySelector('.edit-g-valor').value, 10);
                const pagado = tr.querySelector('.edit-g-pagado').checked;
                if (!desc || !tipo || !isFinite(valor) || valor < 0) return softToast('Datos inválidos', 'warn');
                const item = getGastosEntrada()[idx];
                item.desc = desc;
                item.tipo = tipo;
                item.pagado = pagado;
                if ('valorTotal' in item) item.valorTotal = valor;
                else item.valor = valor;
                if (hasEntradaMonths()) saveState();
                renderGastos();
                softToast('Gasto actualizado', 'ok');
                registerActivity();
                return;
            }

            if (event.target.closest('button[data-cancel-g]')) renderGastos();
        });

        document.getElementById('btnGuardarMes').addEventListener('click', () => {
            if (!hasEntradaMonths()) return softToast('Primero crea los 12 meses', 'warn');
            calcularMes(state.meses[selectedMonthIdxEntrada()]);
            saveState();
            updateResumenContext();
            softToast('Mes guardado', 'ok');
            registerActivity();
        });

        document.getElementById('btnGuardar').addEventListener('click', () => {
            if (!requireAuth()) return;
            const totalIngTemp = tempIngresos.reduce((acc, item) => acc + item.valor, 0);
            let totalGasTemp = tempGastos.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
            totalGasTemp += getTotalGastosHormiga();
            if (totalIngTemp === 0 && totalGasTemp === 0) return softToast('Agrega ingresos/gastos antes de guardar', 'warn');
            if (state.doceMesesCreados) return softToast('Los 12 meses ya han sido creados', 'warn');

            createYearMonths();
            state.meses.forEach((mes) => { mes.ingresos = tempIngresos.map((ingreso) => ({ cat: ingreso.cat, valor: ingreso.valor })); });
            state.meses.forEach((mes) => { mes.gastos = []; });

            tempGastos.forEach((gasto) => {
                if (gasto.cuotas && gasto.cuotas > 1) {
                    for (let idx = 0; idx < Math.min(12, gasto.cuotas); idx += 1) {
                        if (!state.meses[idx]) continue;
                        state.meses[idx].gastos.push({
                            desc: gasto.desc,
                            tipo: gasto.tipo,
                            valor: gasto.valorTotal,
                            pagado: false,
                            cuotaIdx: idx + 1,
                            cuotasTotal: Math.min(12, gasto.cuotas)
                        });
                    }
                    return;
                }
                state.meses.forEach((mes) => mes.gastos.push({ desc: gasto.desc, tipo: gasto.tipo, valor: gasto.valorTotal, pagado: false }));
            });

            state.meses.forEach((mes) => calcularMes(mes));
            state.doceMesesCreados = true;
            saveState();
            refreshMesSelector();
            updateGuardar12MesesButton();
            softToast('12 meses creados y datos replicados', 'ok');
            registerActivity();
            navigateToPage('resumen');
        });

        document.getElementById('mesSelector').addEventListener('change', () => {
            updatePrimaVisibility();
            updateMesEditChip();
            renderIngresos();
            renderGastos();
            registerActivity();
        });

        document.getElementById('btnEditarMes').addEventListener('click', () => {
            if (!hasEntradaMonths()) return softToast('Primero crea los 12 meses', 'warn');
            state.editingEnabled = true;
            saveState();
            document.getElementById('mesSelector').disabled = false;
            updateMesEditChip();
            updatePrimaVisibility();
            softToast('Edición de mes habilitada', 'ok');
            registerActivity();
        });

        document.getElementById('chkPrima').addEventListener('change', (event) => {
            if (!hasEntradaMonths()) return;
            const month = state.meses[selectedMonthIdxEntrada()];
            month.prima = event.target.checked;
            if (month.prima) {
                const salario = month.ingresos.find((item) => item.cat.toLowerCase() === 'salario');
                if (!salario) {
                    month.prima = false;
                    event.target.checked = false;
                    return softToast('Agrega "Salario" para calcular Prima', 'warn');
                }
                const primaVal = Math.round(salario.valor * 0.5);
                const primaExistente = month.ingresos.find((item) => item.cat.toLowerCase() === 'prima');
                if (primaExistente) primaExistente.valor = primaVal;
                else month.ingresos.push({ cat: 'Prima', valor: primaVal });
                softToast('Prima calculada (50% del salario)', 'ok');
            } else {
                month.ingresos = month.ingresos.filter((item) => item.cat.toLowerCase() !== 'prima');
                softToast('Prima removida', 'warn');
            }
            calcularMes(month);
            saveState();
            renderIngresos();
            registerActivity();
        });
    }

    function activate() {
        refreshIngresoCats();
        refreshGastoTipos();
        if (state.meses.length > 0) refreshMesSelector();
        renderIngresos();
        renderGastos();
        updateResumenContext();
        updateGuardar12MesesButton();
    }

    function init() {
        setupInlineCreate();
        setupListeners();
        activate();

        window.showHormigaTooltip = showHormigaTooltip;
        window.hideHormigaTooltip = hideHormigaTooltip;
        window.openHormigaModal = openHormigaModal;
        window.closeHormigaModal = closeHormigaModal;
        window.showAddHormigaForm = showAddHormigaForm;
        window.saveGastoHormiga = saveGastoHormiga;
        window.editGastoHormiga = editGastoHormiga;
        window.deleteGastoHormiga = deleteGastoHormiga;
        window.cancelHormigaForm = hideHormigaForm;
    }

    return {
        init,
        activate
    };
})();
