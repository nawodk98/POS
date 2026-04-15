// POS SYSTEM — script.js (All Bugs Fixed)

// === LOCAL STORAGE PERSISTENCE ===
const DB_KEY = 'pos-db';
function loadDB() { try { const s = localStorage.getItem(DB_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveDB() { try { localStorage.setItem(DB_KEY, JSON.stringify(mockDB)); } catch(e) { console.warn('saveDB error:', e); } }

// === GLOBAL DATABASE ===
const DEFAULT_DB = {
    debtors: [
        { id:1, name:'Acme Corp',     address:'123 Main St', phoneNo:'555-0100', taxRegistered:true,  creditPeriod:30, isUsed:true  },
        { id:2, name:'John Doe',      address:'456 Side St', phoneNo:'555-0200', taxRegistered:false, creditPeriod:15, isUsed:false }
    ],
    creditors: [
        { id:1, name:'Global Supply', address:'789 Ind Ave', phoneNo:'555-0300', taxRegistered:true,  creditPeriod:45, isUsed:true  },
        { id:2, name:'Local Parts',   address:'321 Town Rd', phoneNo:'555-0400', taxRegistered:false, creditPeriod:14, isUsed:false }
    ],
    items: [
        { id:1, partNo:'O-001', name:'Premium Oil Filter',  category:'Filters',     price:15.50, isUsed:true  },
        { id:2, partNo:'O-002', name:'Standard Oil Filter', category:'Filters',     price:8.50,  isUsed:false },
        { id:3, partNo:'B-001', name:'Front Brake Pads',    category:'Brakes',      price:45.00, isUsed:true  },
        { id:4, partNo:'B-002', name:'Rear Brake Pads',     category:'Brakes',      price:40.00, isUsed:false },
        { id:5, partNo:'S-001', name:'Iridium Spark Plug',  category:'Ignition',    price:12.00, isUsed:false },
        { id:6, partNo:'A-001', name:'Cabin Air Filter',    category:'Filters',     price:20.00, isUsed:false },
        { id:7, partNo:'W-001', name:'Wiper Blades 22"',   category:'Accessories', price:18.00, isUsed:false }
    ],
    users: [
        { id:1, username:'admin',    password:'admin', role:'Admin',   isUsed:true  },
        { id:2, username:'cashier1', password:'1234',  role:'Cashier', isUsed:false }
    ],
    invoices: [],
    grns: [],
    salesReturns: [],
    purchaseReturns: []
};
const mockDB = loadDB() || DEFAULT_DB;
// Migration: add password to old saved users
if (mockDB.users) mockDB.users.forEach(u => { if (!u.password) u.password = u.username === 'admin' ? 'admin' : '1234'; });
// Migration: add new arrays for history
if (!mockDB.invoices) mockDB.invoices = [];
if (!mockDB.grns) mockDB.grns = [];
if (!mockDB.salesReturns) mockDB.salesReturns = [];
if (!mockDB.purchaseReturns) mockDB.purchaseReturns = [];
// Migration: add payments tracking to existing records
mockDB.invoices.forEach(inv => { if (!inv.payments) inv.payments = []; if (inv.totalPaid===undefined) inv.totalPaid = inv.status==='paid'?inv.grandTotal:0; });
mockDB.grns.forEach(grn => { if (!grn.payments) grn.payments = []; if (grn.totalPaid===undefined) grn.totalPaid = grn.status==='paid'?grn.totalCost:0; });

// === HELPER: compute effective balance after returns ===
function calcBalance(tx, type) {
    const isInv = type === 'invoice';
    const originalTotal = isInv ? tx.grandTotal : tx.totalCost;
    const returnedValue = tx.items.reduce((s, it) => s + (it.returnedQty || 0) * (isInv ? it.price : it.cost), 0);
    const returnedTax = (isInv && tx.taxRegistered) ? returnedValue * 0.18 : 0;
    const effectiveTotal = originalTotal - returnedValue - returnedTax;
    const totalPaid = tx.totalPaid || 0;
    return { originalTotal, returnedValue: returnedValue + returnedTax, effectiveTotal, totalPaid, balance: Math.max(0, effectiveTotal - totalPaid) };
}
function txStatus(tx, type) {
    const b = calcBalance(tx, type);
    if (b.balance <= 0) return 'paid';
    if (b.totalPaid > 0) return 'partial';
    return 'unpaid';
}

// === NAVIGATION HELPER ===
function showContent(viewId) {
    // Hide all content panels
    document.querySelectorAll('#menu-view .content-view').forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
    });
    // Show the requested panel
    const v = document.getElementById(viewId);
    if (v) {
        v.classList.add('active');
        v.style.display = '';   // Let CSS class handle the display type
    }
}

// === LOGIN ERROR HELPERS ===
function showLoginError(msg) {
    clearLoginError();
    const err = document.createElement('p');
    err.id = 'login-error';
    err.innerText = msg;
    const btn = document.querySelector('#login-form .login-btn');
    if (btn) btn.parentNode.insertBefore(err, btn);
}
function clearLoginError() { const e = document.getElementById('login-error'); if (e) e.remove(); }

// === DOM READY ===
document.addEventListener('DOMContentLoaded', () => {

    // Theme
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('pos-theme');
    if (savedTheme) root.setAttribute('data-theme', savedTheme);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme', 'dark');
    themeToggle.addEventListener('click', () => {
        const t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', t);
        localStorage.setItem('pos-theme', t);
    });

    // Login
    const loginForm = document.getElementById('login-form');
    const loginView = document.getElementById('login-view');
    const menuView  = document.getElementById('menu-view');
    const logoutBtn = document.getElementById('logout-btn');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const uVal = document.getElementById('username').value.trim();
        const pVal = document.getElementById('password').value;
        const user = mockDB.users.find(u => u.username.toLowerCase() === uVal.toLowerCase() && u.password === pVal);

        const loginBtn = document.querySelector('#login-form .login-btn');
        const orig = loginBtn.innerHTML;
        const spinStyle = document.createElement('style');
        spinStyle.innerHTML = '@keyframes spin{100%{transform:rotate(360deg)}}';
        document.head.appendChild(spinStyle);
        loginBtn.innerHTML = '<span>Authenticating...</span><svg class="btn-icon" style="animation:spin 1s linear infinite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>';
        loginBtn.style.opacity = '0.9';

        setTimeout(() => {
            loginBtn.innerHTML = orig;
            loginBtn.style.opacity = '1';
            if (!user) { showLoginError('Invalid username or password.'); return; }
            clearLoginError();
            sessionStorage.setItem('pos-user', JSON.stringify({ username: user.username, role: user.role }));
            loginView.classList.remove('active');
            setTimeout(() => { menuView.classList.add('active'); showContent('dashboard-view'); }, 500);
        }, 1200);
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('pos-user');
        menuView.classList.remove('active');
        setTimeout(() => { loginView.classList.add('active'); loginForm.reset(); clearLoginError(); }, 500);
    });

    // Sidebar Tree Navigation
    document.querySelectorAll('.tree-node').forEach(node => {
        const content = node.querySelector('.tree-content');
        content.addEventListener('click', (e) => {
            e.stopPropagation();
            if (node.querySelector('.tree-children')) {
                node.classList.toggle('expanded');
            } else {
                document.querySelectorAll('.tree-node.active').forEach(n => n.classList.remove('active'));
                node.classList.add('active');
                if (!content.dataset.report) {
                    sidebarNav(content.querySelector('.tree-title')?.innerText.trim());
                }
            }
        });
    });

    function sidebarNav(title) {
        switch(title) {
            case 'Dashboard':        showContent('dashboard-view'); break;
            case 'New Invoice':      initInvoiceNumber(); showContent('invoice-view'); break;
            case 'Invoice History':  renderHistory('invoices'); break;
            case 'Sales Returns':    renderHistory('salesReturns'); break;
            case 'Settings':         openManagementTab('debtors'); break;
            case 'Stock In/Out':     initGrn(); showContent('add-stock-view'); break;
            case 'GRN History':      renderHistory('grns'); break;
            case 'Purchase Returns': renderHistory('purchaseReturns'); break;
        }
    }

    // Dashboard Quick-Action Buttons (by label text)
    document.querySelectorAll('.feature-item').forEach(item => {
        const label = item.querySelector('.feature-label')?.innerText.trim();
        if (label === 'Daily Summary') item.addEventListener('click', () => renderReport('daily_summary'));
        if (label === 'Backup & Restore') item.addEventListener('click', handleBackupRestore);
        if (label === 'New Invoice') item.addEventListener('click', () => { initInvoiceNumber(); showContent('invoice-view'); });
    });

    // Sidebar search
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.tree-children .tree-node').forEach(leaf => {
                leaf.style.display = (leaf.querySelector('.tree-title')?.innerText.toLowerCase() || '').includes(q) ? 'flex' : 'none';
            });
        });
    }
}); // end DOMContentLoaded

// === BACKUP & RESTORE ===
function handleBackupRestore() {
    const action = confirm('Click OK to Backup Data, or Cancel to Restore from File.');
    if (action) {
        // Backup
        const backupDb = localStorage.getItem('pos-db');
        const blob = new Blob([backupDb || JSON.stringify(DEFAULT_DB)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } else {
        // Restore
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = ev => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        if (data) {
                            localStorage.setItem('pos-db', ev.target.result);
                            alert('Restore successful! Reloading...');
                            location.reload();
                        }
                    } catch (err) {
                        alert('Invalid backup file. Error: ' + err.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
}

// === INVOICE NUMBER ===
function generateInvoiceNumber(n) {
    return `INV-${new Date().toISOString().slice(0,10).replace(/-/g,''  )}-${String(n).padStart(3,'0')}`;
}
function populateInvoiceCustomers() {
    const sel = document.getElementById('invoice-customer');
    if (!sel) return;
    sel.innerHTML = '<option value="">Walk-in Customer</option>' +
        mockDB.debtors.map(d => `<option value="${d.id}" data-tax="${d.taxRegistered}">${d.name}${d.taxRegistered?' (Tax Reg.)':''}</option>`).join('');
}
function populateGrnSuppliers() {
    const sel = document.getElementById('grn-supplier');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Supplier --</option>' +
        mockDB.creditors.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}
function initInvoiceNumber() {
    if (!localStorage.getItem('lastInvoiceId')) localStorage.setItem('lastInvoiceId','1');
    const n = parseInt(localStorage.getItem('lastInvoiceId'));
    const numEl  = document.getElementById('invoice-number');
    const dateEl = document.getElementById('invoice-date');
    if (numEl)  numEl.innerText  = generateInvoiceNumber(n);
    if (dateEl) dateEl.innerText = `Date: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
    populateInvoiceCustomers();
    // Reset the table (use getElementById directly to avoid TDZ issues)
    const tbl = document.getElementById('invoice-items');
    if (tbl) tbl.innerHTML = '';
    // Reset customer selector
    const cSel = document.getElementById('invoice-customer');
    const tCb  = document.getElementById('tax-registered-checkbox');
    const bd   = document.getElementById('invoice-bill-discount');
    if (cSel) cSel.value = '';
    if (tCb) tCb.checked = false;
    if (bd) bd.value = '0.00';
    // Recalculate using safe direct element lookup
    safeCalculateTotals();
}
// NOTE: do NOT call initInvoiceNumber() here — it's called after all declarations below

// === INVOICE VIEW TOGGLE ===
const newInvoiceBtn   = document.getElementById('new-invoice-btn');
const closeInvoiceBtn = document.getElementById('close-invoice-btn');
if (newInvoiceBtn)   newInvoiceBtn.addEventListener('click',   () => { initInvoiceNumber(); showContent('invoice-view'); });
if (closeInvoiceBtn) closeInvoiceBtn.addEventListener('click', () => showContent('dashboard-view'));

// === GRN (GOODS RECEIVED NOTE) ===
const closeStockBtn = document.getElementById('close-stock-btn');
const saveGrnBtn    = document.getElementById('save-grn-btn');

function generateGrnNumber() {
    return `GRN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(parseInt(localStorage.getItem('lastGrnId')||'0')+1).padStart(3,'0')}`;
}
function initGrn() {
    const numEl  = document.getElementById('grn-number');
    const dateEl = document.getElementById('grn-date');
    if (numEl)  numEl.innerText  = generateGrnNumber();
    if (dateEl) dateEl.innerText = `Date: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
    populateGrnSuppliers();
    const grnItems = document.getElementById('grn-items');
    if (grnItems) grnItems.innerHTML = '';
    const bd = document.getElementById('grn-bill-discount'); if(bd) bd.value = '0.00';
    calculateGrnTotals();
    ['grn-part-search','grn-ref'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    ['grn-entry-qty','grn-entry-cost','grn-entry-discount'].forEach(id => { const el=document.getElementById(id); if(el){el.value='';el.disabled=true;} });
    const ab = document.getElementById('grn-add-btn'); if(ab) ab.disabled=true;
}
function calculateGrnTotals() {
    let subtotal = 0;
    document.querySelectorAll('#grn-items tr').forEach(row => {
        const qty=parseFloat(row.querySelector('.grn-qty')?.value)||0;
        const cost=parseFloat(row.querySelector('.grn-cost')?.value)||0;
        const disc=parseFloat(row.querySelector('.grn-disc')?.value)||0;
        const lineTotal = (qty*cost)-disc;
        const tc=row.querySelector('.grn-total'); if(tc) tc.innerText=lineTotal.toFixed(2);
        subtotal+=lineTotal;
    });
    const sEl=document.getElementById('grn-subtotal'); if(sEl) sEl.innerText=subtotal.toFixed(2);
    const bdEl=document.getElementById('grn-bill-discount');
    const billDisc = bdEl ? (parseFloat(bdEl.value)||0) : 0;
    const tEl=document.getElementById('grn-total');    if(tEl) tEl.innerText=(subtotal-billDisc).toFixed(2);
}
if (closeStockBtn) closeStockBtn.addEventListener('click', () => showContent('dashboard-view'));
if (saveGrnBtn) {
    saveGrnBtn.addEventListener('click', () => {
        const supEl = document.getElementById('grn-supplier');
        if (!supEl?.value) { alert('Please select a supplier.'); return; }
        const gi = document.getElementById('grn-items');
        if (!gi||gi.rows.length===0) { alert('Add at least one item.'); return; }
        const newId = parseInt(localStorage.getItem('lastGrnId')||'0')+1;
        localStorage.setItem('lastGrnId', newId);

        const grnId = document.getElementById('grn-number')?.innerText;
        const supplier = mockDB.creditors.find(c => c.id == supEl.value);
        const payTerms = document.getElementById('grn-payment-terms')?.value || 'credit';
        const refNo = document.getElementById('grn-ref')?.value || '';
        const items = [];
        let totalCost = 0;

        let billDisc = parseFloat(document.getElementById('grn-bill-discount')?.value) || 0;

        gi.querySelectorAll('tr').forEach(row => {
            const pNo=row.cells[0]?.innerText, name=row.cells[1]?.innerText;
            const qty=parseFloat(row.querySelector('.grn-qty')?.value)||0;
            const cost=parseFloat(row.querySelector('.grn-cost')?.value)||0;
            const disc=parseFloat(row.querySelector('.grn-disc')?.value)||0;
            const lineTotal = (qty * cost) - disc;
            items.push({ partNo: pNo, name, qty, cost, discount: disc, total: lineTotal, returnedQty: 0 });
            totalCost += lineTotal;
            const item=mockDB.items.find(i=>i.partNo===pNo);
            if(item){item.stock=(item.stock||0)+qty;item.isUsed=true;} // Do not update sell price from GRN per user request
        });
        totalCost -= billDisc;

        // Persist GRN record
        mockDB.grns.push({
            id: grnId,
            date: new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
            supplierId: parseInt(supEl.value),
            supplierName: supplier ? supplier.name : 'Unknown',
            refNo,
            paymentTerms: payTerms,
            items,
            billDiscount: billDisc,
            totalCost,
            payments: [],
            totalPaid: payTerms === 'cash' ? totalCost : 0,
            status: payTerms === 'cash' ? 'paid' : 'unpaid'
        });

        saveDB();
        alert(`✅ Stock received!\nGRN: ${grnId}`);
        showContent('dashboard-view');
    });
}

const grnPartSearch = document.getElementById('grn-part-search');
const grnDropdown   = document.getElementById('grn-autocomplete-dropdown');
const grnEntryQty   = document.getElementById('grn-entry-qty');
const grnEntryCost  = document.getElementById('grn-entry-cost');
const grnEntryDiscount = document.getElementById('grn-entry-discount');
const grnAddBtn     = document.getElementById('grn-add-btn');
const grnItemsTable = document.getElementById('grn-items');
const grnBillDiscInput = document.getElementById('grn-bill-discount');
let grnSelectedPart = null;

if (grnPartSearch) {
    grnPartSearch.addEventListener('input', (e) => {
        const q=e.target.value.toLowerCase().trim();
        grnDropdown.innerHTML=''; grnSelectedPart=null;
        grnEntryQty.disabled=true; grnEntryCost.disabled=true; if(grnEntryDiscount) grnEntryDiscount.disabled=true; grnAddBtn.disabled=true;
        if(!q){grnDropdown.style.display='none';return;}
        const matches=mockDB.items.filter(p=>p.name.toLowerCase().includes(q)||p.partNo.toLowerCase().includes(q));
        if(matches.length>0){
            grnDropdown.style.display='block';
            matches.forEach(part=>{
                const d=document.createElement('div'); d.className='dropdown-item';
                d.innerHTML=`<span class="dropdown-item-title">${part.name}</span><span class="dropdown-item-desc">${part.partNo}</span>`;
                d.addEventListener('click',()=>selectGrnPart(part)); grnDropdown.appendChild(d);
            });
        } else { grnDropdown.style.display='none'; }
    });
    document.addEventListener('click',(e)=>{ if(e.target!==grnPartSearch) grnDropdown.style.display='none'; });

    function selectGrnPart(part) {
        grnSelectedPart=part; grnPartSearch.value=part.name;
        grnEntryCost.value=(parseFloat(part.price)||0).toFixed(2); grnEntryQty.value=1;
        if(grnEntryDiscount) { grnEntryDiscount.value=''; grnEntryDiscount.disabled=false; }
        grnEntryQty.disabled=false; grnEntryCost.disabled=false; grnAddBtn.disabled=false;
        grnDropdown.style.display='none'; grnEntryQty.focus();
    }
    function addGrnEntry() {
        if(!grnSelectedPart) return;
        const qty=parseFloat(grnEntryQty.value)||1, cost=parseFloat(grnEntryCost.value)||0;
        const disc = parseFloat(grnEntryDiscount?.value)||0;
        const lineTotal = (qty * cost) - disc;
        const row=document.createElement('tr');
        row.innerHTML=`<td>${grnSelectedPart.partNo}</td><td>${grnSelectedPart.name}</td>
            <td><input type="number" class="item-qty glass-input num-input grn-qty" value="${qty}" min="1" style="width:100%;text-align:center;"></td>
            <td><input type="number" class="item-price glass-input num-input grn-cost" value="${cost.toFixed(2)}" step="0.01" style="width:100%;text-align:center;"></td>
            <td><input type="number" class="glass-input num-input grn-disc" value="${disc.toFixed(2)}" step="0.01" style="width:100%;text-align:center;"></td>
            <td class="grn-total">${lineTotal.toFixed(2)}</td>
            <td><button class="action-btn text-danger grn-remove-btn">×</button></td>`;
        grnItemsTable.appendChild(row);
        grnPartSearch.value=''; grnEntryQty.value=''; grnEntryCost.value='';
        if(grnEntryDiscount) { grnEntryDiscount.value=''; grnEntryDiscount.disabled=true; }
        grnEntryQty.disabled=true; grnEntryCost.disabled=true; grnAddBtn.disabled=true;
        grnSelectedPart=null; grnPartSearch.focus(); calculateGrnTotals();
    }
    grnAddBtn.addEventListener('click', addGrnEntry);
    [grnPartSearch,grnEntryQty,grnEntryCost,grnEntryDiscount].filter(Boolean).forEach(inp=>{
        inp.addEventListener('keydown',(e)=>{
            if(e.key==='Enter'){e.preventDefault();
                if(grnSelectedPart) addGrnEntry();
                else if(inp===grnPartSearch&&grnDropdown.children.length>0) grnDropdown.children[0].click();
            }
        });
    });
}
if(grnItemsTable){
    grnItemsTable.addEventListener('input',(e)=>{if(e.target.classList.contains('grn-qty')||e.target.classList.contains('grn-cost')||e.target.classList.contains('grn-disc'))calculateGrnTotals();});
    grnItemsTable.addEventListener('click',(e)=>{if(e.target.classList.contains('grn-remove-btn')){e.target.closest('tr').remove();calculateGrnTotals();}});
}
if(grnBillDiscInput) grnBillDiscInput.addEventListener('input', calculateGrnTotals);

// === INVOICE TAX & ITEMS ===
const invoiceCustomerSelect  = document.getElementById('invoice-customer');
const taxRegisteredCheckbox  = document.getElementById('tax-registered-checkbox');
const invoiceTitle           = document.getElementById('invoice-title');
const taxRow                 = document.getElementById('tax-row');
const invoiceTaxDisplay      = document.getElementById('invoice-tax');
const invoiceGrandTotal      = document.getElementById('invoice-grand-total');
const invoiceSubtotalDisplay = document.getElementById('invoice-subtotal');
const invoiceItemsTable      = document.getElementById('invoice-items');
let baseSubtotal = 0;

// Safe version that uses getElementById directly (safe to call before const declarations)
function safeCalculateTotals() {
    const tbl = document.getElementById('invoice-items');
    const subEl = document.getElementById('invoice-subtotal');
    const taxCb = document.getElementById('tax-registered-checkbox');
    const titleEl = document.getElementById('invoice-title');
    const taxRowEl = document.getElementById('tax-row');
    const taxEl = document.getElementById('invoice-tax');
    const totalEl = document.getElementById('invoice-grand-total');

    let sub = 0;
    if (tbl) tbl.querySelectorAll('tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        const disc = parseFloat(row.querySelector('.item-disc')?.value) || 0;
        const lineTotal = (qty * price) - disc;
        const td = row.querySelector('.item-total'); if (td) td.innerText = lineTotal.toFixed(2);
        sub += lineTotal;
    });
    if (subEl) subEl.innerText = sub.toFixed(2);
    
    // Apply Bill Discount
    const bdEl = document.getElementById('invoice-bill-discount');
    const billDisc = bdEl ? (parseFloat(bdEl.value) || 0) : 0;
    sub = sub - billDisc;
    baseSubtotal = sub;

    const isTax = taxCb ? taxCb.checked : false;
    if (isTax) {
        if (titleEl) { titleEl.innerText = 'TAX INVOICE'; titleEl.style.color = '#10B981'; }
        if (taxRowEl) taxRowEl.style.display = 'flex';
        const tax = sub * 0.18;
        if (taxEl) taxEl.innerText = tax.toFixed(2);
        if (totalEl) totalEl.innerText = (sub + tax).toFixed(2);
    } else {
        if (titleEl) { titleEl.innerText = 'Standard Invoice'; titleEl.style.color = 'var(--input-focus)'; }
        if (taxRowEl) taxRowEl.style.display = 'none';
        if (totalEl) totalEl.innerText = sub.toFixed(2);
    }
}


if(invoiceCustomerSelect&&taxRegisteredCheckbox){
    invoiceCustomerSelect.addEventListener('change',(e)=>{
        const opt=e.target.options[e.target.selectedIndex];
        taxRegisteredCheckbox.checked=(opt.dataset.tax==='true'); safeCalculateTotals();
    });
    taxRegisteredCheckbox.addEventListener('change', safeCalculateTotals);

    const partSearchInput      = document.getElementById('part-search-input');
    const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
    const entryQty             = document.getElementById('entry-qty');
    const entryPrice           = document.getElementById('entry-price');
    const entryDiscount        = document.getElementById('entry-discount');
    const addEntryBtn          = document.getElementById('add-entry-btn');
    let selectedPart = null;
    let activeDropdownIndex = -1;

    function updateDropdownFocus(items) {
        items.forEach((item, idx) => {
            if (idx === activeDropdownIndex) {
                item.style.background = 'var(--tree-hover-bg)';
            } else {
                item.style.background = 'transparent';
            }
        });
    }

    if(partSearchInput){
        partSearchInput.addEventListener('input',(e)=>{
            const q=e.target.value.toLowerCase().trim();
            autocompleteDropdown.innerHTML=''; selectedPart=null; activeDropdownIndex=-1;
            entryQty.disabled=true; entryPrice.disabled=true; if(entryDiscount) entryDiscount.disabled=true; addEntryBtn.disabled=true;
            if(!q){autocompleteDropdown.style.display='none';return;}
            const matches=mockDB.items.filter(p=>p.name.toLowerCase().includes(q)||p.partNo.toLowerCase().includes(q));
            if(matches.length>0){
                autocompleteDropdown.style.display='block';
                matches.forEach(part=>{
                    const d=document.createElement('div'); d.className='dropdown-item';
                    d.innerHTML=`<span class="dropdown-item-title">${part.name}</span><span class="dropdown-item-desc">${part.partNo}</span>`;
                    d.addEventListener('click',()=>selectPart(part)); autocompleteDropdown.appendChild(d);
                });
            } else { autocompleteDropdown.style.display='none'; }
        });
        document.addEventListener('click',(e)=>{ if(e.target!==partSearchInput) autocompleteDropdown.style.display='none'; });

        function selectPart(part) {
            selectedPart=part; partSearchInput.value=part.name;
            entryPrice.value=(parseFloat(part.price)||0).toFixed(2); entryQty.value=1;
            if(entryDiscount) { entryDiscount.value=''; entryDiscount.disabled=false; }
            entryQty.disabled=false; entryPrice.disabled=false; addEntryBtn.disabled=false;
            autocompleteDropdown.style.display='none'; entryQty.focus();
        }
        function addCurrentEntry() {
            if(!selectedPart) return;
            const qty=parseInt(entryQty.value)||1, price=parseFloat(entryPrice.value)||selectedPart.price;
            
            // Check stock available
            const dbItem = mockDB.items.find(i => i.partNo === selectedPart.partNo);
            if (!dbItem || (dbItem.stock || 0) < qty) {
                alert(`Insufficient stock! Currently available: ${dbItem ? dbItem.stock || 0 : 0} units.`);
                return;
            }
            
            const disc=parseFloat(entryDiscount?.value)||0;
            const lineTotal = (qty*price)-disc;
            const row=document.createElement('tr');
            row.innerHTML=`<td>${selectedPart.partNo}</td><td>${selectedPart.name}</td>
                <td><input type="number" class="item-qty glass-input num-input" value="${qty}" min="1" style="width:100%;text-align:center;"></td>
                <td><input type="number" class="item-price glass-input num-input" value="${price.toFixed(2)}" step="0.01" style="width:100%;text-align:center;"></td>
                <td><input type="number" class="item-disc glass-input num-input" value="${disc.toFixed(2)}" step="0.01" style="width:100%;text-align:center;"></td>
                <td class="item-total">${lineTotal.toFixed(2)}</td>
                <td><button class="action-btn text-danger remove-item-btn">×</button></td>`;
            invoiceItemsTable.appendChild(row);
            partSearchInput.value=''; entryQty.value=''; entryPrice.value='';
            if(entryDiscount) { entryDiscount.value=''; entryDiscount.disabled=true; }
            entryQty.disabled=true; entryPrice.disabled=true; addEntryBtn.disabled=true;
            selectedPart=null; partSearchInput.focus(); safeCalculateTotals();
        }
        addEntryBtn.addEventListener('click', addCurrentEntry);
        
        partSearchInput.addEventListener('keydown', (e) => {
            const items = autocompleteDropdown.querySelectorAll('.dropdown-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeDropdownIndex = (activeDropdownIndex + 1) % items.length;
                updateDropdownFocus(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeDropdownIndex = (activeDropdownIndex - 1 + items.length) % items.length;
                updateDropdownFocus(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeDropdownIndex >= 0 && items[activeDropdownIndex]) {
                    items[activeDropdownIndex].click();
                } else if (items.length > 0) {
                    items[0].click();
                }
            }
        });

        entryQty.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); entryPrice.focus(); }
        });
        entryPrice.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (entryDiscount && !entryDiscount.disabled) entryDiscount.focus(); else addCurrentEntry(); }
        });
        if (entryDiscount) {
            entryDiscount.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); addCurrentEntry(); }
            });
        }
    }
    if(invoiceItemsTable){
        invoiceItemsTable.addEventListener('input',(e)=>{if(e.target.classList.contains('item-qty')||e.target.classList.contains('item-price')||e.target.classList.contains('item-disc'))safeCalculateTotals();});
        invoiceItemsTable.addEventListener('click',(e)=>{if(e.target.classList.contains('remove-item-btn')){e.target.closest('tr').remove();safeCalculateTotals();}});
    }
    const invBillDiscInput = document.getElementById('invoice-bill-discount');
    if(invBillDiscInput) invBillDiscInput.addEventListener('input', safeCalculateTotals);
    safeCalculateTotals();
    const printBtn=document.getElementById('print-invoice-btn');
    if(printBtn){
        printBtn.addEventListener('click',()=>{
            // Collect invoice data before saving
            const invId = document.getElementById('invoice-number')?.innerText;
            const custSel = document.getElementById('invoice-customer');
            const custId = custSel?.value ? parseInt(custSel.value) : null;
            const custName = custSel?.options[custSel.selectedIndex]?.text || 'Walk-in Customer';
            const payTerms = document.getElementById('invoice-payment-terms')?.value || 'cash';
            const isTax = document.getElementById('tax-registered-checkbox')?.checked || false;
            const invItems = [];
            const bdEl = document.getElementById('invoice-bill-discount');
            let billDisc = bdEl ? (parseFloat(bdEl.value)||0) : 0;
            let subtotal = 0;

            document.querySelectorAll('#invoice-items tr').forEach(row => {
                const pNo = row.cells[0]?.innerText;
                const name = row.cells[1]?.innerText;
                const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
                const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
                const disc = parseFloat(row.querySelector('.item-disc')?.value) || 0;
                const lineTotal = (qty * price) - disc;
                invItems.push({ partNo: pNo, name, qty, price, discount: disc, total: lineTotal, returnedQty: 0 });
                subtotal += lineTotal;
            });

            if (invItems.length === 0) { alert('Add at least one item before saving.'); return; }
            subtotal -= billDisc;

            const tax = isTax ? subtotal * 0.18 : 0;
            const grandTotal = subtotal + tax;

            // Persist invoice record
            const invRecord = {
                id: invId,
                date: new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
                customerId: custId,
                customerName: custName,
                paymentTerms: payTerms,
                taxRegistered: isTax,
                items: invItems,
                billDiscount: billDisc,
                subtotal,
                tax,
                grandTotal,
                payments: [],
                totalPaid: payTerms === 'cash' ? grandTotal : 0,
                status: payTerms === 'cash' ? 'paid' : 'unpaid'
            };
            mockDB.invoices.push(invRecord);

            // Update stock (deduct sold items)
            invItems.forEach(itm => {
                const dbItem = mockDB.items.find(i => i.partNo === itm.partNo);
                if (dbItem) { dbItem.stock = (dbItem.stock || 0) - itm.qty; dbItem.isUsed = true; }
            });

            saveDB();
            window.print();
            const newId=parseInt(localStorage.getItem('lastInvoiceId')||'1')+1;
            localStorage.setItem('lastInvoiceId',newId); initInvoiceNumber();
        });
    }
}

// === MANAGEMENT (CRUD) ===
const settingsBtn         = document.getElementById('settings-btn');
const managementView      = document.getElementById('management-view');
const closeMgmtBtn        = document.getElementById('close-mgmt-btn');
const mgmtTabs            = document.querySelectorAll('.mgmt-tab');
const mgmtTitle           = document.getElementById('mgmt-title');
const mgmtInputsContainer = document.getElementById('mgmt-inputs-container');
const mgmtTableHeader     = document.getElementById('mgmt-table-header');
const mgmtTableBody       = document.getElementById('mgmt-table-body');
const mgmtForm            = document.getElementById('mgmt-form');
const mgmtIdInput         = document.getElementById('mgmt-id');
const mgmtCancelEdit      = document.getElementById('mgmt-cancel-edit');
const mgmtFormTitle       = document.getElementById('mgmt-form-title');
const crudModalWrapper    = document.getElementById('crud-modal-wrapper');
const crudModalClose      = document.getElementById('crud-modal-close');
const mgmtOpenAddBtn      = document.getElementById('mgmt-open-add-btn');
let activeTab = 'debtors';

const schemas = {
    debtors:   [{key:'name',label:'Name',type:'text',required:true},{key:'address',label:'Address',type:'text',required:true},{key:'phoneNo',label:'Phone No',type:'text',required:true},{key:'taxRegistered',label:'Tax Registered',type:'checkbox',required:false},{key:'creditPeriod',label:'Credit Period (Days)',type:'number',required:true}],
    creditors: [{key:'name',label:'Name',type:'text',required:true},{key:'address',label:'Address',type:'text',required:true},{key:'phoneNo',label:'Phone No',type:'text',required:true},{key:'taxRegistered',label:'Tax Registered',type:'checkbox',required:false},{key:'creditPeriod',label:'Credit Period (Days)',type:'number',required:true}],
    items:     [{key:'partNo',label:'Part No',type:'text',required:true},{key:'name',label:'Item Name',type:'text',required:true},{key:'category',label:'Category',type:'text',required:false},{key:'price',label:'Price',type:'number',required:false}],
    users:     [{key:'username',label:'Username',type:'text',required:true},{key:'password',label:'Password',type:'password',required:true},{key:'role',label:'Role',type:'text',required:true}]
};

function openManagementTab(tab) {
    showContent('management-view');
    mgmtTabs.forEach(t=>t.classList.remove('active'));
    const target=Array.from(mgmtTabs).find(t=>t.dataset.tab===tab);
    if(target) target.classList.add('active');
    activeTab=tab; resetMgmtForm(); renderMgmtView();
}

if(settingsBtn&&managementView){
    settingsBtn.addEventListener('click', ()=>openManagementTab('debtors'));
    closeMgmtBtn.addEventListener('click', ()=>showContent('dashboard-view'));
    mgmtTabs.forEach(tab=>{ tab.addEventListener('click',()=>{ mgmtTabs.forEach(t=>t.classList.remove('active')); tab.classList.add('active'); activeTab=tab.dataset.tab; resetMgmtForm(); renderMgmtView(); }); });
    if(mgmtCancelEdit) mgmtCancelEdit.addEventListener('click', resetMgmtForm);
    if(crudModalClose) crudModalClose.addEventListener('click', resetMgmtForm);
    if(mgmtOpenAddBtn) mgmtOpenAddBtn.addEventListener('click',()=>{ resetMgmtForm(); crudModalWrapper.style.display='flex'; });

    mgmtForm.addEventListener('submit',(e)=>{
        e.preventDefault();
        const id=mgmtIdInput.value, schema=schemas[activeTab];
        let record={id:id?parseInt(id):Date.now(), isUsed:false};
        schema.forEach(field=>{
            const inp=document.getElementById(`mgmt-${field.key}`); if(!inp) return;
            if(field.type==='checkbox') record[field.key]=inp.checked;
            else if(field.type==='number'){const v=parseFloat(inp.value);record[field.key]=isNaN(v)?'':v;}
            else record[field.key]=inp.value;
        });
        if(id){const idx=mockDB[activeTab].findIndex(i=>i.id==id);if(idx>-1){record.isUsed=mockDB[activeTab][idx].isUsed;mockDB[activeTab][idx]=record;}}
        else mockDB[activeTab].push(record);
        saveDB();
        if(activeTab==='debtors')   populateInvoiceCustomers();
        if(activeTab==='creditors') populateGrnSuppliers();
        resetMgmtForm(); renderMgmtView();
    });
}


function renderMgmtView() {
    if(!mgmtTitle) return;
    mgmtTitle.innerText=`Manage ${activeTab.charAt(0).toUpperCase()+activeTab.slice(1)}`;
    const schema=schemas[activeTab];
    mgmtInputsContainer.innerHTML=schema.map(field=>{
        if(field.type==='checkbox') return `<label style="display:flex;align-items:center;gap:10px;color:var(--text-secondary);cursor:pointer;"><input type="checkbox" id="mgmt-${field.key}" style="width:20px;height:20px;"><span>${field.label}</span></label>`;
        return `<div class="input-group"><label>${field.label}</label><input type="${field.type}" id="mgmt-${field.key}" class="glass-input" ${field.required?'required':''} ${field.type==='number'?'step="any"':''} style="height:48px;"></div>`;
    }).join('');
    const vis=schema.filter(f=>f.key!=='password');
    mgmtTableHeader.innerHTML=vis.map(f=>`<th>${f.label}</th>`).join('')+'<th width="120">Actions</th>';
    mgmtTableBody.innerHTML=mockDB[activeTab].map(item=>`<tr>
        ${vis.map(field=>{let v=item[field.key];if(field.type==='checkbox')v=v?'Yes':'No';if(v==null)v='';return`<td>${v}</td>`;}).join('')}
        <td>
            <button class="action-btn mgmt-edit-btn" data-id="${item.id}" style="display:inline-block;margin-right:5px;opacity:1;color:var(--input-focus);">Edit</button>
            <button class="action-btn text-danger mgmt-del-btn" data-id="${item.id}" style="display:inline-block;opacity:1;" ${item.isUsed?'disabled title="In use"':''}>${item.isUsed?'🔒':'×'}</button>
        </td></tr>`).join('');

    document.querySelectorAll('.mgmt-edit-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            const rec=mockDB[activeTab].find(i=>i.id==btn.dataset.id); if(!rec) return;
            mgmtIdInput.value=rec.id;
            schema.forEach(field=>{ const el=document.getElementById(`mgmt-${field.key}`); if(!el) return; if(field.type==='checkbox') el.checked=!!rec[field.key]; else el.value=rec[field.key]??''; });
            mgmtFormTitle.innerText='Edit Record'; crudModalWrapper.style.display='flex';
        });
    });
    document.querySelectorAll('.mgmt-del-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            const rec=mockDB[activeTab].find(i=>i.id==btn.dataset.id); if(!rec) return;
            if(rec.isUsed){alert('Cannot delete: record is in use.');return;}
            if(confirm('Delete this record?')){ mockDB[activeTab]=mockDB[activeTab].filter(i=>i.id!=btn.dataset.id); saveDB(); renderMgmtView(); }
        });
    });
}
function resetMgmtForm() {
    if(mgmtForm) mgmtForm.reset();
    if(mgmtIdInput) mgmtIdInput.value='';
    if(mgmtFormTitle) mgmtFormTitle.innerText='Add New';
    if(crudModalWrapper) crudModalWrapper.style.display='none';
}

// === REPORTS ===
const reportView        = document.getElementById('report-view');
const reportTitle       = document.getElementById('report-title');
const reportTableHeader = document.getElementById('report-table-header');
const reportTableBody   = document.getElementById('report-table-body');
const closeReportBtn    = document.getElementById('close-report-btn');
const printReportBtn    = document.getElementById('print-report-btn');
if(closeReportBtn) closeReportBtn.addEventListener('click', ()=>showContent('dashboard-view'));
if(printReportBtn) printReportBtn.addEventListener('click', ()=>window.print());

const mockReports = {
    daily_summary:    { title:'📊 Daily Summary',                    headers:['Category','Value'],                                    data:[['Total Sales Today','$207.50'],['Number of Invoices','3'],['Items Sold','8'],['Tax Collected (18%)','$27.00'],['Outstanding Receivables','$222.50']] },
    periodic_sales:   { title:'Periodic Sales Report',               headers:['Date','Invoice No','Customer','Total Amount'],          data:[['01 Apr 2026','INV-20260401-001','Acme Corp','$150.00'],['02 Apr 2026','INV-20260402-002','John Doe','$45.50'],['05 Apr 2026','INV-20260405-003','Walk-in','$12.00']] },
    tax_liability:    { title:'Tax Liability Report',                 headers:['Date','Invoice No','Taxable Amount','Tax (18%)'],       data:[['01 Apr 2026','INV-20260401-001','$150.00','$27.00'],['08 Apr 2026','INV-20260408-004','$300.00','$54.00']] },
    ap_supplier:      { title:'Accounts Payable by Supplier',         headers:['Date','Supplier','Invoice Ref','Amount','Status'],      data:[['28 Mar 2026','Global Supply','GS-9021','$1,200.00','Pending'],['10 Apr 2026','Local Parts','LP-441','$340.00','Pending']] },
    ar_customer:      { title:'Accounts Receivable by Customer',      headers:['Date','Customer','Invoice No','Amount Due','Due Date'], data:[['01 Apr 2026','Acme Corp','INV-20260401-001','$177.00','01 May 2026'],['02 Apr 2026','John Doe','INV-20260402-002','$45.50','02 May 2026']] },
    ap_summary:       { title:'Accounts Payable Summary',             headers:['Supplier','Total Owed','Overdue'],                      data:[['Global Supply','$1,200.00','$0.00'],['Local Parts','$340.00','$0.00']] },
    ar_summary:       { title:'Accounts Receivable Summary',          headers:['Customer','Total Due','Overdue'],                       data:[['Acme Corp','$177.00','$0.00'],['John Doe','$45.50','$0.00']] },
    inventory_summary:{ title:'Inventory Summary',                    headers:['Part No','Item Name','Qty in Stock','Avg Cost','Total Value'], data:[['O-001','Premium Oil Filter','45','$10.00','$450.00'],['B-001','Front Brake Pads','12','$30.00','$360.00'],['S-001','Iridium Spark Plug','100','$6.50','$650.00'],['A-001','Cabin Air Filter','30','$12.00','$360.00']] },
    profit_loss:      { title:'Profit & Loss',                        headers:['Category','Amount'],                                   data:[['Sales Revenue',"<span style='color:#10B981'>$5,400.00</span>"],['Cost of Goods Sold',"<span style='color:#EF4444'>-$2,100.00</span>"],['<b>Gross Profit</b>',"<b><span style='color:#10B981'>$3,300.00</span></b>"],['Operating Expenses',"<span style='color:#EF4444'>-$800.00</span>"],['<b>Net Profit</b>',"<b><span style='color:#10B981'>$2,500.00</span></b>"]] }
};

function renderEntityCard(entity, transactions, type) {
    const card=document.getElementById('report-debtor-card'); if(!card||!entity){if(card)card.style.display='none';return;}
    let totalDue=0, totalPaid=0;
    const pendingTx = [], settledTx = [];

    transactions.forEach(tx => {
        const b = calcBalance(tx, type==='creditor'?'grn':'invoice');
        totalDue += b.effectiveTotal;
        totalPaid += b.totalPaid;
        const status = txStatus(tx, type==='creditor'?'grn':'invoice');
        const p = {
            date: tx.date,
            invoiceNo: tx.id,
            amount: b.effectiveTotal.toFixed(2),
            due: b.balance.toFixed(2),
            status: status==='paid'?'Settled':status==='partial'?'Partial':'Unpaid'
        };
        if (b.balance > 0) pendingTx.push(p); else settledTx.push(p);
    });

    const accent=type==='creditor'?'#F59E0B':'#10B981', label=type==='creditor'?'TOTAL PAYABLE':'TOTAL OUTSTANDING', txLabel=type==='creditor'?'GRN No':'Invoice No';
    card.style.display='block';
    card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:20px;margin-bottom:20px;">
        <div><h3 style="font-size:1.4rem;font-weight:700;color:var(--text-primary);margin-bottom:6px;">${entity.name}</h3>
            <p style="color:var(--text-secondary);margin-bottom:4px;">📍 ${entity.address}</p>
            <p style="color:var(--text-secondary);margin-bottom:4px;">📞 ${entity.phoneNo}</p>
            <p style="color:var(--text-secondary);">Credit: <strong>${entity.creditPeriod} days</strong> | Tax Reg: <strong>${entity.taxRegistered?'Yes':'No'}</strong></p></div>
        <div style="text-align:right;background:var(--input-bg);border:1px solid var(--card-border);border-radius:12px;padding:16px 24px;">
            <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:4px;">${label}</p>
            <p style="font-size:2rem;font-weight:700;color:${accent};">${(totalDue - totalPaid).toFixed(2)}</p>
        </div>
    </div>
    <h4 style="margin-top:20px;margin-bottom:10px;color:#EF4444;">Pending & Partial Invoices</h4>
    <table class="invoice-table"><thead><tr><th>Date</th><th>${txLabel}</th><th>Total Amount</th><th>Balance Due</th><th>Status</th></tr></thead>
    <tbody>${pendingTx.length>0?pendingTx.map(t=>`<tr><td>${t.date}</td><td>${t.invoiceNo}</td><td>${t.amount}</td>
        <td style="font-weight:600;color:#EF4444;">${t.due}</td>
        <td><span style="background:rgba(239,68,68,0.15);color:#EF4444;padding:3px 10px;border-radius:20px;font-size:0.85rem;font-weight:600;">${t.status}</span></td></tr>`).join('')
        :'<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:15px;">No pending transactions!</td></tr>'}</tbody></table>
        
    <h4 style="margin-top:20px;margin-bottom:10px;color:#10B981;">Settled Invoices</h4>
    <table class="invoice-table"><thead><tr><th>Date</th><th>${txLabel}</th><th>Total Amount</th><th>Balance Due</th><th>Status</th></tr></thead>
    <tbody>${settledTx.length>0?settledTx.map(t=>`<tr><td>${t.date}</td><td>${t.invoiceNo}</td><td>${t.amount}</td>
        <td style="font-weight:600;color:#10B981;">0.00</td>
        <td><span style="background:rgba(16,185,129,0.15);color:#10B981;padding:3px 10px;border-radius:20px;font-size:0.85rem;font-weight:600;">${t.status}</span></td></tr>`).join('')
        :'<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:15px;">No settled transactions.</td></tr>'}</tbody></table>`;
    const mt=document.querySelector('#report-view > .invoice-table'); if(mt) mt.style.display='none';
}

let currentReportId=null;

// Filter button
const filterBtn=document.querySelector('#report-date-filters button');
if(filterBtn){
    filterBtn.addEventListener('click',()=>{
        if(!currentReportId) return;
        if(currentReportId === 'item_ledger'){ renderLedgerTable(currentLedgerItem); return; }
        if(currentReportId.startsWith('tax_') || currentReportId === 'payment_summary') { renderReport(currentReportId); return; }
        
        const inputs=document.querySelectorAll('#report-date-filters input[type="date"]');
        if(inputs.length<2) return;
        const from=new Date(inputs[0].value), to=new Date(inputs[1].value); to.setHours(23,59,59);
        const rpt=mockReports[currentReportId]; if(!rpt) return;
        const filtered=rpt.data.filter(row=>{ const d=new Date(row[0].replace(/<[^>]+>/g,'').trim()); return isNaN(d.getTime())||( d>=from&&d<=to); });
        if(reportTableBody){
            if(filtered.length>0) reportTableBody.innerHTML=filtered.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
            else reportTableBody.innerHTML=`<tr><td colspan="${rpt.headers.length}" style="text-align:center;color:var(--text-secondary);padding:30px;">No records in selected date range.</td></tr>`;
        }
    });
}

function renderReport(reportId) {
    currentReportId=reportId;
    showContent('report-view');

    const debtorSelector=document.getElementById('report-debtor-selector');
    const itemSelector=document.getElementById('report-item-selector');
    const debtorCard=document.getElementById('report-debtor-card');
    const mainTable=document.querySelector('#report-view > .invoice-table');
    const dateFilters=document.getElementById('report-date-filters');

    if(debtorCard){debtorCard.style.display='none';debtorCard.innerHTML='';}
    if(debtorSelector) debtorSelector.style.display='none';
    if(itemSelector) itemSelector.style.display='none';

    // === DYNAMIC REPORT TYPES (from real data) ===
    if (reportId === 'pending_debtors') {
        reportTitle.innerHTML = '📊 Pending Debit Summary (Customers Owe You)';
        if(mainTable) mainTable.style.display='';
        if(dateFilters) dateFilters.style.display='none';
        const unpaid = mockDB.invoices.filter(i => calcBalance(i,'invoice').balance > 0);
        const grouped = {};
        unpaid.forEach(inv => {
            const b = calcBalance(inv,'invoice');
            if (!grouped[inv.customerName]) grouped[inv.customerName] = { total:0, paid:0, balance:0, count:0 };
            grouped[inv.customerName].total += b.effectiveTotal;
            grouped[inv.customerName].paid += b.totalPaid;
            grouped[inv.customerName].balance += b.balance;
            grouped[inv.customerName].count++;
        });
        const rows = Object.entries(grouped).map(([name, d]) => [
            `<strong>${name}</strong>`,
            d.count,
            d.total.toFixed(2),
            `<span style="color:#10B981;">${d.paid.toFixed(2)}</span>`,
            `<strong style="color:#EF4444;">${d.balance.toFixed(2)}</strong>`
        ]);
        const totalBal = Object.values(grouped).reduce((s,d)=>s+d.balance,0);
        rows.push([`<strong>TOTAL</strong>`, '', '', '', `<strong style="color:#EF4444;font-size:1.1rem;">${totalBal.toFixed(2)}</strong>`]);
        if(reportTableHeader) reportTableHeader.innerHTML = '<th>Customer</th><th>Invoices</th><th>Effective Total</th><th>Paid</th><th>Balance Due</th>';
        if(reportTableBody) reportTableBody.innerHTML = rows.length > 1
            ? rows.map(row => `<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')
            : '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:30px;">No pending debits. All invoices are fully paid!</td></tr>';
        return;
    }

    if (reportId === 'pending_creditors') {
        reportTitle.innerHTML = '📊 Pending Credit Summary (You Owe Suppliers)';
        if(mainTable) mainTable.style.display='';
        if(dateFilters) dateFilters.style.display='none';
        const unpaid = mockDB.grns.filter(g => calcBalance(g,'grn').balance > 0);
        const grouped = {};
        unpaid.forEach(grn => {
            const b = calcBalance(grn,'grn');
            if (!grouped[grn.supplierName]) grouped[grn.supplierName] = { total:0, paid:0, balance:0, count:0 };
            grouped[grn.supplierName].total += b.effectiveTotal;
            grouped[grn.supplierName].paid += b.totalPaid;
            grouped[grn.supplierName].balance += b.balance;
            grouped[grn.supplierName].count++;
        });
        const rows = Object.entries(grouped).map(([name, d]) => [
            `<strong>${name}</strong>`,
            d.count,
            d.total.toFixed(2),
            `<span style="color:#10B981;">${d.paid.toFixed(2)}</span>`,
            `<strong style="color:#EF4444;">${d.balance.toFixed(2)}</strong>`
        ]);
        const totalBal = Object.values(grouped).reduce((s,d)=>s+d.balance,0);
        rows.push([`<strong>TOTAL</strong>`, '', '', '', `<strong style="color:#EF4444;font-size:1.1rem;">${totalBal.toFixed(2)}</strong>`]);
        if(reportTableHeader) reportTableHeader.innerHTML = '<th>Supplier</th><th>GRNs</th><th>Effective Total</th><th>Paid</th><th>Balance Due</th>';
        if(reportTableBody) reportTableBody.innerHTML = rows.length > 1
            ? rows.map(row => `<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')
            : '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:30px;">No pending credits. All GRNs are fully paid!</td></tr>';
        return;
    }

    if (reportId === 'payment_summary') {
        reportTitle.innerHTML = '📊 Overall Payment Summary';
        if(mainTable) mainTable.style.display='';
        if(dateFilters) dateFilters.style.display='none';

        // Invoice totals
        let invTotal=0, invPaid=0, invBal=0;
        mockDB.invoices.forEach(inv => { const b=calcBalance(inv,'invoice'); invTotal+=b.effectiveTotal; invPaid+=b.totalPaid; invBal+=b.balance; });
        // GRN totals
        let grnTotal=0, grnPaid=0, grnBal=0;
        mockDB.grns.forEach(grn => { const b=calcBalance(grn,'grn'); grnTotal+=b.effectiveTotal; grnPaid+=b.totalPaid; grnBal+=b.balance; });
        // Returns
        const salesRetTotal = mockDB.salesReturns.reduce((s,r)=>s+r.totalRefund,0);
        const purchRetTotal = mockDB.purchaseReturns.reduce((s,r)=>s+r.totalRefund,0);

        const rows = [
            ['<strong style="color:var(--input-focus);">📋 Invoices (Sales)</strong>', mockDB.invoices.length, `<span style="color:#10B981;">${invTotal.toFixed(2)}</span>`, `<span style="color:#10B981;">${invPaid.toFixed(2)}</span>`, `<span style="color:#EF4444;">${invBal.toFixed(2)}</span>`],
            ['<strong style="color:#10B981;">📦 GRNs (Purchases)</strong>', mockDB.grns.length, `<span style="color:#F59E0B;">${grnTotal.toFixed(2)}</span>`, `<span style="color:#10B981;">${grnPaid.toFixed(2)}</span>`, `<span style="color:#EF4444;">${grnBal.toFixed(2)}</span>`],
            ['<strong style="color:#EF4444;">↩ Sales Returns</strong>', mockDB.salesReturns.length, `<span style="color:#EF4444;">-${salesRetTotal.toFixed(2)}</span>`, '-', '-'],
            ['<strong style="color:#EF4444;">↩ Purchase Returns</strong>', mockDB.purchaseReturns.length, `<span style="color:#EF4444;">-${purchRetTotal.toFixed(2)}</span>`, '-', '-'],
            ['', '', '', '', ''],
            ['<strong>Total Receivable (Customers Owe)</strong>', '', '', '', `<strong style="color:#EF4444;font-size:1.1rem;">${invBal.toFixed(2)}</strong>`],
            ['<strong>Total Payable (You Owe)</strong>', '', '', '', `<strong style="color:#EF4444;font-size:1.1rem;">${grnBal.toFixed(2)}</strong>`],
        ];

        if(reportTableHeader) reportTableHeader.innerHTML = '<th>Category</th><th>Count</th><th>Total Value</th><th>Paid</th><th>Pending</th>';
        if(reportTableBody) reportTableBody.innerHTML = rows.map(row => `<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
        return;
    }

    if (reportId === 'tax_output') {
        reportTitle.innerHTML = '📊 Output Tax (Sales Tax)';
        if(mainTable) mainTable.style.display='';
        if(dateFilters) dateFilters.style.display='flex';
        
        let from=null, to=null;
        const inputs=document.querySelectorAll('#report-date-filters input[type="date"]');
        if(inputs.length===2 && inputs[0].value) { from=new Date(inputs[0].value); to=new Date(inputs[1].value); to.setHours(23,59,59); }

        let totalTaxable=0, totalTax=0;
        const rows = mockDB.invoices.filter(i => {
            if (i.tax <= 0) return false;
            if (from) { const d = new Date(i.date); if (d < from || d > to) return false; }
            return true;
        }).map(i => {
            totalTaxable += i.subtotal; totalTax += i.tax;
            return `<tr><td>${i.date}</td><td>${i.customerName}</td><td>${i.id}</td><td>${i.subtotal.toFixed(2)}</td><td style="color:#10B981;font-weight:bold;">${i.tax.toFixed(2)}</td></tr>`;
        });
        rows.push(`<tr><td colspan="3" style="text-align:right;"><strong>TOTAL</strong></td><td><strong>${totalTaxable.toFixed(2)}</strong></td><td style="color:#10B981;font-weight:bold;">${totalTax.toFixed(2)}</td></tr>`);
        if(reportTableHeader) reportTableHeader.innerHTML = '<th>Date</th><th>Customer</th><th>Invoice No</th><th>Taxable Amount</th><th>Tax (18%)</th>';
        if(reportTableBody) reportTableBody.innerHTML = rows.length > 1 ? rows.join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:30px;">No taxable sales found in range!</td></tr>';
        return;
    }

    if (reportId === 'tax_input') {
        reportTitle.innerHTML = '📊 Input Tax (Purchase Tax)';
        if(mainTable) mainTable.style.display='';
        if(dateFilters) dateFilters.style.display='flex';
        
        let from=null, to=null;
        const inputs=document.querySelectorAll('#report-date-filters input[type="date"]');
        if(inputs.length===2 && inputs[0].value) { from=new Date(inputs[0].value); to=new Date(inputs[1].value); to.setHours(23,59,59); }

        let totalVal=0;
        const rows = mockDB.grns.filter(g => {
            if (from) { const d = new Date(g.date); if (d < from || d > to) return false; }
            return true;
        }).map(g => {
            totalVal += g.totalCost;
            return `<tr><td>${g.date}</td><td>${g.supplierName}</td><td>${g.id}</td><td>${g.totalCost.toFixed(2)}</td><td style="color:#10B981;font-weight:bold;">0.00</td></tr>`;
        });
        rows.push(`<tr><td colspan="3" style="text-align:right;"><strong>TOTAL</strong></td><td><strong>${totalVal.toFixed(2)}</strong></td><td style="color:#10B981;font-weight:bold;">0.00</td></tr>`);
        if(reportTableHeader) reportTableHeader.innerHTML = '<th>Date</th><th>Supplier</th><th>GRN No</th><th>Total Cost</th><th>Input Tax</th>';
        if(reportTableBody) reportTableBody.innerHTML = rows.length > 1 ? rows.join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:30px;">No purchases found in range!</td></tr>';
        return;
    }

    if (reportId === 'item_ledger') {
        reportTitle.innerHTML = '📌 Item Ledger / Stock Movement';
        if(mainTable) mainTable.style.display='';
        if(dateFilters) dateFilters.style.display='flex';
        if(itemSelector) itemSelector.style.display='block';
        if(reportTableHeader) reportTableHeader.innerHTML = '<th>Date</th><th>Type</th><th>Ref No</th><th>Party</th><th>Qty In</th><th>Qty Out</th><th>Cost / Price</th>';
        if(reportTableBody) reportTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:30px;">Search and select an item to view ledger.</td></tr>';
        return;
    }

    // === ORIGINAL STATIC REPORTS ===
    const rpt=mockReports[reportId]; if(!rpt) return;
    reportTitle.innerHTML=rpt.title;

    const needsSelector=['ap_supplier','ar_customer','ap_summary','ar_summary'].includes(reportId);
    const isAP = ['ap_supplier','ap_summary'].includes(reportId);

    if (['ap_supplier','ar_customer'].includes(reportId)) {
        if(debtorSelector) debtorSelector.style.display='block';
        if(mainTable) mainTable.style.display='none';
        if(dateFilters) dateFilters.style.display='none';

        const sEl=document.getElementById('debtor-select');
        if(sEl){
            const src=isAP?mockDB.creditors:mockDB.debtors;
            const ph=isAP?'-- Select a Supplier --':'-- Select a Customer --';
            sEl.innerHTML=`<option value="">${ph}</option>`+src.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
            const newSel=sEl.cloneNode(true); sEl.parentNode.replaceChild(newSel,sEl);
            newSel.addEventListener('change',(e)=>{
                const id=parseInt(e.target.value);
                if(!id){if(debtorCard){debtorCard.style.display='none';debtorCard.innerHTML='';}return;}
                if(isAP){
                    const c=mockDB.creditors.find(x=>x.id===id);
                    const grns = mockDB.grns.filter(g => g.supplierId === id || g.supplierName === c.name);
                    renderEntityCard(c,grns,'creditor');
                } else {
                    const d=mockDB.debtors.find(x=>x.id===id);
                    const invs = mockDB.invoices.filter(i => i.customerId === id || i.customerName === d.name);
                    renderEntityCard(d,invs,'debtor');
                }
            });
        }
        return;
    }

    // For static tables like periodic_sales, inventory_summary, ap_summary, ar_summary
        if(debtorSelector) debtorSelector.style.display='none';
        if(mainTable) mainTable.style.display='';
        if(dateFilters) dateFilters.style.display='flex';
        if(reportTableHeader) reportTableHeader.innerHTML=rpt.headers.map(h=>`<th>${h}</th>`).join('');
        if(reportTableBody)   reportTableBody.innerHTML=rpt.data.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
    }


// Sidebar report node listeners
document.querySelectorAll('.tree-content[data-report]').forEach(node=>{
    node.addEventListener('click',()=>renderReport(node.getAttribute('data-report')));
});

// === HISTORY VIEWS ===
const closeHistoryBtn = document.getElementById('close-history-btn');
if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', () => showContent('dashboard-view'));

let currentHistoryType = null;

function renderHistory(type) {
    currentHistoryType = type;
    showContent('history-view');
    const titleEl = document.getElementById('history-title');
    const headerEl = document.getElementById('history-table-header');
    const bodyEl = document.getElementById('history-table-body');
    if (!titleEl || !headerEl || !bodyEl) return;

    const statusLabel = (s) => s==='paid'?'\u2705 Paid':s==='partial'?'\uD83D\uDFE1 Partial':'\u23F3 Unpaid';
    switch(type) {
        case 'invoices':
            titleEl.innerText = '\uD83D\uDCCB Invoice History';
            headerEl.innerHTML = '<th>Invoice No</th><th>Date</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th width="100">Actions</th>';
            bodyEl.innerHTML = mockDB.invoices.length > 0
                ? mockDB.invoices.slice().reverse().map(inv => { const b=calcBalance(inv,'invoice'); const st=txStatus(inv,'invoice'); return `<tr>
                    <td style="font-weight:600;color:var(--input-focus);">${inv.id}</td><td>${inv.date}</td><td>${inv.customerName}</td>
                    <td style="font-weight:600;">${b.effectiveTotal.toFixed(2)}</td>
                    <td style="color:#10B981;">${b.totalPaid.toFixed(2)}</td>
                    <td style="color:${b.balance>0?'#EF4444':'#10B981'};font-weight:600;">${b.balance.toFixed(2)}</td>
                    <td><span class="status-badge ${st}">${statusLabel(st)}</span></td>
                    <td><button class="action-btn" style="color:var(--input-focus);opacity:1;font-weight:600;" onclick="openTxModal('invoice','${inv.id}')">View</button></td>
                </tr>`; }).join('')
                : '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);padding:30px;">No invoices found.</td></tr>';
            break;

        case 'grns':
            titleEl.innerText = '\uD83D\uDCE6 GRN History';
            headerEl.innerHTML = '<th>GRN No</th><th>Date</th><th>Supplier</th><th>Ref</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th width="80">Actions</th>';
            bodyEl.innerHTML = mockDB.grns.length > 0
                ? mockDB.grns.slice().reverse().map(grn => { const b=calcBalance(grn,'grn'); const st=txStatus(grn,'grn'); return `<tr>
                    <td style="font-weight:600;color:#10B981;">${grn.id}</td><td>${grn.date}</td><td>${grn.supplierName}</td><td>${grn.refNo||'-'}</td>
                    <td style="font-weight:600;">${b.effectiveTotal.toFixed(2)}</td>
                    <td style="color:#10B981;">${b.totalPaid.toFixed(2)}</td>
                    <td style="color:${b.balance>0?'#EF4444':'#10B981'};font-weight:600;">${b.balance.toFixed(2)}</td>
                    <td><span class="status-badge ${st}">${statusLabel(st)}</span></td>
                    <td><button class="action-btn" style="color:var(--input-focus);opacity:1;font-weight:600;" onclick="openTxModal('grn','${grn.id}')">View</button></td>
                </tr>`; }).join('')
                : '<tr><td colspan="9" style="text-align:center;color:var(--text-secondary);padding:30px;">No GRNs found.</td></tr>';
            break;

        case 'salesReturns':
            titleEl.innerText = '\u21A9\uFE0F Sales Returns';
            headerEl.innerHTML = '<th>Return No</th><th>Date</th><th>Invoice No</th><th>Customer</th><th>Refund Total</th><th width="100">Actions</th>';
            bodyEl.innerHTML = mockDB.salesReturns.length > 0
                ? mockDB.salesReturns.slice().reverse().map(sr => `<tr>
                    <td style="font-weight:600;color:#EF4444;">${sr.id}</td><td>${sr.date}</td>
                    <td style="color:var(--input-focus);">${sr.invoiceId}</td><td>${sr.customerName}</td>
                    <td style="font-weight:600;color:#EF4444;">-${sr.totalRefund.toFixed(2)}</td>
                    <td><button class="action-btn" style="color:var(--input-focus);opacity:1;font-weight:600;" onclick="openTxModal('salesReturn','${sr.id}')">View</button></td>
                </tr>`).join('')
                : '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:30px;">No sales returns found.</td></tr>';
            break;

        case 'purchaseReturns':
            titleEl.innerText = '\u21A9\uFE0F Purchase Returns';
            headerEl.innerHTML = '<th>Return No</th><th>Date</th><th>GRN No</th><th>Supplier</th><th>Refund Total</th><th width="100">Actions</th>';
            bodyEl.innerHTML = mockDB.purchaseReturns.length > 0
                ? mockDB.purchaseReturns.slice().reverse().map(pr => `<tr>
                    <td style="font-weight:600;color:#EF4444;">${pr.id}</td><td>${pr.date}</td>
                    <td style="color:#10B981;">${pr.grnId}</td><td>${pr.supplierName}</td>
                    <td style="font-weight:600;color:#EF4444;">-${pr.totalRefund.toFixed(2)}</td>
                    <td><button class="action-btn" style="color:var(--input-focus);opacity:1;font-weight:600;" onclick="openTxModal('purchaseReturn','${pr.id}')">View</button></td>
                </tr>`).join('')
                : '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:30px;">No purchase returns found.</td></tr>';
            break;
    }
}

// === TRANSACTION DETAIL MODAL ===
function openTxModal(type, id) {
    const modal = document.getElementById('tx-modal-wrapper');
    const titleEl = document.getElementById('tx-modal-title');
    const contentEl = document.getElementById('tx-modal-content');
    const actionsEl = document.getElementById('tx-modal-actions');
    if (!modal || !titleEl || !contentEl || !actionsEl) return;
    modal.style.display = 'flex';
    actionsEl.innerHTML = '';

    if (type === 'invoice') {
        const inv = mockDB.invoices.find(i => i.id === id);
        if (!inv) return;
        const b = calcBalance(inv, 'invoice');
        const st = txStatus(inv, 'invoice');
        const statusLbl = st==='paid'?'\u2705 Paid':st==='partial'?'\uD83D\uDFE1 Partial':'\u23F3 Unpaid';
        titleEl.innerText = `Invoice: ${inv.id}`;
        let payHistoryHtml = '';
        if (inv.payments && inv.payments.length > 0) {
            payHistoryHtml = `<div style="margin-top:15px;padding:15px;background:var(--input-bg);border:1px solid var(--card-border);border-radius:12px;">
                <p style="font-weight:600;margin-bottom:10px;color:var(--text-primary);">\uD83D\uDCB3 Payment History</p>
                <table class="invoice-table"><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Details</th></tr></thead><tbody>
                ${inv.payments.map(p => `<tr><td>${p.date}</td><td>${p.method==='cheque'?'\uD83C\uDFE6 Cheque':'\uD83D\uDCB5 Cash'}</td>
                    <td style="color:#10B981;font-weight:600;">${p.amount.toFixed(2)}</td>
                    <td style="font-size:0.85rem;color:var(--text-secondary);">${p.method==='cheque'?'Bank: '+p.bank+' | Chq#: '+p.chequeNo+' | Chq Date: '+p.chequeDate+' | Banking: '+p.bankingDate:'-'}</td></tr>`).join('')}
                </tbody></table></div>`;
        }
        contentEl.innerHTML = `
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:15px;margin-bottom:20px;">
                <div>
                    <p style="color:var(--text-secondary);margin-bottom:4px;">Customer: <strong style="color:var(--text-primary);">${inv.customerName}</strong></p>
                    <p style="color:var(--text-secondary);margin-bottom:4px;">Date: <strong>${inv.date}</strong></p>
                    <p style="color:var(--text-secondary);">Payment: <strong>${inv.paymentTerms === 'cash' ? '\uD83D\uDCB5 Cash' : '\uD83D\uDCC5 Credit'}</strong></p>
                </div>
                <div style="text-align:right;">
                    <p style="color:var(--text-secondary);font-size:0.85rem;">EFFECTIVE TOTAL</p>
                    <p style="font-size:1.8rem;font-weight:700;color:#10B981;">${b.effectiveTotal.toFixed(2)}</p>
                    ${b.returnedValue>0?'<p style="font-size:0.8rem;color:#EF4444;">Returns: -'+b.returnedValue.toFixed(2)+' (Orig: '+b.originalTotal.toFixed(2)+')</p>':''}
                    <p style="margin-top:4px;"><span class="status-badge ${st}" style="font-size:0.9rem;">${statusLbl}</span></p>
                    ${b.balance>0?'<p style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px;">Paid: '+b.totalPaid.toFixed(2)+' | <strong style="color:#EF4444;">Balance: '+b.balance.toFixed(2)+'</strong></p>':''}
                </div>
            </div>
            <table class="invoice-table"><thead><tr>
                <th>Part No</th><th>Item</th><th>Qty</th><th>Price</th><th>Disc.</th><th>Total</th><th>Returned</th>
            </tr></thead><tbody>
                ${inv.items.map(it => `<tr>
                    <td>${it.partNo}</td><td>${it.name}</td><td>${it.qty}</td>
                    <td>${it.price.toFixed(2)}</td><td style="color:#10B981;">${(it.discount||0).toFixed(2)}</td><td>${it.total.toFixed(2)}</td>
                    <td style="color:${(it.returnedQty||0)>0?'#EF4444':'var(--text-secondary)'};font-weight:600;">${it.returnedQty || 0}</td>
                </tr>`).join('')}
            </tbody></table>
            ${inv.billDiscount > 0 ? `<p style="text-align:right;margin-top:10px;color:var(--text-secondary);">Bill Discount: <strong style="color:#10B981;">-${inv.billDiscount.toFixed(2)}</strong></p>` : ''}
            ${inv.tax > 0 ? `<p style="text-align:right;margin-top:5px;color:var(--text-secondary);">Subtotal: ${inv.subtotal.toFixed(2)} | Tax (18%): ${inv.tax.toFixed(2)}</p>` : ''}
            ${payHistoryHtml}
        `;
        const hasReturnable = inv.items.some(it => (it.returnedQty || 0) < it.qty);
        if (hasReturnable) {
            actionsEl.innerHTML += `<button class="glass-btn-soft cancel-btn" style="padding:10px 20px;color:#EF4444;border-color:rgba(239,68,68,0.3);" onclick="showReturnForm('invoice','${inv.id}')">\u21A9 Create Return</button>`;
        }
        if (b.balance > 0) {
            actionsEl.innerHTML += `<button class="login-btn" style="padding:10px 20px;margin-top:0;width:auto;background:linear-gradient(135deg,#10B981,#059669);box-shadow:0 10px 20px rgba(16,185,129,0.3);" onclick="showPaymentForm('invoice','${inv.id}');">\uD83D\uDCB3 Record Payment</button>`;
        }
        actionsEl.innerHTML += `<button class="glass-btn-soft cancel-btn" style="padding:10px 20px;" onclick="closeTxModal()">Close</button>`;

    } else if (type === 'grn') {
        const grn = mockDB.grns.find(g => g.id === id);
        if (!grn) return;
        const b = calcBalance(grn, 'grn');
        const st = txStatus(grn, 'grn');
        const statusLbl = st==='paid'?'\u2705 Paid':st==='partial'?'\uD83D\uDFE1 Partial':'\u23F3 Unpaid';
        titleEl.innerText = `GRN: ${grn.id}`;
        let payHistoryHtml = '';
        if (grn.payments && grn.payments.length > 0) {
            payHistoryHtml = `<div style="margin-top:15px;padding:15px;background:var(--input-bg);border:1px solid var(--card-border);border-radius:12px;">
                <p style="font-weight:600;margin-bottom:10px;color:var(--text-primary);">\uD83D\uDCB3 Payment History</p>
                <table class="invoice-table"><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Details</th></tr></thead><tbody>
                ${grn.payments.map(p => `<tr><td>${p.date}</td><td>${p.method==='cheque'?'\uD83C\uDFE6 Cheque':'\uD83D\uDCB5 Cash'}</td>
                    <td style="color:#10B981;font-weight:600;">${p.amount.toFixed(2)}</td>
                    <td style="font-size:0.85rem;color:var(--text-secondary);">${p.method==='cheque'?'Bank: '+p.bank+' | Chq#: '+p.chequeNo+' | Chq Date: '+p.chequeDate+' | Banking: '+p.bankingDate:'-'}</td></tr>`).join('')}
                </tbody></table></div>`;
        }
        contentEl.innerHTML = `
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:15px;margin-bottom:20px;">
                <div>
                    <p style="color:var(--text-secondary);margin-bottom:4px;">Supplier: <strong style="color:var(--text-primary);">${grn.supplierName}</strong></p>
                    <p style="color:var(--text-secondary);margin-bottom:4px;">Date: <strong>${grn.date}</strong> | Ref: <strong>${grn.refNo||'-'}</strong></p>
                    <p style="color:var(--text-secondary);">Payment: <strong>${grn.paymentTerms === 'cash' ? '\uD83D\uDCB5 Cash' : '\uD83D\uDCC5 Credit'}</strong></p>
                </div>
                <div style="text-align:right;">
                    <p style="color:var(--text-secondary);font-size:0.85rem;">EFFECTIVE TOTAL</p>
                    <p style="font-size:1.8rem;font-weight:700;color:#F59E0B;">${b.effectiveTotal.toFixed(2)}</p>
                    ${b.returnedValue>0?'<p style="font-size:0.8rem;color:#EF4444;">Returns: -'+b.returnedValue.toFixed(2)+' (Orig: '+b.originalTotal.toFixed(2)+')</p>':''}
                    <p style="margin-top:4px;"><span class="status-badge ${st}" style="font-size:0.9rem;">${statusLbl}</span></p>
                    ${b.balance>0?'<p style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px;">Paid: '+b.totalPaid.toFixed(2)+' | <strong style="color:#EF4444;">Balance: '+b.balance.toFixed(2)+'</strong></p>':''}
                </div>
            </div>
            <table class="invoice-table"><thead><tr>
                <th>Part No</th><th>Item</th><th>Qty</th><th>Unit Cost</th><th>Disc.</th><th>Total</th><th>Returned</th>
            </tr></thead><tbody>
                ${grn.items.map(it => `<tr>
                    <td>${it.partNo}</td><td>${it.name}</td><td>${it.qty}</td>
                    <td>${it.cost.toFixed(2)}</td><td style="color:#10B981;">${(it.discount||0).toFixed(2)}</td><td>${it.total.toFixed(2)}</td>
                    <td style="color:${(it.returnedQty||0)>0?'#EF4444':'var(--text-secondary)'};font-weight:600;">${it.returnedQty || 0}</td>
                </tr>`).join('')}
            </tbody></table>
            ${grn.billDiscount > 0 ? `<p style="text-align:right;margin-top:10px;color:var(--text-secondary);">Bill Discount: <strong style="color:#10B981;">-${grn.billDiscount.toFixed(2)}</strong></p>` : ''}
            ${payHistoryHtml}
        `;
        const hasReturnable = grn.items.some(it => (it.returnedQty || 0) < it.qty);
        if (hasReturnable) {
            actionsEl.innerHTML += `<button class="glass-btn-soft cancel-btn" style="padding:10px 20px;color:#EF4444;border-color:rgba(239,68,68,0.3);" onclick="showReturnForm('grn','${grn.id}')">\u21A9 Create Return</button>`;
        }
        if (b.balance > 0) {
            actionsEl.innerHTML += `<button class="login-btn" style="padding:10px 20px;margin-top:0;width:auto;background:linear-gradient(135deg,#10B981,#059669);box-shadow:0 10px 20px rgba(16,185,129,0.3);" onclick="showPaymentForm('grn','${grn.id}');">\uD83D\uDCB3 Record Payment</button>`;
        }
        actionsEl.innerHTML += `<button class="glass-btn-soft cancel-btn" style="padding:10px 20px;" onclick="closeTxModal()">Close</button>`;

    } else if (type === 'salesReturn') {
        const sr = mockDB.salesReturns.find(r => r.id === id);
        if (!sr) return;
        titleEl.innerText = `Sales Return: ${sr.id}`;
        contentEl.innerHTML = `
            <div style="margin-bottom:20px;">
                <p style="color:var(--text-secondary);margin-bottom:4px;">Original Invoice: <strong style="color:var(--input-focus);">${sr.invoiceId}</strong></p>
                <p style="color:var(--text-secondary);margin-bottom:4px;">Customer: <strong>${sr.customerName}</strong></p>
                <p style="color:var(--text-secondary);">Date: <strong>${sr.date}</strong></p>
            </div>
            <table class="invoice-table"><thead><tr>
                <th>Part No</th><th>Item</th><th>Qty Returned</th><th>Price</th><th>Refund</th>
            </tr></thead><tbody>
                ${sr.items.map(it => `<tr>
                    <td>${it.partNo}</td><td>${it.name}</td><td>${it.qty}</td>
                    <td>${it.price.toFixed(2)}</td><td style="color:#EF4444;font-weight:600;">-${it.total.toFixed(2)}</td>
                </tr>`).join('')}
            </tbody></table>
            <p style="text-align:right;margin-top:15px;font-size:1.2rem;font-weight:700;color:#EF4444;">Total Refund: -${sr.totalRefund.toFixed(2)}</p>
        `;
        actionsEl.innerHTML = `<button class="glass-btn-soft cancel-btn" style="padding:10px 20px;" onclick="closeTxModal()">Close</button>`;

    } else if (type === 'purchaseReturn') {
        const pr = mockDB.purchaseReturns.find(r => r.id === id);
        if (!pr) return;
        titleEl.innerText = `Purchase Return: ${pr.id}`;
        contentEl.innerHTML = `
            <div style="margin-bottom:20px;">
                <p style="color:var(--text-secondary);margin-bottom:4px;">Original GRN: <strong style="color:#10B981;">${pr.grnId}</strong></p>
                <p style="color:var(--text-secondary);margin-bottom:4px;">Supplier: <strong>${pr.supplierName}</strong></p>
                <p style="color:var(--text-secondary);">Date: <strong>${pr.date}</strong></p>
            </div>
            <table class="invoice-table"><thead><tr>
                <th>Part No</th><th>Item</th><th>Qty Returned</th><th>Unit Cost</th><th>Refund</th>
            </tr></thead><tbody>
                ${pr.items.map(it => `<tr>
                    <td>${it.partNo}</td><td>${it.name}</td><td>${it.qty}</td>
                    <td>${it.cost.toFixed(2)}</td><td style="color:#EF4444;font-weight:600;">-${it.total.toFixed(2)}</td>
                </tr>`).join('')}
            </tbody></table>
            <p style="text-align:right;margin-top:15px;font-size:1.2rem;font-weight:700;color:#EF4444;">Total Refund: -${pr.totalRefund.toFixed(2)}</p>
        `;
        actionsEl.innerHTML = `<button class="glass-btn-soft cancel-btn" style="padding:10px 20px;" onclick="closeTxModal()">Close</button>`;
    }
}

// === RETURN FORM (Partial Item/Qty support) ===
function showReturnForm(type, id) {
    const contentEl = document.getElementById('tx-modal-content');
    const actionsEl = document.getElementById('tx-modal-actions');
    const titleEl = document.getElementById('tx-modal-title');
    if (!contentEl || !actionsEl || !titleEl) return;

    if (type === 'invoice') {
        const inv = mockDB.invoices.find(i => i.id === id);
        if (!inv) return;
        titleEl.innerText = `\u21A9 Return from Invoice: ${inv.id}`;
        contentEl.innerHTML = `
            <p style="color:var(--text-secondary);margin-bottom:15px;">Enter the quantity to return for each item. Leave at <strong>0</strong> to skip.</p>
            <table class="invoice-table"><thead><tr>
                <th>Part No</th><th>Item</th><th>Sold</th><th>Already Returned</th><th>Returnable</th><th width="120">Return Qty</th>
            </tr></thead><tbody>
                ${inv.items.map((it, idx) => {
                    const maxRet = it.qty - (it.returnedQty || 0);
                    return `<tr>
                        <td>${it.partNo}</td><td>${it.name}</td><td>${it.qty}</td>
                        <td style="color:${(it.returnedQty||0)>0?'#EF4444':'var(--text-secondary)'};">${it.returnedQty || 0}</td>
                        <td style="font-weight:600;">${maxRet}</td>
                        <td><input type="number" class="glass-input num-input return-qty-input" data-idx="${idx}" min="0" max="${maxRet}" value="0" style="width:80px;text-align:center;height:38px;" ${maxRet === 0 ? 'disabled' : ''}></td>
                    </tr>`;
                }).join('')}
            </tbody></table>
        `;
        actionsEl.innerHTML = `
            <button class="glass-btn-soft cancel-btn" style="padding:10px 20px;" onclick="openTxModal('invoice','${inv.id}');">\u2190 Back</button>
            <button class="login-btn" style="padding:10px 20px;margin-top:0;width:auto;background:linear-gradient(135deg,#EF4444,#DC2626);box-shadow:0 10px 20px rgba(239,68,68,0.3);" onclick="processReturn('invoice','${inv.id}');">\u21A9 Process Return</button>
        `;
    } else if (type === 'grn') {
        const grn = mockDB.grns.find(g => g.id === id);
        if (!grn) return;
        titleEl.innerText = `\u21A9 Return from GRN: ${grn.id}`;
        contentEl.innerHTML = `
            <p style="color:var(--text-secondary);margin-bottom:15px;">Enter the quantity to return for each item. Leave at <strong>0</strong> to skip.</p>
            <table class="invoice-table"><thead><tr>
                <th>Part No</th><th>Item</th><th>Received</th><th>Already Returned</th><th>Returnable</th><th width="120">Return Qty</th>
            </tr></thead><tbody>
                ${grn.items.map((it, idx) => {
                    const maxRet = it.qty - (it.returnedQty || 0);
                    return `<tr>
                        <td>${it.partNo}</td><td>${it.name}</td><td>${it.qty}</td>
                        <td style="color:${(it.returnedQty||0)>0?'#EF4444':'var(--text-secondary)'};">${it.returnedQty || 0}</td>
                        <td style="font-weight:600;">${maxRet}</td>
                        <td><input type="number" class="glass-input num-input return-qty-input" data-idx="${idx}" min="0" max="${maxRet}" value="0" style="width:80px;text-align:center;height:38px;" ${maxRet === 0 ? 'disabled' : ''}></td>
                    </tr>`;
                }).join('')}
            </tbody></table>
        `;
        actionsEl.innerHTML = `
            <button class="glass-btn-soft cancel-btn" style="padding:10px 20px;" onclick="openTxModal('grn','${grn.id}');">\u2190 Back</button>
            <button class="login-btn" style="padding:10px 20px;margin-top:0;width:auto;background:linear-gradient(135deg,#EF4444,#DC2626);box-shadow:0 10px 20px rgba(239,68,68,0.3);" onclick="processReturn('grn','${grn.id}');">\u21A9 Process Return</button>
        `;
    }
}

// === PROCESS RETURN ===
function processReturn(type, id) {
    const inputs = document.querySelectorAll('.return-qty-input');
    let hasReturn = false;
    const returnItems = [];

    if (type === 'invoice') {
        const inv = mockDB.invoices.find(i => i.id === id);
        if (!inv) return;

        inputs.forEach(inp => {
            const idx = parseInt(inp.dataset.idx);
            const retQty = parseInt(inp.value) || 0;
            const maxRet = inv.items[idx].qty - (inv.items[idx].returnedQty || 0);
            if (retQty > 0 && retQty <= maxRet) {
                hasReturn = true;
                returnItems.push({
                    partNo: inv.items[idx].partNo,
                    name: inv.items[idx].name,
                    qty: retQty,
                    price: inv.items[idx].price,
                    total: retQty * inv.items[idx].price
                });
                inv.items[idx].returnedQty = (inv.items[idx].returnedQty || 0) + retQty;
                // Restore stock
                const dbItem = mockDB.items.find(i => i.partNo === inv.items[idx].partNo);
                if (dbItem) dbItem.stock = (dbItem.stock || 0) + retQty;
            } else if (retQty > maxRet) {
                alert(`Cannot return ${retQty} of ${inv.items[idx].name}. Max returnable: ${maxRet}`);
            }
        });

        if (!hasReturn) { alert('Please enter a return quantity for at least one item.'); return; }

        const totalRefund = returnItems.reduce((s, it) => s + it.total, 0);
        const retId = `SR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(mockDB.salesReturns.length + 1).padStart(3,'0')}`;

        mockDB.salesReturns.push({
            id: retId,
            date: new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
            invoiceId: inv.id,
            customerName: inv.customerName,
            items: returnItems,
            totalRefund
        });

        saveDB();
        alert(`\u2705 Sales Return processed!\nReturn No: ${retId}\nRefund: ${totalRefund.toFixed(2)}`);
        closeTxModal();
        renderHistory('salesReturns');

    } else if (type === 'grn') {
        const grn = mockDB.grns.find(g => g.id === id);
        if (!grn) return;

        inputs.forEach(inp => {
            const idx = parseInt(inp.dataset.idx);
            const retQty = parseInt(inp.value) || 0;
            const maxRet = grn.items[idx].qty - (grn.items[idx].returnedQty || 0);
            if (retQty > 0 && retQty <= maxRet) {
                hasReturn = true;
                returnItems.push({
                    partNo: grn.items[idx].partNo,
                    name: grn.items[idx].name,
                    qty: retQty,
                    cost: grn.items[idx].cost,
                    total: retQty * grn.items[idx].cost
                });
                grn.items[idx].returnedQty = (grn.items[idx].returnedQty || 0) + retQty;
                // Deduct from stock
                const dbItem = mockDB.items.find(i => i.partNo === grn.items[idx].partNo);
                if (dbItem) dbItem.stock = (dbItem.stock || 0) - retQty;
            } else if (retQty > maxRet) {
                alert(`Cannot return ${retQty} of ${grn.items[idx].name}. Max returnable: ${maxRet}`);
            }
        });

        if (!hasReturn) { alert('Please enter a return quantity for at least one item.'); return; }

        const totalRefund = returnItems.reduce((s, it) => s + it.total, 0);
        const retId = `PR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(mockDB.purchaseReturns.length + 1).padStart(3,'0')}`;

        mockDB.purchaseReturns.push({
            id: retId,
            date: new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
            grnId: grn.id,
            supplierName: grn.supplierName,
            items: returnItems,
            totalRefund
        });

        saveDB();
        alert(`\u2705 Purchase Return processed!\nReturn No: ${retId}\nRefund: ${totalRefund.toFixed(2)}`);
        closeTxModal();
        renderHistory('purchaseReturns');
    }
}

// === PAYMENT FORM (Cash/Cheque, partial payment) ===
function showPaymentForm(type, id) {
    const contentEl = document.getElementById('tx-modal-content');
    const actionsEl = document.getElementById('tx-modal-actions');
    const titleEl = document.getElementById('tx-modal-title');
    if (!contentEl || !actionsEl || !titleEl) return;

    const tx = type==='invoice' ? mockDB.invoices.find(i=>i.id===id) : mockDB.grns.find(g=>g.id===id);
    if (!tx) return;
    const b = calcBalance(tx, type);
    const today = new Date().toISOString().slice(0,10);

    titleEl.innerText = `\uD83D\uDCB3 Record Payment — ${tx.id}`;
    contentEl.innerHTML = `
        <div style="background:var(--input-bg);border:1px solid var(--card-border);border-radius:12px;padding:20px;margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:15px;">
                <div><p style="color:var(--text-secondary);">Effective Total: <strong>${b.effectiveTotal.toFixed(2)}</strong></p>
                    <p style="color:var(--text-secondary);">Already Paid: <strong style="color:#10B981;">${b.totalPaid.toFixed(2)}</strong></p></div>
                <div style="text-align:right;"><p style="color:var(--text-secondary);font-size:0.85rem;">BALANCE DUE</p>
                    <p style="font-size:1.8rem;font-weight:700;color:#EF4444;">${b.balance.toFixed(2)}</p></div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div class="input-group"><label>Payment Method</label>
                <select id="pay-method" class="glass-input custom-select" style="height:48px;" onchange="document.getElementById('cheque-fields').style.display=this.value==='cheque'?'grid':'none'">
                    <option value="cash">\uD83D\uDCB5 Cash</option><option value="cheque">\uD83C\uDFE6 Cheque</option></select></div>
            <div class="input-group"><label>Amount Paying</label>
                <input type="number" id="pay-amount" class="glass-input" value="${b.balance.toFixed(2)}" step="0.01" min="0.01" max="${b.balance.toFixed(2)}" style="height:48px;"></div>
        </div>
        <div id="cheque-fields" style="display:none;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px;">
            <div class="input-group"><label>Bank Name</label><input type="text" id="pay-bank" class="glass-input" placeholder="e.g. BOC, HNB" style="height:48px;"></div>
            <div class="input-group"><label>Cheque Number</label><input type="text" id="pay-cheque-no" class="glass-input" placeholder="e.g. 123456" style="height:48px;"></div>
            <div class="input-group"><label>Cheque Date</label><input type="date" id="pay-cheque-date" class="glass-input" value="${today}" style="height:48px;"></div>
            <div class="input-group"><label>Banking Date</label><input type="date" id="pay-banking-date" class="glass-input" value="${today}" style="height:48px;"></div>
        </div>
    `;
    actionsEl.innerHTML = `
        <button class="glass-btn-soft cancel-btn" style="padding:10px 20px;" onclick="openTxModal('${type}','${id}');">\u2190 Back</button>
        <button class="login-btn" style="padding:10px 20px;margin-top:0;width:auto;background:linear-gradient(135deg,#10B981,#059669);box-shadow:0 10px 20px rgba(16,185,129,0.3);" onclick="processPayment('${type}','${id}');">\u2705 Confirm Payment</button>
    `;
}

function processPayment(type, id) {
    const tx = type==='invoice' ? mockDB.invoices.find(i=>i.id===id) : mockDB.grns.find(g=>g.id===id);
    if (!tx) return;
    const b = calcBalance(tx, type);
    const method = document.getElementById('pay-method')?.value || 'cash';
    const amount = parseFloat(document.getElementById('pay-amount')?.value) || 0;

    if (amount <= 0) { alert('Please enter a valid payment amount.'); return; }
    if (amount > b.balance + 0.01) { alert(`Amount exceeds balance of ${b.balance.toFixed(2)}`); return; }

    const payment = {
        date: new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
        method,
        amount
    };
    if (method === 'cheque') {
        const bank = document.getElementById('pay-bank')?.value?.trim();
        const chequeNo = document.getElementById('pay-cheque-no')?.value?.trim();
        const chequeDate = document.getElementById('pay-cheque-date')?.value || '';
        const bankingDate = document.getElementById('pay-banking-date')?.value || '';
        if (!bank || !chequeNo) { alert('Please fill in Bank and Cheque Number.'); return; }
        payment.bank = bank;
        payment.chequeNo = chequeNo;
        payment.chequeDate = chequeDate;
        payment.bankingDate = bankingDate;
    }

    if (!tx.payments) tx.payments = [];
    tx.payments.push(payment);
    tx.totalPaid = (tx.totalPaid || 0) + amount;

    // Update status
    const newBalance = calcBalance(tx, type).balance;
    tx.status = newBalance <= 0 ? 'paid' : 'partial';

    saveDB();
    alert(`\u2705 Payment of ${amount.toFixed(2)} recorded!${newBalance<=0?' — Fully Paid!':' — Remaining: '+newBalance.toFixed(2)}`);
    openTxModal(type, id);
}

function closeTxModal() {
    const modal = document.getElementById('tx-modal-wrapper');
    if (modal) modal.style.display = 'none';
    // Refresh the history table behind the modal so status changes are visible
    if (currentHistoryType) renderHistory(currentHistoryType);
}

// Close tx modal on X click
const txModalCloseBtn = document.getElementById('tx-modal-close');
if (txModalCloseBtn) txModalCloseBtn.addEventListener('click', closeTxModal);

// === ITEM LEDGER LOGIC ===
let currentLedgerItem = null;
function renderLedgerTable(partNo) {
    if (!partNo) return;
    const body = document.getElementById('report-table-body');
    if (!body) return;
    const movements = [];
    mockDB.grns.forEach(grn => {
        grn.items.forEach(it => { if(it.partNo === partNo) movements.push({ date: new Date(grn.date), dStr: grn.date, type: 'GRN (In)', ref: grn.id, party: grn.supplierName, qtyIn: it.qty, qtyOut: 0, val: it.cost }); });
    });
    mockDB.invoices.forEach(inv => {
        inv.items.forEach(it => { if(it.partNo === partNo) movements.push({ date: new Date(inv.date), dStr: inv.date, type: 'Invoice (Out)', ref: inv.id, party: inv.customerName, qtyIn: 0, qtyOut: it.qty, val: it.price }); });
    });
    mockDB.purchaseReturns.forEach(pr => {
        pr.items.forEach(it => { if(it.partNo === partNo) movements.push({ date: new Date(pr.date), dStr: pr.date, type: 'Purchase Return (Out)', ref: pr.id, party: pr.supplierName, qtyIn: 0, qtyOut: it.qty, val: it.cost }); });
    });
    mockDB.salesReturns.forEach(sr => {
        sr.items.forEach(it => { if(it.partNo === partNo) movements.push({ date: new Date(sr.date), dStr: sr.date, type: 'Sales Return (In)', ref: sr.id, party: sr.customerName, qtyIn: it.qty, qtyOut: 0, val: it.price }); });
    });

    movements.sort((a,b) => a.date - b.date);

    // Apply date filters if they exist
    const inputs=document.querySelectorAll('#report-date-filters input[type="date"]');
    let filtered = movements;
    if(inputs.length===2 && inputs[0].value && inputs[1].value) {
        const from=new Date(inputs[0].value), to=new Date(inputs[1].value); to.setHours(23,59,59);
        filtered = movements.filter(m => { const d = new Date(m.dStr); return d >= from && d <= to; });
    }

    if (filtered.length === 0) {
        const dbItem = mockDB.items.find(i=>i.partNo===partNo);
        const stockDisplay = document.getElementById('ledger-stock-display');
        if(stockDisplay) stockDisplay.value = dbItem ? (dbItem.stock||0) : 0;
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:30px;">No movement found for this item in date range.</td></tr>';
        return;
    }

    let runningStock = 0;
    body.innerHTML = filtered.map(m => {
        runningStock += m.qtyIn - m.qtyOut;
        return `<tr>
        <td>${m.dStr}</td><td>${m.type}</td><td style="color:var(--input-focus);">${m.ref}</td><td>${m.party}</td>
        <td style="color:#10B981;font-weight:bold;">${m.qtyIn>0 ? m.qtyIn : '-'}</td>
        <td style="color:#EF4444;font-weight:bold;">${m.qtyOut>0 ? m.qtyOut : '-'}</td>
        <td>${m.val.toFixed(2)}</td>
    </tr>`}).join('');
    
    // Update Stock Display
    const stockDisplay = document.getElementById('ledger-stock-display');
    const dbItem = mockDB.items.find(i=>i.partNo===partNo);
    if(stockDisplay) stockDisplay.value = dbItem ? (dbItem.stock||0) : 0;
}

const ledgerSearch = document.getElementById('report-item-search');
const ledgerDropdown = document.getElementById('report-item-dropdown');

if (ledgerSearch) {
    ledgerSearch.addEventListener('input', (e) => {
        const q=e.target.value.toLowerCase().trim();
        ledgerDropdown.innerHTML=''; currentLedgerItem=null;
        if(!q){ ledgerDropdown.style.display='none'; return; }
        const matches = mockDB.items.filter(p=>p.name.toLowerCase().includes(q) || p.partNo.toLowerCase().includes(q));
        if (matches.length > 0) {
            ledgerDropdown.style.display='block';
            matches.forEach(part => {
                const d=document.createElement('div'); d.className='dropdown-item';
                d.innerHTML=`<span class="dropdown-item-title">${part.name}</span><span class="dropdown-item-desc">${part.partNo} (Stock: ${part.stock||0})</span>`;
                d.addEventListener('click',() => {
                    currentLedgerItem=part.partNo; ledgerSearch.value=`${part.partNo} - ${part.name}`;
                    ledgerDropdown.style.display='none';
                    renderLedgerTable(part.partNo);
                });
                ledgerDropdown.appendChild(d);
            });
        } else { ledgerDropdown.style.display='none'; }
    });
    document.addEventListener('click', (e) => { if(e.target!==ledgerSearch) if(ledgerDropdown) ledgerDropdown.style.display='none'; });
}

// Initialize invoice AFTER all global const declarations (avoids TDZ ReferenceError)
initInvoiceNumber();

// === DASHBOARD STOCK CHECK LOGIC ===
const dashPartSearch = document.getElementById('dash-part-search');
const dashPartDropdown = document.getElementById('dash-part-dropdown');
const dashStockQty = document.getElementById('dash-stock-qty');
const dashStockPrice = document.getElementById('dash-stock-price');

if (dashPartSearch) {
    dashPartSearch.addEventListener('input', (e) => {
        const q=e.target.value.toLowerCase().trim();
        dashPartDropdown.innerHTML='';
        if(dashStockQty) dashStockQty.value = '-';
        if(dashStockPrice) dashStockPrice.value = '-';
        if(!q){ dashPartDropdown.style.display='none'; return; }
        const matches = mockDB.items.filter(p=>p.name.toLowerCase().includes(q) || p.partNo.toLowerCase().includes(q));
        if (matches.length > 0) {
            dashPartDropdown.style.display='block';
            matches.forEach(part => {
                const d=document.createElement('div'); d.className='dropdown-item';
                d.innerHTML=`<span class="dropdown-item-title">${part.name}</span><span class="dropdown-item-desc">${part.partNo}</span>`;
                d.addEventListener('click',() => {
                    dashPartSearch.value=`${part.partNo} - ${part.name}`;
                    if(dashStockQty) dashStockQty.value = part.stock || 0;
                    if(dashStockPrice) dashStockPrice.value = part.price ? part.price.toFixed(2) : '0.00';
                    dashPartDropdown.style.display='none';
                });
                dashPartDropdown.appendChild(d);
            });
        } else { dashPartDropdown.style.display='none'; }
    });
    document.addEventListener('click', (e) => { if(e.target!==dashPartSearch) if(dashPartDropdown) dashPartDropdown.style.display='none'; });
}
